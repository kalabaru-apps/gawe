import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { TOOLS, CATEGORIES } from '@/config/tools'
import { SUPPORT_URL } from '@/config/site'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Gawe is a free, open-source, offline-first developer toolbox. No accounts, no data collection, no internet required.',
}

export default function AboutPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-12">

      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">About Gawe</h1>
        <p className="text-muted-foreground leading-relaxed">
          Gawe is a free, open-source collection of {TOOLS.length} developer and productivity tools
          that runs entirely in your browser — no internet connection required after the first load.
        </p>
      </div>

      {/* Principles */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Our principles</h2>
        <div className="grid gap-3">
          {[
            {
              title: 'Free forever',
              body: 'Every tool is free to use, with no paywalls, subscriptions, or premium tiers. Ever.',
            },
            {
              title: 'Zero data collection',
              body: 'Your inputs never leave your device. Everything runs client-side — we have no server that processes your data, no database storing your content.',
            },
            {
              title: 'Works offline',
              body: 'Install Gawe as a PWA and it works without any internet connection. Your tools are always available anytime, anywhere.',
              image: '/images/works-offline.png',
            },
            {
              title: 'No account needed',
              body: 'Open the app and start working. No sign-up, no email, no OAuth.',
            },
          ].map(({ title, body, image }) => (
            <div key={title} className="rounded-lg border border-border bg-card px-4 py-3 space-y-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              {image && (
                <Image
                  src={image}
                  alt={`How to install Gawe as a PWA`}
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
        <h2 className="text-lg font-semibold tracking-tight">What's included</h2>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.category === cat.id)
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
        <h2 className="text-lg font-semibold tracking-tight">Made by</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gawe is built and maintained by{' '}
          <a
            href="https://kalabaru.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-amber-500 transition-colors"
          >
            KalaBaru
          </a>
          , a creative and IT studio from Indonesia. We build tools, apps, services, and all you need for developers and creators for more than 5 years.
        </p>
      </div>

      {/* Open source */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Open source</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gawe is released under the{' '}
          <a
            href="https://github.com/kalabaru-apps/gawe/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-amber-500 transition-colors"
          >
            MIT License
          </a>
          . Use it, fork it, self-host it, or ship it as part of your own project —
          commercially or otherwise. The full source is on{' '}
          <a
            href="https://github.com/kalabaru-apps/gawe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-amber-500 transition-colors"
          >
            GitHub
          </a>
          , and contributions are welcome.
        </p>
      </div>

      {/* Support */}
      {SUPPORT_URL && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-5 py-4 space-y-3">
          <h2 className="text-base font-semibold">Support this project</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Gawe is free forever and will always stay that way. If it saves you time,
            consider buying us a coffee — it helps keep the tools maintained and new ones coming.
          </p>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 transition-colors"
          >
            ☕ Support on Saweria
          </a>
        </div>
      )}

    </div>
  )
}
