'use client'

import { useState, useCallback } from 'react'
import { getPreferences, setPreferences } from '@/lib/preferences'
import type { Preferences, CategoryId } from '@/types'

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => getPreferences())

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = setPreferences({ ...prev, ...patch })
      return next
    })
  }, [])

  const toggleFavorite = useCallback((toolId: string) => {
    setPrefs((prev) => {
      const isFav = prev.favorites.includes(toolId)
      const favorites = isFav
        ? prev.favorites.filter((id) => id !== toolId)
        : [...prev.favorites, toolId]
      return setPreferences({ ...prev, favorites })
    })
  }, [])

  const addRecent = useCallback((toolId: string) => {
    setPrefs((prev) => {
      const filtered = prev.recentTools.filter((id) => id !== toolId)
      const recentTools = [toolId, ...filtered].slice(0, 10)
      return setPreferences({ ...prev, recentTools })
    })
  }, [])

  const toggleCategory = useCallback((categoryId: CategoryId) => {
    setPrefs((prev) => {
      const collapsed = prev.collapsedCategories.includes(categoryId)
      const collapsedCategories = collapsed
        ? prev.collapsedCategories.filter((id) => id !== categoryId)
        : [...prev.collapsedCategories, categoryId]
      return setPreferences({ ...prev, collapsedCategories })
    })
  }, [])

  return { prefs, update, toggleFavorite, addRecent, toggleCategory }
}
