import { useCallback, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'

interface CompareSliderProps {
  beforeUrl: string
  afterUrl: string
}

/**
 * 放大前后的对比滑块：底层铺放大结果，上面按裁剪宽度叠一张原图。
 */
export function CompareSlider({ beforeUrl, afterUrl }: CompareSliderProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)

  const moveTo = useCallback((clientX: number) => {
    const element = containerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, ratio)))
  }, [])

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          moveTo(event.clientX)
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return
          moveTo(event.clientX)
        }}
        className="checkerboard relative w-full cursor-ew-resize touch-none overflow-hidden rounded-2xl border border-neutral-200 select-none dark:border-neutral-800"
      >
        <img
          src={afterUrl}
          alt={t.upscaleAfter}
          draggable={false}
          className="block max-h-[65vh] w-full object-contain"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={beforeUrl}
            alt={t.upscaleBefore}
            draggable={false}
            className="block max-h-[65vh] w-full object-contain"
          />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white ring-1 ring-black/10">
            <svg viewBox="0 0 24 24" className="size-4 text-neutral-600" fill="currentColor">
              <path d="M9.5 7 5 12l4.5 5V7Zm5 0v10l4.5-5-4.5-5Z" />
            </svg>
          </div>
        </div>

        <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {t.upscaleBefore}
        </span>
        <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-blue-600/90 px-2 py-1 text-xs font-medium text-white">
          {t.upscaleAfter}
        </span>
      </div>
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        {t.upscaleCompareHint}
      </p>
    </div>
  )
}
