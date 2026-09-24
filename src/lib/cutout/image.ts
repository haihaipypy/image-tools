import type { CutoutQuality } from '../types'
import { CutoutError } from './errors'
import { IMAGE_MEAN, IMAGE_STD } from './models'

export const MAX_IMAGE_BYTES = 40 * 1024 * 1024

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateImage(input: File): void {
  if (input.type && !SUPPORTED_TYPES.has(input.type)) {
    throw new CutoutError('unsupported-image', { detail: input.type })
  }
  if (input.size > MAX_IMAGE_BYTES) {
    throw new CutoutError('image-too-large', { detail: String(input.size) })
  }
}

export async function decodeImage(input: Blob): Promise<ImageBitmap> {
  try {
    // 尊重 EXIF 方向：手机竖拍的图如果不转正，抠出来的主体是歪的。
    return await createImageBitmap(input, { imageOrientation: 'from-image' })
  } catch (error) {
    throw new CutoutError('decode-failed', {
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * 把源图画到 512×512 并归一化成 NCHW float32。
 *
 * BiRefNet 的官方预处理很朴素：等比缩放到固定边长（**不做** letterbox，
 * 长宽比失真交给网络吸收），除以 255 转 [0,1]，再减均值除标准差。
 *
 * `willReadFrequently` 在这里是必要的 —— 我们只画一次但马上要把像素读回来，
 * 不标这个会让浏览器把 canvas 放在 GPU 上，回读触发一次同步拷贝。
 */
export function preprocess(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  size: number,
): Float32Array {
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new CutoutError('canvas-context-failed')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, size, size)

  const { data } = ctx.getImageData(0, 0, size, size)
  const plane = size * size
  const out = new Float32Array(plane * 3)

  for (let i = 0, p = 0; i < plane; i += 1, p += 4) {
    out[i] = (data[p]! / 255 - IMAGE_MEAN[0]) / IMAGE_STD[0]
    out[plane + i] = (data[p + 1]! / 255 - IMAGE_MEAN[1]) / IMAGE_STD[1]
    out[plane * 2 + i] = (data[p + 2]! / 255 - IMAGE_MEAN[2]) / IMAGE_STD[2]
  }

  return out
}

/**
 * 把网络输出转成 0..1 的 alpha 通道。
 *
 * `outputIsLogits` 为真时先过 sigmoid —— BiRefNet 导出的是未激活 logits，
 * 直接当 alpha 用会得到一片饱和的 0/1，边缘全丢。
 */
export function toAlpha(
  raw: Float32Array,
  expectPixels: number,
  outputIsLogits: boolean,
): Float32Array {
  if (raw.length !== expectPixels) {
    throw new CutoutError('invalid-mask', { detail: `${raw.length} != ${expectPixels}` })
  }

  const alpha = new Float32Array(raw.length)
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (let i = 0; i < raw.length; i += 1) {
    const value = outputIsLogits ? sigmoid(raw[i]!) : raw[i]!
    alpha[i] = value
    if (value < min) min = value
    if (value > max) max = value
  }

  // 全 NaN / Inf 说明这一轮推理是坏的（WebGPU 在部分驱动上会静默返回垃圾）。
  // 抛出去让上层回退到 WASM，而不是把一张全透明的图交给用户。
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new CutoutError('invalid-mask', { detail: 'non-finite output' })
  }

  return alpha
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value))
}

/** 前景像素占比，用来判断结果是不是「抠空了」。 */
export function measureCoverage(alpha: Float32Array): number {
  let foreground = 0
  for (let i = 0; i < alpha.length; i += 1) {
    if (alpha[i]! >= 0.5) foreground += 1
  }
  return alpha.length > 0 ? foreground / alpha.length : 0
}

/**
 * 把 alpha 遮罩贴回原图，输出带透明通道的 PNG。
 *
 * mask 只有 512×512，而原图可能大得多。直接用 `destination-in` 让 canvas
 * 自己做双线性放大 —— 单通道遮罩放大后边缘会偏软，但比先放大遮罩再逐像素
 * 合成（要多一次全尺寸 ImageData 往返）省得多。`quality` 档额外做一次
 * 边缘硬化，把半透明的过渡带压窄，看起来更锐利。
 */
export async function composeTransparent(
  image: ImageBitmap,
  alpha: Float32Array,
  maskWidth: number,
  maskHeight: number,
  quality: CutoutQuality,
): Promise<{ blob: Blob; coverage: number }> {
  const coverage = measureCoverage(alpha)

  const maskCanvas = new OffscreenCanvas(maskWidth, maskHeight)
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new CutoutError('canvas-context-failed')

  const maskImage = maskCtx.createImageData(maskWidth, maskHeight)
  for (let i = 0, p = 0; i < alpha.length; i += 1, p += 4) {
    const value = quality === 'quality' ? alpha[i]! : smoothstep(0.08, 0.92, alpha[i]!)
    maskImage.data[p] = 255
    maskImage.data[p + 1] = 255
    maskImage.data[p + 2] = 255
    maskImage.data[p + 3] = Math.round(value * 255)
  }
  maskCtx.putImageData(maskImage, 0, 0)

  const output = new OffscreenCanvas(image.width, image.height)
  const ctx = output.getContext('2d')
  if (!ctx) throw new CutoutError('canvas-context-failed')

  ctx.drawImage(image, 0, 0)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = quality === 'quality' ? 'high' : 'medium'
  ctx.drawImage(maskCanvas, 0, 0, maskWidth, maskHeight, 0, 0, image.width, image.height)

  const blob = await output.convertToBlob({ type: 'image/png' })
  return { blob, coverage }
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)))
  return x * x * (3 - 2 * x)
}
