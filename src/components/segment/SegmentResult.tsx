import { Download } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { formatBytes, formatDuration } from '../../lib/imageOutput'
import type { SegmentHandle } from '../../hooks/useSegment'

interface SegmentResultProps {
  result: SegmentHandle
  onDownload: () => void
  onReplace: () => void
}

/**
 * 结果面板。
 *
 * 画在**棋盘格**上而不是叠在原图上 —— 抠图的重点恰恰是「哪里变透明了」，
 * 透明区叠在原图上根本看不出来，用户会以为没抠成功。这条经验是从抠图工具
 * 那边直接搬过来的，代价是一次返工。
 */
export function SegmentResult({ result, onDownload, onReplace }: SegmentResultProps) {
  const { t } = useTranslation()
  const backendLabel =
    result.backend === 'webgpu' ? t.upscaleBackendWebgpuShort : t.upscaleBackendWasmShort
  const totalMs = result.encodeMs + result.decodeMs

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {t.cutoutResult}
          </span>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {backendLabel}
            </span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span>{formatDuration(totalMs)}</span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span>{`${result.width}×${result.height}`}</span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span>{formatBytes(result.blob.size)}</span>
          </div>
        </div>

        <div className="checkerboard flex w-full items-center justify-center">
          <img
            src={result.url}
            alt={t.cutoutResult}
            draggable={false}
            className="block max-h-[48vh] w-full object-contain"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-neutral-200 px-3 py-2.5 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span>{t.segmentScore(Math.round(result.score * 100))}</span>
            <span aria-hidden className="text-neutral-300 dark:text-neutral-600">
              ·
            </span>
            <span>{t.segmentCoverage(Number(result.coverage.toFixed(1)))}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReplace}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              {t.segmentReplace}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              <Download className="size-3.5" />
              {t.segmentDownload}
              <span className="font-mono opacity-70">{formatBytes(result.blob.size)}</span>
            </button>
          </div>
        </div>
      </div>

      {result.reusedEncoding && (
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t.segmentEncodingCached}
        </p>
      )}
    </div>
  )
}
