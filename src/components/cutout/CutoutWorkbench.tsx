import { useState } from 'react'
import { useTranslation } from '../../i18n'
import { useCutout } from '../../hooks/useCutout'
import { getCutoutModel } from '../../lib/cutout/models'
import { downloadBlob } from '../../lib/imageOutput'
import { CutoutCompareSlider } from './CutoutCompareSlider'
import { CutoutControls } from './CutoutControls'
import { CutoutDropZone } from './CutoutDropZone'
import { CutoutProgressPanel } from './CutoutProgressPanel'
import { describeCutoutError } from './describeError'

/**
 * 抠图工作区：单张图片，本地推理，输出透明 PNG。
 *
 * 预览面板（CutoutCompareSlider）自带「比较 / 结果 / 原版」三种模式，把运行
 * 元信息（后端、用时、像素、体积）和操作按钮都收进了面板本身 —— 结果相关的
 * 数字贴着结果放，比散在下面的信息条好读。
 *
 * 尚未出结果时退回单张原图预览，不做无意义的空对比。
 */
export function CutoutWorkbench() {
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
    quality,
    setQuality,
    backdrop,
    applyBackdrop,
    selectImage,
    reset,
    cancel,
    run,
  } = useCutout()

  /** 「按住 Space 偷看原图」由这里持有 —— 键盘监听在面板里，状态归工作区。 */
  const [peeking, setPeeking] = useState(false)

  const running = status === 'running'

  /**
   * 人像档抠出来的主体少得离谱时，十有八九是张非人像图。
   * 与其让用户对着一地碎片发懵，不如直接把下一步该做什么写出来。
   */
  const suggestHd =
    Boolean(result) &&
    getCutoutModel(modelId).scope === 'portrait' &&
    (result?.coverage ?? 1) < LOW_COVERAGE_HINT

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
        <CutoutDropZone onFile={selectImage} />
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t.cutoutFirstRunHint}
        </p>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {describeCutoutError(error, t)}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {result ? (
          <CutoutCompareSlider
            beforeUrl={source.previewUrl}
            afterUrl={result.url}
            width={result.width}
            height={result.height}
            bytes={result.blob.size}
            elapsedMs={result.elapsedMs}
            backend={result.backend}
            peeking={peeking}
            onPeekChange={setPeeking}
            onDownload={() => downloadBlob(result.blob, buildFileName(source.fileName, backdrop))}
            onReplace={reset}
          />
        ) : (
          <figure className="space-y-2">
            <figcaption className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {t.cutoutOriginal}
            </figcaption>
            <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
              <img
                src={source.previewUrl}
                alt={t.cutoutOriginal}
                className="block max-h-[65vh] w-full object-contain"
              />
            </div>
          </figure>
        )}

        {running && <CutoutProgressPanel progress={progress} onCancel={cancel} />}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {describeCutoutError(error, t)}
          </div>
        )}

        {suggestHd && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {t.cutoutSuggestHd}
          </div>
        )}

        {result && result.notes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
            {result.notes.map((note) => (
              <span key={note.kind}>
                {/* 同一个 wasm-fallback 有两种成因，说法必须分开：设备没有
                    WebGPU 才算「降级」，而 MODNet 是有意避开 WebGPU（见
                    models.ts）；把它说成降级会让用户以为好显卡白买了。 */}
                {note.kind === 'wasm-fallback' &&
                  (getCutoutModel(modelId).webgpuSafe === false
                    ? t.cutoutNoteCpuByDesign
                    : t.upscaleNoteWasmFallback)}
                {note.kind === 'mask-upscaled' &&
                  t.cutoutNoteMaskUpscaled(
                    note.maskWidth,
                    note.maskHeight,
                    note.imageWidth,
                    note.imageHeight,
                  )}
              </span>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <CutoutControls
            modelId={modelId}
            onModelChange={setModelId}
            quality={quality}
            onQualityChange={setQuality}
            backdrop={backdrop}
            onBackdropChange={applyBackdrop}
            capabilities={capabilities}
            hasResult={Boolean(result)}
            disabled={running}
          />
        </div>

        {/* 运行按钮吸在视口底部。
            侧栏内容比一屏还高时（窗口小、笔记本竖屏、字体放大），用户被推到
            下面翻设置，「一键抠图」就跟着滑出屏幕了 —— 而这是整页唯一必须够得着
            的按钮。吸底之后不管内容多长它都在。
            底色跟着页面走 + 毛玻璃 + 上边框：滚动时它下面会压着卡片文字，不留
            这层遮挡会糊成一片。 */}
        <div className="sticky bottom-0 z-10 space-y-2 border-t border-neutral-200 bg-neutral-50/95 pt-3 pb-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? t.cutoutRunning : result ? t.cutoutRerun : t.cutoutRun}
          </button>

          <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500">
            {backendLabel}
          </p>
        </div>
      </aside>
    </div>
  )
}

/**
 * 主体占比低于这个数，就认为「这张图多半不是人像」。
 *
 * 实测参考：人像约 66%，杯子约 18%，而 MODNet 的量化版在杯子上只剩 4%。
 * 取 8% 是想让「明显抠坏」触发提示，又不至于把正常的半身像、小主体误伤。
 */
const LOW_COVERAGE_HINT = 0.08

/**
 * 下载文件名沿用原图的名字，加上底色后缀。
 * 透明时用 -cutout 作后缀，让用户一眼知道这个是带 alpha 的。
 */
function buildFileName(original: string, backdrop: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image'
  const suffix = backdrop === 'transparent' ? 'cutout' : `cutout-${backdrop}`
  return `${base}-${suffix}.png`
}
