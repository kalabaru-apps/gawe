'use client'

import { useCallback, useRef, useState } from 'react'
import { Download, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, Section, Stat, Notice } from '@/components/domain'

type Format = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif'
const FORMATS: { value: Format; label: string; ext: string }[] = [
  { value: 'image/webp', label: 'WebP', ext: '.webp' },
  { value: 'image/jpeg', label: 'JPEG', ext: '.jpg' },
  { value: 'image/png', label: 'PNG', ext: '.png' },
  { value: 'image/avif', label: 'AVIF', ext: '.avif' },
]

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

export default function ImageConverter({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [preview, setPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)
  const [originalW, setOriginalW] = useState(0)
  const [originalH, setOriginalH] = useState(0)
  const [outputFormat, setOutputFormat] = useState<Format>('image/webp')
  const [quality, setQuality] = useState(90)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFile = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setOriginalName(file.name.replace(/\.[^.]+$/, ''))
    setOriginalSize(file.size)
    setOutputSize(null)
    setError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setOriginalW(img.naturalWidth)
      setOriginalH(img.naturalHeight)
      setPreview(url)
    }
    img.onerror = () => setError(t('image.failed_load', 'Failed to load image'))
    img.src = url
  }, [t])

  const convert = useCallback(async () => {
    if (!imgRef.current) return
    setConverting(true)
    setError(null)
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) {
        setError(t('image.failed_convert', 'Conversion failed'))
        setConverting(false)
        return
      }
      setOutputSize(blob.size)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = originalName + FORMATS.find((f) => f.value === outputFormat)?.ext
      a.click()
      URL.revokeObjectURL(url)
      setConverting(false)
      onOutput({ format: outputFormat, quality }, { outputSize: blob.size })
      analytics.buttonClick('image-converter', 'convert')
    }, outputFormat, quality / 100)
  }, [outputFormat, quality, originalName, onOutput, t])

  const savedPct = outputSize !== null && originalSize > 0
    ? Math.round((1 - outputSize / originalSize) * 100)
    : 0

  if (!preview) {
    return (
      <div className="flex h-full flex-col">
        {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
        <DropHero
          accept="image/*"
          onFiles={handleFile}
          title={t('image.convert', 'Convert Image')}
          hint="Drop an image here. It stays on your device."
        />
      </div>
    )
  }

  const fmtLabel = FORMATS.find((f) => f.value === outputFormat)?.label

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <Section title={t('common.output_format', 'Output format')}>
            <div role="radiogroup" aria-label={t('common.output_format', 'Output format')} className="flex flex-col gap-1.5">
              {FORMATS.map((fmt) => {
                const on = outputFormat === fmt.value
                return (
                  <button
                    key={fmt.value}
                    role="radio"
                    aria-checked={on}
                    onClick={() => { setOutputFormat(fmt.value); setOutputSize(null) }}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-d border p-3 text-left text-sm font-medium transition-colors',
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
          {outputFormat !== 'image/png' && (
            <Section title={t('common.quality', 'Quality')}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="flex-1 accent-d-accent"
                  aria-label={t('common.quality', 'Quality')}
                />
                <span className="w-12 text-right font-mono text-sm tabular-nums text-d-muted">{quality}%</span>
              </div>
            </Section>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={() => void convert()} disabled={converting}>
              <span className="inline-flex items-center justify-center gap-2">
                {converting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Download className="h-5 w-5" aria-hidden />}
                {converting ? t('image.converting', 'Converting') : `${t('common.convert', 'Convert to')} ${fmtLabel}`}
              </span>
            </PrimaryAction>
            <Btn variant="secondary" onClick={() => { setPreview(null); imgRef.current = null }}>
              {t('common.choose_another', 'Choose another file')}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex items-center justify-center rounded-d border border-d-border bg-d-raised p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={originalName} className="max-h-[55vh] max-w-full rounded-sm object-contain" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-live="polite">
          <Stat label={t('common.dimensions', 'Dimensions')} value={`${originalW}×${originalH}`} />
          <Stat label={t('common.original', 'Before')} value={formatBytes(originalSize)} />
          <Stat label={t('common.output_size', 'After')} value={outputSize !== null ? formatBytes(outputSize) : '-'} />
          <Stat
            label={savedPct >= 0 ? t('common.saved', 'Saved') : 'Larger by'}
            value={outputSize !== null ? `${Math.abs(savedPct)}%` : '-'}
          />
        </div>
      </div>
    </StudioWorkspace>
  )
}
