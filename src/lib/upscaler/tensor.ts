import type { InputRange } from '../types'
import { UpscaleError } from './errors'

/**
 * Crops a region out of a source image and packs it into an NCHW float32
 * buffer shaped [1, 3, h, w] — the layout ONNX super-resolution graphs expect.
 */
export function extractTile(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  range: InputRange,
): Float32Array {
  const canvas = new OffscreenCanvas(sw, sh)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new UpscaleError('canvas-context-failed')
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return rgbaToNchw(ctx.getImageData(0, 0, sw, sh).data, sw, sh, range)
}

export function rgbaToNchw(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  range: InputRange,
): Float32Array {
  const plane = width * height
  const out = new Float32Array(plane * 3)
  const divisor = range === 'unit' ? 255 : 1
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    out[i] = rgba[p]! / divisor
    out[plane + i] = rgba[p + 1]! / divisor
    out[plane * 2 + i] = rgba[p + 2]! / divisor
  }
  return out
}

/** Packs an NCHW float32 buffer back into RGBA bytes ready for a canvas. */
export function nchwToImageData(data: Float32Array, width: number, height: number): ImageData {
  const plane = width * height
  const rgba = new Uint8ClampedArray(plane * 4)
  for (let i = 0, p = 0; i < plane; i++, p += 4) {
    rgba[p] = toByte(data[i]!)
    rgba[p + 1] = toByte(data[plane + i]!)
    rgba[p + 2] = toByte(data[plane * 2 + i]!)
    rgba[p + 3] = 255
  }
  return new ImageData(rgba, width, height)
}

function toByte(value: number): number {
  const scaled = value * 255
  return scaled <= 0 ? 0 : scaled >= 255 ? 255 : scaled
}

/**
 * Super-resolution graphs are frozen to a minimum input size (128 for the
 * bundled model). Shrinking an image before upscaling would defeat the point,
 * so instead we grow the canvas and smear the outermost row/column outward —
 * edge replication produces far fewer artefacts than a hard black border.
 */
export function padToMinimum(
  bitmap: ImageBitmap,
  minWidth: number,
  minHeight: number,
): { source: ImageBitmap | OffscreenCanvas; width: number; height: number } {
  const width = Math.max(bitmap.width, minWidth)
  const height = Math.max(bitmap.height, minHeight)
  if (width === bitmap.width && height === bitmap.height) {
    return { source: bitmap, width, height }
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new UpscaleError('canvas-context-failed')
  ctx.drawImage(bitmap, 0, 0)

  const growX = width - bitmap.width
  const growY = height - bitmap.height
  if (growX > 0) {
    ctx.drawImage(
      bitmap,
      bitmap.width - 1,
      0,
      1,
      bitmap.height,
      bitmap.width,
      0,
      growX,
      bitmap.height,
    )
  }
  if (growY > 0) {
    ctx.drawImage(bitmap, 0, bitmap.height - 1, bitmap.width, 1, 0, bitmap.height, bitmap.width, growY)
    if (growX > 0) {
      ctx.drawImage(
        bitmap,
        bitmap.width - 1,
        bitmap.height - 1,
        1,
        1,
        bitmap.width,
        bitmap.height,
        growX,
        growY,
      )
    }
  }
  return { source: canvas, width, height }
}
