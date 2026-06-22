'use client'

import { useEffect, type ComponentType } from 'react'
import type { ToolProps } from '@/types'
import type { ToolDefinition, CategoryDefinition } from '@/types'
import { useHistory } from '@/hooks/useHistory'
import { useToolState } from '@/hooks/useToolState'
import { usePreferences } from '@/hooks/usePreferences'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'

interface ToolPageClientProps {
  tool: ToolDefinition
  category: CategoryDefinition
  ToolComponent: ComponentType<ToolProps> | null
}

export function ToolPageClient({ tool, category, ToolComponent }: ToolPageClientProps) {
  const { add: addHistory } = useHistory(tool.id)
  const { state: toolState, update: updateToolState } = useToolState(tool.id)
  const { addRecent } = usePreferences()

  useEffect(() => {
    addRecent(tool.id)
  }, [tool.id, addRecent])

  const handleOutput = (
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    addHistory(inputs, outputs)
    updateToolState(inputs)
  }

  return (
    <div className="flex flex-col h-full">
      <ToolHeader tool={tool} category={category} />
      <div className="flex-1 overflow-auto p-6">
        {ToolComponent ? (
          <ToolComponent
            onOutput={handleOutput}
            initialState={Object.keys(toolState).length > 0 ? toolState : undefined}
          />
        ) : (
          <ToolPlaceholder tool={tool} category={category} />
        )}
      </div>
    </div>
  )
}
