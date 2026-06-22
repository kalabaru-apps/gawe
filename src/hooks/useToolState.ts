'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getToolState, setToolState } from '@/lib/preferences'

export function useToolState(toolId: string) {
  const [state, setState] = useState<Record<string, unknown>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setState(getToolState(toolId))
  }, [toolId])

  const update = useCallback((patch: Record<string, unknown>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setToolState(toolId, next), 500)
      return next
    })
  }, [toolId])

  return { state, update }
}
