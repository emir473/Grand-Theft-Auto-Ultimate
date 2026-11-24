/**
 * Unified Input Manager using Pointer Events, Keyboard, and Touch Controls
 * Respects UI input blocking and supports configurable Developer Console key.
 */

import { GamepadManager, type GamepadSample } from './gamepadManager';

export interface InputActionState {
  moveX: number; // -1..1
  moveY: number; // -1..1 (forward=+1)
  lookDeltaX: number;
  lookDeltaY: number;
  sprint: boolean;
  fastWalk: boolean;
  crouchPressed: boolean;
  crawlPressed: boolean;
  jumpPressed: boolean;
  interactPressed: boolean;
  enterVehiclePressed: boolean;
  aimHeld: boolean;
  fireHeld: boolean;
  fireJustPressed: boolean;
  meleePressed: boolean;
  coverPressed: boolean;
  diveDownHeld: boolean;
  switchCharPressed: boolean;
  handbrake: boolean;
  hornPressed: boolean;
  cameraTogglePressed: boolean;
  radioCyclePressed: boolean;
  gamepad: GamepadSample;
}

export class InputManager {
  public readonly gamepad = new GamepadManager();

  private keysDown = new Set<string>();
  private justPressed = new Set<string>();
  private pointerDownButtons = new Set<number>();
  private pointerJustPressed = new Set<number>();
  private lookAccumX = 0;
  private lookAccumY = 0;
  private activeDragPointerId: number | null = null;
  private lastDragX = 0;
  private lastDragY = 0;
  private pointerLocked = false;

  public touchMoveX = 0;
  public touchMoveY = 0;
  public touchLookDeltaX = 0;
  public touchLookDeltaY = 0;
  public touchSprint = false;
  public touchFire = false;
  public touchAim = false;
  public touchHandbrake = false;
  public touchThrottle = 0; // -1..1 for touch driving buttons
  public consoleKeyCode = 'Backquote';

  private boundTarget: HTMLElement | null = null;
  private onTogglePhone?: () => void;
  private onToggleConsole?: () => void;
  private onTogglePause?: () => void;
  private onToggleWeaponWheel?: (open: boolean) => void;
  private onToggleDirector?: () => void;
  private onToggleCamera?: () => void;
  private onCycleRadio?: () => void;
  private onSwitchCharacter?: () => void;

  static isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  static async toggleFullscreen(target?: HTMLElement | null): Promise<boolean> {
    if (typeof document === 'undefined') return false;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return false;
      }
      const el = target ?? document.documentElement;
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen();
        return Boolean(document.fullscreenElement);
      }
    } catch {
      // Browser/iPad policy restricted fullscreen
    }
    return Boolean(document.fullscreenElement);
  }

  attach(
    canvas: HTMLElement,
    callbacks: {
      onTogglePhone: () => void;
      onToggleConsole: () => void;
      onTogglePause: () => void;
      onToggleWeaponWheel: (open: boolean) => void;
      onToggleDirector: () => void;
      onToggleCamera?: () => void;
      onCycleRadio?: () => void;
      onSwitchCharacter?: () => void;
    }
  ): void {
    this.detach();
    this.boundTarget = canvas;
    this.onTogglePhone = callbacks.onTogglePhone;
    this.onToggleConsole = callbacks.onToggleConsole;
    this.onTogglePause = callbacks.onTogglePause;
    this.onToggleWeaponWheel = callbacks.onToggleWeaponWheel;
    this.onToggleDirector = callbacks.onToggleDirector;
    this.onToggleCamera = callbacks.onToggleCamera;
    this.onCycleRadio = callbacks.onCycleRadio;
    this.onSwitchCharacter = callbacks.onSwitchCharacter;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    if (this.boundTarget) {
      this.boundTarget.removeEventListener('pointerdown', this.handlePointerDown);
      this.boundTarget.removeEventListener('contextmenu', this.handleContextMenu);
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    this.boundTarget = null;
  }

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleBlur = (): void => {
    this.keysDown.clear();
    this.justPressed.clear();
    this.pointerDownButtons.clear();
    this.pointerJustPressed.clear();
    this.activeDragPointerId = null;
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.boundTarget;
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const targetTag = (e.target as HTMLElement | null)?.tagName;
    const typingInInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA';

    if (e.code === this.consoleKeyCode || e.key === '^' || e.key === '~' || e.code === 'F9') {
      e.preventDefault();
      this.onToggleConsole?.();
      return;
    }
    if (e.code === 'Escape') {
      this.onTogglePause?.();
      return;
    }
    if (typingInInput) return;

    if (e.code === 'KeyM' && !e.repeat) {
      this.onTogglePhone?.();
      return;
    }
    if ((e.code === 'Tab' || e.code === 'KeyQ') && !e.repeat) {
      e.preventDefault();
      this.onToggleWeaponWheel?.(true);
      return;
    }
    if (e.code === 'F3' && !e.repeat) {
      e.preventDefault();
      this.onToggleDirector?.();
      return;
    }
    if (e.code === 'KeyV' && !e.repeat) {
      this.onToggleCamera?.();
    }
    if (e.code === 'KeyN' && !e.repeat) {
      this.onCycleRadio?.();
    }

    if (!this.keysDown.has(e.code)) {
      this.justPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    if (e.code === 'Tab' || e.code === 'KeyQ') {
      this.onToggleWeaponWheel?.(false);
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.target !== this.boundTarget) return;
    this.pointerDownButtons.add(e.button);
    this.pointerJustPressed.add(e.button);
    this.activeDragPointerId = e.pointerId;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.pointerLocked) {
      this.lookAccumX += e.movementX;
      this.lookAccumY += e.movementY;
      return;
    }
    if (this.activeDragPointerId === e.pointerId && this.pointerDownButtons.size > 0) {
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
      this.lookAccumX += dx;
      this.lookAccumY += dy;
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    this.pointerDownButtons.delete(e.button);
    if (this.activeDragPointerId === e.pointerId) {
      this.activeDragPointerId = null;
    }
  };

  triggerVirtualKey(code: string): void {
    this.justPressed.add(code);
  }

  sampleAndClearFrame(blocked: boolean): InputActionState {
    const gp = this.gamepad.poll();

    if (gp.optionsJustPressed) this.onTogglePause?.();
    if (!blocked) {
      if (gp.dpadUpJustPressed) this.onTogglePhone?.();
      if (gp.dpadLeftJustPressed) this.onCycleRadio?.();
      if (gp.touchpadJustPressed) this.onToggleCamera?.();
      if (gp.dpadRightJustPressed) this.onSwitchCharacter?.();
    }

    if (blocked) {
      this.lookAccumX = 0;
      this.lookAccumY = 0;
      this.touchLookDeltaX = 0;
      this.touchLookDeltaY = 0;
      this.justPressed.clear();
      this.pointerJustPressed.clear();
      return {
        moveX: 0,
        moveY: 0,
        lookDeltaX: 0,
        lookDeltaY: 0,
        sprint: false,
        fastWalk: false,
        crouchPressed: false,
        crawlPressed: false,
        jumpPressed: false,
        interactPressed: false,
        enterVehiclePressed: false,
        aimHeld: false,
        fireHeld: false,
        fireJustPressed: false,
        meleePressed: false,
        coverPressed: false,
        diveDownHeld: false,
        switchCharPressed: false,
        handbrake: false,
        hornPressed: false,
        cameraTogglePressed: false,
        radioCyclePressed: false,
        gamepad: gp,
      };
    }

    let moveX = this.touchMoveX + gp.moveX;
    let moveY = this.touchMoveY + this.touchThrottle + gp.moveY + (gp.throttleR2 - gp.brakeL2);
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveX -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveX += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveY += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveY -= 1;

    const len = Math.hypot(moveX, moveY);
    if (len > 1) {
      moveX /= len;
      moveY /= len;
    }

    const lookDeltaX = this.lookAccumX + this.touchLookDeltaX + gp.lookX;
    const lookDeltaY = this.lookAccumY + this.touchLookDeltaY + gp.lookY;
    this.lookAccumX = 0;
    this.lookAccumY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;

    const state: InputActionState = {
      moveX,
      moveY,
      lookDeltaX,
      lookDeltaY,
      sprint: this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight') || this.touchSprint || gp.sprintL3,
      fastWalk: this.keysDown.has('AltLeft'),
      crouchPressed: this.justPressed.has('KeyC') || gp.circleJustPressed,
      crawlPressed: this.justPressed.has('KeyZ'),
      jumpPressed: this.justPressed.has('Space') || gp.crossJustPressed,
      interactPressed: this.justPressed.has('KeyE') || gp.squareJustPressed,
      enterVehiclePressed: this.justPressed.has('KeyF') || gp.triangleJustPressed,
      aimHeld: this.pointerDownButtons.has(2) || this.touchAim || gp.brakeL2 > 0.35,
      fireHeld: this.pointerDownButtons.has(0) || this.keysDown.has('KeyJ') || this.touchFire || gp.throttleR2 > 0.35,
      fireJustPressed: this.pointerJustPressed.has(0) || this.justPressed.has('KeyJ') || gp.throttleR2 > 0.45,
      meleePressed: this.justPressed.has('KeyR') || gp.squareJustPressed,
      coverPressed: this.justPressed.has('KeyG'),
      diveDownHeld: this.keysDown.has('ControlLeft') || this.keysDown.has('KeyX'),
      switchCharPressed: this.justPressed.has('KeyK') || this.justPressed.has('F1'),
      handbrake: this.keysDown.has('Space') || this.touchHandbrake || gp.handbrakeR1,
      hornPressed: this.justPressed.has('KeyH') || gp.sprintL3,
      cameraTogglePressed: this.justPressed.has('KeyV') || gp.touchpadJustPressed,
      radioCyclePressed: this.justPressed.has('KeyN') || gp.dpadLeftJustPressed,
      gamepad: gp,
    };

    this.justPressed.clear();
    this.pointerJustPressed.clear();
    return state;
  }
}
