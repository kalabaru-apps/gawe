'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ZoomIn, ZoomOut, RotateCcw, Download, Copy,
  Upload, Shuffle, Palette, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { Stage, FloatingPanel } from '@/components/domain/Stage'

const SAMPLES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix the issue]
    E --> B`,
  sequence: `sequenceDiagram
    participant U as User
    participant A as App
    participant S as Server
    U->>A: Click button
    A->>S: POST /api/action
    S-->>A: 200 OK
    A-->>U: Show result`,
  class: `classDiagram
    class Animal {
      +String name
      +makeSound()
    }
    class Dog {
      +fetch()
    }
    Animal <|-- Dog`,
  state: `stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: fetch
    Loading --> Success: resolve
    Loading --> Error: reject
    Success --> [*]
    Error --> Idle: retry`,
  pie: `pie title Time Spent
    "Coding" : 45
    "Debugging" : 30
    "Coffee" : 25`,
}

const THEMES = ['dark', 'default', 'forest', 'neutral'] as const
type MermaidTheme = (typeof THEMES)[number]

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function MermaidDiagram({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? SAMPLES.flowchart)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<MermaidTheme>('dark')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [transformOrigin, setTransformOrigin] = useState('center center')
    const [showEditorDrawer, setShowEditorDrawer] = useState(true)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const renderIdRef = useRef(0)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragStateRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!input.trim()) return
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose' })
        renderIdRef.current++
        const id = `gawe-mermaid-${renderIdRef.current}`
        const { svg: renderedSvg } = await mermaid.render(id, input.trim())
        setSvg(renderedSvg)
        setError(null)
        analytics.buttonClick('mermaid', 'render')
        onOutput({ definition: input }, { rendered: true })
      } catch (e) {
        setError((e as Error).message)
        setSvg('')
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // onOutput is intentionally excluded : it's stable via useCallback in ToolPageClient
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, theme])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setTransformOrigin('center center')
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!svg) return
    e.preventDefault()
    const rect = previewRef.current?.getBoundingClientRect()
    if (rect) {
      const originX = ((e.clientX - rect.left) / rect.width) * 100
      const originY = ((e.clientY - rect.top) / rect.height) * 100
      setTransformOrigin(`${originX}% ${originY}%`)
    }
    setZoom((z) => clamp(z * (1 - e.deltaY * 0.001), MIN_ZOOM, MAX_ZOOM))
  }, [svg])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!svg) return
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsDragging(true)
  }, [svg, pan])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragStateRef.current
      if (!drag) return
      setPan({ x: drag.panX + (e.clientX - drag.startX), y: drag.panY + (e.clientY - drag.startY) })
    }
    const handleMouseUp = () => {
      dragStateRef.current = null
      setIsDragging(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleShuffle = useCallback(() => {
    const keys = Object.keys(SAMPLES)
    const others = keys.filter((k) => SAMPLES[k] !== input)
    const pick = others[Math.floor(Math.random() * others.length)] ?? keys[0]
    setInput(SAMPLES[pick])
    resetView()
    analytics.buttonClick('mermaid', 'shuffle')
  }, [input, resetView])

  const handleCycleTheme = useCallback(() => {
    setTheme((current) => THEMES[(THEMES.indexOf(current) + 1) % THEMES.length])
  }, [])

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), [])

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setInput(String(reader.result ?? ''))
      resetView()
      analytics.buttonClick('mermaid', 'import')
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [resetView])

  const downloadSvg = useCallback(() => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
    analytics.buttonClick('mermaid', 'export_svg')
  }, [svg])

  const downloadPng = useCallback(() => {
    if (!svg) return
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const scaleFactor = 2
      const width = img.naturalWidth || 800
      const height = img.naturalHeight || 600
      const canvas = document.createElement('canvas')
      canvas.width = width * scaleFactor
      canvas.height = height * scaleFactor
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(scaleFactor, scaleFactor)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        if (!blob) return
        const pngUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = 'diagram.png'
        a.click()
        URL.revokeObjectURL(pngUrl)
      })
    }
    img.src = url
    setShowExportMenu(false)
    analytics.buttonClick('mermaid', 'export_png')
  }, [svg])

  const iconBtn = 'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-d text-d-ink transition-colors hover:bg-d-border/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-accent'

  return (
    <Stage>
      <input ref={fileInputRef} type="file" accept=".mmd,.mermaid,.txt" className="hidden" onChange={handleImportFile} aria-label={t('visual.mermaid_import', 'Import file')} />

      {/* Canvas: owns the whole area */}
      <div
        ref={previewRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={resetView}
        className={cn(
          'absolute inset-0 flex items-center justify-center overflow-hidden select-none',
          svg && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
        )}
      >
        {svg ? (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            className="max-w-full transition-transform duration-75 ease-out"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin }}
          />
        ) : (
          <p className="text-sm text-d-muted">{t('visual.mermaid_preview', 'Type a diagram on the left and it draws here.')}</p>
        )}
      </div>

      {/* Floating toolbar */}
      <FloatingPanel label={t('visual.mermaid_tools', 'Diagram tools')} className="left-1/2 top-3 flex -translate-x-1/2 items-center gap-0.5 p-1">
        <button className={iconBtn} aria-label={t('visual.mermaid_zoom_out', 'Zoom out')} title={t('visual.mermaid_zoom_out', 'Zoom out')} onClick={() => setZoom((z) => clamp(z * 0.8, MIN_ZOOM, MAX_ZOOM))}><ZoomOut className="h-4 w-4" aria-hidden /></button>
        <span className="w-11 select-none text-center text-xs tabular-nums text-d-muted" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button className={iconBtn} aria-label={t('visual.mermaid_zoom_in', 'Zoom in')} title={t('visual.mermaid_zoom_in', 'Zoom in')} onClick={() => setZoom((z) => clamp(z * 1.25, MIN_ZOOM, MAX_ZOOM))}><ZoomIn className="h-4 w-4" aria-hidden /></button>
        <button className={iconBtn} aria-label={t('visual.mermaid_reset_view', 'Reset view')} title={t('visual.mermaid_reset_view', 'Reset view')} onClick={resetView}><RotateCcw className="h-4 w-4" aria-hidden /></button>
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <button className={iconBtn} aria-label={`${t('visual.mermaid_theme', 'Diagram theme')}: ${theme}`} title={`${t('visual.mermaid_theme', 'Diagram theme')}: ${theme}`} onClick={handleCycleTheme}><Palette className="h-4 w-4" aria-hidden /></button>
        <button className={iconBtn} aria-label={t('visual.mermaid_shuffle', 'Random sample')} title={t('visual.mermaid_shuffle', 'Random sample')} onClick={handleShuffle}><Shuffle className="h-4 w-4" aria-hidden /></button>
        <button className={iconBtn} aria-label={t('visual.mermaid_import', 'Import file')} title={t('visual.mermaid_import', 'Import file')} onClick={handleImportClick}><Upload className="h-4 w-4" aria-hidden /></button>
        <div className="relative">
          <button className={iconBtn} aria-label={t('visual.mermaid_download', 'Download')} aria-expanded={showExportMenu} title={t('visual.mermaid_download', 'Download')} onClick={() => setShowExportMenu((v) => !v)}><Download className="h-4 w-4" aria-hidden /></button>
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 flex min-w-24 flex-col overflow-hidden rounded-d border border-d-border bg-d-raised shadow-lg">
              <button onClick={downloadSvg} className="cursor-pointer px-3 py-2 text-left text-xs hover:bg-d-border/50">SVG</button>
              <button onClick={downloadPng} className="cursor-pointer px-3 py-2 text-left text-xs hover:bg-d-border/50">PNG</button>
            </div>
          )}
        </div>
        <button className={iconBtn} aria-label={t('visual.mermaid_copy', 'Copy SVG')} title={t('visual.mermaid_copy', 'Copy SVG')} disabled={!svg} onClick={() => { void navigator.clipboard.writeText(svg) }}><Copy className="h-4 w-4" aria-hidden /></button>
      </FloatingPanel>

      {/* Floating editor */}
      {showEditorDrawer ? (
        <FloatingPanel label={t('visual.mermaid_code', 'Diagram definition')} className="bottom-3 left-3 top-3 flex w-[min(24rem,calc(100%-1.5rem))] flex-col">
          <header className="flex h-9 shrink-0 items-center justify-between border-b border-d-border px-3">
            <h2 className="font-display text-sm font-semibold">{t('visual.mermaid_code', 'Diagram definition')}</h2>
            <button className={iconBtn} aria-label="Hide editor" title="Hide editor" onClick={() => setShowEditorDrawer(false)}><PanelLeftClose className="h-4 w-4" aria-hidden /></button>
          </header>
          <textarea
            aria-label={t('visual.mermaid_code', 'Diagram definition')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="min-h-0 w-full flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-6 text-d-ink outline-none"
          />
          {error && (
            <p role="alert" className="max-h-28 shrink-0 overflow-auto border-t border-d-border bg-red-500/10 p-3 font-mono text-xs text-red-700 dark:text-red-300">{error}</p>
          )}
        </FloatingPanel>
      ) : (
        <FloatingPanel label="Editor" className="left-3 top-3 p-1">
          <button className={iconBtn} aria-label="Show editor" title="Show editor" onClick={() => setShowEditorDrawer(true)}><PanelLeftOpen className="h-4 w-4" aria-hidden /></button>
        </FloatingPanel>
      )}
    </Stage>
  )
}
