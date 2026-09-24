import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import { formatBytes, formatDuration } from '../../lib/imageOutput'
import type { BackendKind } from '../../lib/types'

/** 预览模式：比较（滑块） / 结果（只看成品） / 原版（只看原图）。 */
export type PreviewMode = 'compare' | 'result' | 'original'

const MODES: PreviewMode[] = ['compare', 'result', 'original']

interface CutoutCompareSliderProps {
  beforeUrl: string
  afterUrl: string
  width: number
  height: number
  bytes: number
  elapsedMs: number
  backend: BackendKind
  /** 是否处于「按住偷看原图」状态，由父组件持有以便接键盘。 */
  peeking: boolean
  onPeekChange: (peeking: boolean) => void
  onDownload: () => void
  onReplace: () => void
}

/**
 * 抠图结果的预览面板：顶部模式切换 + 元信息，中间画面，底部工具条。
 *
 * ── 关于右侧的棋盘格 ──
 *
 * 第一版我把原图铺在底层、结果叠在上层，注释里写的理由是「透明区透出原图，
 * 正好是前后对照」。**这个推理是错的**：抠图的重点恰恰是「哪里变透明了」，
 * 而透明区叠在原图上根本看不出来，滑动时左右两侧几乎一样，用户会以为没抠成功。
 * 正确做法是让「结果」显示在**棋盘格**上，透明度才可见。
 *
 * ── 关于「按住偷看」──
 *
 * 参考的交互里按住 Space 会临时露出原图，方便检查边缘。这里实现成：
 * 按住期间整幅换成原图，松开立刻弹回 —— 比来回拖滑块快得多。
 */
export function CutoutCompareSlider({
  beforeUrl,
  afterUrl,
  width,
  height,
  bytes,
  elapsedMs,
  backend,
  peeking,
  onPeekChange,
  onDownload,
  onReplace,
}: CutoutCompareSliderProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [mode, setMode] = useState<PreviewMode>('compare')

  const moveTo = useCallback((clientX: number) => {
    const element = containerRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, ratio)))
  }, [])

  /**
   * 空格键「按住偷看」。用 keydown/keyup 而不是 click —— 要的是「按住期间」，
   * 且要防止空格滚动页面。焦点在按钮上时也拦，否则会误触按钮。
   */
  useEffect(() => {
    const isEditable = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
    }

    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || isEditable(event.target)) return
      if (event.repeat) return
      event.preventDefault()
      onPeekChange(true)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      onPeekChange(false)
    }
    // 切窗口/失焦时松开，避免「一直卡在原图」
    const blur = () => onPeekChange(false)

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [onPeekChange])

  const totalPixels = width * height
  const pixelLabel = `${width}×${height}`
  const megaLabel = `${(totalPixels / 1_000_000).toFixed(1)} MP`
  const backendLabel =
    backend === 'webgpu' ? t.upscaleBackendWebgpuShort : t.upscaleBackendWasmShort

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* 顶栏：左侧模式切换，右侧运行元信息 */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <div className="flex items-center gap-1" role="tablist">
            {MODES.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={value === mode}
                onClick={() => setMode(value)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  value === mode
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
                ].join(' ')}
              >
                {value === 'compare'
                  ? t.cutoutTabCompare
                  : value === 'result'
                    ? t.cutoutTabResult
                    : t.cutoutTabOriginal}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {backendLabel}
            </span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span>{formatDuration(elapsedMs)}</span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span title={pixelLabel}>{megaLabel}</span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span>{pixelLabel}</span>
          </div>
        </div>

        {/* 画面区 */}
        <div
          ref={containerRef}
          data-mode={mode}
          onPointerDown={(event) => {
            if (mode !== 'compare') return
            event.currentTarget.setPointerCapture(event.pointerId)
            moveTo(event.clientX)
          }}
          onPointerMove={(event) => {
            if (mode !== 'compare' || event.buttons !== 1) return
            moveTo(event.clientX)
          }}
          className={[
            'checkerboard relative flex w-full items-center justify-center select-none',
            mode === 'compare'
              ? 'cursor-ew-resize touch-none'
              : 'cursor-default',
          ].join(' ')}
        >
          {/* 隐形占位图负责撑开容器高度 —— 其余图层都是绝对定位，没有它会塌成 0 */}
          <img
            src={beforeUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="block max-h-[65vh] w-full object-contain opacity-0"
          />

          {/* 按住偷看：整幅换原图，压在最上面 */}
          {peeking ? (
            <img
              src={beforeUrl}
              alt={t.cutoutOriginal}
              draggable={false}
              className="absolute inset-0 block size-full object-contain"
            />
          ) : (
            <>
              {mode !== 'result' && (
                <img
                  src={beforeUrl}
                  alt={t.cutoutOriginal}
                  draggable={false}
                  className="absolute inset-0 block size-full object-contain"
                  style={
                    mode === 'compare' ? { clipPath: `inset(0 ${100 - position}% 0 0)` } : undefined
                  }
                />
              )}

              {mode !== 'original' && (
                /* 棋盘格必须在这一层 —— 结果的透明区靠它才看得出来 */
                <div
                  className="checkerboard absolute inset-0 flex items-center justify-center"
                  style={
                    mode === 'compare' ? { clipPath: `inset(0 0 0 ${position}%)` } : undefined
                  }
                >
                  <img
                    src={afterUrl}
                    alt={t.cutoutResult}
                    draggable={false}
                    className="block max-h-[65vh] w-full object-contain"
                  />
                </div>
              )}
            </>
          )}

          {mode === 'compare' && !peeking && (
            <>
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
                {t.cutoutBefore}
              </span>
              <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white">
                {t.cutoutAfter}
              </span>
            </>
          )}

          {peeking && (
            <span className="pointer-events-none absolute top-3 left-3 rounded-md bg-blue-600/90 px-2 py-1 text-xs font-medium text-white">
              {t.cutoutOriginal}
            </span>
          )}
        </div>

        {/* 底栏：左侧快捷键提示，右侧操作 */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              {t.cutoutKeepHint}
              <kbd onClick={() => onPeekChange(true)} onPointerUp={() => onPeekChange(false)}>
                {t.cutoutKeepKey}
              </kbd>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden>{t.cutoutNextImage}</span>
              <kbd>{t.cutoutNextKey}</kbd>
              <span className="text-neutral-400 dark:text-neutral-500">{t.cutoutNoNext}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplace}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              {t.cutoutReplace}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              {t.cutoutDownload}
              <span className="font-mono opacity-70">{formatBytes(bytes)}</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        {mode === 'compare' ? t.cutoutCompareHint : ''}
      </p>
    </div>
  )
}
