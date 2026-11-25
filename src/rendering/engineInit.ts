/**
 * Safe WebGPU Preflight & WebGL2 Fallback Engine Initializer
 * Prevents Babylon.js WebGPUEngine from calling Logger.Error or locking the canvas
 * to an unrecoverable WebGPU context when hardware adapters are absent or lost.
 */

import { Engine, Logger, WebGPUEngine } from '@babylonjs/core';

interface GPUAdapterLike {
  isFallbackAdapter?: boolean;
  info?: { description?: string; architecture?: string };
  requestDevice?: () => Promise<{ destroy?: () => void }>;
}

interface NavigatorGPULike {
  gpu?: {
    requestAdapter?: (opts?: { powerPreference?: 'high-performance' | 'low-power' }) => Promise<GPUAdapterLike | null>;
  };
}

export async function createSafeBabylonEngine(
  canvas: HTMLCanvasElement,
  onContextLost: () => void,
  onContextRestored: () => void
): Promise<{ engine: Engine; backend: 'WebGPU' | 'WebGL2' }> {
  let wgpu: WebGPUEngine | null = null;
  const prevLogLevel = Logger.LogLevels;

  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isSafariWebKit =
      /AppleWebKit/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Firefox|OPR/i.test(ua);

    const gpu = !isSafariWebKit ? (navigator as unknown as NavigatorGPULike).gpu : undefined;
    const adapter = gpu?.requestAdapter
      ? await gpu.requestAdapter({ powerPreference: 'high-performance' }).catch(() => null)
      : null;

    const adapterDesc = `${adapter?.info?.description ?? ''} ${adapter?.info?.architecture ?? ''}`.toLowerCase();
    const isSoftwareGpu = adapterDesc.includes('swiftshader') || adapterDesc.includes('llvmpipe');

    if (adapter && !adapter.isFallbackAdapter && !isSoftwareGpu && adapter.requestDevice) {
      const probeDevice = await adapter.requestDevice().catch(() => null);
      if (probeDevice) {
        probeDevice.destroy?.();
        const supported = await WebGPUEngine.IsSupportedAsync.catch(() => false);
        if (supported) {
          Logger.LogLevels = Logger.WarningLogLevel;
          wgpu = new WebGPUEngine(canvas, {
            antialias: true,
            adaptToDeviceRatio: true,
            powerPreference: 'high-performance',
            doNotHandleContextLost: true,
          });
          await wgpu.initAsync();

          const dev = (wgpu as unknown as { _device?: { lost?: Promise<{ reason?: string; message?: string }> } })._device;
          dev?.lost?.then((info) => {
            if (wgpu?.isDisposed) return;
            console.warn('[engine_grafik] WebGPU device lost:', info?.reason ?? 'unknown', info?.message ?? '');
            onContextLost();
          });

          return { engine: wgpu as unknown as Engine, backend: 'WebGPU' };
        }
      }
    }
  } catch (err) {
    console.warn('[engine_grafik] WebGPU unavailable, falling back to WebGL2:', err);
    try {
      wgpu?.dispose();
    } catch {
      // Ignore cleanup failures on partially initialized WebGPUEngine
    }
  } finally {
    Logger.LogLevels = prevLogLevel;
  }

  const glEngine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    antialias: true,
    powerPreference: 'high-performance',
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    onContextLost();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    onContextRestored();
  });

  return { engine: glEngine, backend: 'WebGL2' };
}
