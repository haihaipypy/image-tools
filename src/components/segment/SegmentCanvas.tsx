import { useEffect, useRef, useState } from 'react'
import { MousePointerClick } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { clampUnit } from '../../lib/segment/geometry'
import type { PromptLabel, PromptPoint } from '../../lib/types'

/** 选区高亮色：与「保留/排除」两个标记的配色分开，避免看起来像第三个标记。 */
const TINT = '#2563eb'
const TINT_ALPHA = 0.42

const MARKER_KEEP = '#16a34a'
const MARKER_DROP = '#dc2626'

/** 只需要坐标，鼠标事件和指针事件都满足。 */
interface PointerLike {
  clientX: number
  clientY: number
}

interface SegmentCanvasProps {
  previewUrl: string
  width: number
  height: number
  points: PromptPoint[]
  /** 上一次成功的抠图结果，用来画出选区高亮。没有就只显示原图。 */
  resultUrl: string | null
  /** 正在推理：把画面压暗，顺便挡住重复点击。 */
  working: boolean
  /** 下一次点击会落成哪一类点。 */
  nextLabel: PromptLabel
  onPoint: (x: number, y: number, label: PromptLabel) => void
}

/**
 * 选点画布。
 *
 * 用 `<canvas>` 而不是 `<img>` + 绝对定位的标记层，是有意的：`<img>` 配
 * `object-contain` 时元素盒子通常比实际绘制的图大一圈（留白），标记按百分比
 * 摆位就会偏移，点击坐标还得再扣一次留白。canvas 的盒子**就是**绘制区域，
 * 一个除法就够，竖图横图都不会错位。
 *
 * 画布内部分辨率保持原图尺寸，显示尺寸交给 CSS 的 `max-width` / `max-height`
 * —— 标记层因此可以按百分比摆放，而标记本身始终是固定的像素大小，缩放时不会
 * 跟着糊掉。
 */
export function SegmentCanvas({
  previewUrl,
  width,
  height,
  points,
  resultUrl,
  working,
  nextLabel,
  onPoint,
}: SegmentCanvasProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [source, setSource] = useState<HTMLImageElement | null>(null)
  const [result, setResult] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!previewUrl) {
      setSource(null)
      return
    }
    const image = new Image()
    image.onload = () => setSource(image)
    image.src = previewUrl
    return () => {
      image.onload = null
    }
  }, [previewUrl])

  useEffect(() => {
    if (!resultUrl) {
      setResult(null)
      return
    }
    const image = new Image()
    // 换成新的 Image 对象一定会触发重渲染，所以不必再额外记版本号。
    image.onload = () => setResult(image)
    image.src = resultUrl
    return () => {
      image.onload = null
    }
  }, [resultUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !source) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(source, 0, 0, width, height)

    if (!result) return

    // 结果 PNG 的 alpha 通道就是选区。把它涂成纯色再贴回画面，比逐像素读
    // 遮罩便宜得多 —— 一条 destination-in 就够了。
    const tint = document.createElement('canvas')
    tint.width = width
    tint.height = height
    const tintCtx = tint.getContext('2d')
    if (!tintCtx) return
    tintCtx.fillStyle = TINT
    tintCtx.fillRect(0, 0, width, height)
    tintCtx.globalCompositeOperation = 'destination-in'
    tintCtx.drawImage(result, 0, 0, width, height)

    ctx.globalAlpha = TINT_ALPHA
    ctx.drawImage(tint, 0, 0, width, height)
    ctx.globalAlpha = 1
  }, [source, result, width, height])

  const place = (event: PointerLike, label: PromptLabel) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    // 画布盒子 == 绘制区域，所以直接归一化即可，不需要扣留白。
    onPoint(
      clampUnit((event.clientX - rect.left) / rect.width),
      clampUnit((event.clientY - rect.top) / rect.height),
      label,
    )
  }

  return (
    <div className="relative inline-block leading-none">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={(event) => {
          // 右键交给 onContextMenu，避免同一次点击落两个点。
          if (event.button !== 0) return
          event.preventDefault()
          // Alt / Shift 点击 = 排除，想快点的时候不用去切模式。
          const exclude = event.altKey || event.shiftKey || nextLabel === 0
          place(event, exclude ? 0 : 1)
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          place(event, 0)
        }}
        className="block h-auto max-h-[62vh] w-auto max-w-full cursor-crosshair touch-none rounded-lg select-none"
      />

      {/* 标记层：画布盒子就是图片，所以百分比定位是精确的。 */}
      <div className="pointer-events-none absolute inset-0">
        {points.map((point, index) => (
          <span
            key={`${index}-${point.x.toFixed(5)}-${point.y.toFixed(5)}`}
            className="absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] leading-none font-bold text-white ring-2 ring-white/90 drop-shadow"
            style={{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              backgroundColor: point.label === 1 ? MARKER_KEEP : MARKER_DROP,
            }}
            title={point.label === 1 ? t.segmentPromptKeep : t.segmentPromptDrop}
          >
            {point.label === 1 ? '+' : '−'}
          </span>
        ))}
      </div>

      {points.length === 0 && !working && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/30 text-center">
          <MousePointerClick className="size-7 text-white/90" />
          {/* 只放标题。操作说明由画布下方的 figcaption 常驻显示，两处都写
              同一句话会显得啰嗦，而且点完第一个点画布内提示就消失了。 */}
          <p className="max-w-xs px-4 text-sm font-medium text-white">{t.segmentPickTitle}</p>
        </div>
      )}

      {working && (
        <div className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white">
          <span className="size-1.5 animate-pulse rounded-full bg-blue-400" />
          {/* 角标只说「在忙」，具体卡在哪一步由上面的进度条负责 —— 这里再写一次
              阶段名就会出现「正在下载编码器，角标却写计算轮廓」这种矛盾。 */}
          {t.cutoutRunning}
        </div>
      )}

      {points.length > 0 && !working && (
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: nextLabel === 1 ? MARKER_KEEP : MARKER_DROP }}
          />
          {nextLabel === 1 ? t.segmentModeKeep : t.segmentModeDrop}
        </div>
      )}
    </div>
  )
}
