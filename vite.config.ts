import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const ortDist = fileURLToPath(new URL('./node_modules/onnxruntime-web/dist', import.meta.url));

// 通用资源前缀：所有页面共用同一份 JS/WASM bundle，
// 避免中文、英文、放大页各打一份造成体积浪费。
const sharedOutput = {
  format: 'es' as const,
};

// 跨域隔离解锁多线程 WASM 推理（SharedArrayBuffer）。生产环境靠 public/_headers 声明，
// 这里让 dev 与本地 preview 也具备同样的条件 —— 否则会出现「本地单线程、线上多线程」的错觉。
//
// 注意：COEP 用 require-corp 意味着页面上每个子资源都必须是同源或自带 CORP 头。
// 本站只加载自己的资源，所以没问题；将来若引入第三方字体 / CDN 脚本，需要重新评估。
const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/**
 * ONNX Runtime 会在运行时按 URL 解析自己的 wasm 运行时。开发服务器下这些请求
 * 会带上 `?import` 查询串，Vite 便把它们当成待转换的模块处理 —— 而这些文件位于
 * `public/`，不在模块图里，于是报错。这里把查询串剥掉，让它们按原样返回。
 */
function serveOrtBinariesRaw(): Plugin {
  return {
    name: 'serve-ort-binaries-raw',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (request.url?.startsWith('/ort/')) {
          request.url = request.url.split('?')[0] ?? request.url;
        }
        next();
      });
    },
  };
}

/**
 * 多页应用的路由规整（仅开发期需要，生产由静态 host 的目录 index 规则处理）：
 *   1. /en、/zh-CN 无尾斜杠时 301 到带尾斜杠的形式，保证 dev 与生产 URL 一致；
 *   2. 目录请求内部改写为对应 index.html。
 */
function localeRouting(): Plugin {
  const DIR_INDEX: Record<string, string> = {
    '/en/': '/en/index.html',
    '/zh-CN/': '/zh-CN/index.html',
    '/upscale/': '/upscale/index.html',
    '/en/upscale/': '/en/upscale/index.html',
    '/zh-CN/upscale/': '/zh-CN/upscale/index.html',
    '/blog/': '/blog/index.html',
    '/en/blog/': '/en/blog/index.html',
    '/zh-CN/blog/': '/zh-CN/blog/index.html',
  };

  return {
    name: 'locale-trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        for (const prefix of ['/en', '/zh-CN']) {
          if (url === prefix || url.startsWith(`${prefix}?`) || url.startsWith(`${prefix}#`)) {
            const tail = url.slice(prefix.length);
            res.writeHead(301, { Location: `${prefix}/${tail}` });
            res.end();
            return;
          }
        }
        if (DIR_INDEX[url]) {
          req.url = DIR_INDEX[url];
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: '/',
  // 多页应用模式：禁用 SPA history fallback，
  // 让 / 命中中文首页、/en/ 命中英文版、/upscale/ 等独立工具页各自拥有 SEO meta。
  appType: 'mpa',
  plugins: [react(), tailwindcss(), localeRouting(), serveOrtBinariesRaw()],
  resolve: {
    alias: [
      // 把 ONNX Runtime 钉在「外部 wasm」构建上。默认入口会自己托管 wasm 二进制，
      // 与我们放在 /ort/ 下的副本互相打架。这两条在包的 exports 映射之前生效。
      {
        find: /^onnxruntime-web\/webgpu$/,
        replacement: path.join(ortDist, 'ort.webgpu.min.mjs'),
      },
      { find: /^onnxruntime-web$/, replacement: path.join(ortDist, 'ort.min.mjs') },
    ],
  },
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
    target: 'es2022',
    chunkSizeWarningLimit: 2048,
    rollupOptions: {
      // 六个 HTML 入口，共用同一份 chunk，浏览器只需下载一次。
      input: {
        main: path.resolve(projectRoot, 'index.html'),
        'en/index': path.resolve(projectRoot, 'en/index.html'),
        'zh-CN/index': path.resolve(projectRoot, 'zh-CN/index.html'),
        'upscale/index': path.resolve(projectRoot, 'upscale/index.html'),
        'en/upscale/index': path.resolve(projectRoot, 'en/upscale/index.html'),
        'zh-CN/upscale/index': path.resolve(projectRoot, 'zh-CN/upscale/index.html'),
      },
      output: sharedOutput,
    },
  },
  server: { headers: crossOriginIsolation },
  preview: { headers: crossOriginIsolation },
  worker: {
    format: 'es',
  },
});
