import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const SIZE = { width: 1200, height: 630 }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title       = searchParams.get('title')       ?? 'Gawe App'
  const description = searchParams.get('description') ?? '47 offline productivity and developer tools in one installable PWA'
  const category    = searchParams.get('category')    ?? ''

  // Category accent colors
  const ACCENTS: Record<string, string> = {
    encoding: '#6366f1',
    crypto:   '#f59e0b',
    dev:      '#10b981',
    image:    '#f43f5e',
    office:   '#0ea5e9',
    visual:   '#8b5cf6',
  }
  const accent = ACCENTS[category] ?? '#6366f1'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Accent gradient blob top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: accent,
            opacity: 0.15,
            filter: 'blur(80px)',
            display: 'flex',
          }}
        />
        {/* Subtle grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
            display: 'flex',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            padding: '64px 72px',
            position: 'relative',
          }}
        >
          {/* Top: logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Gear "G" mark — SVG inline */}
            <svg width="48" height="48" viewBox="0 0 512 512" fill="none">
              <rect width="512" height="512" rx="80" fill="#09090b" />
              <path
                d="M256 80 L290 100 L290 60 L310 80 L330 60 L330 110 L370 90 L360 130 L410 120 L390 160 L440 170 L400 200 L440 230 L390 230 L410 270 L360 260 L380 300 L330 280 L320 330 L290 300 L256 320 L222 300 L192 330 L182 280 L132 300 L152 260 L102 270 L122 230 L72 230 L112 200 L72 170 L122 160 L102 120 L152 130 L132 90 L182 110 L182 60 L202 80 L222 60 L222 100 Z"
                fill="white"
                opacity="0"
              />
              {/* Use a simpler circle-gear shape */}
              <circle cx="256" cy="256" r="180" fill="white" opacity="0.08" />
              <text x="256" y="330" textAnchor="middle" fontSize="260" fontWeight="900" fill="white" fontFamily="system-ui">G</text>
            </svg>
            <span style={{ color: 'white', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              gawe.app
            </span>
            {category && (
              <div
                style={{
                  marginLeft: '8px',
                  padding: '4px 14px',
                  borderRadius: '20px',
                  background: `${accent}22`,
                  border: `1px solid ${accent}55`,
                  color: accent,
                  fontSize: '16px',
                  fontWeight: 500,
                  display: 'flex',
                }}
              >
                {category}
              </div>
            )}
          </div>

          {/* Middle: title + description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
            <div
              style={{
                fontSize: title.length > 30 ? '56px' : '72px',
                fontWeight: 800,
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-2px',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: '26px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              {description}
            </div>
          </div>

          {/* Bottom: tagline + accent bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '3px', background: accent, borderRadius: '2px', display: 'flex' }} />
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '18px' }}>
                Works offline · No account needed · Free forever
              </span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '16px' }}>
              47 tools
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
    }
  )
}
