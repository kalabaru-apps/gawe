/* Thin wrapper around Umami's window.umami.track API.
   Safe to call server-side or before the script loads — both cases no-op. */

declare global {
  interface Window {
    umami?: {
      track(eventName: string, data?: Record<string, unknown>): void
    }
  }
}

export function track(event: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!window.umami) return
  window.umami.track(event, data)
}

// Convenience helpers used across the app
export const analytics = {
  toolView(category: string, tool: string) {
    track('tool_view', { category, tool })
  },
  toolUse(category: string, tool: string) {
    track('tool_use', { category, tool })
  },
  toolSidebarClick(category: string, tool: string) {
    track('tool_sidebar_click', { category, tool })
  },
  search(query: string, resultCount: number) {
    track('tool_search', { query: query.slice(0, 60), resultCount })
  },
  favorite(tool: string, added: boolean) {
    track('tool_favorite', { tool, action: added ? 'add' : 'remove' })
  },
}
