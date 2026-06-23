import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolPageClient } from './ToolPageClient'
import type { CategoryId } from '@/types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gawe.app'

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category as CategoryId)

  if (!toolDef || !categoryDef) return {}

  const title = toolDef.name
  const description = `${toolDef.description} — free offline tool, no account needed.`
  const ogImage = `${SITE_URL}/og-image.png`
  const url = `${SITE_URL}/tools/${category}/${tool}`

  return {
    title,
    description,
    keywords: toolDef.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: `${toolDef.name} · Gawe App`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: toolDef.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${toolDef.name} · Gawe App`,
      description,
      images: [ogImage],
    },
  }
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
