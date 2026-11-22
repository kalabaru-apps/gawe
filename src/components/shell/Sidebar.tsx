'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen, Search, Coffee } from 'lucide-react'
import { LogoImage } from './LogoImage'
import { cn } from '@/lib/utils'
import { CATEGORIES, TOOLS } from '@/config/tools'
import { SUPPORT_URL } from '@/config/site'
import { useAppStore } from '@/store'
import { usePreferences } from '@/hooks/usePreferences'
import { SidebarCategory } from './SidebarCategory'
import { SidebarItem } from './SidebarItem'
import { ThemeToggle } from './ThemeToggle'
import { LocaleToggle } from './LocaleToggle'
import { useTranslation } from '@/lib/i18n'
import type { CategoryId } from '@/types'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { setCommandPaletteOpen } = useAppStore()
  const { prefs, toggleCategory, update } = usePreferences()
  const { t } = useTranslation()
  // The drawer on phones is always expanded; collapse is a desktop affordance.
  const collapsed = mounted ? prefs.sidebarCollapsed : false
  const favTools = TOOLS.filter((tool) => prefs.favorites.includes(tool.id))

  return (
    <aside
      aria-label="Tools"
      className={cn(
        'flex h-dvh flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-14 max-md:w-72' : 'w-64',
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-3">
        <Link href="/" onClick={onNavigate} className={cn('flex min-w-0 items-center gap-2', collapsed && 'mx-auto max-md:mx-0')} aria-label="Gawe home">
          <LogoImage size={24} className="shrink-0" />
          <span className={cn('font-display text-lg font-semibold tracking-tight', collapsed && 'max-md:inline hidden')}>Gawe</span>
        </Link>
        <button
          onClick={() => update({ sidebarCollapsed: !collapsed })}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn('inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-md:hidden', collapsed && 'hidden')}
        >
          <PanelLeftClose className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => update({ sidebarCollapsed: false })}
          aria-label="Expand sidebar"
          className="mx-auto mb-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-md:hidden"
        >
          <PanelLeftOpen className="h-4 w-4" aria-hidden />
        </button>
      )}

      <div className="shrink-0 px-3 pb-2">
        <button
          onClick={() => { setCommandPaletteOpen(true); onNavigate?.() }}
          aria-label={t('nav.search')}
          className={cn(
            'flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
            collapsed && 'justify-center px-0 max-md:justify-start max-md:px-2.5',
          )}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className={cn('truncate', collapsed && 'hidden max-md:inline')}>{t('nav.search')}</span>
          <kbd className={cn('ml-auto rounded border border-border px-1.5 font-mono text-[10px]', collapsed && 'hidden', 'max-md:hidden')}>Ctrl K</kbd>
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Tool categories">
        {favTools.length > 0 && (
          <div className="mb-3">
            <h2 className={cn('px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground', collapsed && 'hidden max-md:block')}>{t('nav.favorites')}</h2>
            <ul className="space-y-0.5">
              {favTools.map((tool) => (
                <li key={tool.id}>
                  <SidebarItem tool={tool} category={CATEGORIES.find((c) => c.id === tool.category)!} collapsed={collapsed} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {CATEGORIES.map((cat) => (
          <SidebarCategory
            key={cat.id}
            category={cat}
            collapsed={collapsed}
            isExpanded={!prefs.collapsedCategories.includes(cat.id as CategoryId)}
            onToggle={toggleCategory}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 border-t border-border p-2">
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col max-md:flex-row')}>
          <ThemeToggle />
          <LocaleToggle />
          <Link
            href="/about"
            onClick={onNavigate}
            className={cn('ml-auto rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring', collapsed && 'hidden max-md:inline')}
          >
            {t('nav.about')}
          </Link>
        </div>
        {SUPPORT_URL && (
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('nav.support')}
            title={t('nav.support')}
            className={cn(
              'flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
            )}
          >
            <Coffee className="h-4 w-4 shrink-0" aria-hidden />
            <span className={cn(collapsed && 'hidden max-md:inline')}>{t('nav.support')}</span>
          </a>
        )}
      </div>
    </aside>
  )
}
