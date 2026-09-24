import type { Translation } from './en';

// 中文文案
export const zhCN: Translation = {
  // 品牌与标语
  brand: '图片工具',
  tagline:
    '免费在线图片压缩、格式转换、AI 放大与 AI 抠图 —— 压缩成 AVIF、WebP、JPEG、JPEG XL、PNG，或把照片放大到 4 倍，或一键抠出主体（发丝级边缘）。全部在浏览器本地完成，无需上传、保护隐私，支持批量压缩。',

  // 工具切换（顶部标签栏）
  toolNavAria: '选择工具',
  compressTool: '图片压缩',
  compressToolDesc: '压缩与格式转换',
  upscaleTool: 'AI 放大',
  upscaleToolDesc: '最高放大 4 倍',
  cutoutTool: 'AI 抠图',
  cutoutToolDesc: '一键去除背景',

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
    '首次使用需要下载 AI 模型（多数设备约 94 MB），之后会缓存到本机，不再重复下载。',

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
  cutoutQualityHint: '「锐利」会收窄边缘过渡，「柔和」保留原本的羽化感。',
  cutoutSectionBackdrop: '背景',
  cutoutBackdropHint: '换底色是即时重合成的，不需要重新跑一遍模型。',
  cutoutBackdropLocked: '抠图完成后可用。',
  cutoutBackdrops: {
    transparent: '透明',
    white: '白色',
    red: '红色',
    blue: '蓝色',
  },
  cutoutNoWebgpu:
    '当前设备没有 WebGPU，只能用 CPU 跑：模型要下载约 192 MB（而不是 94 MB），处理也会慢不少。桌面端的 Chrome 或 Edge 会快很多。',

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
  cutoutNoteMaskUpscaled: (maskEdge: number, outputEdge: number) =>
    `遮罩按 ${maskEdge}px 计算，放大到 ${outputEdge}px`,

  // 错误
  cutoutErrorDecode: '无法读取这张图片，请换一张试试',
  cutoutErrorUnsupported: '请选择 PNG、JPG 或 WebP 格式的图片',
  cutoutErrorTooLarge: '图片超过 40 MB，请换一张小一点的',
  cutoutErrorModelDownload: (status: string) => `模型下载失败（${status}）`,
  cutoutErrorInvalidMask: '模型返回了不可用的遮罩，请换一张图片试试',
  cutoutErrorSessionInit: (detail: string) =>
    `推理引擎初始化失败${detail ? `：${detail}` : ''}`,
  cutoutErrorEmpty: '没有找到明显的主体，请换一张前景更清晰的图片',
  cutoutErrorTensor: (name: string) =>
    `这个模型没有返回可用结果（输出：${name}）。多半是模型名字没对上，换个模型再试一次。`,

  // 模型说明：按 model.id 取用，避免把文案写进模型注册表
  cutoutModels: {
    'birefnet-lite-512': {
      note: '默认就用这个。发丝、毛绒这类细节也能抠得比较干净，绝大多数图片都够用。',
      tags: ['默认推荐'],
    },
    'birefnet-512': {
      note: '只有设备不支持 WebGPU 时才会用到。效果和上面那个基本一样，但文件大得多、速度慢不少。',
      tags: ['兼容备用'],
    },
  } as Record<string, { note: string; tags: string[] }>,
};
