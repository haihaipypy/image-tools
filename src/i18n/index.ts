import { useMemo } from 'react';
import { en, type Translation } from './locales/en';
import { zhCN } from './locales/zh-CN';

export type Language = 'en' | 'zh-CN';

export const LOCALES: { code: Language; label: string }[] = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
];

/** URL 中英文版的路径前缀，如 '/en'；中文版为根路径，无前缀 */
const EN_PREFIX = '/en';

const TRANSLATIONS: Record<Language, Translation> = {
  en,
  'zh-CN': zhCN,
};

// 站点根 URL（用于 canonical/hreflang，可按实际部署域名调整）
export const SITE_ORIGIN = 'https://image-tools.example.com';

/**
 * 根据浏览器路径判断当前语言（中文为默认）：
 *   /en  或 /en/...      → 英文
 *   其余（/、/zh-CN/...、/blog/...）→ 中文
 */
export function getLanguageFromPath(pathname: string): Language {
  const path = pathname.replace(/\/+$/, '');
  return path === EN_PREFIX || path.startsWith(EN_PREFIX + '/') ? 'en' : 'zh-CN';
}

/** 返回当前语言对应的 URL 路径前缀：英文为 '/en'，中文（根路径）为 '' */
export function languagePrefix(lang: Language): string {
  return lang === 'en' ? EN_PREFIX : '';
}

/** 当前语言的另一语言，用于切换 */
export function otherLanguage(lang: Language): Language {
  return lang === 'en' ? 'zh-CN' : 'en';
}

/**
 * React hook：根据 window.location.pathname 返回当前语言的文案对象。
 * 由于语言切换走整页跳转，pathname 在挂载后即固定，无需监听变化。
 */
export function useTranslation(): { lang: Language; t: Translation } {
  const lang = useMemo(
    () => getLanguageFromPath(window.location.pathname),
    []
  );
  return { lang, t: TRANSLATIONS[lang] };
}

/**
 * 切换到目标语言：整页跳转到对应 URL。
 * 同页面切换为整页跳转，使浏览器加载新的 HTML（含对应语言的 meta），
 * 对 SEO 友好——爬虫与真实用户拿到的是同语言版本的 HTML。
 */
export function switchLanguage(target: Language): void {
  const current = getLanguageFromPath(window.location.pathname);
  if (target === current) return;

  // 保留其余路径与 query/hash，仅替换语言前缀
  const { pathname, search, hash } = window.location;
  // 先剥掉已有的语言前缀（英文 /en 或旧版中文 /zh-CN），得到语言无关的路径
  const rest = pathname
    .replace(/^\/en(\/|$)/, '$1')
    .replace(/^\/zh-CN(\/|$)/, '$1');
  const targetPath = languagePrefix(target) + rest;
  window.location.href = targetPath + search + hash;
}
