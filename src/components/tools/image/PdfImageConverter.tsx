'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

type Tab = 'pdf-to-img' | 'img-to-pdf'

export default function PdfImageConverter({ onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('pdf-to-img')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [previews, setPreviews] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  const handlePdf = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setPreviews([])
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

      const bytes = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise
      const pageCount = pdf.numPages
      const urls: string[] = []

      for (let i = 1; i <= pageCount; i++) {
        setProgress(t('image.processing', `Rendering page ${i} of ${pageCount}…`))
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport, canvas }).promise
        urls.push(canvas.toDataURL('image/png'))
      }

      setPreviews(urls)
      setProgress('')
      onOutput({ pdfName: file.name }, { pageCount })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [onOutput])

  const handleImage = useCallback((file: File) => {
    setImages((prev) => [...prev, file])
  }, [])

  async function imagesToPdf() {
    if (images.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      for (const img of images) {
        const bytes = await img.arrayBuffer()
        const type = img.type
        let embedded
        if (type === 'image/png') {
          embedded = await doc.embedPng(bytes)
        } else if (type === 'image/jpeg' || type === 'image/jpg') {
          embedded = await doc.embedJpg(bytes)
        } else {
          // Convert to PNG via canvas
          const canvas = document.createElement('canvas')
          const imgEl = new Image()
          await new Promise<void>((resolve, reject) => {
            imgEl.onload = () => resolve()
            imgEl.onerror = reject
            imgEl.src = URL.createObjectURL(img)
          })
          canvas.width = imgEl.naturalWidth
          canvas.height = imgEl.naturalHeight
          canvas.getContext('2d')!.drawImage(imgEl, 0, 0)
          const pngBytes = await new Promise<Uint8Array>((resolve) => {
            canvas.toBlob((blob) => blob!.arrayBuffer().then((ab) => resolve(new Uint8Array(ab))), 'image/png')
          })
          embedded = await doc.embedPng(pngBytes as unknown as Uint8Array)
        }
        const { width, height } = embedded
        const page = doc.addPage([width, height])
        page.drawImage(embedded, { x: 0, y: 0, width, height })
      }
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes as unknown as ArrayBuffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'images.pdf'; a.click()
      URL.revokeObjectURL(url)
      onOutput({ images: images.length }, { pages: images.length })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function downloadPage(url: string, i: number) {
    const a = document.createElement('a')
    a.href = url; a.download = `page-${i + 1}.png`; a.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['pdf-to-img', 'img-to-pdf'] as Tab[]).map((tabKey) => (
          <button key={tabKey} onClick={() => { setTab(tabKey); setPreviews([]); setImages([]); setError(null) }}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === tabKey ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {tabKey === 'pdf-to-img' ? 'PDF → Images' : 'Images → PDF'}
          </button>
        ))}
      </div>
      {tab === 'pdf-to-img' ? (
        <div className="space-y-4">
          <FileDropzone accept="application/pdf" onFile={handlePdf} label={t('image.drop_pdf', 'Drop a PDF to convert to images')} />
          {loading && <p className="text-sm text-muted-foreground">{progress || t('common.processing', 'Processing…')}</p>}
          {error && <ErrorAlert message={error} />}
          {previews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{previews.length} {t('image.pdf_pages', 'pages rendered')}</p>
                <button onClick={() => previews.forEach((url, i) => downloadPage(url, i))}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
                  {t('image.download_all', 'Download All')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {previews.map((url, i) => (
                  <div key={i} className="space-y-1">
                    <div className="border border-input rounded-md overflow-hidden">
                      <img src={url} alt={`Page ${i + 1}`} className="w-full h-auto" />
                    </div>
                    <button onClick={() => downloadPage(url, i)}
                      className="w-full text-xs py-1.5 rounded-md border border-input hover:bg-muted/50 transition-colors">
                      {t('image.pages', 'Page')} {i + 1}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleImage} label={t('common.drop_files', 'Drop images to combine into a PDF')} />
          {images.length > 0 && (
            <div className="space-y-2">
              {images.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-muted-foreground hover:text-rose-400">✕</button>
                </div>
              ))}
              <button onClick={() => { analytics.buttonClick('pdf-image-converter', 'convert'); void imagesToPdf() }} disabled={loading}
                className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? t('image.converting', 'Creating PDF…') : `${t('common.convert', 'Create PDF')} (${images.length} images)`}
              </button>
            </div>
          )}
          {error && <ErrorAlert message={error} />}
        </div>
      )}
    </div>
  )
}
