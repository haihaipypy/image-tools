import { RuntimeError } from './errors'

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
 */
const OPEN_TIMEOUT_MS = 1500
const READ_TIMEOUT_MS = 2000
const WRITE_TIMEOUT_MS = 30_000

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

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new RuntimeError('asset-failed', { status: response.status })
  }

  const buffer = await readBody(response, onProgress)
  if (cache) storeCached(cache, url, buffer)
  return buffer
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
