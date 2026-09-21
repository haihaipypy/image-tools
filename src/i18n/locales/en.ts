// 英文文案。Translation 类型以本文件为准，zh-CN.ts 必须完整对齐。
export const en = {
  // 品牌与标语
  brand: 'Image Tools',
  tagline:
    'Free online image compression, format conversion, and AI upscaling — compress to AVIF, WebP, JPEG, JPEG XL, or PNG, or enlarge a photo up to 4x. Everything runs in your browser: nothing is uploaded, and batch compression is included.',

  // 工具切换（顶部标签栏）
  toolNavAria: 'Choose a tool',
  compressTool: 'Compress',
  compressToolDesc: 'Shrink and convert images',
  upscaleTool: 'AI upscale',
  upscaleToolDesc: 'Enlarge images up to 4x',

  // 压缩选项
  outputFormat: 'Output Format',
  qualityLabel: (q: number) => `Quality: ${q}%`,

  // 拖拽区（压缩）
  dropTitle: 'Drop images here or click to upload',
  dropSubtitle: 'Supports JPEG, PNG, WebP, AVIF, and JXL, multiple files at once',

  // 列表状态
  statusPending: 'Ready to process',
  statusProcessing: 'Processing...',
  statusComplete: 'Complete',
  statusError: 'Error processing image',

  // 列表操作
  download: 'Download',
  remove: 'Remove',
  smaller: (pct: number) => `${pct}% smaller`,

  // 批量
  clearAll: 'Clear All',
  downloadAll: 'Download All',
  downloadAllCount: (count: number) =>
    `Download All (${count} ${count === 1 ? 'image' : 'images'})`,

  // 语言切换（显示目标语言名称）
  switchTo: '中文',
  switchToAria: 'Switch to Chinese',

  // 页脚（外链）
  footerBefore: '© 2026 · Free Online Image Tools | Powered by ',
  footerLink: 'Image Tools',
  footerAfter: '',

  // 博客入口卡片（按当前语言指向 /blog/ 或 /en/blog/）
  blogCardTitle: 'Image compression guides',
  blogCardDesc:
    'Practical tips on compressing, converting, and enlarging images — AVIF, WebP, JPEG, PNG, JPEG XL, and AI upscaling.',
  blogCardCta: 'Read the blog',

  // ── AI 放大 ──────────────────────────────────────────────
  // 拖拽区
  upscaleDropTitle: 'Drop an image here, or click to choose',
  upscaleDropSubtitle: 'PNG / JPEG / WebP / AVIF · the image never leaves this device',
  upscaleFirstRunHint:
    'The first run downloads about 11 MB (inference runtime plus model weights), then it is cached on this device and never fetched again.',

  // 控制栏
  upscaleSectionModel: 'Model',
  upscaleSectionScale: 'Upscale factor',
  upscaleSectionOverlap: 'Tile overlap',
  upscaleOverlapHint:
    'A wider overlap hides the seams between tiles, at the cost of more computation.',
  upscaleNoWebgpu:
    'This device has no usable WebGPU, so inference falls back to WASM and may be tens of times slower. Opening the page in the latest Chrome or Edge speeds it up substantially.',

  // 操作
  upscaleRun: 'Upscale',
  upscaleRunning: 'Working…',
  upscaleRerun: 'Upscale again',
  upscaleDownload: 'Download PNG',
  upscaleReplace: 'Choose another image',

  // 对比视图与结果
  upscaleBefore: 'Original',
  upscaleAfter: 'Upscaled',
  upscaleCompareHint: 'Drag to compare the detail before and after',
  upscaleCancel: 'Cancel',
  upscaleNoteTiles: (total: number, edge: number, overlap: number) =>
    `${total} tiles · ${edge}px each · ${overlap}px overlap`,
  upscaleNoteResample: (native: number, target: number) =>
    `${native}x model output resampled to ${target}x`,
  upscaleNoteWasmFallback: 'WebGPU was unavailable — fell back to WASM',

  // 进度阶段
  upscalePhaseIdle: 'Preparing',
  upscalePhaseFetchingModel: 'Downloading model weights',
  upscalePhaseWarmingUp: 'Starting the inference engine',
  upscalePhaseDecoding: 'Decoding the image',
  upscalePhaseInference: 'Running inference',
  upscalePhaseEncoding: 'Encoding the output',
  upscalePhaseDone: 'Done',
  upscalePhaseError: 'Failed',
  upscaleProgressTiles: (done: number, total: number) => `${done} / ${total} tiles`,

  // 后端能力徽章
  upscaleBackendProbing: 'Detecting device…',
  upscaleBackendWebgpu: (adapter: string | null) =>
    adapter ? `WebGPU · ${adapter}` : 'WebGPU',
  upscaleBackendWasmThreads: 'WASM (multi-threaded)',
  upscaleBackendWasmSingle: 'WASM (single-threaded)',

  // 错误（按 code 映射，未知错误回落到原始 message）
  upscaleErrorDecode: 'Could not read that image — please try another one',
  upscaleErrorCapacity: (outputMp: number, limitMp: number) =>
    `Image too large: at this factor the output would be ${outputMp} megapixels, past this device's ${limitMp} megapixel ceiling. Lower the upscale factor, or crop the image first.`,
  upscaleErrorModelDownload: (status: string) => `Model download failed (${status})`,
  upscaleErrorRuntimeManifest: 'Inference runtime not found — run the build step first',
  upscaleErrorRuntimeManifestInvalid: 'The inference runtime manifest is incomplete',
  upscaleErrorRuntimeAsset: (status: string) =>
    `Failed to load the inference runtime (${status})`,
  upscaleErrorCanvas: 'Could not create a 2D drawing context',
  upscaleErrorTensor: (name: string) => `The model did not return tensor ${name}`,
  upscaleErrorSessionInit: (detail: string) =>
    `Could not start the inference engine${detail ? `: ${detail}` : ''}`,

  // 模型说明：按 model.id 取用，避免把文案写进模型注册表
  upscaleModels: {
    'realesr-general-x4v3': {
      note: 'General-purpose photo model — smallest download, fastest output',
      tags: ['General', 'Lightweight'],
    },
  } as Record<string, { note: string; tags: string[] }>,
};

export type Translation = typeof en;
