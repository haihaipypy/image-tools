import { SegmentError } from './errors'

/**
 * 与抠图保持同一个上限。超过 40 MB 的图在浏览器里光解码就已经开始不稳，
 * 而且点选抠图还要再把它铺进 1024² 的编码器输入，卡住的概率更高。
 */
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * 收图前先挡一道。
 *
 * 不挡的话，用户丢进一个 TIFF 会在十几秒的模型下载之后才失败 —— 错误信息
 * 还只是「无法解码」。越早拒绝越省事。
 */
export function validateImage(input: File): void {
  if (input.type && !SUPPORTED_TYPES.has(input.type)) {
    throw new SegmentError('unsupported-image', { detail: input.type })
  }
  if (input.size > MAX_IMAGE_BYTES) {
    throw new SegmentError('image-too-large', { detail: String(input.size) })
  }
}

export async function decodeImage(input: Blob): Promise<ImageBitmap> {
  try {
    // 尊重 EXIF 方向：手机竖拍的照片如果不转正，用户点的地方和抠出来的地方会错位。
    return await createImageBitmap(input, { imageOrientation: 'from-image' })
  } catch (error) {
    throw new SegmentError('decode-failed', {
      detail: error instanceof Error ? error.message : String(error),
    })
  }
}
