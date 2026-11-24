/**
 * Procedural Native Web Audio API 80s Synthwave & Tropical Radio Synthesizer
 * Generates original multi-station arpeggios, basslines, and percussive pulses
 * synced cleanly to vehicle occupancy and radio volume without copyrighted audio files.
 */

export interface RadioStationSpec {
  name: string;
  genre: string;
  track: string;
  bpm: number;
  waveType: OscillatorType;
  bassNotesHz: number[];
  leadArpHz: number[];
}

export const SYNTH_RADIO_STATIONS: RadioStationSpec[] = [
  {
    name: 'Wave 103.5 Vice',
    genre: '80s Synthwave & Coastal Pop',
    track: 'Sunset Over Starfish Island — Neon Palms',
    bpm: 114,
    waveType: 'sawtooth',
    bassNotesHz: [110, 110, 87.31, 98, 130.81, 130.81, 98, 82.41],
    leadArpHz: [440, 523.25, 659.25, 523.25, 349.23, 440, 523.25, 392],
  },
  {
    name: 'Radio Espantoso',
    genre: 'Tropical Keys & Vice Salsa',
    track: 'Brisa en Catalan Bay — Orquesta Leonida',
    bpm: 124,
    waveType: 'triangle',
    bassNotesHz: [146.83, 110, 130.81, 98, 146.83, 130.81, 116.54, 110],
    leadArpHz: [587.33, 698.46, 880, 659.25, 523.25, 659.25, 587.33, 440],
  },
  {
    name: 'V-Rock Leonida',
    genre: 'Coastal Classic Rock',
    track: 'Highway 404 Midnight — Iron Pelicans',
    bpm: 132,
    waveType: 'square',
    bassNotesHz: [82.41, 82.41, 98, 110, 82.41, 82.41, 123.47, 110],
    leadArpHz: [329.63, 392, 493.88, 659.25, 440, 392, 329.63, 293.66],
  },
  {
    name: 'WCTR Vice News',
    genre: 'Talk & Live Leonida Traffic',
    track: 'Leonida Statewide Dispatch Bulletin',
    bpm: 96,
    waveType: 'sine',
    bassNotesHz: [130.81, 130.81, 146.83, 130.81, 116.54, 116.54, 98, 130.81],
    leadArpHz: [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 392],
  },
];

export class SynthwaveRadioEngine {
  private stationIndex = 0;
  private stepIndex = 0;
  private accumSec = 0;
  public enabled = true;
  public radioVolume = 0.55;

  get currentStation(): RadioStationSpec {
    return SYNTH_RADIO_STATIONS[this.stationIndex];
  }

  setStationByName(name: string): RadioStationSpec {
    const idx = SYNTH_RADIO_STATIONS.findIndex((s) => s.name === name);
    if (idx >= 0) {
      this.stationIndex = idx;
      this.stepIndex = 0;
    }
    return this.currentStation;
  }

  cycleStation(): RadioStationSpec {
    this.stationIndex = (this.stationIndex + 1) % SYNTH_RADIO_STATIONS.length;
    this.stepIndex = 0;
    return this.currentStation;
  }

  update(ctx: AudioContext, radioGain: GainNode, dt: number, inVehicle: boolean, muted: boolean): void {
    const targetVol = muted || !this.enabled ? 0 : (inVehicle ? 0.34 : 0.06) * this.radioVolume;
    radioGain.gain.setTargetAtTime(targetVol, ctx.currentTime, 0.12);
    if (targetVol <= 0.005 || ctx.state !== 'running') return;

    const st = this.currentStation;
    const stepDur = 60 / st.bpm / 2; // 8th notes
    this.accumSec += Math.min(0.1, dt);
    if (this.accumSec < stepDur) return;
    this.accumSec -= stepDur;

    const now = ctx.currentTime;
    const idx = this.stepIndex % st.bassNotesHz.length;
    this.stepIndex++;

    // Warm analog bass oscillator
    const bassOsc = ctx.createOscillator();
    const bassFilter = ctx.createBiquadFilter();
    const bassEnv = ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(st.bassNotesHz[idx], now);
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(420, now);
    bassEnv.gain.setValueAtTime(0.001, now);
    bassEnv.gain.linearRampToValueAtTime(0.28, now + 0.015);
    bassEnv.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.9);
    bassOsc.connect(bassFilter);
    bassFilter.connect(bassEnv);
    bassEnv.connect(radioGain);
    bassOsc.start(now);
    bassOsc.stop(now + stepDur * 0.95);

    // Lead arpeggio voice
    const leadOsc = ctx.createOscillator();
    const leadEnv = ctx.createGain();
    leadOsc.type = st.waveType;
    leadOsc.frequency.setValueAtTime(st.leadArpHz[idx], now);
    leadEnv.gain.setValueAtTime(0.001, now);
    leadEnv.gain.linearRampToValueAtTime(0.14, now + 0.01);
    leadEnv.gain.exponentialRampToValueAtTime(0.001, now + stepDur * 0.78);
    leadOsc.connect(leadEnv);
    leadEnv.connect(radioGain);
    leadOsc.start(now);
    leadOsc.stop(now + stepDur * 0.85);
  }
}
