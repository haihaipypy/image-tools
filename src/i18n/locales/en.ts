// 英文文案。Translation 类型以本文件为准，zh-CN.ts 必须完整对齐。
export const en = {
  // 品牌与标语
  brand: 'Image Tools',
  brandSubtitle: 'Compress · upscale · cut out · crop — all on-device',
  tagline:
    'Free online image compression, format conversion, AI upscaling, background removal and cropping — compress to AVIF, WebP, JPEG, JPEG XL, or PNG, enlarge a photo up to 4x, cut out the subject with hair-level precision, click to pick exactly what to keep, or crop, straighten and slice a grid. Everything runs in your browser: nothing is uploaded, and batch compression is included.',

  // 工具切换（顶部标签栏）
  toolNavAria: 'Choose a tool',
  compressTool: 'Compress',
  compressToolDesc: 'Shrink and convert images',
  upscaleTool: 'AI upscale',
  upscaleToolDesc: 'Enlarge images up to 4x',
  cutoutTool: 'Remove BG',
  cutoutToolDesc: 'Cut out the subject',
  segmentTool: 'Click to Cut',
  segmentToolDesc: 'Point at what to keep',

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
    'The first run downloads the AI model (about 24 MB for the default tier, 94 MB for HD), then it is cached on this device and never fetched again.',

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
  /** Lives on the button group's title, not as its own paragraph — see CutoutControls. */
  cutoutQualityHint: 'Crisp narrows the edge transition; Soft keeps the anti-aliasing',
  cutoutSectionBackdrop: 'Background',
  cutoutBackdropHint: 'Switching the backdrop re-composes instantly — no re-run.',
  cutoutBackdropLocked: 'Available once the cutout finishes.',
  cutoutBackdrops: {
    transparent: 'Transparent',
    white: 'White',
    red: 'Red',
    blue: 'Blue',
  },
  cutoutNoWebgpu:
    'WebGPU is unavailable, so this runs on CPU: expect slower processing and a larger download for the HD model (about 184 MB instead of 94 MB). Chrome or Edge on a desktop GPU is much faster.',
  cutoutSuggestHd:
    'Very little of the subject was kept. This may not be a portrait — BiRefNet Lite will do better.',

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
  cutoutNoteMaskUpscaled: (
    maskWidth: number,
    maskHeight: number,
    imageWidth: number,
    imageHeight: number,
  ) => `Mask computed at ${maskWidth}×${maskHeight}, scaled back to ${imageWidth}×${imageHeight}`,
  cutoutNoteCpuByDesign: 'This model loses too much precision on the GPU, so it always runs on CPU instead',

  // 错误
  cutoutErrorDecode: 'Could not read that image — please try another one',
  cutoutErrorUnsupported: 'Choose a PNG, JPG, or WebP image',
  cutoutErrorTooLarge: 'That image is over 40 MB — please choose a smaller file',
  cutoutErrorModelDownload: (status: string) => `Model download failed (${status})`,
  /**
   * 官方源 + 镜像全试过还是没下来。此时能查的只有用户自己的网络/代理。
   * 不带 cutout 前缀：放大与抠图共用 ORT 的下载层，两边都会用到这句。
   */
  errorModelFetch:
    'Could not download the model weights — neither the official host nor the mirror responded. Check your network or proxy and try again.',
  cutoutErrorInvalidMask: 'The model returned an unusable mask — try another image',
  cutoutErrorSessionInit: (detail: string) =>
    `Could not start the inference engine${detail ? `: ${detail}` : ''}`,
  cutoutErrorEmpty: 'No subject found — try an image with a clearer foreground',
  cutoutErrorTensor: (name: string) =>
    `This model did not return a usable result (outputs: ${name}). The tensor name most likely does not match — try another model.`,

  // 模型说明：按 model.id 取用，避免把文案写进注册表。
  // 一律**一句话**，且控制在卡片内宽（约 280px）不出第二行：三张卡片摞在侧栏里，
  // 多出来的每一行都会把「一键抠图」挤出首屏。细节留给文档站。
  cutoutModels: {
    'modnet-portrait': {
      note: 'Smallest, portraits only. HD for objects.',
    },
    'birefnet-lite-512': {
      note: 'HD tier. Steady on people and objects.',
    },
    'birefnet-512': {
      note: 'Fallback for devices without WebGPU.',
    },
  } as Record<string, { note: string }>,

  // ── Crop & rotate ────────────────────────────────────────
  editTool: 'Crop & Rotate',
  editToolDesc: 'Crop, rotate, slice',

  editDropTitle: 'Drop an image here, or click to choose',
  editDropSubtitle: 'PNG / JPEG / WebP / AVIF · pure local processing, no model to download',
  editFirstRunHint: 'This tool runs entirely on your device — nothing to download, and the image is never uploaded.',

  editOriginal: 'Original',
  editPreview: 'Preview',
  editReplace: 'Choose another image',
  editDownload: 'Download image',
  editOutputSize: (width: number, height: number) => `Output ${width} × ${height} px`,

  editSectionCrop: 'Crop',
  editCropReset: 'Reset crop',

  editSectionRotate: 'Rotate',
  editRotateValue: (deg: number) => `${deg}°`,
  editRotateStraighten: 'Auto-straighten',
  editRotateStraightening: 'Analysing…',
  editStraightenDone: (deg: number) => `Corrected by ${deg}° — fine-tune as you like`,
  editStraightenFlat: 'This image already looks level',
  editStraightenFailed: 'No straight lines to align to — please adjust by hand',

  editSectionFlip: 'Flip',
  editFlipHorizontal: 'Flip horizontally',
  editFlipVertical: 'Flip vertically',
  editResetAll: 'Reset all adjustments',

  editSectionSlice: 'Slice',
  editSliceCols: 'Columns',
  editSliceRows: 'Rows',
  editSliceGap: 'Gap',
  editSlicePreview: 'Slice preview',
  editSlicePreviewPiece: (width: number, height: number) => `${width}×${height} each`,
  editSliceCount: (count: number) => `${count} tiles`,
  editSliceDownload: 'Download slices (ZIP)',
  editSlicePacking: 'Packing…',

  editCropRatios: {
    free: 'Free',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
    '16:9': '16:9',
    '9:16': '9:16',
  } as Record<string, string>,

  // ── Click to Cut (SAM) ───────────────────────────────────
  segmentDropTitle: 'Drop an image here, or click to choose',
  segmentDropSubtitle: 'PNG / JPEG / WebP / AVIF · the image never leaves this device',
  segmentFirstRunHint:
    'First use downloads a 45 MB model (27 MB encoder + 16 MB decoder). It is cached on your device and never downloaded again.',

  // Picking
  segmentPickTitle: 'Click the object you want to keep',
  segmentPickHint: 'Alt-click or right-click marks anything to exclude. Every click re-runs the mask instantly.',
  segmentSectionPrompt: 'Points',
  segmentPromptKeep: 'Keep',
  segmentPromptDrop: 'Exclude',
  segmentPromptNone: 'No points yet — click the image to start.',
  segmentPromptCount: (keep: number, drop: number) =>
    drop > 0 ? `${keep} keep · ${drop} exclude` : `${keep} keep`,
  segmentUndo: 'Undo last point',
  segmentClearPoints: 'Clear all points',
  segmentModeKeep: 'Keep',
  segmentModeDrop: 'Exclude',
  segmentModeHint: 'Pick which kind of point the next click drops.',

  // Result
  segmentStagePick: 'Pick',
  segmentStageResult: 'Result',
  segmentResultPlaceholder: 'The cutout shows up here',
  segmentResultPlaceholderHint:
    'Click the subject you want to keep on the left and the result appears instantly. Alt- or Shift-click excludes a spot you missed.',
  segmentReplace: 'Choose another image',
  segmentDownload: 'Download PNG',
  segmentScore: (percent: number) => `Confidence ${percent}%`,
  segmentCoverage: (percent: number) => `Subject covers ${percent}%`,
  segmentEncodingCached: 'Encoding is cached — further clicks only re-run the fast decoder.',
  segmentEncoderHint:
    'Need the exact outline of a product, a pet, or a logo? Drop a few extra points instead of switching models.',
  segmentNoWebgpu:
    'This device has no WebGPU, so inference falls back to WASM. Encoding a 1024×1024 image may take several seconds — the clicks after that stay quick.',

  // Progress
  segmentPhaseIdle: 'Getting ready',
  segmentPhaseFetchingEncoder: 'Downloading encoder · 27 MB',
  segmentPhaseFetchingDecoder: 'Downloading decoder · 16 MB',
  segmentPhaseWarmingUp: 'Starting inference engine',
  segmentPhaseEncoding: 'Encoding image · slow, once per image',
  segmentPhaseDecoding: 'Tracing the outline',
  segmentPhaseCompositing: 'Compositing',
  segmentPhaseDone: 'Done',
  segmentPhaseError: 'Failed',
  segmentDownloadOnce: 'Only the first run downloads anything. After that it is served from the local cache.',

  // Errors
  segmentErrorDecode: 'Could not read that image — please try another one',
  segmentErrorUnsupported: 'Please choose a PNG, JPG or WebP image',
  segmentErrorTooLarge: 'That image is over 40 MB — please pick a smaller one',
  segmentErrorModelDownload: (status: string) => `Model download failed (${status})`,
  segmentErrorSessionInit: (detail: string) =>
    `Could not start the inference engine${detail ? `: ${detail}` : ''}`,
  segmentErrorTensor: (name: string) =>
    `The model returned nothing usable (output: ${name}). This usually means the weights did not match the expected graph.`,
  segmentErrorInvalidMask: 'The model returned an unusable mask — please try another image',
  segmentErrorEmptyMask:
    'Nothing was selected. Click directly on the object you want, and avoid empty background.',

  segmentNotes: {
    mobilesam: {
      note: 'Segment Anything (MobileSAM). One click picks an object; extra points refine it, and Alt-click removes parts you do not want. Works for any subject — not just people.',
      tags: ['Interactive', '45 MB'],
    },
  } as Record<string, { note: string; tags: string[] }>,
};

export type Translation = typeof en;
