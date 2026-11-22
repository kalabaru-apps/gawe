'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Star, Clock } from 'lucide-react'
import { CATEGORIES, TOOLS, localizedCategory, localizedTool } from '@/config/tools'
import { domainOf } from '@/config/domains'
import { usePreferences } from '@/hooks/usePreferences'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ToolDefinition } from '@/types'

function ToolLink({ tool, locale }: { tool: ToolDefinition; locale: 'en' | 'id' }) {
  const localTool = localizedTool(tool, locale)
  return (
    <Link
      href={`/tools/${tool.category}/${tool.slug}`}
      className="group flex flex-col gap-0.5 rounded-d border border-transparent px-3 py-2 transition-colors hover:border-d-border hover:bg-d-raised focus-visible:outline-2 focus-visible:outline-d-accent"
    >
      <span className="text-sm font-medium group-hover:text-d-accent">{localTool.name}</span>
      <span className="line-clamp-1 text-xs text-d-muted">{localTool.description}</span>
    </Link>
  )
}

export default function HomePage() {
  const { prefs } = usePreferences()
  const { t, locale } = useTranslation()
  const [q, setQ] = useState('')

  const byId = useMemo(() => new Map(TOOLS.map((tool) => [tool.id, tool])), [])
  const recents = prefs.recentTools.map((id) => byId.get(id)).filter(Boolean).slice(0, 6) as ToolDefinition[]
  const favs = prefs.favorites.map((id) => byId.get(id)).filter(Boolean) as ToolDefinition[]
  const localizedCategories = CATEGORIES.map((category) => localizedCategory(category, locale))

  const term = q.trim().toLowerCase()
  const results = term
    ? TOOLS.filter((tool) => {
        const localized = localizedTool(tool, locale)
        return `${localized.name} ${localized.description} ${tool.name} ${tool.description} ${tool.keywords.join(' ')}`.toLowerCase().includes(term)
      })
    : []

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{t('home.headline', 'What do you need to get done?')}</h1>
        <p className="mt-3 text-muted-foreground">
          {t('home.summary', '{count} tools that run in your browser. Your files and text never leave your device, and they keep working offline.').replace('{count}', String(TOOLS.length))}
        </p>
      </header>

      <div className="relative mt-6 max-w-2xl">
        <label htmlFor="home-search" className="sr-only">{t('nav.search')}</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="home-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('home.search_hint', 'Try: pdf, json, tax, timer, color')}
          className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-base placeholder:text-muted-foreground/70 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>

      {term ? (
        <section className="mt-8" aria-live="polite">
          <h2 className="mb-2 font-display text-sm font-semibold">
            {results.length} {t(results.length === 1 ? 'home.result_one' : 'home.result_many', results.length === 1 ? 'result' : 'results')}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('home.no_results', 'Nothing matches “{query}”. Try a file type or task such as “compress” or “timestamp”.').replace('{query}', q)}</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {results.map((t) => (
                <li key={t.id} data-domain={domainOf(t.category, t.id)} className="bg-transparent">
                  <ToolLink tool={t} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {(recents.length > 0 || favs.length > 0) && (
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {recents.length > 0 && (
                <section aria-labelledby="recent-h">
                  <h2 id="recent-h" className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold"><Clock className="h-4 w-4" aria-hidden />{t('home.recent', 'Recent')}</h2>
                  <ul className="grid gap-1">
                    {recents.map((t) => (
                      <li key={t.id} data-domain={domainOf(t.category, t.id)} className="bg-transparent"><ToolLink tool={t} locale={locale} /></li>
                    ))}
                  </ul>
                </section>
              )}
              {favs.length > 0 && (
                <section aria-labelledby="fav-h">
                  <h2 id="fav-h" className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold"><Star className="h-4 w-4" aria-hidden />{t('nav.favorites')}</h2>
                  <ul className="grid gap-1">
                    {favs.map((t) => (
                      <li key={t.id} data-domain={domainOf(t.category, t.id)} className="bg-transparent"><ToolLink tool={t} locale={locale} /></li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <div className="mt-10 grid gap-6">
            {localizedCategories.map((cat, i) => {
              const tools = TOOLS.filter((t) => t.category === cat.id)
              const domain = domainOf(cat.id, '')
              // Alternate the layout so the page has rhythm: list sections and two-column sections.
              const wide = i % 3 === 0
              return (
                <section
                  key={cat.id}
                  id={cat.id}
                  data-domain={domain}
                  aria-labelledby={`${cat.id}-h`}
                  className="rounded-lg border border-d-border p-5 sm:p-6"
                >
                  <div className={cn('grid gap-5', wide ? 'md:grid-cols-[14rem_1fr]' : 'md:grid-cols-[1fr_14rem] md:[&>:first-child]:order-2')}>
                    <div>
                      <h2 id={`${cat.id}-h`} className={cn('flex items-center gap-2 font-semibold', domain === 'paper' ? 'font-serif text-2xl' : domain === 'workbench' ? 'font-mono text-lg' : 'font-display text-xl')}>
                        <span className={cn('h-2.5 w-2.5 rounded-full', cat.accentBg)} aria-hidden />
                        {cat.label}
                      </h2>
                      <p className="mt-2 text-sm text-d-muted">{cat.description}</p>
                      <p className="mt-3 text-xs text-d-muted tabular-nums">{tools.length} {t('common.tools', 'tools')}</p>
                    </div>
                    <ul className="grid gap-x-2 gap-y-0.5 sm:grid-cols-2">
                      {tools.map((t) => (
                        <li key={t.id}><ToolLink tool={t} locale={locale} /></li>
                      ))}
                    </ul>
                  </div>
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
