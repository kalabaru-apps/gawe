'use client'

import { usePreferences } from '@/hooks/usePreferences'
import { useTranslation } from '@/lib/i18n'

export function LocaleToggle() {
  const { prefs, update } = usePreferences()
  const locale = prefs.locale ?? 'en'
  const { t } = useTranslation()

  return (
    <button
      onClick={() => update({ locale: locale === 'en' ? 'id' : 'en' })}
      className="inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={locale === 'en' ? t('language.switch_to_id', 'Language: English. Switch to Indonesian') : t('language.switch_to_en', 'Bahasa: Indonesia. Ganti ke Bahasa Inggris')}
      title={locale === 'en' ? t('language.switch_to_id', 'Switch to Indonesian') : t('language.switch_to_en', 'Ganti ke Bahasa Inggris')}
    >
      {locale === 'en' ? 'EN' : 'ID'}
    </button>
  )
}
