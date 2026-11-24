/**
 * Central GameRuntime Orchestrator
 * Instantiates, validates, initializes, starts, and disposes all modules in strict dependency order.
 */

import type { GameRegistry } from './registry';
import { GameRegistry as RegistryImpl } from './registry';
import { InputManager } from './input';
import { AssetLoader, type AssetLoadProgress } from '../assets/assetLoader';
import { GraphicsEngine } from '../rendering/engineGrafik';
import { WeatherClimateSystem } from '../world/weatherSystem';
import { WaterDivingSystem } from '../world/waterDiving';
import { WorldArchitecture } from '../world/worldArchitecture';
import { PlayerController } from '../gameplay/playerController';
import { CombatAnimationSystem } from '../gameplay/combatAnimation';
import { WeaponsInventorySystem } from '../gameplay/weaponsInventory';
import { VehiclePhysicsSystem } from '../gameplay/vehiclePhysics';
import { TransportSystems } from '../gameplay/transportSystems';
import { ActivitiesMissionsSystem } from '../gameplay/activitiesMissions';
import { NPCCrowdSystem } from '../ai/npcCrowdAI';
import { PoliceSystem } from '../ai/policeForensics';
import { EconomyEncountersSystem } from '../ai/economyEncounters';
import { SpatialAudioEngine } from '../audio/spatialAudio';
import { SaveManager } from '../persistence/saveManager';
import { i18n } from '../ui/localization';
import { mpsToKmh, mpsToMph } from './types';

export interface HudSnapshot {
  characterId: 'lucia' | 'jason';
  characterName: string;
  health: number;
  armor: number;
  stamina: number;
  oxygen: number;
  inWater: boolean;
  cashCents: number;
  bankCents: number;
  wantedStars: number;
  dayTimeHours: number;
  weather: string;
  backend: 'WebGPU' | 'WebGL2';
  fps: number;
  inVehicle: boolean;
  vehicleName: string;
  speedDisplay: number;
  speedUnit: 'kmh' | 'mph';
  rpm: number;
  maxRpm: number;
  gear: number;
  fuelPct: number;
  engineDamagePct: number;
  hydroplaning: boolean;
  inAircraft: boolean;
  altitudeMeters: number;
  bankDeg: number;
  promptText: string | null;
  gpsLabel: string | null;
  gpsDistanceMeters: number;
  gpsInstruction: string | null;
  militaryAlert: string | null;
  lastRadioDispatch: string;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  activeWeaponId: string;
  ammoLoaded: number;
  ammoReserve: number;
  trustSynergy: number;
}

export class GameRuntime {
  public readonly registry: GameRegistry = new RegistryImpl();
  public readonly input = new InputManager();
  public readonly saveManager = new SaveManager(this.registry);

  public graphics!: GraphicsEngine;
  public assetLoader!: AssetLoader;
  public weather!: WeatherClimateSystem;
  public water!: WaterDivingSystem;
  public world!: WorldArchitecture;
  public player!: PlayerController;
  public combat!: CombatAnimationSystem;
  public weapons!: WeaponsInventorySystem;
  public vehicles!: VehiclePhysicsSystem;
  public transport!: TransportSystems;
  public activities!: ActivitiesMissionsSystem;
  public crowd!: NPCCrowdSystem;
  public police!: PoliceSystem;
  public economy!: EconomyEncountersSystem;
  public audio!: SpatialAudioEngine;

  private loopRegistered = false;
  private disposed = false;

  async boot(
    canvas: HTMLCanvasElement,
    onProgress: (p: AssetLoadProgress) => void,
    uiCallbacks: {
      onTogglePhone: () => void;
      onToggleConsole: () => void;
      onTogglePause: () => void;
      onToggleWeaponWheel: (open: boolean) => void;
      onToggleDirector: () => void;
      onOpenActivity: (kind: string, id: string) => void;
      onOpenAtm: () => void;
    }
  ): Promise<void> {
    this.graphics = new GraphicsEngine(canvas);
    this.registry.registerModule(this.graphics);
    this.graphics.validateDependencies(this.registry);
    await this.graphics.init();

    this.assetLoader = new AssetLoader(this.graphics.scene);
    this.registry.registerService('assetLoader', this.assetLoader);
    await this.assetLoader.loadAll(onProgress);

    this.weather = new WeatherClimateSystem();
    this.water = new WaterDivingSystem();
    this.world = new WorldArchitecture();
    this.player = new PlayerController();
    this.combat = new CombatAnimationSystem();
    this.weapons = new WeaponsInventorySystem();
    this.vehicles = new VehiclePhysicsSystem();
    this.transport = new TransportSystems();
    this.activities = new ActivitiesMissionsSystem();
    this.crowd = new NPCCrowdSystem();
    this.police = new PoliceSystem();
    this.economy = new EconomyEncountersSystem();
    this.audio = new SpatialAudioEngine();

    const ordered = [
      this.weather,
      this.water,
      this.world,
      this.player,
      this.combat,
      this.weapons,
      this.vehicles,
      this.transport,
      this.activities,
      this.crowd,
      this.police,
      this.economy,
      this.audio,
    ];

    for (const mod of ordered) {
      this.registry.registerModule(mod);
      mod.validateDependencies(this.registry);
      await mod.init();
    }

    // Attempt auto-resume from IndexedDB save if present
    const resumed = await this.saveManager.load('autosave').catch(() => false);
    if (resumed) {
      i18n.setLanguage(this.registry.state.language);
      this.graphics.applyQualityProfile(this.registry.state.qualityProfile);
      this.player.syncRigFromState('lucia');
      this.player.syncRigFromState('jason');
    }

    this.player.onRequestActivityUI = uiCallbacks.onOpenActivity;
    this.player.onRequestAtmUI = uiCallbacks.onOpenAtm;

    this.input.attach(canvas, {
      onTogglePhone: uiCallbacks.onTogglePhone,
      onToggleConsole: uiCallbacks.onToggleConsole,
      onTogglePause: uiCallbacks.onTogglePause,
      onToggleWeaponWheel: uiCallbacks.onToggleWeaponWheel,
      onToggleDirector: uiCallbacks.onToggleDirector,
    });

    if (!this.loopRegistered) {
      this.loopRegistered = true;
      this.graphics.scene.onBeforeRenderObservable.add(() => {
        if (this.disposed) return;
        const dt = Math.min(0.05, this.graphics.engine.getDeltaTime() / 1000) * this.registry.clock.effectiveTimeScale;
        const inputState = this.input.sampleAndClearFrame(this.registry.isGameplayInputBlocked());

        if (this.transport.activeCraftId) {
          if (inputState.enterVehiclePressed) this.transport.tryBoardNearestCraft();
          else this.transport.stepCraftInput(inputState, dt);
        } else {
          if (inputState.enterVehiclePressed && !this.registry.getActiveCharacter().inVehicleId) {
            // Try boarding nearby aircraft/boat first if closer, else car
            const boardedCraft = this.transport.tryBoardNearestCraft();
            if (!boardedCraft) this.vehicles.stepPlayerVehicleInput(inputState, dt);
          } else {
            this.vehicles.stepPlayerVehicleInput(inputState, dt);
          }
          this.player.stepFromInput(inputState, dt);
        }

        if (inputState.fireJustPressed || (inputState.fireHeld && this.weapons.getActiveInventoryItem().weaponId === 'smg_compact')) {
          if (this.weapons.fireActiveWeapon()) {
            this.audio.playShotSound();
          }
        }
        if (inputState.meleePressed) {
          this.combat.triggerMeleeAttack();
        }
        if (inputState.coverPressed) {
          this.combat.toggleCover(this.registry.getActiveCharacter().position);
        }
      });
    }

    for (const mod of this.registry.getAllModules()) {
      mod.start();
    }

    this.registry.events.emit('game:initialized', {
      backend: this.graphics.backend,
      resumedSave: resumed,
    });
  }

  getHudSnapshot(): HudSnapshot {
    const s = this.registry.state;
    const char = this.registry.getActiveCharacter();
    const veh = this.vehicles.getActiveVehicleRuntime();
    const ac = this.transport.aircraft.find((a) => a.id === this.transport.activeCraftId);
    const activeItem = this.weapons.getActiveInventoryItem();

    const rawSpeedMps = ac ? ac.speedMps : veh ? veh.velocity.length() : 0;
    const speedDisplay = Math.round(s.speedUnit === 'mph' ? mpsToMph(rawSpeedMps) : mpsToKmh(rawSpeedMps));

    let gpsDistanceMeters = 0;
    let gpsInstruction: string | null = null;
    if (s.gpsDestination) {
      gpsDistanceMeters = Math.round(Math.hypot(s.gpsDestination.x - char.position.x, s.gpsDestination.z - char.position.z));
      const route = this.world.roadNetwork.findRoute(char.position, s.gpsDestination);
      if (gpsDistanceMeters < 12) {
        gpsInstruction = i18n.t('hud.gps.arrived');
      } else if (route.found && route.instructions.length > 0) {
        const nextInst = route.instructions[0];
        gpsInstruction = i18n.t(nextInst.textKey, { dist: nextInst.distMeters });
      } else {
        gpsInstruction = i18n.t('hud.gps.recalc');
      }
    }

    const prompt = this.player.currentPrompt;
    const promptText = prompt ? i18n.t(prompt.key, prompt.params) : null;

    return {
      characterId: char.id,
      characterName: char.displayName,
      health: Math.round(char.health),
      armor: Math.round(char.armor),
      stamina: Math.round(char.staminaCurrent),
      oxygen: Math.round(char.oxygenCurrent),
      inWater: char.waterState !== 'land',
      cashCents: char.cashCents,
      bankCents: char.bankCents,
      wantedStars: s.wantedStars,
      dayTimeHours: this.registry.clock.dayTimeHours,
      weather: s.weather,
      backend: this.graphics.backend,
      fps: this.registry.metrics.fps,
      inVehicle: Boolean(veh),
      vehicleName: veh ? veh.data.name : ac ? ac.callsign : '',
      speedDisplay,
      speedUnit: s.speedUnit,
      rpm: veh ? Math.round(veh.rpm) : 0,
      maxRpm: veh ? veh.profile.maxRpm : 8000,
      gear: veh ? veh.gear : 1,
      fuelPct: veh ? Math.round((veh.data.fuelLiters / veh.data.maxFuelLiters) * 100) : 100,
      engineDamagePct: veh ? Math.round(veh.data.damage.engine * 100) : 0,
      hydroplaning: veh ? veh.isHydroplaning : false,
      inAircraft: Boolean(ac),
      altitudeMeters: Math.round(char.position.y),
      bankDeg: ac ? Math.round((ac.bank * 180) / Math.PI) : 0,
      promptText,
      gpsLabel: s.gpsDestination?.label ?? null,
      gpsDistanceMeters,
      gpsInstruction,
      militaryAlert: this.transport.militaryAlertText,
      lastRadioDispatch: this.police.lastRadioDispatch,
      playerPos: { ...char.position },
      playerYaw: char.yaw,
      activeWeaponId: activeItem.weaponId,
      ammoLoaded: activeItem.loadedAmmo,
      ammoReserve: activeItem.reserveAmmo,
      trustSynergy: Math.round(s.trustSynergy),
    };
  }

  dispose(): void {
    this.disposed = true;
    this.input.detach();
    this.assetLoader?.dispose();
    this.registry.disposeAll();
  }
}
