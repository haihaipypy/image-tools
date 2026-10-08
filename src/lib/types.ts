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

/**
 * 模型对输入的几何与数值约束。
 *
 * 不同模型家族的预处理差别很大，写死成「512×512 + ImageNet 归一化」会把
 * 后续所有候选模型挡在门外，所以按模型描述：
 *
 * - `square`：不管长宽比，直接拉伸到 edge×edge。BiRefNet 走这条 —— 官方
 *   实现就是这么做的，长宽比失真交给网络自己吸收。
 * - `aspect`：短边缩到 edge，长边等比跟随，再把两边各自向上取整到
 *   divisibility 的倍数。MODNet 走这条 —— 它的 encoder/decoder 有多级
 *   下采样再上采样，尺寸不能被整除时 Concat 会直接报维度不匹配。
 *
 * 归一化也跟着模型走：BiRefNet 用 ImageNet 均值方差，MODNet 用 0.5/0.5。
 */
export interface CutoutPreprocess {
  mode: 'square' | 'aspect'
  /** square 模式下的正方边长；aspect 模式下的短边目标长度。 */
  edge: number
  /** 输入长宽必须被该数整除（square 模式填 1）。 */
  divisibility: number
  mean: readonly [number, number, number]
  std: readonly [number, number, number]
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
  /** 送进网络的几何与数值约束。 */
  preprocess: CutoutPreprocess
  /** ONNX 图的输入 / 输出张量名。 */
  inputName: string
  outputName: string
  /** 输出是否为未激活 logits（需要 sigmoid）。 */
  outputIsLogits: boolean
  license: string
  /**
   * 适用场景。`portrait` 表示网络是为人像训练的，抠非人像主体时效果会明显
   * 变差 —— UI 需要据此给出提示，而不是让用户自己去猜为什么抠坏了。
   */
  scope: 'general' | 'portrait'
  /**
   * 该模型在 WebGPU 后端上是否可信。省略视为 true。
   *
   * 不是所有模型都能安全交给 WebGPU：ORT 的 WebGPU EP 在 GPU 上以半精度执行
   * 中间激活，对归一化层密集的网络会引入可观误差，**而且不报错** —— 表现是
   * 「跑完了、张量形状也对、但抠出来是错的」。这类故障没有任何异常可捕获，
   * 只能靠模型注册表显式声明来挡。
   *
   * 实测（Intel Gen-12LP + ORT 1.30.0，同一张 1440×2456 人像）：
   *   MODNet   WebGPU 前景占比 35.90%，WASM 47.41% —— 主体被啃掉一大片
   *   BiRefNet WebGPU 47.08%，       WASM 47.08% —— 两端完全一致
   * 所以 MODNet 标 false，强制走 WASM；代价是 fp32 权重比 fp16 多 12 MB
   * （24.7 MB vs 12.4 MB），换来正确的结果，这笔账必须这么算。
   */
  webgpuSafe?: boolean
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

// ── 点选抠图（SAM） ─────────────────────────────────────────

/** 编码器的输入排布。SAM 系列用的是 HWC，不是抠图模型的 CHW。 */
export type SegmentLayout = 'hwc' | 'chw'

export interface SegmentEncoderSpec {
  url: string
  approxBytes: number
  /** ONNX 图里的输入张量名。 */
  inputName: string
  layout: SegmentLayout
  /**
   * 输入数值范围。`byte` 表示 0-255（Acly 的 MobileSAM 导出把归一化写进了图里），
   * `unit` 表示 0-1。
   */
  inputRange: 'unit' | 'byte'
}

export interface SegmentDecoderSpec {
  url: string
  approxBytes: number
}

export interface SegmentModelSpec {
  id: string
  /** 型号名，跨语言保持一致，不翻译。 */
  label: string
  encoder: SegmentEncoderSpec
  decoder: SegmentDecoderSpec
  /** 编码器吃进去的正方边长，同时是提示点坐标的参考系。 */
  imageSize: number
  /** 解码器内部低分辨率遮罩的边长（回传 refine 时用）。 */
  maskSize: number
  /** 解码器一次输出几张候选遮罩，按 IoU 预测挑最好的一张。 */
  maskCount: number
  license: string
}

/** 提示点：正点是「要这个」，负点是「不要这个」。 */
export type PromptLabel = 0 | 1

export interface PromptPoint {
  /** 归一化到 0-1 的原图坐标，与显示尺寸无关。 */
  x: number
  y: number
  label: PromptLabel
}

export type SegmentProgressPhase =
  | 'idle'
  | 'fetching-encoder'
  | 'fetching-decoder'
  | 'warming-up'
  | 'encoding'
  | 'decoding'
  | 'compositing'
  | 'done'
  | 'error'

export interface SegmentProgress {
  phase: SegmentProgressPhase
  /** 0..1；null 表示该阶段没有可量化的进度。 */
  ratio: number | null
}

export type SegmentProgressHandler = (progress: SegmentProgress) => void

export interface SegmentOutcome {
  canvas: OffscreenCanvas | HTMLCanvasElement
  backend: BackendKind
  /** 编码整张图用掉的时间；换图才需要重跑。 */
  encodeMs: number
  /** 本次解码（一次点击）用掉的时间。 */
  decodeMs: number
  /** 挑选出来的那张候选遮罩的预测 IoU，可当作置信度看。 */
  score: number
  /** 主体占原图面积的百分比，用来判断有没有抠歪。 */
  coverage: number
  /** 本次是否复用了已有的图像编码，而不必重跑编码器。 */
  reusedEncoding: boolean
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
  | {
      kind: 'mask-upscaled'
      maskWidth: number
      maskHeight: number
      imageWidth: number
      imageHeight: number
    }

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
