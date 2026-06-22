'use client'

import { ThemeProvider } from 'next-themes'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { HistoryDrawer } from './HistoryDrawer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <CommandPalette />
        <HistoryDrawer />
      </div>
    </ThemeProvider>
  )
}
