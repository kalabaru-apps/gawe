'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import chroma from 'chroma-js'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

// ─── Types ────────────────────────────────────────────────────────────────────
type Harmony = 'complementary' | 'analogous' | 'triadic' | 'split' | 'tetradic' | 'monochromatic'

const HARMONIES: { id: Harmony; label: string; offsets: number[] }[] = [
  { id: 'complementary', label: 'Complementary',      offsets: [0, 180] },
  { id: 'analogous',     label: 'Analogous',          offsets: [-30, 0, 30] },
  { id: 'triadic',       label: 'Triadic',            offsets: [0, 120, 240] },
  { id: 'split',         label: 'Split-Comp.',        offsets: [0, 150, 210] },
  { id: 'tetradic',      label: 'Tetradic',           offsets: [0, 90, 180, 270] },
  { id: 'monochromatic', label: 'Monochromatic',      offsets: [0] },
]

// ─── HSV ↔ HSL ───────────────────────────────────────────────────────────────
// s, v in 0–1; returns [h, sl*100, l*100]
function hsvToHsl(h: number, s: number, v: number): [number, number, number] {
  const l = v * (1 - s / 2)
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l)
  return [h, sl * 100, l * 100]
}
// sl, l in 0–100; returns [h, sv*100, val*100]
function hslToHsv(h: number, sl: number, l: number): [number, number, number] {
  const s = sl / 100, li = l / 100
  const v = li + s * Math.min(li, 1 - li)
  const sv = v === 0 ? 0 : 2 * (1 - li / v)
  return [h, sv * 100, v * 100]
}

// ─── Wheel geometry (shared between draw + hittest) ───────────────────────────
function wheelGeom(size: number) {
  const cx = size / 2, cy = size / 2
  const outerR = size / 2 - 6
  const ringW = Math.max(28, Math.round(size / 9))
  const innerR = outerR - ringW
  const sqHalf = (innerR / Math.SQRT2) * 0.93
  return { cx, cy, outerR, innerR, ringW, sqHalf }
}

// ─── Canvas draw ──────────────────────────────────────────────────────────────
function drawWheel(canvas: HTMLCanvasElement, hue: number, sv: number, val: number, harmony: Harmony) {
  const ctx = canvas.getContext('2d')!
  const size = canvas.width
  const { cx, cy, outerR, innerR, sqHalf } = wheelGeom(size)

  ctx.clearRect(0, 0, size, size)

  // Hue ring via conic gradient + destination-out punch
  const cg = ctx.createConicGradient(-Math.PI / 2, cx, cy)
  for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`)
  ctx.save()
  ctx.fillStyle = cg
  ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()

  // SV square (HSV picker) clipped to inner circle
  const sx = cx - sqHalf, sy = cy - sqHalf, sw = sqHalf * 2
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2); ctx.clip()
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`; ctx.fillRect(sx, sy, sw, sw)
  const wg = ctx.createLinearGradient(sx, 0, sx + sw, 0)
  wg.addColorStop(0, 'rgba(255,255,255,1)'); wg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = wg; ctx.fillRect(sx, sy, sw, sw)
  const bg = ctx.createLinearGradient(0, sy, 0, sy + sw)
  bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = bg; ctx.fillRect(sx, sy, sw, sw)
  ctx.restore()

  // SV handle
  const [, , lPct] = hsvToHsl(hue, sv / 100, val / 100)
  const shx = sx + (sv / 100) * sw
  const shy = sy + (1 - val / 100) * sw
  ctx.beginPath(); ctx.arc(shx, shy, 7, 0, Math.PI * 2)
  ctx.fillStyle = `hsl(${hue}, ${sv}%, ${lPct}%)`; ctx.fill()
  ctx.strokeStyle = lPct > 55 ? '#000' : '#fff'; ctx.lineWidth = 2.5; ctx.stroke()

  // Harmony handles on ring
  const def = HARMONIES.find(h => h.id === harmony)!
  const offsets = harmony === 'monochromatic' ? [0] : def.offsets
  const ringMid = (outerR + innerR) / 2
  offsets.forEach((off, i) => {
    const h = ((hue + off) % 360 + 360) % 360
    const angle = ((h - 90) * Math.PI) / 180
    const hx = cx + Math.cos(angle) * ringMid
    const hy = cy + Math.sin(angle) * ringMid
    const r = i === 0 ? 11 : 9

    // Shadow ring
    ctx.beginPath(); ctx.arc(hx, hy, r + 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()
    // Fill
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2)
    ctx.fillStyle = `hsl(${h}, 100%, 50%)`; ctx.fill()
    ctx.strokeStyle = '#fff'; ctx.lineWidth = i === 0 ? 2.5 : 1.5; ctx.stroke()
  })
}

// ─── Color generation ─────────────────────────────────────────────────────────
function buildColors(hue: number, sv: number, val: number, harmony: Harmony): string[] {
  const [, slPct, lPct] = hsvToHsl(hue, sv / 100, val / 100)
  const sl = slPct / 100, l = lPct / 100
  if (harmony === 'monochromatic') {
    return [0.1, 0.3, 0.5, 0.7, 0.9].map(lv => chroma.hsl(hue, sl, lv).hex())
  }
  return HARMONIES.find(h => h.id === harmony)!.offsets.map(off => {
    const h = ((hue + off) % 360 + 360) % 360
    return chroma.hsl(h, sl, l).hex()
  })
}

function colorLabel(i: number, harmony: Harmony): string {
  if (harmony === 'monochromatic') return ['100', '300', '500', '700', '900'][i] ?? `${i}`
  return ['primary', 'secondary', 'tertiary', 'quaternary'][i] ?? `color-${i + 1}`
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function dlBlob(content: string, filename: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

function exportImage(colors: string[], harmony: Harmony) {
  const sw = 160, sh = 240
  const canvas = document.createElement('canvas')
  canvas.width = sw * colors.length; canvas.height = sh
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, canvas.width, sh)
  colors.forEach((c, i) => {
    ctx.fillStyle = c; ctx.fillRect(i * sw + 8, 8, sw - 16, 180)
    const lum = chroma(c).luminance()
    ctx.fillStyle = lum > 0.35 ? '#000' : '#fff'
    ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
    ctx.fillText(colorLabel(i, harmony), i * sw + sw / 2, 210)
    ctx.font = '12px monospace'
    ctx.fillStyle = '#a1a1aa'
    ctx.fillText(c.toUpperCase(), i * sw + sw / 2, 228)
  })
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `palette-${harmony}.png`; a.click()
}

function exportDocument(colors: string[], harmony: Harmony) {
  const label = HARMONIES.find(h => h.id === harmony)?.label ?? harmony
  const text = [
    `Color Palette — ${label}`, '═'.repeat(44), '',
    ...colors.flatMap((c, i) => {
      const rgb = chroma(c).rgb().map(Math.round)
      const [h, s, l] = chroma(c).hsl()
      return [
        `${colorLabel(i, harmony).toUpperCase()}`,
        `  HEX : ${c.toUpperCase()}`,
        `  RGB : rgb(${rgb.join(', ')})`,
        `  HSL : hsl(${Math.round(h ?? 0)}, ${Math.round((s ?? 0) * 100)}%, ${Math.round((l ?? 0) * 100)}%)`,
        '',
      ]
    }),
  ].join('\n')
  dlBlob(text, `palette-${harmony}.txt`, 'text/plain')
}

function exportTailwind(colors: string[], harmony: Harmony) {
  const obj = Object.fromEntries(colors.map((c, i) => [colorLabel(i, harmony), c]))
  const inner = JSON.stringify(obj, null, 2).replace(/^/gm, '        ').trimStart()
  const config = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        // ${harmony} palette\n        ${inner}\n      }\n    }\n  }\n}\n`
  dlBlob(config, 'tailwind.config.js', 'text/javascript')
}

function exportFigma(colors: string[], harmony: Harmony) {
  const tokens = Object.fromEntries(
    colors.map((c, i) => [colorLabel(i, harmony), { value: c.toUpperCase(), type: 'color' }])
  )
  dlBlob(JSON.stringify({ [harmony]: tokens }, null, 2), `figma-tokens-${harmony}.json`, 'application/json')
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ColorPalette({ onOutput, initialState }: ToolProps) {
  const [hue, setHue]       = useState<number>((initialState?.hue as number) ?? 239)
  const [sv,  setSv]        = useState<number>((initialState?.sv  as number) ?? 62)
  const [val, setVal]       = useState<number>((initialState?.val as number) ?? 95)
  const [harmony, setHarmony] = useState<Harmony>((initialState?.harmony as Harmony) ?? 'complementary')
  const [hexField, setHexField] = useState('')
  const [canvasSize, setCanvasSize] = useState(280)

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging    = useRef<'ring' | 'sq' | null>(null)

  // Sync hex field from hue/sv/val
  const [, slPct, lPct] = hsvToHsl(hue, sv / 100, val / 100)
  const currentHex = chroma.hsl(hue, slPct / 100, lPct / 100).hex()

  useEffect(() => { setHexField(currentHex.toUpperCase()) }, [currentHex])

  // Responsive canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setCanvasSize(Math.max(200, Math.min(Math.floor(e.contentRect.width), 340)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvasSize; canvas.height = canvasSize
    drawWheel(canvas, hue, sv, val, harmony)
  }, [hue, sv, val, harmony, canvasSize])

  // Report
  useEffect(() => {
    onOutput({ hue, sv, val, harmony }, { colors: buildColors(hue, sv, val, harmony) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hue, sv, val, harmony])

  // Pointer interaction
  const handlePointer = useCallback((clientX: number, clientY: number, phase: 'down' | 'move') => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = canvas.width / rect.width
    const x = (clientX - rect.left) * scale
    const y = (clientY - rect.top) * scale
    const { cx, cy, outerR, innerR, sqHalf } = wheelGeom(canvas.width)
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (phase === 'down') {
      if (dist >= innerR && dist <= outerR) dragging.current = 'ring'
      else if (dist < innerR)              dragging.current = 'sq'
    }

    if (dragging.current === 'ring') {
      const angle = ((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360
      setHue(Math.round(angle))
    } else if (dragging.current === 'sq') {
      const sx = cx - sqHalf, sy = cy - sqHalf, sw = sqHalf * 2
      setSv(Math.round(Math.max(0, Math.min(100, ((x - sx) / sw) * 100))))
      setVal(Math.round(Math.max(0, Math.min(100, (1 - (y - sy) / sw) * 100))))
    }
  }, [])

  const onMD = (e: React.MouseEvent) => { handlePointer(e.clientX, e.clientY, 'down') }
  const onMM = (e: React.MouseEvent) => { if (dragging.current) handlePointer(e.clientX, e.clientY, 'move') }
  const onMU = () => { dragging.current = null }
  const onTS = (e: React.TouchEvent) => { e.preventDefault(); handlePointer(e.touches[0].clientX, e.touches[0].clientY, 'down') }
  const onTM = (e: React.TouchEvent) => { if (dragging.current) { e.preventDefault(); handlePointer(e.touches[0].clientX, e.touches[0].clientY, 'move') } }
  const onTE = () => { dragging.current = null }

  function applyHex(hex: string) {
    try {
      const c = chroma(hex)
      const [ch, cs, cl] = c.hsl()
      const [nh, ns, nv] = hslToHsv(ch ?? 0, (cs ?? 0) * 100, (cl ?? 0) * 100)
      setHue(Math.round(nh)); setSv(Math.round(ns)); setVal(Math.round(nv))
    } catch { /* ignore invalid mid-type */ }
  }

  const colors = buildColors(hue, sv, val, harmony)

  const EXPORTS = [
    { label: 'Image (PNG)',    fn: () => exportImage(colors, harmony) },
    { label: 'Document (.txt)', fn: () => exportDocument(colors, harmony) },
    { label: 'Tailwind Config', fn: () => exportTailwind(colors, harmony) },
    { label: 'Figma Tokens',   fn: () => exportFigma(colors, harmony) },
  ]

  return (
    <div className="space-y-4">
      {/* Harmony tabs */}
      <div className="flex flex-wrap gap-1.5">
        {HARMONIES.map(h => (
          <button key={h.id} onClick={() => setHarmony(h.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              harmony === h.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}>
            {h.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        {/* Color wheel */}
        <div className="flex flex-col items-center gap-3" ref={containerRef} style={{ minWidth: 200 }}>
          <canvas
            ref={canvasRef}
            width={canvasSize} height={canvasSize}
            style={{ width: canvasSize, height: canvasSize, cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
            onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
          />
          {/* Hex + HSL input row */}
          <div className="flex items-center gap-2 w-full" style={{ maxWidth: canvasSize }}>
            <div className="w-9 h-9 rounded-md border border-input flex-shrink-0 shadow-sm"
              style={{ backgroundColor: currentHex }} />
            <input
              value={hexField}
              onChange={e => { setHexField(e.target.value); applyHex(e.target.value) }}
              onBlur={e => applyHex(e.target.value)}
              placeholder="#6366f1"
              className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring w-0"
              spellCheck={false}
            />
            <CopyButton value={currentHex.toUpperCase()} />
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            hsl({Math.round(hue)}, {Math.round(slPct)}%, {Math.round(lPct)}%)
          </p>
        </div>

        {/* Palette swatches + exports */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {HARMONIES.find(h => h.id === harmony)?.label} Palette
          </p>

          <div className="space-y-2">
            {colors.map((c, i) => {
              const [ch, cs, cl] = chroma(c).hsl()
              const rgb = chroma(c).rgb().map(Math.round)
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-input/60 p-2.5 hover:border-input transition-colors">
                  <div className="w-12 h-12 rounded-md flex-shrink-0 shadow-sm border border-black/10"
                    style={{ backgroundColor: c }} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{c.toUpperCase()}</span>
                      <span className="text-[10px] text-muted-foreground capitalize bg-muted/60 px-1.5 py-0.5 rounded">
                        {colorLabel(i, harmony)}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      rgb({rgb.join(', ')})
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      hsl({Math.round(ch ?? 0)}, {Math.round((cs ?? 0) * 100)}%, {Math.round((cl ?? 0) * 100)}%)
                    </p>
                  </div>
                  <CopyButton value={c.toUpperCase()} />
                </div>
              )
            })}
          </div>

          {/* Export */}
          <div className="pt-3 border-t border-input">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Export</p>
            <div className="grid grid-cols-2 gap-2">
              {EXPORTS.map(({ label, fn }) => (
                <button key={label} onClick={fn}
                  className="px-3 py-2.5 rounded-md border border-input text-xs font-medium hover:bg-muted/50 hover:border-primary/40 transition-colors text-left">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
