import type { CategoryId, ToolDefinition } from '@/types'
import { en } from './en'
import { id } from './id'

export type Locale = 'en' | 'id'
const dictionaries = { en, id } as const

function lookup(key: string, locale: Locale): string {
  const localized = (dictionaries[locale] as Record<string, string>)[key]
  const english = (en as Record<string, string>)[key]
  return localized ?? english ?? key
}

export function categoryName(id: CategoryId, locale: Locale): string {
  return lookup(`category.${id}.name`, locale)
}

export function categoryDescription(id: CategoryId, locale: Locale): string {
  return lookup(`category.${id}.description`, locale)
}

export function toolName(tool: ToolDefinition, locale: Locale): string {
  return lookup(`tool.${tool.id}.name`, locale)
}

export function toolDescription(tool: ToolDefinition, locale: Locale): string {
  return lookup(`tool.${tool.id}.description`, locale)
}
