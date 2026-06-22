export type CategoryId = 'encoding' | 'crypto' | 'dev' | 'image' | 'office' | 'visual'

export interface CategoryDefinition {
  id: CategoryId
  label: string
  /** Tailwind bg class for accent — e.g. 'bg-indigo-500' */
  accentBg: string
  /** Tailwind text class for accent — e.g. 'text-indigo-400' */
  accentText: string
  /** Tailwind border class — e.g. 'border-indigo-500' */
  accentBorder: string
  /** Tailwind subtle bg — e.g. 'bg-indigo-500/10' */
  accentSubtle: string
  /** Tailwind ring class — e.g. 'ring-indigo-500/30' */
  accentRing: string
}

export interface ToolDefinition {
  id: string
  name: string
  category: CategoryId
  description: string
  /** Lucide icon name — import from lucide-react */
  icon: string
  /** URL slug — used as /tools/[category]/[tool] */
  slug: string
  /** Search keywords beyond name/description */
  keywords: string[]
}

/** Every tool component must implement this interface */
export interface ToolProps {
  /** Fire when the tool produces output — shell saves to history automatically */
  onOutput: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  /** Last session inputs restored from localStorage */
  initialState?: Record<string, unknown>
}

export interface HistoryEntry {
  id?: number  // assigned by IndexedDB; always present on retrieved entries
  toolId: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  timestamp: number
  label?: string
}

export interface SavedSession {
  id?: number
  toolId: string
  name: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  createdAt: number
}

export interface Preferences {
  theme: 'dark' | 'light' | 'system'
  sidebarCollapsed: boolean
  favorites: string[]
  recentTools: string[]
  collapsedCategories: CategoryId[]
}
