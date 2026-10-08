/**
 * 拍歪自动矫正：从图里估出倾斜角。
 *
 * 思路是经典的「梯度方向直方图」，不需要任何模型：
 *
 *   1. 把图缩到小尺寸并转灰度（这一步由调用方做，这里只吃 ImageData）；
 *   2. 求每个像素的 Sobel 梯度；
 *   3. 只保留梯度够强的像素（平坦区域的方向是噪声）；
 *   4. 算边缘方向相对最近的水平/垂直轴的偏差，投进直方图，权重取梯度强度；
 *   5. 找峰值就是整张图的主导倾斜角。
 *
 * 第 4 步的「相对最近轴」是关键：文档、桌面、建筑同时有大量水平边和垂直边，
 * 如果不把两者折到同一个区间，直方图会出现两个峰，谁都代表不了整体倾斜。
 *
 * 局限也说清楚：画面里没有明显直线时（比如一张风景照、纯色背景的产品图），
 * 结果就是噪声。所以输出带 confidence，UI 只在置信度够高时才自动应用。
 */

export interface SkewResult {
  /**
   * 建议施加的旋转角（度）。正值表示顺时针 —— 与 canvas `rotate()`
   * 和滑块的正方向保持一致，拿到就能直接用。
   */
  angle: number
  /** 0..1 的置信度。太低说明这图里没有可用的直线参考。 */
  confidence: number
}

/** 超过这个角度就不像「拍歪」而像刻意旋转了，直接放弃自动检测。 */
const MAX_SKEW_DEG = 15

/** 直方图分辨率：0.5° 一格，覆盖 -45°..45°。 */
const BIN_DEG = 0.5
const BIN_COUNT = Math.round(90 / BIN_DEG)

export function detectSkew(image: ImageData): SkewResult {
  const { width, height, data } = image
  if (width < 8 || height < 8) return { angle: 0, confidence: 0 }

  const gray = toGray(data, width * height)
  const histogram = new Float32Array(BIN_COUNT)
  let weightSum = 0

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x
      const topLeft = gray[i - width - 1]!
      const top = gray[i - width]!
      const topRight = gray[i - width + 1]!
      const left = gray[i - 1]!
      const right = gray[i + 1]!
      const bottomLeft = gray[i + width - 1]!
      const bottom = gray[i + width]!
      const bottomRight = gray[i + width + 1]!

      const gx = topRight + 2 * right + bottomRight - topLeft - 2 * left - bottomLeft
      const gy = bottomLeft + 2 * bottom + bottomRight - topLeft - 2 * top - topRight

      const magnitude = Math.hypot(gx, gy)
      // 40 是经验阈值：低于它的基本是 JPEG 噪点与渐变，投进去只会淹没真峰值。
      if (magnitude < 40) continue

      // 梯度方向指向亮度增长最快的方向，它垂直于边缘。加 90° 才是边缘本身的朝向。
      let edgeDeg = (Math.atan2(gy, gx) * 180) / Math.PI + 90
      edgeDeg = ((edgeDeg % 180) + 180) % 180

      // 折到「离最近的轴偏了多少」，区间取 (-45, 45]。
      let deviation = edgeDeg % 90
      if (deviation > 45) deviation -= 90

      const bin = Math.round((deviation + 45) / BIN_DEG)
      if (bin < 0 || bin >= BIN_COUNT) continue

      histogram[bin] += magnitude
      weightSum += magnitude
    }
  }

  if (weightSum === 0) return { angle: 0, confidence: 0 }

  const smoothed = smooth(histogram)
  let peak = 0
  let peakValue = 0
  for (let i = 1; i < BIN_COUNT - 1; i += 1) {
    if (smoothed[i]! > peakValue) {
      peakValue = smoothed[i]!
      peak = i
    }
  }

  // 抛物线插值：峰值落在格子之间时（比如真实倾斜 3.2°，格宽 0.5°）取回小数。
  const left = smoothed[peak - 1] ?? peakValue
  const center = smoothed[peak]!
  const rightV = smoothed[peak + 1] ?? peakValue
  const denom = left - 2 * center + rightV
  const offset = Math.abs(denom) < 1e-9 ? 0 : (0.5 * (left - rightV)) / denom

  const deviation = (peak + offset) * BIN_DEG - 45

  // 直方图本身的平均强度：峰值比它高出多少，就代表这个方向有多「一呼百应」。
  const mean = weightSum / BIN_COUNT
  const confidence = Math.max(0, Math.min(1, (peakValue - mean) / (peakValue + mean)))

  if (Math.abs(deviation) > MAX_SKEW_DEG) return { angle: 0, confidence: 0 }

  // 边缘偏了 +d 度，就要把图反向转 d 度拉回来。canvas 的 rotate 正方向是
  // 顺时针，而这里的像素坐标系 y 轴向下，两者一致，所以直接取负号。
  return { angle: round1(-deviation), confidence }
}

function toGray(data: Uint8ClampedArray, pixels: number): Float32Array {
  const gray = new Float32Array(pixels)
  for (let i = 0, p = 0; i < pixels; i += 1, p += 4) {
    gray[i] = 0.299 * data[p]! + 0.587 * data[p + 1]! + 0.114 * data[p + 2]!
  }
  return gray
}

/** 三格滑动平均。单像素级的抖动会让峰值在相邻格之间来回跳。 */
function smooth(histogram: Float32Array): Float32Array {
  const out = new Float32Array(histogram.length)
  for (let i = 0; i < histogram.length; i += 1) {
    const prev = histogram[i - 1] ?? 0
    const next = histogram[i + 1] ?? 0
    out[i] = (prev + histogram[i]! + next) / 3
  }
  return out
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * 把待检测的图缩到适合做直方图的尺寸。
 *
 * 原图直接算会慢一个数量级，而倾斜估计根本用不着高清 —— 480 长度已经够
 * 分辨 0.1° 量级的偏差，再大只是徒增像素。
 */
export function toAnalysisImage(source: CanvasImageSource, width: number, height: number): ImageData {
  const limit = 480
  const scale = Math.min(1, limit / Math.max(width, height))
  const w = Math.max(8, Math.round(width * scale))
  const h = Math.max(8, Math.round(height * scale))

  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('canvas-context-failed')
  ctx.drawImage(source, 0, 0, width, height, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}
