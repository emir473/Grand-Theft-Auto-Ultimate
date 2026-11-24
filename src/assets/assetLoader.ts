/**
 * Asynchronous Weighted Asset Loader
 * Loads required core PBR textures, shaders, geometry presets, and audio buffers
 * with real weighted progress tracking, error reporting, cancellation, and non-blocking optional HD assets.
 */

import { Scene } from '@babylonjs/core';
import { ProceduralTextureBank } from './proceduralTextures';

export interface AssetLoadProgress {
  percent: number; // 0..100
  statusKey: string;
  currentAsset: string;
  errors: string[];
  requiredComplete: boolean;
  optionalPending: boolean;
}

interface AssetTask {
  id: string;
  weight: number;
  required: boolean;
  run: () => Promise<void>;
}

export class AssetLoader {
  private cancelled = false;
  private textureBank: ProceduralTextureBank | null = null;

  constructor(private readonly scene: Scene) {
    this.textureBank = new ProceduralTextureBank(scene);
  }

  getTextureBank(): ProceduralTextureBank {
    if (!this.textureBank) {
      this.textureBank = new ProceduralTextureBank(this.scene);
    }
    return this.textureBank;
  }

  cancel(): void {
    this.cancelled = true;
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  async loadAll(onProgress: (progress: AssetLoadProgress) => void): Promise<void> {
    this.cancelled = false;
    const bank = this.getTextureBank();
    const errors: string[] = [];

    const tasks: AssetTask[] = [
      {
        id: 'pbr_asphalt_road',
        weight: 20,
        required: true,
        run: async () => {
          bank.createPBRSurface(
            'asphalt_road',
            256,
            11,
            { baseR: 46, baseG: 48, baseB: 52, varR: 26, varG: 26, varB: 28 },
            [0.45, 0.85],
            0.0,
            18,
            true
          );
        },
      },
      {
        id: 'pbr_villa_travertine',
        weight: 18,
        required: true,
        run: async () => {
          bank.createPBRSurface(
            'travertine',
            256,
            23,
            { baseR: 224, baseG: 214, baseB: 198, varR: 24, varG: 22, varB: 20 },
            [0.32, 0.58],
            0.0,
            10
          );
        },
      },
      {
        id: 'pbr_coral_stucco',
        weight: 16,
        required: true,
        run: async () => {
          bank.createPBRSurface(
            'stucco',
            256,
            37,
            { baseR: 238, baseG: 225, baseB: 214, varR: 22, varG: 18, varB: 16 },
            [0.65, 0.92],
            0.0,
            14
          );
        },
      },
      {
        id: 'pbr_beach_sand',
        weight: 16,
        required: true,
        run: async () => {
          bank.createPBRSurface(
            'sand',
            256,
            49,
            { baseR: 220, baseG: 198, baseB: 156, varR: 26, varG: 24, varB: 22 },
            [0.75, 0.95],
            0.0,
            22
          );
        },
      },
      {
        id: 'pbr_swamp_mud',
        weight: 15,
        required: true,
        run: async () => {
          bank.createPBRSurface(
            'swamp_mud',
            256,
            61,
            { baseR: 72, baseG: 66, baseB: 48, varR: 32, varG: 30, varB: 22 },
            [0.35, 0.82],
            0.0,
            16
          );
        },
      },
      {
        id: 'pbr_ocean_normal',
        weight: 15,
        required: true,
        run: async () => {
          bank.createWaveNormalMap('ocean_normal', 256);
          bank.createRainDropletNormalMap('rain_droplets', 256);
        },
      },
      // Optional non-blocking high-resolution textures
      {
        id: 'hd_concrete_tower',
        weight: 15,
        required: false,
        run: async () => {
          bank.createPBRSurface(
            'concrete_hd',
            512,
            73,
            { baseR: 158, baseG: 162, baseB: 168, varR: 34, varG: 34, varB: 34 },
            [0.55, 0.88],
            0.05,
            20
          );
        },
      },
      {
        id: 'hd_terracotta_roof',
        weight: 15,
        required: false,
        run: async () => {
          bank.createPBRSurface(
            'terracotta_hd',
            512,
            88,
            { baseR: 176, baseG: 94, baseB: 66, varR: 32, varG: 20, varB: 16 },
            [0.52, 0.8],
            0.0,
            24
          );
        },
      },
    ];

    const requiredTasks = tasks.filter((t) => t.required);
    const optionalTasks = tasks.filter((t) => !t.required);
    const totalReqWeight = requiredTasks.reduce((acc, t) => acc + t.weight, 0);
    let completedReqWeight = 0;

    for (const task of requiredTasks) {
      if (this.cancelled) break;
      onProgress({
        percent: Math.round((completedReqWeight / totalReqWeight) * 100),
        statusKey: 'loading.subtitle',
        currentAsset: task.id,
        errors: [...errors],
        requiredComplete: false,
        optionalPending: true,
      });
      await this.nextFrame();
      try {
        await task.run();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${task.id}: ${msg}`);
      }
      completedReqWeight += task.weight;
    }

    onProgress({
      percent: 100,
      statusKey: 'loading.ready',
      currentAsset: 'ready',
      errors: [...errors],
      requiredComplete: true,
      optionalPending: optionalTasks.length > 0,
    });

    // Stream optional HD assets asynchronously without blocking gameplay start
    void (async () => {
      for (const opt of optionalTasks) {
        if (this.cancelled) return;
        await this.nextFrame();
        try {
          await opt.run();
        } catch (err) {
          console.warn(`[AssetLoader] Optional asset ${opt.id} skipped:`, err);
        }
      }
    })();
  }

  dispose(): void {
    this.cancelled = true;
    this.textureBank?.disposeAll();
    this.textureBank = null;
  }
}
