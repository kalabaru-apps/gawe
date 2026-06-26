'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen, History, Settings } from 'lucide-react'
import { LogoImage } from './LogoImage'
import { cn } from '@/lib/utils'
import { CATEGORIES, TOOLS } from '@/config/tools'
import { useAppStore } from '@/store'
import { usePreferences } from '@/hooks/usePreferences'
import { SidebarCategory } from './SidebarCategory'
import { SidebarItem } from './SidebarItem'
import { ThemeToggle } from './ThemeToggle'
import { LocaleToggle } from './LocaleToggle'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import type { CategoryId } from '@/types'

export function Sidebar() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const { setCommandPaletteOpen } = useAppStore()
  const { prefs, toggleFavorite, toggleCategory, update } = usePreferences()
  const { t } = useTranslation()
  const sidebarCollapsed = mounted ? prefs.sidebarCollapsed : false
  const setSidebarCollapsed = (collapsed: boolean) => update({ sidebarCollapsed: collapsed })
  const favTools = TOOLS.filter((t) => prefs.favorites.includes(t.id))

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-border shrink-0">
        {sidebarCollapsed ? (
          <Link href="/" className="mx-auto">
            <LogoImage size={26} />
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <LogoImage size={24} className="shrink-0" />
            <span className="font-bold text-sm tracking-tight truncate">Gawe</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search trigger */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 shrink-0">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <span>{t('nav.search')}</span>
            <kbd className="ml-auto rounded bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Favorites */}
        {favTools.length > 0 && (
          <div className="mb-2">
            {!sidebarCollapsed && (
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('nav.favorites')}
              </p>
            )}
            <div className="space-y-0.5">
              {favTools.map((tool) => {
                const cat = CATEGORIES.find((c) => c.id === tool.category)!
                return (
                  <SidebarItem
                    key={tool.id}
                    tool={tool}
                    category={cat}
                    collapsed={sidebarCollapsed}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {CATEGORIES.map((cat) => (
          <SidebarCategory
            key={cat.id}
            category={cat}
            collapsed={sidebarCollapsed}
            isExpanded={!prefs.collapsedCategories.includes(cat.id as CategoryId)}
            onToggle={toggleCategory}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-2 py-2 space-y-2">
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LocaleToggle />
          {!sidebarCollapsed && (
            <span className="text-xs text-muted-foreground ml-1">Theme & Language</span>
          )}
        </div>
        {!sidebarCollapsed && (
          <>
            <a
              href="https://saweria.co/vnctkevin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400 transition-colors"
            >
              ☕ {t('nav.support')}
            </a>
            <p className="px-1 text-[10px] text-muted-foreground/50 leading-snug">
              Free &amp; open source by{' '}
              <a
                href="https://kalabaru.id"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
              >
                KalaBaru
              </a>
              {' · '}
              <Link href="/about" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
                About
              </Link>
            </p>
          </>
        )}
      </div>
    </aside>
  )
}
