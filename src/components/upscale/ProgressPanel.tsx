import type { Translation } from '../../i18n/locales/en'
import type { ProgressPhase, UpscaleProgress } from '../../lib/types'
import { useTranslation } from '../../i18n'

function phaseLabel(phase: ProgressPhase, t: Translation): string {
  switch (phase) {
    case 'fetching-model':
      return t.upscalePhaseFetchingModel
    case 'warming-up':
      return t.upscalePhaseWarmingUp
    case 'decoding':
      return t.upscalePhaseDecoding
    case 'inference':
      return t.upscalePhaseInference
    case 'encoding':
      return t.upscalePhaseEncoding
    case 'done':
      return t.upscalePhaseDone
    case 'error':
      return t.upscalePhaseError
    case 'idle':
    default:
      return t.upscalePhaseIdle
  }
}

interface ProgressPanelProps {
  progress: UpscaleProgress
  onCancel: () => void
}

export function ProgressPanel({ progress, onCancel }: ProgressPanelProps) {
  const { t } = useTranslation()
  const percent = progress.ratio === null ? null : Math.round(progress.ratio * 100)
  const { completed, total } = progress.detail ?? {}
  const detail =
    typeof total === 'number' && total > 0
      ? t.upscaleProgressTiles(completed ?? 0, total)
      : ''

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {phaseLabel(progress.phase, t)}
          </p>
          {detail && (
            <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
              {detail}
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

      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        {t.upscaleCancel}
      </button>
    </div>
  )
}
