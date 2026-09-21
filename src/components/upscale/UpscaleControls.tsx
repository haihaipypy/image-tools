import type { ReactNode } from 'react'
import { useTranslation } from '../../i18n'
import { formatBytes } from '../../lib/imageOutput'
import { MODELS, TARGET_SCALES } from '../../lib/models'
import type { BackendCapabilities } from '../../lib/types'

interface UpscaleControlsProps {
  modelId: string
  onModelChange: (id: string) => void
  targetScale: number
  onScaleChange: (scale: number) => void
  overlap: number
  onOverlapChange: (value: number) => void
  capabilities: BackendCapabilities | null
  disabled?: boolean
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
      {children}
    </p>
  )
}

export function UpscaleControls({
  modelId,
  onModelChange,
  targetScale,
  onScaleChange,
  overlap,
  onOverlapChange,
  capabilities,
  disabled = false,
}: UpscaleControlsProps) {
  const { t } = useTranslation()
  const noWebgpu = capabilities !== null && !capabilities.webgpu

  return (
    <div className={['space-y-6', disabled ? 'pointer-events-none opacity-60' : ''].join(' ')}>
      <section className="space-y-3">
        <SectionLabel>{t.upscaleSectionModel}</SectionLabel>
        <div className="space-y-2">
          {MODELS.map((model) => {
            // 文案不放模型注册表里，按 id 从 i18n 取，缺省时退回型号名。
            const meta = t.upscaleModels[model.id]
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onModelChange(model.id)}
                className={[
                  'w-full rounded-xl border px-4 py-3 text-left transition',
                  model.id === modelId
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {model.label}
                  </span>
                  <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {formatBytes(model.approxBytes)}
                  </span>
                </div>
                {meta && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {meta.note}
                  </p>
                )}
                {meta && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t.upscaleSectionScale}</SectionLabel>
        <div className="flex gap-2">
          {TARGET_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => onScaleChange(scale)}
              className={[
                'flex-1 rounded-lg border py-2 text-sm font-medium transition',
                scale === targetScale
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200',
              ].join(' ')}
            >
              {scale}×
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t.upscaleSectionOverlap}</SectionLabel>
          <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
            {overlap} px
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={24}
          step={2}
          value={overlap}
          onChange={(event) => onOverlapChange(Number(event.target.value))}
          className="w-full accent-blue-600"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.upscaleOverlapHint}</p>
      </section>

      {noWebgpu && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {t.upscaleNoWebgpu}
        </p>
      )}
    </div>
  )
}
