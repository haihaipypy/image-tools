import type { ReactNode } from 'react'
import { useTranslation } from '../../i18n'
import { CUTOUT_MODELS } from '../../lib/cutout/models'
import { formatBytes } from '../../lib/imageOutput'
import type { BackendCapabilities, CutoutQuality } from '../../lib/types'
import type { CutoutBackdrop } from '../../hooks/useCutout'

interface CutoutControlsProps {
  modelId: string
  onModelChange: (id: string) => void
  quality: CutoutQuality
  onQualityChange: (quality: CutoutQuality) => void
  backdrop: CutoutBackdrop
  onBackdropChange: (backdrop: CutoutBackdrop) => void
  capabilities: BackendCapabilities | null
  hasResult: boolean
  disabled?: boolean
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
      {children}
    </p>
  )
}

const QUALITIES: CutoutQuality[] = ['fast', 'quality']

export function CutoutControls({
  modelId,
  onModelChange,
  quality,
  onQualityChange,
  backdrop,
  onBackdropChange,
  capabilities,
  hasResult,
  disabled = false,
}: CutoutControlsProps) {
  const { t } = useTranslation()
  const noWebgpu = capabilities !== null && !capabilities.webgpu

  return (
    <div className={['space-y-5', disabled ? 'pointer-events-none opacity-60' : ''].join(' ')}>
      <section className="space-y-2">
        <SectionLabel>{t.cutoutSectionModel}</SectionLabel>
        <div className="space-y-1.5">
          {CUTOUT_MODELS.map((model) => {
            // 权重按后端分两套，体积也就有两个。展示时按当前设备**实际会下的
            // 那个**，否则用户在 CPU 上看到 94 MB 却下载了 192 MB，会以为哪里
            // 出了错。webgpuSafe === false 的模型永远走 WASM（见 models.ts），
            // 展示也要跟着走，不然会出现「界面写 12.4 MB、实际下 24.7 MB」。
            const onWebgpu = Boolean(capabilities?.webgpu) && model.webgpuSafe !== false
            const variant = onWebgpu ? model.variants.webgpu : preferredVariant(model)
            const meta = t.cutoutModels[model.id]
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onModelChange(model.id)}
                className={[
                  'w-full rounded-xl border px-3.5 py-2.5 text-left transition',
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
                    {formatBytes(variant.approxBytes)}
                  </span>
                </div>
                {meta && (
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {meta.note}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        {/* 「锐利/柔和」的解释挂成 title，不再占一行正文 —— 侧栏要塞进一屏，
            而这两个词本身已经够直白，悬停能看全就够了。 */}
        <SectionLabel>{t.cutoutSectionQuality}</SectionLabel>
        <div className="flex gap-2" title={t.cutoutQualityHint}>
          {QUALITIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onQualityChange(value)}
              className={[
                'flex-1 rounded-lg border py-1.5 text-sm font-medium transition',
                value === quality
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200',
              ].join(' ')}
            >
              {value === 'fast' ? t.cutoutQualityFast : t.cutoutQualityQuality}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <SectionLabel>{t.cutoutSectionBackdrop}</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {(['transparent', 'white', 'red', 'blue'] as CutoutBackdrop[]).map((value) => (
            <button
              key={value}
              type="button"
              disabled={!hasResult}
              onClick={() => onBackdropChange(value)}
              title={t.cutoutBackdrops[value]}
              aria-label={t.cutoutBackdrops[value]}
              className={[
                'flex h-9 items-center justify-center rounded-lg border transition',
                value === backdrop
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700',
                !hasResult ? 'cursor-not-allowed opacity-40' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'size-5 rounded-full border border-neutral-300/70 dark:border-neutral-600',
                  value === 'transparent' ? 'checkerboard' : '',
                ].join(' ')}
                style={value === 'transparent' ? undefined : { background: BACKDROP_SWATCH[value] }}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {hasResult ? t.cutoutBackdropHint : t.cutoutBackdropLocked}
        </p>
      </section>

      {noWebgpu && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {t.cutoutNoWebgpu}
        </p>
      )}
    </div>
  )
}

const BACKDROP_SWATCH: Record<Exclude<CutoutBackdrop, 'transparent'>, string> = {
  white: '#ffffff',
  red: '#d40000',
  blue: '#1d4ed8',
}

/**
 * 能力还没探测出来时的兜底。
 *
 * 探测完成前 `capabilities` 是 null，此时偏好显示 WASM 变体 —— 因为那是
 * 最坏情况，体积说大了用户后面只会觉得赚到，说小了会感觉被坑。
 */
function preferredVariant(model: (typeof CUTOUT_MODELS)[number]) {
  return model.variants.wasm
}
