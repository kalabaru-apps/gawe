'use client'

import { Star, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { usePreferences } from '@/hooks/usePreferences'
import type { ToolDefinition, CategoryDefinition } from '@/types'
import { localizedCategory, localizedTool } from '@/config/tools'
import { useTranslation } from '@/lib/i18n'

interface ToolHeaderProps {
  tool: ToolDefinition
  category: CategoryDefinition
}

/** Sits inside the tool's data-domain region, so it takes the domain surface. */
export function ToolHeader({ tool, category }: ToolHeaderProps) {
  const { openHistoryDrawer } = useAppStore()
  const { prefs, toggleFavorite } = usePreferences()
  const { locale } = useTranslation()
  const localTool = localizedTool(tool, locale)
  const localCategory = localizedCategory(category, locale)
  const isFav = prefs.favorites.includes(tool.id)
  const btn = 'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-d text-d-muted transition-colors hover:bg-d-border/50 hover:text-d-ink focus-visible:outline-2 focus-visible:outline-d-accent'

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-d-border bg-d-raised px-4 py-2.5 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs text-d-muted">
          <span className={cn('h-1.5 w-1.5 rounded-full', category.accentBg)} aria-hidden />
          {localCategory.label}
        </p>
        <h1 className="truncate font-display text-lg font-semibold leading-tight">{localTool.name}</h1>
      </div>
      <button
        className={btn}
        onClick={() => toggleFavorite(tool.id)}
        aria-pressed={isFav}
        aria-label={locale === 'id'
          ? (isFav ? `Hapus ${localTool.name} dari favorit` : `Tambahkan ${localTool.name} ke favorit`)
          : (isFav ? `Remove ${localTool.name} from favorites` : `Add ${localTool.name} to favorites`)}
        title={locale === 'id' ? (isFav ? 'Hapus dari favorit' : 'Tambahkan ke favorit') : (isFav ? 'Remove from favorites' : 'Add to favorites')}
      >
        <Star className={cn('h-4 w-4', isFav && 'fill-current text-d-accent')} aria-hidden />
      </button>
      <button className={btn} onClick={() => openHistoryDrawer(tool.id)} aria-label={locale === 'id' ? 'Buka riwayat' : 'Open history'} title={locale === 'id' ? 'Riwayat' : 'History'}>
        <History className="h-4 w-4" aria-hidden />
      </button>
    </header>
  )
}
