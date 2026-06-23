import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const W = 1200
const H = 630

const ACCENTS: Record<string, string> = {
  encoding: '#6366f1',
  crypto:   '#f59e0b',
  dev:      '#10b981',
  image:    '#f43f5e',
  office:   '#0ea5e9',
  visual:   '#8b5cf6',
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const title       = searchParams.get('title')       ?? 'Gawe App'
  const description = searchParams.get('description') ?? '47 offline developer tools. No internet required.'
  const category    = searchParams.get('category')    ?? ''
  const accent      = ACCENTS[category] ?? '#6366f1'

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background: '#09090b',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Logo mark: gear-G as a simple box */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: '#000', fontSize: 32, fontWeight: 900, display: 'flex' }}>G</div>
          </div>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, display: 'flex' }}>
            gawe.app
          </div>
          {category ? (
            <div
              style={{
                marginLeft: 8,
                padding: '4px 14px',
                borderRadius: 20,
                background: `${accent}33`,
                border: `1px solid ${accent}88`,
                color: accent,
                fontSize: 16,
                fontWeight: 500,
                display: 'flex',
              }}
            >
              {category}
            </div>
          ) : null}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              color: '#fff',
              fontSize: title.length > 28 ? 60 : 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              display: 'flex',
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: 26,
              lineHeight: 1.5,
              display: 'flex',
            }}
          >
            {description}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 3,
                background: accent,
                borderRadius: 2,
                display: 'flex',
              }}
            />
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 18, display: 'flex' }}>
              Free · Offline · Open source · No data collected
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 16, display: 'flex' }}>
            by Kalabaru
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
