'use client'

import { useState, useEffect, useRef } from 'react'
import chroma from 'chroma-js'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Stage, Toolbar, Row, Notice, Region, CopyBtn, Field, TextInput } from '@/components/domain'

/** Stage-meets-Workbench: big swatch, all formats live, contrast ratio against white/black */

interface ColorOutput {
  label: string
  value: string
}

export default function ColorConverter({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '#3b82f6')
  const [pickerValue, setPickerValue] = useState('#3b82f6')
  const [outputs, setOutputs] = useState<ColorOutput[]>([])
  const [contrastWhite, setContrastWhite] = useState<number>(0)
  const [contrastBlack, setContrastBlack] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const raw = input.trim()
    if (!raw) return
    try {
      const c = chroma(raw)
      const hex = c.hex()
      const [r, g, b] = c.rgb()
      const [h, s, l] = c.hsl()
      const [hv, sv, v] = c.hsv()
      const cw = chroma.contrast(c, 'white')
      const cb = chroma.contrast(c, 'black')
      setOutputs([
        { label: 'HEX', value: hex },
        { label: 'RGB', value: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` },
        { label: 'HSL', value: `hsl(${Math.round(h ?? 0)}, ${Math.round((s ?? 0) * 100)}%, ${Math.round((l ?? 0) * 100)}%)` },
        { label: 'HSV', value: `hsv(${Math.round(hv ?? 0)}, ${Math.round((sv ?? 0) * 100)}%, ${Math.round((v ?? 0) * 100)}%)` },
        { label: 'CSS Name', value: (() => { try { return chroma(hex).name() } catch { return '—' } })() },
      ])
      setContrastWhite(cw)
      setContrastBlack(cb)
      if (!firedRef.current) { analytics.buttonClick('color-converter', 'convert'); firedRef.current = true }
      onOutput({ color: raw }, { hex, rgb: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` })
    } catch {
      setError('Invalid color format. Try: #3b82f6, rgb(59,130,246), hsl(217,91%,60%), blue')
      setOutputs([])
    }
  }, [input, onOutput])

  function wcagLevel(ratio: number) {
    if (ratio >= 7) return 'AAA'
    if (ratio >= 4.5) return 'AA'
    if (ratio >= 3) return 'AA Large'
    return 'Fail'
  }

  return (
    <Region domain="workbench">
      <div className="flex h-full flex-col">
        <Stage>
          <div className="flex-1">
            <div
              className="w-full h-full rounded-d"
              style={{ backgroundColor: pickerValue }}
            />
          </div>
        </Stage>
        <Toolbar>
          <input
            aria-label="Color input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            data-testid="color-input"
            className="w-full max-w-sm rounded-d border border-d-border bg-d-raised px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-500"
            placeholder="#3b82f6, rgb(59,130,246), blue..."
            spellCheck={false}
          />
          <input
            type="color"
            value={pickerValue}
            onChange={e => { setPickerValue(e.target.value); setInput(e.target.value) }}
            aria-label="Color picker"
            className="h-8 w-14 rounded border border-d-border cursor-pointer bg-d-raised p-0"
          />
          <input
            type="color"
            value={pickerValue}
            onChange={e => { setPickerValue(e.target.value); setInput(e.target.value) }}
            className="sr-only" aria-hidden
          />
          {error && <Notice tone="error">{error}</Notice>}
        </Toolbar>
        <div className="grid grid-cols-2 border-t border-d-border divide-x divide-d-border">
          <div className="p-4 space-y-2">
            <p className="text-xs text-d-muted">Contrast vs White</p>
            <p className="font-mono text-xl">{contrastWhite.toFixed(2)}:1</p>
            <span className={`text-xs px-2 py-0.5 rounded ${wcagLevel(contrastWhite) === 'Fail' ? 'bg-red-600/20 text-red-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
              {wcagLevel(contrastWhite)}
            </span>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-d-muted">Contrast vs Black</p>
            <p className="font-mono text-xl">{contrastBlack.toFixed(2)}:1</p>
            <span className={`text-xs px-2 py-0.5 rounded ${wcagLevel(contrastBlack) === 'Fail' ? 'bg-red-600/20 text-red-400' : 'bg-emerald-600/20 text-emerald-400'}`}>
              {wcagLevel(contrastBlack)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-d-border bg-d-surface p-4">
        {outputs.map((o) => (
          <Row key={o.label} label={o.label} value={o.value} copy mono />
        ))}
      </div>
    </Region>
  )
}