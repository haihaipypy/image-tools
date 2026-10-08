import type { ReactNode } from 'react'
import { useTranslation } from '../../i18n'
import { ASPECT_PRESETS } from '../../lib/edit/geometry'

/** 自动拉正的结果状态。失败与「本来就是正的」要分开，用户才知道该不该手动调。 */
export type StraightenState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; angle: number }
  | { status: 'flat' }
  | { status: 'failed' }

export interface SliceSettings {
  cols: number
  rows: number
  gap: number
}

interface EditControlsProps {
  ratioId: string
  onRatioChange: (id: string) => void
  rotation: number
  onRotationChange: (deg: number) => void
  onStraighten: () => void
  straighten: StraightenState
  flipHorizontal: boolean
  flipVertical: boolean
  onToggleFlip: (axis: 'horizontal' | 'vertical') => void
  onResetCrop: () => void
  onResetAll: () => void
  slice: SliceSettings
  onSliceChange: (next: SliceSettings) => void
  onDownloadSlices: () => void
  packing: boolean
  sliceCount: number
  disabled?: boolean
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
      {children}
    </p>
  )
}

const SELECTED = 'border-blue-500 bg-blue-600 text-white'
const UNSELECTED =
  'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:border-neutral-700'

export function EditControls({
  ratioId,
  onRatioChange,
  rotation,
  onRotationChange,
  onStraighten,
  straighten,
  flipHorizontal,
  flipVertical,
  onToggleFlip,
  onResetCrop,
  onResetAll,
  slice,
  onSliceChange,
  onDownloadSlices,
  packing,
  sliceCount,
  disabled = false,
}: EditControlsProps) {
  const { t } = useTranslation()

  const straightenLabel =
    straighten.status === 'running'
      ? t.editRotateStraightening
      : straighten.status === 'done'
        ? t.editStraightenDone(straighten.angle)
        : t.editRotateStraighten

  // 侧栏一共四组控件，加上切片预览和下载按钮，默认笔记本视口下很容易顶出
  // 一屏 —— 而「下载图片」是整页唯一必须够得着的按钮。所以这里能压的都压：
  // 组间距收紧、按钮并排、说明性文字一律删掉（细节归文档站）。
  return (
    <div className={['space-y-4', disabled ? 'pointer-events-none opacity-60' : ''].join(' ')}>
      <section className="space-y-2">
        <SectionLabel>{t.editSectionCrop}</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onRatioChange(preset.id)}
              className={[
                'rounded-lg border py-1.5 text-xs font-medium transition',
                preset.id === ratioId ? SELECTED : UNSELECTED,
              ].join(' ')}
            >
              {t.editCropRatios[preset.id] ?? preset.id}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onResetCrop}
          className="w-full rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
        >
          {t.editCropReset}
        </button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>{t.editSectionRotate}</SectionLabel>
          <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
            {t.editRotateValue(Math.round(rotation * 10) / 10)}
          </span>
        </div>

        <input
          type="range"
          min={-180}
          max={180}
          step={0.1}
          value={rotation}
          aria-label={t.editSectionRotate}
          onChange={(event) => onRotationChange(Number(event.target.value))}
          className="w-full accent-blue-600"
        />

        {/* 五个快捷键并成一行。分两行摆的话光旋转这块就吃掉近 80px，
            把下面的切片区和下载按钮一起挤出首屏。 */}
        <div className="grid grid-cols-5 gap-1.5">
          {[-90, -1, 0, 1, 90].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onRotationChange(delta === 0 ? 0 : rotation + delta)}
              className={['rounded-lg border py-1.5 text-[11px] font-medium transition', UNSELECTED].join(
                ' ',
              )}
            >
              {delta === 0 ? '0°' : delta > 0 ? `+${delta}°` : `${delta}°`}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={straighten.status === 'running'}
          onClick={onStraighten}
          className="w-full rounded-lg border border-blue-300 bg-blue-50 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/70"
        >
          {straightenLabel}
        </button>

        {straighten.status === 'flat' && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.editStraightenFlat}</p>
        )}
        {straighten.status === 'failed' && (
          <p className="text-xs text-amber-700 dark:text-amber-300">{t.editStraightenFailed}</p>
        )}
      </section>

      <section className="space-y-2">
        <SectionLabel>{t.editSectionFlip}</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {(['horizontal', 'vertical'] as const).map((axis) => {
            const active = axis === 'horizontal' ? flipHorizontal : flipVertical
            return (
              <button
                key={axis}
                type="button"
                onClick={() => onToggleFlip(axis)}
                className={['rounded-lg border py-1.5 text-xs font-medium transition', active ? SELECTED : UNSELECTED].join(
                  ' ',
                )}
              >
                {axis === 'horizontal' ? t.editFlipHorizontal : t.editFlipVertical}
              </button>
            )
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <SectionLabel>{t.editSectionSlice}</SectionLabel>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {t.editSliceCount(sliceCount)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumberField
            label={t.editSliceCols}
            value={slice.cols}
            min={1}
            max={12}
            onChange={(value) => onSliceChange({ ...slice, cols: value })}
          />
          <NumberField
            label={t.editSliceRows}
            value={slice.rows}
            min={1}
            max={12}
            onChange={(value) => onSliceChange({ ...slice, rows: value })}
          />
          <NumberField
            label={t.editSliceGap}
            value={slice.gap}
            min={0}
            max={64}
            onChange={(value) => onSliceChange({ ...slice, gap: value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={packing || sliceCount === 0}
            onClick={onDownloadSlices}
            className="rounded-lg bg-blue-600 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {packing ? t.editSlicePacking : t.editSliceDownload}
          </button>
          <button
            type="button"
            onClick={onResetAll}
            className="rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-600 transition hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            {t.editResetAll}
          </button>
        </div>
      </section>
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function NumberField({ label, value, min, max, onChange }: NumberFieldProps) {
  return (
    <label className="space-y-1">
      <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (!Number.isFinite(next)) return
          onChange(Math.max(min, Math.min(max, Math.round(next))))
        }}
        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-center text-xs text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
      />
    </label>
  )
}
