import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { AppShell } from '@/components/shell/AppShell'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gawe.app'
const OG_IMAGE = `${SITE_URL}/og`

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'Gawe App — Offline Developer & Productivity Tools',
    template: '%s · Gawe App',
  },
  description:
    '47 offline productivity and developer tools in one installable PWA. JSON formatter, UUID generator, QR code, regex tester, color palette, and more.',
  keywords: [
    'developer tools', 'offline tools', 'PWA', 'JSON formatter', 'UUID generator',
    'QR code generator', 'regex tester', 'color palette', 'base64', 'hash generator',
    'markdown editor', 'kanban board', 'offline productivity', 'developer utilities',
  ],
  authors: [{ name: 'Kalabaru', url: SITE_URL }],
  creator: 'Kalabaru',
  publisher: 'Kalabaru',
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: SITE_URL,
  },

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Gawe App',
    title: 'Gawe App — Offline Productivity Tools',
    description:
      '47 offline productivity and developer tools in one installable PWA. Works without internet. No account needed. Free forever.',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Gawe App — 47 Offline Productivity Tools',
        type: 'image/png',
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: 'summary_large_image',
    site: '@gaweapp',
    creator: '@gaweapp',
    title: 'Gawe App — Offline Productivity Tools',
    description:
      '47 offline productivity and developer tools in one installable PWA. Works without internet.',
    images: [OG_IMAGE],
  },

  // PWA / icons
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon-32.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gawe',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const umamiId  = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL ?? 'https://cloud.umami.is/script.js'

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
        {umamiId && (
          <Script
            src={umamiUrl}
            data-website-id={umamiId}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
