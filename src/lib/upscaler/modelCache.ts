import { UpscaleError } from './errors'

/**
 * Model weights are fetched once and parked in the Cache Storage API, which
 * happily holds multi-megabyte binaries and survives reloads. A repeat visit
 * never re-downloads.
 *
 * Cache Storage is treated strictly as an optimisation. It is genuinely
 * unreliable — private browsing disables it, and some environments (headless
 * Chromium, for one) leave `open()` pending forever instead of rejecting.
 * Every interaction is therefore raced against a timer and dropped on failure,
 * because fetching over the network still works fine.
 */
const CACHE_NAME = 'upscale-models-v1'
const CACHE_OPEN_TIMEOUT_MS = 1500
const CACHE_READ_TIMEOUT_MS = 2000
const CACHE_WRITE_TIMEOUT_MS = 5000

export interface FetchModelOptions {
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

/** Resolves to `undefined` if the work does not finish in time. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    work,
    new Promise<undefined>((resolve) => {
      setTimeout(() => resolve(undefined), ms)
    }),
  ])
}

async function openModelCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return (await withTimeout(caches.open(CACHE_NAME), CACHE_OPEN_TIMEOUT_MS)) ?? null
  } catch {
    return null
  }
}

async function readCached(cache: Cache, url: string): Promise<ArrayBuffer | null> {
  try {
    const hit = await withTimeout(cache.match(url), CACHE_READ_TIMEOUT_MS)
    if (!hit) return null
    return await hit.arrayBuffer()
  } catch {
    return null
  }
}

function storeCached(cache: Cache, url: string, buffer: ArrayBuffer): void {
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
    CACHE_WRITE_TIMEOUT_MS,
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
  const { onProgress, signal } = options

  const cache = await openModelCache()
  if (cache) {
    const cached = await readCached(cache, url)
    if (cached) {
      onProgress?.(1)
      return cached
    }
  }

  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new UpscaleError('model-download-failed', { status: response.status })
  }

  const buffer = await readBody(response, onProgress)
  if (cache) storeCached(cache, url, buffer)
  return buffer
}

export async function clearModelCache(): Promise<void> {
  const cache = await openModelCache()
  if (!cache) return
  try {
    await withTimeout(caches.delete(CACHE_NAME), CACHE_WRITE_TIMEOUT_MS)
  } catch {
    // Nothing to do — the cache is best-effort by design.
  }
}
