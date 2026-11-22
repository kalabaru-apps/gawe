'use client'

import { useCallback, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'
import { FileUp, Link2, Link, Download, Loader2, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, Section, Stat, Empty } from '@/components/domain/kit'

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: 'HD (1280×720)', w: 1280, h: 720 },
  { label: 'Full HD (1920×1080)', w: 1920, h: 1080 },
  { label: '4K (3840×2160)', w: 3840, h: 2160 },
  { label: 'Instagram Post (1080×1080)', w: 1080, h: 1080 },
  { label: 'Instagram Story (1080×1920)', w: 1080, h: 1920 },
  { label: 'Twitter Post (1200×675)', w: 1200, h: 675 },
]

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}

export default function ImageResize({ onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('')
  const [origW, setOrigW] = useState(0)
  const [origH, setOrigH] = useState(0)
  const [origSize, setOrigSize] = useState(0)
  const [targetW, setTargetW] = useState(800)
  const [targetH, setTargetH] = useState(600)
  const [lockAspect, setLockAspect] = useState(true)
  const [maxSizeMB, setMaxSizeMB] = useState(1)
  const [resizing, setResizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)
  const aspectRatioRef = useRef(1)

  const handleFile = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
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

  const handleWidthChange = (w: number) => {
    setTargetW(w)
    if (lockAspect) setTargetH(Math.round(w / aspectRatioRef.current))
  }

  const handleHeightChange = (h: number) => {
    setTargetH(h)
    if (lockAspect) setTargetW(Math.round(h * aspectRatioRef.current))
  }

  const applyPreset = (w: number, h: number) => {
    setTargetW(w)
    setTargetH(h)
    aspectRatioRef.current = w / h
  }

  const resize = useCallback(async () => {
    if (!fileRef.current) return
    setResizing(true)
    setError(null)
    try {
      const compressed = await imageCompression(fileRef.current, {
        maxWidthOrHeight: Math.max(targetW, targetH),
        maxSizeMB,
        useWebWorker: true,
      })
      const url = URL.createObjectURL(compressed)
      const img = new Image()
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = targetW; canvas.height = targetH
      canvas.getContext('2d')!.drawImage(img, 0, 0, targetW, targetH)
      canvas.toBlob((blob) => {
        if (!blob) { setError(t('image.failed_convert', 'Resize failed')); setResizing(false); return }
        const outUrl = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = outUrl; a.download = `${originalName}-${targetW}x${targetH}.png`; a.click()
        URL.revokeObjectURL(outUrl); URL.revokeObjectURL(url)
        setResizing(false)
        onOutput({ targetW, targetH, maxSizeMB }, { outputSize: blob.size })
        analytics.buttonClick('image-resize', 'resize')
      }, 'image/png')
    } catch (e) {
      setError((e as Error).message)
      setResizing(false)
    }
  }, [targetW, targetH, maxSizeMB, originalName, onOutput])

  if (!preview) {
    return (
      <div className="flex h-full flex-col">
        {error && <div className="p-4 pb-0" role="alert"><Empty title={error} /></div>}
        <DropHero
          accept="image/*"
          onFiles={handleFile}
          title={t('image.resize', 'Resize Image')}
          hint="Drop an image here. It stays on your device."
        />
      </div>
    )
  }

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <Section title={t('common.dimensions', 'Dimensions')}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-d-muted mb-1 block">{t('image.width', 'Width')} (px)</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={targetW}
                  onChange={(e) => handleWidthChange(Math.max(1, Math.min(10000, Number(e.target.value))))}
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm font-mono text-d-ink placeholder:text-d-muted/70 focus-visible:outline-2 focus-visible:outline-d-accent"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-d-muted mb-1 block">{t('image.height', 'Height')} (px)</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={targetH}
                  onChange={(e) => handleHeightChange(Math.max(1, Math.min(10000, Number(e.target.value))))}
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm font-mono text-d-ink placeholder:text-d-muted/70 focus-visible:outline-2 focus-visible:outline-d-accent"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={lockAspect}
                onChange={(e) => setLockAspect(e.target.checked)}
                className="rounded border-d-border text-d-accent focus-visible:outline-2 focus-visible:outline-d-accent"
              />
              <span className="text-d-ink">{t('image.keep_ratio', 'Lock aspect ratio')}</span>
            </label>
            <div className="flex items-center gap-2 mt-3">
              <Link2 className={cn('h-4 w-4 flex-shrink-0', lockAspect ? 'text-d-accent' : 'text-d-muted')} aria-hidden />
              <span className="text-xs text-d-muted">{t('image.aspect_ratio', 'Aspect ratio')}: {aspectRatioRef.current.toFixed(2)}:1</span>
            </div>
          </Section>
          <Section title={t('image.presets', 'Presets')}>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.w, p.h)}
                  className="rounded-d border border-d-border bg-d-raised px-2.5 py-1.5 text-xs text-d-muted hover:border-d-accent hover:text-d-accent transition-colors focus-visible:outline-2 focus-visible:outline-d-accent"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Section>
          <Section title={t('common.max_size', 'Max file size')}>
            <select
              value={maxSizeMB}
              onChange={(e) => setMaxSizeMB(Number(e.target.value))}
              className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink focus-visible:outline-2 focus-visible:outline-d-accent"
            >
              {[0.25, 0.5, 1, 2, 5, 10].map((v) => <option key={v} value={v}>{v < 1 ? `${v * 1000} KB` : `${v} MB`}</option>)}
            </select>
          </Section>
          <Section title={t('common.sizes', 'Sizes')}>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-d-muted">{t('common.original', 'Original')}</span>
                <span className="font-mono tabular-nums">{origW}×{origH} · {formatBytes(origSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-d-muted">{t('common.target', 'Target')}</span>
                <span className="font-mono tabular-nums">{targetW}×{targetH}</span>
              </div>
            </div>
          </Section>
          {error && <div role="alert"><Empty title={error} /></div>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={() => void resize()} disabled={resizing}>
              {resizing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  <span>{t('image.resizing', 'Resizing…')}</span>
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" aria-hidden />
                  <span>{t('image.resize', 'Resize')} & {t('common.download', 'Download')}</span>
                </>
              )}
            </PrimaryAction>
            <Btn variant="quiet" onClick={() => { setPreview(null); fileRef.current = null }}>
              {t('common.choose_another', 'Choose another file')}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-d-border px-2 py-2">
          <Stat label={t('common.dimensions', 'Dimensions')} value={`${origW}×${origH}`} tone="display" />
          <Stat label={t('common.target', 'Target')} value={`${targetW}×${targetH}`} tone="display" />
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-[60vh]">
            <img
              src={preview}
              alt={originalName}
              className="max-w-full max-h-[60vh] object-contain rounded-d border border-d-border bg-white"
            />
          </div>
        </div>
      </div>
    </StudioWorkspace>
  )
}