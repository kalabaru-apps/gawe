'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileDown, Image as ImageIcon, Download, Loader2, X, Trash2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './pdf-tools/downloadPdf'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, IconBtn, Section, Stat, Notice } from '@/components/domain'

type Tab = 'pdf-to-img' | 'img-to-pdf'

const IMG_FORMATS: { value: 'png' | 'jpeg' | 'webp'; label: string; mime: string }[] = [
  { value: 'png', label: 'PNG', mime: 'image/png' },
  { value: 'jpeg', label: 'JPEG', mime: 'image/jpeg' },
  { value: 'webp', label: 'WebP', mime: 'image/webp' },
]

export default function PdfImageConverter({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('pdf-to-img')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [previews, setPreviews] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [imgFormat, setImgFormat] = useState<'png' | 'jpeg' | 'webp'>('png')
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null)

  // Stable object URLs for image thumbnails, revoked when the list changes
  const imageUrls = useMemo(() => images.map((f) => URL.createObjectURL(f)), [images])
  useEffect(() => () => imageUrls.forEach((u) => URL.revokeObjectURL(u)), [imageUrls])

  const handlePdf = useCallback(async (file: File, format: 'png' | 'jpeg' | 'webp' = imgFormat) => {
    setLoading(true)
    setError(null)
    setPreviews([])
    setPdfBuffer(null)
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

      const bytes = await file.arrayBuffer()
      setPdfBuffer(bytes)
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise
      const pageCount = pdf.numPages
      const urls: string[] = []

      for (let i = 1; i <= pageCount; i++) {
        setProgress(t('image.processing', `Rendering page ${i} of ${pageCount}`))
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport, canvas }).promise
        const mime = IMG_FORMATS.find((f) => f.value === format)?.mime ?? 'image/png'
        urls.push(canvas.toDataURL(mime))
      }

      setPreviews(urls)
      setProgress('')
      onOutput({ pdfName: file.name }, { pageCount })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [onOutput, imgFormat, t])

  const handleImages = useCallback((files: File[]) => {
    setImages((prev) => [...prev, ...files.filter((f) => f.type.startsWith('image/'))])
  }, [])

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx))
  const clearImages = () => { setImages([]); setError(null) }

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
      downloadPdf(pdfBytes, 'images.pdf')
      onOutput({ images: images.length }, { pages: images.length })
      analytics.buttonClick('pdf-image-converter', 'images-to-pdf')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function downloadPage(url: string, i: number) {
    const a = document.createElement('a')
    a.href = url; a.download = `page-${i + 1}.${imgFormat === 'jpeg' ? 'jpg' : imgFormat}`; a.click()
  }

  function downloadAllPages() {
    previews.forEach((url, i) => downloadPage(url, i))
  }

  const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'pdf-to-img', label: t('image.pdf_to_images', 'PDF to images'), icon: <ImageIcon className="h-4 w-4" aria-hidden /> },
    { value: 'img-to-pdf', label: t('image.images_to_pdf', 'Images to PDF'), icon: <FileDown className="h-4 w-4" aria-hidden /> },
  ]

  const tabs = (
    <div role="tablist" aria-label="Conversion direction" className="flex shrink-0 gap-2 border-b border-d-border bg-d-raised px-4 py-3">
      {TABS.map((tabKey) => (
        <button
          key={tabKey.value}
          role="tab"
          aria-selected={tab === tabKey.value}
          onClick={() => { setTab(tabKey.value); setPreviews([]); setPdfBuffer(null); setImages([]); setError(null) }}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-d border px-3 py-2 text-sm font-medium transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
            tab === tabKey.value ? 'border-d-accent bg-d-accent text-d-accent-ink' : 'border-d-border hover:bg-d-border/40',
          )}
        >
          {tabKey.icon}
          {tabKey.label}
        </button>
      ))}
    </div>
  )

  const loadingBox = <p className="m-auto text-sm text-d-muted" role="status">{progress || t('common.processing', 'Processing')}</p>

  return (
    <div className="flex h-full min-h-0 flex-col">
      {tabs}
      <div className="min-h-0 flex-1">
        {tab === 'pdf-to-img' ? (
          previews.length === 0 ? (
            <div className="flex h-full flex-col">
              {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
              {loading ? loadingBox : (
                <DropHero
                  accept="application/pdf"
                  onFiles={(files) => files[0] && void handlePdf(files[0])}
                  title={t('image.pdf_to_images', 'PDF to Images')}
                  hint="Drop a PDF here. It stays on your device."
                />
              )}
            </div>
          ) : (
            <StudioWorkspace
              rail={
                <div className="flex h-full flex-col gap-5">
                  <Section title={t('common.output_format', 'Output format')}>
                    <div role="radiogroup" aria-label={t('common.output_format', 'Output format')} className="flex flex-col gap-1.5">
                      {IMG_FORMATS.map((fmt) => {
                        const on = imgFormat === fmt.value
                        return (
                          <button
                            key={fmt.value}
                            role="radio"
                            aria-checked={on}
                            disabled={loading}
                            onClick={() => {
                              setImgFormat(fmt.value)
                              if (pdfBuffer) void handlePdf(new File([pdfBuffer], 'document.pdf'), fmt.value)
                            }}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-d border p-3 text-left text-sm font-medium transition-colors disabled:cursor-wait',
                              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                              on ? 'border-d-accent bg-d-accent/10' : 'border-d-border bg-d-raised hover:border-d-muted',
                            )}
                          >
                            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', on ? 'border-d-accent bg-d-accent text-d-accent-ink' : 'border-d-border')}>
                              {on && <Check className="h-3 w-3" aria-hidden />}
                            </span>
                            {fmt.label}
                          </button>
                        )
                      })}
                    </div>
                  </Section>
                  {error && <Notice tone="error">{error}</Notice>}
                  {loading && <p className="text-sm text-d-muted" role="status">{progress || t('common.processing', 'Processing')}</p>}
                  <div className="mt-auto flex flex-col gap-2">
                    <PrimaryAction onClick={downloadAllPages} disabled={loading}>
                      <span className="inline-flex items-center justify-center gap-2">
                        <Download className="h-5 w-5" aria-hidden />
                        {t('image.download_all', 'Download all')} ({previews.length})
                      </span>
                    </PrimaryAction>
                    <Btn variant="secondary" onClick={() => { setPdfBuffer(null); setPreviews([]) }}>
                      {t('common.choose_another', 'Choose another file')}
                    </Btn>
                  </div>
                </div>
              }
            >
              <div className="mb-4 flex gap-8">
                <Stat label={t('image.pages', 'Pages')} value={previews.length} />
                <Stat label={t('common.format', 'Format')} value={imgFormat.toUpperCase()} />
              </div>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3" aria-label={t('image.page_previews', 'Page previews')}>
                {previews.map((url, i) => (
                  <li key={i} className="flex flex-col items-center gap-2 rounded-d border border-d-border bg-d-raised p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${t('image.page', 'Page')} ${i + 1}`} className="h-36 w-full rounded-sm bg-white object-contain" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-d-muted">{t('image.page', 'Page')} {i + 1}</span>
                      <IconBtn label={`${t('common.download', 'Download')} ${t('image.page', 'Page')} ${i + 1}`} onClick={() => downloadPage(url, i)}>
                        <Download className="h-3.5 w-3.5" aria-hidden />
                      </IconBtn>
                    </div>
                  </li>
                ))}
              </ul>
            </StudioWorkspace>
          )
        ) : images.length === 0 ? (
          <div className="flex h-full flex-col">
            {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
            <DropHero
              accept="image/*"
              multiple
              onFiles={handleImages}
              title={t('image.images_to_pdf', 'Images to PDF')}
              hint="Drop images here. They stay on your device."
            />
          </div>
        ) : (
          <StudioWorkspace
            rail={
              <div className="flex h-full flex-col gap-5">
                <Section title={t('image.images', 'Images')}>
                  <ul className="flex max-h-60 flex-col gap-1.5 overflow-auto">
                    {images.map((img, idx) => (
                      <li key={`${img.name}-${idx}`} className="flex items-center gap-2 rounded-d border border-d-border bg-d-raised p-2">
                        <span className="w-5 shrink-0 text-right text-xs text-d-muted">{idx + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{img.name}</span>
                        <span className="shrink-0 text-xs text-d-muted">{(img.size / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-d border border-d-border bg-d-raised px-4 text-sm font-medium hover:bg-d-border/40 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-d-accent">
                    {t('common.add', 'Add more images')}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => { handleImages(Array.from(e.target.files ?? [])); e.target.value = '' }}
                    />
                  </label>
                </Section>
                {error && <Notice tone="error">{error}</Notice>}
                <div className="mt-auto flex flex-col gap-2">
                  <PrimaryAction onClick={() => void imagesToPdf()} disabled={loading}>
                    <span className="inline-flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <FileDown className="h-5 w-5" aria-hidden />}
                      {loading ? t('common.processing', 'Creating PDF') : `${t('image.create_pdf', 'Create PDF')} (${images.length})`}
                    </span>
                  </PrimaryAction>
                  <Btn variant="secondary" onClick={clearImages}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                    {t('common.clear_all', 'Clear all')}
                  </Btn>
                </div>
              </div>
            }
          >
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3" aria-label={t('image.images', 'Images')}>
              {images.map((img, idx) => (
                <li key={`${img.name}-${idx}`} className="relative flex flex-col items-center gap-2 rounded-d border border-d-border bg-d-raised p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrls[idx]} alt={img.name} className="h-36 w-full rounded-sm object-contain" />
                  <p className="w-full truncate text-center text-xs">{idx + 1}. {img.name}</p>
                  <IconBtn label={`${t('common.remove', 'Remove')} ${img.name}`} onClick={() => removeImage(idx)} className="absolute right-1 top-1 bg-d-raised/90 text-d-muted hover:text-d-ink">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </IconBtn>
                </li>
              ))}
            </ul>
          </StudioWorkspace>
        )}
      </div>
    </div>
  )
}
