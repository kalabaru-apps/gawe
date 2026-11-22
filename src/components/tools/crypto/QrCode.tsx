'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Download, Palette, Trash2, Check } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { DropHero, StudioWorkspace, PrimaryAction } from '@/components/domain/Studio'
import { CopyBtn, Notice, Field, Chip } from '@/components/domain/kit'

type DotShape = 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded'
type CornerShape = 'square' | 'dot' | 'extra-rounded'
type CornerDotShape = 'square' | 'dot'
type ErrorLevel = 'L' | 'M' | 'Q' | 'H'

const DOT_SHAPES: { id: DotShape; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'dots', label: 'Dots' }, { id: 'rounded', label: 'Rounded' },
  { id: 'classy', label: 'Classy' }, { id: 'classy-rounded', label: 'Classy Rounded' }, { id: 'extra-rounded', label: 'Extra Rounded' }
]
const CORNER_SHAPES: { id: CornerShape; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'dot', label: 'Dot' }, { id: 'extra-rounded', label: 'Rounded' }
]
const CORNER_DOT_SHAPES: { id: CornerDotShape; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'dot', label: 'Dot' }
]

/** QrCode: Studio drop zone → live preview + options rail → download PNG/SVG. */
export default function QrCode({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'generate' | 'read'>('generate')
  const [input, setInput] = useState((initialState?.input as string) ?? 'https://example.com')
  const [opts, setOpts] = useState({
    dotColor: '#000000', bgColor: '#ffffff', errorLevel: 'M' as ErrorLevel,
    dotShape: 'square' as DotShape, cornerShape: 'square' as CornerShape, cornerDotShape: 'square' as CornerDotShape,
    margin: 2, size: 300, bgTransparent: false, useCustomCornerColor: false,
    cornerColor: '#000000', cornerDotColor: '#000000', logoDataUrl: '', logoSize: 20,
  })
  const [decoded, setDecoded] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<InstanceType<typeof import('qr-code-styling').default> | null>(null)

  const setOpt = useCallback(<K extends keyof typeof opts>(key: K, value: (typeof opts)[K]) => {
    setOpts(prev => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    if (tab !== 'generate') return
    let cancelled = false

    const draw = async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default
      if (cancelled || !containerRef.current) return

      const bgVal = opts.bgTransparent ? '#00000000' : opts.bgColor
      const cornerColor = opts.useCustomCornerColor ? opts.cornerColor : opts.dotColor
      const cornerDotColor = opts.useCustomCornerColor ? opts.cornerDotColor : opts.dotColor

      const config = {
        width: opts.size, height: opts.size, data: input.trim() || ' ',
        margin: opts.margin, qrOptions: { errorCorrectionLevel: opts.errorLevel },
        dotsOptions: { type: opts.dotShape, color: opts.dotColor },
        backgroundOptions: { color: bgVal },
        cornersSquareOptions: { type: opts.cornerShape, color: cornerColor },
        cornersDotOptions: { type: opts.cornerDotShape, color: cornerDotColor },
        ...(opts.logoDataUrl ? {
          image: opts.logoDataUrl,
          imageOptions: { crossOrigin: 'anonymous' as const, margin: 4, imageSize: opts.logoSize / 100 }
        } : {}),
      }

      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling(config)
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      } else {
        qrRef.current.update(config)
      }

      analytics.buttonClick('qr-code', 'generate')
      onOutput({ text: input }, {})
    }

    void draw()
    return () => { cancelled = true }
  }, [input, opts, tab, onOutput])

  const download = (format: 'png' | 'svg') => {
    qrRef.current?.download({ name: 'qrcode', extension: format })
    analytics.buttonClick('qr-code', 'download')
  }

  const handleLogoFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => setOpt('logoDataUrl', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleFile = useCallback((file: File) => {
    setReadError(null); setDecoded('')
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = (window as unknown as { jsQR: (data: Uint8ClampedArray, w: number, h: number) => { data: string } | null }).jsQR(imageData.data, imageData.width, imageData.height)
        if (result) {
          setDecoded(result.data)
          onOutput({ action: 'read' }, { decoded: result.data })
          analytics.buttonClick('qr-code', 'read')
        } else {
          setReadError(t('action.error', 'No QR code found'))
        }
      }
      img.onerror = () => setReadError(t('action.error', 'Failed to load image'))
      img.src = event.target?.result as string
    }
    reader.onerror = () => setReadError(t('action.error', 'Failed to read file'))
    reader.readAsDataURL(file)
  }, [onOutput, t])

  const ShapeSelect = <T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) => (
    <Field label={label} id={label.toLowerCase().replace(/\s+/g, '-')}>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <Chip key={o.id} on={value === o.id} onClick={() => onChange(o.id)}>{o.label}</Chip>
        ))}
      </div>
    </Field>
  )

  const ColorInput = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <Field label={label} id={label.toLowerCase().replace(/\s+/g, '-')}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-6 rounded border border-d-border cursor-pointer" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="w-20 font-mono text-xs border border-d-border rounded px-2 py-1" />
      </div>
    </Field>
  )

  return (
    <StudioWorkspace
      rail={
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold">{tab === 'generate' ? 'Generate QR' : 'Read QR'}</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{input.slice(0, 40)}{input.length > 40 ? '…' : ''}</p>
          </div>
          {tab === 'generate' ? (
            <>
              <ShapeSelect options={DOT_SHAPES} value={opts.dotShape} onChange={v => setOpt('dotShape', v)} label="Module shape" />
              <div className="grid grid-cols-2 gap-3">
                <ShapeSelect options={CORNER_SHAPES} value={opts.cornerShape} onChange={v => setOpt('cornerShape', v)} label="Corner square" />
                <ShapeSelect options={CORNER_DOT_SHAPES} value={opts.cornerDotShape} onChange={v => setOpt('cornerDotShape', v)} label="Corner dot" />
              </div>
              <ColorInput label="Modules" value={opts.dotColor} onChange={v => setOpt('dotColor', v)} />
              <ColorInput label="Background" value={opts.bgColor} onChange={v => setOpt('bgColor', v)} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={opts.bgTransparent} onChange={e => setOpt('bgTransparent', e.target.checked)} className="rounded" />
                Transparent background
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={opts.useCustomCornerColor} onChange={e => setOpt('useCustomCornerColor', e.target.checked)} className="rounded" />
                Custom corner colors
              </label>
              {opts.useCustomCornerColor && (
                <div className="ml-4 space-y-3">
                  <ColorInput label="Corner square" value={opts.cornerColor} onChange={v => setOpt('cornerColor', v)} />
                  <ColorInput label="Corner dot" value={opts.cornerDotColor} onChange={v => setOpt('cornerDotColor', v)} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Size (px)" id="size"><input type="number" value={opts.size} onChange={e => setOpt('size', +e.target.value)} min={100} max={1000} step={50} className="w-full" /></Field>
                <Field label="Margin" id="margin"><input type="number" value={opts.margin} onChange={e => setOpt('margin', +e.target.value)} min={0} max={10} className="w-full" /></Field>
                <Field label="Error correction" id="error-correction">
                  <select value={opts.errorLevel} onChange={e => setOpt('errorLevel', e.target.value as ErrorLevel)} className="w-full">
                    {['L', 'M', 'Q', 'H'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Logo (optional)" id="logo">
                {opts.logoDataUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={opts.logoDataUrl} alt="logo" className="h-10 w-10 object-contain rounded border border-d-border" />
                    <div className="flex-1">
                      <input type="range" min={10} max={40} value={opts.logoSize} onChange={e => setOpt('logoSize', +e.target.value)} className="w-full" />
                      <span className="text-xs text-d-muted">Size: {opts.logoSize}%</span>
                    </div>
                    <button onClick={() => setOpt('logoDataUrl', '')} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                  </div>
                ) : (
                  <DropHero accept="image/*" onFiles={([f]) => handleLogoFile(f)} title="Add logo" hint="PNG with transparency works best" />
                )}
                {opts.logoDataUrl && <p className="text-xs text-d-muted mt-1">Use error correction H for best results with logos</p>}
              </Field>
            </>
          ) : (
            <Field label="QR Image" id="qr-image">
              <DropHero accept="image/*" onFiles={([f]) => handleFile(f)} title="Read QR" hint="Drop an image containing a QR code" />
            </Field>
          )}
        </div>
      }
    >
      {tab === 'generate' ? (
        <div className="flex flex-col items-center gap-4 p-5">
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            placeholder="https://example.com"
            className="w-full min-h-[100px] border border-d-border rounded-d bg-d-surface p-3 font-mono text-sm outline-none focus-visible:border-d-accent resize-y"
            spellCheck={false}
          />
          <div className="w-full max-w-[320px] flex flex-col items-center gap-4">
            <div
              ref={containerRef}
              className="w-full aspect-square rounded-xl border border-d-border bg-white"
            />
            <div className="flex flex-wrap gap-2 justify-center w-full">
              <button onClick={() => download('png')} className="flex-1 py-2 rounded-d border border-d-border bg-d-surface text-sm hover:bg-d-border/40 text-d-muted flex items-center justify-center gap-2">
                <Download className="h-4 w-4" aria-hidden /> PNG
              </button>
              <button onClick={() => download('svg')} className="flex-1 py-2 rounded-d border border-d-border bg-d-surface text-sm hover:bg-d-border/40 text-d-muted flex items-center justify-center gap-2">
                <Download className="h-4 w-4" aria-hidden /> SVG
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center p-10">
          <div className="text-center">
            {readError && <Notice tone="error" className="mb-4">{readError}</Notice>}
            {decoded && (
              <div className="rounded-d border border-d-border bg-d-raised p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-emerald-600">{t('action.result', 'QR Code Decoded')}</span>
                  <CopyBtn value={decoded} />
                </div>
                <p className="font-mono text-sm break-all">{decoded}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </StudioWorkspace>
  )
}