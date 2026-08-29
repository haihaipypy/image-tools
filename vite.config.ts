import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

// 通用资源前缀：所有产物共用同一份 JS/WASM bundle，
// 避免英文版与中文版各打一份造成体积浪费。
const sharedOutput = {
  format: 'es' as const,
};

export default defineConfig({
  // 多页应用模式：禁用 SPA history fallback，
  // 让 /zh-CN/ 直接命中 zh-CN/index.html，/  命中 index.html，
  // 两份独立 HTML 拥有各自的 SEO meta。
  appType: 'mpa',
  plugins: [
    react(),
    {
      // 开发期把 /zh-CN（无尾斜杠）规范重定向到 /zh-CN/，
      // 保证 dev 下中文版 URL 与生产一致。
      name: 'zh-cn-trailing-slash-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (url === '/zh-CN' || url.startsWith('/zh-CN?') || url.startsWith('/zh-CN#')) {
            const tail = url.slice('/zh-CN'.length);
            res.writeHead(301, { Location: `/zh-CN/${tail}` });
            res.end();
            return;
          }
          // dev 模式下 Vite 默认不处理目录请求的 index.html，
          // 这里把 /blog/ 与 /zh-CN/blog/ 内部改写为对应 index.html。
          // 生产部署由静态 host 的目录 index 规则处理。
          const dirIndexRewrite: Record<string, string> = {
            '/blog/': '/blog/index.html',
            '/zh-CN/blog/': '/zh-CN/blog/index.html',
          };
          if (dirIndexRewrite[url]) {
            req.url = dirIndexRewrite[url];
          }
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: [
      '@jsquash/avif',
      '@jsquash/jpeg',
      '@jsquash/jxl',
      '@jsquash/png',
      '@jsquash/webp',
    ],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // 两个 HTML 入口；Vite 会复用同一份 chunk，浏览器只需下载一次。
      input: {
        main: resolve(projectRoot, 'index.html'),
        'zh-CN/index': resolve(projectRoot, 'zh-CN/index.html'),
      },
      output: sharedOutput,
    },
  },
  worker: {
    format: 'es',
  },
});
