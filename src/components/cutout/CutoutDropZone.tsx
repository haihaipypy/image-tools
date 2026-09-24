import { useCallback, useRef, useState } from 'react'
import { Scissors } from 'lucide-react'
import { useTranslation } from '../../i18n'

const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif'

interface CutoutDropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

/**
 * 抠图工具的拖拽区：一次只收一张图，因为模型一次只处理一张。
 */
export function CutoutDropZone({ onFile, disabled = false }: CutoutDropZoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const takeFirst = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!disabled) takeFirst(event.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
      className={[
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition',
        dragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
          : 'border-neutral-300 bg-white hover:border-blue-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-600 dark:hover:bg-neutral-800',
        disabled ? 'pointer-events-none opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
        <Scissors className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          {t.cutoutDropTitle}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.cutoutDropSubtitle}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          takeFirst(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
