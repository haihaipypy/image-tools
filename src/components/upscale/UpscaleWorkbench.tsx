import { useTranslation } from '../../i18n'
import { useUpscaler } from '../../hooks/useUpscaler'
import { downloadBlob, formatBytes, formatDuration } from '../../lib/imageOutput'
import { CompareSlider } from './CompareSlider'
import { ProgressPanel } from './ProgressPanel'
import { UpscaleControls } from './UpscaleControls'
import { UpscaleDropZone } from './UpscaleDropZone'
import { describeUpscaleError } from './describeError'

/**
 * 放大工作区：单张图片，本地推理，前后对比。
 */
export function UpscaleWorkbench() {
  const { t } = useTranslation()
  const {
    capabilities,
    source,
    result,
    status,
    progress,
    error,
    modelId,
    setModelId,
    targetScale,
    setTargetScale,
    overlap,
    setOverlap,
    selectFile,
    reset,
    cancel,
    run,
  } = useUpscaler()

  const running = status === 'running'

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
        <UpscaleDropZone onFile={selectFile} />
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t.upscaleFirstRunHint}
        </p>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {describeUpscaleError(error, t)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {result ? (
          <CompareSlider beforeUrl={source.previewUrl} afterUrl={result.url} />
        ) : (
          <div className="checkerboard flex items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <img
              src={source.previewUrl}
              alt={t.upscaleBefore}
              className="block max-h-[65vh] w-full object-contain"
            />
          </div>
        )}

        {running && <ProgressPanel progress={progress} onCancel={cancel} />}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {describeUpscaleError(error, t)}
          </div>
        )}

        {result && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
            <span>
              {source.width}×{source.height}
              <span className="mx-1.5 text-neutral-400">→</span>
              <strong className="font-medium text-neutral-900 dark:text-neutral-100">
                {result.width}×{result.height}
              </strong>
            </span>
            <span className="font-mono">{formatBytes(result.blob.size)}</span>
            <span className="font-mono">{formatDuration(result.elapsedMs)}</span>
            {result.notes.map((note) => (
              <span key={note.kind} className="text-neutral-500 dark:text-neutral-400">
                {note.kind === 'tiles' &&
                  t.upscaleNoteTiles(note.totalTiles, note.tileEdge, note.overlap)}
                {note.kind === 'resample' &&
                  t.upscaleNoteResample(note.nativeScale, note.targetScale)}
                {note.kind === 'wasm-fallback' && t.upscaleNoteWasmFallback}
              </span>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <UpscaleControls
            modelId={modelId}
            onModelChange={setModelId}
            targetScale={targetScale}
            onScaleChange={setTargetScale}
            overlap={overlap}
            onOverlapChange={setOverlap}
            capabilities={capabilities}
            disabled={running}
          />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? t.upscaleRunning : result ? t.upscaleRerun : t.upscaleRun}
          </button>

          {result && (
            <button
              type="button"
              onClick={() =>
                downloadBlob(result.blob, `upscaled-${result.width}x${result.height}.png`)
              }
              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
            >
              {t.upscaleDownload}
            </button>
          )}

          <button
            type="button"
            onClick={reset}
            disabled={running}
            className="w-full rounded-xl px-4 py-2 text-xs text-neutral-500 transition hover:text-neutral-800 disabled:opacity-60 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t.upscaleReplace}
          </button>

          <p className="pt-1 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
            {backendLabel}
          </p>
        </div>
      </aside>
    </div>
  )
}
