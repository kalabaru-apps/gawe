# Phase 7: Image & Document Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 6 Image & Document tools as real React components replacing ToolPlaceholder stubs.

**Architecture:** Each tool is a `'use client'` React component. Heavy libs (pdf-lib, pdfjs-dist) are dynamically imported inside component files. The `image` category entry is added to `toolMap` in Task 1.

**Tech Stack:** Next.js 16, React 19, TypeScript, pdf-lib, pdfjs-dist, browser-image-compression, svgo, Tailwind v4

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- pnpm only (never npm or yarn)
- All tool components: `'use client'` directive at top
- All tool components: `export default function ComponentName({ onOutput, initialState }: ToolProps)`
- ToolProps: `{ onOutput: (inputs, outputs) => void; initialState?: Record<string, unknown> }`
- UI: use `ToolPanel`, `CopyButton`, `FileDropzone`, `ErrorAlert` from `@/components/tools/shared/`
- Tailwind v4: complete literal class strings only — no dynamic assembly
- Git commits end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use `rtk git` prefix for all git commands
- pdfjs-dist: set workerSrc to CDN URL in useEffect to avoid bundling the worker

---

## File Map

```
[MODIFY] src/app/tools/[category]/[tool]/ToolPageClient.tsx  — add image entries to toolMap
[CREATE] src/components/tools/image/PdfTools.tsx
[CREATE] src/components/tools/image/PdfImageConverter.tsx
[CREATE] src/components/tools/image/ImageConverter.tsx
[CREATE] src/components/tools/image/ImageResize.tsx
[CREATE] src/components/tools/image/SvgTools.tsx
[CREATE] src/components/tools/image/ImageBase64.tsx
```

---

## Task 1: Install Phase 7 Dependencies + Update ToolPageClient

- [ ] **Step 1: Install dependencies**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add pdf-lib pdfjs-dist browser-image-compression svgo
```

Note: `pdfjs-dist` is large (~3MB). It's dynamically imported inside the component, so it doesn't bloat the initial bundle.
Note: `svgo` is an ESM package. Dynamic import: `const { optimize } = await import('svgo')`.

- [ ] **Step 2: Add image entry to toolMap in ToolPageClient.tsx**

```ts
  image: {
    'pdf-tools': () => import('@/components/tools/image/PdfTools'),
    'pdf-image-converter': () => import('@/components/tools/image/PdfImageConverter'),
    'image-converter': () => import('@/components/tools/image/ImageConverter'),
    'image-resize': () => import('@/components/tools/image/ImageResize'),
    'svg-tools': () => import('@/components/tools/image/SvgTools'),
    'image-base64': () => import('@/components/tools/image/ImageBase64'),
  },
```

- [ ] **Step 3: Commit**

```bash
rtk git add package.json pnpm-lock.yaml src/app/tools/\[category\]/\[tool\]/ToolPageClient.tsx
rtk git commit -m "chore(phase7): install image/document dependencies and register tool loaders

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: PDF Tools (Merge, Split, Rotate)

**Files:**
- Create: `src/components/tools/image/PdfTools.tsx`

**Interfaces:**
- Consumes: `pdf-lib` — `PDFDocument.load()`, `PDFDocument.create()`, `.copyPages()`, `.addPage()`, `.save()`

- [ ] **Step 1: Create PdfTools.tsx**

Key logic:
- Tabs: "Merge PDFs", "Split PDF", "Rotate Pages"
- Merge: accept multiple PDF files (drag-drop or click), show list, drag to reorder, merge button → download
- Split: accept one PDF, show page count, select page range (e.g. "1-3,5,7-10"), split → zip download (use native zip via File API... or just download individual pages as PDFs). Simpler: download a new PDF with selected pages.
- Rotate: accept one PDF, pick pages to rotate (all/odd/even/specific) + angle (90/180/270), download rotated PDF
- All operations: dynamic `import { PDFDocument, degrees } from 'pdf-lib'`
- File download: `URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))`

```tsx
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
    const blob = new Blob([bytes], { type: 'application/pdf' })
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
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/image/PdfTools.tsx
rtk git commit -m "feat(image): PDF tools — merge, split, and rotate

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: PDF ↔ Images

**Files:**
- Create: `src/components/tools/image/PdfImageConverter.tsx`

**Interfaces:**
- Consumes: `pdfjs-dist` for PDF→images (renders each page to canvas); `pdf-lib` for images→PDF
- Note: pdfjs-dist requires a worker. Set `GlobalWorkerOptions.workerSrc` to CDN URL.

- [ ] **Step 1: Create PdfImageConverter.tsx**

Key logic:
- Tab 1 (PDF → Images): upload PDF → render each page to canvas → download as PNG files
- Tab 2 (Images → PDF): upload multiple images → embed in PDF-lib document → download PDF

```tsx
'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'pdf-to-img' | 'img-to-pdf'

export default function PdfImageConverter({ onOutput, initialState: _initialState }: ToolProps) {
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
        setProgress(`Rendering page ${i} of ${pageCount}…`)
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
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
          const pngBytes = await new Promise<ArrayBuffer>((resolve) => {
            canvas.toBlob((blob) => blob!.arrayBuffer().then(resolve), 'image/png')
          })
          embedded = await doc.embedPng(pngBytes)
        }
        const { width, height } = embedded
        const page = doc.addPage([width, height])
        page.drawImage(embedded, { x: 0, y: 0, width, height })
      }
      const pdfBytes = await doc.save()
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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
        {(['pdf-to-img', 'img-to-pdf'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPreviews([]); setImages([]); setError(null) }}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'pdf-to-img' ? 'PDF → Images' : 'Images → PDF'}
          </button>
        ))}
      </div>
      {tab === 'pdf-to-img' ? (
        <div className="space-y-4">
          <FileDropzone accept="application/pdf" onFile={handlePdf} label="Drop a PDF to convert to images" />
          {loading && <p className="text-sm text-muted-foreground">{progress || 'Processing…'}</p>}
          {error && <ErrorAlert message={error} />}
          {previews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">{previews.length} pages rendered</p>
                <button onClick={() => previews.forEach((url, i) => downloadPage(url, i))}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
                  Download All
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
                      Page {i + 1}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleImage} label="Drop images to combine into a PDF" />
          {images.length > 0 && (
            <div className="space-y-2">
              {images.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-muted-foreground hover:text-rose-400">✕</button>
                </div>
              ))}
              <button onClick={imagesToPdf} disabled={loading}
                className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? 'Creating PDF…' : `Create PDF (${images.length} images)`}
              </button>
            </div>
          )}
          {error && <ErrorAlert message={error} />}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/image/PdfImageConverter.tsx
rtk git commit -m "feat(image): PDF ↔ images converter using pdf-lib and pdfjs-dist

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Image Converter

**Files:**
- Create: `src/components/tools/image/ImageConverter.tsx`

**Interfaces:**
- No external libs — uses Canvas API for format conversion
- `canvas.toBlob(cb, mimeType, quality)` for conversion

- [ ] **Step 1: Create ImageConverter.tsx**

Key logic:
- Upload image (any format) → select output format (PNG, JPEG, WebP, AVIF) + quality slider → download
- Use Canvas API: draw image → `canvas.toBlob()` with desired MIME type
- Show before/after file size comparison

```tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

type Format = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif'
const FORMAT_EXT: Record<Format, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/avif': '.avif' }

export default function ImageConverter({ onOutput, initialState: _initialState }: ToolProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)
  const [outputFormat, setOutputFormat] = useState<Format>('image/webp')
  const [quality, setQuality] = useState(90)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFile = useCallback((file: File) => {
    setOriginalName(file.name.replace(/\.[^.]+$/, ''))
    setOriginalSize(file.size)
    setOutputSize(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { imgRef.current = img; setPreview(url) }
    img.onerror = () => setError('Failed to load image')
    img.src = url
  }, [])

  async function convert() {
    if (!imgRef.current) return
    setLoading(true)
    setError(null)
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) { setError('Conversion failed'); setLoading(false); return }
      setOutputSize(blob.size)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = originalName + FORMAT_EXT[outputFormat]
      a.click()
      URL.revokeObjectURL(url)
      setLoading(false)
      onOutput({ format: outputFormat, quality }, { outputSize: blob.size })
    }, outputFormat, quality / 100)
  }

  function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(2)} MB`
  }

  const FORMATS: { value: Format; label: string }[] = [
    { value: 'image/webp', label: 'WebP' },
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/png', label: 'PNG' },
    { value: 'image/avif', label: 'AVIF' },
  ]

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image to convert" />
      {preview && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Output Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMATS.map((f) => (
                    <button key={f.value} onClick={() => setOutputFormat(f.value)}
                      className={`py-2 rounded-md text-sm border transition-colors ${outputFormat === f.value ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {outputFormat !== 'image/png' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Quality</label>
                    <span className="text-xs font-mono text-muted-foreground">{quality}%</span>
                  </div>
                  <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original size</span>
                  <span className="font-mono">{formatBytes(originalSize)}</span>
                </div>
                {outputSize !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output size</span>
                    <span className="font-mono">{formatBytes(outputSize)}</span>
                  </div>
                )}
                {outputSize !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saved</span>
                    <span className={`font-mono ${outputSize < originalSize ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {outputSize < originalSize ? '-' : '+'}{Math.abs(Math.round((1 - outputSize / originalSize) * 100))}%
                    </span>
                  </div>
                )}
              </div>
              <button onClick={convert} disabled={loading}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? 'Converting…' : `Convert to ${FORMATS.find((f) => f.value === outputFormat)?.label}`}
              </button>
            </div>
            <div className="border border-input rounded-md overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/image/ImageConverter.tsx
rtk git commit -m "feat(image): image format converter using Canvas API

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Image Resize

**Files:**
- Create: `src/components/tools/image/ImageResize.tsx`

**Interfaces:**
- Consumes: `browser-image-compression` for compression; Canvas API for resize

- [ ] **Step 1: Create ImageResize.tsx**

Key logic:
- Upload image → enter target width + height (lock aspect ratio toggle) + max file size
- `import imageCompression from 'browser-image-compression'`
- Resize via canvas: draw at new dimensions, then `canvas.toBlob()`
- Compression: `imageCompression(file, { maxWidthOrHeight, maxSizeMB, useWebWorker: true })`
- Show original dimensions and size; after resize show new dimensions and size

```tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

export default function ImageResize({ onOutput, initialState: _initialState }: ToolProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('')
  const [origW, setOrigW] = useState(0)
  const [origH, setOrigH] = useState(0)
  const [origSize, setOrigSize] = useState(0)
  const [targetW, setTargetW] = useState(800)
  const [targetH, setTargetH] = useState(600)
  const [lockAspect, setLockAspect] = useState(true)
  const [maxSizeMB, setMaxSizeMB] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)
  const aspectRatioRef = useRef(1)

  const handleFile = useCallback((file: File) => {
    fileRef.current = file
    setOriginalName(file.name.replace(/\.[^.]+$/, ''))
    setOrigSize(file.size)
    setError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setOrigW(img.naturalWidth)
      setOrigH(img.naturalHeight)
      setTargetW(img.naturalWidth)
      setTargetH(img.naturalHeight)
      aspectRatioRef.current = img.naturalWidth / img.naturalHeight
      setPreview(url)
    }
    img.src = url
  }, [])

  function handleWidthChange(w: number) {
    setTargetW(w)
    if (lockAspect) setTargetH(Math.round(w / aspectRatioRef.current))
  }

  function handleHeightChange(h: number) {
    setTargetH(h)
    if (lockAspect) setTargetW(Math.round(h * aspectRatioRef.current))
  }

  async function resize() {
    if (!fileRef.current) return
    setLoading(true)
    setError(null)
    try {
      const compressed = await imageCompression(fileRef.current, {
        maxWidthOrHeight: Math.max(targetW, targetH),
        maxSizeMB,
        useWebWorker: true,
      })
      // Then resize to exact dimensions
      const url = URL.createObjectURL(compressed)
      const img = new Image()
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = targetW; canvas.height = targetH
      canvas.getContext('2d')!.drawImage(img, 0, 0, targetW, targetH)
      canvas.toBlob((blob) => {
        if (!blob) { setError('Resize failed'); setLoading(false); return }
        const outUrl = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = outUrl; a.download = `${originalName}-${targetW}x${targetH}.png`; a.click()
        URL.revokeObjectURL(outUrl); URL.revokeObjectURL(url)
        setLoading(false)
        onOutput({ targetW, targetH, maxSizeMB }, { outputSize: blob.size })
      }, 'image/png')
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1048576).toFixed(2)} MB`
  }

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image to resize" />
      {preview && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Width (px)</label>
                <input type="number" min={1} value={targetW} onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Height (px)</label>
                <input type="number" min={1} value={targetH} onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring font-mono" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} className="rounded" />
              Lock aspect ratio
            </label>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max file size</label>
              <select value={maxSizeMB} onChange={(e) => setMaxSizeMB(Number(e.target.value))}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none">
                {[0.25, 0.5, 1, 2, 5, 10].map((v) => <option key={v} value={v}>{v < 1 ? `${v * 1000}KB` : `${v}MB`}</option>)}
              </select>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Original: {origW}×{origH} · {formatBytes(origSize)}</p>
              <p>Output: {targetW}×{targetH} (target)</p>
            </div>
            <button onClick={resize} disabled={loading}
              className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Resizing…' : 'Resize & Download'}
            </button>
            {error && <ErrorAlert message={error} />}
          </div>
          <div className="border border-input rounded-md overflow-hidden flex items-center justify-center bg-muted/20 p-2">
            <img src={preview} alt="Preview" className="max-w-full max-h-64 object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/image/ImageResize.tsx
rtk git commit -m "feat(image): image resize with aspect ratio lock and compression

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: SVG Tools

**Files:**
- Create: `src/components/tools/image/SvgTools.tsx`

**Interfaces:**
- Consumes: `svgo` — dynamic import, `optimize(svgString, { multipass: true })` → `{ data: string }`

- [ ] **Step 1: Create SvgTools.tsx**

Key logic:
- Tabs: "Optimize SVG" and "Favicon Generator"
- Optimize tab:
  - Text input for SVG code OR file upload (.svg)
  - Click Optimize → `const { optimize } = await import('svgo'); const result = optimize(input, { multipass: true })`
  - Show before/after byte count, percentage saved
  - Copy/download optimized SVG
- Favicon tab:
  - Upload PNG/SVG image → generate favicon package
  - Create multiple canvas sizes: 16×16, 32×32, 48×48, 64×64, 192×192, 512×512
  - Download each individually (or as a zip — use simple multiple-file approach)
  - Also generate `<link rel="icon">` HTML snippet

```tsx
'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { FileDropzone } from '../shared/FileDropzone'
import { CodeEditor } from '../shared/CodeEditor'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'optimize' | 'favicon'

const FAVICON_SIZES = [16, 32, 48, 64, 96, 128, 192, 512]

export default function SvgTools({ onOutput, initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('optimize')
  // Optimize tab
  const [svgInput, setSvgInput] = useState((initialState?.svgInput as string) ?? '')
  const [optimized, setOptimized] = useState('')
  const [svgError, setSvgError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  // Favicon tab
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconPreviews, setFaviconPreviews] = useState<Array<{ size: number; url: string }>>([])
  const [faviconError, setFaviconError] = useState<string | null>(null)

  async function optimizeSvg() {
    const input = svgInput.trim()
    if (!input) return
    setOptimizing(true)
    setSvgError(null)
    try {
      const { optimize } = await import('svgo')
      const result = optimize(input, {
        multipass: true,
        plugins: ['preset-default'],
      })
      setOptimized(result.data)
      onOutput({ originalSize: input.length }, { optimizedSize: result.data.length, saved: input.length - result.data.length })
    } catch (e) {
      setSvgError((e as Error).message)
    } finally {
      setOptimizing(false)
    }
  }

  const handleSvgFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setSvgInput(e.target?.result as string)
    reader.onerror = () => setSvgError('Failed to read file')
    reader.readAsText(file)
  }, [])

  const handleFaviconFile = useCallback((file: File) => {
    setFaviconPreviews([])
    setFaviconError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setFaviconPreview(url)
      const previews = FAVICON_SIZES.map((size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        canvas.getContext('2d')!.drawImage(img, 0, 0, size, size)
        return { size, url: canvas.toDataURL('image/png') }
      })
      setFaviconPreviews(previews)
    }
    img.onerror = () => setFaviconError('Failed to load image')
    img.src = url
  }, [])

  function downloadFavicon(url: string, size: number) {
    const a = document.createElement('a'); a.href = url; a.download = `favicon-${size}x${size}.png`; a.click()
  }

  const htmlSnippet = faviconPreviews.length > 0
    ? `<link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32">\n<link rel="apple-touch-icon" href="/favicon-192x192.png">`
    : ''

  const savings = svgInput.length > 0 && optimized.length > 0
    ? Math.round((1 - optimized.length / svgInput.length) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['optimize', 'favicon'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'optimize' ? 'Optimize SVG' : 'Favicon Generator'}
          </button>
        ))}
      </div>
      {tab === 'optimize' ? (
        <ToolPanel
          left={
            <div className="space-y-3">
              <FileDropzone accept=".svg,image/svg+xml" onFile={handleSvgFile} label="Drop an SVG file or paste code below" />
              <CodeEditor value={svgInput} onChange={setSvgInput} language="svg" />
              <button onClick={optimizeSvg} disabled={optimizing || !svgInput.trim()}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {optimizing ? 'Optimizing…' : 'Optimize SVG'}
              </button>
              {svgError && <ErrorAlert message={svgError} />}
            </div>
          }
          right={
            <div className="space-y-3">
              {optimized && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-400 font-medium">Saved {savings}% ({svgInput.length - optimized.length} bytes)</span>
                    <CopyButton value={optimized} />
                  </div>
                  <CodeEditor value={optimized} language="svg" readOnly />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Before: {svgInput.length} bytes</span>
                    <span>After: {optimized.length} bytes</span>
                  </div>
                </>
              )}
              {!optimized && <p className="text-sm text-muted-foreground">Optimized SVG will appear here</p>}
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleFaviconFile} label="Drop an image (PNG, SVG, JPG) to generate favicons" />
          {faviconError && <ErrorAlert message={faviconError} />}
          {faviconPreviews.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                {faviconPreviews.map(({ size, url }) => (
                  <div key={size} className="flex flex-col items-center gap-1">
                    <div className="border border-input rounded overflow-hidden" style={{ width: Math.min(size, 64), height: Math.min(size, 64) }}>
                      <img src={url} width={Math.min(size, 64)} height={Math.min(size, 64)} alt={`${size}px`} />
                    </div>
                    <button onClick={() => downloadFavicon(url, size)}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                      {size}×{size}
                    </button>
                  </div>
                ))}
              </div>
              {htmlSnippet && (
                <div className="rounded-md border border-input p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">HTML Snippet</span>
                    <CopyButton value={htmlSnippet} />
                  </div>
                  <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">{htmlSnippet}</pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/image/SvgTools.tsx
rtk git commit -m "feat(image): SVG optimizer and favicon generator

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Image → Base64

**Files:**
- Create: `src/components/tools/image/ImageBase64.tsx`

**Interfaces:**
- No external deps — uses FileReader.readAsDataURL

- [ ] **Step 1: Create ImageBase64.tsx**

Key logic:
- Upload image → show base64 data URI
- Show: full data URI, bare base64 (without prefix), CSS background-image snippet, HTML img tag snippet
- File size + base64 size
- Copy each output separately

```tsx
'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

interface OutputRow { label: string; value: string }

export default function ImageBase64({ onOutput, initialState: _initialState }: ToolProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<OutputRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    setOriginalSize(file.size)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUri = e.target?.result as string
      setPreview(dataUri)
      const bare = dataUri.split(',')[1]
      const rows: OutputRow[] = [
        { label: 'Data URI', value: dataUri },
        { label: 'Base64 (bare)', value: bare },
        { label: 'CSS background-image', value: `background-image: url('${dataUri}');` },
        { label: 'HTML <img> tag', value: `<img src="${dataUri}" alt="${file.name}" />` },
      ]
      setOutputs(rows)
      onOutput({ fileName: file.name, mimeType: file.type }, { dataUriLength: dataUri.length, base64Size: bare.length })
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsDataURL(file)
  }, [onOutput])

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1048576).toFixed(2)} MB`
  }

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image to convert to Base64" />
      {error && <ErrorAlert message={error} />}
      {preview && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="border border-input rounded-md overflow-hidden flex items-center justify-center bg-muted/20 p-2">
              <img src={preview} alt={fileName} className="max-w-full max-h-48 object-contain" />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{fileName}</p>
              <p>Original: {formatBytes(originalSize)}</p>
              <p>Base64: {formatBytes(outputs[1]?.value.length ?? 0)}</p>
              <p>Overhead: +{Math.round(((outputs[1]?.value.length ?? 0) / originalSize - 1) * 100)}%</p>
            </div>
          </div>
          <div className="space-y-3">
            {outputs.map((o) => (
              <div key={o.label} className="rounded-md border border-input p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{o.label}</span>
                  <CopyButton value={o.value} />
                </div>
                <p className="font-mono text-xs break-all text-muted-foreground line-clamp-3">{o.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/image/ImageBase64.tsx
rtk git commit -m "feat(image): image to Base64 data URI converter

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ pdf-tools: merge (multiple files), split (page range), rotate (angle + target)
- ✅ pdf-image-converter: PDF→images (pdfjs-dist canvas render), images→PDF (pdf-lib embed)
- ✅ image-converter: Canvas API format conversion, quality slider, size comparison
- ✅ image-resize: browser-image-compression + canvas, aspect ratio lock, max size
- ✅ svg-tools: svgo dynamic import + favicon generation (8 sizes) + HTML snippet
- ✅ image-base64: FileReader.readAsDataURL, data URI + bare + CSS + HTML outputs

**pdfjs-dist notes:**
- Worker must be set via `GlobalWorkerOptions.workerSrc` before calling `getDocument()`
- CDN URL format: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
- The `.mjs` extension is important for ESM workers
- Check installed pdfjs-dist version: `node_modules/pdfjs-dist/package.json`

**svgo notes:**
- svgo v3 is ESM-only, works fine with dynamic import in 'use client' components
- `plugins: ['preset-default']` is the standard optimization preset
- If svgo throws on valid SVGs, try without the plugins array

**browser-image-compression notes:**
- Default import: `import imageCompression from 'browser-image-compression'`
- `useWebWorker: true` is the default but specified explicitly for clarity
- The function returns a File object (compressed)

**pdf-lib notes:**
- Only supports embedding JPEG and PNG images directly
- Other formats need Canvas API conversion to PNG before embedding
- `degrees()` from pdf-lib is used for rotation: `p.setRotation(degrees(90))`
