import type { Translation } from './en';

// 中文文案
export const zhCN: Translation = {
  // 品牌与标语
  brand: '图片工具',
  tagline: '免费在线图片压缩与格式转换工具 —— 支持 AVIF、WebP、JPEG、JPEG XL、PNG，浏览器本地处理，无需上传、保护隐私，支持批量压缩。',

  // 压缩选项
  outputFormat: '输出格式',
  qualityLabel: (q: number) => `质量：${q}%`,

  // 拖拽区
  dropTitle: '将图片拖拽到此处，或点击上传',
  dropSubtitle: '支持 JPEG、PNG、WebP、AVIF 和 JXL 格式',

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
  downloadAllCount: (count: number) =>
    `下载全部（${count} 张图片）`,

  // 语言切换（显示目标语言名称）
  switchTo: 'English',
  switchToAria: '切换到英文',
};
