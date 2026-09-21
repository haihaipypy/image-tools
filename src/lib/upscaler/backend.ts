import type { BackendCapabilities } from '../types'

/**
 * Minimal structural typing for the WebGPU adapter so we do not depend on a
 * particular lib.dom revision shipping the WebGPU types.
 */
interface GPUAdapterLike {
  info?: { vendor?: string; architecture?: string; description?: string }
  features?: { has(name: string): boolean }
}

interface GPULike {
  requestAdapter(options?: {
    powerPreference?: 'low-power' | 'high-performance'
  }): Promise<GPUAdapterLike | null>
}

function getGpu(): GPULike | null {
  const nav = navigator as Navigator & { gpu?: GPULike }
  return nav.gpu ?? null
}

let cached: BackendCapabilities | null = null

/**
 * Probes what this device can actually do. Runs once per page load; the
 * result is memoised because `requestAdapter()` is not free.
 */
export async function probeCapabilities(): Promise<BackendCapabilities> {
  if (cached) return cached

  const crossOriginIsolated = globalThis.crossOriginIsolated === true

  let webgpu = false
  let adapterLabel: string | null = null

  const gpu = getGpu()
  if (gpu) {
    try {
      const adapter = await Promise.race([
        gpu.requestAdapter({ powerPreference: 'high-performance' }),
        // Software-rendered and headless environments can leave this promise
        // pending forever. Never let the UI hang on a capability probe.
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ])
      if (adapter) {
        webgpu = true
        const info = adapter.info
        adapterLabel =
          [info?.vendor, info?.architecture].filter(Boolean).join(' ') || info?.description || null
      }
    } catch {
      webgpu = false
    }
  }

  cached = {
    webgpu,
    // Threaded WASM only unlocks under cross-origin isolation, which requires
    // COOP/COEP headers we cannot set from the browser alone.
    threads: crossOriginIsolated && (navigator.hardwareConcurrency ?? 1) > 1,
    crossOriginIsolated,
    adapterLabel,
  }
  return cached
}
