'use client'

import { useState, useCallback, useEffect } from 'react'
import { RotateCcw, Shuffle, Plus, X } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Stage, FloatingPanel } from '@/components/domain/Stage'
import { CopyBtn, Btn, IconBtn, Seg, Field, Switch } from '@/components/domain/kit'
import { CodeArea } from '@/components/domain/Workbench'

type Tab = 'shadow' | 'gradient'
type GradientType = 'linear' | 'radial' | 'conic'

interface ColorStop { id: string; color: string; position: number }

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`
}

function gradientCss(gradType: GradientType, gradAngle: number, stops: ColorStop[]): string {
  const stopStr = stops.map((s) => `${s.color} ${s.position}%`).join(', ')
  if (gradType === 'linear') return `background: linear-gradient(${gradAngle}deg, ${stopStr});`
  if (gradType === 'radial') return `background: radial-gradient(circle, ${stopStr});`
  return `background: conic-gradient(from ${gradAngle}deg, ${stopStr});`
}

const DEFAULT_STOPS: ColorStop[] = [
  { id: '1', color: '#6366f1', position: 0 },
  { id: '2', color: '#ec4899', position: 100 },
]

function SliderRow({ label, id, value, onChange, min, max, unit }: {
  label: string; id: string; value: number; onChange: (v: number) => void; min: number; max: number; unit: string
}) {
  return (
    <Field label={label} id={id}>
      <div className="flex items-center gap-3">
        <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-d-accent" />
        <span className="w-14 text-right font-mono text-xs tabular-nums text-d-muted">{value}{unit}</span>
      </div>
    </Field>
  )
}

const colorInput = 'h-8 w-12 shrink-0 cursor-pointer rounded-d border border-d-border bg-d-raised p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent'

export default function CssGenerators({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>((initialState?.tab as Tab) ?? 'shadow')

  const [shadowX, setShadowX] = useState((initialState?.shadowX as number) ?? 4)
  const [shadowY, setShadowY] = useState((initialState?.shadowY as number) ?? 8)
  const [shadowBlur, setShadowBlur] = useState((initialState?.shadowBlur as number) ?? 16)
  const [shadowSpread, setShadowSpread] = useState((initialState?.shadowSpread as number) ?? 0)
  const [shadowColor, setShadowColor] = useState((initialState?.shadowColor as string) ?? '#000000')
  const [shadowAlpha, setShadowAlpha] = useState((initialState?.shadowAlpha as number) ?? 25)
  const [shadowInset, setShadowInset] = useState((initialState?.shadowInset as boolean) ?? false)

  const [gradType, setGradType] = useState<GradientType>((initialState?.gradType as GradientType) ?? 'linear')
  const [gradAngle, setGradAngle] = useState((initialState?.gradAngle as number) ?? 90)
  const [stops, setStops] = useState<ColorStop[]>((initialState?.stops as ColorStop[]) ?? DEFAULT_STOPS)

  const shadowValue = `${shadowInset ? 'inset ' : ''}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(shadowColor, shadowAlpha)}`
  const shadowCss = `box-shadow: ${shadowValue};`
  const gradCss = gradientCss(gradType, gradAngle, stops)
  const currentCss = tab === 'shadow' ? shadowCss : gradCss

  useEffect(() => {
    analytics.buttonClick('css-generators', tab)
    onOutput(
      { tab, shadowX, shadowY, shadowBlur, shadowSpread, shadowColor, shadowAlpha, shadowInset, gradType, gradAngle, stops },
      { css: currentCss },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, shadowX, shadowY, shadowBlur, shadowSpread, shadowColor, shadowAlpha, shadowInset, gradType, gradAngle, stops])

  const addStop = useCallback(() => setStops((prev) => [...prev, { id: Date.now().toString(), color: '#ffffff', position: 50 }]), [])
  const updateStop = useCallback((id: string, field: 'color' | 'position', value: string | number) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }, [])
  const removeStop = useCallback((id: string) => setStops((prev) => (prev.length <= 2 ? prev : prev.filter((s) => s.id !== id))), [])

  const reset = () => {
    setShadowX(4); setShadowY(8); setShadowBlur(16); setShadowSpread(0)
    setShadowColor('#000000'); setShadowAlpha(25); setShadowInset(false)
    setGradType('linear'); setGradAngle(90); setStops(DEFAULT_STOPS)
    analytics.buttonClick('css-generators', 'reset')
  }

  const randomize = () => {
    const r = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    if (tab === 'shadow') {
      setShadowColor(`#${r()}${r()}${r()}`)
      setShadowX(Math.floor(Math.random() * 20) - 10)
      setShadowY(Math.floor(Math.random() * 20) - 10)
      setShadowBlur(Math.floor(Math.random() * 30))
      setShadowSpread(Math.floor(Math.random() * 10) - 5)
      setShadowAlpha(Math.floor(Math.random() * 100))
    } else {
      setStops([
        { id: '1', color: `#${r()}${r()}${r()}`, position: 0 },
        { id: '2', color: `#${r()}${r()}${r()}`, position: 100 },
      ])
      setGradAngle(Math.floor(Math.random() * 360))
    }
    analytics.buttonClick('css-generators', 'randomize')
  }

  const previewBg = tab === 'gradient' ? gradCss.replace('background: ', '').replace(';', '') : undefined

  return (
    <Stage>
      {/* Below lg the panels stack and the page scrolls; from lg they float over the canvas */}
      <div className="flex h-full flex-col gap-3 overflow-auto p-3 lg:contents">
        {/* Canvas */}
        <div
          role="img"
          aria-label={tab === 'shadow' ? t('visual.box_shadow', 'Box shadow preview') : t('visual.gradient', 'Gradient preview')}
          className="relative flex h-56 shrink-0 items-center justify-center overflow-hidden rounded-d border border-d-border lg:absolute lg:inset-0 lg:h-auto lg:rounded-none lg:border-0"
          style={previewBg ? { background: previewBg } : undefined}
        >
          {tab === 'shadow' && <div className="h-40 w-40 rounded-xl bg-d-raised" style={{ boxShadow: shadowValue }} />}
        </div>

        <FloatingPanel label={t('visual.generator_type', 'Generator type')} className="max-lg:static left-3 top-3 flex items-center gap-1 p-1">
          <Seg<Tab>
            value={tab}
            onChange={setTab}
            label={t('visual.generator_type', 'Generator type')}
            options={[{ value: 'shadow', label: t('visual.box_shadow', 'Box shadow') }, { value: 'gradient', label: t('visual.gradient', 'Gradient') }]}
          />
          <IconBtn label={t('visual.reset', 'Reset defaults')} onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden /></IconBtn>
          <IconBtn label={t('visual.random', 'Randomize')} onClick={randomize}><Shuffle className="h-4 w-4" aria-hidden /></IconBtn>
        </FloatingPanel>

        <FloatingPanel label={t('visual.controls', 'Controls')} className="max-lg:static right-3 top-3 flex flex-col lg:bottom-3 lg:w-80">
          <header className="flex h-10 shrink-0 items-center border-b border-d-border px-3">
            <h2 className="font-display text-sm font-semibold">{t('visual.controls', 'Controls')}</h2>
          </header>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {tab === 'shadow' ? (
              <div className="space-y-3">
                <SliderRow id="sh-x" label={t('visual.x_offset', 'X offset')} value={shadowX} onChange={setShadowX} min={-50} max={50} unit="px" />
                <SliderRow id="sh-y" label={t('visual.y_offset', 'Y offset')} value={shadowY} onChange={setShadowY} min={-50} max={50} unit="px" />
                <SliderRow id="sh-blur" label={t('visual.blur', 'Blur')} value={shadowBlur} onChange={setShadowBlur} min={0} max={100} unit="px" />
                <SliderRow id="sh-spread" label={t('visual.spread', 'Spread')} value={shadowSpread} onChange={setShadowSpread} min={-50} max={50} unit="px" />
                <SliderRow id="sh-alpha" label={t('common.opacity', 'Opacity')} value={shadowAlpha} onChange={setShadowAlpha} min={0} max={100} unit="%" />
                <Field label={t('common.color', 'Color')} id="sh-color">
                  <input id="sh-color" type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)} className={colorInput} />
                </Field>
                <Switch checked={shadowInset} onChange={setShadowInset} label={t('visual.inset', 'Inset shadow')} />
              </div>
            ) : (
              <div className="space-y-3">
                <Seg<GradientType>
                  value={gradType}
                  onChange={setGradType}
                  label={t('visual.type', 'Type')}
                  options={[
                    { value: 'linear', label: t('visual.linear', 'Linear') },
                    { value: 'radial', label: t('visual.radial', 'Radial') },
                    { value: 'conic', label: t('visual.conic', 'Conic') },
                  ]}
                />
                {gradType !== 'radial' && (
                  <SliderRow id="gr-angle" label={t('common.angle', 'Angle')} value={gradAngle} onChange={setGradAngle} min={0} max={360} unit="°" />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t('visual.color_stops', 'Color stops')} ({stops.length})</span>
                  <Btn size="sm" onClick={addStop}><Plus className="h-3.5 w-3.5" aria-hidden />{t('visual.add_stop', 'Add stop')}</Btn>
                </div>
                <ul className="space-y-2">
                  {stops.map((stop, i) => (
                    <li key={stop.id} className="flex items-center gap-2">
                      <input type="color" value={stop.color} onChange={(e) => updateStop(stop.id, 'color', e.target.value)} className={colorInput} aria-label={`${t('common.color', 'Color')} ${i + 1}`} />
                      <input type="range" min={0} max={100} value={stop.position} onChange={(e) => updateStop(stop.id, 'position', Number(e.target.value))} className="min-w-0 flex-1 accent-d-accent" aria-label={`${t('visual.position', 'Position')} ${i + 1}`} />
                      <span className="w-10 text-right font-mono text-xs tabular-nums text-d-muted">{stop.position}%</span>
                      <IconBtn label={t('visual.remove_stop', 'Remove stop') + ` ${i + 1}`} onClick={() => removeStop(stop.id)} disabled={stops.length <= 2}>
                        <X className="h-4 w-4" aria-hidden />
                      </IconBtn>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </FloatingPanel>

        <FloatingPanel label={t('visual.css_output', 'CSS output')} className="max-lg:static bottom-3 left-3 flex flex-col lg:right-[21.5rem]">
          <header className="flex h-10 shrink-0 items-center justify-between border-b border-d-border px-3">
            <h2 className="font-display text-sm font-semibold">{t('visual.css_output', 'CSS output')}</h2>
            <CopyBtn value={currentCss} label={t('common.copy', 'Copy')} />
          </header>
          <div className="flex h-20 flex-col">
            <CodeArea value={currentCss} readOnly label={t('visual.css_output', 'CSS output')} />
          </div>
        </FloatingPanel>
      </div>
    </Stage>
  )
}
