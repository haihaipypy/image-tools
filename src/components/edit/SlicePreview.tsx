import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from '../../i18n'
import { sliceRects, type Rect } from '../../lib/edit/geometry'
import { renderEdit, type EditTransform } from '../../lib/edit/render'
import type { SliceSettings } from './EditControls'

/** 预览画布的最大尺寸（CSS 像素）。侧栏很窄，240×180 已经够看清切分。 */
const MAX_W = 240
const MAX_H = 180

/** 边框色跟裁剪框的高亮色一致，用户一眼能把预览和上面的取景框对上。 */
const LINE = 'rgba(37, 99, 235, 0.95)'

interface SlicePreviewProps {
  source: ImageBitmap | null
  transform: EditTransform
  rect: Rect
  slice: SliceSettings
}

/**
 * 切片预览。
 *
 * 行列与间距一改，就把「裁出来的那一块」缩到 240px 宽的画布上，并按
 * sliceRects 算出的真实切块画一遍边框。间距不再只是个数字，而是看得见的
 * 空隙 —— 参数调错了当场发现，不用等下载完 zip 再拆开看。
 *
 * 重绘节流到 80ms：拖动裁剪框时 rect 每帧都在变，而 renderEdit 每次都要
 * 新建一张整图尺寸的 canvas，不节流会把主线程占满。
 */
export function SlicePreview({ source, transform, rect, slice }: SlicePreviewProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const pieces = useMemo(
    () => (rect.width > 0 && rect.height > 0 ? sliceRects(rect, slice) : []),
    [rect, slice],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !source || rect.width <= 0 || rect.height <= 0) return

    const timer = window.setTimeout(() => {
      const scale = Math.min(MAX_W / rect.width, MAX_H / rect.height) || 1
      const width = Math.max(1, Math.round(rect.width * scale))
      const height = Math.max(1, Math.round(rect.height * scale))

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const cropped = renderEdit(source, source.width, source.height, transform, rect)
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(cropped, 0, 0, rect.width, rect.height, 0, 0, width, height)

      // 切块边框。间距会自然留成空隙 —— 这正是要给人看见的东西。
      ctx.strokeStyle = LINE
      ctx.lineWidth = 1
      for (const piece of sliceRects(rect, slice)) {
        const x = Math.round((piece.x - rect.x) * scale)
        const y = Math.round((piece.y - rect.y) * scale)
        const w = Math.max(1, Math.round(piece.width * scale))
        const h = Math.max(1, Math.round(piece.height * scale))
        // 偏移 0.5 让 1px 的线落在像素中心，否则会糊成 2px 灰边。
        ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1))
      }
    }, 80)

    return () => window.clearTimeout(timer)
  }, [source, transform, rect, slice])

  const first = pieces[0]

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
          {t.editSlicePreview}
        </p>
        {first && (
          <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
            {t.editSlicePreviewPiece(first.width, first.height)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 p-2 dark:border-neutral-800 dark:bg-neutral-950">
        <canvas ref={canvasRef} width={1} height={1} className="block h-auto max-w-full rounded" />
      </div>
    </div>
  )
}
