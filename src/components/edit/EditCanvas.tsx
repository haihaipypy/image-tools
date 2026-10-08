import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  HANDLES,
  resizeRect,
  type AspectRatio,
  type HandleId,
  type Rect,
} from '../../lib/edit/geometry'
import { renderOriented, type EditTransform } from '../../lib/edit/render'

interface EditCanvasProps {
  source: ImageBitmap
  transform: EditTransform
  /** 裁剪框，坐标系是「已定向」的画布。 */
  rect: Rect
  ratio: AspectRatio
  onRectChange: (rect: Rect) => void
  disabled?: boolean
}

/** 手柄在屏幕上保持这个大小，不随图片缩放而变大变小。 */
const HANDLE_SIZE = 12
/** 命中判定的宽容度，比视觉尺寸略大，手指才点得中。 */
const HIT_SLOP = 16
/** 预览最多占视口高度的比例。留出页头与下方状态行的余量。 */
const MAX_VIEW_HEIGHT_RATIO = 0.62

type Drag =
  | { kind: 'move'; startRect: Rect; originX: number; originY: number }
  | { kind: 'resize'; handle: HandleId; startRect: Rect; originX: number; originY: number }

/**
 * 裁剪画布。
 *
 * 预览与命中共用同一张「已定向」画布：用户看到的、拖的和最后导出的，
 * 三者永远是同一套坐标。这是这类编辑器最容易出 bug 的地方 —— 预览画一张、
 * 导出另算一张，一旦旋转角度不是 90 的整数倍，两者就开始对不上。
 *
 * 交互用 Pointer Events 而不是 mouse + touch 两套：一套代码同时覆盖鼠标、
 * 触屏和手写笔，还能靠 setPointerCapture 保证拖出画布也不丢事件。
 */
export function EditCanvas({
  source,
  transform,
  rect,
  ratio,
  onRectChange,
  disabled = false,
}: EditCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [viewWidth, setViewWidth] = useState(0)
  const [viewHeight, setViewHeight] = useState(0)

  const oriented = useMemo(
    () => renderOriented(source, source.width, source.height, transform),
    [source, transform.rotation, transform.flipHorizontal, transform.flipVertical],
  )

  /** CSS 像素 → 定向画布坐标。所有交互都要过这一层。 */
  const toCanvasSpace = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const box = canvas.getBoundingClientRect()
      if (box.width === 0) return { x: 0, y: 0 }
      const scale = oriented.width / box.width
      return { x: (clientX - box.left) * scale, y: (clientY - box.top) * scale }
    },
    [oriented.width],
  )

  // 容器尺寸决定预览缩放。宽度用 ResizeObserver 而不是 window.resize：
  // 侧栏折叠、面板换行这些都会改宽度，但不触发 window.resize。
  // 高度只用来「别让预览顶出一屏」，所以监听 window.resize 就够了。
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setViewWidth(el.clientWidth)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()

    const onResize = () => setViewHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    onResize()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // 宽、高都要约束：竖图（比如手机拍的人像 1440×2456）按宽度铺满会撑出
  // 两三屏，用户得先滚过整张图才够得着侧栏。这里让预览最多占视口高度的
  // 62%，与抠图 / 放大页的 65vh 口径一致。
  const scale =
    viewWidth > 0 && viewHeight > 0
      ? Math.min(
          1,
          viewWidth / oriented.width,
          (viewHeight * MAX_VIEW_HEIGHT_RATIO) / oriented.height,
        )
      : 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || scale <= 0) return
    const dpr = window.devicePixelRatio || 1
    const cssW = oriented.width * scale
    const cssH = oriented.height * scale
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
    ctx.clearRect(0, 0, oriented.width, oriented.height)
    ctx.drawImage(oriented, 0, 0)

    // 框外压暗。用 evenodd 一次填出「有洞的矩形」，比画四条边省事，
    // 也不会在框比画布还大时露出缝隙。
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, oriented.width, oriented.height)
    ctx.rect(rect.x, rect.y, rect.width, rect.height)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fill('evenodd')
    ctx.restore()

    // 三分线
    const unit = 1 / (scale * dpr)
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
    ctx.lineWidth = unit
    for (let i = 1; i <= 2; i += 1) {
      const x = rect.x + (rect.width * i) / 3
      const y = rect.y + (rect.height * i) / 3
      ctx.beginPath()
      ctx.moveTo(x, rect.y)
      ctx.lineTo(x, rect.y + rect.height)
      ctx.moveTo(rect.x, y)
      ctx.lineTo(rect.x + rect.width, y)
      ctx.stroke()
    }

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2 * unit
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)

    if (!disabled && scale > 0) {
      const size = HANDLE_SIZE / scale
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.lineWidth = unit
      for (const point of handlePoints(rect)) {
        ctx.beginPath()
        ctx.rect(point.x - size / 2, point.y - size / 2, size, size)
        ctx.fill()
        ctx.stroke()
      }
    }
  }, [oriented, rect, scale, disabled])

  const hitHandle = useCallback(
    (x: number, y: number): HandleId | null => {
      if (scale <= 0) return null
      const slop = HIT_SLOP / scale
      let best: HandleId | null = null
      let bestDistance = Number.POSITIVE_INFINITY

      for (const handle of HANDLES) {
        const point = handlePoint(rect, handle)
        const distance = Math.max(Math.abs(x - point.x), Math.abs(y - point.y))
        if (distance <= slop && distance < bestDistance) {
          best = handle
          bestDistance = distance
        }
      }
      return best
    },
    [rect, scale],
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return
      const point = toCanvasSpace(event.clientX, event.clientY)
      const handle = hitHandle(point.x, point.y)

      if (handle) {
        dragRef.current = {
          kind: 'resize',
          handle,
          startRect: rect,
          originX: point.x,
          originY: point.y,
        }
      } else if (
        point.x >= rect.x &&
        point.x <= rect.x + rect.width &&
        point.y >= rect.y &&
        point.y <= rect.y + rect.height
      ) {
        dragRef.current = {
          kind: 'move',
          startRect: rect,
          originX: point.x,
          originY: point.y,
        }
      } else {
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()
    },
    [disabled, hitHandle, rect, toCanvasSpace],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      if (!drag) return
      const point = toCanvasSpace(event.clientX, event.clientY)
      const dx = point.x - drag.originX
      const dy = point.y - drag.originY
      const bounds = { width: oriented.width, height: oriented.height }

      if (drag.kind === 'move') {
        onRectChange({
          x: Math.max(0, Math.min(drag.startRect.x + dx, bounds.width - drag.startRect.width)),
          y: Math.max(0, Math.min(drag.startRect.y + dy, bounds.height - drag.startRect.height)),
          width: drag.startRect.width,
          height: drag.startRect.height,
        })
      } else {
        onRectChange(resizeRect(drag.startRect, drag.handle, dx, dy, bounds, ratio))
      }
    },
    [onRectChange, oriented.height, oriented.width, ratio, toCanvasSpace],
  )

  const endDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  return (
    <div ref={wrapRef} className="flex justify-center">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={[
          'checkerboard max-w-full touch-none rounded-lg',
          disabled ? 'cursor-default' : 'cursor-move',
        ].join(' ')}
      />
    </div>
  )
}

function handlePoints(rect: Rect): { x: number; y: number }[] {
  return HANDLES.map((handle) => handlePoint(rect, handle))
}

function handlePoint(rect: Rect, handle: HandleId): { x: number; y: number } {
  const midX = rect.x + rect.width / 2
  const midY = rect.y + rect.height / 2
  const right = rect.x + rect.width
  const bottom = rect.y + rect.height

  switch (handle) {
    case 'nw':
      return { x: rect.x, y: rect.y }
    case 'n':
      return { x: midX, y: rect.y }
    case 'ne':
      return { x: right, y: rect.y }
    case 'e':
      return { x: right, y: midY }
    case 'se':
      return { x: right, y: bottom }
    case 's':
      return { x: midX, y: bottom }
    case 'sw':
      return { x: rect.x, y: bottom }
    case 'w':
    default:
      return { x: rect.x, y: midY }
  }
}
