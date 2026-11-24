/**
 * Multi-Domain Simulation Clock with Fixed Physics Timestep & Accumulator
 * Separates renderTime, simulationTime, gameTime, dayTime, weatherTime, animationTime, and effectsTime.
 */

import { clamp } from './types';

export class SimulationClock {
  public readonly fixedPhysicsDt = 1 / 60;
  public readonly maxPhysicsStepsPerFrame = 4;

  public renderTime = 0;
  public simulationTime = 0;
  public gameTime = 0;
  public dayTimeHours = 10.5; // Starts 10:30 AM sunny morning at Star Island Villa
  public weatherTime = 0;
  public animationTime = 0;
  public effectsTime = 0;

  public dayLengthSeconds = 1440; // 24 real minutes = 24 in-game hours
  public paused = false;

  private baseTimeScale = 1.0;
  private wheelTimeScale: number | null = null;
  private directorTimeScale: number | null = null;
  private accumulator = 0;
  private overloadFrames = 0;
  private lastDeltaRender = 0;

  get effectiveTimeScale(): number {
    if (this.paused) return 0;
    if (this.wheelTimeScale !== null) return this.wheelTimeScale;
    if (this.directorTimeScale !== null) return this.directorTimeScale;
    return this.baseTimeScale;
  }

  setBaseTimeScale(scale: number): void {
    this.baseTimeScale = clamp(scale, 0.05, 4.0);
  }

  setWeaponWheelSlowMo(active: boolean): void {
    this.wheelTimeScale = active ? 0.1 : null;
  }

  setDirectorSlowMo(scale: number | null): void {
    this.directorTimeScale = scale === null ? null : clamp(scale, 0.05, 2.0);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setDayTimeHours(hours: number): void {
    if (!Number.isFinite(hours)) return;
    let wrapped = hours % 24;
    if (wrapped < 0) wrapped += 24;
    this.dayTimeHours = wrapped;
  }

  getIsNight(): boolean {
    return this.dayTimeHours < 6.0 || this.dayTimeHours >= 19.5;
  }

  getOverloadCount(): number {
    return this.overloadFrames;
  }

  getLastRenderDt(): number {
    return this.lastDeltaRender;
  }

  /**
   * Advances frame clocks and runs fixed physics callback up to maxPhysicsStepsPerFrame.
   * Returns scaled simulation delta and number of physics steps executed.
   */
  tick(rawDeltaSec: number, onFixedStep: (fixedDt: number) => void): { simDt: number; physicsSteps: number } {
    const safeRawDt = Number.isFinite(rawDeltaSec) ? clamp(rawDeltaSec, 0, 0.1) : 0;
    this.lastDeltaRender = safeRawDt;
    this.renderTime += safeRawDt;

    const scale = this.effectiveTimeScale;
    const simDt = safeRawDt * scale;

    if (simDt <= 0) {
      return { simDt: 0, physicsSteps: 0 };
    }

    this.simulationTime += simDt;
    this.gameTime += simDt;
    this.weatherTime += simDt;
    this.animationTime += simDt;
    this.effectsTime += simDt;

    const hoursDelta = (simDt / this.dayLengthSeconds) * 24;
    this.setDayTimeHours(this.dayTimeHours + hoursDelta);

    this.accumulator += simDt;
    let steps = 0;
    while (this.accumulator >= this.fixedPhysicsDt && steps < this.maxPhysicsStepsPerFrame) {
      onFixedStep(this.fixedPhysicsDt);
      this.accumulator -= this.fixedPhysicsDt;
      steps++;
    }

    if (this.accumulator >= this.fixedPhysicsDt) {
      this.overloadFrames++;
      this.accumulator = Math.min(this.accumulator, this.fixedPhysicsDt);
    }

    return { simDt, physicsSteps: steps };
  }

  resetAccumulator(): void {
    this.accumulator = 0;
  }
}
