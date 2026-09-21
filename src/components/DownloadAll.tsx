import { Download } from 'lucide-react';
import { useTranslation } from '../i18n';

interface DownloadAllProps {
  onDownloadAll: () => void;
  count: number;
}

export function DownloadAll({ onDownloadAll, count }: DownloadAllProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onDownloadAll}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
    >
      <Download className="h-5 w-5" />
      {t.downloadAllCount(count)}
    </button>
  );
}
