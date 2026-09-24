// 英文文案。Translation 类型以本文件为准，zh-CN.ts 必须完整对齐。
export const en = {
  // 品牌与标语
  brand: 'Image Tools',
  tagline:
    'Free online image compression, format conversion, AI upscaling, and background removal — compress to AVIF, WebP, JPEG, JPEG XL, or PNG, enlarge a photo up to 4x, or cut out the subject with hair-level precision. Everything runs in your browser: nothing is uploaded, and batch compression is included.',

  // 工具切换（顶部标签栏）
  toolNavAria: 'Choose a tool',
  compressTool: 'Compress',
  compressToolDesc: 'Shrink and convert images',
  upscaleTool: 'AI upscale',
  upscaleToolDesc: 'Enlarge images up to 4x',
  cutoutTool: 'Remove BG',
  cutoutToolDesc: 'Cut out the subject',

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

  // 顶部导航的图标链接（文档站与 GitHub 仓库）
  docsLink: 'Docs',
  docsLinkAria: 'Read the documentation',
  githubLinkAria: 'View source on GitHub',

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
  upscaleBackendWebgpuShort: 'WEBGPU',
  upscaleBackendWasmShort: 'WASM',

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

  // ── AI 抠图 ──────────────────────────────────────────────
  // 拖拽区
  cutoutDropTitle: 'Drop an image here, or click to choose',
  cutoutDropSubtitle: 'PNG / JPEG / WebP / AVIF · the image never leaves this device',
  cutoutFirstRunHint:
    'The first run downloads the AI model (about 94 MB for most devices), then it is cached on this device and never fetched again.',

  // 工作区
  cutoutOriginal: 'Original',
  cutoutResult: 'Cutout',
  cutoutCompareHint: 'Drag to compare before and after',
  cutoutTabCompare: 'Compare',
  cutoutTabResult: 'Result',
  cutoutTabOriginal: 'Original',
  cutoutBefore: 'Before',
  cutoutAfter: 'After',
  cutoutKeepHint: 'Hold to peek',
  cutoutKeepKey: 'Space',
  cutoutNextImage: 'Next image',
  cutoutNextKey: 'Esc',
  cutoutNoNext: 'Only one image loaded',
  cutoutRun: 'Remove background',
  cutoutRerun: 'Run again',
  cutoutRunning: 'Working…',
  cutoutDownload: 'Download PNG',
  cutoutReplace: 'Choose another image',
  cutoutCoverage: (percent: number) => `${percent}% kept`,

  // 控制项
  cutoutSectionModel: 'Model',
  cutoutSectionQuality: 'Edge quality',
  cutoutQualityFast: 'Crisp',
  cutoutQualityQuality: 'Soft',
  cutoutQualityHint: 'Crisp narrows the edge transition; Soft keeps the original anti-aliasing.',
  cutoutSectionBackdrop: 'Background',
  cutoutBackdropHint: 'Switching the backdrop re-composes instantly — no re-run needed.',
  cutoutBackdropLocked: 'Available once the cutout finishes.',
  cutoutBackdrops: {
    transparent: 'Transparent',
    white: 'White',
    red: 'Red',
    blue: 'Blue',
  },
  cutoutNoWebgpu:
    'WebGPU is unavailable, so this runs on CPU: expect roughly 94 MB and 192 MB of model downloads, and slower processing. Chrome or Edge on a desktop GPU is much faster.',

  // 进度
  cutoutPhaseIdle: 'Idle',
  cutoutPhaseFetchingModel: 'Downloading the model',
  cutoutPhaseWarmingUp: 'Warming up',
  cutoutPhaseInference: 'Finding the subject',
  cutoutPhaseCompositing: 'Compositing',
  cutoutPhaseDone: 'Done',
  cutoutPhaseError: 'Failed',
  cutoutDownloadOnce: 'Only the first run downloads — this file is cached afterwards.',

  // 结果附注
  cutoutNoteMaskUpscaled: (maskEdge: number, outputEdge: number) =>
    `Mask computed at ${maskEdge}px, scaled to ${outputEdge}px`,

  // 错误
  cutoutErrorDecode: 'Could not read that image — please try another one',
  cutoutErrorUnsupported: 'Choose a PNG, JPG, or WebP image',
  cutoutErrorTooLarge: 'That image is over 40 MB — please choose a smaller file',
  cutoutErrorModelDownload: (status: string) => `Model download failed (${status})`,
  cutoutErrorInvalidMask: 'The model returned an unusable mask — try another image',
  cutoutErrorSessionInit: (detail: string) =>
    `Could not start the inference engine${detail ? `: ${detail}` : ''}`,
  cutoutErrorEmpty: 'No subject found — try an image with a clearer foreground',
  cutoutErrorTensor: (name: string) =>
    `This model did not return a usable result (outputs: ${name}). The tensor name most likely does not match — try another model.`,

  // 模型说明：按 model.id 取用，避免把文案写进模型注册表
  cutoutModels: {
    'birefnet-lite-512': {
      note: 'The default. Handles hair, fur and other fine detail well — good enough for almost any photo.',
      tags: ['Default'],
    },
    'birefnet-512': {
      note: 'Only used when your device has no WebGPU. Results are essentially the same, but the file is far larger and much slower.',
      tags: ['Fallback'],
    },
  } as Record<string, { note: string; tags: string[] }>,
};

export type Translation = typeof en;
