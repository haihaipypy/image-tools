import type { BackendKind, CutoutModelSpec, CutoutProgressHandler } from '../types'
import { CutoutError } from './errors'
import { fetchModelBuffer, type FetchModelOptions } from './modelCache'
import { configureThreads, ort, prepareOrtRuntime } from '../ort'

export interface CutoutSession {
  session: ort.InferenceSession
  backend: BackendKind
}

/**
 * 会话按「模型 + 后端」缓存。
 *
 * 与放大不同，抠图一次只跑**一张** 512×512 的图，没有瓦片循环，所以「建会话」
 * 相对「跑推理」的开销大得多 —— 一个 94 MB 的图要解析并上传全部权重。缓存
 * 命中意味着用户换图重抠时几乎立即出结果。
 *
 * 只保留最近一个：同时留 fp16 与 fp32 两份会话意味着两份权重常驻显存/内存，
 * 而用户几乎不会在同一会话里来回切模型。
 */
let active: { key: string; handle: CutoutSession } | null = null

function sessionKey(spec: CutoutModelSpec, backend: BackendKind): string {
  return `${spec.id}::${backend}`
}

async function disposeActive(): Promise<void> {
  if (!active) return
  try {
    await active.handle.session.release()
  } catch {
    // 释放一个已经失败的会话不是值得上报的错误。
  }
  active = null
}

export interface AcquireCutoutOptions {
  spec: CutoutModelSpec
  preferWebgpu: boolean
  threads: boolean
  onProgress?: CutoutProgressHandler
  signal?: AbortSignal
}

/**
 * 取一个可用的推理会话。
 *
 * 先按首选后端找一个；如果 WebGPU 建不起来（驱动不给力、显存不够），自动
 * 降到 WASM 再试一次。注意两者的权重文件不同 —— fp16 与 fp32 是两套独立
 * 下载，降级会触发第二次下载，这是无法避免的代价。
 */
export async function acquireCutoutSession(
  options: AcquireCutoutOptions,
): Promise<CutoutSession> {
  const { spec, preferWebgpu, threads, onProgress, signal } = options
  const attempts: BackendKind[] = preferWebgpu ? ['webgpu', 'wasm'] : ['wasm']

  let lastError: unknown = null

  for (const backend of attempts) {
    const key = sessionKey(spec, backend)
    if (active?.key === key) return active.handle

    try {
      const handle = await createSession(spec, backend, threads, onProgress, signal)
      await disposeActive()
      active = { key, handle }
      return handle
    } catch (error) {
      lastError = error
    }
  }

  throw new CutoutError('session-init-failed', {
    detail: lastError instanceof Error ? lastError.message : String(lastError),
  })
}

async function createSession(
  spec: CutoutModelSpec,
  backend: BackendKind,
  threads: boolean,
  onProgress: CutoutProgressHandler | undefined,
  signal: AbortSignal | undefined,
): Promise<CutoutSession> {
  configureThreads(threads)

  const variant = spec.variants[backend]
  const fetchOptions: FetchModelOptions = {
    signal,
    onProgress: (ratio) => onProgress?.({ phase: 'fetching-model', ratio }),
  }
  const buffer = await fetchModelBuffer(variant.url, fetchOptions)

  onProgress?.({ phase: 'warming-up', ratio: null })

  // 两个后端跑在同一份 wasm 运行时上，所以只需要准备一次。
  await prepareOrtRuntime()

  const session = await ort.InferenceSession.create(buffer, {
    executionProviders: [backend],
    graphOptimizationLevel: 'all',
  })

  return { session, backend }
}

export async function releaseCutoutSession(): Promise<void> {
  await disposeActive()
}
