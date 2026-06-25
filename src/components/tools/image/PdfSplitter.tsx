'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'

// pdf-lib and pdfjs-dist are dynamically imported to avoid SSR issues

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface PageThumb {
  index: number
  dataUrl: string
  selected: boolean
}

interface MergeFile {
  id: string
  file: File
}

type Mode = 'split' | 'merge'

export default function PdfSplitter({ onOutput }: ToolProps) {
  const [mode, setMode] = useState<Mode>('split')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Split state
  const [splitBuffer, setSplitBuffer] = useState<ArrayBuffer | null>(null)
  const [splitFileName, setSplitFileName] = useState('')
  const [thumbs, setThumbs] = useState<PageThumb[]>([])

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<MergeFile[]>([])

  const loadSplitPdf = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setError('')
    setLoading(true)
    setThumbs([])
    try {
      const buf = await file.arrayBuffer()
      setSplitBuffer(buf)
      setSplitFileName(file.name)

      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
      const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise
      const pages: PageThumb[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const viewport = page.getViewport({ scale: 0.3 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        pages.push({ index: i - 1, dataUrl: canvas.toDataURL(), selected: true })
      }
      setThumbs(pages)
    } catch (e) {
      setError(`Failed to load PDF: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleThumb = (index: number) => {
    setThumbs((prev) => prev.map((t) => t.index === index ? { ...t, selected: !t.selected } : t))
  }

  const selectAll = () => setThumbs((prev) => prev.map((t) => ({ ...t, selected: true })))
  const deselectAll = () => setThumbs((prev) => prev.map((t) => ({ ...t, selected: false })))

  const extractPages = useCallback(async () => {
    if (!splitBuffer) return
    const selected = thumbs.filter((t) => t.selected).map((t) => t.index)
    if (selected.length === 0) { setError('Select at least one page.'); return }
    setError('')
    setLoading(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(splitBuffer)
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(srcDoc, selected)
      pages.forEach((p) => newDoc.addPage(p))
      const bytes = await newDoc.save()
      downloadPdf(bytes, splitFileName.replace(/\.pdf$/i, '') + `-extracted.pdf`)
      onOutput({ mode: 'split', pages: selected }, { pageCount: selected.length })
    } catch (e) {
      setError(`Failed to extract pages: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [splitBuffer, thumbs, splitFileName, onOutput])

  const addMergeFiles = useCallback((files: File[]) => {
    setMergeFiles((prev) => [
      ...prev,
      ...files.map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f }))
    ])
  }, [])

  const removeMergeFile = (id: string) => setMergeFiles((prev) => prev.filter((f) => f.id !== id))

  const moveFile = (id: string, dir: -1 | 1) => {
    setMergeFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const mergeAll = useCallback(async () => {
    if (mergeFiles.length === 0) { setError('Add at least one PDF.'); return }
    setError('')
    setLoading(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.create()
      for (const { file } of mergeFiles) {
        const bytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach((p) => merged.addPage(p))
      }
      const bytes = await merged.save()
      downloadPdf(bytes, 'merged.pdf')
      onOutput({ mode: 'merge', files: mergeFiles.map((f) => f.file.name) }, { pageCount: merged.getPageCount() })
    } catch (e) {
      setError(`Failed to merge PDFs: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [mergeFiles, onOutput])

  return (
    <div className="flex flex-col gap-4">
      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(['split', 'merge'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError('') }}
            className={`px-4 py-1.5 rounded-t text-sm font-medium transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {m === 'split' ? 'Split' : 'Merge'}
          </button>
        ))}
      </div>

      {error && <ErrorAlert message={error} />}

      {mode === 'split' && (
        <div className="flex flex-col gap-4">
          <FileDropzone onFiles={loadSplitPdf} accept=".pdf" label="Drop a PDF to split" />
          {loading && <div className="text-sm text-muted-foreground">Loading pages…</div>}
          {thumbs.length > 0 && (
            <>
              <div className="flex gap-2 flex-wrap items-center">
                <Button size="sm" variant="outline" onClick={selectAll}>Select all</Button>
                <Button size="sm" variant="outline" onClick={deselectAll}>Deselect all</Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  {thumbs.filter((t) => t.selected).length} / {thumbs.length} pages selected
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {thumbs.map((t) => (
                  <button
                    key={t.index}
                    onClick={() => toggleThumb(t.index)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1 transition-colors ${
                      t.selected ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <img src={t.dataUrl} alt={`Page ${t.index + 1}`} className="w-full rounded" />
                    <span className="text-xs text-muted-foreground">{t.index + 1}</span>
                  </button>
                ))}
              </div>
              <Button onClick={extractPages} disabled={loading} className="w-full">
                Extract selected pages
              </Button>
            </>
          )}
        </div>
      )}

      {mode === 'merge' && (
        <div className="flex flex-col gap-4">
          <FileDropzone onFiles={addMergeFiles} accept=".pdf" label="Drop PDFs to merge (multiple allowed)" />
          {mergeFiles.length > 0 && (
            <>
              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                {mergeFiles.map((mf, idx) => (
                  <div key={mf.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                    <span className="flex-1 truncate text-foreground">{mf.file.name}</span>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => moveFile(mf.id, -1)}
                        disabled={idx === 0}
                        className="px-1.5 py-0.5 rounded text-xs border border-border hover:bg-muted disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveFile(mf.id, 1)}
                        disabled={idx === mergeFiles.length - 1}
                        className="px-1.5 py-0.5 rounded text-xs border border-border hover:bg-muted disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeMergeFile(mf.id)}
                        className="px-1.5 py-0.5 rounded text-xs border border-destructive/50 text-destructive hover:bg-destructive/10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={mergeAll} disabled={loading} className="w-full">
                {loading ? 'Merging…' : `Merge ${mergeFiles.length} PDF${mergeFiles.length > 1 ? 's' : ''}`}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
