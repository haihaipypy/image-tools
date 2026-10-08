/**
 * 点选抠图的错误类型。
 *
 * 与 CutoutError 分开：那边是「一键全自动」，失败几乎只有「抠空了」一种；
 * 这边是交互式的，多出一类只有点击才存在的失败 —— 点在了背景上、点太少、
 * 或者十几下点击互相打架导致解码器给不出可用遮罩。混进同一个枚举会让 UI
 * 层的分支变脏。
 */
export type SegmentErrorCode =
  /** 浏览器无法解码用户选中的图片。 */
  | 'decode-failed'
  /** 文件格式不在支持范围内。 */
  | 'unsupported-image'
  /** 文件超过体积上限。 */
  | 'image-too-large'
  /** 模型权重下载失败。 */
  | 'model-download-failed'
  /** 推理会话初始化失败（WebGPU 与 WASM 都失败）。 */
  | 'session-init-failed'
  /** 拿不到 2D 绘图上下文。 */
  | 'canvas-context-failed'
  /** 编码器或解码器没有返回预期的输出张量。 */
  | 'tensor-missing'
  /** 解码器返回的遮罩尺寸或数值不对。 */
  | 'invalid-mask'
  /** 遮罩几乎全空，通常是点在纯背景上了。 */
  | 'empty-mask'

export interface SegmentErrorMeta {
  status?: number | string
  detail?: string
  outputName?: string
}

export class SegmentError extends Error {
  readonly code: SegmentErrorCode
  readonly meta: SegmentErrorMeta

  constructor(code: SegmentErrorCode, meta: SegmentErrorMeta = {}) {
    super(code)
    this.name = 'SegmentError'
    this.code = code
    this.meta = meta
  }
}
