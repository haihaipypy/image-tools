/**
 * 放大流水线的错误类型。
 *
 * 错误只携带「码 + 数据」，不带面向用户的句子 —— 文案由 UI 层按当前语言渲染。
 * 任何未被归类的异常仍然按普通 Error 冒泡，UI 会退回到显示原始 message。
 */
export type UpscaleErrorCode =
  /** 输出像素数超过本机可承受上限。 */
  | 'capacity-exceeded'
  /** 模型权重下载失败。 */
  | 'model-download-failed'
  /** 找不到 /ort/manifest.json（通常是构建前忘了跑 prepare:ort）。 */
  | 'runtime-manifest-missing'
  /** 运行时清单内容不完整。 */
  | 'runtime-manifest-invalid'
  /** ORT 运行时资源拉取失败。 */
  | 'runtime-asset-failed'
  /** 拿不到 2D 绘图上下文。 */
  | 'canvas-context-failed'
  /** 模型没有返回预期的输出张量。 */
  | 'tensor-missing'
  /** 推理会话初始化失败（WebGPU 与 WASM 都失败）。 */
  | 'session-init-failed'
  /** 浏览器无法解码用户选中的图片。 */
  | 'image-decode-failed'

export interface UpscaleErrorMeta {
  status?: number | string
  outputPixels?: number
  scale?: number
  outputName?: string
  detail?: string
}

export class UpscaleError extends Error {
  readonly code: UpscaleErrorCode
  readonly meta: UpscaleErrorMeta

  constructor(code: UpscaleErrorCode, meta: UpscaleErrorMeta = {}) {
    super(code)
    this.name = 'UpscaleError'
    this.code = code
    this.meta = meta
  }
}

/**
 * 本机算力上限。没有服务端兜底，所以这个天花板是硬的。
 *
 * 它按「实际要分配的画布」计算，而画布是按用户请求的倍率开的 —— 瓦片直接画上去，
 * 模型原生的 4x 中间结果从不作为整图存在。因此这个预算用户是能自己调的：
 * 从 4x 降到 2x 输出面积只剩四分之一，能覆盖四倍大的源图。
 */
export class LocalCapacityError extends UpscaleError {
  constructor(outputPixels: number, scale: number) {
    super('capacity-exceeded', { outputPixels, scale })
    this.name = 'LocalCapacityError'
  }
}
