import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../i18n'
import {
  ASPECT_PRESETS,
  clampRect,
  largestInscribedRect,
  orientedSize,
  signedAngle,
  sliceRects,
  type Rect,
} from '../../lib/edit/geometry'
import { IDENTITY_TRANSFORM, renderEdit, renderSlices, type EditTransform } from '../../lib/edit/render'
import { detectSkew, toAnalysisImage } from '../../lib/edit/straighten'
import { createZip } from '../../lib/edit/zip'
import { canvasToBlob, downloadBlob } from '../../lib/imageOutput'
import { EditCanvas } from './EditCanvas'
import { EditControls, type SliceSettings, type StraightenState } from './EditControls'
import { EditDropZone } from './EditDropZone'
import { SlicePreview } from './SlicePreview'

interface EditSource {
  bitmap: ImageBitmap
  previewUrl: string
  fileName: string
}

/** 置信度低于这个值就别自作主张转图 —— 多半是画面里没有直线可参考。 */
const MIN_STRAIGHTEN_CONFIDENCE = 0.25
/** 小于这个角度就当它本来就是正的，来回微调反而惹人烦。 */
const FLAT_THRESHOLD_DEG = 0.2

/**
 * 裁剪 / 旋转 / 切片工作区。
 *
 * 与另外三个工作区最大的区别：这里**没有异步推理**，所有变换都是即时的
 * canvas 操作。所以没有进度条、没有取消按钮，也不需要状态机 —— 状态就是
 * 「原图 + 一组变换参数」，导出时才算一次。
 *
 * 唯一需要注意的是裁剪框的坐标系：它永远挂在「已定向」（旋转+翻转之后）的
 * 画布上。所以每次转动角度都要按新的画布重算框，否则框会落在旋转后的空白
 * 区域里，导出一片透明。
 */
export function EditWorkbench() {
  const { t } = useTranslation()
  const [source, setSource] = useState<EditSource | null>(null)
  const [transform, setTransform] = useState<EditTransform>(IDENTITY_TRANSFORM)
  const [ratioId, setRatioId] = useState('free')
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 })
  const [slice, setSlice] = useState<SliceSettings>({ cols: 3, rows: 3, gap: 0 })
  const [straighten, setStraighten] = useState<StraightenState>({ status: 'idle' })
  const [packing, setPacking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sourceUrlRef = useRef<string | null>(null)

  useEffect(
    () => () => {
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    },
    [],
  )

  const oriented = source
    ? orientedSize(source.bitmap.width, source.bitmap.height, transform.rotation)
    : { width: 0, height: 0 }

  const ratio = useMemo(
    () => ASPECT_PRESETS.find((preset) => preset.id === ratioId)?.ratio ?? null,
    [ratioId],
  )

  const sliceCount = useMemo(() => {
    if (rect.width <= 0 || rect.height <= 0) return 0
    return sliceRects(rect, slice).length
  }, [rect, slice])

  const selectImage = useCallback(
    async (file: File) => {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
        if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
        sourceUrlRef.current = URL.createObjectURL(file)
        setSource({
          bitmap,
          previewUrl: sourceUrlRef.current,
          fileName: file.name,
        })
        setTransform(IDENTITY_TRANSFORM)
        setRatioId('free')
        setRect({ x: 0, y: 0, width: bitmap.width, height: bitmap.height })
        setStraighten({ status: 'idle' })
        setError(null)
      } catch {
        setError(t.editStraightenFailed)
      }
    },
    [t],
  )

  const reset = useCallback(() => {
    if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current)
    sourceUrlRef.current = null
    setSource(null)
    setTransform(IDENTITY_TRANSFORM)
    setRatioId('free')
    setRect({ x: 0, y: 0, width: 0, height: 0 })
    setStraighten({ status: 'idle' })
    setError(null)
  }, [])

  /**
   * 改旋转角。
   *
   * 每次都把裁剪框重置成「旋转后画面里最大的内接矩形」：这样四个角永远是实的，
   * 不会出现半边透明的导出结果。用户想保留更多画面可以自己再往外拖。
   */
  const applyRotation = useCallback(
    (deg: number) => {
      if (!source) return
      const next = signedAngle(deg)
      setTransform((current) => ({ ...current, rotation: next }))
      // 注意传的是**原图**尺寸：内接矩形的公式是按原图推导的，坐标则自动
      // 落在旋转后的画布上。这里曾经误传旋转后的外接框，结果是裁完四角仍露白。
      setRect(
        largestInscribedRect(source.bitmap.width, source.bitmap.height, next),
      )
      setStraighten((current) => (current.status === 'done' ? { status: 'idle' } : current))
    },
    [source],
  )

  const toggleFlip = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (!source) return
      setTransform((current) => ({
        ...current,
        flipHorizontal: axis === 'horizontal' ? !current.flipHorizontal : current.flipHorizontal,
        flipVertical: axis === 'vertical' ? !current.flipVertical : current.flipVertical,
      }))
      // 框跟着内容镜像，否则「翻一下」会让用户刚调好的取景跑到对面去。
      setRect((current) =>
        axis === 'horizontal'
          ? { ...current, x: oriented.width - current.x - current.width }
          : { ...current, y: oriented.height - current.y - current.height },
      )
    },
    [oriented.height, oriented.width, source],
  )

  const changeRatio = useCallback(
    (id: string) => {
      setRatioId(id)
      const preset = ASPECT_PRESETS.find((item) => item.id === id)
      if (!preset?.ratio) return
      setRect((current) => clampRect(current, oriented, preset.ratio))
    },
    [oriented],
  )

  const handleStraighten = useCallback(() => {
    if (!source) return
    setStraighten({ status: 'running' })
    // 让浏览器先画出「分析中…」，再做这段同步的像素运算 —— 否则按钮
    // 会在计算结束后才变样，看起来像没反应。
    window.setTimeout(() => {
      try {
        const analysis = toAnalysisImage(
          source.bitmap,
          source.bitmap.width,
          source.bitmap.height,
        )
        const result = detectSkew(analysis)

        if (result.confidence < MIN_STRAIGHTEN_CONFIDENCE) {
          setStraighten({ status: 'failed' })
          return
        }
        if (Math.abs(result.angle) < FLAT_THRESHOLD_DEG) {
          setStraighten({ status: 'flat' })
          return
        }

        applyRotation(transform.rotation + result.angle)
        setStraighten({ status: 'done', angle: Math.round(result.angle * 10) / 10 })
      } catch {
        setStraighten({ status: 'failed' })
      }
    }, 16)
  }, [applyRotation, source, transform.rotation])

  const handleDownload = useCallback(async () => {
    if (!source) return
    try {
      const canvas = renderEdit(
        source.bitmap,
        source.bitmap.width,
        source.bitmap.height,
        transform,
        rect,
      )
      const blob = await canvasToBlob(canvas, 'image/png')
      downloadBlob(blob, `${baseName(source.fileName)}-edited.png`)
    } catch {
      setError(t.editStraightenFailed)
    }
  }, [rect, source, t, transform])

  const handleDownloadSlices = useCallback(async () => {
    if (!source) return
    setPacking(true)
    try {
      const pieces = await renderSlices(
        source.bitmap,
        source.bitmap.width,
        source.bitmap.height,
        transform,
        rect,
        slice,
      )
      const base = baseName(source.fileName)
      const entries = await Promise.all(
        pieces.map(async (piece) => ({
          name: `${base}_${piece.row}-${piece.col}.png`,
          data: new Uint8Array(await piece.blob.arrayBuffer()),
        })),
      )
      downloadBlob(createZip(entries), `${base}-slices.zip`)
    } catch {
      setError(t.editStraightenFailed)
    } finally {
      setPacking(false)
    }
  }, [rect, slice, source, t, transform])

  if (!source) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <EditDropZone onFile={selectImage} />
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          {t.editFirstRunHint}
        </p>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
      </div>
    )
  }

  const aspect = oriented.height > 0 ? oriented.width / oriented.height : 1

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <EditCanvas
            source={source.bitmap}
            transform={transform}
            rect={rect}
            ratio={ratio}
            onRectChange={setRect}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-mono">{t.editOutputSize(rect.width, rect.height)}</span>
          <span className="font-mono">
            {source.bitmap.width} × {source.bitmap.height}
            {transform.rotation !== 0 && ` · ${t.editRotateValue(transform.rotation)}`}
            {` · ${aspect.toFixed(2)}`}
          </span>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <EditControls
            ratioId={ratioId}
            onRatioChange={changeRatio}
            rotation={transform.rotation}
            onRotationChange={applyRotation}
            onStraighten={handleStraighten}
            straighten={straighten}
            flipHorizontal={transform.flipHorizontal}
            flipVertical={transform.flipVertical}
            onToggleFlip={toggleFlip}
            onResetCrop={() => setRect({ x: 0, y: 0, width: oriented.width, height: oriented.height })}
            onResetAll={() => {
              setTransform(IDENTITY_TRANSFORM)
              setRatioId('free')
              setRect({
                x: 0,
                y: 0,
                width: source.bitmap.width,
                height: source.bitmap.height,
              })
              setStraighten({ status: 'idle' })
            }}
            slice={slice}
            onSliceChange={setSlice}
            onDownloadSlices={handleDownloadSlices}
            packing={packing}
            sliceCount={sliceCount}
          />

          {/* 切片预览直接续在同一张卡片里，不再单独开一张。
              多一张卡片就要多付一圈内边距 + 一层边框 + 一段间距，约 40px，
              而它和切片设置本来就是一件事，分开摆反而显得无关。 */}
          <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <SlicePreview
              source={source.bitmap}
              transform={transform}
              rect={rect}
              slice={slice}
            />
          </div>
        </div>

        {/* 下载按钮吸在视口底部，理由同抠图页：侧栏四组控件加预览很容易顶出
            一屏，而这是整页唯一必须够得着的按钮。 */}
        <div className="sticky bottom-0 z-10 space-y-2 border-t border-neutral-200 bg-neutral-50/95 pt-3 pb-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            {t.editDownload}
          </button>
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700"
          >
            {t.editReplace}
          </button>
        </div>
      </aside>
    </div>
  )
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || 'image'
}
