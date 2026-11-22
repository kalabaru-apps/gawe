'use client'

import Image from 'next/image'
import { TOOLS, CATEGORIES, localizedCategory, localizedTool } from '@/config/tools'
import { SUPPORT_URL } from '@/config/site'
import { useTranslation } from '@/lib/i18n'

export default function AboutContent() {
  const { t, locale } = useTranslation()
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-12">

      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{t('about.title', 'About Gawe')}</h1>
        <p className="text-muted-foreground leading-relaxed">
          {t('about.intro', 'Gawe is a collection of {count} tools.').replace('{count}', String(TOOLS.length))}
        </p>
      </div>

      {/* Principles */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('about.principles', 'Our principles')}</h2>
        <div className="grid gap-3">
          {[
            {
              title: t('about.free_title', 'Free to use'),
              body: t('about.free_body', 'Every tool is free to use, with no paywalls, subscriptions, or premium tiers.'),
            },
            {
              title: t('about.privacy_title', 'Your data stays yours'),
              body: t('about.privacy_body', 'Your inputs never leave your device. Everything runs in your browser; Gawe does not store your content on a server.'),
            },
            {
              title: t('about.offline_title', 'Works offline'),
              body: t('about.offline_body', 'Install Gawe as a PWA to use it without an internet connection.'),
              image: '/images/works-offline.png',
            },
            {
              title: t('about.account_title', 'No account needed'),
              body: t('about.account_body', 'Open the app and start working. No sign-up, email, or OAuth required.'),
            },
          ].map(({ title, body, image }) => (
            <div key={title} className="rounded-lg border border-border bg-card px-4 py-3 space-y-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              {image && (
                <Image
                  src={image}
                  alt={t('about.install_alt', 'How to install Gawe as a PWA')}
                  width={600}
                  height={400}
                  className="mt-2 rounded-md border border-border w-full h-auto"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{t('about.included', "What's included")}</h2>
        <div className="space-y-2">
          {CATEGORIES.map((category) => {
            const cat = localizedCategory(category, locale)
            const tools = TOOLS.filter((tool) => tool.category === cat.id).map((tool) => localizedTool(tool, locale))
            return (
              <div key={cat.id} className="flex items-start gap-3">
                <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${cat.accentBg}`} />
                <div>
                  <p className="text-sm font-medium">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tools.map((t) => t.name).join(', ')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Made by */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{t('about.made_by', 'Made by')}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('about.made_before', 'Gawe is built and maintained by ')}
          <a
            href="https://kalabaru.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-amber-500 transition-colors"
          >
            KalaBaru
          </a>
          {t('about.made_after', ', a creative and IT studio from Indonesia. We build tools and services for developers and creators.')}
        </p>
      </div>

      {/* Open source */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{t('about.open_source', 'Open source')}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('about.open_before_license', 'Gawe is released under the ')}
          <a href="https://github.com/kalabaru-apps/gawe/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-amber-500 transition-colors">MIT License</a>
          {t('about.open_between_links', '. Use it, fork it, host it yourself, or include it in your project. The source code is on ')}
          <a href="https://github.com/kalabaru-apps/gawe" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:text-amber-500 transition-colors">GitHub</a>
          {t('about.open_after_github', ', and contributions are welcome.')}
        </p>
      </div>

      {/* Support */}
      {SUPPORT_URL && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-5 py-4 space-y-3">
          <h2 className="text-base font-semibold">{t('about.support', 'Support this project')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('about.support_body', 'Gawe is free and will stay free. If it saves you time, you can support its maintenance and development.')}
          </p>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 transition-colors"
          >
            {t('about.support_link', 'Support on Saweria')}
          </a>
        </div>
      )}

    </div>
  )
}
