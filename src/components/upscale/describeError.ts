import type { Translation } from '../../i18n/locales/en'
import { RuntimeError } from '../../lib/ort'
import { MAX_LOCAL_OUTPUT_PIXELS } from '../../lib/upscaler'
import { UpscaleError } from '../../lib/upscaler/errors'

const megapixels = (pixels: number) => Math.round(pixels / 1_000_000)

/**
 * 把推理层抛出的错误翻成当前语言。
 *
 * ORT 层抛的是 RuntimeError（运行时资源、权重下载），与 UpscaleError 是两套
 * 类型，但用户看到的是同一个页面，所以在这里一起翻。之前只认 UpscaleError，
 * 下载失败时页面上会直接显示 `asset-failed` 这种内部错误码。
 *
 * 其余错误（多半来自浏览器或 ORT 自身）原样显示原始 message —— 技术细节总比
 * 一句笼统的「失败了」有用。
 */
export function describeUpscaleError(error: Error, t: Translation): string {
  if (error instanceof RuntimeError) {
    const status = String(error.meta.status ?? '?')
    switch (error.code) {
      case 'manifest-missing':
        return t.upscaleErrorRuntimeManifest
      case 'manifest-invalid':
        return t.upscaleErrorRuntimeManifestInvalid
      case 'asset-failed':
        return t.upscaleErrorRuntimeAsset(status)
      case 'model-fetch-failed':
        return t.errorModelFetch
      default:
        return error.message
    }
  }

  if (!(error instanceof UpscaleError)) return error.message

  const { meta } = error
  const status = String(meta.status ?? '?')

  switch (error.code) {
    case 'image-decode-failed':
      return t.upscaleErrorDecode
    case 'capacity-exceeded':
      return t.upscaleErrorCapacity(
        megapixels(meta.outputPixels ?? 0),
        megapixels(MAX_LOCAL_OUTPUT_PIXELS),
      )
    case 'model-download-failed':
      return t.upscaleErrorModelDownload(status)
    case 'runtime-manifest-missing':
      return t.upscaleErrorRuntimeManifest
    case 'runtime-manifest-invalid':
      return t.upscaleErrorRuntimeManifestInvalid
    case 'runtime-asset-failed':
      return t.upscaleErrorRuntimeAsset(status)
    case 'canvas-context-failed':
      return t.upscaleErrorCanvas
    case 'tensor-missing':
      return t.upscaleErrorTensor(String(meta.outputName ?? '?'))
    case 'session-init-failed':
      return t.upscaleErrorSessionInit(meta.detail ?? '')
    default:
      return error.message
  }
}
