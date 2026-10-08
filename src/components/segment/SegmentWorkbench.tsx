import { useState } from 'react'
import { MousePointerClick, X } from 'lucide-react'
import { useTranslation } from '../../i18n'
import { useSegment } from '../../hooks/useSegment'
import { downloadBlob } from '../../lib/imageOutput'
import { SegmentError } from '../../lib/segment/errors'
import type { PromptLabel } from '../../lib/types'
import { SegmentCanvas } from './SegmentCanvas'
import { SegmentControls } from './SegmentControls'
import { SegmentDropZone } from './SegmentDropZone'
import { SegmentProgressPanel } from './SegmentProgressPanel'
import { SegmentResult } from './SegmentResult'
import { describeSegmentError } from './describeError'

/**
 * 点选抠图工作区。
 *
 * 交互模型是「编码一次、点击多次」，所以没有运行按钮：点画布就是开始。
 *
 * ── 为什么是并排而不是标签页 ──
 *
 * 第一版把「选点」和「结果」做成了两个标签页，用户点一下画布得切过去才能
 * 看到抠成什么样，想再补一个点又得切回来 —— 工具的核心体验恰恰是**边点边看**，
 * 切页把这条反馈回路切断了。现在左选点右结果同屏，每点一次右边立刻更新，
 * 所见即所得。
 */
export function SegmentWorkbench() {
  const { t } = useTranslation()
  const {
    capabilities,
    source,
    points,
    result,
    status,
    progress,
    error,
    selectImage,
    reset,
    addPoint,
    undoPoint,
    clearPoints,
    dismissError,
  } = useSegment()

  const [nextLabel, setNextLabel] = useState<PromptLabel>(1)

  const working = status === 'working'

  const backendLabel = capabilities
    ? capabilities.webgpu
      ? t.upscaleBackendWebgpu(capabilities.adapterLabel)
      : capabilities.threads
        ? t.upscaleBackendWasmThreads
        : t.upscaleBackendWasmSingle
    : t.upscaleBackendProbing

  if (!source) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SegmentDropZone onFile={selectImage} />
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t.segmentFirstRunHint}
        </p>
        {error && <ErrorBanner message={describeSegmentError(error, t)} />}
      </div>
    )
  }

  // 「抠空了」不是故障，是「这一点没点中」—— 用警告色，并且允许关掉，
  // 因为它经常只反映中间状态，用户下一笔就修好了。
  const isSoftError = error instanceof SegmentError && error.code === 'empty-mask'

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        {working && <SegmentProgressPanel progress={progress} />}

        {error && (
          <ErrorBanner
            message={describeSegmentError(error, t)}
            tone={isSoftError ? 'warn' : 'error'}
            onDismiss={isSoftError ? dismissError : undefined}
          />
        )}

        {/* 左选点、右结果：同屏才能边点边看。窄屏时自动上下堆叠。 */}
        <div className="grid gap-4 md:grid-cols-2">
          <figure className="space-y-2">
            <figcaption className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {t.segmentStagePick}
            </figcaption>
            <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950">
              <SegmentCanvas
                previewUrl={source.previewUrl}
                width={source.width}
                height={source.height}
                points={points}
                resultUrl={result?.url ?? null}
                working={working}
                nextLabel={nextLabel}
                onPoint={addPoint}
              />
            </div>
            <figcaption className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              {t.segmentPickHint}
            </figcaption>
          </figure>

          <div className="flex flex-col">
            {result ? (
              <SegmentResult
                result={result}
                onDownload={() => downloadBlob(result.blob, buildFileName(source.fileName))}
                onReplace={reset}
              />
            ) : (
              <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 text-center dark:border-neutral-700 dark:bg-neutral-950">
                <MousePointerClick className="size-6 text-neutral-400 dark:text-neutral-500" />
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  {t.segmentResultPlaceholder}
                </p>
                <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                  {t.segmentResultPlaceholderHint}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <SegmentControls
            points={points}
            nextLabel={nextLabel}
            onNextLabelChange={setNextLabel}
            onUndo={undoPoint}
            onClear={clearPoints}
            capabilities={capabilities}
          />
        </div>

        <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500">
          {backendLabel}
        </p>
      </aside>
    </div>
  )
}

interface ErrorBannerProps {
  message: string
  tone?: 'error' | 'warn'
  onDismiss?: () => void
}

function ErrorBanner({ message, tone = 'error', onDismiss }: ErrorBannerProps) {
  const palette =
    tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
      : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200'

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed ${palette}`}
    >
      <p>{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="dismiss"
          className="shrink-0 opacity-60 transition hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

/** 下载文件名沿用原图的名字，加 -cutout 后缀，和抠图工具保持一致。 */
function buildFileName(original: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-cutout.png`
}
