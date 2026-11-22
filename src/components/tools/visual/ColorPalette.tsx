'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import chroma from 'chroma-js'
import { ChevronRight, Download, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { Stage, FloatingPanel } from '@/components/domain/Stage'
import { Btn, CopyBtn, Section, Chip, Row, Notice } from '@/components/domain/kit'

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
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  if (!withTints) {
    const SW = 160, SH = 240
    canvas.width = SW * colors.length; canvas.height = SH
    ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, canvas.width, SH)
    colors.forEach((c, i) => {
      const ox = i * SW
      ctx.fillStyle = c; ctx.fillRect(ox + 8, 8, SW - 16, 180)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'
      ctx.fillText(colorLabel(i, harmony), ox + SW / 2, 210)
      ctx.fillStyle = '#a1a1aa'; ctx.font = '12px monospace'
      ctx.fillText(c.toUpperCase(), ox + SW / 2, 228)
    })
  } else {
    const TILE_W  = 120
    const BASE_H  = 140
    const BUMP_H  = 36
    const LABEL_H = 44
    const ROW_H   = BASE_H + BUMP_H + LABEL_H
    const MAIN_IDX = 5

    canvas.width = TILE_W * 10
    canvas.height = ROW_H * colors.length + 16
    ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, canvas.width, canvas.height)

    colors.forEach((baseHex, colorIdx) => {
      const shades = generateShades(baseHex)
      const rowY = 8 + colorIdx * ROW_H

      shades.forEach(({ hex }, si) => {
        const tx = si * TILE_W
        const isMain = si === MAIN_IDX
        const tileH = isMain ? BASE_H + BUMP_H : BASE_H

        ctx.fillStyle = hex
        ctx.fillRect(tx, rowY, TILE_W, tileH)

        const lum = chroma(hex).luminance()
        ctx.fillStyle = lum > 0.4 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.55)'
        ctx.font = isMain ? 'bold 13px monospace' : '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(SHADE_LABELS[si], tx + TILE_W / 2, rowY + BASE_H - 10)

        if (isMain) {
          ctx.beginPath()
          ctx.arc(tx + TILE_W / 2, rowY + BASE_H + BUMP_H / 2, 5, 0, Math.PI * 2)
          ctx.fillStyle = '#fff'
          ctx.fill()
        }
      })

      const labelY = rowY + BASE_H + BUMP_H
      ctx.fillStyle = '#27272a'
      ctx.fillRect(0, labelY, canvas.width, LABEL_H)

      ctx.fillStyle = '#e4e4e7'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'left'
      ctx.fillText(colorLabel(colorIdx, harmony).toUpperCase(), 12, labelY + 16)

      ctx.fillStyle = '#a1a1aa'; ctx.font = '11px monospace'
      ctx.fillText(baseHex.toUpperCase(), 12, labelY + 32)

      shades.forEach(({ hex }, si) => {
        const tx = si * TILE_W
        const isMain = si === MAIN_IDX
        if (isMain) {
          ctx.fillStyle = '#e4e4e7'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'
          ctx.fillText(hex.toUpperCase(), tx + TILE_W / 2, labelY + 16)
          ctx.fillStyle = '#71717a'; ctx.font = '9px monospace'
          ctx.fillText('500 : base', tx + TILE_W / 2, labelY + 30)
        }
      })
    })
  }

  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `palette-${harmony}${withTints ? '-tints' : ''}.png`; a.click()
}

function exportDocument(colors: string[], harmony: Harmony, withTints: boolean) {
  const label = HARMONIES.find(h => h.id === harmony)?.label ?? harmony
  const lines = [`Color Palette : ${label}`, '═'.repeat(44), '']
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

// ─── Components ───────────────────────────────────────────────────────────────
function ShadeRow({ hex, onCopy }: { hex: string; onCopy: (hex: string) => void }) {
  const shades = generateShades(hex)
  return (
    <div className="rounded-d border border-d-border/40 overflow-hidden bg-d-raised/50">
      <div className="flex">
        {shades.map(({ label, hex: sh }) => (
          <div key={label} className="flex-1 group relative cursor-pointer" title={sh.toUpperCase()}>
            <div className="h-10" style={{ backgroundColor: sh }} />
            <div className="px-2 py-1 text-center">
              <span className="text-[9px] font-mono text-d-muted block">{label}</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => onCopy(sh.toUpperCase())}
                className="bg-d-ink/80 text-d-surface text-[8px] font-mono px-1.5 py-0.5 rounded-d">
                {sh.toUpperCase()}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExportPanel({ colors, harmony }: { colors: string[]; harmony: Harmony }) {
  const { t } = useTranslation()
  const [withTints, setWithTints] = useState(false)
  const formats = [
    { label: t('visual.image_png', 'Image (PNG)'),       fn: () => exportImage(colors, harmony, withTints) },
    { label: t('visual.document_txt', 'Document (.txt)'),fn: () => exportDocument(colors, harmony, withTints) },
    { label: t('visual.tailwind', 'Tailwind CSS'),        fn: () => exportTailwind(colors, harmony, withTints) },
    { label: t('visual.figma', 'Figma Tokens'),           fn: () => exportFigma(colors, harmony, withTints) },
  ]
  return (
    <Section title={t('visual.export', 'Export')}>
      <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={withTints} onChange={e => setWithTints(e.target.checked)}
          className="h-4 w-4 rounded-d border-d-border bg-d-raised accent-d-accent" />
        {t('visual.include_tints', 'Include tints')}
      </label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {formats.map(({ label, fn }) => (
          <Btn key={label} size="sm" variant="secondary" onClick={fn} className="w-full">
            {label}
          </Btn>
        ))}
      </div>
    </Section>
  )
}

function HarmonyTabs({ value, onChange, t }: { value: Harmony; onChange: (v: Harmony) => void; t: (key: string, fallback: string) => string }) {
  const harmonyLabel: Record<Harmony, string> = {
    complementary: t('visual.complementary', 'Complementary'),
    analogous:     t('visual.analogous', 'Analogous'),
    triadic:       t('visual.triadic', 'Triadic'),
    split:         t('visual.split_comp', 'Split-Comp.'),
    tetradic:      t('visual.tetradic', 'Tetradic'),
    monochromatic: t('visual.monochromatic', 'Monochromatic'),
    rectangle:     t('visual.rectangle', 'Rectangle'),
    'double-split': t('visual.double_split', 'Dbl. Split'),
  }
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('visual.harmony_rule', 'Harmony rule')}>
      {HARMONIES.map(h => (
        <button key={h.id} role="tab" aria-selected={value === h.id}
          onClick={() => onChange(h.id)}
          className={cn(
            'px-3 py-1.5 rounded-d text-xs font-medium transition-colors',
            value === h.id
              ? 'bg-d-accent text-d-accent-ink'
              : 'bg-d-raised text-d-muted hover:bg-d-border/50'
          )}>
          {harmonyLabel[h.id] ?? h.label}
        </button>
      ))}
    </div>
  )
}

function SwatchRow({
  color,
  index,
  harmony,
  expanded,
  onToggleExpand,
  onCopy,
}: {
  color: string
  index: number
  harmony: Harmony
  expanded: boolean
  onToggleExpand: () => void
  onCopy: (hex: string) => void
}) {
  const { t } = useTranslation()
  const [ch, cs, cl] = chroma(color).hsl()
  const rgb = chroma(color).rgb().map(Math.round)
  const isExpanded = expanded

  return (
    <div className="rounded-d border border-d-border/60 overflow-hidden hover:border-d-border transition-colors">
      <div className="flex items-center gap-3 p-3">
        <div className="w-12 h-12 rounded-d flex-shrink-0 shadow-sm border border-d-ink/10"
          style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold">{color.toUpperCase()}</span>
            <span className="text-[10px] text-d-muted capitalize bg-d-raised/50 px-1.5 py-0.5 rounded-d">
              {colorLabel(index, harmony)}
            </span>
          </div>
          <p className="font-mono text-[10px] text-d-muted">rgb({rgb.join(', ')})</p>
          <p className="font-mono text-[10px] text-d-muted">
            hsl({Math.round(ch ?? 0)}, {Math.round((cs ?? 0) * 100)}%, {Math.round((cl ?? 0) * 100)}%)
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CopyBtn value={color.toUpperCase()} size="sm" />
          <button
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-controls={`shades-${index}`}
            className="h-8 w-8 flex items-center justify-center rounded-d border border-d-border hover:bg-d-border/50 transition-colors text-d-muted hover:text-d-ink"
            title={isExpanded ? t('visual.collapse_all', 'Collapse tints') : t('visual.expand_all', 'Expand tints')}>
            <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} aria-hidden />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div id={`shades-${index}`} className="px-3 pb-3 animate-slide-down">
          <ShadeRow hex={color} onCopy={onCopy} />
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ColorPalette({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [hue, setHue]     = useState<number>((initialState?.hue as number) ?? 239)
  const [sv,  setSv]      = useState<number>((initialState?.sv  as number) ?? 62)
  const [val, setVal]     = useState<number>((initialState?.val as number) ?? 95)
  const [harmony, setHarmony] = useState<Harmony>((initialState?.harmony as Harmony) ?? 'complementary')
  const [hexField, setHexField] = useState('')
  const [canvasSize, setCanvasSize] = useState(280)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showInspector, setShowInspector] = useState(false)
  const [showExport, setShowExport] = useState(false)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging     = useRef<'ring' | 'sq' | null>(null)

  const [, slPct, lPct] = hsvToHsl(hue, sv / 100, val / 100)
  const currentHex = chroma.hsl(hue, slPct / 100, lPct / 100).hex()
  const colors = buildColors(hue, sv, val, harmony)

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
    analytics.buttonClick('color-palette', 'generate')
    onOutput({ hue, sv, val, harmony }, { colors })
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

  function toggleExpandAll() {
    setExpanded(prev => prev.size === colors.length ? new Set() : new Set(colors.map((_, i) => i)))
  }

  function handleCopySwatch(hex: string) {
    navigator.clipboard.writeText(hex.toUpperCase())
    analytics.buttonClick('color-palette', 'copy_swatch')
  }

  const iconBtn = 'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-d text-d-ink transition-colors hover:bg-d-border/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-accent'

  return (
    <Stage>
      {/* Canvas: color wheel owns the screen */}
      <div ref={containerRef} className="absolute inset-0 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={canvasSize} height={canvasSize}
          style={{ width: canvasSize, height: canvasSize, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
          onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onMU}
          aria-label={t('visual.color_wheel', 'Color wheel')}
        />
      </div>

      {/* Floating toolbar - top center */}
      <FloatingPanel label={t('visual.mermaid_tools', 'Palette tools')} className="top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1">
        <HarmonyTabs value={harmony} onChange={setHarmony} t={t} />
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <button className={iconBtn} aria-label={t('visual.inspector', 'Color inspector')} onClick={() => setShowInspector(!showInspector)}>
          <ChevronDown className={cn('h-4 w-4', showInspector && 'rotate-180')} aria-hidden />
        </button>
        <button className={iconBtn} aria-label={t('visual.export', 'Export')} onClick={() => setShowExport(!showExport)}>
          <Download className="h-4 w-4" aria-hidden />
        </button>
        <button className={iconBtn} aria-label={t('visual.copy_hex', 'Copy hex')} onClick={() => navigator.clipboard.writeText(currentHex.toUpperCase())}>
          <Copy className="h-4 w-4" aria-hidden />
        </button>
      </FloatingPanel>

      {/* Floating inspector panel - right side */}
      {showInspector && (
        <FloatingPanel label={t('visual.inspector', 'Color inspector')} className="right-3 top-14 bottom-14 w-[min(22rem,calc(100vw-2rem))] flex flex-col overflow-auto">
          <header className="flex h-10 shrink-0 items-center justify-between border-b border-d-border px-3">
            <h2 className="font-display text-sm font-semibold">{t('visual.inspector', 'Color inspector')}</h2>
            <button className={iconBtn} aria-label={t('visual.close', 'Close')} onClick={() => setShowInspector(false)}>×</button>
          </header>
          <div className="flex-1 overflow-auto p-3 space-y-4">
            <Section title={t('visual.current_color', 'Current color')}>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-d border border-d-ink/10 flex-shrink-0" style={{ backgroundColor: currentHex }} />
                <div className="flex-1 min-w-0 space-y-2">
                  <Row label={t('common.hex', 'Hex')} value={currentHex.toUpperCase()} copy mono />
                  <Row label="HSL" value={`hsl(${Math.round(hue)}, ${Math.round(slPct)}%, ${Math.round(lPct)}%)`} copy mono />
                  <Row label="RGB" value={`rgb(${chroma(currentHex).rgb().join(', ')})`} copy mono />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <label className="text-sm text-d-muted">{t('common.hex', 'Hex')}</label>
                <input
                  value={hexField}
                  onChange={e => { setHexField(e.target.value); applyHex(e.target.value) }}
                  onBlur={e => applyHex(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1 font-mono text-sm border border-d-border rounded-d px-3 py-2 bg-d-raised outline-none focus:border-d-accent"
                  spellCheck={false}
                />
                <CopyBtn value={currentHex.toUpperCase()} size="sm" />
              </div>
            </Section>

            <Section title={t('visual.harmony_colors', 'Harmony colors')}>
              <div className="space-y-2">
                {colors.map((c, i) => (
                  <Row key={i} label={colorLabel(i, harmony)} value={c.toUpperCase()} copy mono />
                ))}
              </div>
            </Section>

            <Section title={t('visual.contrast', 'Contrast checker')}>
              <p className="text-sm text-d-muted">{t('visual.contrast_hint', 'Place text colors over backgrounds to check WCAG AA/AAA')}</p>
              <div className="grid grid-cols-2 gap-2">
                {colors.map((c, i) => (
                  <div key={i} className="rounded-d p-2 text-center" style={{ backgroundColor: c }}>
                    <span className="font-mono text-xs block capitalize">{colorLabel(i, harmony)}</span>
                    <span className="font-mono text-xs block">{c.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </FloatingPanel>
      )}

      {/* Floating export panel - bottom */}
      {showExport && (
        <FloatingPanel label={t('visual.export', 'Export palette')} className="bottom-3 left-1/2 -translate-x-1/2 w-[min(28rem,calc(100vw-1.5rem))]">
          <header className="flex h-10 shrink-0 items-center justify-between border-b border-d-border px-3">
            <h2 className="font-display text-sm font-semibold">{t('visual.export', 'Export palette')}</h2>
            <button className={iconBtn} aria-label={t('visual.close', 'Close')} onClick={() => setShowExport(false)}>×</button>
          </header>
          <div className="p-3">
            <ExportPanel colors={colors} harmony={harmony} />
          </div>
        </FloatingPanel>
      )}

      {/* Swatch bar - bottom floating */}
      <FloatingPanel label={t('visual.palette', 'Color palette')} className="bottom-3 left-1/2 -translate-x-1/2 w-[min(48rem,calc(100vw-1.5rem))] max-h-[40vh] overflow-auto">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-d-border px-3">
          <h2 className="font-display text-sm font-semibold">{HARMONIES.find(h => h.id === harmony)?.label} {t('visual.palette', 'Palette')}</h2>
          <button className="text-xs text-d-muted hover:text-d-ink transition-colors" onClick={toggleExpandAll}>
            {expanded.size === colors.length ? t('visual.collapse_all', 'Collapse all') : t('visual.expand_all', 'Expand all')}
          </button>
        </header>
        <div className="p-3 space-y-2">
          {colors.map((c, i) => (
            <SwatchRow
              key={i}
              color={c}
              index={i}
              harmony={harmony}
              expanded={expanded.has(i)}
              onToggleExpand={() => toggleExpand(i)}
              onCopy={handleCopySwatch}
            />
          ))}
        </div>
      </FloatingPanel>
    </Stage>
  )
}