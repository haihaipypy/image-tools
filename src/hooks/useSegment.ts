import { useCallback, useEffect, useRef, useState } from 'react'
import { probeCapabilities } from '../lib/cutout/backend'
import { canvasToBlob } from '../lib/imageOutput'
import { cutoutByPoints, releaseEncoding } from '../lib/segment'
import { SegmentError } from '../lib/segment/errors'
import { decodeImage, validateImage } from '../lib/segment/image'
import type {
  BackendCapabilities,
  BackendKind,
  PromptLabel,
  PromptPoint,
  SegmentProgress,
} from '../lib/types'

export type SegmentStatus = 'idle' | 'ready' | 'working' | 'done' | 'error'

export interface SegmentSource {
  bitmap: ImageBitmap
  width: number
  height: number
  /** 原图的 ObjectURL，用来在画布上显示并接收点击。 */
  previewUrl: string
  fileName: string
}

export interface SegmentHandle {
  url: string
  blob: Blob
  width: number
  height: number
  backend: BackendKind
  encodeMs: number
  decodeMs: number
  /** 选中候选的预测 IoU，0-1。 */
  score: number
  /** 主体占原图的百分比。 */
  coverage: number
  reusedEncoding: boolean
}

const IDLE_PROGRESS: SegmentProgress = { phase: 'idle', ratio: 0 }

/**
 * 点选抠图的状态机。
 *
 * 与 `useCutout` 最大的不同：这里的推理是**由点击驱动**的，所以没有 `run()`。
 * 每加一个点就自动重算一次，并且必须处理并发 —— 用户会连点。做法是「排队」
 * 而不是「取消」：正在跑的那次让它跑完，期间产生的新点集压进 `queuedRef`，
 * 跑完立刻用最新的点集再跑一次。这样连点五下最终停在第五下的结果上，既不会
 * 丢掉最后一次点击，也不会同时开五份推理把内存打爆。
 *
 * 抛出的错误保留原始对象（多数是带 code 的 SegmentError），由 UI 层决定怎么
 * 翻译 —— 这个 hook 不碰任何面向用户的文案。
 */
export function useSegment() {
  const [capabilities, setCapabilities] = useState<BackendCapabilities | null>(null)
  const [source, setSource] = useState<SegmentSource | null>(null)
  const [points, setPoints] = useState<PromptPoint[]>([])
  const [result, setResult] = useState<SegmentHandle | null>(null)
  const [status, setStatus] = useState<SegmentStatus>('idle')
  const [progress, setProgress] = useState<SegmentProgress>(IDLE_PROGRESS)
  const [error, setError] = useState<Error | null>(null)

  const sourceUrlRef = useRef<string | null>(null)
  const resultUrlRef = useRef<string | null>(null)

  /** 是否有一次推理在飞行中。 */
  const runningRef = useRef(false)
  /** 飞行期间攒下的最新点集，跑完立刻消费。 */
  const queuedRef = useRef<PromptPoint[] | null>(null)
  /** 已经算过的那一份点集，用来避免 effect 重复触发同一份。 */
  const settledRef = useRef<PromptPoint[] | null>(null)
  /** 换图/重置时作废在飞的这次结果。 */
  const generationRef = useRef(0)

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
      releaseEncoding()
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

  /**
   * 真正跑一次推理。
   *
   * 用 ref 递归调用自己（而不是让 effect 直接调），是因为「跑完发现有点集
   * 更新」这件事只有在这里知道 —— 交给 effect 会变成一轮额外的渲染，连点时
   * 手感会明显发涩。
   */
  const executeRef = useRef<(next: PromptPoint[], generation: number) => Promise<void>>(async () => {})

  const execute = useCallback(
    async (target: PromptPoint[], generation: number) => {
      if (!source) return
      if (runningRef.current) {
        queuedRef.current = target
        return
      }

      runningRef.current = true
      settledRef.current = target
      setStatus('working')

      try {
        const caps = capabilities ?? (await probeCapabilities())
        const outcome = await cutoutByPoints({
          bitmap: source.bitmap,
          points: target,
          preferWebgpu: caps.webgpu,
          threads: caps.threads,
          onProgress: (next) => {
            if (generation === generationRef.current) setProgress(next)
          },
        })

        // 用户在推理途中换了图 —— 这张结果已经不属于当前画布了。
        if (generation !== generationRef.current) return

        const blob = await canvasToBlob(outcome.canvas, 'image/png')
        replaceResultUrl(URL.createObjectURL(blob))
        setResult({
          url: resultUrlRef.current ?? '',
          blob,
          width: source.width,
          height: source.height,
          backend: outcome.backend,
          encodeMs: outcome.encodeMs,
          decodeMs: outcome.decodeMs,
          score: outcome.score,
          coverage: outcome.coverage,
          reusedEncoding: outcome.reusedEncoding,
        })
        setError(null)
        setStatus('done')
      } catch (caught) {
        if (generation !== generationRef.current) return
        const failure = caught instanceof Error ? caught : new Error(String(caught))
        setError(failure)
        // 抠空了不是致命错误：上一次的结果仍然有效，继续显示，只把提示挂上去。
        // 其它失败才把状态压成 error。
        if (!(failure instanceof SegmentError && failure.code === 'empty-mask')) {
          setStatus('error')
        } else {
          setStatus('done')
        }
      } finally {
        runningRef.current = false
        const queued = queuedRef.current
        queuedRef.current = null
        // 换过图就不必再补跑：那份点集属于上一张画布。
        if (queued && queued !== settledRef.current && generation === generationRef.current) {
          void executeRef.current(queued, generation)
        }
      }
    },
    [source, capabilities, replaceResultUrl],
  )

  // 声明在下面的排空逻辑之前：effect 按声明顺序执行，所以第一次触发重算时
  // `executeRef` 一定已经指向当轮最新的 `execute`。
  useEffect(() => {
    executeRef.current = execute
  }, [execute])

  // 点集一变就重算。`settledRef` 挡住「跑完又触发一次同样的点集」这种空转。
  useEffect(() => {
    if (!source) return
    if (points.length === 0) return
    if (points === settledRef.current) return
    void execute(points, generationRef.current)
  }, [source, points, execute])

  const selectImage = useCallback(
    async (file: File) => {
      generationRef.current++
      releaseEncoding()
      try {
        validateImage(file)
        const bitmap = await decodeImage(file)
        replaceSourceUrl(URL.createObjectURL(file))
        replaceResultUrl(null)
        setSource({
          bitmap,
          width: bitmap.width,
          height: bitmap.height,
          previewUrl: sourceUrlRef.current ?? '',
          fileName: file.name,
        })
        setPoints([])
        settledRef.current = null
        queuedRef.current = null
        setResult(null)
        setError(null)
        setProgress(IDLE_PROGRESS)
        setStatus('ready')
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error(String(caught)))
        setStatus('error')
      }
    },
    [replaceSourceUrl, replaceResultUrl],
  )

  const reset = useCallback(() => {
    generationRef.current++
    releaseEncoding()
    replaceSourceUrl(null)
    replaceResultUrl(null)
    settledRef.current = null
    queuedRef.current = null
    setSource(null)
    setPoints([])
    setResult(null)
    setError(null)
    setProgress(IDLE_PROGRESS)
    setStatus('idle')
  }, [replaceSourceUrl, replaceResultUrl])

  /** 追加一个提示点。坐标是归一化到 0-1 的原图坐标。 */
  const addPoint = useCallback((x: number, y: number, label: PromptLabel) => {
    setPoints((current) => [...current, { x, y, label }])
  }, [])

  const undoPoint = useCallback(() => {
    setPoints((current) => current.slice(0, -1))
  }, [])

  const clearPoints = useCallback(() => {
    settledRef.current = null
    setPoints([])
    setResult(null)
    setError(null)
    setProgress(IDLE_PROGRESS)
    setStatus('ready')
  }, [])

  /** 只清错误提示，保留点集和结果 —— 供「抠空了」的提示条关闭用。 */
  const dismissError = useCallback(() => {
    setError(null)
  }, [])

  return {
    capabilities,
    source,
    points,
    result,
    status,
    progress,
    error,
    selectImage,
    reset,
    addPoint,
    undoPoint,
    clearPoints,
    dismissError,
  }
}
