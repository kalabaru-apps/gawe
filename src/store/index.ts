import { create } from 'zustand'

interface AppStore {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  historyDrawerToolId: string | null
  openHistoryDrawer: (toolId: string) => void
  closeHistoryDrawer: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  historyDrawerToolId: null,
  openHistoryDrawer: (toolId) => set({ historyDrawerToolId: toolId }),
  closeHistoryDrawer: () => set({ historyDrawerToolId: null }),
}))
