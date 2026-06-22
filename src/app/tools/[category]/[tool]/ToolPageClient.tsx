'use client'

import { useEffect, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import type { ToolProps, ToolDefinition, CategoryDefinition, CategoryId } from '@/types'
import { useHistory } from '@/hooks/useHistory'
import { useToolState } from '@/hooks/useToolState'
import { usePreferences } from '@/hooks/usePreferences'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'

type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>

const toolMap: Partial<Record<CategoryId, Record<string, ToolLoader>>> = {
  encoding: {
    'json-formatter': () => import('@/components/tools/encoding/JsonFormatter'),
    'json-converter': () => import('@/components/tools/encoding/DataConverter'),
    'base64': () => import('@/components/tools/encoding/Base64'),
    'url-html-encode': () => import('@/components/tools/encoding/UrlHtmlEncode'),
    'code-beautifier': () => import('@/components/tools/encoding/CodeBeautifier'),
    'case-converter': () => import('@/components/tools/encoding/CaseConverter'),
    'line-tools': () => import('@/components/tools/encoding/LineTools'),
    'string-tools': () => import('@/components/tools/encoding/StringTools'),
  },
}

interface ToolPageClientProps {
  tool: ToolDefinition
  category: CategoryDefinition
  toolSlug: string
  categorySlug: string
}

export function ToolPageClient({ tool, category, toolSlug, categorySlug }: ToolPageClientProps) {
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

  const loader = toolMap[categorySlug as CategoryId]?.[toolSlug]

  const ToolComponent = loader
    ? dynamic(loader, {
        ssr: false,
        loading: () => (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading tool…
          </div>
        ),
      })
    : null

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
