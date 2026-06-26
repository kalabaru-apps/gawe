'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { getPreferences, setPreferences } from '@/lib/preferences'
import type { Preferences, CategoryId } from '@/types'

interface PreferencesContextValue {
  prefs: Preferences
  update: (patch: Partial<Preferences>) => void
  toggleFavorite: (toolId: string) => void
  addRecent: (toolId: string) => void
  toggleCategory: (categoryId: CategoryId) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => getPreferences())

  const update = useCallback((patch: Partial<Preferences>) => {
    const next = setPreferences(patch)
    setPrefs(next)
  }, [])

  const toggleFavorite = useCallback((toolId: string) => {
    setPrefs((prev) => {
      const isFav = prev.favorites.includes(toolId)
      const favorites = isFav
        ? prev.favorites.filter((id) => id !== toolId)
        : [...prev.favorites, toolId]
      return setPreferences({ favorites })
    })
  }, [])

  const addRecent = useCallback((toolId: string) => {
    setPrefs((prev) => {
      const filtered = prev.recentTools.filter((id) => id !== toolId)
      const recentTools = [toolId, ...filtered].slice(0, 10)
      return setPreferences({ recentTools })
    })
  }, [])

  const toggleCategory = useCallback((categoryId: CategoryId) => {
    setPrefs((prev) => {
      const collapsed = prev.collapsedCategories.includes(categoryId)
      const collapsedCategories = collapsed
        ? prev.collapsedCategories.filter((id) => id !== categoryId)
        : [...prev.collapsedCategories, categoryId]
      return setPreferences({ collapsedCategories })
    })
  }, [])

  return (
    <PreferencesContext.Provider value={{ prefs, update, toggleFavorite, addRecent, toggleCategory }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferencesContext must be used within PreferencesProvider')
  return ctx
}
