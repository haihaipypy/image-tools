import { useCallback, useEffect, useRef, useState } from 'react'
import { canvasToBlob } from '../lib/imageOutput'
import { DEFAULT_MODEL_ID, getModel } from '../lib/models'
import { upscaleLocally } from '../lib/upscaler'
import { probeCapabilities } from '../lib/upscaler/backend'
import { UpscaleError } from '../lib/upscaler/errors'
import type {
  BackendCapabilities,
  BackendKind,
  ResultNote,
  UpscaleProgress,
} from '../lib/types'

export type JobStatus = 'idle' | 'ready' | 'running' | 'done' | 'error'

export interface SourceHandle {
  bitmap: ImageBitmap
  width: number
  height: number
  previewUrl: string
}

export interface ResultHandle {
  url: string
  blob: Blob
  width: number
  height: number
  backend: BackendKind
  elapsedMs: number
  notes: ResultNote[]
}

const IDLE_PROGRESS: UpscaleProgress = { phase: 'idle', ratio: 0 }

/**
 * 单张图片的放大任务状态机。
 *
 * 抛出的错误一律保留原始对象（多数是带 code 的 UpscaleError），
 * 由 UI 层决定怎么翻译 —— 这个 hook 不碰任何面向用户的文案。
 */
export function useUpscaler() {
  const [capabilities, setCapabilities] = useState<BackendCapabilities | null>(null)
  const [source, setSource] = useState<SourceHandle | null>(null)
  const [result, setResult] = useState<ResultHandle | null>(null)
  const [status, setStatus] = useState<JobStatus>('idle')
  const [progress, setProgress] = useState<UpscaleProgress>(IDLE_PROGRESS)
  const [error, setError] = useState<Error | null>(null)

  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID)
  const [targetScale, setTargetScale] = useState(4)
  const [overlap, setOverlap] = useState(8)

  const abortRef = useRef<AbortController | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const resultUrlRef = useRef<string | null>(null)

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
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    },
    [],
  )

  const replacePreviewUrl = useCallback((next: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = next
  }, [])

  const replaceResultUrl = useCallback((next: string | null) => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    resultUrlRef.current = next
  }, [])

  const selectFile = useCallback(
    async (file: File) => {
      abortRef.current?.abort()
      try {
        const bitmap = await createImageBitmap(file, { colorSpaceConversion: 'none' })
        replacePreviewUrl(URL.createObjectURL(file))
        replaceResultUrl(null)
        setSource({
          bitmap,
          width: bitmap.width,
          height: bitmap.height,
          previewUrl: previewUrlRef.current ?? '',
        })
        setResult(null)
        setError(null)
        setProgress(IDLE_PROGRESS)
        setStatus('ready')
      } catch {
        setError(new UpscaleError('image-decode-failed'))
        setStatus('error')
      }
    },
    [replacePreviewUrl, replaceResultUrl],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    replacePreviewUrl(null)
    replaceResultUrl(null)
    setSource(null)
    setResult(null)
    setError(null)
    setProgress(IDLE_PROGRESS)
    setStatus('idle')
  }, [replacePreviewUrl, replaceResultUrl])

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

    const model = getModel(modelId)
    const tiles = { tileSize: model.fixedInputSize ?? 128, overlap }
    // 能力探测在挂载时就已经发起；如果用户在结果回来之前就点了运行，
    // 这里等它落地，而不是悄悄地退回到慢后端。
    const caps = capabilities ?? (await probeCapabilities())
    const onProgress = (next: UpscaleProgress) => {
      if (!controller.signal.aborted) setProgress(next)
    }

    try {
      const outcome = await upscaleLocally({
        bitmap: source.bitmap,
        model,
        targetScale,
        tiles,
        preferWebgpu: caps.webgpu,
        threads: caps.threads,
        onProgress,
        signal: controller.signal,
      })

      const blob = await canvasToBlob(outcome.canvas, 'image/png')
      replaceResultUrl(URL.createObjectURL(blob))
      setResult({
        url: resultUrlRef.current ?? '',
        blob,
        width: outcome.canvas.width,
        height: outcome.canvas.height,
        backend: outcome.backend,
        elapsedMs: outcome.elapsedMs,
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
  }, [source, status, modelId, overlap, targetScale, capabilities, replaceResultUrl])

  return {
    capabilities,
    source,
    result,
    status,
    progress,
    error,
    modelId,
    setModelId,
    targetScale,
    setTargetScale,
    overlap,
    setOverlap,
    selectFile,
    reset,
    cancel,
    run,
  }
}
