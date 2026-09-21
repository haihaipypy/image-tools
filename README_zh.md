# 图片工具 · Image Tools

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | **简体中文**

浏览器端的图片工具箱：**压缩 / 格式转换**（WebAssembly 编解码）＋ **AI 超分辨率放大**（ONNX Runtime）。
所有处理都在访问者自己的设备上完成 —— 图片不上传、不出本机，产物是一堆静态文件，**不需要任何后端**。

线上地址：<https://img.1day.vip/>

![压缩界面](./public/screenshot-zh.png)

![放大界面](./public/screenshot-upscale-zh.png)

## ✨ 功能

两个工具共用同一套页面外壳，顶栏胶囊标签切换，切换是瞬时的（同一份 bundle，不整页跳转）；
同时各自保留独立 URL，可以分别收藏、分别投放。

### 一、图片压缩 / 格式转换 —— `/`

| 项 | 说明 |
| --- | --- |
| 输出格式 | AVIF、JPEG（MozJPEG）、JPEG XL、PNG（OxiPNG）、WebP |
| 处理方式 | 浏览器本地 WASM 编解码，无上传、无服务端 |
| 批量 | 多选 / 拖拽 / 拖入文件夹，逐张排队处理 |
| 质量 | 每种格式各记一个默认值，切换格式自动回填，滑块拖动即时生效 |
| 结果 | 实时预览、体积缩减百分比、单张下载、「下载全部」批量打包 |

默认质量：

| 格式 | 默认质量 |
| --- | --- |
| AVIF | 50 |
| JPEG | 75 |
| JPEG XL | 75 |
| WebP | 75 |
| PNG | 无损 |

### 二、AI 图片放大 —— `/upscale/`

| 项 | 说明 |
| --- | --- |
| 模型 | Real-ESRGAN General x4v3（ONNX 单文件，4.76 MB 随仓库提交） |
| 倍率 | 4×（瓦片推理后按目标倍率缩放落盘） |
| 后端 | **WebGPU 优先**，不可用时自动降级 WASM（多线程 → 单线程） |
| 交互 | 上传 → 选择模型 → 原图/结果对比滑块 → 下载 |
| 说明 | 输入固定 128×128 瓦片 + overlap 消缝，超大图按上限拒绝 |

## 🛠️ 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8（MPA 多入口：6 个 HTML） |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite` 插件，CSS-first） |
| 压缩 | [jSquash](https://github.com/jamsinclair/jSquash) 系列 WASM 编解码器 |
| 放大 | [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.30（WebGPU / WASM） |
| 图标 | lucide-react |
| 部署 | Cloudflare Pages（纯静态） |

## 🚀 本地开发

```bash
git clone https://github.com/haihaipypy/image-tools.git
cd image-tools
npm install
npm run dev
```

`npm run dev` 会先跑一次 `prepare:ort` 准备 ONNX Runtime 资源，再起 Vite。
**没有任何后端要启动。**

环境要求：Node.js `^20.19.0 || >=22.12.0`（Vite 8 的引擎约束），npm 7+。

## 🏗️ 构建

```bash
npm run build      # = prepare:ort → typecheck → vite build
npm run preview    # 本地预览 dist/（已带 COOP/COEP 响应头）
```

`dist/` 的产物结构：

```
dist/
├── index.html            中文首页（默认激活「图片压缩」）
├── upscale/index.html    中文放大页
├── blog/                 中文博客（手写 HTML）
├── en/  zh-CN/           英文 / 旧中文路径，结构同上
├── assets/               JS / CSS 打包产物
├── ort/                  ONNX Runtime 运行时（构建时生成，gzip 存放）
├── models/               ONNX 权重
├── _headers              Cloudflare 响应头（跨域隔离 + 缓存）
├── robots.txt  sitemap.xml  site.webmanifest
```

### npm scripts

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 准备 ORT 资源 + 起开发服务器 |
| `npm run build` | 准备 ORT 资源 + 类型检查 + 构建 |
| `npm run typecheck` | 只跑 `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run preview` | 预览 `dist/` |
| `npm run prepare:ort` | 单独生成 `public/ort/`（每次构建前都会自动执行） |
| `npm run deploy` | 构建 + `wrangler pages deploy` |

## 🌐 路由与多语言

默认语言是中文，英文放在 `/en/` 前缀下；`/zh-CN/` 是历史路径，保留可访问，canonical 指回根路径。

| 页面 | 中文 | 英文 | 旧中文路径 |
| --- | --- | --- | --- |
| 压缩 | `/` | `/en/` | `/zh-CN/` |
| 放大 | `/upscale/` | `/en/upscale/` | `/zh-CN/upscale/` |
| 博客 | `/blog/` | `/en/blog/` | `/zh-CN/blog/` |

标签切换用 `history.replaceState` 同步路径，浏览器前进/后退、直接输入 URL 都能正确落到对应标签。

## ☁️ 部署

### 方式一：Cloudflare Pages 连接 Git 仓库（推荐）

推送到指定分支即自动构建上线，本地不用装 wrangler。

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权并选择仓库 `haihaipypy/image-tools`
3. 构建配置：

   | 设置项 | 值 |
   | --- | --- |
   | Framework preset | None（或 Vite） |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | 留空 |

4. **加一个环境变量 `NODE_VERSION = 22`** —— Vite 8 要求 Node `^20.19.0 || >=22.12.0`，
   构建镜像的默认版本不一定满足。
5. **Deploy**，等日志跑完。

`wrangler.toml`（`pages_build_output_dir = "./dist"`）已就位，控制台配置与它保持一致即可。

### 方式二：本地 wrangler

```bash
npm run deploy     # = npm run build && wrangler pages deploy dist --project-name=image-tools
```

首次需要先 `npx wrangler login`（或在 CI 里配 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`）。

### 方式三：任何静态托管

没有服务端代码，`dist/` 整个丢上去即可 —— EdgeOne Pages、Netlify、GitHub Pages、nginx 都行。
但要注意两点：

- **`public/_headers` 是 Cloudflare 的格式**，别的平台要换成它自己的写法（Netlify 用同名 `_headers`、
  nginx 用 `add_header`、EdgeOne 用响应头规则）。**跨域隔离那两个头必须真正生效**，否则见下一条。
- **模型和 ORT 运行时都在 `dist/` 里**（`models/`、`ort/`），别漏传。

### 部署必须知道的三件事

1. **跨域隔离是性能开关，不是可选项。**
   `public/_headers` 里的 `Cross-Origin-Opener-Policy: same-origin` +
   `Cross-Origin-Embedder-Policy: require-corp` 才能打开 `SharedArrayBuffer`，
   多线程 WASM 推理才可用。缺了这两个头依然能跑，但无 WebGPU 的机器会掉到单线程 WASM，慢好几倍。
2. **`require-corp` 会拦掉一切第三方资源。**
   页面只加载自己的资源所以没问题；以后要加 CDN 脚本、外链字体、统计代码，必须给它们配 CORP 头，
   或者重新评估这个策略。
3. **ORT 的 wasm 运行时是 25.5 MB，超过 Cloudflare 单文件 25 MiB 上限。**
   所以 `scripts/prepare-ort.mjs` 在构建时把它转存为 gzip（约 6.3 MB），浏览器端起一个
   `DecompressionStream` 解回 Blob URL 再喂给 ORT —— 顺带把首次加载量砍掉了四分之三。
   同理，**模型权重必须随仓库提交**：构建环境里既没有 Python 也没有上游模型源，不可能构建时下载。

### 换自定义域名要改哪些地方

`canonical` / `hreflang` / `og:url` / `og:image` / JSON-LD / sitemap / robots 里用的都是**绝对 URL**，
换域名时是一次全量替换，涉及：

- `index.html`、`en/index.html`、`zh-CN/index.html`
- `upscale/index.html`、`en/upscale/index.html`、`zh-CN/upscale/index.html`
- `public/blog/**/*.html`、`public/en/blog/**/*.html`、`public/zh-CN/blog/**/*.html`
- `public/sitemap.xml`、`public/robots.txt`
- `src/i18n/index.ts` 里的 `SITE_ORIGIN` 常量

## 🧩 换成别的放大模型

在 `src/lib/models.ts` 里加一条，再把 `.onnx` 丢进 `public/models/`：

```ts
{
  id: 'my-model',
  label: '显示名称',
  url: '/models/my-model.onnx',
  scale: 4,
  approxBytes: 0,
  inputRange: 'unit',        // 'unit' = 0–1，'byte' = 0–255
  inputName: 'image',        // ONNX 图里的输入张量名
  outputName: 'upscaled_image',
  fixedInputSize: 128,       // 固定输入边长；动态尺寸填 null
  license: 'BSD-3-Clause',
}
```

单文件别超过 25 MiB，否则 Cloudflare 会拒绝部署。模型说明文案放在 i18n 里（`upscaleModels`），
不用改算法代码。

## ⚠️ 已知限制

- **本机推理有硬上限：64 M 输出像素。** 按所选倍率折算，4× 约能处理 2000×2000 的源图，
  2× 约 4000×4000。超限直接报错，没有云端兜底 —— 这是免费和隐私换来的代价。
- **没有 WebGPU 的机器体验有限**：会降级到 WASM，多线程也远慢于 GPU。Safari 的 WebGPU 支持较新，
  老版本只能落到单线程。
- **放大的模型对失焦、严重模糊的图基本无能为力**：超分是重建细节，不是修模糊。
- **压缩侧无此限制**，纯编解码，批量处理不受影响。

## 📜 许可证与版权

| 对象 | 许可 | 版权归属 |
| --- | --- | --- |
| 本项目代码 | MIT | © 2026 无辣（[haihaipypy](https://github.com/haihaipypy)） |
| 上游基础项目 | MIT | © 2024 Addy Osmani —— 压缩/格式转换部分源自其 image-tools，原始版权声明保留在 [LICENSE](./LICENSE) |
| Real-ESRGAN 模型权重 | BSD-3-Clause | © 2021 Xintao Wang（[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)）、ONNX 导出由 [Qualcomm AI Hub](https://huggingface.co/qualcomm/Real-ESRGAN-General-x4v3) 提供 |
| jSquash 及封装的编解码器 | MIT | © James Sinclair，编解码器为 MozJPEG / libavif / libjxl / OxiPNG |
| ONNX Runtime Web | MIT | © Microsoft |
| Lucide 图标 | ISC | Lucide Contributors |

**关于 Upscayl。** 放大功能的产品形态参考了 [Upscayl](https://github.com/upscayl/upscayl)，
但**代码是重写的，没有复制它的源码**，推理层也完全不同（ONNX Runtime 跑在浏览器里，
而非 Electron + ncnn 原生二进制）。因此本项目不受 Upscayl 的 AGPL-3.0 传染，按 MIT 发布。

完整许可文本见 [LICENSE](./LICENSE)。

## 🙏 致谢

- [jSquash](https://github.com/jamsinclair/jSquash) —— WASM 图片编解码器
- [MozJPEG](https://github.com/mozilla/mozjpeg) / [libavif](https://github.com/AOMediaCodec/libavif) / [libjxl](https://github.com/libjxl/libjxl) / [OxiPNG](https://github.com/shssoichiro/oxipng)
- [ONNX Runtime](https://github.com/microsoft/onnxruntime) —— 浏览器端 WebGPU/WASM 推理
- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) —— 超分模型
- [Upscayl](https://github.com/upscayl/upscayl) —— 交互形态的灵感来源
- [Addy Osmani](https://github.com/addyosmani) —— 上游 image-tools

## 🤝 参与贡献

欢迎提 PR。涉及较大改动时，建议先开 issue 对齐方向。

1. Fork 本仓库
2. 建分支：`git checkout -b feature/AmazingFeature`
3. 提交：`git commit -m 'Add some AmazingFeature'`
4. 推送：`git push origin feature/AmazingFeature`
5. 开 Pull Request
