// 英文文案
export const en = {
  // 品牌与标语
  brand: 'Image Tools',
  tagline: 'Free online image compression and format conversion — compress and convert images to AVIF, WebP, JPEG, JPEG XL, and PNG, 100% in your browser, private, no upload, with batch processing.',

  // 压缩选项
  outputFormat: 'Output Format',
  qualityLabel: (q: number) => `Quality: ${q}%`,

  // 拖拽区
  dropTitle: 'Drop images here or click to upload',
  dropSubtitle: 'Supports JPEG, PNG, WebP, AVIF, and JXL',

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
  blogCardTitle: 'Image Compression Guides',
  blogCardDesc: 'Practical tips on compressing and converting images — AVIF, WebP, JPEG, PNG, and JPEG XL.',
  blogCardCta: 'Read the blog',
};

export type Translation = typeof en;
