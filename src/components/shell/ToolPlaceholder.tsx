import { cn } from '@/lib/utils'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface ToolPlaceholderProps {
  tool: ToolDefinition
  category: CategoryDefinition
}

export function ToolPlaceholder({ tool, category }: ToolPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-border">
      <div className={cn('h-3 w-3 rounded-full mb-3', category.accentBg)} aria-hidden />
      <p className="text-sm font-medium">{tool.name}</p>
      <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
    </div>
  )
}
