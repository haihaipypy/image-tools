/**
 * ONNX Runtime 加载层的错误类型。
 *
 * 与放大、抠图各自的业务错误分开：这一层只关心「运行时能不能起来」，
 * 与具体跑什么模型无关，所以两种工具都复用同一组码。
 */
export type RuntimeErrorCode =
  /** 找不到 /ort/manifest.json（通常是构建前忘了跑 prepare:ort）。 */
  | 'manifest-missing'
  /** 运行时清单内容不完整。 */
  | 'manifest-invalid'
  /** ORT 运行时资源拉取失败。 */
  | 'asset-failed'

export interface RuntimeErrorMeta {
  status?: number | string
  detail?: string
}

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode
  readonly meta: RuntimeErrorMeta

  constructor(code: RuntimeErrorCode, meta: RuntimeErrorMeta = {}) {
    super(code)
    this.name = 'RuntimeError'
    this.code = code
    this.meta = meta
  }
}
