import type {
  BackendKind,
  ProgressHandler,
  ResultNote,
  TileSettings,
  UpscaleModelSpec,
  UpscaleResult,
} from '../types'
import { LocalCapacityError, UpscaleError } from './errors'
import { ort } from './ortRuntime'
import { acquireSession } from './session'
import { extractTile, nchwToImageData, padToMinimum } from './tensor'

/**
 * Ceiling for on-device work. A 4x pass over a 4000x4000 source would allocate
 * ~16k x 16k pixels, which is past what browsers reliably hand out. There is no
 * server-side fallback, so this ceiling is hard.
 *
 * It is measured against the canvas we actually allocate, which is sized at the
 * *requested* scale — tiles are drawn straight onto it. That makes the budget
 * something the user can steer: dropping from 4x to 2x quarters the output and
 * so covers four times the source area.
 */
export const MAX_LOCAL_OUTPUT_PIXELS = 64_000_000

export { LocalCapacityError }

export interface LocalUpscaleOptions {
  bitmap: ImageBitmap
  model: UpscaleModelSpec
  targetScale: number
  tiles: TileSettings
  preferWebgpu: boolean
  threads: boolean
  onProgress?: ProgressHandler
  signal?: AbortSignal
}

/**
 * Runs the model over overlapping tiles and stitches the results.
 *
 * The graph is frozen to a fixed input size, so seams are unavoidable at tile
 * boundaries. Each tile only claims its own `stride`-sized territory; the
 * overlap band is inferred purely to give the network spatial context and is
 * discarded during stitching.
 *
 * Tiles land directly on a canvas sized at `targetScale`, so the model's native
 * 4x intermediate never exists as a whole-image buffer. Asking for 2x therefore
 * costs a quarter of the memory that asking for 4x does, instead of paying for
 * the 4x canvas and then throwing three quarters of it away.
 */
export async function upscaleLocally(options: LocalUpscaleOptions): Promise<UpscaleResult> {
  const { bitmap, model, targetScale, tiles, preferWebgpu, threads, onProgress, signal } = options

  const nativeScale = model.scale
  const tileEdge = model.fixedInputSize ?? tiles.tileSize
  const overlap = Math.max(0, Math.min(tiles.overlap, tileEdge - 1))
  const stride = tileEdge - overlap

  const padded = padToMinimum(bitmap, tileEdge, tileEdge)
  const srcW = padded.width
  const srcH = padded.height

  const outW = Math.round(bitmap.width * targetScale)
  const outH = Math.round(bitmap.height * targetScale)
  const outputPixels = outW * outH
  if (outputPixels > MAX_LOCAL_OUTPUT_PIXELS) {
    throw new LocalCapacityError(outputPixels, targetScale)
  }

  const startedAt = performance.now()
  const { session, backend } = await acquireSession({
    model,
    preferWebgpu,
    threads,
    onProgress,
    signal,
  })

  const notes: ResultNote[] = []
  if (backend === 'wasm' && preferWebgpu) {
    notes.push({ kind: 'wasm-fallback' })
  }

  // Sized to the real image, not the padded one: padding only exists to feed the
  // network, and anything drawn past this canvas is clipped away harmlessly.
  const output = new OffscreenCanvas(outW, outH)
  const outCtx = output.getContext('2d')
  if (!outCtx) throw new UpscaleError('canvas-context-failed')
  // This draw is the only resample the pixels ever get, so keep the sampler in
  // high gear — without it a 2x pass loses detail that the 4x pass would keep.
  outCtx.imageSmoothingEnabled = true
  outCtx.imageSmoothingQuality = 'high'

  const outEdge = tileEdge * nativeScale
  const scratch = new OffscreenCanvas(outEdge, outEdge)
  const scratchCtx = scratch.getContext('2d')
  if (!scratchCtx) throw new UpscaleError('canvas-context-failed')

  const cols = Math.ceil(srcW / stride)
  const rows = Math.ceil(srcH / stride)
  const totalTiles = cols * rows
  let completed = 0

  onProgress?.({ phase: 'inference', ratio: 0, detail: { completed: 0, total: totalTiles } })

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError')

      const territoryX = col * stride
      const territoryY = row * stride

      // Clamp the read window so it always sits fully inside the source.
      const readX = Math.min(territoryX, Math.max(0, srcW - tileEdge))
      const readY = Math.min(territoryY, Math.max(0, srcH - tileEdge))

      const pixels = extractTile(
        padded.source,
        readX,
        readY,
        tileEdge,
        tileEdge,
        model.inputRange,
      )
      const tensor = new ort.Tensor('float32', pixels, [1, 3, tileEdge, tileEdge])

      let result: ort.Tensor | undefined
      try {
        const outputs = await session.run({ [model.inputName]: tensor })
        result = outputs[model.outputName]
        if (!result) throw new UpscaleError('tensor-missing', { outputName: model.outputName })

        const data = result.data as Float32Array

        // Territory in source coordinates, clipped to the source.
        const x0 = territoryX
        const x1 = Math.min(territoryX + stride, srcW)
        const y0 = territoryY
        const y1 = Math.min(territoryY + stride, srcH)

        // The same territory, expressed inside this tile's own native output.
        const cropX = (x0 - readX) * nativeScale
        const cropY = (y0 - readY) * nativeScale
        const cropW = (x1 - x0) * nativeScale
        const cropH = (y1 - y0) * nativeScale

        // ...and again on the destination canvas, at the requested scale. Each
        // edge is rounded on its own so neighbouring tiles land on the same
        // pixel boundary instead of leaving hairline seams where it is fractional.
        const destX0 = Math.round(x0 * targetScale)
        const destY0 = Math.round(y0 * targetScale)
        const destW = Math.round(x1 * targetScale) - destX0
        const destH = Math.round(y1 * targetScale) - destY0

        if (cropW > 0 && cropH > 0 && destW > 0 && destH > 0) {
          scratchCtx.putImageData(nchwToImageData(data, outEdge, outEdge), 0, 0)
          outCtx.drawImage(scratch, cropX, cropY, cropW, cropH, destX0, destY0, destW, destH)
        }
      } finally {
        tensor.dispose()
        result?.dispose()
      }

      completed += 1
      onProgress?.({
        phase: 'inference',
        ratio: completed / totalTiles,
        detail: { completed, total: totalTiles },
      })
    }
  }

  notes.push({ kind: 'tiles', totalTiles, tileEdge, overlap })
  if (targetScale !== nativeScale) {
    notes.push({ kind: 'resample', nativeScale, targetScale })
  }

  onProgress?.({ phase: 'done', ratio: 1 })

  const backendKind: BackendKind = backend
  return {
    canvas: output,
    backend: backendKind,
    elapsedMs: performance.now() - startedAt,
    notes,
  }
}
