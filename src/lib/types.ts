/**
 * 放大流水线的共享类型。
 *
 * 这里刻意不存放面向用户的文案：进度与结果附注一律以结构化数据产出，
 * 由 UI 层结合 i18n 渲染。这样同一套推理代码可以服务任意语言，
 * 也不需要为了换文案去动算法。
 */

/** 实际执行推理的后端，会展示给用户看。 */
export type BackendKind = 'webgpu' | 'wasm'

/** 模型期望的输入张量取值范围。 */
export type InputRange = 'unit' | 'byte'

export interface UpscaleModelSpec {
  id: string
  /** 型号名，跨语言保持一致，不翻译。 */
  label: string
  /** ONNX 权重位置（同源路径或绝对 URL）。 */
  url: string
  /** 权重里固化的原生放大倍数。 */
  scale: number
  approxBytes: number
  inputRange: InputRange
  /** ONNX 图的输入 / 输出张量名。 */
  inputName: string
  outputName: string
  /**
   * 图被冻结到的固定输入边长；为 null 表示支持动态尺寸。
   * 冻结尺寸的图不能喂任意大小的瓦片。
   */
  fixedInputSize: number | null
  license: string
}

/** 抠图权重的精度变体。WebGPU 走 fp16，WASM 走 fp32。 */
export type CutoutDtype = 'fp16' | 'fp32'

export interface CutoutVariant {
  /** ONNX 权重位置（同源路径或绝对 URL）。 */
  url: string
  approxBytes: number
  dtype: CutoutDtype
}

export interface CutoutModelSpec {
  id: string
  /** 型号名，跨语言保持一致，不翻译。 */
  label: string
  /**
   * 按执行后端区分的权重变体。同一个模型在 WebGPU 下用半精度、WASM 下用
   * 全精度，是两套完全不同的文件，所以体积与 URL 都要分开记。
   */
  variants: Record<BackendKind, CutoutVariant>
  /** 模型固定的正方形输入边长。 */
  inputSize: number
  /** ONNX 图的输入 / 输出张量名。 */
  inputName: string
  outputName: string
  /** 输出是否为未激活 logits（需要 sigmoid）。 */
  outputIsLogits: boolean
  license: string
}

/** 抠图的两档质量。fast 走边缘硬化，quality 保留原始软过渡。 */
export type CutoutQuality = 'fast' | 'quality'

export type CutoutProgressPhase =
  | 'idle'
  | 'fetching-model'
  | 'warming-up'
  | 'inference'
  | 'compositing'
  | 'done'
  | 'error'

export interface CutoutProgress {
  phase: CutoutProgressPhase
  /** 0..1；null 表示该阶段没有可量化的进度。 */
  ratio: number | null
}

export type CutoutProgressHandler = (progress: CutoutProgress) => void

export interface CutoutResult {
  canvas: OffscreenCanvas | HTMLCanvasElement
  backend: BackendKind
  elapsedMs: number
  /** 命中的前景像素占比，用来判断「是不是抠空了」。 */
  coverage: number
  notes: ResultNote[]
}

export interface TileSettings {
  /** 送进网络的瓦片边长，单位是源图像素。 */
  tileSize: number
  /** 每块瓦片向外扩展的重叠像素，用来压住拼缝。 */
  overlap: number
}

export type ProgressPhase =
  | 'idle'
  | 'fetching-model'
  | 'warming-up'
  | 'decoding'
  | 'inference'
  | 'encoding'
  | 'done'
  | 'error'

export interface ProgressDetail {
  /** 已完成的瓦片数（仅 inference 阶段）。 */
  completed?: number
  /** 瓦片总数（仅 inference 阶段）。 */
  total?: number
}

export interface UpscaleProgress {
  phase: ProgressPhase
  /** 0..1；null 表示该阶段没有可量化的进度。 */
  ratio: number | null
  detail?: ProgressDetail
}

export type ProgressHandler = (progress: UpscaleProgress) => void

/** 结果附注：只携带数据，文案交给 i18n。 */
export type ResultNote =
  | { kind: 'tiles'; totalTiles: number; tileEdge: number; overlap: number }
  | { kind: 'resample'; nativeScale: number; targetScale: number }
  | { kind: 'wasm-fallback' }
  | { kind: 'mask-upscaled'; maskEdge: number; outputEdge: number }

export interface UpscaleResult {
  canvas: OffscreenCanvas | HTMLCanvasElement
  backend: BackendKind
  elapsedMs: number
  notes: ResultNote[]
}

export interface BackendCapabilities {
  webgpu: boolean
  /** 多线程 WASM 是否可用（需要跨域隔离）。 */
  threads: boolean
  crossOriginIsolated: boolean
  adapterLabel: string | null
}

declare global {
  interface Window {
    __UPSCALE_DEBUG__?: Record<string, unknown>
  }
}
