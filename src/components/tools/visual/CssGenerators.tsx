'use client'

import { useState } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

type Tab = 'shadow' | 'gradient'
type GradientType = 'linear' | 'radial' | 'conic'

interface ColorStop { id: string; color: string; position: number }

export default function CssGenerators({ onOutput, initialState: _initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('shadow')

  // Shadow state
  const [shadowX, setShadowX] = useState(4)
  const [shadowY, setShadowY] = useState(8)
  const [shadowBlur, setShadowBlur] = useState(16)
  const [shadowSpread, setShadowSpread] = useState(0)
  const [shadowColor, setShadowColor] = useState('#000000')
  const [shadowAlpha, setShadowAlpha] = useState(25)
  const [shadowInset, setShadowInset] = useState(false)

  // Gradient state
  const [gradType, setGradType] = useState<GradientType>('linear')
  const [gradAngle, setGradAngle] = useState(90)
  const [stops, setStops] = useState<ColorStop[]>([
    { id: '1', color: '#6366f1', position: 0 },
    { id: '2', color: '#ec4899', position: 100 },
  ])

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`
  }

  const shadowCss = `box-shadow: ${shadowInset ? 'inset ' : ''}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(shadowColor, shadowAlpha)};`

  function gradientCss(): string {
    const stopStr = stops.map((s) => `${s.color} ${s.position}%`).join(', ')
    if (gradType === 'linear') return `background: linear-gradient(${gradAngle}deg, ${stopStr});`
    if (gradType === 'radial') return `background: radial-gradient(circle, ${stopStr});`
    return `background: conic-gradient(from ${gradAngle}deg, ${stopStr});`
  }

  const gradCss = gradientCss()

  function addStop() {
    setStops((prev) => [...prev, { id: Date.now().toString(), color: '#ffffff', position: 50 }])
  }

  function updateStop(id: string, field: 'color' | 'position', value: string | number) {
    setStops((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  function removeStop(id: string) {
    if (stops.length <= 2) return
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  const currentCss = tab === 'shadow' ? shadowCss : gradCss

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['shadow', 'gradient'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'shadow' ? 'Box Shadow' : 'Gradient'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {tab === 'shadow' ? (
            <>
              {[
                { label: 'X Offset', value: shadowX, set: setShadowX, min: -50, max: 50 },
                { label: 'Y Offset', value: shadowY, set: setShadowY, min: -50, max: 50 },
                { label: 'Blur Radius', value: shadowBlur, set: setShadowBlur, min: 0, max: 100 },
                { label: 'Spread Radius', value: shadowSpread, set: setShadowSpread, min: -50, max: 50 },
                { label: 'Opacity', value: shadowAlpha, set: setShadowAlpha, min: 0, max: 100 },
              ].map(({ label, value, set, min, max }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <span className="text-xs font-mono text-muted-foreground">{value}{label === 'Opacity' ? '%' : 'px'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full" />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground">Shadow Color</label>
                <input type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)}
                  className="h-8 w-12 rounded border border-input cursor-pointer bg-background p-1" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={shadowInset} onChange={(e) => setShadowInset(e.target.checked)} className="rounded" />
                Inset shadow
              </label>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                {(['linear', 'radial', 'conic'] as GradientType[]).map((t) => (
                  <button key={t} onClick={() => setGradType(t)}
                    className={`flex-1 py-1.5 rounded-md text-xs border capitalize transition-colors ${gradType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {(gradType === 'linear' || gradType === 'conic') && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Angle</label>
                    <span className="text-xs font-mono text-muted-foreground">{gradAngle}°</span>
                  </div>
                  <input type="range" min={0} max={360} value={gradAngle} onChange={(e) => setGradAngle(Number(e.target.value))} className="w-full" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Color Stops</label>
                  <button onClick={addStop} className="text-xs text-primary hover:underline">+ Add Stop</button>
                </div>
                {stops.map((stop) => (
                  <div key={stop.id} className="flex items-center gap-2">
                    <input type="color" value={stop.color} onChange={(e) => updateStop(stop.id, 'color', e.target.value)}
                      className="h-8 w-12 rounded border border-input cursor-pointer bg-background p-1" />
                    <input type="range" min={0} max={100} value={stop.position} onChange={(e) => updateStop(stop.id, 'position', Number(e.target.value))}
                      className="flex-1" />
                    <span className="text-xs font-mono w-8 text-right text-muted-foreground">{stop.position}%</span>
                    <button onClick={() => removeStop(stop.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors" disabled={stops.length <= 2}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="space-y-4">
          {/* Live preview */}
          <div className="h-32 rounded-lg border border-input overflow-hidden bg-neutral-900 flex items-center justify-center">
            {tab === 'shadow' ? (
              <div className="w-24 h-24 rounded-lg bg-white" style={{ boxShadow: `${shadowInset ? 'inset ' : ''}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(shadowColor, shadowAlpha)}` }} />
            ) : (
              <div className="w-full h-full" style={{ background: gradCss.replace('background: ', '').replace(';', '') }} />
            )}
          </div>
          {/* CSS output */}
          <div className="rounded-md border border-input p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">CSS</span>
              <CopyButton value={currentCss} />
            </div>
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-all">{currentCss}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
