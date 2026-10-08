import type {
  PromptPoint,
  SegmentModelSpec,
  SegmentOutcome,
  SegmentProgressHandler,
} from '../types'
import { SegmentError } from './errors'
import { canvas2d, makeCanvas } from './canvas'
import { coverageInBox, padBoxInMaskSpace } from './geometry'
import { SEGMENT_MODEL } from './models'
import {
  acquireSegmentSessions,
  decodeMask,
  encodeImage,
  type Encoding,
  type SegmentSessions,
} from './session'

export { SEGMENT_DOWNLOAD_BYTES, SEGMENT_MODEL, SEGMENT_MODELS } from './models'
export {
  clearModelCache as clearSegmentModelCache,
  CACHE_NAME as SEGMENT_CACHE_NAME,
} from './modelCache'
export { releaseSegmentSessions } from './session'
export { SegmentError } from './errors'
export type { SegmentErrorCode } from './errors'

/**
 * 上一次编码的图像嵌入。
 *
 * 点选抠图的交互模型是「编码一次、点击多次」：MobileSAM 编码一张 1024² 的图
 * 在 CPU 上要好几秒，而解码一次只要几百毫秒。没有这层缓存，用户每点一下都要
 * 从头再等一遍 —— 工具会显得根本不能用。
 *
 * 存储以 `bitmap` 的**对象身份**为键，不做内容比对：换图时 `useSegment` 一定
 * 会给一个全新的 `ImageBitmap`，所以身份比较既够用又不会误命中。
 */
let cached: { bitmap: unknown; embedding: Encoding; sessions: SegmentSessions } | null = null

/** 换图或退出时把嵌入丢掉，别让 4 MB 的中间结果一直跟着走。 */
export function releaseEncoding(): void {
  cached = null
}

export interface SegmentOptions {
  bitmap: ImageBitmap | HTMLCanvasElement | OffscreenCanvas
  points: PromptPoint[]
  preferWebgpu: boolean
  threads: boolean
  spec?: SegmentModelSpec
  onProgress?: SegmentProgressHandler
  signal?: AbortSignal
}

/**
 * 按提示点抠出主体，返回一张带透明背景的图。
 *
 * 与 `cutoutLocally` 的分工：那边是「模型自己决定主体是谁」，这边是「用户告诉
 * 模型主体在哪」。所以这里没有质量档、没有覆盖率兜底 —— 抠错是用户点错，
 * 界面要做的是让他能撤销和补点，而不是替他猜。
 */
export async function cutoutByPoints(options: SegmentOptions): Promise<SegmentOutcome> {
  const {
    bitmap,
    points,
    preferWebgpu,
    threads,
    spec = SEGMENT_MODEL,
    onProgress,
    signal,
  } = options

  if (points.length === 0) {
    throw new SegmentError('empty-mask', { detail: 'no-prompt-points' })
  }

  const sessions = await acquireSegmentSessions({ spec, preferWebgpu, threads, onProgress, signal })
  throwIfAborted(signal)

  const reuse = cached && cached.bitmap === bitmap && cached.sessions === sessions ? cached : null
  let embedding: Encoding
  let reusedEncoding: boolean

  if (reuse) {
    embedding = reuse.embedding
    reusedEncoding = true
  } else {
    embedding = await encodeImage(sessions, spec, bitmap, onProgress)
    cached = { bitmap, embedding, sessions }
    reusedEncoding = false
  }

  throwIfAborted(signal)

  const decoded = await decodeMask(sessions, spec, embedding, points, onProgress)
  const maskBox = padBoxInMaskSpace(embedding.box, spec.imageSize, decoded.maskEdge)
  const coverage = coverageInBox(decoded.plane, decoded.maskEdge, maskBox)

  // 点全落在背景上时 SAM 会返回一张几乎全空的遮罩。这不是错误，但用户看到的
  // 会是「什么都没变化」，所以必须明确告诉他重新点，而不是静默地给一张透明图。
  if (coverage <= 0) {
    throw new SegmentError('empty-mask')
  }

  onProgress?.({ phase: 'compositing', ratio: null })
  const canvas = composeMasked(bitmap, decoded.plane, decoded.maskEdge, maskBox)

  onProgress?.({ phase: 'done', ratio: 1 })

  return {
    canvas,
    backend: sessions.backend,
    encodeMs: embedding.encodeMs,
    decodeMs: decoded.decodeMs,
    score: decoded.score,
    coverage: coverage * 100,
    reusedEncoding,
  }
}

/**
 * 把「含补边的遮罩」贴回原图，得到透明背景的成品。
 *
 * 分两步而不是逐像素相乘：遮罩先装进一张 `maskEdge²` 的画布，再用
 * `drawImage` 把补边盒那一块**等比缩放到原图尺寸** —— 重采样交给浏览器的
 * 双线性实现，比在 JS 里遍历几百万个像素快一个数量级，边缘也更干净。
 */
function composeMasked(
  bitmap: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
  plane: Uint8ClampedArray,
  maskEdge: number,
  maskBox: { x: number; y: number; w: number; h: number },
): OffscreenCanvas | HTMLCanvasElement {
  const maskCanvas = makeCanvas(maskEdge, maskEdge)
  const maskCtx = canvas2d(maskCanvas)

  const image = new ImageData(maskEdge, maskEdge)
  for (let i = 0; i < plane.length; i++) {
    // RGB 全留 0：合成只用到 alpha，省下三倍写入。
    image.data[i * 4 + 3] = plane[i]
  }
  maskCtx.putImageData(image, 0, 0)

  const out = makeCanvas(bitmap.width, bitmap.height)
  const ctx = canvas2d(out)

  ctx.drawImage(bitmap, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(
    maskCanvas,
    maskBox.x,
    maskBox.y,
    maskBox.w,
    maskBox.h,
    0,
    0,
    bitmap.width,
    bitmap.height,
  )
  ctx.globalCompositeOperation = 'source-over'

  return out
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }
}
