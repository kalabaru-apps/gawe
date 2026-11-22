'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Caveat } from 'next/font/google'
import { FileUp, PenTool, Type, Upload, Loader2, Download, Trash2, X, Move, ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { usePdfPages } from './usePdfPages'
import { downloadPdf } from './downloadPdf'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, IconBtn, Section, Empty, Chip } from '@/components/domain/kit'

const caveat = Caveat({ subsets: ['latin'], weight: ['600'] })

type SigMode = 'type' | 'draw' | 'upload'

interface Placement {
  page: number
  xPct: number
  yPct: number
  wPct: number
  hPct: number
  dataUrl: string
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function loadImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

function imageFileToPngDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function rasterizeTypedSignature(text: string): Promise<string> {
  const fontFamily = caveat.style.fontFamily
  await document.fonts.load(`64px ${fontFamily}`)
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = `64px ${fontFamily}`
  const width = Math.max(Math.ceil(measure.measureText(text).width) + 40, 120)
  const height = 120
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.font = `64px ${fontFamily}`
  ctx.fillStyle = '#1e293b'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 20, height / 2)
  return canvas.toDataURL('image/png')
}

export default function SignTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const { pages, loading, error: loadError, load, reset } = usePdfPages()
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState('')
  const [pageIndex, setPageIndex] = useState(0)

  const [sigMode, setSigMode] = useState<SigMode>('type')
  const [sigText, setSigText] = useState('')
  const [hasDrawn, setHasDrawn] = useState(false)
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null)

  const [placement, setPlacement] = useState<Placement | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const pageContainerRef = useRef<HTMLDivElement>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const dragStateRef = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; start: Placement } | null>(null)

  const loadFile = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setError('')
    setPlacement(null)
    setFileName(file.name)
    setPageIndex(0)
    const buf = await load(file, 1.5)
    if (buf) setPdfBuffer(buf)
  }, [load])

  const isReady = sigMode === 'type' ? sigText.trim().length > 0 : sigMode === 'draw' ? hasDrawn : uploadDataUrl !== null

  const getSignatureDataUrl = useCallback(async (): Promise<string | null> => {
    if (sigMode === 'type') return sigText.trim() ? rasterizeTypedSignature(sigText.trim()) : null
    if (sigMode === 'draw') return hasDrawn ? drawCanvasRef.current?.toDataURL('image/png') ?? null : null
    return uploadDataUrl
  }, [sigMode, sigText, hasDrawn, uploadDataUrl])

  const handlePageClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (!isReady || dragStateRef.current) return
    const rect = pageContainerRef.current!.getBoundingClientRect()
    const clickXPct = (e.clientX - rect.left) / rect.width
    const clickYPct = (e.clientY - rect.top) / rect.height

    const dataUrl = await getSignatureDataUrl()
    if (!dataUrl) return
    const stampSize = await loadImageSize(dataUrl)
    const wPct = 0.28
    const hPct = wPct * (rect.width / rect.height) * (stampSize.height / stampSize.width)

    setPlacement({
      page: pageIndex,
      xPct: Math.min(Math.max(clickXPct - wPct / 2, 0), 1 - wPct),
      yPct: Math.min(Math.max(clickYPct - hPct / 2, 0), 1 - hPct),
      wPct,
      hPct,
      dataUrl,
    })
  }, [isReady, pageIndex, getSignatureDataUrl])

  const startMove = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (!placement) return
    dragStateRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, start: placement }
  }
  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (!placement) return
    dragStateRef.current = { mode: 'resize', startX: e.clientX, startY: e.clientY, start: placement }
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragStateRef.current
      const rect = pageContainerRef.current
      if (!drag || !rect) return
      const bounds = rect.getBoundingClientRect()
      const dxPct = (e.clientX - drag.startX) / bounds.width
      const dyPct = (e.clientY - drag.startY) / bounds.height
      setPlacement((prev) => {
        if (!prev) return prev
        if (drag.mode === 'move') {
          return {
            ...prev,
            xPct: Math.min(Math.max(drag.start.xPct + dxPct, 0), 1 - prev.wPct),
            yPct: Math.min(Math.max(drag.start.yPct + dyPct, 0), 1 - prev.hPct),
          }
        }
        const startWPx = drag.start.wPct * bounds.width
        const startHPx = drag.start.hPct * bounds.height
        const aspect = startWPx / startHPx
        const dxPx = e.clientX - drag.startX
        let newWPx = Math.max(startWPx + dxPx, bounds.width * 0.05)
        let newHPx = newWPx / aspect
        const maxWPx = bounds.width - drag.start.xPct * bounds.width
        const maxHPx = bounds.height - drag.start.yPct * bounds.height
        if (newWPx > maxWPx) { newWPx = maxWPx; newHPx = newWPx / aspect }
        if (newHPx > maxHPx) { newHPx = maxHPx; newWPx = newHPx * aspect }
        return {
          ...prev,
          wPct: newWPx / bounds.width,
          hPct: newHPx / bounds.height,
        }
      })
    }
    function onUp() {
      dragStateRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const drawPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')!
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (isDrawingRef.current) {
      ctx.lineTo(x, y)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const onDrawStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    const canvas = drawCanvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    drawPoint(e)
  }
  const onDrawMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    drawPoint(e)
    setHasDrawn(true)
  }
  const onDrawEnd = () => { isDrawingRef.current = false }
  const clearDraw = () => {
    const canvas = drawCanvasRef.current
    if (canvas) canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const onUpload = async (file: File) => {
    setUploadDataUrl(await imageFileToPngDataUrl(file))
  }

  const apply = useCallback(async () => {
    if (!pdfBuffer || !placement) return
    setApplying(true)
    setError('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(pdfBuffer)
      const page = doc.getPage(placement.page)
      const { width: pageW, height: pageH } = page.getSize()
      const pngImage = await doc.embedPng(dataUrlToBytes(placement.dataUrl))
      const boxW = placement.wPct * pageW
      const boxH = placement.hPct * pageH
      const boxX = placement.xPct * pageW
      const boxY = pageH - placement.yPct * pageH - boxH
      page.drawImage(pngImage, { x: boxX, y: boxY, width: boxW, height: boxH })
      const bytes = await doc.save()
      downloadPdf(bytes, fileName.replace(/\.pdf$/i, '') + '-signed.pdf')
      onOutput({ mode: 'sign', page: placement.page }, {})
      analytics.buttonClick('pdf-tools', 'sign')
    } catch (e) {
      setError(`${t('image.failed_convert', 'Failed to sign PDF')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setApplying(false)
    }
  }, [pdfBuffer, placement, fileName, onOutput, t])

  const clearSignature = () => {
    setPlacement(null)
  }

  const MODE_OPTS: { value: SigMode; label: string; icon: React.ReactNode }[] = [
    { value: 'type', label: t('image.sign_type', 'Type'), icon: <Type className="h-4 w-4" aria-hidden /> },
    { value: 'draw', label: t('image.sign_draw', 'Draw'), icon: <PenTool className="h-4 w-4" aria-hidden /> },
    { value: 'upload', label: t('common.upload', 'Upload'), icon: <Upload className="h-4 w-4" aria-hidden /> },
  ]

  if (pages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {(loadError || error) && <div className="p-4 pb-0" role="alert"><Empty title={loadError || error} /></div>}
        {loading ? (
          <p className="m-auto text-sm text-d-muted" role="status">{t('common.processing', 'Loading pages…')}</p>
        ) : (
          <DropHero
            accept=".pdf"
            onFiles={loadFile}
            title={t('image.sign', 'Sign PDF')}
            hint="Drop a PDF here. It stays on your device."
          />
        )}
      </div>
    )
  }

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold">{t('image.sign', 'Sign')}</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{fileName}</p>
            <p className="mt-1 text-xs text-d-muted">{t('image.page', 'Page')} {pageIndex + 1} {t('common.of', 'of')} {pages.length}</p>
          </div>
          <Section title={t('image.signature', 'Signature')}>
            <div className="flex gap-1 border border-d-border rounded-d p-0.5">
              {MODE_OPTS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => { setSigMode(m.value); setPlacement(null) }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[calc(var(--d-radius)-2px)] px-3 py-1.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                    sigMode === m.value ? 'bg-d-accent text-d-accent-ink' : 'text-d-muted hover:bg-d-border/40 hover:text-d-ink',
                  )}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            {sigMode === 'type' && (
              <div className="space-y-2 mt-3">
                <input
                  value={sigText}
                  onChange={(e) => setSigText(e.target.value)}
                  placeholder={t('image.sign_placeholder', 'Your name')}
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink placeholder:text-d-muted/70 focus-visible:outline-2 focus-visible:outline-d-accent"
                />
                {sigText.trim() && (
                  <div className={`${caveat.className} text-4xl border border-d-border rounded-d px-3 py-2 bg-d-raised text-d-ink`}>
                    {sigText}
                  </div>
                )}
              </div>
            )}
            {sigMode === 'draw' && (
              <div className="space-y-2 mt-3">
                <canvas
                  ref={drawCanvasRef}
                  width={280}
                  height={120}
                  onPointerDown={onDrawStart}
                  onPointerMove={onDrawMove}
                  onPointerUp={onDrawEnd}
                  onPointerLeave={onDrawEnd}
                  className="w-full rounded-d border border-d-border bg-d-raised touch-none cursor-crosshair"
                />
                <Btn variant="secondary" size="sm" onClick={clearDraw}>
                  <X className="h-3.5 w-3.5" aria-hidden />
                  <span>{t('action.clear', 'Clear')}</span>
                </Btn>
              </div>
            )}
            {sigMode === 'upload' && (
              <div className="space-y-2 mt-3">
                <DropHero
                  accept="image/*"
                  onFiles={async (files) => { if (files[0]) await onUpload(files[0]) }}
                  title={t('image.drop_image', 'Drop signature image')}
                  hint="PNG, JPG, or SVG"
                />
                {uploadDataUrl && (
                  <div className="relative rounded-d border border-d-border bg-d-raised p-1">
                    <img src={uploadDataUrl} alt="Uploaded signature" className="max-h-24 w-auto rounded-sm" />
                    <button
                      onClick={() => setUploadDataUrl(null)}
                      className="absolute top-1 right-1 rounded bg-d-border/80 text-d-ink p-0.5 hover:bg-d-border"
                      aria-label={t('common.remove', 'Remove signature')}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            )}
          </Section>
          {placement && (
            <Section title={t('image.placement', 'Placement')}>
              <div className="flex gap-2">
                <IconBtn label={t('image.remove_signature', 'Remove signature')} onClick={clearSignature} className="text-d-muted hover:text-red-500">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </IconBtn>
                <span className="flex-1 text-xs text-d-muted self-center">
                  {t('image.drag_resize_hint', 'Drag to move, corner to resize')}
                </span>
              </div>
            </Section>
          )}
          {error && <div role="alert"><Empty title={error} /></div>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={() => void apply()} disabled={applying || !placement}>
              {applying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  <span>{t('common.processing', 'Applying…')}</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" aria-hidden />
                  <span>{t('image.sign_apply', 'Apply signature')} & {t('common.download', 'Download')}</span>
                </>
              )}
            </PrimaryAction>
            <Btn variant="quiet" onClick={() => { setPdfBuffer(null); reset() }}>
              {t('common.choose_another', 'Choose another file')}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-d-border px-2 py-2">
          <div className="flex items-center gap-2">
            <IconBtn label={t('common.previous', 'Previous page')} onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0} className="text-d-muted hover:text-d-ink">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </IconBtn>
            <span className="text-sm text-d-muted">{t('image.page', 'Page')} {pageIndex + 1} / {pages.length}</span>
            <IconBtn label={t('common.next', 'Next page')} onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))} disabled={pageIndex === pages.length - 1} className="text-d-muted hover:text-d-ink">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </IconBtn>
          </div>
          {placement && placement.page === pageIndex && (
            <Chip on={true} onClick={clearSignature} title={t('image.remove_signature', 'Remove signature')}>
              <Move className="h-3 w-3 mr-1" aria-hidden />
              {t('image.signature_placed', 'Signature placed')}
            </Chip>
          )}
        </div>
        <div
          ref={pageContainerRef}
          onClick={handlePageClick}
          className={cn(
            'relative flex-1 border border-d-border rounded-d overflow-hidden select-none',
            isReady ? 'cursor-crosshair' : '',
          )}
          role="img"
          aria-label={placement && placement.page === pageIndex
            ? t('image.signature_on_page', 'Signature placed on page')
            : isReady
              ? t('image.click_to_place', 'Click to place signature')
              : t('image.create_signature_first', 'Create a signature first')}
        >
          <img src={pages[pageIndex].dataUrl} alt={`${t('image.page', 'Page')} ${pageIndex + 1}`} className="w-full h-auto block pointer-events-none" />
          {placement && placement.page === pageIndex && (
            <div
              onPointerDown={startMove}
              style={{
                position: 'absolute',
                left: `${placement.xPct * 100}%`,
                top: `${placement.yPct * 100}%`,
                width: `${placement.wPct * 100}%`,
                height: `${placement.hPct * 100}%`,
              }}
              className="border-2 border-d-accent bg-d-accent/10 cursor-move touch-none shadow-[0_0_0_1px_rgba(255,255,255,0.6)]"
              role="dialog"
              aria-label={t('image.signature_placed', 'Signature placed on page')}
            >
              <img src={placement.dataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
              <div
                onPointerDown={startResize}
                className="absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-sm bg-d-accent border border-white cursor-nwse-resize touch-none"
                aria-label={t('image.resize_signature', 'Resize signature')}
              />
            </div>
          )}
          {!placement && isReady && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-full bg-d-accent/20 border-2 border-dashed border-d-accent p-6 text-center">
                <MousePointerClick className="h-8 w-8 mx-auto text-d-accent mb-2" aria-hidden />
                <p className="text-sm font-medium text-d-accent">{t('image.click_to_place', 'Click to place signature')}</p>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-d-muted mt-2 px-2 text-center">
          {placement && placement.page === pageIndex
            ? t('image.sign_drag_hint', 'Drag to move, drag the corner to resize.')
            : isReady
              ? t('image.sign_click_hint', 'Click the page to place your signature.')
              : t('image.sign_create_first', 'Create a signature using the panel on the right.')}
        </p>
      </div>
    </StudioWorkspace>
  )
}