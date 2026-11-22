'use client'

import { usePreferences } from '@/hooks/usePreferences'

export function LocaleToggle() {
  const { prefs, update } = usePreferences()
  const locale = prefs.locale ?? 'en'

  return (
    <button
      onClick={() => update({ locale: locale === 'en' ? 'id' : 'en' })}
      className="inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      aria-label={locale === 'en' ? 'Language: English. Switch to Indonesian' : 'Bahasa: Indonesia. Ganti ke Bahasa Inggris'}
      title={locale === 'en' ? 'Switch to Indonesian' : 'Ganti ke Bahasa Inggris'}
    >
      {locale === 'en' ? 'EN' : 'ID'}
    </button>
  )
}
