import { canvasToBlob } from '../imageOutput'
import { orientedSize, sliceRects, type Rect, type SliceOptions } from './geometry'

/**
 * 把「旋转 + 翻转 + 裁剪」这套变换画到 canvas 上。
 *
 * 分两步走，而且顺序不能换：
 *   1. **定向**：按旋转角把原图画进一张更大的画布（尺寸 = 旋转后外接框）。
 *      任意角度旋转会把原图转出原来的边界，画布必须跟着放大，否则四角被切。
 *   2. **裁剪**：从定向后的画布上取矩形。
 *
 * 裁剪框的坐标系是「定向后」的，不是原图 —— 这样用户看到的预览和拖动的框
 * 始终一一对应，不用在他们拖动时反算旋转。
 */

export interface EditTransform {
  /** 顺时针角度。 */
  rotation: number
  flipHorizontal: boolean
  flipVertical: boolean
}

export const IDENTITY_TRANSFORM: EditTransform = {
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
}

function context2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-context-failed')
  return ctx
}

/** 画出完整的「已定向」图像（旋转 + 翻转，尚未裁剪）。 */
export function renderOriented(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  transform: EditTransform,
): OffscreenCanvas {
  const size = orientedSize(sourceWidth, sourceHeight, transform.rotation)
  const canvas = new OffscreenCanvas(size.width, size.height)
  const ctx = context2d(canvas)

  ctx.translate(size.width / 2, size.height / 2)
  ctx.rotate((transform.rotation * Math.PI) / 180)
  // 翻转放在 rotate 之后：这样「水平翻转」始终是相对屏幕的左右，
  // 而不是相对图片自身的轴向 —— 图转过 90° 后用户仍然会按屏幕来理解。
  ctx.scale(transform.flipHorizontal ? -1 : 1, transform.flipVertical ? -1 : 1)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight)

  return canvas
}

/** 从已定向的画布上裁一块下来。矩形超出边界时按实际重叠区域取。 */
export function cropFrom(oriented: OffscreenCanvas, rect: Rect): OffscreenCanvas {
  const out = new OffscreenCanvas(Math.max(1, rect.width), Math.max(1, rect.height))
  const ctx = context2d(out)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    oriented,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  )
  return out
}

/** 定向 + 裁剪，一步到位。 */
export function renderEdit(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  transform: EditTransform,
  rect: Rect,
): OffscreenCanvas {
  return cropFrom(renderOriented(source, sourceWidth, sourceHeight, transform), rect)
}

export interface SliceOutput {
  blob: Blob
  /** 第几行第几列，从 1 开始 —— 用来拼下载文件名。 */
  row: number
  col: number
  width: number
  height: number
}

/**
 * 切片并编码成 PNG。
 *
 * 复用同一张「已定向」画布逐个抠块，而不是每块都从原图重画一遍 ——
 * 3×3 就是 9 次，重画等于把旋转矩阵算 9 遍。
 */
export async function renderSlices(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  transform: EditTransform,
  rect: Rect,
  options: SliceOptions,
): Promise<SliceOutput[]> {
  const oriented = renderOriented(source, sourceWidth, sourceHeight, transform)
  const rects = sliceRects(rect, options)
  const cols = Math.max(1, Math.floor(options.cols))

  const out: SliceOutput[] = []
  for (let index = 0; index < rects.length; index += 1) {
    const piece = rects[index]!
    const canvas = cropFrom(oriented, piece)
    out.push({
      blob: await canvasToBlob(canvas, 'image/png'),
      row: Math.floor(index / cols) + 1,
      col: (index % cols) + 1,
      width: piece.width,
      height: piece.height,
    })
  }
  return out
}
