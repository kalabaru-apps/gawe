import { cn } from '@/lib/utils'
import type { ToolDefinition, CategoryDefinition } from '@/types'
import { localizedTool } from '@/config/tools'
import { useTranslation } from '@/lib/i18n'

interface ToolPlaceholderProps {
  tool: ToolDefinition
  category: CategoryDefinition
}

export function ToolPlaceholder({ tool, category }: ToolPlaceholderProps) {
  const { locale } = useTranslation()
  const localTool = localizedTool(tool, locale)
  return (
    <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-border">
      <div className={cn('h-3 w-3 rounded-full mb-3', category.accentBg)} aria-hidden />
      <p className="text-sm font-medium">{localTool.name}</p>
      <p className="text-xs text-muted-foreground mt-1">{locale === 'id' ? 'Segera hadir' : 'Coming soon'}</p>
    </div>
  )
}
