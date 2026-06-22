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
import { CATEGORIES, TOOLS } from '@/config/tools'
import { cn } from '@/lib/utils'

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const router = useRouter()

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

  const navigate = (href: string) => {
    setCommandPaletteOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Search tools..." />
      <CommandList>
        <CommandEmpty>No tools found.</CommandEmpty>
        {CATEGORIES.map((category) => {
          const tools = TOOLS.filter((t) => t.category === category.id)
          return (
            <CommandGroup key={category.id} heading={category.label}>
              {tools.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={`${tool.name} ${tool.description} ${tool.keywords.join(' ')}`}
                  onSelect={() => navigate(`/tools/${tool.category}/${tool.slug}`)}
                >
                  <span
                    className={cn('mr-2 h-2 w-2 rounded-full shrink-0', category.accentBg)}
                    aria-hidden
                  />
                  <span className="font-medium">{tool.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground truncate">
                    {tool.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
