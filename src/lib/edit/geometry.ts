/**
 * 裁剪 / 旋转 / 切片的纯几何计算。
 *
 * 这里刻意不碰 canvas、不碰 DOM：所有函数都是「数值进、数值出」，因为
 * 这些东西最容易算错（尤其旋转后的内接矩形），而算错的后果是裁出来的图
 * 缺一块角。隔离成纯函数之后可以用脚本直接对着数字验，不用开浏览器。
 *
 * 坐标系约定：一律使用**源图像素**，原点在左上角。
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

/** 「自由裁剪」用 null 表示不锁比例。 */
export type AspectRatio = number | null

export const ASPECT_PRESETS: { id: string; ratio: AspectRatio }[] = [
  { id: 'free', ratio: null },
  { id: '1:1', ratio: 1 },
  { id: '4:3', ratio: 4 / 3 },
  { id: '3:4', ratio: 3 / 4 },
  { id: '16:9', ratio: 16 / 9 },
  { id: '9:16', ratio: 9 / 16 },
]

const DEG = Math.PI / 180

/**
 * 旋转之后画布要多大。
 *
 * 任意角度旋转会把原图转出原来的外接框，所以输出画布必须按旋转后的
 * 外接框来定，否则四个角会被切掉。90 的整数倍时结果正好是交换长宽。
 */
export function orientedSize(width: number, height: number, rotationDeg: number): Size {
  const normalized = normalizeAngle(rotationDeg)
  if (normalized === 0) return { width, height }

  const rad = normalized * DEG
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))

  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(width * sin + height * cos),
  }
}

/**
 * 把角度收拢到 [0, 360)。
 * 负角度、720° 这类输入在 UI 上都可能出现（滑块回绕、自动拉直给出负值）。
 */
export function normalizeAngle(deg: number): number {
  const value = deg % 360
  return value < 0 ? value + 360 : value
}

/** 把角度收拢到 (-180, 180]，用于展示「偏了多少度」。 */
export function signedAngle(deg: number): number {
  const value = normalizeAngle(deg)
  return value > 180 ? value - 360 : value
}

/**
 * 旋转后画面里能放下的最大**轴对齐**矩形（居中）。
 *
 * ⚠️ 入参是**原图**尺寸，不是旋转后的画布尺寸。公式本身就是按「把 w×h 的
 * 矩形转 θ 度之后，里面还能塞下多大的正矩形」推导的，拿旋转后的外接框去算
 * 会得到偏大的结果 —— 表现就是裁完四角仍然露白。曾经踩过这个坑：
 * 3.5° 时算出 400×300（等于原图），实际应该是 384×277。
 *
 * 返回的坐标基于**旋转后的画布**（尺寸由 orientedSize 给出），所以是居中的。
 *
 * 公式出处：Stack Overflow 上被反复验证过的 largest_rotated_rect。
 */
export function largestInscribedRect(
  sourceWidth: number,
  sourceHeight: number,
  rotationDeg: number,
): Rect {
  const canvas = orientedSize(sourceWidth, sourceHeight, rotationDeg)
  const normalized = normalizeAngle(rotationDeg)

  // 0 / 90 / 180 / 270 这些情况下内接矩形就是整张画布，直接短路，
  // 免得浮点误差把宽高算成 511.9999。
  if (Math.abs(normalized - Math.round(normalized)) < 1e-6 && normalized % 90 === 0) {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height }
  }

  const rad = normalized * DEG
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))

  const longer = Math.max(sourceWidth, sourceHeight)
  const shorter = Math.min(sourceWidth, sourceHeight)
  const widerThanTall = sourceWidth >= sourceHeight

  let outW: number
  let outH: number

  if (shorter <= 2 * sin * cos * longer || Math.abs(sin - cos) < 1e-10) {
    // 角度够大（或正好 45°），瓶颈落在短边上。
    const half = 0.5 * shorter
    outW = half / sin
    outH = half / cos
    if (!widerThanTall) {
      const swap = outW
      outW = outH
      outH = swap
    }
  } else {
    const cos2a = cos * cos - sin * sin
    outW = (sourceWidth * cos - sourceHeight * sin) / cos2a
    outH = (sourceHeight * cos - sourceWidth * sin) / cos2a
  }

  // 算出来的宽高是贴着图形边缘的精确值，直接四舍五入会让边界那半个像素落到
  // 图形外面 —— 旋转绘制带抗锯齿，那半个像素就是半透明的，于是裁完四角仍能
  // 看到一点发虚的角。向下取整再让出 1 像素，换四个角干干净净。
  const clampedW = Math.min(Math.max(1, Math.floor(outW) - SAFE_INSET), canvas.width)
  const clampedH = Math.min(Math.max(1, Math.floor(outH) - SAFE_INSET), canvas.height)

  return {
    x: Math.round((canvas.width - clampedW) / 2),
    y: Math.round((canvas.height - clampedH) / 2),
    width: clampedW,
    height: clampedH,
  }
}

/** 内接矩形相对理论最大值内缩的像素数，用来吃掉抗锯齿造成的半透明边缘。 */
const SAFE_INSET = 1

/**
 * 把裁剪框收回合法范围。
 *
 * 三件事按顺序做，顺序不能换：
 * 1. 按比例校正尺寸（否则先夹位置会把框推出去）
 * 2. 尺寸不能超过画布
 * 3. 位置不能越界
 */
export function clampRect(rect: Rect, bounds: Size, ratio: AspectRatio): Rect {
  let { width, height } = rect

  if (ratio !== null && ratio > 0) {
    // 以较大的那条边为准改比例，用户拖动手柄时视觉上更跟手。
    if (width / height > ratio) width = height * ratio
    else height = width / ratio
  }

  width = Math.max(MIN_CROP, Math.min(width, bounds.width))
  height = Math.max(MIN_CROP, Math.min(height, bounds.height))

  if (ratio !== null && ratio > 0) {
    // 第二次校正：上一步的 clamp 可能破坏了比例。
    if (width / height > ratio) width = height * ratio
    else height = width / ratio
    width = Math.min(width, bounds.width)
    height = Math.min(height, bounds.height)
  }

  const x = Math.max(0, Math.min(rect.x, bounds.width - width))
  const y = Math.max(0, Math.min(rect.y, bounds.height - height))

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}

/** 裁剪框的边长下限，防止拖成一条线之后再也拖不回来。 */
export const MIN_CROP = 16

/** 居中放一个给定比例的框，尽量贴满画布。 */
export function centeredRect(bounds: Size, ratio: AspectRatio, inset = 0.9): Rect {
  const available = {
    width: Math.max(MIN_CROP, bounds.width * inset),
    height: Math.max(MIN_CROP, bounds.height * inset),
  }
  const rect = clampRect(
    { x: 0, y: 0, width: available.width, height: available.height },
    bounds,
    ratio,
  )
  return {
    ...rect,
    x: Math.round((bounds.width - rect.width) / 2),
    y: Math.round((bounds.height - rect.height) / 2),
  }
}

export interface SliceOptions {
  /** 列数 / 行数，均为正整数。 */
  cols: number
  rows: number
  /** 块与块之间留出的空隙（像素），0 表示紧贴。 */
  gap?: number
}

/**
 * 把矩形切成 cols×rows 块。
 *
 * 余数按 floor 分配后再把剩下的像素补给前几块 —— 如果一律用 round，
 * 各块相加会跟原图差一两个像素，切片后拼不回原样（九宫格发朋友圈最容易被
 * 人看出接缝）。
 */
export function sliceRects(rect: Rect, options: SliceOptions): Rect[] {
  const cols = Math.max(1, Math.floor(options.cols))
  const rows = Math.max(1, Math.floor(options.rows))
  const gap = Math.max(0, options.gap ?? 0)

  const usableW = rect.width - gap * (cols - 1)
  const usableH = rect.height - gap * (rows - 1)
  if (usableW <= 0 || usableH <= 0) return []

  const baseW = Math.floor(usableW / cols)
  const baseH = Math.floor(usableH / rows)
  const extraW = usableW - baseW * cols
  const extraH = usableH - baseH * rows

  const out: Rect[] = []
  let y = rect.y
  for (let row = 0; row < rows; row += 1) {
    const h = baseH + (row < extraH ? 1 : 0)
    let x = rect.x
    for (let col = 0; col < cols; col += 1) {
      const w = baseW + (col < extraW ? 1 : 0)
      out.push({ x, y, width: w, height: h })
      x += w + gap
    }
    y += h + gap
  }
  return out
}

/** 裁剪框是否退化成「整张图」，用来决定要不要显示「重置」这类操作。 */
export function isFullRect(rect: Rect, bounds: Size): boolean {
  return (
    rect.x === 0 &&
    rect.y === 0 &&
    Math.abs(rect.width - bounds.width) <= 1 &&
    Math.abs(rect.height - bounds.height) <= 1
  )
}

/** 八个拖拽手柄，用罗盘方位命名。 */
export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/**
 * 拖动某个手柄之后的裁剪框。
 *
 * 三条不变量，任何一条破了用户都会觉得「框不听话」：
 *   1. 对面那条边（锚点）纹丝不动；
 *   2. 框不能翻转过来（左边界越过右边界）；
 *   3. 锁了比例时，两条边要同步变，而不是各变各的。
 *
 * 锚点在锁比例后可能被 bounds 挤动一点点 —— 这是无法避免的取舍：
 * 宁可框挪半像素，也不能让它跑出画布。
 */
export function resizeRect(
  start: Rect,
  handle: HandleId,
  dx: number,
  dy: number,
  bounds: Size,
  ratio: AspectRatio,
): Rect {
  let left = start.x
  let top = start.y
  let right = start.x + start.width
  let bottom = start.y + start.height

  const movesLeft = handle.includes('w')
  const movesRight = handle.includes('e')
  const movesTop = handle.includes('n')
  const movesBottom = handle.includes('s')

  if (movesLeft) left += dx
  if (movesRight) right += dx
  if (movesTop) top += dy
  if (movesBottom) bottom += dy

  // 先夹到画布内，再谈比例 —— 反过来的话比例会把框重新推出边界。
  if (movesLeft) left = Math.max(0, Math.min(left, right - MIN_CROP))
  if (movesRight) right = Math.min(bounds.width, Math.max(right, left + MIN_CROP))
  if (movesTop) top = Math.max(0, Math.min(top, bottom - MIN_CROP))
  if (movesBottom) bottom = Math.min(bounds.height, Math.max(bottom, top + MIN_CROP))

  if (ratio !== null && ratio > 0) {
    let width = right - left
    let height = bottom - top

    // 上下手柄只有高度在变，用高度推宽度；其余用宽度推高度。
    const drivenByHeight = handle === 'n' || handle === 's'
    if (drivenByHeight) width = height * ratio
    else height = width / ratio

    if (movesLeft) left = right - width
    else right = left + width

    if (movesTop) top = bottom - height
    else bottom = top + height

    // 纯水平手柄让垂直方向保持居中，纯垂直手柄让水平方向保持居中 ——
    // 否则拖动时框会诡异地往上或往左「爬」。
    if (handle === 'e' || handle === 'w') {
      const centerY = start.y + start.height / 2
      top = centerY - height / 2
      bottom = centerY + height / 2
    } else if (drivenByHeight) {
      const centerX = start.x + start.width / 2
      left = centerX - width / 2
      right = centerX + width / 2
    }
  }

  return clampRect(
    { x: left, y: top, width: right - left, height: bottom - top },
    bounds,
    ratio,
  )
}

