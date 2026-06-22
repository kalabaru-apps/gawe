import { create } from 'zustand'

interface AppStore {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  historyDrawerToolId: string | null
  openHistoryDrawer: (toolId: string) => void
  closeHistoryDrawer: () => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  historyDrawerToolId: null,
  openHistoryDrawer: (toolId) => set({ historyDrawerToolId: toolId }),
  closeHistoryDrawer: () => set({ historyDrawerToolId: null }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}))
