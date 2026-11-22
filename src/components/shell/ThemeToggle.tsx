'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'

const NEXT = { light: 'dark', dark: 'system', system: 'light' } as const
const NAME = { light: 'Light', dark: 'Dark', system: 'System' } as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = (mounted && (theme === 'light' || theme === 'dark') ? theme : 'system') as keyof typeof NEXT
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={() => setTheme(NEXT[current])}
      aria-label={`Theme: ${NAME[current]}. Switch to ${NAME[NEXT[current]]}`}
      title={`Theme: ${NAME[current]}`}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}
