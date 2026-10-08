import type { SegmentProgress, SegmentProgressPhase } from '../../lib/types'
import { useTranslation } from '../../i18n'
import type { Translation } from '../../i18n/locales/en'

function phaseLabel(phase: SegmentProgressPhase, t: Translation): string {
  switch (phase) {
    case 'fetching-encoder':
      return t.segmentPhaseFetchingEncoder
    case 'fetching-decoder':
      return t.segmentPhaseFetchingDecoder
    case 'warming-up':
      return t.segmentPhaseWarmingUp
    case 'encoding':
      return t.segmentPhaseEncoding
    case 'decoding':
      return t.segmentPhaseDecoding
    case 'compositing':
      return t.segmentPhaseCompositing
    case 'done':
      return t.segmentPhaseDone
    case 'error':
      return t.segmentPhaseError
    case 'idle':
    default:
      return t.segmentPhaseIdle
  }
}

/** 这两步是在下载 45 MB 权重，值得额外补一句「只有第一次」。 */
const DOWNLOAD_PHASES = new Set<SegmentProgressPhase>(['fetching-encoder', 'fetching-decoder'])

interface SegmentProgressPanelProps {
  progress: SegmentProgress
}

/**
 * 进度条。没有取消按钮 —— SAM 的编码一旦开始就没法从中间叫停，
 * 放一个点了没反应的按钮比不放更糟。
 */
export function SegmentProgressPanel({ progress }: SegmentProgressPanelProps) {
  const { t } = useTranslation()
  const percent = progress.ratio === null ? null : Math.round(progress.ratio * 100)

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {phaseLabel(progress.phase, t)}
          </p>
          {DOWNLOAD_PHASES.has(progress.phase) && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {t.segmentDownloadOnce}
            </p>
          )}
        </div>
        {percent !== null && (
          <span className="font-mono text-sm text-neutral-700 dark:text-neutral-200">
            {percent}%
          </span>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        {percent === null ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-600" />
        ) : (
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  )
}
