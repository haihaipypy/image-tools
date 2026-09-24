import type { Translation } from '../../i18n/locales/en'
import { CutoutError } from '../../lib/cutout/errors'
import { RuntimeError } from '../../lib/ort'

/**
 * 把推理层抛出的错误翻成当前语言。
 *
 * 带 code 的 CutoutError 走映射表；RuntimeError 是 ORT 运行时的问题，与
 * 具体工具无关，但用户看到的是抠图页，所以也在这里翻译。其余错误原样显示
 * 原始 message —— 技术细节总比一句笼统的「失败了」有用。
 */
export function describeCutoutError(error: Error, t: Translation): string {
  if (error instanceof RuntimeError) {
    const status = String(error.meta.status ?? '?')
    switch (error.code) {
      case 'manifest-missing':
        return t.upscaleErrorRuntimeManifest
      case 'manifest-invalid':
        return t.upscaleErrorRuntimeManifestInvalid
      case 'asset-failed':
        return t.upscaleErrorRuntimeAsset(status)
      default:
        return error.message
    }
  }

  if (!(error instanceof CutoutError)) return error.message

  switch (error.code) {
    case 'decode-failed':
      return t.cutoutErrorDecode
    case 'unsupported-image':
      return t.cutoutErrorUnsupported
    case 'image-too-large':
      return t.cutoutErrorTooLarge
    case 'model-download-failed':
      return t.cutoutErrorModelDownload(String(error.meta.status ?? '?'))
    case 'invalid-mask':
      return t.cutoutErrorInvalidMask
    case 'tensor-missing':
      return t.cutoutErrorTensor(String(error.meta.outputName ?? '?'))
    case 'session-init-failed':
      return t.cutoutErrorSessionInit(error.meta.detail ?? '')
    case 'canvas-context-failed':
      return t.upscaleErrorCanvas
    case 'empty-result':
      return t.cutoutErrorEmpty
    default:
      return error.message
  }
}
