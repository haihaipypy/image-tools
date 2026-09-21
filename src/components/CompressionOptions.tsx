import type { CompressionOptions, OutputType } from '../types';
import { useTranslation } from '../i18n';

interface CompressionOptionsProps {
  options: CompressionOptions;
  outputType: OutputType;
  onOptionsChange: (options: CompressionOptions) => void;
  onOutputTypeChange: (type: OutputType) => void;
}

export function CompressionOptions({
  options,
  outputType,
  onOptionsChange,
  onOutputTypeChange,
}: CompressionOptionsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t.outputFormat}
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(['avif', 'jpeg', 'jxl', 'png', 'webp'] as const).map((format) => (
            <button
              key={format}
              className={`rounded-lg px-4 py-2 text-sm font-medium uppercase transition ${
                outputType === format
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
              onClick={() => onOutputTypeChange(format)}
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      {outputType !== 'png' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {t.qualityLabel(options.quality)}
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={options.quality}
            onChange={(e) =>
              onOptionsChange({ quality: Number(e.target.value) })
            }
            className="w-full accent-blue-600"
          />
        </div>
      )}
    </div>
  );
}
