/**
 * 点选抠图里所有「算坐标」和「算数值」的部分。
 *
 * 刻意不碰任何 DOM / canvas API：遮罩怎么映射回原图、候选怎么挑、覆盖率怎么算，
 * 都是可以被单独验证的纯函数，能在 Node 里直接跑断言。真正需要浏览器重采样的
 * 那一步（把遮罩缩放回原图分辨率）留在 `index.ts`，交给 `drawImage` 做。
 */

/** 等比放进正方形画布后的补边盒，单位是目标画布的像素。 */
export interface PadBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 把 `sourceW × sourceH` 等比塞进 `target × target` 的正方形，返回居中后的盒。
 *
 * 与 SAM 官方前处理（以及 sam-web 的 `resizeAndPadBox`）逐字节一致 ——
 * 差一个像素，提示点就会落在主体的相邻像素上，抠出来的东西完全不同。
 * 所以这里连 `Math.floor` 的位置都照抄，不做「优化」。
 */
export function padBox(sourceW: number, sourceH: number, target: number): PadBox {
  if (sourceW === sourceH) {
    return { x: 0, y: 0, w: target, h: target }
  }
  if (sourceH > sourceW) {
    const w = (sourceW / sourceH) * target
    return { x: Math.floor((target - w) / 2), y: 0, w, h: target }
  }
  const h = (sourceH / sourceW) * target
  return { x: 0, y: Math.floor((target - h) / 2), w: target, h }
}

/**
 * 把图像空间的补边盒换算到遮罩空间。
 *
 * 解码器输出的是 `maskEdge × maskEdge` 的图（可能只有 256，也可能跟着
 * `orig_im_size` 到 1024），而补边盒是按编码器的 1024 算的，两个坐标系之间
 * 差一个比例。返回同一块区域在遮罩里的位置。
 */
export function padBoxInMaskSpace(box: PadBox, imageSize: number, maskEdge: number): PadBox {
  const scale = maskEdge / imageSize
  return {
    x: box.x * scale,
    y: box.y * scale,
    w: box.w * scale,
    h: box.h * scale,
  }
}

/** 遮罩数值的两种可能语义。 */
export type MaskValueKind = 'probability' | 'logits'

/**
 * 判断解码器吐出来的是概率还是未激活的 logits。
 *
 * 官方 SAM 导出在图的末尾带了 sigmoid，但社区重导出的版本不一定带。判错的
 * 后果很隐蔽：logits 直接当概率用，整张图会被判成前景，表现为「一点就全选」。
 * 日志值几乎必然出现负数，概率值不会，所以看极值就够了。
 */
export function resolveMaskKind(data: Float32Array): MaskValueKind {
  let min = Infinity
  let max = -Infinity
  // 一兆个像素没必要全扫，隔 97 个取一个，极值统计不受影响。
  const step = Math.max(1, Math.floor(data.length / 20_000))
  for (let i = 0; i < data.length; i += step) {
    const value = data[i]
    if (value < min) min = value
    if (value > max) max = value
  }
  return min < -1e-3 || max > 1 + 1e-3 ? 'logits' : 'probability'
}

/**
 * 低于这个概率的像素直接判为背景。
 *
 * SAM 的遮罩边缘是软的，但背景里也会留下 0.01 量级的噪声，不切掉就会在成品
 * 上表现为一层「擦不干净的脏点」。
 */
const ALPHA_FLOOR = 0.03

/**
 * 把置信度转成 0-255 的 alpha。`logits` 先过 sigmoid。
 *
 * 低于 `ALPHA_FLOOR` 的直接判为背景，其余在 [floor, 1] 上线性铺满 0-255。
 * SAM 遮罩的过渡带很窄，线性映射留下的半透明正好当抗锯齿用，不必再做硬化。
 */
function toAlpha(value: number, kind: MaskValueKind): number {
  let probability = value
  if (kind === 'logits') {
    probability = value >= 0 ? 1 / (1 + Math.exp(-value)) : Math.exp(value) / (1 + Math.exp(value))
  }
  if (!Number.isFinite(probability) || probability <= ALPHA_FLOOR) return 0
  const t = (probability - ALPHA_FLOOR) / (1 - ALPHA_FLOOR)
  return Math.round(Math.min(1, t) * 255)
}

/**
 * 把一张遮罩摊平成**只含 alpha** 的平面，尺寸仍是 `maskEdge × maskEdge`，
 * 包含补边黑边（补边处原本就是背景，自然落在 0）。
 */
export function maskToAlphaPlane(
  data: Float32Array,
  kind: MaskValueKind,
): Uint8ClampedArray {
  const plane = new Uint8ClampedArray(data.length)
  for (let i = 0; i < data.length; i++) {
    plane[i] = toAlpha(data[i], kind)
  }
  return plane
}

/** 从多张候选里挑 IoU 预测最高的那张，返回它的下标与分数。 */
export function pickBestMask(iou: Float32Array, maskCount: number): { index: number; score: number } {
  const limit = Math.min(maskCount, iou.length)
  let index = 0
  let score = -Infinity
  for (let i = 0; i < limit; i++) {
    if (iou[i] > score) {
      score = iou[i]
      index = i
    }
  }
  return { index, score: Number.isFinite(score) ? score : 0 }
}

/**
 * 主体占**原图**面积的比例。
 *
 * 只统计补边盒内部 —— 补边那两条黑边本来就不属于照片，算进去会把覆盖率稀释，
 * 一张竖图里抠中整个人也只有 56%。
 */
export function coverageInBox(
  plane: Uint8ClampedArray,
  maskEdge: number,
  box: PadBox,
): number {
  const x0 = Math.max(0, Math.floor(box.x))
  const y0 = Math.max(0, Math.floor(box.y))
  const x1 = Math.min(maskEdge, Math.ceil(box.x + box.w))
  const y1 = Math.min(maskEdge, Math.ceil(box.y + box.h))
  if (x1 <= x0 || y1 <= y0) return 0

  let hit = 0
  let total = 0
  for (let y = y0; y < y1; y++) {
    const row = y * maskEdge
    for (let x = x0; x < x1; x++) {
      total++
      if (plane[row + x] > 127) hit++
    }
  }
  return total === 0 ? 0 : hit / total
}

/** 把归一化坐标夹进 [0,1]，挡住画布边缘外的一次点击。 */
export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/**
 * 从显示坐标反推原图的归一化坐标。
 *
 * 预览用的 `<img>` 是 `object-contain` 的，显示框里会有留白，所以不能拿
 * 「点击位置 / 元素尺寸」直接当比例 —— 那会把竖图的点算到画面外。这里按真实
 * 绘制区域换算，留白上的点击一律丢弃（返回 null）。
 */
export function toNormalizedPoint(
  offsetX: number,
  offsetY: number,
  elementWidth: number,
  elementHeight: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } | null {
  if (elementWidth <= 0 || elementHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) return null

  // `object-contain` 的等比缩放：取两边比例的较小者，再居中。
  const scale = Math.min(elementWidth / imageWidth, elementHeight / imageHeight)
  const drawnWidth = imageWidth * scale
  const drawnHeight = imageHeight * scale
  const left = (elementWidth - drawnWidth) / 2
  const top = (elementHeight - drawnHeight) / 2

  const x = (offsetX - left) / drawnWidth
  const y = (offsetY - top) / drawnHeight
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x: clampUnit(x), y: clampUnit(y) }
}
