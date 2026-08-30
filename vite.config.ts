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
  // 让 / 命中 index.html（中文，默认语言），/en/ 命中 en/index.html，
  // /zh-CN/ 命中 zh-CN/index.html（旧路径兼容），
  // 三份独立 HTML 拥有各自的 SEO meta。
  appType: 'mpa',
  plugins: [
    react(),
    {
      // 开发期把 /en、/zh-CN（无尾斜杠）规范重定向到带尾斜杠的形式，
      // 保证 dev 下的 URL 与生产一致。
      name: 'locale-trailing-slash-redirect',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          for (const prefix of ['/en', '/zh-CN']) {
            if (
              url === prefix ||
              url.startsWith(`${prefix}?`) ||
              url.startsWith(`${prefix}#`)
            ) {
              const tail = url.slice(prefix.length);
              res.writeHead(301, { Location: `${prefix}/${tail}` });
              res.end();
              return;
            }
          }
          // dev 模式下 Vite 默认不处理目录请求的 index.html，
          // 这里把各语言目录内部改写为对应 index.html。
          // 生产部署由静态 host 的目录 index 规则处理。
          const dirIndexRewrite: Record<string, string> = {
            '/blog/': '/blog/index.html',
            '/en/': '/en/index.html',
            '/en/blog/': '/en/blog/index.html',
            '/zh-CN/': '/zh-CN/index.html',
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
      // 三个 HTML 入口（中文根路径 / 英文 /en/ 旧中文 /zh-CN/）；
      // Vite 会复用同一份 chunk，浏览器只需下载一次。
      input: {
        main: resolve(projectRoot, 'index.html'),
        'en/index': resolve(projectRoot, 'en/index.html'),
        'zh-CN/index': resolve(projectRoot, 'zh-CN/index.html'),
      },
      output: sharedOutput,
    },
  },
  worker: {
    format: 'es',
  },
});
