/* Analytics — Umami JS SDK + Umami pixel tracking.
   Both are safe to call on server or before scripts load (no-ops). */

declare global {
  interface Window {
    umami?: {
      track(eventName: string, data?: Record<string, unknown>): void
    }
  }
}

// ─── JS SDK track (requires Umami script loaded) ──────────────────────────────
export function track(event: string, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!window.umami) return
  window.umami.track(event, data)
}

// ─── Pixel track (fires a GET image request — no SDK required) ───────────────
const PIXEL_URL = typeof process !== 'undefined'
  ? process.env.NEXT_PUBLIC_UMAMI_PIXEL_URL ?? ''
  : ''

function pixel(eventName: string, data?: Record<string, string>) {
  if (typeof window === 'undefined' || !PIXEL_URL) return
  const params = new URLSearchParams({
    url: window.location.pathname,
    title: document.title,
    referrer: document.referrer,
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    event: eventName,
    ...data,
  })
  // Use an Image beacon — fires as a GET, no CORS preflight, no response needed
  new Image().src = `${PIXEL_URL}?${params.toString()}`
}

// ─── Combined helpers (both JS + pixel) ──────────────────────────────────────
export const analytics = {
  toolView(category: string, tool: string) {
    track('tool_view', { category, tool })
    pixel('tool_view', { category, tool })
  },
  toolUse(category: string, tool: string) {
    track('tool_use', { category, tool })
    pixel('tool_use', { category, tool })
  },
  toolSidebarClick(category: string, tool: string) {
    track('tool_sidebar_click', { category, tool })
    pixel('tool_sidebar_click', { category, tool })
  },
  search(query: string, resultCount: number) {
    track('tool_search', { query: query.slice(0, 60), resultCount })
    pixel('tool_search', { query: query.slice(0, 60), resultCount: String(resultCount) })
  },
  favorite(tool: string, added: boolean) {
    track('tool_favorite', { tool, action: added ? 'add' : 'remove' })
    pixel('tool_favorite', { tool, action: added ? 'add' : 'remove' })
  },
}
