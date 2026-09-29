'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Download,
  Upload, Shuffle, Palette, PanelRightClose, PanelRightOpen, X,
} from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { ErrorAlert } from '../shared/ErrorAlert'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
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

  useEffect(() => {
    if (!isFullscreen) return
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

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

  const toolbar = (
    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/80 backdrop-blur px-1.5 py-1 shadow-lg">
      <button onClick={() => setZoom((z) => clamp(z * 1.25, MIN_ZOOM, MAX_ZOOM))} title={t('visual.mermaid_zoom_in', 'Zoom in')}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        <ZoomIn className="h-4 w-4" />
      </button>
      <button onClick={() => setZoom((z) => clamp(z * 0.8, MIN_ZOOM, MAX_ZOOM))} title={t('visual.mermaid_zoom_out', 'Zoom out')}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        <ZoomOut className="h-4 w-4" />
      </button>
      <span className="px-1 text-[11px] tabular-nums text-muted-foreground w-10 text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={resetView} title={t('visual.mermaid_reset_view', 'Reset view')}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        <RotateCcw className="h-4 w-4" />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button onClick={handleCycleTheme} title={t('visual.mermaid_theme', `Theme: ${theme}`)}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        <Palette className="h-4 w-4" />
      </button>
      <button onClick={handleShuffle} title={t('visual.mermaid_shuffle', 'Random sample')}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        <Shuffle className="h-4 w-4" />
      </button>
      <button onClick={handleImportClick} title={t('visual.mermaid_import', 'Import file')}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        <Upload className="h-4 w-4" />
      </button>
      <div className="relative">
        <button onClick={() => setShowExportMenu((v) => !v)} title={t('visual.mermaid_download', 'Download')}
          className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
          <Download className="h-4 w-4" />
        </button>
        {showExportMenu && (
          <div className="absolute bottom-full right-0 mb-2 flex flex-col rounded-md border border-border bg-popover shadow-lg overflow-hidden min-w-[100px]">
            <button onClick={downloadSvg} className="px-3 py-1.5 text-xs text-left hover:bg-muted/70 transition-colors">SVG</button>
            <button onClick={downloadPng} className="px-3 py-1.5 text-xs text-left hover:bg-muted/70 transition-colors">PNG</button>
          </div>
        )}
      </div>
      {isFullscreen && (
        <button onClick={() => setShowEditorDrawer((v) => !v)} title={t('visual.mermaid_toggle_editor', 'Toggle editor')}
          className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
          {showEditorDrawer ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </button>
      )}
      <button onClick={() => setIsFullscreen((v) => !v)} title={t('visual.mermaid_fullscreen', 'Fullscreen')}
        className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  )

  const preview = (
    <div
      ref={previewRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={resetView}
      className={cn(
        'relative border border-input rounded-md min-h-[300px] h-full flex items-center justify-center bg-muted/20 overflow-hidden select-none',
        svg && (isDragging ? 'cursor-grabbing' : 'cursor-grab')
      )}
    >
      {svg ? (
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="max-w-full transition-transform duration-75 ease-out"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('visual.mermaid_preview', 'Diagram will render here')}</p>
      )}
      <div className="absolute bottom-3 right-3">{toolbar}</div>
    </div>
  )

  const editor = (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">{t('visual.mermaid_code', 'Diagram Definition')}</label>
      <CodeEditor value={input} onChange={setInput} language="mermaid" />
      {error && <ErrorAlert message={error} />}
    </div>
  )

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".mmd,.mermaid,.txt" className="hidden" onChange={handleImportFile} />

      {isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-medium">{t('visual.mermaid_title', 'Mermaid Diagram')}</span>
            <button onClick={() => setIsFullscreen(false)} className="p-1.5 rounded-full hover:bg-muted/70 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 flex min-h-0">
            {showEditorDrawer && (
              <div className="w-[380px] shrink-0 border-r border-border p-3 overflow-auto">
                {editor}
              </div>
            )}
            <div className="flex-1 p-3 min-w-0">
              <div className="h-full">{preview}</div>
            </div>
          </div>
        </div>
      ) : (
        <ToolPanel
          left={editor}
          right={
            <div className="space-y-2">
              <div className="flex justify-end">
                <CopyButton value={svg} />
              </div>
              {preview}
            </div>
          }
        />
      )}
    </>
  )
}
