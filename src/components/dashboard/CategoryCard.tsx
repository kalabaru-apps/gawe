import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getToolsByCategory } from '@/config/tools'
import type { CategoryDefinition } from '@/types'

interface CategoryCardProps {
  category: CategoryDefinition
}

export function CategoryCard({ category }: CategoryCardProps) {
  const tools = getToolsByCategory(category.id)

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md',
        'ring-1 ring-transparent hover:ring-1',
        `hover:${category.accentRing}`
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('h-3 w-3 rounded-full shrink-0', category.accentBg)} aria-hidden />
        <h2 className={cn('font-semibold text-sm', category.accentText)}>
          {category.label}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">{tools.length} tools</span>
      </div>
      <div className="space-y-1">
        {tools.slice(0, 5).map((tool) => (
          <Link
            key={tool.id}
            href={`/tools/${tool.category}/${tool.slug}`}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', category.accentBg)} aria-hidden />
            {tool.name}
          </Link>
        ))}
        {tools.length > 5 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            +{tools.length - 5} more
          </p>
        )}
      </div>
    </div>
  )
}
