'use client'

import { Star, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { usePreferences } from '@/hooks/usePreferences'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface ToolHeaderProps {
  tool: ToolDefinition
  category: CategoryDefinition
}

export function ToolHeader({ tool, category }: ToolHeaderProps) {
  const { openHistoryDrawer } = useAppStore()
  const { prefs, toggleFavorite } = usePreferences()
  const isFav = prefs.favorites.includes(tool.id)

  return (
    <div className={cn('flex items-center gap-3 border-b border-border px-6 py-4 shrink-0')}>
      <div
        className={cn('h-1 w-6 rounded-full shrink-0', category.accentBg)}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold leading-tight">{tool.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{tool.description}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => toggleFavorite(tool.id)}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={cn('h-4 w-4', isFav ? category.accentText + ' fill-current' : 'text-muted-foreground')}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => openHistoryDrawer(tool.id)}
        title="View history"
      >
        <History className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
