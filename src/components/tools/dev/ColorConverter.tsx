'use client'

import { useState, useEffect } from 'react'
import chroma from 'chroma-js'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

interface ColorOutput {
  label: string
  value: string
}

export default function ColorConverter({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '#3b82f6')
  const [pickerValue, setPickerValue] = useState('#3b82f6')
  const [outputs, setOutputs] = useState<ColorOutput[]>([])
  const [contrastWhite, setContrastWhite] = useState<number>(0)
  const [contrastBlack, setContrastBlack] = useState<number>(0)
  const [swatchBg, setSwatchBg] = useState('#3b82f6')
  const [error, setError] = useState<string | null>(null)

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
      setSwatchBg(hex)
      setPickerValue(hex)
      setError(null)
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
    <ToolPanel
      left={
        <div className="space-y-4">
          <div
            className="w-full h-24 rounded-lg border border-input transition-colors"
            style={{ backgroundColor: swatchBg }}
          />
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Color Value</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={pickerValue}
                onChange={(e) => { setPickerValue(e.target.value); setInput(e.target.value) }}
                className="h-10 w-14 rounded border border-input cursor-pointer bg-background p-1"
              />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="#3b82f6, rgb(59,130,246), blue..."
                spellCheck={false}
              />
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-3">
          {outputs.map((o) => (
            <div key={o.label} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-xs text-muted-foreground">{o.label}</p>
                <p className="font-mono text-sm mt-0.5">{o.value}</p>
              </div>
              {o.value !== '—' && <CopyButton value={o.value} />}
            </div>
          ))}
          {outputs.length > 0 && (
            <div className="rounded-md border border-input p-3 space-y-2 mt-2">
              <p className="text-xs font-medium text-muted-foreground">WCAG Contrast</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">vs White</p>
                  <p className="font-mono text-sm">{contrastWhite.toFixed(2)}:1</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${wcagLevel(contrastWhite) === 'Fail' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {wcagLevel(contrastWhite)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">vs Black</p>
                  <p className="font-mono text-sm">{contrastBlack.toFixed(2)}:1</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${wcagLevel(contrastBlack) === 'Fail' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {wcagLevel(contrastBlack)}
                  </span>
                </div>
              </div>
            </div>
          )}
          {outputs.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">Enter a color value to convert it across all formats</p>
          )}
        </div>
      }
    />
  )
}
