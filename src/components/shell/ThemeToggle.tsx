'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

const NEXT = { light: 'dark', dark: 'system', system: 'light' } as const
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const current = (mounted && (theme === 'light' || theme === 'dark') ? theme : 'system') as keyof typeof NEXT
  const names = { light: t('theme.light', 'Light theme'), dark: t('theme.dark', 'Dark theme'), system: t('theme.system', 'System theme') }
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor

  return (
    <button
      onClick={() => setTheme(NEXT[current])}
      aria-label={`${names[current]}. ${t('theme.switch_to', 'Switch theme')}: ${names[NEXT[current]]}`}
      title={names[current]}
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}
