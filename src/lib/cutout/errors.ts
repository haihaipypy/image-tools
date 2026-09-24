/**
 * 抠图流水线的错误类型。
 *
 * 与放大的 UpscaleError 分开：两者的失败模式不同（抠图没有「输出过大」这种
 * 预算问题，但有「抠空了」这种语义问题），混在一个枚举里只会让 UI 层的分支
 * 变脏。错误仍然只带「码 + 数据」，文案由 UI 层按当前语言渲染。
 */
export type CutoutErrorCode =
  /** 浏览器无法解码用户选中的图片。 */
  | 'decode-failed'
  /** 文件格式不在支持范围内。 */
  | 'unsupported-image'
  /** 文件超过体积上限。 */
  | 'image-too-large'
  /** 模型权重下载失败。 */
  | 'model-download-failed'
  /** 模型返回的遮罩尺寸或数值不对。 */
  | 'invalid-mask'
  /** 推理会话初始化失败（WebGPU 与 WASM 都失败）。 */
  | 'session-init-failed'
  /** 拿不到 2D 绘图上下文。 */
  | 'canvas-context-failed'
  /** 模型没有返回预期的输出张量。 */
  | 'tensor-missing'
  /** 抠图结果几乎全空，通常是图里没有明确主体。 */
  | 'empty-result'

export interface CutoutErrorMeta {
  status?: number | string
  detail?: string
  outputName?: string
}

export class CutoutError extends Error {
  readonly code: CutoutErrorCode
  readonly meta: CutoutErrorMeta

  constructor(code: CutoutErrorCode, meta: CutoutErrorMeta = {}) {
    super(code)
    this.name = 'CutoutError'
    this.code = code
    this.meta = meta
  }
}
