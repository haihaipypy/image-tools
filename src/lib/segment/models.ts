import type { SegmentModelSpec } from '../types'

/**
 * 权重挂在 Hugging Face 的 Acly/MobileSAM 仓库，**打到具体 commit** 而不是
 * `main`：上游重新导出一次权重，跑出来的遮罩就变了，用户看不出区别却会以为
 * 「今天这个工具不准了」。抠图那边的模型也是这么钉的。
 */
const REPO = 'https://huggingface.co/Acly/MobileSAM/resolve/0d3b403339b4674a82493d5e97964dd78089ddc8'

/**
 * 点选抠图只提供 MobileSAM 一个档。
 *
 * 候选里本来还有 SAM2 Tiny（151 MB）—— 精度更好，但它比这个项目的两个抠图
 * 模型加起来还大，而点选抠图的卖点恰恰是「指哪打哪、立刻出结果」。一个 45 MB
 * 的编码器已经把首次等待拖到十几秒了，再翻三倍没有任何性价比。
 *
 * Acly 的导出把归一化写进了计算图，所以这里喂进去的是 0-255 的原始字节，
 * 不是抠图那边习惯的 0-1。张量排布也是 HWC 而不是 CHW。
 */
const MOBILESAM: SegmentModelSpec = {
  id: 'mobilesam',
  label: 'MobileSAM',
  encoder: {
    url: `${REPO}/mobile_sam_image_encoder.onnx`,
    approxBytes: 28_157_093,
    inputName: 'input_image',
    layout: 'hwc',
    inputRange: 'byte',
  },
  decoder: {
    url: `${REPO}/sam_mask_decoder_multi.onnx`,
    approxBytes: 16_496_559,
  },
  imageSize: 1024,
  maskSize: 256,
  // multi 版一次吐三张候选，取 IoU 预测最高的那张；single 版只有一张，会更糊。
  maskCount: 3,
  license: 'Apache-2.0',
}

export const SEGMENT_MODELS: SegmentModelSpec[] = [MOBILESAM]

/** 目前只有一个档，调用方不必自己做选择。 */
export const SEGMENT_MODEL = MOBILESAM

/** 首次使用需要下载的字节数（编码器 + 解码器）。 */
export const SEGMENT_DOWNLOAD_BYTES =
  MOBILESAM.encoder.approxBytes + MOBILESAM.decoder.approxBytes
