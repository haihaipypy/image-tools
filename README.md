# Image Tools · 图片工具

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**English** | [简体中文](./README_zh.md)

A browser-side image toolbox: **compression / format conversion** (WebAssembly codecs) plus
**AI super-resolution upscaling** (ONNX Runtime). Everything runs on the visitor's own device —
images are never uploaded, never leave the machine — and the output is a pile of static files,
so **no backend is required**.

Live: <https://img.1day.vip/>

![Screenshot](./public/screenshot-zh.png)

![Upscaling UI](./public/screenshot-upscale-zh.png)

## ✨ Features

Both tools share one page shell with a segmented tab switcher in the header (instant, same bundle —
no full page reload), and each keeps its own URL so they can be bookmarked and linked separately.

### 1. Compression / format conversion — `/`

| | |
| --- | --- |
| Output formats | AVIF, JPEG (MozJPEG), JPEG XL, PNG (OxiPNG), WebP |
| Processing | WASM codecs in the browser — no upload, no server |
| Batch | Multi-select, drag & drop, folders; files are queued and processed one by one |
| Quality | Per-format remembered defaults, slider applies immediately |
| Results | Live preview, size-reduction percentage, per-file download and "Download all" |

Default quality:

| Format | Default quality |
| --- | --- |
| AVIF | 50 |
| JPEG | 75 |
| JPEG XL | 75 |
| WebP | 75 |
| PNG | Lossless |

### 2. AI upscaling — `/upscale/`

| | |
| --- | --- |
| Model | Real-ESRGAN General x4v3 (single-file ONNX, 4.76 MB, committed to the repo) |
| Scale | 4× (tiled inference, resampled to the selected factor) |
| Backend | **WebGPU preferred**, automatic fallback to WASM (multi-threaded → single-threaded) |
| Flow | Upload → pick model → before/after comparison slider → download |
| Notes | Fixed 128×128 inputs with overlap tiling; oversized images are rejected by design |

## 🛠️ Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 (MPA: six HTML entry points) |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` (CSS-first) |
| Compression | [jSquash](https://github.com/jamsinclair/jSquash) WASM codecs |
| Upscaling | [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.30 (WebGPU / WASM) |
| Icons | lucide-react |
| Hosting | Cloudflare Pages (static only) |

## 🚀 Getting Started

```bash
git clone https://github.com/haihaipypy/image-tools.git
cd image-tools
npm install
npm run dev
```

`npm run dev` runs `prepare:ort` first to stage the ONNX Runtime assets, then starts Vite.
**There is no backend to start.**

Requirements: Node.js `^20.19.0 || >=22.12.0` (Vite 8 engine constraint), npm 7+.

## 🏗️ Building

```bash
npm run build      # prepare:ort → typecheck → vite build
npm run preview    # serve dist/ locally (with COOP/COEP headers)
```

Layout of the build output:

```
dist/
├── index.html            Chinese home (compression tab active)
├── upscale/index.html    Chinese upscaling page
├── blog/                 Chinese blog (hand-written HTML)
├── en/  zh-CN/           English / legacy Chinese paths, same structure
├── assets/               Bundled JS + CSS
├── ort/                  ONNX Runtime assets (generated at build time, stored gzipped)
├── models/               ONNX weights
├── _headers              Cloudflare response headers (cross-origin isolation + caching)
├── robots.txt  sitemap.xml  site.webmanifest
```

### npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Stage ORT assets + start the dev server |
| `npm run build` | Stage ORT assets + typecheck + build |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run lint` | ESLint |
| `npm run preview` | Preview `dist/` |
| `npm run prepare:ort` | Generate `public/ort/` on its own (runs automatically before every build) |
| `npm run deploy` | Build + `wrangler pages deploy` |

## 🌐 Routes & i18n

Chinese is the default; English lives under `/en/`. `/zh-CN/` is a legacy path that stays reachable
with its canonical pointing back to the root.

| Page | Chinese | English | Legacy |
| --- | --- | --- | --- |
| Compress | `/` | `/en/` | `/zh-CN/` |
| Upscale | `/upscale/` | `/en/upscale/` | `/zh-CN/upscale/` |
| Blog | `/blog/` | `/en/blog/` | `/zh-CN/blog/` |

Tab switching syncs the path via `history.replaceState`, so back/forward and direct URL entry both
land on the right tab.

## ☁️ Deployment

### Option 1 — Cloudflare Pages connected to Git (recommended)

Push to the configured branch and it builds and ships; no local wrangler needed.

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize and pick `haihaipypy/image-tools`
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None (or Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | leave empty |

4. **Add the environment variable `NODE_VERSION = 22`** — Vite 8 requires
   Node `^20.19.0 || >=22.12.0`, and the build image default may not satisfy it.
5. **Deploy** and watch the logs.

`wrangler.toml` (`pages_build_output_dir = "./dist"`) is already in place; keep the dashboard
settings consistent with it.

### Option 2 — Local wrangler

```bash
npm run deploy     # = npm run build && wrangler pages deploy dist --project-name=image-tools
```

Run `npx wrangler login` first, or provide `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in CI.

### Option 3 — Any static host

There is no server-side code, so dropping `dist/` anywhere works: EdgeOne Pages, Netlify,
GitHub Pages, nginx. Two caveats:

- **`public/_headers` is a Cloudflare format.** Other platforms need their own equivalent
  (a same-named `_headers` on Netlify, `add_header` on nginx, response-header rules on EdgeOne).
  **The cross-origin isolation headers must actually take effect**, see below.
- **The model and the ORT runtime live inside `dist/`** (`models/`, `ort/`) — don't forget them.

### Three things you must know before deploying

1. **Cross-origin isolation is a performance switch, not optional.**
   `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`
   in `public/_headers` is what unlocks `SharedArrayBuffer` and therefore multi-threaded WASM
   inference. Without them the app still works, but machines without WebGPU drop to
   single-threaded WASM — several times slower.
2. **`require-corp` blocks every third-party resource.**
   The page only loads its own assets today, which is why this is safe. Add a CDN script,
   a remote font or analytics and you must give them CORP headers, or rethink the policy.
3. **The ORT wasm runtime is 25.5 MB — over Cloudflare's 25 MiB single-file limit.**
   `scripts/prepare-ort.mjs` therefore stores it gzipped (~6.3 MB) at build time, and the browser
   decompresses it via `DecompressionStream` into a Blob URL before handing it to ORT. That also
   cuts first-load volume by three quarters. For the same reason, **model weights must be committed
   to the repo**: the build environment has neither Python nor access to the upstream model source,
   so it can never download them at build time.

### Changing the custom domain

`canonical`, `hreflang`, `og:url`, `og:image`, JSON-LD, the sitemap and robots.txt all use
**absolute URLs**, so a domain change is a global find-and-replace across:

- `index.html`, `en/index.html`, `zh-CN/index.html`
- `upscale/index.html`, `en/upscale/index.html`, `zh-CN/upscale/index.html`
- `public/blog/**/*.html`, `public/en/blog/**/*.html`, `public/zh-CN/blog/**/*.html`
- `public/sitemap.xml`, `public/robots.txt`
- the `SITE_ORIGIN` constant in `src/i18n/index.ts`

## 🧩 Using Another Upscaling Model

Add an entry to `src/lib/models.ts` and drop the `.onnx` into `public/models/`:

```ts
{
  id: 'my-model',
  label: 'Display name',
  url: '/models/my-model.onnx',
  scale: 4,
  approxBytes: 0,
  inputRange: 'unit',        // 'unit' = 0–1, 'byte' = 0–255
  inputName: 'image',        // input tensor name in the ONNX graph
  outputName: 'upscaled_image',
  fixedInputSize: 128,       // fixed input edge; null for dynamic shapes
  license: 'BSD-3-Clause',
}
```

Keep each file under 25 MiB or Cloudflare will refuse the deploy. Localized model copy lives in
i18n (`upscaleModels`) — no algorithm changes needed.

## ⚠️ Known Limitations

- **Local inference has a hard ceiling: 64 M output pixels.** Per the selected factor that is
  roughly a 2000×2000 source at 4×, or 4000×4000 at 2×. Over the limit it errors out — there is no
  cloud fallback. That is the price of free and private.
- **Machines without WebGPU have a limited experience**: they fall back to WASM, and even
  multi-threaded WASM is far slower than the GPU path. Safari's WebGPU support is recent, so older
  versions end up on a single thread.
- **The upscaler can do little for out-of-focus or badly blurred images**: super-resolution
  reconstructs detail, it does not fix blur.
- **Compression has none of these limits** — it is pure codec work, and batch processing is fine.

## 📜 License & Copyright

| Component | License | Copyright |
| --- | --- | --- |
| This project's code | MIT | © 2026 无辣 ([haihaipypy](https://github.com/haihaipypy)) |
| Upstream base project | MIT | © 2024 Addy Osmani — the compression/conversion part derives from their image-tools; the original notice is preserved in [LICENSE](./LICENSE) |
| Real-ESRGAN model weights | BSD-3-Clause | © 2021 Xintao Wang ([Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)); ONNX export via [Qualcomm AI Hub](https://huggingface.co/qualcomm/Real-ESRGAN-General-x4v3) |
| jSquash and its bundled codecs | MIT | © James Sinclair; codecs are MozJPEG / libavif / libjxl / OxiPNG |
| ONNX Runtime Web | MIT | © Microsoft |
| Lucide icons | ISC | Lucide Contributors |

**A note on Upscayl.** The upscaling feature takes its product shape from
[Upscayl](https://github.com/upscayl/upscayl), but **the code is written from scratch — none of
Upscayl's source was copied**, and the inference layer is fundamentally different (ONNX Runtime in
the browser instead of Electron + a native ncnn binary). This project is therefore not subject to
Upscayl's AGPL-3.0 and is released under MIT.

Full license text: [LICENSE](./LICENSE).

## 🙏 Acknowledgements

- [jSquash](https://github.com/jamsinclair/jSquash) — WASM image codecs
- [MozJPEG](https://github.com/mozilla/mozjpeg) / [libavif](https://github.com/AOMediaCodec/libavif) / [libjxl](https://github.com/libjxl/libjxl) / [OxiPNG](https://github.com/shssoichiro/oxipng)
- [ONNX Runtime](https://github.com/microsoft/onnxruntime) — WebGPU/WASM inference in the browser
- [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) — the super-resolution model
- [Upscayl](https://github.com/upscayl/upscayl) — inspiration for the interaction design
- [Addy Osmani](https://github.com/addyosmani) — the upstream image-tools project

## 🤝 Contributing

PRs are welcome. For larger changes, please open an issue first to align on direction.

1. Fork the repo
2. Branch: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add some AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Open a Pull Request
