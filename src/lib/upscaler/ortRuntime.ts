import * as ort from 'onnxruntime-web/webgpu'
import { UpscaleError } from './errors'

export type LocalBackend = 'webgpu' | 'wasm'

interface ManifestEntry {
  fileName: string
  bytes: number
  /** True when the binary is stored gzipped to fit a hosting size limit. */
  compressed: boolean
  storedAs: string
  storedBytes: number
}

interface OrtManifest {
  sizeLimit: number
  files: Record<string, ManifestEntry>
}

const ORT_BASE = '/ort/'
const RUNTIME_SCRIPT = 'ort-wasm-simd-threaded.asyncify.mjs'
const RUNTIME_BINARY = 'ort-wasm-simd-threaded.asyncify.wasm'

let ready: Promise<void> | null = null

function configure(): void {
  ort.env.logLevel = 'error'
}

function loadManifest(): Promise<OrtManifest> {
  return fetch(`${ORT_BASE}manifest.json`).then(async (response) => {
    if (!response.ok) {
      throw new UpscaleError('runtime-manifest-missing', { status: response.status })
    }
    return (await response.json()) as OrtManifest
  })
}

async function inflate(compressed: ArrayBuffer): Promise<ArrayBuffer> {
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).arrayBuffer()
}

/**
 * Resolves a runtime binary to a URL the browser can reach.
 *
 * Directly servable files keep their real name and cost nothing until ONNX
 * Runtime actually requests them. Gzipped ones have to be downloaded and
 * inflated up front, because inflating is what produces the URL.
 */
async function resolveBinary(entry: ManifestEntry): Promise<string> {
  if (!entry.compressed) {
    return `${ORT_BASE}${entry.storedAs}`
  }

  const response = await fetch(`${ORT_BASE}${entry.storedAs}`)
  if (!response.ok) {
    throw new UpscaleError('runtime-asset-failed', { status: response.status })
  }
  const raw = await inflate(await response.arrayBuffer())
  return URL.createObjectURL(new Blob([raw], { type: 'application/wasm' }))
}

/**
 * Points ONNX Runtime at our own copies of its wasm runtime.
 *
 * Note the shape: ONNX Runtime reads `wasmPaths.mjs` and `wasmPaths.wasm`, not
 * a filename-keyed map. Getting this wrong sends it back to a default path
 * derived from `import.meta.url`, which resolves to a bundler directory that
 * does not contain the binaries.
 *
 * Must be awaited before creating an inference session.
 */
export function prepareOrtRuntime(): Promise<void> {
  ready ??= (async () => {
    configure()

    const manifest = await loadManifest()
    const script = manifest.files[RUNTIME_SCRIPT]
    const binary = manifest.files[RUNTIME_BINARY]
    if (!script || !binary) {
      throw new UpscaleError('runtime-manifest-invalid')
    }

    ort.env.wasm.wasmPaths = {
      mjs: `${ORT_BASE}${script.storedAs}`,
      wasm: await resolveBinary(binary),
    }
  })()

  return ready
}

export function configureThreads(enabled: boolean): void {
  const cores = navigator.hardwareConcurrency ?? 1
  ort.env.wasm.numThreads = enabled ? Math.max(1, Math.min(4, cores)) : 1
  ort.env.wasm.simd = true
}

export { ort }
