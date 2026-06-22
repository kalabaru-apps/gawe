'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'merge' | 'split' | 'rotate'

interface PdfFile { name: string; file: File; pageCount?: number }

export default function PdfTools({ onOutput, initialState: _initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('merge')
  const [files, setFiles] = useState<PdfFile[]>([])
  const [splitRange, setSplitRange] = useState('1-3')
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90)
  const [rotateTarget, setRotateTarget] = useState<'all' | 'odd' | 'even'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(async (acceptedFiles: File[]) => {
    const { PDFDocument } = await import('pdf-lib')
    const newFiles: PdfFile[] = []
    for (const f of acceptedFiles) {
      try {
        const bytes = await f.arrayBuffer()
        const doc = await PDFDocument.load(bytes)
        newFiles.push({ name: f.name, file: f, pageCount: doc.getPageCount() })
      } catch {
        newFiles.push({ name: f.name, file: f })
      }
    }
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  async function merge() {
    if (files.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.create()
      for (const pf of files) {
        const bytes = await pf.file.arrayBuffer()
        const doc = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach((p) => merged.addPage(p))
      }
      const bytes = await merged.save()
      download(bytes, 'merged.pdf')
      onOutput({ files: files.map((f) => f.name) }, { pages: merged.getPageCount() })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function split() {
    if (files.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const bytes = await files[0].file.arrayBuffer()
      const srcDoc = await PDFDocument.load(bytes)
      const total = srcDoc.getPageCount()
      const indices = parseRange(splitRange, total)
      if (indices.length === 0) throw new Error('Invalid page range')
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(srcDoc, indices.map((i) => i - 1))
      pages.forEach((p) => newDoc.addPage(p))
      const outBytes = await newDoc.save()
      download(outBytes, `pages-${splitRange.replace(/,/g, '_')}.pdf`)
      onOutput({ range: splitRange }, { pages: indices.length })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function rotate() {
    if (files.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const { PDFDocument, degrees } = await import('pdf-lib')
      const bytes = await files[0].file.arrayBuffer()
      const doc = await PDFDocument.load(bytes)
      const pages = doc.getPages()
      pages.forEach((p, i) => {
        const pageNum = i + 1
        const shouldRotate = rotateTarget === 'all' || (rotateTarget === 'odd' && pageNum % 2 === 1) || (rotateTarget === 'even' && pageNum % 2 === 0)
        if (shouldRotate) p.setRotation(degrees((p.getRotation().angle + rotateAngle) % 360))
      })
      const outBytes = await doc.save()
      download(outBytes, `rotated-${rotateAngle}deg.pdf`)
      onOutput({ angle: rotateAngle, target: rotateTarget }, { pages: pages.length })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function parseRange(range: string, max: number): number[] {
    const result: number[] = []
    for (const part of range.split(',')) {
      const trimmed = part.trim()
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number)
        for (let i = start; i <= Math.min(end, max); i++) result.push(i)
      } else {
        const n = Number(trimmed)
        if (n >= 1 && n <= max) result.push(n)
      }
    }
    return [...new Set(result)].sort((a, b) => a - b)
  }

  function download(bytes: Uint8Array, filename: string) {
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['merge', 'split', 'rotate'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setFiles([]); setError(null) }}
            className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t}
          </button>
        ))}
      </div>
      <FileDropzone
        accept="application/pdf"
        onFile={(f) => handleFiles([f])}
        label={tab === 'merge' ? 'Drop PDF files to merge' : 'Drop a PDF file'}
      />
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
              <span className="flex-1 text-sm truncate">{f.name}</span>
              {f.pageCount !== undefined && <span className="text-xs text-muted-foreground">{f.pageCount}p</span>}
              <button onClick={() => removeFile(i)} className="text-xs text-muted-foreground hover:text-rose-400">✕</button>
            </div>
          ))}
        </div>
      )}
      {tab === 'split' && files.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Page Range (e.g. 1-3,5,7-10 of {files[0].pageCount ?? '?'} pages)
          </label>
          <input value={splitRange} onChange={(e) => setSplitRange(e.target.value)}
            className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
        </div>
      )}
      {tab === 'rotate' && files.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Angle</p>
            <div className="flex gap-2">
              {([90, 180, 270] as const).map((a) => (
                <button key={a} onClick={() => setRotateAngle(a)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${rotateAngle === a ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                  {a}°
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Pages</p>
            <div className="flex gap-2">
              {(['all', 'odd', 'even'] as const).map((t) => (
                <button key={t} onClick={() => setRotateTarget(t)}
                  className={`px-3 py-1.5 rounded-md border text-sm capitalize transition-colors ${rotateTarget === t ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {error && <ErrorAlert message={error} />}
      <button
        onClick={tab === 'merge' ? merge : tab === 'split' ? split : rotate}
        disabled={loading || (tab === 'merge' ? files.length < 2 : files.length === 0)}
        className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? 'Processing…' : tab === 'merge' ? `Merge ${files.length} PDFs` : tab === 'split' ? 'Extract Pages' : 'Rotate & Download'}
      </button>
    </div>
  )
}
