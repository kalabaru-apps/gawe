'use client'

import { useEffect, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import type { ToolProps } from '@/types'

// tldraw imports CSS — we need to load it
// tldraw's Tldraw component is SSR-incompatible
const TldrawComponent = dynamic(
  async () => {
    const { Tldraw } = await import('tldraw')
    return Tldraw
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading whiteboard…
      </div>
    ),
  }
)

export default function Whiteboard({ onOutput, initialState: _initialState }: ToolProps) {
  useEffect(() => {
    onOutput({}, { message: 'whiteboard active' })
    // Import tldraw CSS
    import('tldraw/tldraw.css').catch(() => {})
  }, [])

  return (
    <div className="w-full rounded-lg border border-input overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <TldrawComponent persistenceKey="gawe-whiteboard" />
    </div>
  )
}
