import type { Translation } from './en';

// 中文文案
export const zhCN: Translation = {
  // 品牌与标语
  brand: '图片工具',
  brandSubtitle: '压缩 · 放大 · 抠图 · 裁剪 —— 全部本地完成，不上传',
  tagline:
    '免费在线图片压缩、格式转换、AI 放大、AI 抠图与裁剪旋转 —— 压缩成 AVIF、WebP、JPEG、JPEG XL、PNG，把照片放大到 4 倍，一键抠出主体（发丝级边缘），点一下圈出想保留的东西，或者裁剪、拉正、切成九宫格。全部在浏览器本地完成，无需上传、保护隐私，支持批量压缩。',

  // 工具切换（顶部标签栏）
  toolNavAria: '选择工具',
  compressTool: '图片压缩',
  compressToolDesc: '压缩与格式转换',
  upscaleTool: 'AI 放大',
  upscaleToolDesc: '最高放大 4 倍',
  cutoutTool: 'AI 抠图',
  cutoutToolDesc: '一键去除背景',
  segmentTool: '点选抠图',
  segmentToolDesc: '指哪抠哪',

  // 压缩选项
  outputFormat: '输出格式',
  qualityLabel: (q: number) => `质量：${q}%`,

  // 拖拽区（压缩）
  dropTitle: '将图片拖拽到此处，或点击上传',
  dropSubtitle: '支持 JPEG、PNG、WebP、AVIF 和 JXL，可一次选多张',

  // 列表状态
  statusPending: '等待处理',
  statusProcessing: '处理中...',
  statusComplete: '已完成',
  statusError: '图片处理出错',

  // 列表操作
  download: '下载',
  remove: '移除',
  smaller: (pct: number) => `缩小 ${pct}%`,

  // 批量
  clearAll: '全部清除',
  downloadAll: '下载全部',
  downloadAllCount: (count: number) => `下载全部（${count} 张图片）`,

  // 语言切换（显示目标语言名称）
  switchTo: 'English',
  switchToAria: '切换到英文',

  // 页脚（外链）
  footerBefore: '© 2026 · 免费在线图片处理｜由 ',
  footerLink: '无辣',
  footerAfter: ' 提供',

  // 博客入口卡片（按当前语言指向 /blog/ 或 /en/blog/）
  blogCardTitle: '图片处理指南',
  blogCardDesc:
    '关于图片压缩、格式转换与放大的实用技巧 —— AVIF、WebP、JPEG、PNG、JPEG XL 与 AI 超分辨率。',
  blogCardCta: '阅读博客',

  // 顶部导航的图标链接（文档站与 GitHub 仓库）
  docsLink: '文档',
  docsLinkAria: '查看使用文档',
  githubLinkAria: '在 GitHub 上查看源码',

  // ── AI 放大 ──────────────────────────────────────────────
  // 拖拽区
  upscaleDropTitle: '把图片拖进来，或点击选择',
  upscaleDropSubtitle: 'PNG / JPEG / WebP / AVIF · 图片不会离开这台设备',
  upscaleFirstRunHint:
    '首次使用需下载约 11 MB（推理引擎 + 模型权重），之后会缓存在本机，不再重复下载。',

  // 控制栏
  upscaleSectionModel: '模型',
  upscaleSectionScale: '放大倍率',
  upscaleSectionOverlap: '瓦片重叠',
  upscaleOverlapHint: '加大可减轻瓦片之间的拼接缝，代价是计算量上升。',
  upscaleNoWebgpu:
    '这台设备没有可用的 WebGPU，推理会回退到 WASM，速度可能慢数十倍。换最新版 Chrome / Edge 打开可以明显提速。',

  // 操作
  upscaleRun: '开始放大',
  upscaleRunning: '处理中…',
  upscaleRerun: '再放大一次',
  upscaleDownload: '下载 PNG',
  upscaleReplace: '换一张图',

  // 对比视图与结果
  upscaleBefore: '原图',
  upscaleAfter: '放大后',
  upscaleCompareHint: '按住拖动，对比放大前后的细节',
  upscaleCancel: '取消',
  upscaleNoteTiles: (total: number, edge: number, overlap: number) =>
    `${total} 块 · 单块 ${edge}px · 重叠 ${overlap}px`,
  upscaleNoteResample: (native: number, target: number) =>
    `${native}x 模型输出直接缩放至 ${target}x`,
  upscaleNoteWasmFallback: 'WebGPU 不可用，已降级到 WASM，速度会明显变慢',

  // 进度阶段
  upscalePhaseIdle: '准备中',
  upscalePhaseFetchingModel: '下载模型权重',
  upscalePhaseWarmingUp: '初始化推理引擎',
  upscalePhaseDecoding: '解码图片',
  upscalePhaseInference: '推理中',
  upscalePhaseEncoding: '编码输出',
  upscalePhaseDone: '完成',
  upscalePhaseError: '出错',
  upscaleProgressTiles: (done: number, total: number) => `${done} / ${total} 块`,

  // 后端能力徽章
  upscaleBackendProbing: '检测设备…',
  upscaleBackendWebgpu: (adapter: string | null) =>
    adapter ? `WebGPU · ${adapter}` : 'WebGPU',
  upscaleBackendWasmThreads: 'WASM（多线程）',
  upscaleBackendWasmSingle: 'WASM（单线程）',
  upscaleBackendWebgpuShort: 'WEBGPU',
  upscaleBackendWasmShort: 'WASM',

  // 错误（按 code 映射，未知错误回落到原始 message）
  upscaleErrorDecode: '无法读取这张图片，请换一张试试',
  upscaleErrorCapacity: (outputMp: number, limitMp: number) =>
    `图片太大：按这个倍率输出会到 ${outputMp} 兆像素，超过本机的 ${limitMp} 兆像素上限。降低放大倍率，或先把图片裁小一点。`,
  upscaleErrorModelDownload: (status: string) => `模型下载失败（${status}）`,
  upscaleErrorRuntimeManifest: '未找到推理运行时清单，请先执行构建命令',
  upscaleErrorRuntimeManifestInvalid: '推理运行时清单缺少必要资源',
  upscaleErrorRuntimeAsset: (status: string) => `推理运行时资源加载失败（${status}）`,
  upscaleErrorCanvas: '无法创建 2D 绘图上下文',
  upscaleErrorTensor: (name: string) => `模型未返回张量 ${name}`,
  upscaleErrorSessionInit: (detail: string) =>
    `推理引擎初始化失败${detail ? `：${detail}` : ''}`,

  // 模型说明：按 model.id 取用，避免把文案写进模型注册表
  upscaleModels: {
    'realesr-general-x4v3': {
      note: '通用照片模型，体积最小、出图最快',
      tags: ['通用', '轻量'],
    },
  } as Record<string, { note: string; tags: string[] }>,

  // ── AI 抠图 ──────────────────────────────────────────────
  // 拖拽区
  cutoutDropTitle: '将图片拖拽到此处，或点击选择',
  cutoutDropSubtitle: '支持 PNG / JPEG / WebP / AVIF · 图片不会离开本机',
  cutoutFirstRunHint:
    '首次使用需要下载 AI 模型（默认档约 24 MB，高清档约 94 MB），之后会缓存到本机，不再重复下载。',

  // 工作区
  cutoutOriginal: '原图',
  cutoutResult: '抠图结果',
  cutoutCompareHint: '按住拖动，对比抠图前后的效果',
  cutoutTabCompare: '比较',
  cutoutTabResult: '结果',
  cutoutTabOriginal: '原版',
  cutoutBefore: '之前',
  cutoutAfter: '之后',
  cutoutRun: '一键抠图',
  cutoutRerun: '重新抠图',
  cutoutRunning: '处理中…',
  cutoutDownload: '下载 PNG',
  cutoutReplace: '换一张图',
  cutoutCoverage: (percent: number) => `保留 ${percent}%`,
  cutoutKeepHint: '按住偷看',
  cutoutKeepKey: '空格',
  cutoutNextImage: '下一张图片',
  cutoutNextKey: 'Esc',
  cutoutNoNext: '当前只有一张',

  // 控制项
  cutoutSectionModel: '模型',
  cutoutSectionQuality: '边缘处理',
  cutoutQualityFast: '锐利',
  cutoutQualityQuality: '柔和',
  /** 挂在这一组按钮的 title 上，不再占一行正文 —— 侧栏要塞进一屏，见 CutoutControls。 */
  cutoutQualityHint: '「锐利」收窄边缘过渡，「柔和」保留羽化感',
  cutoutSectionBackdrop: '背景',
  cutoutBackdropHint: '换底色是即时重合成，不用重跑模型。',
  cutoutBackdropLocked: '抠图完成后可用。',
  cutoutBackdrops: {
    transparent: '透明',
    white: '白色',
    red: '红色',
    blue: '蓝色',
  },
  cutoutNoWebgpu:
    '当前设备没有 WebGPU，只能用 CPU 跑：处理会慢不少，选高清档时模型也要下载约 184 MB（而不是 94 MB）。桌面端的 Chrome 或 Edge 会快很多。',
  cutoutSuggestHd:
    '保留下来的主体很少，这张图可能不是人像。换 BiRefNet Lite 再试一次效果会好很多。',

  // 进度
  cutoutPhaseIdle: '准备中',
  cutoutPhaseFetchingModel: '下载模型权重',
  cutoutPhaseWarmingUp: '初始化推理引擎',
  cutoutPhaseInference: '识别主体',
  cutoutPhaseCompositing: '合成中',
  cutoutPhaseDone: '完成',
  cutoutPhaseError: '出错',
  cutoutDownloadOnce: '只有首次需要下载，之后这个文件会走本地缓存。',

  // 结果附注
  cutoutNoteMaskUpscaled: (
    maskWidth: number,
    maskHeight: number,
    imageWidth: number,
    imageHeight: number,
  ) => `遮罩以 ${maskWidth}×${maskHeight} 计算，放大回 ${imageWidth}×${imageHeight}`,
  cutoutNoteCpuByDesign: '这一档在 GPU 上精度不够，已固定改用 CPU 推理以保证准确',

  // 错误
  cutoutErrorDecode: '无法读取这张图片，请换一张试试',
  cutoutErrorUnsupported: '请选择 PNG、JPG 或 WebP 格式的图片',
  cutoutErrorTooLarge: '图片超过 40 MB，请换一张小一点的',
  cutoutErrorModelDownload: (status: string) => `模型下载失败（${status}）`,
  /**
   * 官方源 + 镜像全试过还是没下来。此时能查的只有用户自己的网络/代理。
   * 不带 cutout 前缀：放大与抠图共用 ORT 的下载层，两边都会用到这句。
   */
  errorModelFetch: '模型权重下载失败：官方源和国内镜像都没连上。请检查网络或代理后重试。',
  cutoutErrorInvalidMask: '模型返回了不可用的遮罩，请换一张图片试试',
  cutoutErrorSessionInit: (detail: string) =>
    `推理引擎初始化失败${detail ? `：${detail}` : ''}`,
  cutoutErrorEmpty: '没有找到明显的主体，请换一张前景更清晰的图片',
  cutoutErrorTensor: (name: string) =>
    `这个模型没有返回可用结果（输出：${name}）。多半是模型名字没对上，换个模型再试一次。`,

  // 模型说明：按 model.id 取用，避免把文案写进注册表。
  // 一律**一句话**，且控制在 280px 内不出第二行（卡片内宽 = 340 侧栏 - 内边距）：
  // 三张卡片摞在侧栏里，多出来的每一行都会把「一键抠图」挤出首屏。细节留给
  // 文档站，这里只回答「这档是什么、什么时候换」。
  cutoutModels: {
    'modnet-portrait': {
      note: '体积最小，仅适合人像；其余主体换高清档。',
    },
    'birefnet-lite-512': {
      note: '高清档，人像、物体都能抠，细节更稳。',
    },
    'birefnet-512': {
      note: '兼容备用，设备不支持 WebGPU 时才用。',
    },
  } as Record<string, { note: string }>,

  // ── 裁剪旋转 ──────────────────────────────────────────────
  editTool: '裁剪旋转',
  editToolDesc: '裁剪与切片',

  editDropTitle: '将图片拖拽到此处，或点击选择',
  editDropSubtitle: '支持 PNG / JPEG / WebP / AVIF · 纯本机运算，不需要下载模型',
  editFirstRunHint: '这个工具完全在本机运算：无需下载模型，图片也不会离开这台设备。',

  editOriginal: '原图',
  editPreview: '预览',
  editReplace: '换一张图',
  editDownload: '下载图片',
  editOutputSize: (width: number, height: number) => `输出 ${width} × ${height} px`,

  editSectionCrop: '裁剪',
  editCropReset: '重置裁剪',

  editSectionRotate: '旋转',
  editRotateValue: (deg: number) => `${deg}°`,
  editRotateStraighten: '自动拉正',
  editRotateStraightening: '分析中…',
  editStraightenDone: (deg: number) => `已校正 ${deg}°，还可以继续微调`,
  editStraightenFlat: '这张图本来就是正的',
  editStraightenFailed: '没找到可用于对齐的直线，请手动调整',

  editSectionFlip: '翻转',
  editFlipHorizontal: '水平翻转',
  editFlipVertical: '垂直翻转',
  editResetAll: '重置全部调整',

  editSectionSlice: '切片',
  editSliceCols: '列数',
  editSliceRows: '行数',
  editSliceGap: '间距',
  editSlicePreview: '切片预览',
  editSlicePreviewPiece: (width: number, height: number) => `每块 ${width}×${height}`,
  editSliceCount: (count: number) => `共 ${count} 张`,
  editSliceDownload: '下载切片（ZIP）',
  editSlicePacking: '打包中…',

  editCropRatios: {
    free: '自由',
    '1:1': '1:1',
    '4:3': '4:3',
    '3:4': '3:4',
    '16:9': '16:9',
    '9:16': '9:16',
  } as Record<string, string>,

  // ── 点选抠图（SAM） ──────────────────────────────────────
  segmentDropTitle: '将图片拖拽到此处，或点击选择',
  segmentDropSubtitle: '支持 PNG / JPEG / WebP / AVIF · 图片不会离开这台设备',
  segmentFirstRunHint:
    '首次使用需要下载 45 MB 模型（编码器 27 MB + 解码器 16 MB），之后缓存在本机，不再重复下载。',

  // 选点
  segmentPickTitle: '点一下你想保留的主体',
  segmentPickHint: '按住 Alt 点击（或右键）标记「不要」的部分。每点一次都会立刻重新算一遍。',
  segmentSectionPrompt: '提示点',
  segmentPromptKeep: '保留',
  segmentPromptDrop: '排除',
  segmentPromptNone: '还没有提示点 —— 在图片上点一下就能开始。',
  segmentPromptCount: (keep: number, drop: number) =>
    drop > 0 ? `${keep} 个保留 · ${drop} 个排除` : `${keep} 个保留`,
  segmentUndo: '撤销上一点',
  segmentClearPoints: '清空提示点',
  segmentModeKeep: '保留',
  segmentModeDrop: '排除',
  segmentModeHint: '下一次点击会落成哪一类点。',

  // 结果
  segmentStagePick: '选点',
  segmentStageResult: '结果',
  segmentResultPlaceholder: '抠图结果会出现在这里',
  segmentResultPlaceholderHint:
    '在左边点一下想保留的主体，结果立刻显示；Alt 或 Shift 点击可以排除点错的地方。',
  segmentReplace: '换一张图',
  segmentDownload: '下载 PNG',
  segmentScore: (percent: number) => `置信度 ${percent}%`,
  segmentCoverage: (percent: number) => `主体占画面 ${percent}%`,
  segmentEncodingCached: '图像编码已缓存 —— 后面每次点击只跑很快的解码器。',
  segmentEncoderHint:
    '想抠商品、宠物或 Logo 的精确轮廓？多点几下比换模型管用得多。',
  segmentNoWebgpu:
    '这台设备没有可用的 WebGPU，推理会回退到 WASM：编码一张 1024×1024 的图可能要好几秒，之后的每次点击仍然是快的。',

  // 进度
  segmentPhaseIdle: '准备中',
  segmentPhaseFetchingEncoder: '下载编码器 · 27 MB',
  segmentPhaseFetchingDecoder: '下载解码器 · 16 MB',
  segmentPhaseWarmingUp: '初始化推理引擎',
  segmentPhaseEncoding: '编码整张图 · 每张图只慢这一次',
  segmentPhaseDecoding: '计算主体轮廓',
  segmentPhaseCompositing: '合成中',
  segmentPhaseDone: '完成',
  segmentPhaseError: '出错',
  segmentDownloadOnce: '只有第一次需要下载，之后这个文件会走本地缓存。',

  // 错误
  segmentErrorDecode: '无法读取这张图片，请换一张试试',
  segmentErrorUnsupported: '请选择 PNG、JPG 或 WebP 格式的图片',
  segmentErrorTooLarge: '图片超过 40 MB，请换一张小一点的',
  segmentErrorModelDownload: (status: string) => `模型下载失败（${status}）`,
  segmentErrorSessionInit: (detail: string) =>
    `推理引擎初始化失败${detail ? `：${detail}` : ''}`,
  segmentErrorTensor: (name: string) =>
    `这个模型没有返回可用结果（输出：${name}）。多半是权重和预期的计算图对不上。`,
  segmentErrorInvalidMask: '模型返回了不可用的遮罩，请换一张图片试试',
  segmentErrorEmptyMask: '什么都没选中。请直接点在主体上，别点在空背景里。',

  segmentNotes: {
    mobilesam: {
      note: 'Segment Anything（MobileSAM）。点一下圈出主体，继续点可以逐步修准，Alt 点击划掉不要的部分。不挑主体类型，人和物都能抠。',
      tags: ['交互式', '45 MB'],
    },
  } as Record<string, { note: string; tags: string[] }>,
};
