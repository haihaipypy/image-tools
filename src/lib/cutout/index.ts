import type {
  CutoutModelSpec,
  CutoutProgressHandler,
  CutoutQuality,
  CutoutResult,
  ResultNote,
} from '../types'
import { ort } from '../ort'
import { CutoutError } from './errors'
import { composeTransparent, preprocess, toAlpha } from './image'
import { CUTOUT_CACHE_NAME } from './modelCache'
import { acquireCutoutSession } from './session'

/** 覆盖率低于这个值就认为抠空了 —— 网络找不到主体，结果对用户没用。 */
const MIN_COVERAGE = 0.002

export interface LocalCutoutOptions {
  bitmap: ImageBitmap
  spec: CutoutModelSpec
  quality: CutoutQuality
  preferWebgpu: boolean
  threads: boolean
  onProgress?: CutoutProgressHandler
  signal?: AbortSignal
}

/**
 * 在本机跑一次 BiRefNet 抠图。
 *
 * 与放大流水线最大的不同：抠图是**单张整图推理**，没有瓦片循环。模型输入被
 * 固定成 512×512，所以源图无论多大都只跑一次前向 —— 这也意味着输出遮罩的分辨
 * 率上限就是 512，细节全靠合成阶段把遮罩放大回原尺寸。
 *
 * 因此这里显式记一条 `mask-upscaled` 附注：当源图远大于 512 时，边缘质量受
 * 遮罩分辨率而非网络能力限制，用户应该知道这一点（UI 会据此提示）。
 */
export async function cutoutLocally(options: LocalCutoutOptions): Promise<CutoutResult> {
  const { bitmap, spec, quality, preferWebgpu, threads, onProgress, signal } = options

  const startedAt = performance.now()
  const size = spec.inputSize

  const { session, backend } = await acquireCutoutSession({
    spec,
    preferWebgpu,
    threads,
    onProgress,
    signal,
  })

  const notes: ResultNote[] = []
  if (backend === 'wasm' && preferWebgpu) {
    notes.push({ kind: 'wasm-fallback' })
  }

  throwIfCancelled(signal)
  onProgress?.({ phase: 'inference', ratio: 0 })

  const pixels = preprocess(bitmap, bitmap.width, bitmap.height, size)
  const tensor = new ort.Tensor('float32', pixels, [1, 3, size, size])

  let alpha: Float32Array
  let maskWidth: number
  let maskHeight: number

  try {
    const outputs = await session.run({ [spec.inputName]: tensor })
    const output = pickOutput(outputs, spec)

    const dims = output.dims
    maskHeight = dims[dims.length - 2] ?? size
    maskWidth = dims[dims.length - 1] ?? size

    alpha = toAlpha(output.data as Float32Array, maskWidth * maskHeight, spec.outputIsLogits)
    output.dispose()
  } finally {
    tensor.dispose()
  }

  throwIfCancelled(signal)
  onProgress?.({ phase: 'compositing', ratio: null })

  const { blob, coverage } = await composeTransparent(
    bitmap,
    alpha,
    maskWidth,
    maskHeight,
    quality,
  )

  if (coverage < MIN_COVERAGE) {
    throw new CutoutError('empty-result', { detail: String(coverage) })
  }

  if (bitmap.width > size || bitmap.height > size) {
    notes.push({
      kind: 'mask-upscaled',
      maskEdge: Math.min(maskWidth, maskHeight),
      outputEdge: Math.max(bitmap.width, bitmap.height),
    })
  }

  onProgress?.({ phase: 'done', ratio: 1 })

  return {
    canvas: await blobToCanvas(blob),
    backend,
    elapsedMs: performance.now() - startedAt,
    coverage,
    notes,
  }
}

/**
 * 从会话的输出里挑出遮罩张量。
 *
 * 注册表里写了 `outputName`，但**不把它当唯一真相** —— ONNX 图的输出名是导出时
 * 定的，不同导出者各叫各的（`output_image`、`logits`、`mask`……），写错一次就会
 * 直接抛 `tensor-missing` 让整个功能不可用。这里退一步：
 *
 * 1. 注册表的名字命中 → 用它（快路径，也是绝大多数情况）；
 * 2. 没命中 → 退到「唯一输出」，或第一张 4 维/空间维可解释的张量；
 * 3. 实在认不出 → 才报 `tensor-missing`，并把图里实际有哪些输出带上，便于排查。
 *
 * 这样换模型时即使名字写错，功能仍然是通的。
 */
function pickOutput(
  outputs: Record<string, ort.Tensor>,
  spec: CutoutModelSpec,
): ort.Tensor {
  const named = outputs[spec.outputName]
  if (named) return named
  return resolveOutputFallback(outputs)
}

function resolveOutputFallback(
  outputs: Record<string, ort.Tensor>,
): ort.Tensor {
  const entries = Object.entries(outputs)

  // 遮罩是空间张量，至少 2 维；优先取形状最像 [N, 1, H, W] 的那张。
  const spatial = entries.filter(([, tensor]) => {
    const dims = tensor.dims
    return dims.length >= 2 && typeof dims[dims.length - 1] === 'number'
  })

  // 只有一张输出时无需犹豫，直接用它。
  if (entries.length === 1 && entries[0]) return entries[0][1]

  // 多输出时挑最后一维最小的 —— 遮罩通常是单通道，比 logits 之外的辅助输出更窄。
  const best = (spatial.length > 0 ? spatial : entries).sort((a, b) => {
    const edge = (t: ort.Tensor) => t.dims[t.dims.length - 1] ?? Number.MAX_SAFE_INTEGER
    return edge(a[1]) - edge(b[1])
  })[0]

  if (best) return best[1]

  throw new CutoutError('tensor-missing', {
    outputName: Object.keys(outputs).join(', ') || '（无输出）',
  })
}

/**
 * 结果以 Blob 的形式产出（PNG 编码已经完成），但下游的预览与下载都期望一个
 * 可绘制的对象。这里把它解回 ImageBitmap 再转 canvas —— 比让 composeTransparent
 * 返回 canvas、UI 再自己编码要少一次重复编码。
 */
async function blobToCanvas(blob: Blob): Promise<OffscreenCanvas> {
  const decoded = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(decoded.width, decoded.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new CutoutError('canvas-context-failed')
  ctx.drawImage(decoded, 0, 0)
  decoded.close()
  return canvas
}

function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException('已取消', 'AbortError')
}

export { CUTOUT_CACHE_NAME }
