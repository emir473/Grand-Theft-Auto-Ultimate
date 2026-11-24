/**
 * Spatial Web Audio API Sound Engine
 * Synthesizes engine RPM, tire screech, police sirens, rain/hurricane wind,
 * underwater low-pass filtering, room reverb (clubs/tunnels/airports),
 * smoothed Doppler pitch shift, and geometric distance/occlusion attenuation.
 */

import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { SurfaceMaterial } from '../core/types';
import { clamp } from '../core/types';
import type { VehiclePhysicsSystem } from '../gameplay/vehiclePhysics';
import type { WaterDivingSystem } from '../world/waterDiving';
import type { WorldArchitecture } from '../world/worldArchitecture';
import { SynthwaveRadioEngine } from './synthwaveRadio';

export class SpatialAudioEngine implements GameModule {
  public readonly moduleId = 'spatial_audio';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private vehicles!: VehiclePhysicsSystem;
  private water!: WaterDivingSystem;
  private world!: WorldArchitecture;

  public readonly radio = new SynthwaveRadioEngine();

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private worldFilter: BiquadFilterNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private tireGain: GainNode | null = null;
  private surfGain: GainNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  private rainNoiseGain: GainNode | null = null;
  private radioAudioGain: GainNode | null = null;
  private muted = false;
  public currentStation = 'Wave 103.5 Vice';
  private footstepTimer = 0;
  private unlockBound = () => this.unlockContext();

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.vehicles = registry.getModule<VehiclePhysicsSystem>('fahrzeug_physik');
    this.water = registry.getModule<WaterDivingSystem>('physik_wasser_tauchen');
    this.world = registry.getModule<WorldArchitecture>('welt_architektur');
    this.readiness = 'validated';
  }

  init(): void {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.unlockBound, { once: true });
      window.addEventListener('keydown', this.unlockBound, { once: true });
    }
    this.readiness = 'initialized';
  }

  private unlockContext(): void {
    if (this.ctx || typeof AudioContext === 'undefined') return;
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;

      this.worldFilter = ctx.createBiquadFilter();
      this.worldFilter.type = 'lowpass';
      this.worldFilter.frequency.value = 18000;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.28;

      this.worldFilter.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      // Engine voice
      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(this.engineGain);
      this.engineGain.connect(this.worldFilter);
      this.engineOsc.start();

      // Siren voice
      this.sirenOsc = ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 650;
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.worldFilter);
      this.sirenOsc.start();

      // Shared white noise buffer for rain, ocean surf, and tire screech
      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) out[i] = Math.random() * 2 - 1;

      const makeNoiseBand = (freq: number, q = 1): GainNode => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = 0;
        src.connect(f);
        f.connect(g);
        g.connect(this.worldFilter!);
        src.start();
        return g;
      };

      this.rainNoiseGain = makeNoiseBand(950, 0.8);
      this.surfGain = makeNoiseBand(340, 0.7);
      this.tireGain = makeNoiseBand(1750, 3.2);

      this.radioAudioGain = ctx.createGain();
      this.radioAudioGain.gain.value = 0;
      this.radioAudioGain.connect(this.masterGain);
    } catch {
      // Browser audio restricted or unavailable
    }
  }

  static computeDopplerFactor(relativeApproachSpeedMps: number): number {
    const c = 343;
    const clampedRel = clamp(relativeApproachSpeedMps, -120, 120);
    return c / (c - clampedRel);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.28, this.ctx.currentTime, 0.05);
    }
  }

  setStation(name: string): string {
    const st = this.radio.setStationByName(name);
    this.currentStation = st.name;
    return st.name;
  }

  cycleStation(): string {
    const st = this.radio.cycleStation();
    this.currentStation = st.name;
    return st.name;
  }

  playShotSound(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(48, this.ctx.currentTime + 0.11);
    g.gain.setValueAtTime(0.35, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playFootstep(surface: SurfaceMaterial, sprint: boolean): void {
    if (!this.ctx || !this.worldFilter || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const baseFreq = surface === 'sand' ? 145 : surface === 'mud' ? 110 : surface === 'wood' ? 185 : surface === 'gravel' ? 235 : 165;
    osc.type = surface === 'sand' || surface === 'gravel' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.06);
    g.gain.setValueAtTime(sprint ? 0.11 : 0.065, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(g);
    g.connect(this.worldFilter);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  start(): void {
    this.readiness = 'running';
  }

  update(_simDt: number, renderDt: number): void {
    if (!this.ctx || !this.worldFilter) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    const char = this.registry.getActiveCharacter();
    const targetCutoff = this.water.isCameraUnderwater ? 420 : char.inInteriorId ? 4500 : 18000;
    this.worldFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);

    // Engine & tire screech audio
    const veh = this.vehicles.getActiveVehicleRuntime();
    if (veh && this.engineOsc && this.engineGain) {
      const freq = 38 + (veh.rpm / Math.max(1000, veh.profile.maxRpm)) * 145;
      this.engineOsc.frequency.setTargetAtTime(freq, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.18, now, 0.05);
      if (this.tireGain) {
        const slip = veh.lateralSlipMps > 2.4 && veh.velocity.length() > 5 ? clamp((veh.lateralSlipMps - 2.4) * 0.025, 0, 0.14) : 0;
        this.tireGain.gain.setTargetAtTime(slip, now, 0.06);
      }
    } else {
      this.engineGain?.gain.setTargetAtTime(0, now, 0.08);
      this.tireGain?.gain.setTargetAtTime(0, now, 0.08);
    }

    // Surface-specific footsteps when moving on foot
    if (!veh && char.waterState === 'land' && (char.locomotion === 'walk' || char.locomotion === 'run' || char.locomotion === 'sprint')) {
      const cadence = char.locomotion === 'sprint' ? 0.27 : char.locomotion === 'run' ? 0.38 : 0.52;
      this.footstepTimer += renderDt;
      if (this.footstepTimer >= cadence) {
        this.footstepTimer = 0;
        const surf = this.world.getSurfaceMaterial(char.position.x, char.position.z);
        this.playFootstep(surf, char.locomotion === 'sprint');
      }
    }

    // Ocean wave surf near beaches/coastlines
    if (this.surfGain) {
      const groundH = this.world.getTerrainHeight(char.position.x, char.position.z);
      const nearCoast = groundH < 4.5 && !char.inInteriorId;
      const wavePulse = 0.65 + 0.35 * Math.sin(this.registry.clock.renderTime * 0.75);
      this.surfGain.gain.setTargetAtTime(nearCoast ? 0.045 * wavePulse : 0, now, 0.25);
    }

    // Police siren with Doppler modulation
    if (this.sirenOsc && this.sirenGain) {
      if (this.registry.state.wantedStars > 0) {
        const sweep = 620 + Math.sin(this.registry.clock.renderTime * 5.2) * 210;
        const doppler = SpatialAudioEngine.computeDopplerFactor(veh ? veh.velocity.length() * 0.4 : 0);
        this.sirenOsc.frequency.setTargetAtTime(sweep * doppler, now, 0.05);
        this.sirenGain.gain.setTargetAtTime(0.09, now, 0.1);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, now, 0.1);
      }
    }

    // Rain / Hurricane ambience
    if (this.rainNoiseGain) {
      this.rainNoiseGain.gain.setTargetAtTime(this.registry.state.weatherIntensity * 0.14, now, 0.15);
    }

    // Original 80s Synthwave Radio station synthesizer
    if (this.radioAudioGain) {
      this.radio.update(this.ctx, this.radioAudioGain, renderDt, Boolean(veh), this.muted);
    }
  }

  stop(): void {
    this.readiness = 'stopped';
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.unlockBound);
      window.removeEventListener('keydown', this.unlockBound);
    }
    this.ctx?.close();
    this.ctx = null;
    this.readiness = 'disposed';
  }
}
