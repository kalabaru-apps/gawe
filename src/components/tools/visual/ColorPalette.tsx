'use client'

import { useState, useEffect } from 'react'
import chroma from 'chroma-js'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'tints' | 'harmonies' | 'scale'

interface ColorSwatch { label: string; hex: string }

function Swatch({ label, hex }: ColorSwatch) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-md border border-input/30 cursor-pointer transition-transform hover:scale-110"
        style={{ backgroundColor: hex }}
        title={hex} />
      <span className="font-mono text-[10px] text-muted-foreground">{hex}</span>
      <CopyButton value={hex} />
    </div>
  )
}

export default function ColorPalette({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '#6366f1')
  const [tab, setTab] = useState<Tab>('tints')
  const [error, setError] = useState<string | null>(null)
  const [tints, setTints] = useState<ColorSwatch[]>([])
  const [shades, setShades] = useState<ColorSwatch[]>([])
  const [harmonies, setHarmonies] = useState<{ label: string; colors: string[] }[]>([])
  const [scale, setScale] = useState<string[]>([])

  useEffect(() => {
    try {
      const base = chroma(input.trim())
      const hue = base.get('hsl.h')
      setError(null)

      // Tints (mix with white)
      const newTints: ColorSwatch[] = Array.from({ length: 9 }, (_, i) => ({
        label: `${(i + 1) * 100}`,
        hex: chroma.mix(base, 'white', i / 8, 'lab').hex(),
      }))
      setTints(newTints)

      // Shades (mix with black)
      const newShades: ColorSwatch[] = Array.from({ length: 9 }, (_, i) => ({
        label: `${(i + 1) * 100}`,
        hex: chroma.mix(base, 'black', i / 8, 'lab').hex(),
      }))
      setShades(newShades)

      // Harmonies
      const rotate = (deg: number) => {
        try { return chroma(base.hex()).set('hsl.h', ((hue + deg) % 360 + 360) % 360).hex() } catch { return base.hex() }
      }
      setHarmonies([
        { label: 'Complementary', colors: [base.hex(), rotate(180)] },
        { label: 'Analogous', colors: [rotate(-30), base.hex(), rotate(30)] },
        { label: 'Triadic', colors: [base.hex(), rotate(120), rotate(240)] },
        { label: 'Split-Complementary', colors: [base.hex(), rotate(150), rotate(210)] },
        { label: 'Tetradic', colors: [base.hex(), rotate(90), rotate(180), rotate(270)] },
      ])

      // Scale
      const scaleColors = chroma.scale([chroma.mix(base, 'white', 0.8).hex(), base.hex(), chroma.mix(base, 'black', 0.6).hex()])
        .mode('lab').colors(11)
      setScale(scaleColors)

      onOutput({ baseColor: input }, { hex: base.hex() })
    } catch {
      setError('Invalid color format. Try: #6366f1, rgb(99,102,241), hsl(239,84%,67%)')
    }
  // onOutput intentionally excluded — stable via useCallback in ToolPageClient
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="color" value={input.startsWith('#') && input.length === 7 ? input : '#6366f1'}
          onChange={(e) => setInput(e.target.value)}
          className="h-10 w-14 rounded border border-input cursor-pointer bg-background p-1" />
        <input value={input} onChange={(e) => setInput(e.target.value)}
          className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          placeholder="#6366f1" spellCheck={false} />
        <div className="w-10 h-10 rounded-md border border-input" style={{ backgroundColor: input }} />
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['tints', 'harmonies', 'scale'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'tints' ? 'Tints & Shades' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'tints' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Tints (mixed with white)</p>
            <div className="flex gap-3 flex-wrap">
              {tints.map((s) => <Swatch key={s.hex} {...s} />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Shades (mixed with black)</p>
            <div className="flex gap-3 flex-wrap">
              {shades.map((s) => <Swatch key={s.hex} {...s} />)}
            </div>
          </div>
        </div>
      )}
      {tab === 'harmonies' && (
        <div className="space-y-4">
          {harmonies.map((h) => (
            <div key={h.label}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{h.label}</p>
              <div className="flex gap-3">
                {h.colors.map((c, i) => <Swatch key={i} label="" hex={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'scale' && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Color Scale (11 steps)</p>
          <div className="flex h-16 rounded-lg overflow-hidden border border-input">
            {scale.map((c) => <div key={c} className="flex-1" style={{ backgroundColor: c }} />)}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {scale.map((c) => <Swatch key={c} label="" hex={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}
