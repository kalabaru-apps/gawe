'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { analytics } from '@/lib/analytics'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface SidebarItemProps {
  tool: ToolDefinition
  category: CategoryDefinition
  collapsed: boolean
  onNavigate?: () => void
}

export function SidebarItem({ tool, category, collapsed, onNavigate }: SidebarItemProps) {
  const pathname = usePathname()
  const href = `/tools/${tool.category}/${tool.slug}`
  const isActive = pathname === href

  return (
    <Link
      href={href}
      title={collapsed ? tool.name : undefined}
      aria-current={isActive ? 'page' : undefined}
      onClick={() => { analytics.toolSidebarClick(tool.category, tool.slug); onNavigate?.() }}
      className={cn(
        'flex h-8 items-center gap-2 rounded-md pl-6 pr-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring',
        isActive ? 'bg-foreground font-medium text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-0',
      )}
    >
      {collapsed ? (
        <span className={cn('h-2 w-2 rounded-full', category.accentBg)} aria-hidden />
      ) : (
        <span className="truncate">{tool.name}</span>
      )}
    </Link>
  )
}
