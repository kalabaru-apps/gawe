'use client'

import { useState, useEffect, useCallback } from 'react'
import { addSaved, getSaved, deleteSaved } from '@/lib/db'
import type { SavedSession } from '@/types'

export function useSaved(toolId: string) {
  const [sessions, setSessions] = useState<SavedSession[]>([])

  const load = useCallback(async () => {
    const data = await getSaved(toolId)
    setSessions(data)
  }, [toolId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (
    name: string,
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    await addSaved({ toolId, name, inputs, outputs, createdAt: Date.now() })
    await load()
  }, [toolId, load])

  const remove = useCallback(async (id: number) => {
    await deleteSaved(id)
    await load()
  }, [load])

  return { sessions, save, remove, reload: load }
}
