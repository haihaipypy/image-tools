import { X, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import type { ImageFile } from '../types';
import { formatFileSize } from '../utils/imageProcessing';
import { downloadImage } from '../utils/download';
import { useTranslation } from '../i18n';

interface ImageListProps {
  images: ImageFile[];
  onRemove: (id: string) => void;
}

export function ImageList({ images, onRemove }: ImageListProps) {
  const { t } = useTranslation();

  if (images.length === 0) return null;

  return (
    <div className="space-y-3">
      {images.map((image) => (
        <div
          key={image.id}
          className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {image.preview && (
            <img
              src={image.preview}
              alt={image.file.name}
              className="h-16 w-16 rounded-lg object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {image.file.name}
              </p>
              <div className="flex flex-shrink-0 items-center gap-2">
                {image.status === 'complete' && (
                  <button
                    onClick={() => downloadImage(image)}
                    className="text-neutral-400 transition-colors hover:text-blue-600"
                    title={t.download}
                  >
                    <Download className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => onRemove(image.id)}
                  className="text-neutral-400 transition-colors hover:text-red-600"
                  title={t.remove}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              {image.status === 'pending' && (
                <span>{t.statusPending}</span>
              )}
              {image.status === 'processing' && (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.statusProcessing}
                </span>
              )}
              {image.status === 'complete' && (
                <span className="flex items-center gap-2 text-green-600 dark:text-green-500">
                  <CheckCircle className="h-4 w-4" />
                  {t.statusComplete}
                </span>
              )}
              {image.status === 'error' && (
                <span className="flex items-center gap-2 text-red-600 dark:text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {image.error || t.statusError}
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {formatFileSize(image.originalSize)}
              {image.compressedSize && (
                <>
                  {' → '}
                  {formatFileSize(image.compressedSize)}{' '}
                  <span className="text-green-600 dark:text-green-500">
                    ({t.smaller(
                      Math.round(
                        ((image.originalSize - image.compressedSize) /
                          image.originalSize) *
                          100
                      )
                    )})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
