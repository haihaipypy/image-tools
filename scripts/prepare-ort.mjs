/**
 * Stages the ONNX Runtime WebAssembly runtime into `public/ort/`.
 *
 * Only one variant is ever loaded: ONNX Runtime Web hardcodes the asyncify
 * build (`ort-wasm-simd-threaded.asyncify.mjs`) as its wasm runtime, and both
 * the WASM and WebGPU execution providers run on top of it. The jsep and plain
 * builds ship inside the same npm package but are never requested, so we do
 * not deploy them.
 *
 * That still leaves a 25.5 MB `.wasm` file, over Cloudflare's 25 MiB per-file
 * limit for static assets. Pushing it to R2 would mean an extra binding and a
 * deployment step, so we store it gzipped and inflate it in the browser with
 * DecompressionStream: 25.5 MB → 6.3 MB, which also cuts first-load transfer.
 *
 * Idempotent — safe to run on every build.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SRC_DIR = path.join(ROOT, 'node_modules', 'onnxruntime-web', 'dist')
const OUT_DIR = path.join(ROOT, 'public', 'ort')

/** Leave headroom under Cloudflare's 25 MiB static-asset ceiling. */
const SIZE_LIMIT = 24 * 1024 * 1024

const RUNTIME_SCRIPT = 'ort-wasm-simd-threaded.asyncify.mjs'
const RUNTIME_BINARY = 'ort-wasm-simd-threaded.asyncify.wasm'
const ASSETS = [RUNTIME_SCRIPT, RUNTIME_BINARY]

async function stageOne(fileName) {
  const buffer = await readFile(path.join(SRC_DIR, fileName))

  if (buffer.byteLength <= SIZE_LIMIT) {
    await writeFile(path.join(OUT_DIR, fileName), buffer)
    return {
      fileName,
      bytes: buffer.byteLength,
      compressed: false,
      storedAs: fileName,
      storedBytes: buffer.byteLength,
    }
  }

  const compressed = gzipSync(buffer, { level: 9 })
  const storedAs = `${fileName}.gzbin`
  await writeFile(path.join(OUT_DIR, storedAs), compressed)
  return {
    fileName,
    bytes: buffer.byteLength,
    compressed: true,
    storedAs,
    storedBytes: compressed.byteLength,
  }
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const manifest = {}
  for (const fileName of ASSETS) {
    const entry = await stageOne(fileName)
    manifest[fileName] = entry
    const rawMb = (entry.bytes / 1024 / 1024).toFixed(1)
    const keptMb = (entry.storedBytes / 1024 / 1024).toFixed(1)
    const how = entry.compressed ? `gzip ${rawMb} MB → ${keptMb} MB` : `as-is ${rawMb} MB`
    console.log(`  ${fileName}  ${how}`)
  }

  await writeFile(
    path.join(OUT_DIR, 'manifest.json'),
    `${JSON.stringify({ sizeLimit: SIZE_LIMIT, files: manifest }, null, 2)}\n`,
    'utf8',
  )
  console.log('ORT runtime staged into public/ort/')
}

main().catch((error) => {
  console.error('Failed to stage the ONNX Runtime runtime:', error)
  process.exitCode = 1
})
