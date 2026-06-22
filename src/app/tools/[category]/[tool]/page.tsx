import { notFound } from 'next/navigation'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolPageClient } from './ToolPageClient'
import type { CategoryId } from '@/types'

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category as CategoryId)

  if (!toolDef || !categoryDef) notFound()

  return (
    <ToolPageClient
      tool={toolDef}
      category={categoryDef}
      toolSlug={tool}
      categorySlug={category}
    />
  )
}
