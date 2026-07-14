'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Caveat } from 'next/font/google'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { usePdfPages } from './usePdfPages'
import { downloadPdf } from './downloadPdf'

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
  const { pages, loading, error: loadError, load } = usePdfPages()
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
        return {
          ...prev,
          wPct: Math.min(Math.max(drag.start.wPct + dxPct, 0.05), 1 - prev.xPct),
          hPct: Math.min(Math.max(drag.start.hPct + dyPct, 0.05), 1 - prev.yPct),
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
    } catch (e) {
      setError(`${t('image.failed_convert', 'Failed to sign PDF')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setApplying(false)
    }
  }, [pdfBuffer, placement, fileName, onOutput, t])

  return (
    <div className="flex flex-col gap-4">
      {(loadError || error) && <ErrorAlert message={loadError || error} />}

      {pages.length === 0 && (
        <FileDropzone onFile={(f) => loadFile([f])} accept=".pdf" label={t('image.drop_pdf', 'Drop a PDF to sign')} />
      )}
      {loading && <div className="text-sm text-muted-foreground">{t('common.processing', 'Loading pages…')}</div>}

      {pages.length > 0 && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Button size="sm" variant="outline" disabled={pageIndex === 0} onClick={() => setPageIndex((p) => p - 1)}>
                ‹ {t('common.previous', 'Prev')}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t('image.pages', 'Page')} {pageIndex + 1} / {pages.length}
              </span>
              <Button size="sm" variant="outline" disabled={pageIndex === pages.length - 1} onClick={() => setPageIndex((p) => p + 1)}>
                {t('common.next', 'Next')} ›
              </Button>
            </div>
            <div
              ref={pageContainerRef}
              onClick={handlePageClick}
              className={`relative border border-border rounded-md overflow-hidden select-none ${isReady ? 'cursor-crosshair' : ''}`}
            >
              <img src={pages[pageIndex].dataUrl} alt={`Page ${pageIndex + 1}`} className="w-full h-auto block pointer-events-none" />
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
                  className="border-2 border-primary bg-primary/5 cursor-move touch-none"
                >
                  <img src={placement.dataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                  <div
                    onPointerDown={startResize}
                    className="absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-sm bg-primary cursor-nwse-resize touch-none"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {placement
                ? t('image.sign_drag_hint', 'Drag to move, drag the corner to resize.')
                : t('image.sign_click_hint', 'Click the page to place your signature.')}
            </p>
          </div>

          <div className="w-full lg:w-64 shrink-0 space-y-3">
            <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
              {(['type', 'draw', 'upload'] as SigMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSigMode(m)}
                  className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${sigMode === m ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
                >
                  {m === 'type' ? t('image.sign_type', 'Type') : m === 'draw' ? t('image.sign_draw', 'Draw') : t('common.upload', 'Upload')}
                </button>
              ))}
            </div>

            {sigMode === 'type' && (
              <div className="space-y-2">
                <input
                  value={sigText}
                  onChange={(e) => setSigText(e.target.value)}
                  placeholder={t('image.sign_placeholder', 'Your name')}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                />
                {sigText.trim() && (
                  <div className={`${caveat.className} text-4xl border border-border rounded-md px-3 py-2 bg-card`}>
                    {sigText}
                  </div>
                )}
              </div>
            )}

            {sigMode === 'draw' && (
              <div className="space-y-2">
                <canvas
                  ref={drawCanvasRef}
                  width={280}
                  height={120}
                  onPointerDown={onDrawStart}
                  onPointerMove={onDrawMove}
                  onPointerUp={onDrawEnd}
                  onPointerLeave={onDrawEnd}
                  className="w-full border border-border rounded-md bg-card touch-none cursor-crosshair"
                />
                <Button size="sm" variant="outline" onClick={clearDraw}>{t('action.clear', 'Clear')}</Button>
              </div>
            )}

            {sigMode === 'upload' && (
              <div className="space-y-2">
                <FileDropzone compact onFile={onUpload} accept="image/*" label={t('image.drop_image', 'Drop an image to convert')} />
                {uploadDataUrl && (
                  <img src={uploadDataUrl} alt="Uploaded signature" className="max-h-24 rounded-md border border-border bg-card p-1" />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {pages.length > 0 && (
        <button
          onClick={() => { analytics.buttonClick('pdf-tools', 'sign'); void apply() }}
          disabled={applying || !placement}
          className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {applying ? t('common.processing', 'Processing…') : `${t('image.sign_apply', 'Apply signature')} & ${t('common.download', 'Download')}`}
        </button>
      )}
    </div>
  )
}
