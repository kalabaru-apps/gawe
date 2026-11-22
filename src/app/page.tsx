'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Star, Clock } from 'lucide-react'
import { CATEGORIES, TOOLS } from '@/config/tools'
import { domainOf } from '@/config/domains'
import { usePreferences } from '@/hooks/usePreferences'
import { cn } from '@/lib/utils'
import type { ToolDefinition } from '@/types'

const BLURB: Record<string, string> = {
  encoding: 'Paste text or data, get it formatted, converted or cleaned up.',
  crypto: 'Hashes, tokens, passwords and codes. Nothing is sent anywhere.',
  dev: 'Small utilities for the things you look up every week.',
  image: 'Drop a file, set a few options, download the result.',
  office: 'Documents, timers, calculators and sheets for the working day.',
  visual: 'Canvas tools for diagrams, colors and layout.',
  education: 'Worked solutions and calculators for coursework.',
}

function ToolLink({ tool }: { tool: ToolDefinition }) {
  return (
    <Link
      href={`/tools/${tool.category}/${tool.slug}`}
      className="group flex flex-col gap-0.5 rounded-d border border-transparent px-3 py-2 transition-colors hover:border-d-border hover:bg-d-raised focus-visible:outline-2 focus-visible:outline-d-accent"
    >
      <span className="text-sm font-medium group-hover:text-d-accent">{tool.name}</span>
      <span className="line-clamp-1 text-xs text-d-muted">{tool.description}</span>
    </Link>
  )
}

export default function HomePage() {
  const { prefs } = usePreferences()
  const [q, setQ] = useState('')

  const byId = useMemo(() => new Map(TOOLS.map((t) => [t.id, t])), [])
  const recents = prefs.recentTools.map((id) => byId.get(id)).filter(Boolean).slice(0, 6) as ToolDefinition[]
  const favs = prefs.favorites.map((id) => byId.get(id)).filter(Boolean) as ToolDefinition[]

  const term = q.trim().toLowerCase()
  const results = term
    ? TOOLS.filter((t) => `${t.name} ${t.description} ${t.keywords.join(' ')}`.toLowerCase().includes(term))
    : []

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">What do you need to get done?</h1>
        <p className="mt-3 text-muted-foreground">
          {TOOLS.length} tools that run in your browser. Your files and text never leave your device, and they keep working offline.
        </p>
      </header>

      <div className="relative mt-6 max-w-2xl">
        <label htmlFor="home-search" className="sr-only">Search tools</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="home-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try: pdf, json, tax, timer, color"
          className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-base placeholder:text-muted-foreground/70 focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>

      {term ? (
        <section className="mt-8" aria-live="polite">
          <h2 className="mb-2 font-display text-sm font-semibold">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing matches &ldquo;{q}&rdquo;. Try a file type or a task, like &ldquo;compress&rdquo; or &ldquo;timestamp&rdquo;.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {results.map((t) => (
                <li key={t.id} data-domain={domainOf(t.category, t.id)} className="bg-transparent">
                  <ToolLink tool={t} />
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
                  <h2 id="recent-h" className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold"><Clock className="h-4 w-4" aria-hidden />Recent</h2>
                  <ul className="grid gap-1">
                    {recents.map((t) => (
                      <li key={t.id} data-domain={domainOf(t.category, t.id)} className="bg-transparent"><ToolLink tool={t} /></li>
                    ))}
                  </ul>
                </section>
              )}
              {favs.length > 0 && (
                <section aria-labelledby="fav-h">
                  <h2 id="fav-h" className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold"><Star className="h-4 w-4" aria-hidden />Favorites</h2>
                  <ul className="grid gap-1">
                    {favs.map((t) => (
                      <li key={t.id} data-domain={domainOf(t.category, t.id)} className="bg-transparent"><ToolLink tool={t} /></li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          <div className="mt-10 grid gap-6">
            {CATEGORIES.map((cat, i) => {
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
                      <p className="mt-2 text-sm text-d-muted">{BLURB[cat.id]}</p>
                      <p className="mt-3 text-xs text-d-muted tabular-nums">{tools.length} tools</p>
                    </div>
                    <ul className="grid gap-x-2 gap-y-0.5 sm:grid-cols-2">
                      {tools.map((t) => (
                        <li key={t.id}><ToolLink tool={t} /></li>
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
