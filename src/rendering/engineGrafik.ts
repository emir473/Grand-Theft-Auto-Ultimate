/**
 * MODULE 3 – engine_grafik.js
 * Initializes Babylon.js WebGPU asynchronously with clean WebGL2 fallback,
 * single render loop, DefaultRenderingPipeline (ACES, Bloom, DoF, MotionBlur, Chromatic, Vignette),
 * CascadedShadowGenerator / ShadowGenerator up to 4096^2 (hardware-gated),
 * runtime Quality Profiles (Low/Medium/High/Ultra), adaptive scaler, and resource disposal.
 */

import {
  AbstractMesh,
  CascadedShadowGenerator,
  Color3,
  Color4,
  ColorCurves,
  DefaultRenderingPipeline,
  DirectionalLight,
  Engine,
  HemisphericLight,
  ImageProcessingConfiguration,
  Scene,
  ShadowGenerator,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { GameModule, GameRegistry, ModuleReadiness } from '../core/registry';
import type { QualityProfile } from '../core/types';
import { clamp } from '../core/types';
import { createSafeBabylonEngine } from './engineInit';

export interface ShadowConfigDoc {
  activeMethod: 'CascadedShadowGenerator' | 'ShadowGenerator';
  filter: string;
  mapSize: number;
  bias: number;
  numCascades: number;
  maxDistanceMeters: number;
  active: boolean;
}

export class GraphicsEngine implements GameModule {
  public readonly moduleId = 'engine_grafik';
  public readiness: ModuleReadiness = 'uninitialized';

  private registry!: GameRegistry;
  private canvas!: HTMLCanvasElement;
  public engine!: Engine;
  public scene!: Scene;
  public backend: 'WebGPU' | 'WebGL2' = 'WebGL2';

  public sunLight!: DirectionalLight;
  public hemiLight!: HemisphericLight;
  public shadowGenerator: ShadowGenerator | CascadedShadowGenerator | null = null;
  public pipeline: DefaultRenderingPipeline | null = null;
  public shadowDoc: ShadowConfigDoc = {
    activeMethod: 'ShadowGenerator',
    filter: 'PCF_MEDIUM',
    mapSize: 1024,
    bias: 0.0008,
    numCascades: 1,
    maxDistanceMeters: 120,
    active: false,
  };

  private renderLoopActive = false;
  private adaptiveAccumMs = 0;
  private adaptiveFrames = 0;
  private frameTimes: number[] = [];
  private maxSupportedTexSize = 2048;
  private shadowCasters = new Set<AbstractMesh>();

  private onResizeBound = () => this.engine?.resize();
  private onVisibilityBound = () => {
    if (document.hidden) {
      this.registry.clock.setPaused(true);
    } else if (!this.registry.state.pauseMenuOpen) {
      this.registry.clock.setPaused(false);
      this.registry.clock.resetAccumulator();
    }
  };

  constructor(private readonly targetCanvas: HTMLCanvasElement) {}

  validateDependencies(registry: GameRegistry): void {
    this.registry = registry;
    this.canvas = this.targetCanvas;
    if (!this.canvas) {
      throw new Error('[engine_grafik] Canvas element is required');
    }
    this.readiness = 'validated';
  }

  async init(): Promise<void> {
    if (this.readiness === 'initialized' || this.readiness === 'running') return;

    const { engine, backend } = await createSafeBabylonEngine(
      this.canvas,
      () => this.registry.clock.setPaused(true),
      () => {
        this.registry.clock.resetAccumulator();
        if (!this.registry.state.pauseMenuOpen) {
          this.registry.clock.setPaused(false);
        }
      }
    );

    if (this.readiness === 'disposed') {
      engine.dispose();
      return;
    }

    this.engine = engine;
    this.backend = backend;
    this.scene = new Scene(this.engine);
    this.scene.useRightHandedSystem = false; // Left-handed: +X East, +Y Up, +Z North
    this.scene.clearColor = new Color4(0.45, 0.72, 0.94, 1.0);
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0012;
    this.scene.fogColor = new Color3(0.68, 0.82, 0.94);

    this.maxSupportedTexSize = this.engine.getCaps().maxTextureSize || 2048;

    this.sunLight = new DirectionalLight('sunLight', new Vector3(-0.4, -0.8, -0.45).normalize(), this.scene);
    this.sunLight.position = new Vector3(120, 220, 120);
    this.sunLight.intensity = 2.6;

    this.hemiLight = new HemisphericLight('hemiLight', new Vector3(0, 1, 0), this.scene);
    this.hemiLight.intensity = 0.75;
    this.hemiLight.groundColor = new Color3(0.24, 0.22, 0.19);

    this.registry.engine = this.engine;
    this.registry.scene = this.scene;
    this.registry.canvas = this.canvas;
    this.registry.metrics.rendererBackend = this.backend;

    window.addEventListener('resize', this.onResizeBound);
    document.addEventListener('visibilitychange', this.onVisibilityBound);

    this.applyQualityProfile(this.registry.state.qualityProfile);
    this.readiness = 'initialized';
  }

  setupPostProcessingAndShadows(): void {
    const profile = this.registry.state.qualityProfile;
    this.rebuildShadows(profile);
    this.rebuildPipeline(profile);
  }

  applyQualityProfile(profile: QualityProfile): void {
    this.registry.state.qualityProfile = profile;
    const dpr = window.devicePixelRatio || 1;
    const scaleMap: Record<QualityProfile, number> = {
      low: 1.35,
      medium: 1.15,
      high: 1.0,
      ultra: 1 / Math.min(dpr, 1.5),
    };
    this.engine.setHardwareScalingLevel(scaleMap[profile]);
    if (this.scene.activeCamera) {
      this.rebuildShadows(profile);
      this.rebuildPipeline(profile);
    }
  }

  private rebuildShadows(profile: QualityProfile): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
      this.shadowGenerator = null;
    }

    const desiredSize: Record<QualityProfile, number> = {
      low: 1024,
      medium: 2048,
      high: 2048,
      ultra: this.backend === 'WebGPU' ? 2048 : 4096,
    };
    const mapSize = Math.min(desiredSize[profile], this.maxSupportedTexSize);

    if (profile === 'high' || profile === 'ultra') {
      const csm = new CascadedShadowGenerator(mapSize, this.sunLight);
      csm.numCascades = profile === 'ultra' ? 4 : 2;
      csm.lambda = 0.65;
      csm.cascadeBlendPercentage = 0.1;
      csm.shadowMaxZ = profile === 'ultra' ? 260 : 180;
      csm.bias = 0.0006;
      csm.usePercentageCloserFiltering = true;
      csm.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
      this.shadowGenerator = csm;
      this.shadowDoc = {
        activeMethod: 'CascadedShadowGenerator',
        filter: 'PCF_MEDIUM',
        mapSize,
        bias: 0.0006,
        numCascades: csm.numCascades,
        maxDistanceMeters: csm.shadowMaxZ,
        active: true,
      };
    } else {
      const sg = new ShadowGenerator(mapSize, this.sunLight);
      sg.usePercentageCloserFiltering = profile === 'medium';
      sg.bias = 0.0009;
      this.shadowGenerator = sg;
      this.shadowDoc = {
        activeMethod: 'ShadowGenerator',
        filter: profile === 'medium' ? 'PCF_LOW' : 'HARD',
        mapSize,
        bias: 0.0009,
        numCascades: 1,
        maxDistanceMeters: 120,
        active: true,
      };
    }

    for (const caster of this.shadowCasters) {
      if (!caster.isDisposed()) {
        this.shadowGenerator.addShadowCaster(caster, false);
      } else {
        this.shadowCasters.delete(caster);
      }
    }
  }

  private rebuildPipeline(profile: QualityProfile): void {
    if (this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }
    const cam = this.scene.activeCamera;
    if (!cam) return;

    const pipe = new DefaultRenderingPipeline('leonidaPipeline', true, this.scene, [cam]);
    pipe.samples = this.backend === 'WebGPU' ? 1 : profile === 'ultra' ? 4 : profile === 'high' ? 2 : 1;
    pipe.fxaaEnabled = profile !== 'low' || this.backend === 'WebGPU';

    pipe.imageProcessingEnabled = true;
    pipe.imageProcessing.toneMappingEnabled = true;
    pipe.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipe.imageProcessing.exposure = 1.08;
    pipe.imageProcessing.contrast = 1.1;
    pipe.imageProcessing.vignetteEnabled = false;

    pipe.bloomEnabled = profile !== 'low';
    pipe.bloomThreshold = 0.84;
    pipe.bloomWeight = profile === 'ultra' ? 0.22 : 0.16;
    pipe.bloomKernel = 40;

    // Crystal-clear photorealism: disable artificial optical blur/aberration
    pipe.chromaticAberrationEnabled = false;
    pipe.depthOfFieldEnabled = false;

    this.scene.environmentIntensity = 0.85;

    this.pipeline = pipe;
  }

  registerShadowCaster(node: AbstractMesh | TransformNode, includeDescendants = true): void {
    if (node instanceof AbstractMesh) {
      this.shadowCasters.add(node);
      this.shadowGenerator?.addShadowCaster(node, false);
    }
    if (includeDescendants) {
      for (const child of node.getChildMeshes(false)) {
        this.shadowCasters.add(child);
        this.shadowGenerator?.addShadowCaster(child, false);
      }
    }
  }

  setGameOverPostFX(mode: 'none' | 'wasted' | 'busted'): void {
    if (!this.pipeline) return;
    if (!this.pipeline.imageProcessing.colorCurves) {
      this.pipeline.imageProcessing.colorCurves = new ColorCurves();
    }
    if (mode === 'wasted') {
      this.pipeline.imageProcessing.colorCurvesEnabled = true;
      this.pipeline.imageProcessing.colorCurves.globalSaturation = -88;
      this.pipeline.imageProcessing.vignetteWeight = 4.2;
      this.pipeline.imageProcessing.exposure = 0.78;
    } else if (mode === 'busted') {
      this.pipeline.imageProcessing.colorCurvesEnabled = true;
      this.pipeline.imageProcessing.colorCurves.globalSaturation = -58;
      this.pipeline.imageProcessing.vignetteWeight = 3.2;
      this.pipeline.imageProcessing.exposure = 0.85;
    } else {
      this.pipeline.imageProcessing.colorCurvesEnabled = false;
      this.pipeline.imageProcessing.colorCurves.globalSaturation = 0;
      this.pipeline.imageProcessing.vignetteWeight = 1.1;
      this.pipeline.imageProcessing.exposure = 1.05;
    }
  }

  start(): void {
    if (this.renderLoopActive) return;
    this.renderLoopActive = true;
    this.readiness = 'running';

    this.engine.runRenderLoop(() => {
      if (this.engine.isDisposed || this.scene.isDisposed) return;
      const renderStart = performance.now();
      const rawDt = clamp(this.engine.getDeltaTime() / 1000, 0, 0.1);

      const cpuStart = performance.now();
      const { simDt } = this.registry.clock.tick(rawDt, (fixedDt) => {
        for (const mod of this.registry.getAllModules()) {
          if (mod.readiness === 'running' && mod.fixedUpdate) {
            try {
              mod.fixedUpdate(fixedDt);
            } catch (err) {
              console.error(`[fixedUpdate] Error in ${mod.moduleId}:`, err);
            }
          }
        }
      });

      for (const mod of this.registry.getAllModules()) {
        if (mod.readiness === 'running' && mod.update) {
          try {
            mod.update(simDt, rawDt);
          } catch (err) {
            console.error(`[update] Error in ${mod.moduleId}:`, err);
          }
        }
      }
      const cpuUpdateMs = performance.now() - cpuStart;

      this.scene.render();
      const frameMs = performance.now() - renderStart;
      this.updateMetrics(frameMs, cpuUpdateMs);
    });
  }

  private updateMetrics(frameMs: number, cpuUpdateMs: number): void {
    this.frameTimes.push(frameMs);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const variance = this.frameTimes.reduce((a, b) => a + Math.abs(b - avg), 0) / this.frameTimes.length;

    const perfMem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const memText = perfMem
      ? `${Math.round(perfMem.usedJSHeapSize / 1048576)} MB JS Heap (GPU est.)`
      : 'Unavailable (Browser Estimate)';

    this.registry.metrics = {
      fps: Math.round(this.engine.getFps()),
      frameTimeMs: Number(frameMs.toFixed(2)),
      cpuUpdateMs: Number(cpuUpdateMs.toFixed(2)),
      renderTimeMs: Number(Math.max(0, frameMs - cpuUpdateMs).toFixed(2)),
      frameVarianceMs: Number(variance.toFixed(2)),
      drawCalls: this.scene.getActiveMeshes().length,
      activeEntities: this.scene.meshes.length,
      physicsBodies: this.registry.state.vehicles.size + 2,
      activeParticles: this.scene.particleSystems.length,
      texturesCount: this.scene.textures.length,
      gpuMemoryText: memText,
      rendererBackend: this.backend,
    };

    // Adaptive quality check every 180 frames
    this.adaptiveAccumMs += frameMs;
    this.adaptiveFrames++;
    if (this.adaptiveFrames >= 180) {
      const avgFrame = this.adaptiveAccumMs / this.adaptiveFrames;
      this.adaptiveAccumMs = 0;
      this.adaptiveFrames = 0;
      if (avgFrame > 36 && this.registry.state.qualityProfile === 'ultra') {
        this.applyQualityProfile('high');
      } else if (avgFrame > 42 && this.registry.state.qualityProfile === 'high') {
        this.applyQualityProfile('medium');
      }
    }
  }

  stop(): void {
    if (this.renderLoopActive) {
      this.engine?.stopRenderLoop();
      this.renderLoopActive = false;
    }
    this.readiness = 'stopped';
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResizeBound);
    document.removeEventListener('visibilitychange', this.onVisibilityBound);
    this.shadowGenerator?.dispose();
    this.pipeline?.dispose();
    this.scene?.dispose();
    this.engine?.dispose();
    this.readiness = 'disposed';
  }
}
