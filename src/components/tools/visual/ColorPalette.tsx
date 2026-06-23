'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import chroma from 'chroma-js'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

// ─── Types ────────────────────────────────────────────────────────────────────
type Harmony =
  | 'complementary' | 'analogous' | 'triadic' | 'split'
  | 'tetradic' | 'rectangle' | 'double-split' | 'monochromatic'

const HARMONIES: { id: Harmony; label: string; offsets: number[] }[] = [
  { id: 'complementary', label: 'Complementary',    offsets: [0, 180] },
  { id: 'analogous',     label: 'Analogous',        offsets: [-30, 0, 30] },
  { id: 'triadic',       label: 'Triadic',          offsets: [0, 120, 240] },
  { id: 'split',         label: 'Split-Comp.',      offsets: [0, 150, 210] },
  { id: 'tetradic',      label: 'Tetradic',         offsets: [0, 90, 180, 270] },
  { id: 'rectangle',     label: 'Rectangle',        offsets: [0, 60, 180, 240] },
  { id: 'double-split',  label: 'Dbl. Split',       offsets: [-30, 0, 30, 150, 180, 210] },
  { id: 'monochromatic', label: 'Monochromatic',    offsets: [0] },
]

const SHADE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
const SHADE_STOPS  = [0, 0.09, 0.2, 0.32, 0.44, 0.56, 0.68, 0.79, 0.89, 1.0]

// ─── Helpers: HSV ↔ HSL ───────────────────────────────────────────────────────
function hsvToHsl(h: number, s: number, v: number): [number, number, number] {
  const l = v * (1 - s / 2)
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l)
  return [h, sl * 100, l * 100]
}
function hslToHsv(h: number, sl: number, l: number): [number, number, number] {
  const s = sl / 100, li = l / 100
  const v = li + s * Math.min(li, 1 - li)
  const sv = v === 0 ? 0 : 2 * (1 - li / v)
  return [h, sv * 100, v * 100]
}

// ─── Wheel geometry ───────────────────────────────────────────────────────────
function wheelGeom(size: number) {
  const cx = size / 2, cy = size / 2
  const outerR = size / 2 - 6
  const ringW = Math.max(28, Math.round(size / 9))
  const innerR = outerR - ringW
  const sqHalf = (innerR / Math.SQRT2) * 0.93
  return { cx, cy, outerR, innerR, sqHalf }
}

// ─── Canvas draw ──────────────────────────────────────────────────────────────
function drawWheel(canvas: HTMLCanvasElement, hue: number, sv: number, val: number, harmony: Harmony) {
  const ctx = canvas.getContext('2d')!
  const size = canvas.width
  const { cx, cy, outerR, innerR, sqHalf } = wheelGeom(size)
  ctx.clearRect(0, 0, size, size)

  // Hue ring
  const cg = ctx.createConicGradient(-Math.PI / 2, cx, cy)
  for (let i = 0; i <= 6; i++) cg.addColorStop(i / 6, `hsl(${i * 60}, 100%, 50%)`)
  ctx.save()
  ctx.fillStyle = cg
  ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2); ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()

  // SV square
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

  // Harmony handles
  const def = HARMONIES.find(h => h.id === harmony)!
  const offsets = harmony === 'monochromatic' ? [0] : def.offsets
  const ringMid = (outerR + innerR) / 2
  offsets.forEach((off, i) => {
    const h = ((hue + off) % 360 + 360) % 360
    const angle = ((h - 90) * Math.PI) / 180
    const hx = cx + Math.cos(angle) * ringMid
    const hy = cy + Math.sin(angle) * ringMid
    const r = i === 0 ? 11 : 9
    ctx.beginPath(); ctx.arc(hx, hy, r + 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.stroke()
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
  const names = ['primary', 'secondary', 'tertiary', 'quaternary', 'quinary', 'senary']
  return names[i] ?? `color-${i + 1}`
}

function generateShades(hex: string): { label: string; hex: string }[] {
  const light = chroma.mix(hex, 'white', 0.95, 'lab').hex()
  const dark  = chroma.mix(hex, 'black', 0.85, 'lab').hex()
  const scale = chroma.scale([light, hex, dark]).mode('lab')
  return SHADE_LABELS.map((label, i) => ({ label, hex: scale(SHADE_STOPS[i]).hex() }))
}

// ─── Blob download ────────────────────────────────────────────────────────────
function dlBlob(content: string, filename: string, mime: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mime }))
  a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}

// ─── Export functions ─────────────────────────────────────────────────────────
function exportImage(colors: string[], harmony: Harmony, withTints: boolean) {
  const swatchW = withTints ? 560 : 160
  const swatchH = withTints ? 260 : 240
  const canvas = document.createElement('canvas')
  canvas.width = swatchW * colors.length; canvas.height = swatchH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, canvas.width, swatchH)

  colors.forEach((c, i) => {
    const ox = i * swatchW
    if (withTints) {
      const shades = generateShades(c)
      const tileW = Math.floor(swatchW / 10)
      shades.forEach(({ hex }, si) => {
        ctx.fillStyle = hex
        ctx.fillRect(ox + si * tileW, 0, tileW, 200)
        ctx.fillStyle = chroma(hex).luminance() > 0.35 ? '#000' : '#fff'
        ctx.font = '9px monospace'; ctx.textAlign = 'center'
        ctx.fillText(SHADE_LABELS[si], ox + si * tileW + tileW / 2, 218)
      })
      ctx.fillStyle = '#a1a1aa'; ctx.font = '11px monospace'; ctx.textAlign = 'left'
      ctx.fillText(`${colorLabel(i, harmony).toUpperCase()} — ${c.toUpperCase()}`, ox + 4, 238)
    } else {
      ctx.fillStyle = c; ctx.fillRect(ox + 8, 8, swatchW - 16, 180)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
      ctx.fillText(colorLabel(i, harmony), ox + swatchW / 2, 210)
      ctx.fillStyle = '#a1a1aa'; ctx.font = '12px monospace'
      ctx.fillText(c.toUpperCase(), ox + swatchW / 2, 228)
    }
  })

  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `palette-${harmony}${withTints ? '-tints' : ''}.png`; a.click()
}

function exportDocument(colors: string[], harmony: Harmony, withTints: boolean) {
  const label = HARMONIES.find(h => h.id === harmony)?.label ?? harmony
  const lines = [`Color Palette — ${label}`, '═'.repeat(44), '']
  colors.forEach((c, i) => {
    const [ch, cs, cl] = chroma(c).hsl()
    const rgb = chroma(c).rgb().map(Math.round)
    lines.push(
      colorLabel(i, harmony).toUpperCase(),
      `  HEX : ${c.toUpperCase()}`,
      `  RGB : rgb(${rgb.join(', ')})`,
      `  HSL : hsl(${Math.round(ch ?? 0)}, ${Math.round((cs ?? 0) * 100)}%, ${Math.round((cl ?? 0) * 100)}%)`,
    )
    if (withTints) {
      lines.push('  Shades:')
      generateShades(c).forEach(({ label: sl, hex }) => {
        lines.push(`    ${sl.padStart(3)} : ${hex.toUpperCase()}`)
      })
    }
    lines.push('')
  })
  dlBlob(lines.join('\n'), `palette-${harmony}${withTints ? '-tints' : ''}.txt`, 'text/plain')
}

function exportTailwind(colors: string[], harmony: Harmony, withTints: boolean) {
  const obj: Record<string, unknown> = {}
  colors.forEach((c, i) => {
    const name = colorLabel(i, harmony)
    if (withTints) {
      obj[name] = Object.fromEntries(generateShades(c).map(({ label: sl, hex }) => [sl, hex]))
    } else {
      obj[name] = c
    }
  })
  const inner = JSON.stringify(obj, null, 2).replace(/^/gm, '      ').trimStart()
  const config = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        // ${harmony} palette\n        ${inner}\n      }\n    }\n  }\n}\n`
  dlBlob(config, `tailwind-${harmony}${withTints ? '-tints' : ''}.config.js`, 'text/javascript')
}

function exportFigma(colors: string[], harmony: Harmony, withTints: boolean) {
  const tokens: Record<string, unknown> = {}
  colors.forEach((c, i) => {
    const name = colorLabel(i, harmony)
    if (withTints) {
      tokens[name] = Object.fromEntries(
        generateShades(c).map(({ label: sl, hex }) => [sl, { value: hex.toUpperCase(), type: 'color' }])
      )
    } else {
      tokens[name] = { value: c.toUpperCase(), type: 'color' }
    }
  })
  dlBlob(JSON.stringify({ [harmony]: tokens }, null, 2), `figma-${harmony}${withTints ? '-tints' : ''}.json`, 'application/json')
}

// ─── Shade row ────────────────────────────────────────────────────────────────
function ShadeRow({ hex }: { hex: string }) {
  const shades = generateShades(hex)
  return (
    <div className="mt-2 rounded-md overflow-hidden border border-input/40">
      <div className="flex">
        {shades.map(({ label, hex: sh }) => (
          <div key={label} className="flex-1 group relative cursor-pointer" title={sh.toUpperCase()}>
            <div className="h-10" style={{ backgroundColor: sh }} />
            <div className="py-1 text-center">
              <span className="text-[9px] font-mono text-muted-foreground block">{label}</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => navigator.clipboard.writeText(sh.toUpperCase())}
                className="bg-black/60 text-white text-[8px] font-mono px-1 py-0.5 rounded">
                {sh.toUpperCase()}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Export dropdown ──────────────────────────────────────────────────────────
const EXPORT_OPTS = [
  { label: 'Image (PNG)',            fn: (c: string[], h: Harmony) => exportImage(c, h, false) },
  { label: 'Image with tints (PNG)', fn: (c: string[], h: Harmony) => exportImage(c, h, true)  },
  { label: 'Document (.txt)',        fn: (c: string[], h: Harmony) => exportDocument(c, h, false) },
  { label: 'Document with tints',    fn: (c: string[], h: Harmony) => exportDocument(c, h, true)  },
  { label: 'Tailwind Config',        fn: (c: string[], h: Harmony) => exportTailwind(c, h, false) },
  { label: 'Tailwind with tints',    fn: (c: string[], h: Harmony) => exportTailwind(c, h, true)  },
  { label: 'Figma Tokens',           fn: (c: string[], h: Harmony) => exportFigma(c, h, false) },
  { label: 'Figma with tints',       fn: (c: string[], h: Harmony) => exportFigma(c, h, true)  },
]

function ExportDropdown({ colors, harmony }: { colors: string[]; harmony: Harmony }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-full justify-between">
        Export
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 right-0 left-0 bg-popover border border-input rounded-md shadow-xl z-20 overflow-hidden">
          {EXPORT_OPTS.map(({ label, fn }) => (
            <button key={label} onClick={() => { fn(colors, harmony); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors border-b border-input/40 last:border-0">
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ColorPalette({ onOutput, initialState }: ToolProps) {
  const [hue, setHue]     = useState<number>((initialState?.hue as number) ?? 239)
  const [sv,  setSv]      = useState<number>((initialState?.sv  as number) ?? 62)
  const [val, setVal]     = useState<number>((initialState?.val as number) ?? 95)
  const [harmony, setHarmony] = useState<Harmony>((initialState?.harmony as Harmony) ?? 'complementary')
  const [hexField, setHexField] = useState('')
  const [canvasSize, setCanvasSize] = useState(280)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging     = useRef<'ring' | 'sq' | null>(null)

  const [, slPct, lPct] = hsvToHsl(hue, sv / 100, val / 100)
  const currentHex = chroma.hsl(hue, slPct / 100, lPct / 100).hex()

  useEffect(() => { setHexField(currentHex.toUpperCase()) }, [currentHex])

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setCanvasSize(Math.max(200, Math.min(Math.floor(e.contentRect.width), 340)))
    })
    ro.observe(el); return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.width = canvasSize; canvas.height = canvasSize
    drawWheel(canvas, hue, sv, val, harmony)
  }, [hue, sv, val, harmony, canvasSize])

  useEffect(() => {
    onOutput({ hue, sv, val, harmony }, { colors: buildColors(hue, sv, val, harmony) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hue, sv, val, harmony])

  const handlePointer = useCallback((clientX: number, clientY: number, phase: 'down' | 'move') => {
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = canvas.width / rect.width
    const x = (clientX - rect.left) * scale
    const y = (clientY - rect.top)  * scale
    const { cx, cy, outerR, innerR, sqHalf } = wheelGeom(canvas.width)
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (phase === 'down') {
      if (dist >= innerR && dist <= outerR) dragging.current = 'ring'
      else if (dist < innerR)              dragging.current = 'sq'
    }
    if (dragging.current === 'ring') {
      setHue(Math.round(((Math.atan2(dy, dx) * 180 / Math.PI) + 90 + 360) % 360))
    } else if (dragging.current === 'sq') {
      const sx = cx - sqHalf, sy = cy - sqHalf, sw = sqHalf * 2
      setSv(Math.round(Math.max(0, Math.min(100, ((x - sx) / sw) * 100))))
      setVal(Math.round(Math.max(0, Math.min(100, (1 - (y - sy) / sw) * 100))))
    }
  }, [])

  const onMD = (e: React.MouseEvent) => handlePointer(e.clientX, e.clientY, 'down')
  const onMM = (e: React.MouseEvent) => { if (dragging.current) handlePointer(e.clientX, e.clientY, 'move') }
  const onMU = () => { dragging.current = null }
  const onTS = (e: React.TouchEvent) => { e.preventDefault(); handlePointer(e.touches[0].clientX, e.touches[0].clientY, 'down') }
  const onTM = (e: React.TouchEvent) => { if (dragging.current) { e.preventDefault(); handlePointer(e.touches[0].clientX, e.touches[0].clientY, 'move') } }

  function applyHex(hex: string) {
    try {
      const c = chroma(hex)
      const [ch, cs, cl] = c.hsl()
      const [nh, ns, nv] = hslToHsv(ch ?? 0, (cs ?? 0) * 100, (cl ?? 0) * 100)
      setHue(Math.round(nh)); setSv(Math.round(ns)); setVal(Math.round(nv))
    } catch { /* ignore mid-type */ }
  }

  function toggleExpand(i: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const colors = buildColors(hue, sv, val, harmony)

  return (
    <div className="space-y-4">
      {/* Harmony tabs */}
      <div className="flex flex-wrap gap-1.5">
        {HARMONIES.map(h => (
          <button key={h.id} onClick={() => { setHarmony(h.id); setExpanded(new Set()) }}
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
            onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onMU}
          />
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

        {/* Swatches + export */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {HARMONIES.find(h => h.id === harmony)?.label} Palette
            </p>
            <button
              onClick={() => setExpanded(expanded.size === colors.length ? new Set() : new Set(colors.map((_, i) => i)))}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {expanded.size === colors.length ? 'Collapse all' : 'Expand all'}
            </button>
          </div>

          <div className="space-y-2">
            {colors.map((c, i) => {
              const [ch, cs, cl] = chroma(c).hsl()
              const rgb = chroma(c).rgb().map(Math.round)
              const isExpanded = expanded.has(i)
              return (
                <div key={i} className="rounded-lg border border-input/60 overflow-hidden hover:border-input transition-colors">
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-2.5">
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
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <CopyButton value={c.toUpperCase()} />
                      <button
                        onClick={() => toggleExpand(i)}
                        title={isExpanded ? 'Collapse tints' : 'Expand tints'}
                        className="h-7 w-7 flex items-center justify-center rounded-md border border-input hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {/* Tint row */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5">
                      <ShadeRow hex={c} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Export */}
          <div className="pt-2">
            <ExportDropdown colors={colors} harmony={harmony} />
          </div>
        </div>
      </div>
    </div>
  )
}
