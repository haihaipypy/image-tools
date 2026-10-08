import type {
  BackendKind,
  PromptPoint,
  SegmentModelSpec,
  SegmentProgressHandler,
} from '../types'
import { SegmentError } from './errors'
import { canvas2d, makeCanvas } from './canvas'
import { fetchModelBuffer } from './modelCache'
import { configureThreads, ort, prepareOrtRuntime, RuntimeError } from '../ort'
import { maskToAlphaPlane, padBox, pickBestMask, resolveMaskKind, type PadBox } from './geometry'

export interface SegmentSessions {
  encoder: ort.InferenceSession
  decoder: ort.InferenceSession
  backend: BackendKind
}

/**
 * 编解码器是**成对**缓存、成对降级的。
 *
 * 只用编码器跑得通、解码器跑不通的组合是没有意义的 —— 中间的图像嵌入只有
 * 配套的解码器认得。所以两个会话一起建、一起换，失败也一起回退到 WASM。
 *
 * 只保留最近一对：两套权重常驻内存是给显存找麻烦，而用户不会在同一会话里
 * 反复切后端。
 */
let active: { backend: BackendKind; sessions: SegmentSessions } | null = null

async function disposeActive(): Promise<void> {
  if (!active) return
  for (const session of [active.sessions.encoder, active.sessions.decoder]) {
    try {
      await session.release()
    } catch {
      // 释放一个本来就失败的会话不是值得上报的错误。
    }
  }
  active = null
}

export interface AcquireSegmentOptions {
  spec: SegmentModelSpec
  preferWebgpu: boolean
  threads: boolean
  onProgress?: SegmentProgressHandler
  signal?: AbortSignal
}

export async function acquireSegmentSessions(
  options: AcquireSegmentOptions,
): Promise<SegmentSessions> {
  const { spec, preferWebgpu, threads, onProgress, signal } = options
  const attempts: BackendKind[] = preferWebgpu ? ['webgpu', 'wasm'] : ['wasm']

  let lastError: unknown = null

  for (const backend of attempts) {
    if (active?.backend === backend) return active.sessions
    try {
      const sessions = await createSessions(spec, backend, threads, onProgress, signal)
      await disposeActive()
      active = { backend, sessions }
      return sessions
    } catch (error) {
      lastError = error
    }
  }

  // 同 cutout/session.ts：分过类的错误别再包一层，否则 RuntimeError 的 code
  // 会在包装时丢失，下载失败显示成裸的 model-fetch-failed。
  if (lastError instanceof SegmentError || lastError instanceof RuntimeError) throw lastError

  throw new SegmentError('session-init-failed', {
    detail: lastError instanceof Error ? lastError.message : String(lastError),
  })
}

async function createSessions(
  spec: SegmentModelSpec,
  backend: BackendKind,
  threads: boolean,
  onProgress: SegmentProgressHandler | undefined,
  signal: AbortSignal | undefined,
): Promise<SegmentSessions> {
  // 先把两份权重都取下来，再一次性装载。下载和装载是两个完全不同的等待
  // 体验（前者有进度条，后者只能转圈），混在一起会让进度条卡在 100% 不动。
  const encoderBuffer = await fetchModelBuffer(spec.encoder.url, {
    signal,
    onProgress: (ratio) => onProgress?.({ phase: 'fetching-encoder', ratio }),
  })
  const decoderBuffer = await fetchModelBuffer(spec.decoder.url, {
    signal,
    onProgress: (ratio) => onProgress?.({ phase: 'fetching-decoder', ratio }),
  })

  onProgress?.({ phase: 'warming-up', ratio: null })

  configureThreads(threads)
  // 两个后端跑在同一份 wasm 运行时上，所以只需要准备一次。
  await prepareOrtRuntime()

  const encoder = await createSession(encoderBuffer, backend)
  const decoder = await createSession(decoderBuffer, backend)

  return { encoder, decoder, backend }
}

async function createSession(
  buffer: ArrayBuffer,
  backend: BackendKind,
): Promise<ort.InferenceSession> {
  try {
    return await ort.InferenceSession.create(buffer, {
      executionProviders: [backend],
      graphOptimizationLevel: 'all',
    })
  } catch (error) {
    throw new SegmentError('session-init-failed', {
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}

// ── 编码 ────────────────────────────────────────────────────

export interface Encoding {
  embeddings: Record<string, ort.Tensor>
  /** 编码时用的补边盒，解码和最终合成都要靠它换算坐标。 */
  box: PadBox
  encodeMs: number
}

/**
 * 把整张图编码成图像嵌入。
 *
 * 这是整个流程里最贵的一步（MobileSAM 在 CPU 上要好几秒），而它**只跟图片
 * 有关、跟提示点无关** —— 所以调用方换点不换图时必须复用这里的结果，
 * 否则每一次点击都要重等一遍。
 */
export async function encodeImage(
  sessions: SegmentSessions,
  spec: SegmentModelSpec,
  bitmap: ImageBitmap | HTMLCanvasElement | OffscreenCanvas,
  onProgress?: SegmentProgressHandler,
): Promise<Encoding> {
  const size = spec.imageSize
  const box = padBox(bitmap.width, bitmap.height, size)

  onProgress?.({ phase: 'encoding', ratio: null })

  const canvas = makeCanvas(size, size)
  const ctx = canvas2d(canvas)

  // 补边填黑：SAM 的前处理就是这么做的，改成透明会让补边区变成未定义颜色。
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, box.x, box.y, box.w, box.h)

  const { data } = ctx.getImageData(0, 0, size, size)
  const tensor = buildEncoderTensor(data, size, spec)

  const started = performance.now()
  const results = await sessions.encoder.run({ [spec.encoder.inputName]: tensor })
  const encodeMs = performance.now() - started

  const names = sessions.encoder.outputNames
  if (names.length === 0) {
    throw new SegmentError('tensor-missing', { outputName: spec.encoder.inputName })
  }

  // MobileSAM 只有一个输出。多输出的编码器（SAM2 那类）要成组喂给解码器，
  // 这里先兜住「至少拿到了一个」这个底线。
  const embeddings: Record<string, ort.Tensor> = {}
  for (const name of names) {
    const value = results[name]
    if (value) embeddings[name] = value
  }
  if (Object.keys(embeddings).length === 0) {
    throw new SegmentError('tensor-missing', { outputName: names[0] })
  }

  return { embeddings, box, encodeMs }
}

/**
 * 按 SAM 的约定把 RGBA 转成编码器要的浮点张量。
 *
 * 排布是 HWC 而不是抠图那边的 CHW；Acly 的导出把归一化写进了计算图，所以
 * 这里喂的是 0-255 的原始字节，不做除以 255。两处任一处搞错，都会得到一个
 * 语法正确、语义全错的张量 —— 模型照样跑，只是抠出来的东西永远不对。
 */
function buildEncoderTensor(
  rgba: Uint8ClampedArray,
  size: number,
  spec: SegmentModelSpec,
): ort.Tensor {
  const pixels = size * size
  const bytes = spec.encoder.inputRange === 'byte'

  if (spec.encoder.layout === 'hwc') {
    const out = new Float32Array(pixels * 3)
    for (let i = 0; i < pixels; i++) {
      const src = i * 4
      const dst = i * 3
      out[dst] = bytes ? rgba[src] : rgba[src] / 255
      out[dst + 1] = bytes ? rgba[src + 1] : rgba[src + 1] / 255
      out[dst + 2] = bytes ? rgba[src + 2] : rgba[src + 2] / 255
    }
    return new ort.Tensor('float32', out, [size, size, 3])
  }

  const out = new Float32Array(pixels * 3)
  for (let i = 0; i < pixels; i++) {
    const src = i * 4
    out[i] = bytes ? rgba[src] : rgba[src] / 255
    out[i + pixels] = bytes ? rgba[src + 1] : rgba[src + 1] / 255
    out[i + 2 * pixels] = bytes ? rgba[src + 2] : rgba[src + 2] / 255
  }
  return new ort.Tensor('float32', out, [1, 3, size, size])
}

// ── 解码 ────────────────────────────────────────────────────

export interface DecodedMask {
  /** 只含 alpha 的遮罩平面，尺寸是 `maskEdge × maskEdge`，含补边。 */
  plane: Uint8ClampedArray
  maskEdge: number
  /** 选中候选的 IoU 预测，可当作置信度。 */
  score: number
  decodeMs: number
}

/**
 * 按提示点解出一张遮罩。
 *
 * 每次点击都把所有点一起喂进去（正点 + 负点），而不是「在上一次结果上继续
 * 微调」：SAM 的解码器本来就把提示点集合当作一个整体约束，重跑一遍既是最
 * 标准的用法，也让「撤销上一点」变成一件不需要额外状态的事。
 */
export async function decodeMask(
  sessions: SegmentSessions,
  spec: SegmentModelSpec,
  encoding: Encoding,
  points: PromptPoint[],
  onProgress?: SegmentProgressHandler,
): Promise<DecodedMask> {
  if (points.length === 0) {
    throw new SegmentError('invalid-mask', { detail: 'no-prompt-points' })
  }

  onProgress?.({ phase: 'decoding', ratio: null })

  const size = spec.imageSize
  const coords = new Float32Array(points.length * 2)
  const labels = new Float32Array(points.length)
  for (let i = 0; i < points.length; i++) {
    // 解码器的坐标系是编码器那个 1024 正方形，不是原图。
    coords[i * 2] = points[i].x * size
    coords[i * 2 + 1] = points[i].y * size
    labels[i] = points[i].label
  }

  const feeds: Record<string, ort.Tensor> = {
    ...encoding.embeddings,
    point_coords: new ort.Tensor('float32', coords, [1, points.length, 2]),
    point_labels: new ort.Tensor('float32', labels, [1, points.length]),
    // 不做多轮 refine，所以「上一轮遮罩」永远是空的那一张。
    mask_input: new ort.Tensor('float32', new Float32Array(spec.maskSize * spec.maskSize), [
      1,
      1,
      spec.maskSize,
      spec.maskSize,
    ]),
    has_mask_input: new ort.Tensor('float32', new Float32Array([0]), [1]),
    orig_im_size: new ort.Tensor('float32', new Float32Array([size, size]), [2]),
  }

  const started = performance.now()
  const results = await sessions.decoder.run(feeds)
  const decodeMs = performance.now() - started

  const masks = findMaskTensor(results, sessions.decoder.outputNames)
  const iou = findIouTensor(results, sessions.decoder.outputNames)
  if (!masks || !iou) {
    throw new SegmentError('tensor-missing', {
      outputName: sessions.decoder.outputNames.join(', '),
    })
  }

  const dims = masks.dims
  if (dims.length !== 4) {
    throw new SegmentError('invalid-mask', { detail: `unexpected-mask-rank:${dims.length}` })
  }
  const maskCount = dims[1]
  const maskEdge = dims[2]
  const rowWidth = dims[3]
  if (maskEdge <= 0 || rowWidth <= 0 || maskEdge !== rowWidth) {
    throw new SegmentError('invalid-mask', { detail: `${maskEdge}x${rowWidth}` })
  }

  const { index, score } = pickBestMask(iou.data as Float32Array, Math.min(maskCount, spec.maskCount))
  const stride = maskEdge * maskEdge
  const slice = (masks.data as Float32Array).subarray(index * stride, (index + 1) * stride)

  return {
    plane: maskToAlphaPlane(slice, resolveMaskKind(slice)),
    maskEdge,
    score,
    decodeMs,
  }
}

/**
 * 按名字找遮罩张量。
 *
 * 社区重导出的解码器把输出叫得很不统一（`masks` / `low_res_masks` /
 * `segmentation` 都见过），所以先按常见名字找，找不到就退回「维度是 4 的那
 * 个张量」—— 遮罩必然是 [批, 候选数, 高, 宽]。
 */
function findMaskTensor(
  results: ort.InferenceSession.OnnxValueMapType,
  outputNames: readonly string[],
): ort.Tensor | null {
  for (const name of ['masks', 'low_res_masks', 'segmentation', ...outputNames]) {
    const value = results[name]
    if (value && value.dims.length === 4) return value
  }
  for (const value of Object.values(results)) {
    if (value && value.dims.length === 4) return value
  }
  return null
}

/** 同上。IoU 预测必然是 [批, 候选数] 这种二维张量。 */
function findIouTensor(
  results: ort.InferenceSession.OnnxValueMapType,
  outputNames: readonly string[],
): ort.Tensor | null {
  for (const name of ['iou_predictions', 'iou_pred', 'scores', ...outputNames]) {
    const value = results[name]
    if (value && value.dims.length === 2) return value
  }
  for (const value of Object.values(results)) {
    if (value && value.dims.length === 2) return value
  }
  return null
}

export async function releaseSegmentSessions(): Promise<void> {
  await disposeActive()
}
