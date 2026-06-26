import { usePreferences } from '@/hooks/usePreferences'
import { en } from './en'
import { id } from './id'

export type TranslationKey = keyof typeof en

const translations = { en, id } as const

export function useTranslation() {
  const { prefs } = usePreferences()
  const locale = prefs.locale ?? 'en'
  const dict = translations[locale]

  function t(key: TranslationKey): string {
    return dict[key] ?? en[key] ?? key
  }

  return { t, locale }
}
