# 图片工具 · Image Tools

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

[English](./README.md) | **简体中文**

浏览器端的图片工具箱：**压缩 / 格式转换**（WebAssembly 编解码）＋ **AI 超分辨率放大** ＋ **AI 抠图去背景**
＋ **点选抠图**（后三者跑 ONNX Runtime）＋ **裁剪旋转 / 九宫格切片**（纯 Canvas）。
所有处理都在访问者自己的设备上完成 —— 图片不上传、不出本机，产物是一堆静态文件，**不需要任何后端**。

线上地址：<https://img.1day.vip/>
文档：<https://img.1day.vip/docs/>

![图片压缩界面](./public/screenshot-zh.png)

![AI 放大界面](./public/screenshot-upscale-zh.jpg)

![AI 抠图界面](./public/screenshot-cutout-zh.jpg)

![点选抠图界面](./public/screenshot-segment-zh.jpg)

![裁剪旋转与切片预览](./public/screenshot-edit-zh.jpg)

## 功能

五个工具共用同一套页面外壳，顶栏胶囊标签切换，切换是瞬时的（同一份 bundle，不整页跳转）；
同时各自保留独立 URL，可以分别收藏、分别投放。

### 一、图片压缩 / 格式转换 —— `/`

| 项 | 说明 |
| --- | --- |
| 输出格式 | AVIF、JPEG（MozJPEG）、JPEG XL、PNG（OxiPNG）、WebP |
| 处理方式 | 浏览器本地 WASM 编解码，无上传、无服务端 |
| 批量 | 多选 / 拖拽 / 拖入文件夹，逐张排队处理 |
| 质量 | 每种格式各记一个默认值，切换格式自动回填，滑块拖动即时生效 |
| 结果 | 实时预览、体积缩减百分比、单张下载、「下载全部」批量打包 |

默认质量：AVIF 50、JPEG 75、JPEG XL 75、WebP 75、PNG 无损。

### 二、AI 图片放大 —— `/upscale/`

| 项 | 说明 |
| --- | --- |
| 模型 | Real-ESRGAN General x4v3（ONNX 单文件，4.76 MB 随仓库提交） |
| 倍率 | 4×（瓦片推理后按目标倍率缩放落盘） |
| 后端 | **WebGPU 优先**，不可用时自动降级 WASM（多线程 → 单线程） |
| 交互 | 上传 → 选择模型 → 原图/结果对比滑块 → 下载 |

### 三、AI 抠图 / 去背景 —— `/cutout/`

| 项 | 说明 |
| --- | --- |
| 模型 | 两档：**MODNet**（人像档，默认）与 **BiRefNet Lite**（高清档） |
| 体积 | MODNet fp32 **24.7 MB**（该档固定走 CPU，故只用 fp32）；BiRefNet Lite fp16 93.9 MB / fp32 183 MB |
| 输入 | MODNet：短边 512 且长宽对齐到 32 的倍数（网络结构要求）；BiRefNet：固定 512×512 |
| 权重 | **不随仓库提交**，从 HuggingFace Hub 按固定 revision 拉取并缓存到 Cache Storage |
| 下载源 | huggingface.co 配国内镜像兜底：镜像优先、官方托底，每个源 10 秒没响应就换下一个，成功的源记在本机下次先用 |
| 后端 | BiRefNet / MobileSAM **WebGPU 优先**，不可用时降级 WASM；MODNet 因 WebGPU 精度问题**固定走 CPU**（见 `webgpuSafe`） |
| 边缘 | 两档：「锐利」收窄过渡带，「柔和」保留原始羽化 |
| 底色 | 透明 / 白 / 红 / 蓝 —— 换底色只重合成，不重跑推理 |
| 交互 | 上传 → 选择模型与边缘 → 抠图 → 对比滑块 → 换底色 → 下载 PNG |

两档的分工是按适用场景划的：MODNet 为人像训练，体积只有高清档的 1/8，人像与常见物体都够用；
抠商品、Logo 这类复杂主体时切到 BiRefNet Lite。**许可全部可商用**：MODNet / BiRefNet 分别是
Apache-2.0 与 MIT（RMBG 系列权重仅限非商业，已排除）。

抠图与放大共用同一份 ONNX Runtime（`public/ort/`），**没有引入第二个推理引擎**。

### 四、点选抠图 —— `/segment/`

自动抠图是「模型决定主体是谁」，点选抠图反过来 —— **你告诉模型主体在哪**。

| 项 | 说明 |
| --- | --- |
| 模型 | **MobileSAM**（Segment Anything 的轻量版），编码器 26.9 MiB + 解码器 15.7 MiB |
| 输入 | 等比放入 1024×1024（补边填黑），提示点坐标以该正方形为参考系 |
| 提示点 | 正点「保留」+ 负点「排除」，`Alt` / `Shift` 点击或右键即排除 |
| 交互 | 左侧点选、右侧结果**同屏并排**，点一下立刻出结果，不用切标签页 |
| 关键设计 | **编码一次、点击多次** —— 编码结果只与图片有关，换点不换图时直接复用，后续每次点击只跑解码器 |
| 输出 | 透明 PNG（原图分辨率），附置信度与主体占比 |
| 权重 | 从 HuggingFace 按固定 commit 拉取，缓存到独立桶 `segment-models-v1` |

「编码一次」不是顺手做的优化，而是这个功能成不成立的前提：MobileSAM 编码一张 1024² 的图在
CPU 上要好几秒，而解码只要几百毫秒 —— 没有这层缓存，用户每点一下都要从头再等一遍。

实现上参考了 [sam-web](https://github.com/karlorz/sam-web)（MIT）的模型配置与预处理规格，
但**没有直接依赖它**：它把 ONNX Runtime 的 wasm 路径写死到 jsDelivr CDN，且自带一份独立的
ORT 实例，与本项目自托管 `public/ort/` 的方案冲突。这里复用本站已有的 ORT 运行时，
按同样的张量规格（HWC 排布、0-255 输入、`orig_im_size` 回传）自己接了一遍。

### 五、裁剪旋转 / 九宫格切片 —— `/edit/`

| 项 | 说明 |
| --- | --- |
| 旋转 | 任意角度（滑块 + ±1° / ±90° 微调） |
| 拉正 | **拍歪自动矫正**：Sobel 梯度方向直方图估算主导倾斜角，带置信度判断 |
| 翻转 | 水平 / 垂直镜像 |
| 裁剪 | 自由框选，或锁定 1:1 / 4:3 / 3:4 / 16:9 / 9:16 |
| 切片 | 按行列切分（列/行/间距可调），打包成 **ZIP** 一次下载 |
| 切片预览 | 侧栏实时画出当前行列间距的分块网格，拖动裁剪框时同步更新 |
| 依赖 | **零模型、零网络请求**，纯 Canvas + 手写 ZIP（store 模式，无第三方依赖） |

旋转后会自动把裁剪框收成「画面里最大的内接矩形」，四个角永远是实的 —— 这是任意角度旋转
最容易出问题的地方（不裁就必然是四个空白三角）。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8（MPA 多入口：9 个 HTML） |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite` 插件，CSS-first） |
| 压缩 | [jSquash](https://github.com/jamsinclair/jSquash) 系列 WASM 编解码器 |
| 推理 | [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.30（WebGPU / WASM） |
| 图标 | lucide-react |
| 部署 | Cloudflare Pages（纯静态） |

## 本地开发

```bash
git clone https://github.com/haihaipypy/image-tools.git
cd image-tools
npm install
npm run dev
```

`npm run dev` 会先跑一次 `prepare:ort` 准备 ONNX Runtime 资源，再起 Vite。**没有任何后端要启动。**

环境要求：Node.js `^20.19.0 || >=22.12.0`（Vite 8 的引擎约束），npm 7+。

常用命令：

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 准备 ORT 资源 + 起开发服务器（带 COOP/COEP 头） |
| `npm run build` | 准备 ORT 资源 + 类型检查 + 构建 |
| `npm run preview` | 预览 `dist/` |
| `npm run typecheck` / `npm run lint` | 类型检查 / ESLint |
| `npm run deploy` | 构建 + `wrangler pages deploy` |

## 部署

### 方式一：Cloudflare Pages 连接 Git 仓库（推荐）

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

`wrangler.toml`（`pages_build_output_dir = "./dist"`）已就位。

### 方式二：本地 wrangler

```bash
npm run deploy     # = npm run build && wrangler pages deploy dist --project-name=image-tools
```

首次需要先 `npx wrangler login`（或在 CI 里配 `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`）。

### 方式三：任何静态托管

没有服务端代码，`dist/` 整个丢上去即可 —— EdgeOne Pages、Netlify、nginx 都行。
但有两条硬性要求：

- **必须能设置自定义响应头。** `public/_headers` 是 Cloudflare 的格式，别的平台要换成它自己的写法
  （Netlify 用同名 `_headers`、nginx 用 `add_header`、EdgeOne 用响应头规则）。
  **`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
  必须真正生效**，否则无 WebGPU 的机器会掉到单线程 WASM，慢好几倍。
  **GitHub Pages 做不到，不要用它。**
- **`dist/ort/` 与 `dist/models/` 别漏传。** 抠图与点选抠图的权重都不在 `dist/` 里 —— 它们从
  HuggingFace 现拉现缓存，部署时不需要额外准备。

完整的部署细节、换域名清单、代码结构说明见 **<https://img.1day.vip/docs/deployment.html>**。

## 文档

技术细节都搬到了独立的文档站，README 只保留概览：

| 页面 | 内容 |
| --- | --- |
| [介绍](https://img.1day.vip/docs/) | 项目定位与整体结构 |
| [使用方法](https://img.1day.vip/docs/usage.html) | 五个工具怎么用、注意事项、常见问题 |
| [浏览器端推理](https://img.1day.vip/docs/how-it-works.html) | 后端选择、跨域隔离、首次加载体积 |
| [模型说明](https://img.1day.vip/docs/models.html) | 模型来源、授权、参数与选择规则 |
| [部署流程](https://img.1day.vip/docs/deployment.html) | 构建产出、各平台部署、硬约束、换域名 |
| [自定义与扩展](https://img.1day.vip/docs/customize.html) | 换模型、加语言、加工具的代码路径 |
| [许可与版权](https://img.1day.vip/docs/license.html) | 项目、模型权重、依赖库的完整授权清单 |

英文版在 `/en/docs/` 下。

## 许可证与版权

本项目按 **MIT** 发布。完整文本见 [LICENSE](./LICENSE)。

| 对象 | 许可 | 版权归属 |
| --- | --- | --- |
| 本项目代码 | MIT | © 2026 无辣（[haihaipypy](https://github.com/haihaipypy)） |
| 上游基础项目 | MIT | © 2024 Addy Osmani —— 压缩/格式转换部分源自其 image-tools，原始版权声明保留在 [LICENSE](./LICENSE) |
| Real-ESRGAN 模型权重 | BSD-3-Clause | © 2021 Xintao Wang（[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)），ONNX 导出由 [Qualcomm AI Hub](https://huggingface.co/qualcomm/Real-ESRGAN-General-x4v3) 提供 |
| BiRefNet 模型权重 | MIT | © 2024 Peng Zheng（[BiRefNet](https://github.com/ZhengPeng7/BiRefNet)），ONNX 导出由 [studioludens](https://huggingface.co/studioludens/birefnet-lite-512) 与 [naddy24](https://huggingface.co/naddy24/birefnet-512-webgpu) 提供 |
| ONNX Runtime Web | MIT | © Microsoft |
| jSquash 及封装的编解码器 | MIT | © James Sinclair；编解码器为 MozJPEG / libavif / libjxl / OxiPNG |
| Lucide 图标 | ISC | Lucide Contributors |
| React / Vite / Tailwind CSS | MIT | 各自所属基金会与作者 |

**关于 Upscayl。** 放大功能的交互形态参考了 [Upscayl](https://github.com/upscayl/upscayl)，
但**代码是重写的，没有复制它的源码**，推理层也完全不同（ONNX Runtime 跑在浏览器里，
而非 Electron + ncnn 原生二进制）。因此本项目不受 Upscayl 的 AGPL-3.0 传染。

**关于 bg0。** 抠图功能的交互与 API 设计参考了 [bg0](https://github.com/opencoredev/bg0)
（Apache-2.0），但**推理层是独立实现的**：依赖树里没有 `@huggingface/transformers`，
也没有 `@bg0/browser`。

完整的授权清单（含模型权重与全部依赖库）见
**<https://img.1day.vip/docs/license.html>**。

## 致谢

[jSquash](https://github.com/jamsinclair/jSquash) ·
[ONNX Runtime](https://github.com/microsoft/onnxruntime) ·
[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) ·
[BiRefNet](https://github.com/ZhengPeng7/BiRefNet) ·
[bg0](https://github.com/opencoredev/bg0) ·
[Upscayl](https://github.com/upscayl/upscayl) ·
[Addy Osmani](https://github.com/addyosmani)

## 参与贡献

欢迎提 PR。涉及较大改动时，建议先开 issue 对齐方向。
