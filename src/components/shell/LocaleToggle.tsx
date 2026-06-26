'use client'

import { usePreferences } from '@/hooks/usePreferences'

export function LocaleToggle() {
  const { prefs, update } = usePreferences()
  const locale = prefs.locale ?? 'en'

  return (
    <button
      onClick={() => update({ locale: locale === 'en' ? 'id' : 'en' })}
      className="flex h-7 items-center rounded-md border border-input bg-background px-2 text-xs font-medium hover:bg-muted transition-colors"
      title={locale === 'en' ? 'Switch to Indonesian' : 'Ganti ke Bahasa Inggris'}
    >
      {locale === 'en' ? '🇺🇸 EN' : '🇮🇩 ID'}
    </button>
  )
}
