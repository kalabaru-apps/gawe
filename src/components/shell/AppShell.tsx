'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, Search } from 'lucide-react'
import { ThemeProvider } from 'next-themes'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { useAppStore } from '@/store'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { HistoryDrawer } from './HistoryDrawer'
import { LogoImage } from './LogoImage'

function Frame({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)
  const pathname = usePathname()
  const { setCommandPaletteOpen } = useAppStore()

  // Close the drawer after navigating.
  useEffect(() => setNavOpen(false), [pathname])
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Phone: slide-over navigation */}
      {navOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 cursor-pointer bg-black/50 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}
      <div
        className={
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:z-auto md:translate-x-0 ' +
          (navOpen ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <Sidebar onNavigate={() => setNavOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Phone top bar */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold">
            <LogoImage size={22} />
            Gawe
          </Link>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Search tools"
            className="ml-auto inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>

      <CommandPalette />
      <HistoryDrawer />
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Frame>{children}</Frame>
      </ThemeProvider>
    </PreferencesProvider>
  )
}
