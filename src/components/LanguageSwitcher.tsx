import React, { useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation, otherLanguage, switchLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { lang, t } = useTranslation();
  const target = otherLanguage(lang);
  // 仅用于满足 lint 对未使用 ref 的检查，并避免重复跳转
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // 占位：未来可在此根据语言切换 <html lang> / 文档标题
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => switchLanguage(target)}
      aria-label={t.switchToAria}
      title={t.switchToAria}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      <Globe className="w-4 h-4" />
      {t.switchTo}
    </button>
  );
}
