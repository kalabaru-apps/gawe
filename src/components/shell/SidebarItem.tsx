'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface SidebarItemProps {
  tool: ToolDefinition
  category: CategoryDefinition
  collapsed: boolean
}

export function SidebarItem({ tool, category, collapsed }: SidebarItemProps) {
  const pathname = usePathname()
  const href = `/tools/${tool.category}/${tool.slug}`
  const isActive = pathname === href

  return (
    <Link
      href={href}
      title={collapsed ? tool.name : undefined}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && [
          category.accentSubtle,
          category.accentText,
          'font-medium',
        ],
        !isActive && 'text-muted-foreground',
        collapsed && 'justify-center px-0'
      )}
    >
      <span className={cn('shrink-0 text-base', isActive && category.accentText)}>
        {/* Icon rendered by parent via lucide-react dynamic lookup */}
        <span className="h-4 w-4 inline-block" aria-hidden>•</span>
      </span>
      {!collapsed && <span className="truncate">{tool.name}</span>}
    </Link>
  )
}
