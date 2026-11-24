/**
 * MODULE 4 – welt_und_wetter.js
 * Astronomical Day/Night Cycle, Rayleigh/Mie Sky Parameters, Shared Lighting State,
 * Weather State Machine (sunny, cloudy, rain, hurricane), Wind Vector Field,
 * Rain Particles, Wetness/Puddle Surface Response, and Hurricane World Event.
 */

import {
  Color3,
  Color4,
  Mesh,
  ParticleSystem,
  PBRMaterial,
  Scene,
  ShaderMaterial,
  Texture,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { Vec3, WeatherState } from '../core/types';
import { clamp } from '../core/types';
import type { GraphicsEngine } from '../rendering/engineGrafik';
import { buildSkyDomeMesh, createSkyDomeMaterial } from '../rendering/shaders';

export interface WeatherParams {
  precipitation: number; // 0..1
  windStrengthMps: number;
  visibilityMeters: number;
  cloudCoverage: number; // 0..1
  wetnessTarget: number; // 0..1
  waveAmplitudeScale: number;
  tractionMultiplier: number;
}

const WEATHER_PRESETS: Record<WeatherState, WeatherParams> = {
  sunny: {
    precipitation: 0,
    windStrengthMps: 3.2,
    visibilityMeters: 1600,
    cloudCoverage: 0.28,
    wetnessTarget: 0,
    waveAmplitudeScale: 0.85,
    tractionMultiplier: 1.0,
  },
  cloudy: {
    precipitation: 0,
    windStrengthMps: 6.5,
    visibilityMeters: 950,
    cloudCoverage: 0.78,
    wetnessTarget: 0.1,
    waveAmplitudeScale: 1.1,
    tractionMultiplier: 0.96,
  },
  rain: {
    precipitation: 0.72,
    windStrengthMps: 11.0,
    visibilityMeters: 420,
    cloudCoverage: 0.92,
    wetnessTarget: 0.88,
    waveAmplitudeScale: 1.55,
    tractionMultiplier: 0.74,
  },
  hurricane: {
    precipitation: 1.0,
    windStrengthMps: 34.0,
    visibilityMeters: 160,
    cloudCoverage: 1.0,
    wetnessTarget: 1.0,
    waveAmplitudeScale: 2.8,
    tractionMultiplier: 0.52,
  },
};

export class WeatherClimateSystem implements GameModule {
  public readonly moduleId = 'welt_und_wetter';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private gfx!: GraphicsEngine;
  private scene!: Scene;

  private skyMat!: ShaderMaterial;
  private skyDome!: Mesh;
  private rainParticles: ParticleSystem | null = null;
  private rainEmitter = new Vector3(0, 18, 0);

  private currentWeather: WeatherState = 'sunny';
  private targetWeather: WeatherState = 'sunny';
  private transitionProgress = 1.0;
  private transitionDurationSec = 12.0;

  public currentWetness = 0; // 0..1 shared puddle & material wetness
  public nightFactor = 0; // 0=day, 1=night
  public currentParams: WeatherParams = { ...WEATHER_PRESETS.sunny };

  private wettableMaterials: PBRMaterial[] = [];
  private emissiveNightMaterials: PBRMaterial[] = [];
  private lastEmittedHour = -1;
  private hurricaneWarned = false;

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.gfx = registry.getModule<GraphicsEngine>('engine_grafik');
    this.scene = this.gfx.scene;
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    this.skyMat = createSkyDomeMaterial(this.scene);
    this.skyDome = buildSkyDomeMesh(this.scene, this.skyMat);
    this.createRainSystem();
    this.readiness = 'initialized';
  }

  private createRainSystem(): void {
    const ps = new ParticleSystem('leonidaRain', 900, this.scene);
    // Procedural crisp raindrop streak texture on DynamicTexture
    const tex = new Texture(
      'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="32"><rect x="3" y="0" width="2" height="32" fill="rgba(210,230,255,0.7)"/></svg>'
        ),
      this.scene
    );
    ps.particleTexture = tex;
    ps.emitter = this.rainEmitter;
    ps.minEmitBox = new Vector3(-28, 0, -28);
    ps.maxEmitBox = new Vector3(28, 2, 28);
    ps.color1 = new Color4(0.82, 0.9, 1.0, 0.55);
    ps.color2 = new Color4(0.68, 0.8, 0.95, 0.35);
    ps.minSize = 0.28;
    ps.maxSize = 0.52;
    ps.minLifeTime = 0.55;
    ps.maxLifeTime = 0.9;
    ps.emitRate = 0;
    ps.direction1 = new Vector3(-2, -24, -1);
    ps.direction2 = new Vector3(-1, -28, -0.5);
    ps.gravity = new Vector3(0, -18, 0);
    ps.start();
    this.rainParticles = ps;
  }

  registerWettableMaterial(mat: PBRMaterial): void {
    this.wettableMaterials.push(mat);
  }

  registerNightEmissiveMaterial(mat: PBRMaterial): void {
    this.emissiveNightMaterials.push(mat);
  }

  setWeather(next: WeatherState, transitionSec = 10): void {
    if (!WEATHER_PRESETS[next]) return;
    const prev = this.currentWeather;
    this.targetWeather = next;
    this.transitionDurationSec = Math.max(1, transitionSec);
    this.transitionProgress = 0;
    this.registry.state.weather = next;
    this.hurricaneWarned = false;

    this.registry.events.emit('world:weatherChanged', {
      from: prev,
      to: next,
      intensity: WEATHER_PRESETS[next].precipitation,
    });

    if (next === 'hurricane' && !this.hurricaneWarned) {
      this.hurricaneWarned = true;
      this.registry.state.socialFeed.unshift({
        id: `nws_${Date.now()}`,
        authorName: '@NWS_Leonida',
        isNpc: true,
        caption: 'HURRICANE WARNING: Category 4 storm approaching Vice City & Grassrivers. Expect coastal surge & hydroplaning!',
        eventTag: 'hurricane',
        likes: 920,
        reach: 45000,
        timestampGameSec: this.registry.clock.gameTime,
        location: { x: 0, y: 0, z: 0 },
      });
    }
  }

  getWindAt(pos: Vec3): Vec3 {
    const t = this.registry.clock.weatherTime;
    const base = this.currentParams.windStrengthMps;
    const gust = Math.sin(t * 0.7 + pos.x * 0.02 + pos.z * 0.02) * 0.35 + 1.0;
    const dirX = Math.cos(t * 0.04) * 0.85;
    const dirZ = Math.sin(t * 0.04) * 0.55;
    return {
      x: dirX * base * gust,
      y: this.targetWeather === 'hurricane' ? Math.sin(t * 1.9 + pos.x * 0.1) * 2.5 : 0,
      z: dirZ * base * gust,
    };
  }

  start(): void {
    this.readiness = 'running';
  }

  update(simDt: number): void {
    // 1. Weather interpolation
    if (this.transitionProgress < 1) {
      this.transitionProgress = clamp(this.transitionProgress + simDt / this.transitionDurationSec, 0, 1);
      if (this.transitionProgress >= 1) {
        this.currentWeather = this.targetWeather;
      }
    }

    const fromP = WEATHER_PRESETS[this.currentWeather];
    const toP = WEATHER_PRESETS[this.targetWeather];
    const k = this.transitionProgress;
    this.currentParams = {
      precipitation: fromP.precipitation + (toP.precipitation - fromP.precipitation) * k,
      windStrengthMps: fromP.windStrengthMps + (toP.windStrengthMps - fromP.windStrengthMps) * k,
      visibilityMeters: fromP.visibilityMeters + (toP.visibilityMeters - fromP.visibilityMeters) * k,
      cloudCoverage: fromP.cloudCoverage + (toP.cloudCoverage - fromP.cloudCoverage) * k,
      wetnessTarget: fromP.wetnessTarget + (toP.wetnessTarget - fromP.wetnessTarget) * k,
      waveAmplitudeScale: fromP.waveAmplitudeScale + (toP.waveAmplitudeScale - fromP.waveAmplitudeScale) * k,
      tractionMultiplier: fromP.tractionMultiplier + (toP.tractionMultiplier - fromP.tractionMultiplier) * k,
    };

    // Wetness accumulates faster in rain and dries gradually in sun
    const dryRate = this.currentParams.wetnessTarget > this.currentWetness ? 0.12 : 0.03;
    this.currentWetness += (this.currentParams.wetnessTarget - this.currentWetness) * clamp(simDt * dryRate, 0, 1);
    this.registry.state.weatherIntensity = this.currentParams.precipitation;

    const activePos = this.registry.getActiveCharacter().position;
    const wind = this.getWindAt(activePos);
    this.registry.state.windVector = wind;

    // 2. Astronomical sun/moon cycle (Leonida latitude ~25.7N)
    const hours = this.registry.clock.dayTimeHours;
    const sunAngle = ((hours - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const sunHoriz = Math.cos(sunAngle);
    const sunDir = new Vector3(sunHoriz * 0.86, sunElev, 0.42).normalize();

    this.nightFactor = clamp(1 - (sunElev + 0.12) / 0.35, 0, 1);

    const isTwilight = sunElev > -0.15 && sunElev < 0.22;
    const stormDarken = 1 - this.currentParams.cloudCoverage * 0.42;

    const zenithDay = new Color3(0.14, 0.44, 0.85);
    const zenithNight = new Color3(0.02, 0.04, 0.1);
    const zenithColor = Color3.Lerp(zenithDay, zenithNight, this.nightFactor).scale(stormDarken);

    let horizonDay = isTwilight ? new Color3(0.95, 0.48, 0.32) : new Color3(0.58, 0.78, 0.94);
    if (this.currentParams.precipitation > 0.3) {
      horizonDay = Color3.Lerp(horizonDay, new Color3(0.32, 0.36, 0.42), 0.75);
    }
    const horizonNight = new Color3(0.05, 0.08, 0.16);
    const horizonColor = Color3.Lerp(horizonDay, horizonNight, this.nightFactor);

    const sunTint = isTwilight ? new Color3(1.0, 0.52, 0.24) : new Color3(1.0, 0.94, 0.84);

    // Update Babylon lights & fog
    this.gfx.sunLight.direction = sunDir.scale(-1);
    this.gfx.sunLight.position = activePos ? new Vector3(activePos.x, 0, activePos.z).add(sunDir.scale(200)) : sunDir.scale(200);
    this.gfx.sunLight.intensity = Math.max(0.12, sunElev * 2.8 * stormDarken);
    this.gfx.sunLight.diffuse = Color3.Lerp(sunTint, new Color3(0.35, 0.45, 0.75), this.nightFactor);

    this.gfx.hemiLight.intensity = clamp(0.85 - this.nightFactor * 0.55, 0.25, 0.9) * stormDarken;
    this.scene.fogColor = horizonColor;
    // Swamp ground fog boosts density near Grassrivers (x < -140, z > 80)
    const inSwamp = activePos.x < -140 && activePos.z > 60;
    const baseFog = 1.6 / Math.max(120, this.currentParams.visibilityMeters);
    this.scene.fogDensity = baseFog + (inSwamp ? 0.0045 : 0);

    // Update sky dome uniforms
    const camPos = this.scene.activeCamera?.position ?? Vector3.Zero();
    this.skyMat.setVector3('cameraPosition', camPos);
    this.skyMat.setVector3('sunDirection', sunDir);
    this.skyMat.setColor3('zenithColor', zenithColor);
    this.skyMat.setColor3('horizonColor', horizonColor);
    this.skyMat.setColor3('sunTint', sunTint);
    this.skyMat.setFloat('starVisibility', this.nightFactor * (1 - this.currentParams.cloudCoverage * 0.85));
    this.skyMat.setFloat('starRotation', this.registry.clock.gameTime * 0.002);
    this.skyMat.setFloat('cloudDensity', this.currentParams.cloudCoverage);
    this.skyMat.setFloat('time', this.registry.clock.weatherTime);

    // 3. Update wet PBR surfaces & night emissive windows/neon
    for (const mat of this.wettableMaterials) {
      mat.roughness = clamp(0.75 - this.currentWetness * 0.58, 0.12, 0.92);
      mat.clearCoat.isEnabled = this.currentWetness > 0.25;
      mat.clearCoat.intensity = this.currentWetness * 0.85;
      mat.clearCoat.roughness = 0.08;
    }
    for (const emat of this.emissiveNightMaterials) {
      emat.emissiveIntensity = 0.15 + this.nightFactor * 1.4;
    }

    // 4. Rain particle system centered around active player
    if (this.rainParticles) {
      this.rainEmitter.set(activePos.x, activePos.y + 18, activePos.z);
      const profileScale = this.registry.state.qualityProfile === 'low' ? 0.35 : this.registry.state.qualityProfile === 'medium' ? 0.6 : 1.0;
      this.rainParticles.emitRate = Math.round(this.currentParams.precipitation * 750 * profileScale);
      this.rainParticles.direction1 = new Vector3(wind.x * 0.35 - 1, -24, wind.z * 0.35 - 1);
      this.rainParticles.direction2 = new Vector3(wind.x * 0.35 + 1, -28, wind.z * 0.35 + 1);
    }

    const wholeHour = Math.floor(hours);
    if (wholeHour !== this.lastEmittedHour) {
      this.lastEmittedHour = wholeHour;
      this.registry.events.emit('world:timeChanged', {
        dayTimeHours: hours,
        isNight: this.registry.clock.getIsNight(),
      });
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.rainParticles?.dispose();
    this.skyMat?.dispose();
    this.skyDome?.dispose();
    this.wettableMaterials = [];
    this.emissiveNightMaterials = [];
    this.readiness = 'disposed';
  }
}
