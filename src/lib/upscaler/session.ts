import type { ProgressHandler, UpscaleModelSpec } from '../types'
import { UpscaleError } from './errors'
import { fetchModelBuffer } from './modelCache'
import { configureThreads, ort, prepareOrtRuntime, RuntimeError, type LocalBackend } from './ortRuntime'

export interface ActiveSession {
  session: ort.InferenceSession
  backend: LocalBackend
}

/**
 * One session is kept alive across runs. Creating a session means re-parsing
 * the graph and re-uploading ~4.8 MB of weights, so reuse is worth the state.
 */
let active: { key: string; handle: ActiveSession } | null = null

function sessionKey(model: UpscaleModelSpec, preferWebgpu: boolean): string {
  return `${model.id}::${preferWebgpu ? 'gpu' : 'cpu'}`
}

async function disposeActive(): Promise<void> {
  if (!active) return
  try {
    await active.handle.session.release()
  } catch {
    // Releasing a session that already failed is not an error worth surfacing.
  }
  active = null
}

export interface AcquireOptions {
  model: UpscaleModelSpec
  preferWebgpu: boolean
  threads: boolean
  onProgress?: ProgressHandler
  signal?: AbortSignal
}

export async function acquireSession(options: AcquireOptions): Promise<ActiveSession> {
  const { model, preferWebgpu, threads, onProgress, signal } = options
  const key = sessionKey(model, preferWebgpu)

  if (active?.key === key) return active.handle
  await disposeActive()

  configureThreads(threads)

  const buffer = await fetchModelBuffer(model.url, {
    signal,
    onProgress: (ratio) => onProgress?.({ phase: 'fetching-model', ratio }),
  })

  onProgress?.({ phase: 'warming-up', ratio: null })

  // Both providers run on the same wasm runtime, so it only needs staging once.
  await prepareOrtRuntime()

  // WebGPU is the fast path; if the adapter turns out to be unusable we fall
  // back to WASM rather than failing the whole job.
  const attempts: LocalBackend[] = preferWebgpu ? ['webgpu', 'wasm'] : ['wasm']
  let lastError: unknown = null

  for (const backend of attempts) {
    try {
      const session = await ort.InferenceSession.create(buffer, {
        executionProviders: [backend],
        graphOptimizationLevel: 'all',
      })
      const handle: ActiveSession = { session, backend }
      active = { key, handle }
      return handle
    } catch (error) {
      lastError = error
    }
  }

  // 分过类的错误原样抛回。RuntimeError 尤其不能包：它的 message 就是 code，
  // 包进 session-init-failed 之后 UI 再按 code 翻译就找不到人了，用户看到
  // 的会是 model-fetch-failed 这种原始码。详见 cutout/session.ts 的注释。
  if (lastError instanceof UpscaleError || lastError instanceof RuntimeError) throw lastError

  throw new UpscaleError('session-init-failed', {
    detail: lastError instanceof Error ? lastError.message : String(lastError),
  })
}

export async function releaseSession(): Promise<void> {
  await disposeActive()
}
