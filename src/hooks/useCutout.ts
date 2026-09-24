import { useCallback, useEffect, useRef, useState } from 'react'
import { clearCutoutModelCache } from '../lib/cutout/modelCache'
import { DEFAULT_CUTOUT_MODEL_ID, getCutoutModel } from '../lib/cutout/models'
import { cutoutLocally } from '../lib/cutout'
import { probeCapabilities } from '../lib/cutout/backend'
import { CutoutError } from '../lib/cutout/errors'
import { canvasToBlob } from '../lib/imageOutput'
import type {
  BackendCapabilities,
  BackendKind,
  CutoutProgress,
  CutoutQuality,
  ResultNote,
} from '../lib/types'

export type CutoutStatus = 'idle' | 'ready' | 'running' | 'done' | 'error'

export interface CutoutSource {
  bitmap: ImageBitmap
  width: number
  height: number
  /** 原图的 ObjectURL，用来并排展示「抠图前」。 */
  previewUrl: string
  /** 原始文件名，用来给下载结果起名。 */
  fileName: string
}

export interface CutoutHandle {
  url: string
  blob: Blob
  width: number
  height: number
  backend: BackendKind
  elapsedMs: number
  coverage: number
  notes: ResultNote[]
}

/**
 * 抠图的背景色。transparent 直接给透明 PNG；其余几色把主体合成到纯色底上，
 * 方便用户直接拿去当头像、商品图 —— 这比要求他们自己再开一个编辑器要实用。
 */
export type CutoutBackdrop = 'transparent' | 'white' | 'red' | 'blue'

const IDLE_PROGRESS: CutoutProgress = { phase: 'idle', ratio: 0 }

/**
 * 单张图片的抠图任务状态机。
 *
 * 与 useUpscaler 的约定一致：抛出的错误保留原始对象（多数是带 code 的
 * CutoutError），由 UI 层决定怎么翻译 —— 这个 hook 不碰任何面向用户的文案。
 */
export function useCutout() {
  const [capabilities, setCapabilities] = useState<BackendCapabilities | null>(null)
  const [source, setSource] = useState<CutoutSource | null>(null)
  const [result, setResult] = useState<CutoutHandle | null>(null)
  const [status, setStatus] = useState<CutoutStatus>('idle')
  const [progress, setProgress] = useState<CutoutProgress>(IDLE_PROGRESS)
  const [error, setError] = useState<Error | null>(null)

  const [modelId, setModelId] = useState(DEFAULT_CUTOUT_MODEL_ID)
  const [quality, setQuality] = useState<CutoutQuality>('fast')
  const [backdrop, setBackdrop] = useState<CutoutBackdrop>('transparent')

  const abortRef = useRef<AbortController | null>(null)
  const sourceUrlRef = useRef<string | null>(null)
  const resultUrlRef = useRef<string | null>(null)
  /** 上一次抠出的透明图。换底色时直接拿它重合成，不用再跑一遍推理。 */
  const cutoutBlobRef = useRef<Blob | null>(null)

  useEffect(() => {
    let cancelled = false
    void probeCapabilities().then((caps) => {
      if (!cancelled) setCapabilities(caps)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    },
    [],
  )

  const replaceSourceUrl = useCallback((next: string | null) => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    sourceUrlRef.current = next
  }, [])

  const replaceResultUrl = useCallback((next: string | null) => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    resultUrlRef.current = next
  }, [])

  const selectImage = useCallback(
    async (file: File) => {
      abortRef.current?.abort()
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
        replaceSourceUrl(URL.createObjectURL(file))
        replaceResultUrl(null)
        cutoutBlobRef.current = null
        setSource({
          bitmap,
          width: bitmap.width,
          height: bitmap.height,
          previewUrl: sourceUrlRef.current ?? '',
          fileName: file.name,
        })
        setResult(null)
        setError(null)
        setProgress(IDLE_PROGRESS)
        setStatus('ready')
      } catch {
        setError(new CutoutError('decode-failed'))
        setStatus('error')
      }
    },
    [replaceSourceUrl, replaceResultUrl],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    replaceSourceUrl(null)
    replaceResultUrl(null)
    cutoutBlobRef.current = null
    setSource(null)
    setResult(null)
    setError(null)
    setProgress(IDLE_PROGRESS)
    setStatus('idle')
  }, [replaceSourceUrl, replaceResultUrl])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const run = useCallback(async () => {
    if (!source || status === 'running') return

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('running')
    setError(null)
    setProgress({ phase: 'idle', ratio: 0 })

    const spec = getCutoutModel(modelId)
    // 能力探测在挂载时就发起了；若用户在结果回来前就点了运行，这里等它落地，
    // 而不是悄悄退回到慢后端。
    const caps = capabilities ?? (await probeCapabilities())
    const onProgress = (next: CutoutProgress) => {
      if (!controller.signal.aborted) setProgress(next)
    }

    try {
      const outcome = await cutoutLocally({
        bitmap: source.bitmap,
        spec,
        quality,
        preferWebgpu: caps.webgpu,
        threads: caps.threads,
        onProgress,
        signal: controller.signal,
      })

      const blob = await canvasToBlob(outcome.canvas, 'image/png')
      cutoutBlobRef.current = blob
      replaceResultUrl(URL.createObjectURL(blob))
      setResult({
        url: resultUrlRef.current ?? '',
        blob,
        width: outcome.canvas.width,
        height: outcome.canvas.height,
        backend: outcome.backend,
        elapsedMs: outcome.elapsedMs,
        coverage: outcome.coverage,
        notes: outcome.notes,
      })
      setStatus('done')
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setStatus('ready')
        setProgress(IDLE_PROGRESS)
        return
      }
      setError(caught instanceof Error ? caught : new Error(String(caught)))
      setStatus('error')
    } finally {
      abortRef.current = null
    }
  }, [source, status, modelId, quality, capabilities, replaceResultUrl])

  /**
   * 换底色：只重合成，不重推理。
   *
   * 透明图上每个像素的 RGB 都还在，只是 alpha 为 0 被浏览器藏起来了，所以
   * 直接把它画到纯色底上就得到「主体不变、背景换色」。这比让用户再跑一次
   * 94 MB 模型的推理要合理得多。
   *
   * ⚠️ 每个分支都必须同时更新 `url` 和 `blob`。
   * 曾经透明分支只换了 url、漏换 blob，导致「选了底色再选回透明」时预览是透明的、
   * 下载下来的却还是带底色的那张 —— 预览和文件不一致是最难被发现的 bug 之一。
   */
  const applyBackdrop = useCallback(
    async (next: CutoutBackdrop) => {
      setBackdrop(next)
      const blob = cutoutBlobRef.current
      if (!blob || !result) return

      if (next === 'transparent') {
        // 回到原始的透明 PNG（cutoutBlobRef 存的始终是模型输出的那一张，从未被覆盖）
        replaceResultUrl(URL.createObjectURL(blob))
        setResult({ ...result, url: resultUrlRef.current ?? '', blob })
        return
      }

      const decoded = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(decoded.width, decoded.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = BACKDROP_COLORS[next]
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(decoded, 0, 0)
      decoded.close()

      const composed = await canvasToBlob(canvas, 'image/png')
      replaceResultUrl(URL.createObjectURL(composed))
      setResult({ ...result, url: resultUrlRef.current ?? '', blob: composed })
    },
    [result, replaceResultUrl],
  )

  /**
   * 清空本地模型缓存。给「模型下载卡住了 / 想释放空间」的用户一个出口 ——
   * 抠图权重占 94 MB 起步，不提供清理入口不合适。
   */
  const clearCache = useCallback(async () => {
    await clearCutoutModelCache()
  }, [])

  return {
    capabilities,
    source,
    result,
    status,
    progress,
    error,
    modelId,
    setModelId,
    quality,
    setQuality,
    backdrop,
    applyBackdrop,
    selectImage,
    reset,
    cancel,
    run,
    clearCache,
  }
}

const BACKDROP_COLORS: Record<Exclude<CutoutBackdrop, 'transparent'>, string> = {
  white: '#ffffff',
  // 证件照底色惯例：红底用正红。方便直接拿去做证件照 / 简历头像。
  red: '#d40000',
  blue: '#1d4ed8',
}
