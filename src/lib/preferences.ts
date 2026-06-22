import type { Preferences } from '@/types'

const PREFS_KEY = 'gawe-preferences'
const TOOL_STATE_PREFIX = 'gawe-tool-state:'

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  sidebarCollapsed: false,
  favorites: [],
  recentTools: [],
  collapsedCategories: [],
}

export function getPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  const current = getPreferences()
  const updated = { ...current, ...patch }
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  return updated
}

export function getToolState(toolId: string): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`${TOOL_STATE_PREFIX}${toolId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setToolState(toolId: string, state: Record<string, unknown>): void {
  localStorage.setItem(`${TOOL_STATE_PREFIX}${toolId}`, JSON.stringify(state))
}
