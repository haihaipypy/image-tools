import { useCallback, useEffect, useState } from 'react'
import { BookOpen, BookText, Image as ImageIcon, Scissors, Sparkles } from 'lucide-react'
import { CompressWorkbench } from './components/compress/CompressWorkbench'
import { CutoutWorkbench } from './components/cutout/CutoutWorkbench'
import { GithubIcon } from './components/GithubIcon'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { UpscaleWorkbench } from './components/upscale/UpscaleWorkbench'
import { languagePrefix, useTranslation } from './i18n'

type Tool = 'compress' | 'upscale' | 'cutout'

const PATHS: Record<Tool, string> = {
  compress: '/',
  upscale: '/upscale/',
  cutout: '/cutout/',
}

const TOOLS = Object.keys(PATHS) as Tool[]

/** 源码仓库，页头的 GitHub 图标与文档站的页脚共用 */
const GITHUB_URL = 'https://github.com/haihaipypy/image-tools'

/**
 * hash 优先（站内切换标签时写它），路径兜底（/upscale/ 这类独立入口进来时用）。
 */
function resolveTool(): Tool {
  const hash = window.location.hash.slice(1)
  const fromHash = TOOLS.find((tool) => tool === hash)
  if (fromHash) return fromHash
  const fromPath = TOOLS.find((tool) => tool !== 'compress' && new RegExp(`/${tool}/?$`).test(window.location.pathname))
  return fromPath ?? 'compress'
}

export function App() {
  const { lang, t } = useTranslation()
  const [tool, setTool] = useState<Tool>(resolveTool)

  useEffect(() => {
    const onHashChange = () => setTool(resolveTool())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const switchTool = useCallback(
    (next: Tool) => {
      setTool(next)
      // 顺手把路径改成语义化的那个，但不整页跳转 —— 三个工具共用同一份 bundle，
      // 切换应当是瞬时的。history.replaceState 不进历史栈，避免退格键要走两步。
      const prefix = languagePrefix(lang)
      window.history.replaceState(null, '', `${prefix}${PATHS[next]}`)
    },
    [lang],
  )

  const blogHref = `${languagePrefix(lang)}/blog/`
  const docsHref = `${languagePrefix(lang)}/docs/`

  const tabs = [
    { id: 'compress' as const, label: t.compressTool, desc: t.compressToolDesc, Icon: ImageIcon },
    { id: 'upscale' as const, label: t.upscaleTool, desc: t.upscaleToolDesc, Icon: Sparkles },
    { id: 'cutout' as const, label: t.cutoutTool, desc: t.cutoutToolDesc, Icon: Scissors },
  ]

  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <ImageIcon className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium">{t.brand}</p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {t.compressToolDesc} · {t.upscaleToolDesc} · {t.cutoutToolDesc}
              </p>
            </div>
          </div>

          <nav
            aria-label={t.toolNavAria}
            className="order-last flex w-full items-center gap-1 rounded-full bg-neutral-100 p-1 sm:order-none sm:w-auto dark:bg-neutral-900"
          >
            {tabs.map(({ id, label, desc, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTool(id)}
                title={desc}
                aria-current={tool === id ? 'page' : undefined}
                className={[
                  'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition sm:flex-none',
                  tool === id
                    ? 'bg-white text-blue-700 shadow-sm dark:bg-neutral-800 dark:text-blue-300'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
                ].join(' ')}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href={docsHref}
              title={t.docsLinkAria}
              aria-label={t.docsLinkAria}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
              <BookText className="size-4" />
              <span className="hidden sm:inline">{t.docsLink}</span>
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t.githubLinkAria}
              aria-label={t.githubLinkAria}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
            >
              <GithubIcon className="size-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tool === 'compress' && <CompressWorkbench />}
        {tool === 'upscale' && <UpscaleWorkbench />}
        {tool === 'cutout' && <CutoutWorkbench />}
      </main>

      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 sm:px-6">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
          {t.tagline}
        </p>

        <a
          href={blogHref}
          className="group flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-blue-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-700"
        >
          <BookOpen className="size-7 flex-shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t.blogCardTitle}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.blogCardDesc}</p>
          </div>
          <span className="text-sm font-medium whitespace-nowrap text-blue-600 transition-transform group-hover:translate-x-0.5">
            {t.blogCardCta} →
          </span>
        </a>

        <footer className="border-t border-neutral-200 pt-6 text-center text-sm text-neutral-400 dark:border-neutral-800 dark:text-neutral-600">
          <div className="mb-4 flex items-center justify-center gap-2">
            <a
              href={docsHref}
              title={t.docsLinkAria}
              aria-label={t.docsLinkAria}
              className="inline-flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-blue-700 dark:hover:text-blue-400"
            >
              <BookText className="size-4" />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t.githubLinkAria}
              aria-label={t.githubLinkAria}
              className="inline-flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-blue-700 dark:hover:text-blue-400"
            >
              <GithubIcon className="size-4" />
            </a>
            <a
              href={blogHref}
              title={t.blogCardTitle}
              aria-label={t.blogCardTitle}
              className="inline-flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-blue-700 dark:hover:text-blue-400"
            >
              <BookOpen className="size-4" />
            </a>
          </div>
          <span>{t.footerBefore}</span>
          <a
            href="https://blog.1day.vip/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {t.footerLink}
          </a>
          <span>{t.footerAfter}</span>
        </footer>
      </div>
    </div>
  )
}
