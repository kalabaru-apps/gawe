'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const cycle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <Button variant="ghost" size="icon" onClick={cycle} title="Toggle theme">
      {mounted && theme === 'light' && <Sun className="h-4 w-4" />}
      {mounted && theme === 'dark' && <Moon className="h-4 w-4" />}
      {(!mounted || theme === 'system' || !theme) && <Monitor className="h-4 w-4" />}
    </Button>
  )
}
