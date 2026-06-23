'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'generate' | 'read'
type DotShape = 'square' | 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'extra-rounded'
type CornerShape = 'square' | 'dot' | 'extra-rounded'
type CornerDotShape = 'square' | 'dot'

const DOT_SHAPES: { id: DotShape; label: string }[] = [
  { id: 'square',          label: 'Square' },
  { id: 'dots',            label: 'Dots' },
  { id: 'rounded',         label: 'Rounded' },
  { id: 'classy',          label: 'Classy' },
  { id: 'classy-rounded',  label: 'Classy Rounded' },
  { id: 'extra-rounded',   label: 'Extra Rounded' },
]

const CORNER_SHAPES: { id: CornerShape; label: string }[] = [
  { id: 'square',        label: 'Square' },
  { id: 'dot',           label: 'Dot' },
  { id: 'extra-rounded', label: 'Rounded' },
]

const CORNER_DOT_SHAPES: { id: CornerDotShape; label: string }[] = [
  { id: 'square', label: 'Square' },
  { id: 'dot',    label: 'Dot' },
]

const ERROR_LEVELS = ['L', 'M', 'Q', 'H'] as const
type ErrorLevel = typeof ERROR_LEVELS[number]

interface QrOptions {
  dotShape: DotShape
  cornerShape: CornerShape
  cornerDotShape: CornerDotShape
  dotColor: string
  bgColor: string
  bgTransparent: boolean
  cornerColor: string
  cornerDotColor: string
  useCustomCornerColor: boolean
  size: number
  margin: number
  errorLevel: ErrorLevel
  logoDataUrl: string
  logoSize: number
}

const DEFAULT_OPTS: QrOptions = {
  dotShape: 'square',
  cornerShape: 'square',
  cornerDotShape: 'square',
  dotColor: '#000000',
  bgColor: '#ffffff',
  bgTransparent: false,
  cornerColor: '#000000',
  cornerDotColor: '#000000',
  useCustomCornerColor: false,
  size: 300,
  margin: 2,
  errorLevel: 'M',
  logoDataUrl: '',
  logoSize: 20,
}

// ─── color swatch button ───────────────────────────────────────────────────────
function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
      <span className="w-24 shrink-0">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-8 h-6 rounded border border-input cursor-pointer bg-transparent" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="font-mono text-xs w-20 border border-input rounded px-2 py-1 bg-background outline-none focus:ring-1 focus:ring-ring" />
    </label>
  )
}

// ─── shape pill selector ───────────────────────────────────────────────────────
function ShapeSelect<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`px-2 py-1 rounded text-xs transition-colors ${value === o.id ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function QrCode({ onOutput, initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('generate')
  const [input, setInput] = useState((initialState?.input as string) ?? 'https://example.com')
  const [opts, setOpts] = useState<QrOptions>(DEFAULT_OPTS)
  const [decoded, setDecoded] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<InstanceType<typeof import('qr-code-styling').default> | null>(null)

  function set<K extends keyof QrOptions>(key: K, value: QrOptions[K]) {
    setOpts(prev => ({ ...prev, [key]: value }))
  }

  // Build / update the QR instance whenever input or opts change
  useEffect(() => {
    if (tab !== 'generate') return
    let cancelled = false

    async function build() {
      const QRCodeStyling = (await import('qr-code-styling')).default
      if (cancelled || !containerRef.current) return

      const bgVal = opts.bgTransparent ? '#00000000' : opts.bgColor
      const cornerColor = opts.useCustomCornerColor ? opts.cornerColor : opts.dotColor
      const cornerDotColor = opts.useCustomCornerColor ? opts.cornerDotColor : opts.dotColor

      const config = {
        width: opts.size,
        height: opts.size,
        data: input.trim() || ' ',
        margin: opts.margin,
        qrOptions: { errorCorrectionLevel: opts.errorLevel },
        dotsOptions: { type: opts.dotShape, color: opts.dotColor },
        backgroundOptions: { color: bgVal },
        cornersSquareOptions: { type: opts.cornerShape, color: cornerColor },
        cornersDotOptions: { type: opts.cornerDotShape, color: cornerDotColor },
        ...(opts.logoDataUrl ? {
          image: opts.logoDataUrl,
          imageOptions: { crossOrigin: 'anonymous', margin: 4, imageSize: opts.logoSize / 100 },
        } : {}),
      }

      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling(config)
        containerRef.current.innerHTML = ''
        qrRef.current.append(containerRef.current)
      } else {
        qrRef.current.update(config)
      }

      onOutput({ text: input }, {})
    }

    build()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, opts, tab])

  function downloadQr(format: 'png' | 'svg' | 'jpeg' | 'webp') {
    qrRef.current?.download({ name: 'qrcode', extension: format })
  }

  const handleLogoFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => set('logoDataUrl', e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleFile = useCallback((file: File) => {
    setReadError(null)
    setDecoded('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height)
        if (result) {
          setDecoded(result.data)
          onOutput({ action: 'read' }, { decoded: result.data })
        } else {
          setReadError('No QR code found in image')
        }
      }
      img.onerror = () => setReadError('Failed to load image')
      img.src = e.target?.result as string
    }
    reader.onerror = () => setReadError('Failed to read file')
    reader.readAsDataURL(file)
  }, [onOutput])

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['generate', 'read'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setDecoded(''); setReadError(null) }}
            className={`px-4 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'generate' ? 'Generate QR' : 'Read QR'}
          </button>
        ))}
      </div>

      {tab === 'generate' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
          {/* Controls */}
          <div className="space-y-5">
            {/* Content */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
              <textarea value={input} onChange={e => setInput(e.target.value)}
                className="w-full min-h-[80px] text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://example.com" spellCheck={false} />
            </div>

            {/* Dot style */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Module shape</label>
              <ShapeSelect options={DOT_SHAPES} value={opts.dotShape} onChange={v => set('dotShape', v)} />
            </div>

            {/* Corner styles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Corner square</label>
                <ShapeSelect options={CORNER_SHAPES} value={opts.cornerShape} onChange={v => set('cornerShape', v)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Corner dot</label>
                <ShapeSelect options={CORNER_DOT_SHAPES} value={opts.cornerDotShape} onChange={v => set('cornerDotShape', v)} />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">Colors</label>
              <ColorInput label="Modules" value={opts.dotColor} onChange={v => set('dotColor', v)} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <span className="w-24 shrink-0">Background</span>
                <input type="color" value={opts.bgColor} onChange={e => set('bgColor', e.target.value)}
                  className={`w-8 h-6 rounded border border-input cursor-pointer bg-transparent ${opts.bgTransparent ? 'opacity-30' : ''}`}
                  disabled={opts.bgTransparent} />
                <input type="text" value={opts.bgTransparent ? 'transparent' : opts.bgColor}
                  onChange={e => { if (!opts.bgTransparent) set('bgColor', e.target.value) }}
                  className="font-mono text-xs w-20 border border-input rounded px-2 py-1 bg-background outline-none focus:ring-1 focus:ring-ring" />
                <label className="flex items-center gap-1 ml-2 cursor-pointer">
                  <input type="checkbox" checked={opts.bgTransparent} onChange={e => set('bgTransparent', e.target.checked)}
                    className="rounded border-input" />
                  <span>transparent</span>
                </label>
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <span className="w-24 shrink-0">Custom corners</span>
                <input type="checkbox" checked={opts.useCustomCornerColor} onChange={e => set('useCustomCornerColor', e.target.checked)}
                  className="rounded border-input" />
              </label>
              {opts.useCustomCornerColor && (
                <div className="ml-4 space-y-1.5">
                  <ColorInput label="Corner square" value={opts.cornerColor} onChange={v => set('cornerColor', v)} />
                  <ColorInput label="Corner dot" value={opts.cornerDotColor} onChange={v => set('cornerDotColor', v)} />
                </div>
              )}
            </div>

            {/* Logo */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Logo (optional)</label>
              {opts.logoDataUrl ? (
                <div className="flex items-center gap-3">
                  <img src={opts.logoDataUrl} alt="logo" className="h-10 w-10 object-contain rounded border border-input" />
                  <div className="flex-1">
                    <input type="range" min={10} max={40} value={opts.logoSize}
                      onChange={e => set('logoSize', +e.target.value)}
                      className="w-full" />
                    <span className="text-xs text-muted-foreground">Size: {opts.logoSize}%</span>
                  </div>
                  <button onClick={() => set('logoDataUrl', '')}
                    className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded border border-rose-400/30">
                    Remove
                  </button>
                </div>
              ) : (
                <FileDropzone accept="image/*" onFile={handleLogoFile} label="Drop logo image (PNG with transparency works best)" compact />
              )}
              {opts.logoDataUrl && (
                <p className="text-xs text-muted-foreground mt-1">Use error correction H for best results with logos</p>
              )}
            </div>

            {/* Settings row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Size (px)</label>
                <input type="number" value={opts.size} min={100} max={1000} step={50}
                  onChange={e => set('size', +e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Margin</label>
                <input type="number" value={opts.margin} min={0} max={10}
                  onChange={e => set('margin', +e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Error correction</label>
                <select value={opts.errorLevel} onChange={e => set('errorLevel', e.target.value as ErrorLevel)}
                  className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring">
                  {ERROR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Preview + download */}
          <div className="flex flex-col items-center gap-4 lg:w-[320px]">
            <div
              ref={containerRef}
              className="rounded-xl border border-input overflow-hidden"
              style={{
                background: opts.bgTransparent
                  ? 'repeating-conic-gradient(#80808020 0% 25%, transparent 0% 50%) 0 0 / 12px 12px'
                  : undefined
              }}
            />
            <div className="flex flex-wrap gap-2 justify-center">
              {(['png', 'svg', 'jpeg', 'webp'] as const).map(fmt => (
                <button key={fmt} onClick={() => downloadQr(fmt)}
                  className="px-3 py-1.5 rounded-md border border-input text-xs hover:bg-muted/50 transition-colors uppercase font-mono">
                  .{fmt}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image containing a QR code" />
          {readError && <ErrorAlert message={readError} />}
          {decoded && (
            <div className="rounded-md border border-input p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-400">✓ QR Code Decoded</span>
                <CopyButton value={decoded} />
              </div>
              <p className="font-mono text-sm break-all">{decoded}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
