'use client'

import { useState, useEffect, useCallback } from 'react'
import { addHistory, getHistory, labelHistory, deleteHistory, clearHistory } from '@/lib/db'
import type { HistoryEntry } from '@/types'

export function useHistory(toolId: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  const load = useCallback(async () => {
    const data = await getHistory(toolId)
    setEntries(data)
  }, [toolId])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    await addHistory({ toolId, inputs, outputs, timestamp: Date.now() })
    await load()
  }, [toolId, load])

  const label = useCallback(async (id: number | undefined, text: string) => {
    if (!id) return
    await labelHistory(id, text)
    await load()
  }, [load])

  const remove = useCallback(async (id: number | undefined) => {
    if (!id) return
    await deleteHistory(id)
    await load()
  }, [load])

  const clear = useCallback(async () => {
    await clearHistory(toolId)
    await load()
  }, [toolId, load])

  return { entries, add, label, remove, clear, reload: load }
}
