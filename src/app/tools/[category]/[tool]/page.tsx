import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolPageClient } from './ToolPageClient'
import type { ToolProps, CategoryId } from '@/types'

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

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category as CategoryId)

  if (!toolDef || !categoryDef) notFound()

  const loader = toolMap[category as CategoryId]?.[tool]

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
    <ToolPageClient
      tool={toolDef}
      category={categoryDef}
      ToolComponent={ToolComponent}
    />
  )
}
