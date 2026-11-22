'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ZoomIn, ZoomOut, Maximize, Download, FileCode, Trash2 } from 'lucide-react'
import type { Editor } from 'tldraw'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Stage, FloatingPanel } from '@/components/domain/Stage'
import { IconBtn } from '@/components/domain/kit'

const TldrawComponent = dynamic(
  () => import('tldraw').then((m) => ({ default: m.Tldraw })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-d-muted" role="status">
        Loading whiteboard
      </div>
    ),
  },
)

function save(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export default function Whiteboard({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const editorRef = useRef<Editor | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    onOutput({}, { message: 'whiteboard active' })
  // onOutput intentionally excluded : stable via useCallback in ToolPageClient
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const exportPng = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    const ids = [...editor.getCurrentPageShapeIds()]
    if (!ids.length) { setError(t('visual.empty_board', 'Draw something first.')); return }
    setError('')
    try {
      const { blob } = await editor.toImage(ids, { format: 'png', scale: 2, background: true })
      const url = URL.createObjectURL(blob)
      save(url, 'whiteboard.png')
      URL.revokeObjectURL(url)
      analytics.buttonClick('whiteboard', 'export_png')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [t])

  const exportSvg = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    const ids = [...editor.getCurrentPageShapeIds()]
    if (!ids.length) { setError(t('visual.empty_board', 'Draw something first.')); return }
    setError('')
    try {
      const res = await editor.getSvgString(ids)
      if (!res) return
      const url = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml' }))
      save(url, 'whiteboard.svg')
      URL.revokeObjectURL(url)
      analytics.buttonClick('whiteboard', 'export_svg')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [t])

  const clear = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (confirm(t('visual.confirm_clear', 'Clear the entire whiteboard?'))) {
      editor.deleteShapes([...editor.getCurrentPageShapeIds()])
      analytics.buttonClick('whiteboard', 'clear')
    }
  }, [t])

  return (
    <Stage>
      <div className="absolute inset-0">
        <TldrawComponent persistenceKey="gawe-whiteboard" onMount={(editor: Editor) => { editorRef.current = editor }} />
      </div>

      {/* tldraw keeps its own tool palette; this panel adds view and export actions */}
      <FloatingPanel label={t('visual.whiteboard_tools', 'Whiteboard actions')} className="right-3 top-3 flex items-center gap-0.5 p-1">
        <IconBtn label={t('visual.zoom_in', 'Zoom in')} onClick={() => editorRef.current?.zoomIn()}><ZoomIn className="h-4 w-4" aria-hidden /></IconBtn>
        <IconBtn label={t('visual.zoom_out', 'Zoom out')} onClick={() => editorRef.current?.zoomOut()}><ZoomOut className="h-4 w-4" aria-hidden /></IconBtn>
        <IconBtn label={t('visual.reset_view', 'Fit to content')} onClick={() => editorRef.current?.zoomToFit()}><Maximize className="h-4 w-4" aria-hidden /></IconBtn>
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <IconBtn label={t('visual.export_png', 'Export PNG')} onClick={() => void exportPng()}><Download className="h-4 w-4" aria-hidden /></IconBtn>
        <IconBtn label={t('visual.export_svg', 'Export SVG')} onClick={() => void exportSvg()}><FileCode className="h-4 w-4" aria-hidden /></IconBtn>
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <IconBtn label={t('visual.clear', 'Clear canvas')} onClick={clear}><Trash2 className="h-4 w-4" aria-hidden /></IconBtn>
      </FloatingPanel>

      {error && (
        <FloatingPanel label="Error" className="right-3 top-16 max-w-xs p-3 text-sm text-red-700 dark:text-red-300">
          <p role="alert">{error}</p>
        </FloatingPanel>
      )}
    </Stage>
  )
}
