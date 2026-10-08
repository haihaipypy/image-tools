import type { Translation } from '../../i18n/locales/en'
import { SegmentError } from '../../lib/segment/errors'
import { RuntimeError } from '../../lib/ort'

/**
 * 把点选抠图抛出的错误翻成当前语言。
 *
 * 与 describeCutoutError 同构，但多一个只有交互式工具才有的分支：
 * `empty-mask` 在这里不是「图里没有主体」，而是「你点在背景上了」——
 * 文案必须给出下一步动作，而不是让用户以为工具坏了。
 */
export function describeSegmentError(error: Error, t: Translation): string {
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

  if (!(error instanceof SegmentError)) return error.message

  switch (error.code) {
    case 'decode-failed':
      return t.segmentErrorDecode
    case 'unsupported-image':
      return t.segmentErrorUnsupported
    case 'image-too-large':
      return t.segmentErrorTooLarge
    case 'model-download-failed':
      return t.segmentErrorModelDownload(String(error.meta.status ?? '?'))
    case 'session-init-failed':
      return t.segmentErrorSessionInit(error.meta.detail ?? '')
    case 'canvas-context-failed':
      return t.upscaleErrorCanvas
    case 'tensor-missing':
      return t.segmentErrorTensor(String(error.meta.outputName ?? '?'))
    case 'invalid-mask':
      return t.segmentErrorInvalidMask
    case 'empty-mask':
      return t.segmentErrorEmptyMask
    default:
      return error.message
  }
}
