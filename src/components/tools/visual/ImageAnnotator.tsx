'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { ZoomIn, ZoomOut, Maximize, Download, FileCode, Trash2, ImageUp } from 'lucide-react'
import type { Editor } from 'tldraw'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Stage, FloatingPanel } from '@/components/domain/Stage'
import { IconBtn } from '@/components/domain/kit'
import { DropHero } from '@/components/domain/Studio'

const TldrawAnnotator = dynamic(
  () => import('./TldrawAnnotatorInner'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-sm text-d-muted" role="status">Loading canvas</div> },
)

function save(href: string, name: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export default function ImageAnnotator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [imageUrl, setImageUrl] = useState<string | null>((initialState?.imageUrl as string | undefined) ?? null)
  const [error, setError] = useState('')
  const editorRef = useRef<Editor | null>(null)

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setImageUrl(URL.createObjectURL(file))
    onOutput({ fileName: file.name }, { loaded: true })
    analytics.buttonClick('image-annotator', 'load_image')
  }, [onOutput])

  const exportPng = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    setError('')
    try {
      const { blob } = await editor.toImage([...editor.getCurrentPageShapeIds()], { format: 'png', scale: 2, background: true })
      const url = URL.createObjectURL(blob)
      save(url, 'annotated-image.png')
      URL.revokeObjectURL(url)
      analytics.buttonClick('image-annotator', 'export_png')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const exportSvg = useCallback(async () => {
    const editor = editorRef.current
    if (!editor) return
    setError('')
    try {
      const res = await editor.getSvgString([...editor.getCurrentPageShapeIds()])
      if (!res) return
      const url = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml' }))
      save(url, 'annotated-image.svg')
      URL.revokeObjectURL(url)
      analytics.buttonClick('image-annotator', 'export_svg')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const clearAnnotations = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (confirm(t('visual.confirm_clear_annotations', 'Clear all annotations?'))) {
      // The photo is a locked shape; keep it and remove only what was drawn on top
      const ids = [...editor.getCurrentPageShapeIds()].filter((id) => !editor.getShape(id)?.isLocked)
      editor.deleteShapes(ids)
      analytics.buttonClick('image-annotator', 'clear')
    }
  }, [t])

  const changeImage = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    editorRef.current = null
    setImageUrl(null)
    onOutput({}, { loaded: false })
  }, [imageUrl, onOutput])

  if (!imageUrl) {
    return (
      <Stage>
        <DropHero
          accept="image/*"
          onFiles={handleFiles}
          title={t('visual.canvas', 'Drop an image to annotate')}
          hint={t('visual.drop_hint', 'PNG, JPG, WebP or SVG. Stays on your device.')}
        />
      </Stage>
    )
  }

  return (
    <Stage>
      <div className="absolute inset-0">
        <TldrawAnnotator key={imageUrl} imageUrl={imageUrl} onEditor={(e) => { editorRef.current = e }} />
      </div>

      {/* tldraw keeps its own tool palette; this panel adds view, export and image actions */}
      <FloatingPanel label={t('visual.annotate_tools', 'Annotation actions')} className="right-3 top-3 flex items-center gap-0.5 p-1">
        <IconBtn label={t('visual.change_image', 'Change image')} onClick={changeImage}><ImageUp className="h-4 w-4" aria-hidden /></IconBtn>
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <IconBtn label={t('visual.zoom_in', 'Zoom in')} onClick={() => editorRef.current?.zoomIn()}><ZoomIn className="h-4 w-4" aria-hidden /></IconBtn>
        <IconBtn label={t('visual.zoom_out', 'Zoom out')} onClick={() => editorRef.current?.zoomOut()}><ZoomOut className="h-4 w-4" aria-hidden /></IconBtn>
        <IconBtn label={t('visual.reset_view', 'Fit to image')} onClick={() => editorRef.current?.zoomToFit()}><Maximize className="h-4 w-4" aria-hidden /></IconBtn>
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <IconBtn label={t('visual.export_png', 'Export PNG')} onClick={() => void exportPng()}><Download className="h-4 w-4" aria-hidden /></IconBtn>
        <IconBtn label={t('visual.export_svg', 'Export SVG')} onClick={() => void exportSvg()}><FileCode className="h-4 w-4" aria-hidden /></IconBtn>
        <span className="mx-1 h-5 w-px bg-d-border" aria-hidden />
        <IconBtn label={t('visual.clear_annotations', 'Clear annotations')} onClick={clearAnnotations}><Trash2 className="h-4 w-4" aria-hidden /></IconBtn>
      </FloatingPanel>

      {error && (
        <FloatingPanel label="Error" className="right-3 top-16 max-w-xs p-3 text-sm text-red-700 dark:text-red-300">
          <p role="alert">{error}</p>
        </FloatingPanel>
      )}
    </Stage>
  )
}
