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
}

export function SidebarCategory({ category, collapsed, isExpanded, onToggle }: SidebarCategoryProps) {
  const tools = getToolsByCategory(category.id)

  return (
    <div>
      <button
        onClick={() => onToggle(category.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
          'hover:bg-accent',
          category.accentText,
          collapsed && 'justify-center'
        )}
        title={collapsed ? category.label : undefined}
      >
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', category.accentBg)}
          aria-hidden
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{category.label}</span>
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', !isExpanded && '-rotate-90')}
            />
          </>
        )}
      </button>
      {isExpanded && !collapsed && (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-border pl-2">
          {tools.map((tool) => (
            <SidebarItem key={tool.id} tool={tool} category={category} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}
