import { useEffect } from 'react'
import { Globe } from 'lucide-react'
import { otherLanguage, switchLanguage, useTranslation } from '../i18n';

export function LanguageSwitcher() {
  const { lang, t } = useTranslation();
  const target = otherLanguage(lang);

  useEffect(() => {
    // 整页跳转后同步 <html lang>，与当前语言保持一致
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <button
      type="button"
      onClick={() => switchLanguage(target)}
      aria-label={t.switchToAria}
      title={t.switchToAria}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      <Globe className="size-4" />
      {t.switchTo}
    </button>
  );
}
