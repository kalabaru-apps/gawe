'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarItem } from './SidebarItem'
import { getToolsByCategory } from '@/config/tools'
import type { CategoryDefinition, CategoryId } from '@/types'

interface SidebarCategoryProps {
  category: CategoryDefinition
  collapsed: boolean
  isExpanded: boolean
  onToggle: (id: CategoryId) => void
  onNavigate?: () => void
}

export function SidebarCategory({ category, collapsed, isExpanded, onToggle, onNavigate }: SidebarCategoryProps) {
  const tools = getToolsByCategory(category.id)
  const listId = `cat-${category.id}`

  return (
    <div className="mb-1">
      <button
        onClick={() => onToggle(category.id)}
        aria-expanded={isExpanded}
        aria-controls={listId}
        title={collapsed ? category.label : undefined}
        className={cn(
          'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
          collapsed && 'justify-center px-0 max-md:justify-start max-md:px-2',
        )}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', category.accentBg)} aria-hidden />
        <span className={cn('flex-1 truncate text-left', collapsed && 'hidden max-md:inline')}>{category.label}</span>
        <span className={cn('text-xs font-normal tabular-nums text-muted-foreground', collapsed && 'hidden max-md:inline')}>{tools.length}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', !isExpanded && '-rotate-90', collapsed && 'hidden max-md:block')} aria-hidden />
      </button>
      {isExpanded && (
        <ul id={listId} className={cn('mt-0.5 space-y-0.5', collapsed && 'hidden max-md:block')}>
          {tools.map((tool) => (
            <li key={tool.id}>
              <SidebarItem tool={tool} category={category} collapsed={false} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
