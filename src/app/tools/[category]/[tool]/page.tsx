import { notFound } from 'next/navigation'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import type { CategoryId } from '@/types'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category as CategoryId)

  if (!toolDef || !categoryDef) notFound()

  return (
    <div className="flex flex-col h-full">
      <ToolHeader tool={toolDef} category={categoryDef} />
      <div className="flex-1 overflow-auto p-6">
        <ToolPlaceholder tool={toolDef} category={categoryDef} />
      </div>
    </div>
  )
}
