'use client'

import { formatDistanceToNow } from 'date-fns'
import { X, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store'
import { useHistory } from '@/hooks/useHistory'
import { TOOLS, localizedTool } from '@/config/tools'
import { useTranslation } from '@/lib/i18n'

export function HistoryDrawer() {
  const { historyDrawerToolId, closeHistoryDrawer } = useAppStore()
  const { t, locale } = useTranslation()
  const open = historyDrawerToolId !== null
  const toolId = historyDrawerToolId ?? ''
  const { entries, remove, clear } = useHistory(toolId)
  const foundTool = TOOLS.find((t) => t.id === toolId)
  const tool = foundTool ? localizedTool(foundTool, locale) : undefined

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeHistoryDrawer()}>
      <SheetContent side="right" className="w-80 flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm">
              {t('nav.history_for', 'History: {tool}').replace('{tool}', tool?.name ?? '')}
            </SheetTitle>
            <div className="flex gap-1">
              {entries.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => clear()}
                  title={t('nav.clear_history_confirm', 'Clear all history')} aria-label={t('nav.clear_history_confirm', 'Clear all history')}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={closeHistoryDrawer}
                aria-label={t('nav.close_history', 'Close history')}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('nav.history_empty_hint', 'Run the tool to save entries here.')}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div key={entry.id} className="px-4 py-3 group hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {entry.label && (
                        <Badge variant="secondary" className="mb-1 text-xs">
                          {entry.label}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </p>
                      <p className="text-xs font-mono mt-1 truncate text-foreground/70">
                        {JSON.stringify(entry.inputs).slice(0, 60)}…
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => entry.id && remove(entry.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
