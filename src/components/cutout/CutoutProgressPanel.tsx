import type { CutoutProgressPhase, CutoutProgress } from '../../lib/types'
import { useTranslation } from '../../i18n'
import type { Translation } from '../../i18n/locales/en'

function phaseLabel(phase: CutoutProgressPhase, t: Translation): string {
  switch (phase) {
    case 'fetching-model':
      return t.cutoutPhaseFetchingModel
    case 'warming-up':
      return t.cutoutPhaseWarmingUp
    case 'inference':
      return t.cutoutPhaseInference
    case 'compositing':
      return t.cutoutPhaseCompositing
    case 'done':
      return t.cutoutPhaseDone
    case 'error':
      return t.cutoutPhaseError
    case 'idle':
    default:
      return t.cutoutPhaseIdle
  }
}

interface CutoutProgressPanelProps {
  progress: CutoutProgress
  onCancel: () => void
}

export function CutoutProgressPanel({ progress, onCancel }: CutoutProgressPanelProps) {
  const { t } = useTranslation()
  const percent = progress.ratio === null ? null : Math.round(progress.ratio * 100)

  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {phaseLabel(progress.phase, t)}
          </p>
          {progress.phase === 'fetching-model' && (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {t.cutoutDownloadOnce}
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
