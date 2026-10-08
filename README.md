# Image Tools · 图片工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**English** | [简体中文](./README_zh.md)

A browser-side image toolbox: **compression / format conversion** (WebAssembly codecs), plus
**AI super-resolution upscaling**, **AI background removal** and **click to cut** (all three on
ONNX Runtime) and **crop / rotate / grid slicing** (plain Canvas). Everything runs on the
visitor's own device — images are never uploaded, never leave the machine — and the output is a
pile of static files, so **no backend is required**.

Live: <https://img.1day.vip/>
Docs: <https://img.1day.vip/en/docs/>

![Compression UI](./public/screenshot-zh.png)

![AI upscaling UI](./public/screenshot-upscale-zh.jpg)

![AI cutout UI](./public/screenshot-cutout-zh.jpg)

![Click-to-cut UI](./public/screenshot-segment-zh.jpg)

![Crop & rotate UI](./public/screenshot-edit-zh.jpg)

## Features

All five tools share one page shell with a segmented tab switcher in the header (instant, same
bundle — no full page reload), and each keeps its own URL so they can be bookmarked and linked
separately.

### 1. Compression / format conversion — `/`

| | |
| --- | --- |
| Output formats | AVIF, JPEG (MozJPEG), JPEG XL, PNG (OxiPNG), WebP |
| Processing | WASM codecs in the browser — no upload, no server |
| Batch | Multi-select, drag & drop, folders; files are queued and processed one by one |
| Quality | Per-format remembered defaults, slider applies immediately |
| Results | Live preview, size-reduction percentage, per-file download and "Download all" |

Default quality: AVIF 50, JPEG 75, JPEG XL 75, WebP 75, PNG lossless.

### 2. AI upscaling — `/upscale/`

| | |
| --- | --- |
| Model | Real-ESRGAN General x4v3 (single-file ONNX, 4.76 MB, committed to the repo) |
| Scale | 4× (tiled inference, resampled to the selected factor) |
| Backend | **WebGPU preferred**, automatic fallback to WASM (multi-threaded → single-threaded) |
| Flow | Upload → pick model → before/after comparison slider → download |

### 3. AI background removal — `/cutout/`

| | |
| --- | --- |
| Models | Two tiers: **MODNet** (portrait, default) and **BiRefNet Lite** (HD) |
| Size | MODNet **24.7 MB** fp32 (this tier always runs on CPU, so fp32 is what ships); BiRefNet Lite fp16 93.9 MB / fp32 183 MB |
| Input | MODNet: short edge 512, both sides rounded up to a multiple of 32 (the network requires it); BiRefNet: fixed 512×512 |
| Weights | **Not committed** — fetched from the HuggingFace Hub at a pinned revision and cached in Cache Storage |
| Sources | huggingface.co with a mirror behind it: mirror first, official host as backup, 10 s per source before moving on, and the host that worked is remembered for next time |
| Backend | BiRefNet and MobileSAM prefer **WebGPU** with a WASM fallback; MODNet is **CPU-only** because it computes the wrong answer on WebGPU (see `webgpuSafe`) |
| Edges | Two modes: "sharp" narrows the transition band, "soft" keeps the original feathering |
| Backdrop | Transparent / white / red / blue — switching only recomposites, no re-inference |
| Flow | Upload → choose model and edge mode → run → comparison slider → pick a backdrop → download PNG |

The two tiers split by use case: MODNet is trained on people and is one eighth the download of the
HD tier, which is enough for portraits and everyday objects; switch to BiRefNet Lite for products,
logos and other intricate subjects. **All weights are commercially usable** — Apache-2.0 and MIT
for MODNet and BiRefNet respectively (the RMBG family is non-commercial only and is excluded).

Cutout and upscaling share a single ONNX Runtime instance (`public/ort/`) —
**no second inference engine is bundled**.

### 4. Click to Cut — `/segment/`

Automatic cutout asks the model to decide who the subject is. Click to Cut inverts that —
**you tell the model where the subject is**.

| | |
| --- | --- |
| Model | **MobileSAM** (the lightweight Segment Anything), 26.9 MiB encoder + 15.7 MiB decoder |
| Input | Letterboxed into 1024×1024 (padded black); prompt coordinates use that square as their frame of reference |
| Prompts | Positive ("keep") and negative ("exclude") points — `Alt` / `Shift` click or right-click excludes |
| Layout | Picking and the result sit **side by side** — one click and the cutout appears, no tab switching |
| Key design | **Encode once, click many times** — the encoding depends only on the image, so further points reuse it and only re-run the decoder |
| Output | Transparent PNG at the original resolution, with an IoU confidence score and subject coverage |
| Weights | Fetched from HuggingFace at a pinned commit, cached in its own bucket (`segment-models-v1`) |

"Encode once" is a precondition, not an optimisation: encoding a 1024² image with MobileSAM takes
seconds on CPU while decoding takes a few hundred milliseconds, so without that cache every click
would send you back to the start.

The implementation follows [sam-web](https://github.com/karlorz/sam-web) (MIT) for the model
configuration and preprocessing spec, but does **not** depend on it: sam-web hardcodes the ONNX
Runtime wasm path to the jsDelivr CDN and ships its own separate ORT instance, which conflicts with
this project's self-hosted `public/ort/`. Here the existing ORT runtime is reused, wired up against
the same tensor spec (HWC layout, 0-255 input range, `orig_im_size` reported back).

### 5. Crop / rotate / grid slicing — `/edit/`

| | |
| --- | --- |
| Rotate | Any angle (slider plus ±1° / ±90° nudges) |
| Straighten | **Automatic skew correction** — a Sobel gradient-orientation histogram estimates the dominant tilt, with a confidence gate |
| Flip | Horizontal / vertical mirror |
| Crop | Free-form, or locked to 1:1, 4:3, 3:4, 16:9, 9:16 |
| Slicing | Split into rows × columns (gap adjustable) and download as a **ZIP** in one go |
| Slice preview | A live grid of the current rows/columns/gap in the sidebar, redrawn as you drag the crop box |
| Dependencies | **No model, no network requests** — plain Canvas plus a hand-rolled store-mode ZIP writer |

Rotating automatically tightens the crop box to the largest rectangle that still fits inside the
turned image, so the corners never go empty. That is the part free-angle rotation usually gets
wrong: skip it and you are guaranteed four blank triangles.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 (MPA, 9 HTML entries) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`, CSS-first) |
| Compression | [jSquash](https://github.com/jamsinclair/jSquash) WASM codecs |
| Inference | [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.30 (WebGPU / WASM) |
| Icons | lucide-react |
| Hosting | Cloudflare Pages (fully static) |

## Local development

```bash
git clone https://github.com/haihaipypy/image-tools.git
cd image-tools
npm install
npm run dev
```

`npm run dev` runs `prepare:ort` once to stage the ONNX Runtime assets, then starts Vite.
**There is no backend to start.**

Requirements: Node.js `^20.19.0 || >=22.12.0` (Vite 8's engine constraint), npm 7+.

| Script | What it does |
| --- | --- |
| `npm run dev` | Stage ORT assets + start the dev server (with COOP/COEP headers) |
| `npm run build` | Stage ORT assets + type-check + build |
| `npm run preview` | Preview `dist/` |
| `npm run typecheck` / `npm run lint` | Types / ESLint |
| `npm run deploy` | Build + `wrangler pages deploy` |

## Deploying

### Option 1: Cloudflare Pages connected to Git (recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize and pick the `haihaipypy/image-tools` repo
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None (or Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | leave empty |

4. **Add an environment variable `NODE_VERSION = 22`** — Vite 8 needs Node `^20.19.0 || >=22.12.0`,
   and the build image's default may not satisfy that.
5. Hit **Deploy** and wait for the logs.

`wrangler.toml` (`pages_build_output_dir = "./dist"`) is already in place.

### Option 2: wrangler locally

```bash
npm run deploy     # = npm run build && wrangler pages deploy dist --project-name=image-tools
```

Run `npx wrangler login` first (or set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in CI).

### Option 3: Any static host

There is no server-side code — just upload `dist/` to EdgeOne Pages, Netlify, nginx, and so on.
Two hard requirements:

- **You must be able to set custom response headers.** `public/_headers` is a Cloudflare format;
  other platforms need their own equivalent (Netlify uses a same-named `_headers`, nginx uses
  `add_header`, EdgeOne uses response-header rules). **`Cross-Origin-Opener-Policy: same-origin` +
  `Cross-Origin-Embedder-Policy: require-corp` must actually take effect**, otherwise machines
  without WebGPU drop to single-threaded WASM and run several times slower.
  **GitHub Pages cannot do this — don't use it.**
- **Don't forget to upload `dist/ort/` and `dist/models/`.** The cutout weights are not in `dist/` —
  they are fetched from HuggingFace at runtime and cached, so there is nothing to prepare.

Full deployment details, the domain-change checklist and the code layout live at
**<https://img.1day.vip/en/docs/deployment.html>**.

## Documentation

Technical detail now lives in a dedicated docs site; the README only keeps the overview:

| Page | Contents |
| --- | --- |
| [Introduction](https://img.1day.vip/en/docs/) | What the project is and how it is structured |
| [Usage](https://img.1day.vip/en/docs/usage.html) | How to use each tool, caveats, FAQ |
| [In-browser inference](https://img.1day.vip/en/docs/how-it-works.html) | Backend selection, cross-origin isolation, first-load sizes |
| [Models](https://img.1day.vip/en/docs/models.html) | Model sources, licenses, parameters and selection rules |
| [Deploying](https://img.1day.vip/en/docs/deployment.html) | Build output, per-platform deployment, hard constraints, changing the domain |
| [Customizing](https://img.1day.vip/en/docs/customize.html) | Swapping models, adding languages, adding tools |
| [License](https://img.1day.vip/en/docs/license.html) | Full license inventory for the project, model weights and dependencies |

Chinese docs are under `/docs/`.

## License and copyright

This project is released under **MIT**. See [LICENSE](./LICENSE) for the full text.

| Scope | License | Copyright |
| --- | --- | --- |
| Site code | MIT | © 2026 无辣 ([haihaipypy](https://github.com/haihaipypy)) |
| Upstream foundation | MIT | © 2024 Addy Osmani — the compression/format-conversion parts derive from his image-tools; the original notice is retained in [LICENSE](./LICENSE) |
| Real-ESRGAN weights | BSD-3-Clause | © 2021 Xintao Wang ([Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)); ONNX export by [Qualcomm AI Hub](https://huggingface.co/qualcomm/Real-ESRGAN-General-x4v3) |
| BiRefNet weights | MIT | © 2024 Peng Zheng ([BiRefNet](https://github.com/ZhengPeng7/BiRefNet)); ONNX exports by [studioludens](https://huggingface.co/studioludens/birefnet-lite-512) and [naddy24](https://huggingface.co/naddy24/birefnet-512-webgpu) |
| ONNX Runtime Web | MIT | © Microsoft |
| jSquash and bundled codecs | MIT | © James Sinclair; codecs are MozJPEG / libavif / libjxl / OxiPNG |
| Lucide icons | ISC | Lucide Contributors |
| React / Vite / Tailwind CSS | MIT | Their respective foundations and authors |

**On Upscayl.** The upscaling interaction design takes inspiration from
[Upscayl](https://github.com/upscayl/upscayl), but **the code is a rewrite that copies none of its
source**, and the inference layer is entirely different (ONNX Runtime in the browser rather than
Electron with native ncnn binaries). This project is therefore not subject to Upscayl's AGPL-3.0
copyleft.

**On bg0.** The cutout interaction and API design takes inspiration from
[bg0](https://github.com/opencoredev/bg0) (Apache-2.0), but **the inference layer is an independent
implementation**. The dependency tree contains neither `@huggingface/transformers` nor
`@bg0/browser`.

The complete inventory, including model weights and every dependency, is at
**<https://img.1day.vip/en/docs/license.html>**.

## Credits

[jSquash](https://github.com/jamsinclair/jSquash) ·
[ONNX Runtime](https://github.com/microsoft/onnxruntime) ·
[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) ·
[BiRefNet](https://github.com/ZhengPeng7/BiRefNet) ·
[bg0](https://github.com/opencoredev/bg0) ·
[Upscayl](https://github.com/upscayl/upscayl) ·
[Addy Osmani](https://github.com/addyosmani)

## Contributing

PRs are welcome. For larger changes, please open an issue first to align on direction.
