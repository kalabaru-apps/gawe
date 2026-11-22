'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useAppStore } from '@/store'
import { CATEGORIES, TOOLS, localizedCategory, localizedTool } from '@/config/tools'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { analytics } from '@/lib/analytics'

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const router = useRouter()
  const { t, locale } = useTranslation()
  const categories = CATEGORIES.map((category) => localizedCategory(category, locale))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  const navigate = (href: string, tool?: { category: string; slug: string }) => {
    setCommandPaletteOpen(false)
    if (tool) analytics.toolSidebarClick(tool.category, tool.slug)
    router.push(href)
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder={t('nav.search')} />
      <CommandList>
        <CommandEmpty>{locale === 'id' ? 'Alat tidak ditemukan.' : 'No tools found.'}</CommandEmpty>
        {categories.map((category) => {
          const tools = TOOLS.filter((t) => t.category === category.id)
          return (
            <CommandGroup key={category.id} heading={category.label}>
              {tools.map((tool) => {
                const localTool = localizedTool(tool, locale)
                return (
                <CommandItem
                  key={tool.id}
                  value={`${localTool.name} ${localTool.description} ${tool.name} ${tool.description} ${tool.keywords.join(' ')}`}
                  onSelect={() => navigate(`/tools/${tool.category}/${tool.slug}`, { category: tool.category, slug: tool.slug })}
                >
                  <span
                    className={cn('mr-2 h-2 w-2 rounded-full shrink-0', category.accentBg)}
                    aria-hidden
                  />
                  <span className="font-medium">{localTool.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground truncate">
                    {localTool.description}
                  </span>
                </CommandItem>
              )})}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
