'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { ToolProps } from '@/types'

const TldrawComponent = dynamic(
  () => import('tldraw').then((m) => ({ default: m.Tldraw })),
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
  // onOutput intentionally excluded — stable via useCallback in ToolPageClient
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="w-full rounded-lg border border-input overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <TldrawComponent persistenceKey="gawe-whiteboard" />
    </div>
  )
}
