import { RuntimeError } from './errors'
import { modelSourceCandidates, rememberModelHost } from './sources'

/**
 * 模型权重的通用下载与缓存。
 *
 * 权重取一次后放进 Cache Storage API —— 它能装下几十兆的二进制，且跨刷新
 * 存活。重复访问不再重下。
 *
 * Cache Storage 在这里被严格当作**优化**而非依赖。它是真的不可靠：隐私模式
 * 直接禁用，某些环境（比如无头 Chromium）会让 `open()` 永远挂着而不是 reject。
 * 因此每次交互都跟一个计时器赛跑，失败就放弃 —— 走网络照样能用。
 *
 * 缓存名按模型族分开，这样一个工具的清理不会误伤另一个。
 *
 * 一个地址可能对应多个下载源（官方站 + 国内镜像），见 sources.ts。缓存键
 * 一律用**注册表里的规范地址**，不是实际命中的那个源 —— 否则换一次源就等于
 * 换一个缓存键，几十兆要重下一遍。
 */
const OPEN_TIMEOUT_MS = 1500
const READ_TIMEOUT_MS = 2000
const WRITE_TIMEOUT_MS = 30_000

/**
 * 单个源「连上并拿到响应头」的等待上限。
 *
 * 只限到响应头为止 —— 见 openModelResponse 的注释：罩住整个下载会误杀慢网，
 * 而完全不限时又会让备选源永远轮不到。
 */
const HEADER_TIMEOUT_MS = 10_000

export interface FetchModelOptions {
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
  /** Cache Storage 的桶名。默认给放大模型用，抠图传自己的。 */
  cacheName?: string
}

const DEFAULT_CACHE_NAME = 'upscale-models-v1'

/** 已开过的 Cache 句柄，按桶名记住。 */
const opened = new Map<string, Promise<Cache | null>>()

/** Resolves to `undefined` if the work does not finish in time. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    work,
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), ms)
    }),
  ])
}

function openModelCache(cacheName: string): Promise<Cache | null> {
  const existing = opened.get(cacheName)
  if (existing) return existing

  const promise = (async (): Promise<Cache | null> => {
    if (typeof caches === 'undefined') return null
    try {
      return (await withTimeout(caches.open(cacheName), OPEN_TIMEOUT_MS)) ?? null
    } catch {
      return null
    }
  })()

  opened.set(cacheName, promise)
  return promise
}

async function readCached(cache: Cache, url: string): Promise<ArrayBuffer | null> {
  try {
    const hit = await withTimeout(cache.match(url), READ_TIMEOUT_MS)
    if (!hit) return null
    return await hit.arrayBuffer()
  } catch {
    return null
  }
}

function storeCached(cache: Cache, url: string, buffer: ArrayBuffer): void {
  // put() 消费 Response 的 body，而调用方还要用 buffer，所以必须拷贝一份。
  const copy = buffer.slice(0)
  void withTimeout(
    cache.put(
      url,
      new Response(copy, {
        headers: {
          'content-type': 'application/octet-stream',
          'content-length': String(copy.byteLength),
        },
      }),
    ),
    WRITE_TIMEOUT_MS,
  ).catch(() => undefined)
}

/** Streams the body so the UI can show real download progress. */
async function readBody(
  response: Response,
  onProgress?: (ratio: number) => void,
): Promise<ArrayBuffer> {
  const total = Number(response.headers.get('content-length') ?? 0)
  if (!response.body || !Number.isFinite(total) || total <= 0) {
    const buffer = await response.arrayBuffer()
    onProgress?.(1)
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.byteLength
      onProgress?.(Math.min(1, received / total))
    }
  }

  const merged = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged.buffer
}

/**
 * 打开一个响应流，**只给「拿到响应头」这一步限时**。
 *
 * 为什么不能把整个下载罩进超时：几十兆的权重在慢网上下几分钟很正常，一刀切
 * 会误杀正常下载。为什么又必须限时：国内直连 huggingface.co 是「连接挂住」而
 * 不是「立刻报错」，不限时的话备选源永远轮不到，兜底机制等于白写。
 *
 * 用户取消必须**在响应头回来之后依然生效** —— 后面还有几十兆的 body 要传，
 * 所以那个转发监听不随 finally 摘掉。
 */
async function openModelResponse(
  url: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  const attempt = new AbortController()
  const timer = setTimeout(
    () => attempt.abort(new DOMException('等待响应头超时', 'TimeoutError')),
    HEADER_TIMEOUT_MS,
  )

  if (signal) {
    if (signal.aborted) attempt.abort(signal.reason)
    else signal.addEventListener('abort', () => attempt.abort(signal.reason), { once: true })
  }

  try {
    return await fetch(url, { signal: attempt.signal })
  } finally {
    // 头已经回来（或者已经失败），撤掉计时器，别让它掐断后面的 body 传输。
    clearTimeout(timer)
  }
}

export async function fetchModelBuffer(
  url: string,
  options: FetchModelOptions = {},
): Promise<ArrayBuffer> {
  const { onProgress, signal, cacheName = DEFAULT_CACHE_NAME } = options

  const cache = await openModelCache(cacheName)
  if (cache) {
    const cached = await readCached(cache, url)
    if (cached) {
      onProgress?.(1)
      return cached
    }
  }

  let lastError: unknown = null
  let lastStatus: string | number = '?'

  for (const candidate of modelSourceCandidates(url)) {
    try {
      const response = await openModelResponse(candidate, signal)
      if (!response.ok) {
        // 4xx/5xx 也算这个源不行，换下一个。body 不读，直接放掉。
        void response.body?.cancel()
        lastError = null
        lastStatus = response.status
        continue
      }

      const buffer = await readBody(response, onProgress)
      rememberModelHost(candidate)
      if (cache) storeCached(cache, url, buffer)
      return buffer
    } catch (error) {
      // 用户按了取消：这不是「这个源不可用」，别拿去试下一个地址，更别最后
      // 被包装成「下载失败」——上层靠这个异常判断是取消。
      if (signal?.aborted) throw error
      lastError = error
      lastStatus = '网络'
    }
  }

  throw new RuntimeError('model-fetch-failed', {
    status: lastStatus,
    detail: lastError instanceof Error ? lastError.message : undefined,
  })
}

export async function clearModelCache(cacheName = DEFAULT_CACHE_NAME): Promise<void> {
  const cache = await openModelCache(cacheName)
  if (!cache) return
  try {
    await withTimeout(caches.delete(cacheName), WRITE_TIMEOUT_MS)
  } catch {
    // 缓存本来就是尽力而为，删不掉也没什么可做的。
  }
}
