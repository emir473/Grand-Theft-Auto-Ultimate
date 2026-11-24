/**
 * PS5 DualSense & Standard Gamepad API Manager + Capability-Aware Haptics
 * Detects real browser Gamepad & vibrationActuator support without assuming unavailable APIs.
 */

import { clamp } from './types';

export type ControlContextMode = 'on_foot' | 'vehicle' | 'aircraft';

export interface GamepadSample {
  connected: boolean;
  id: string;
  isDualSense: boolean;
  hapticsSupported: boolean;
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  throttleR2: number;
  brakeL2: number;
  sprintL3: boolean;
  handbrakeR1: boolean;
  yawL1: boolean;
  yawR1: boolean;
  crossJustPressed: boolean;
  circleJustPressed: boolean;
  squareJustPressed: boolean;
  triangleJustPressed: boolean;
  dpadUpJustPressed: boolean;
  dpadDownJustPressed: boolean;
  dpadLeftJustPressed: boolean;
  dpadRightJustPressed: boolean;
  touchpadJustPressed: boolean;
  optionsJustPressed: boolean;
  crossHeld: boolean;
  squareHeld: boolean;
}

const EMPTY_SAMPLE: GamepadSample = {
  connected: false,
  id: '',
  isDualSense: false,
  hapticsSupported: false,
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  throttleR2: 0,
  brakeL2: 0,
  sprintL3: false,
  handbrakeR1: false,
  yawL1: false,
  yawR1: false,
  crossJustPressed: false,
  circleJustPressed: false,
  squareJustPressed: false,
  triangleJustPressed: false,
  dpadUpJustPressed: false,
  dpadDownJustPressed: false,
  dpadLeftJustPressed: false,
  dpadRightJustPressed: false,
  touchpadJustPressed: false,
  optionsJustPressed: false,
  crossHeld: false,
  squareHeld: false,
};

function applyDeadzone(val: number, deadzone = 0.14): number {
  if (!Number.isFinite(val) || Math.abs(val) < deadzone) return 0;
  const sign = Math.sign(val);
  return sign * clamp((Math.abs(val) - deadzone) / (1 - deadzone), 0, 1);
}

export class GamepadManager {
  private prevButtons: boolean[] = [];
  private lastRumbleAtMs = 0;
  public connectedLabel = 'No Controller Connected';
  public isConnected = false;
  public isDualSense = false;
  public hapticsSupported = false;

  private getActiveGamepad(): Gamepad | null {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return null;
    const pads = navigator.getGamepads();
    for (const p of pads) {
      if (p && p.connected) return p;
    }
    return null;
  }

  poll(): GamepadSample {
    const pad = this.getActiveGamepad();
    if (!pad) {
      this.isConnected = false;
      this.isDualSense = false;
      this.hapticsSupported = false;
      this.connectedLabel = 'No Controller Connected';
      this.prevButtons = [];
      return EMPTY_SAMPLE;
    }

    const idLower = pad.id.toLowerCase();
    this.isConnected = true;
    this.isDualSense = idLower.includes('dualsense') || idLower.includes('054c') || idLower.includes('sony');
    this.connectedLabel = pad.id;
    const vib = (pad as Gamepad & { vibrationActuator?: { playEffect?: unknown } }).vibrationActuator;
    this.hapticsSupported = Boolean(vib && typeof vib.playEffect === 'function');

    const btn = (idx: number): boolean => Boolean(pad.buttons[idx]?.pressed);
    const just = (idx: number): boolean => btn(idx) && !this.prevButtons[idx];

    const moveX = applyDeadzone(pad.axes[0] ?? 0);
    const moveY = -applyDeadzone(pad.axes[1] ?? 0);
    const lookX = applyDeadzone(pad.axes[2] ?? 0) * 16;
    const lookY = applyDeadzone(pad.axes[3] ?? 0) * 14;

    const r2Val = clamp(pad.buttons[7]?.value ?? 0, 0, 1);
    const l2Val = clamp(pad.buttons[6]?.value ?? 0, 0, 1);

    const sample: GamepadSample = {
      connected: true,
      id: pad.id,
      isDualSense: this.isDualSense,
      hapticsSupported: this.hapticsSupported,
      moveX,
      moveY,
      lookX,
      lookY,
      throttleR2: r2Val > 0.06 ? r2Val : 0,
      brakeL2: l2Val > 0.06 ? l2Val : 0,
      sprintL3: btn(10),
      handbrakeR1: btn(5),
      yawL1: btn(4),
      yawR1: btn(5),
      crossJustPressed: just(0),
      circleJustPressed: just(1),
      squareJustPressed: just(2),
      triangleJustPressed: just(3),
      dpadUpJustPressed: just(12),
      dpadDownJustPressed: just(13),
      dpadLeftJustPressed: just(14),
      dpadRightJustPressed: just(15),
      touchpadJustPressed: just(17) || just(8),
      optionsJustPressed: just(9),
      crossHeld: btn(0),
      squareHeld: btn(2),
    };

    this.prevButtons = pad.buttons.map((b) => b.pressed);
    return sample;
  }

  triggerHaptics(strongMagnitude: number, weakMagnitude: number, durationMs: number, enabled: boolean, intensity: number): void {
    if (!enabled || intensity <= 0) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastRumbleAtMs < 65) return;

    const pad = this.getActiveGamepad();
    const actuator = pad
      ? (pad as Gamepad & {
          vibrationActuator?: {
            playEffect?: (type: string, params: Record<string, number>) => Promise<string>;
          };
        }).vibrationActuator
      : undefined;

    if (actuator && typeof actuator.playEffect === 'function') {
      this.lastRumbleAtMs = now;
      void actuator
        .playEffect('dual-rumble', {
          startDelay: 0,
          duration: clamp(durationMs, 20, 450),
          weakMagnitude: clamp(weakMagnitude * intensity, 0, 1),
          strongMagnitude: clamp(strongMagnitude * intensity, 0, 1),
        })
        .catch(() => undefined);
    } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && strongMagnitude > 0.45) {
      // Optional mobile hardware pulse fallback when vibrationActuator is absent
      this.lastRumbleAtMs = now;
      navigator.vibrate(Math.round(clamp(durationMs * 0.4, 15, 65)));
    }
  }
}

export const DUALSENSE_GUIDE: Record<ControlContextMode, Array<{ button: string; action: string }>> = {
  on_foot: [
    { button: 'Left Stick', action: 'Move / Walk / Swim' },
    { button: 'Right Stick', action: 'Camera Orbit' },
    { button: 'L3 (Click)', action: 'Sprint / Fast Swim' },
    { button: 'Cross (X)', action: 'Jump / Vault' },
    { button: 'Triangle', action: 'Enter Vehicle / Interact' },
    { button: 'R2 / L2', action: 'Fire / Aim' },
    { button: 'Circle / Square', action: 'Crouch / Melee' },
    { button: 'D-Pad Up / Left / Right', action: 'Phone / Radio / Switch Character' },
    { button: 'Touchpad / Create', action: 'Toggle First / Third Person Camera' },
    { button: 'Options', action: 'Pause Menu & World Map' },
  ],
  vehicle: [
    { button: 'R2 / L2', action: 'Accelerate / Brake & Reverse' },
    { button: 'Left Stick', action: 'Steer Left / Right' },
    { button: 'Right Stick', action: 'Free Camera Look' },
    { button: 'R1 / Cross (X)', action: 'Handbrake & Drift' },
    { button: 'L3', action: 'Horn' },
    { button: 'Triangle', action: 'Exit Vehicle' },
    { button: 'Circle / Touchpad', action: 'Cockpit / Follow Camera' },
    { button: 'D-Pad Left / Up', action: 'Switch 80s Radio / iFruit Phone' },
    { button: 'Options', action: 'Pause Menu' },
  ],
  aircraft: [
    { button: 'R2 / L2', action: 'Throttle Up / Down' },
    { button: 'Left Stick', action: 'Pitch & Roll' },
    { button: 'L1 / R1', action: 'Rudder / Tail Rotor Yaw' },
    { button: 'L3 / Circle', action: 'Landing Gear / Camera View' },
    { button: 'Triangle', action: 'Exit Aircraft Safely' },
    { button: 'Options', action: 'Pause Menu' },
  ],
};
