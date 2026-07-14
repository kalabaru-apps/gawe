'use client'

import { useCallback, useState } from 'react'

export interface PdfPageRender {
  index: number
  dataUrl: string
  width: number
  height: number
}

interface UsePdfPagesResult {
  pages: PdfPageRender[]
  loading: boolean
  error: string
  load: (file: File, scale?: number) => Promise<ArrayBuffer | null>
  reset: () => void
}

/** Renders every page of a PDF to a canvas data URL via pdfjs. Shared by the Split (thumbnail grid) and Sign (single-page preview) tabs. */
export function usePdfPages(): UsePdfPagesResult {
  const [pages, setPages] = useState<PdfPageRender[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (file: File, scale = 0.3) => {
    setError('')
    setLoading(true)
    setPages([])
    try {
      const buf = await file.arrayBuffer()
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise
      const rendered: PdfPageRender[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, canvas, viewport }).promise
        rendered.push({ index: i - 1, dataUrl: canvas.toDataURL(), width: canvas.width, height: canvas.height })
      }
      setPages(rendered)
      return buf
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setPages([])
    setError('')
  }, [])

  return { pages, loading, error, load, reset }
}
