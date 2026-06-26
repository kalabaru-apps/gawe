import { usePreferences } from '@/hooks/usePreferences'
import { en } from './en'
import { id } from './id'

export type TranslationKey = keyof typeof en

const translations = { en, id } as const

export function useTranslation() {
  const { prefs } = usePreferences()
  const locale = prefs.locale ?? 'en'
  const dict = translations[locale] as Record<string, string>
  const enDict = en as Record<string, string>

  function t(key: string, fallback?: string): string {
    return dict[key] ?? enDict[key] ?? fallback ?? key
  }

  return { t, locale }
}
