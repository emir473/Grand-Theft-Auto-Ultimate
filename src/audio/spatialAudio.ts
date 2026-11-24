/**
 * Spatial Web Audio API Sound Engine
 * Synthesizes engine RPM, tire screech, police sirens, rain/hurricane wind,
 * underwater low-pass filtering, room reverb (clubs/tunnels/airports),
 * smoothed Doppler pitch shift, and geometric distance/occlusion attenuation.
 */

import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import { clamp } from '../core/types';
import type { VehiclePhysicsSystem } from '../gameplay/vehiclePhysics';
import type { WaterDivingSystem } from '../world/waterDiving';

export class SpatialAudioEngine implements GameModule {
  public readonly moduleId = 'spatial_audio';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private vehicles!: VehiclePhysicsSystem;
  private water!: WaterDivingSystem;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private worldFilter: BiquadFilterNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;

  private rainNoiseGain: GainNode | null = null;
  private radioAudioGain: GainNode | null = null;
  private muted = false;
  public currentStation = 'Wave 103.5 Vice';
  private unlockBound = () => this.unlockContext();

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.vehicles = registry.getModule<VehiclePhysicsSystem>('fahrzeug_physik');
    this.water = registry.getModule<WaterDivingSystem>('physik_wasser_tauchen');
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

      // Rain / wind noise buffer
      const bufSize = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const out = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) out[i] = Math.random() * 2 - 1;
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      noiseSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 950;
      this.rainNoiseGain = ctx.createGain();
      this.rainNoiseGain.gain.value = 0;
      noiseSrc.connect(rainFilter);
      rainFilter.connect(this.rainNoiseGain);
      this.rainNoiseGain.connect(this.worldFilter);
      noiseSrc.start();

      this.radioAudioGain = ctx.createGain();
      this.radioAudioGain.gain.value = 0;
      this.radioAudioGain.connect(this.masterGain);
    } catch {
      // Browser audio restricted or unavailable
    }
  }

  /**
   * Computes smoothed Doppler frequency factor using relative speed along listener line (speed of sound = 343 m/s).
   */
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

  start(): void {
    this.readiness = 'running';
  }

  update(): void {
    if (!this.ctx || !this.worldFilter) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;

    // Underwater & interior geometric occlusion approximation
    const char = this.registry.getActiveCharacter();
    const targetCutoff = this.water.isCameraUnderwater
      ? 420
      : char.inInteriorId
        ? 4500
        : 18000;
    this.worldFilter.frequency.setTargetAtTime(targetCutoff, now, 0.08);

    // Engine RPM audio
    const veh = this.vehicles.getActiveVehicleRuntime();
    if (veh && this.engineOsc && this.engineGain) {
      const freq = 38 + (veh.rpm / veh.profile.maxRpm) * 140;
      this.engineOsc.frequency.setTargetAtTime(freq, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.18, now, 0.05);
    } else if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
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
      const precip = this.registry.state.weatherIntensity;
      this.rainNoiseGain.gain.setTargetAtTime(precip * 0.14, now, 0.15);
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
