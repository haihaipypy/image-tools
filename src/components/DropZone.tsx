import { useCallback, type ChangeEvent, type DragEvent } from 'react';
import { Upload } from 'lucide-react';
import type { ImageFile } from '../types';
import { useTranslation } from '../i18n';

interface DropZoneProps {
  onFilesDrop: (files: ImageFile[]) => void;
}

const isSupported = (file: File) =>
  file.type.startsWith('image/') || file.name.toLowerCase().endsWith('jxl');

export function DropZone({ onFilesDrop }: DropZoneProps) {
  const { t } = useTranslation();

  const toImages = (files: File[]): ImageFile[] =>
    files.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending' as const,
      originalSize: file.size,
    }));

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    onFilesDrop(toImages(Array.from(e.dataTransfer.files).filter(isSupported)));
  }, [onFilesDrop]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(isSupported);
    onFilesDrop(toImages(files));
    e.target.value = '';
  }, [onFilesDrop]);

  return (
    <div
      className="rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-12 text-center transition-colors hover:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-blue-600"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        multiple
        accept="image/*,.jxl"
        onChange={handleFileInput}
      />
      <label
        htmlFor="fileInput"
        className="flex cursor-pointer flex-col items-center gap-4"
      >
        <Upload className="h-12 w-12 text-neutral-400" />
        <div>
          <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">
            {t.dropTitle}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t.dropSubtitle}
          </p>
        </div>
      </label>
    </div>
  );
}
