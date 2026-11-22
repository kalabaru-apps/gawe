'use client'

import { useCallback, useState } from 'react'
import { Shield, ShieldCheck, Loader2, Download } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, Section, Row, Seg, Notice } from '@/components/domain'

async function scanExif(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer()
  const view = new DataView(buf)
  const found: string[] = []
  const bytes = new Uint8Array(buf)
  const str = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 65536)))

  const isJpeg = bytes.length > 2 && view.getUint16(0) === 0xffd8
  const isHeic = (() => {
    if (bytes.length < 12) return false
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
    if (ftyp !== 'ftyp') return false
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    return ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(brand)
  })()

  if (!isJpeg && !isHeic) return found

  if (str.includes('Exif')) found.push('EXIF data')
  if (str.includes('GPS') || str.includes('GPSInfo')) found.push('GPS location')
  if (str.includes('Make') || str.includes('Model')) found.push('Camera info')
  if (str.includes('DateTime') || str.includes('DateTimeOriginal')) found.push('Date & time')
  if (str.includes('Software')) found.push('Software info')
  if (str.includes('XMP') || str.includes('adobe.com')) found.push('XMP metadata')

  if (isHeic && found.length === 0) found.push('Container metadata')

  return found
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

interface FileInfo {
  file: File
  width: number
  height: number
  exifTags: string[]
  objectUrl: string
}

export default function ExifRemover({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [quality, setQuality] = useState(0.9)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const type = file.type.toLowerCase()
    const name = file.name.toLowerCase()
    const isHeicFile = type.includes('heic') || type.includes('heif') || name.endsWith('.heic') || name.endsWith('.heif')
    if (!type.startsWith('image/') && !isHeicFile) {
      setError(t('image.invalid_format', 'Please upload a JPEG, PNG, or HEIC/HEIF image.'))
      return
    }
    setError('')
    setOutputSize(null)

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objectUrl

    const loaded = await new Promise<boolean>((res) => {
      img.onload = () => res(true)
      img.onerror = () => res(false)
    })

    const exifTags = await scanExif(file)
    if (!loaded) {
      setFileInfo({ file, width: 0, height: 0, exifTags, objectUrl })
      if (isHeicFile) {
        setError(t('image.heic_no_preview', 'HEIC preview not supported in this browser. Use Safari on macOS/iOS to strip & download, or convert to JPEG first on other browsers.'))
      }
      return
    }
    setFileInfo({ file, width: img.naturalWidth, height: img.naturalHeight, exifTags, objectUrl })
  }, [t])

  const stripAndDownload = useCallback(() => {
    if (!fileInfo) return
    setProcessing(true)
    setError('')
    const img = new Image()
    img.src = fileInfo.objectUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const mime = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png'
      const q = outputFormat === 'jpeg' ? quality : undefined
      canvas.toBlob((blob) => {
        if (!blob) {
          setError(t('image.failed_convert', 'Failed to process image.'))
          setProcessing(false)
          return
        }
        setOutputSize(blob.size)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const ext = outputFormat === 'jpeg' ? 'jpg' : 'png'
        a.href = url
        a.download = fileInfo.file.name.replace(/\.[^.]+$/, '') + `-clean.${ext}`
        a.click()
        URL.revokeObjectURL(url)
        setProcessing(false)
        onOutput(
          { fileName: fileInfo.file.name, format: outputFormat, quality },
          { originalSize: fileInfo.file.size, outputSize: blob.size, exifRemoved: fileInfo.exifTags },
        )
        analytics.buttonClick('exif-remover', 'remove')
      }, mime, q)
    }
    img.onerror = () => {
      setError(t('image.failed_load', 'Failed to load image.'))
      setProcessing(false)
    }
  }, [fileInfo, outputFormat, quality, onOutput, t])

  const clearFile = () => {
    if (fileInfo) URL.revokeObjectURL(fileInfo.objectUrl)
    setFileInfo(null)
    setOutputSize(null)
    setError('')
  }

  if (!fileInfo) {
    return (
      <div className="flex h-full flex-col">
        {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
        <DropHero
          accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif"
          onFiles={handleFiles}
          title={t('image.strip_exif', 'Strip EXIF')}
          hint={t('image.jpeg_png_heic_hint', 'JPEG, PNG, or HEIC/HEIF. Stays on your device.')}
        />
      </div>
    )
  }

  const hasMeta = fileInfo.exifTags.length > 0

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold">{t('image.strip_exif', 'Strip EXIF')}</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{fileInfo.file.name}</p>
          </div>
          <Section title={t('common.output_format', 'Output format')}>
            <Seg<'jpeg' | 'png'>
              value={outputFormat}
              onChange={setOutputFormat}
              label={t('common.output_format', 'Output format')}
              options={[{ value: 'jpeg', label: 'JPEG' }, { value: 'png', label: 'PNG' }]}
            />
          </Section>
          {outputFormat === 'jpeg' && (
            <Section title={t('common.quality', 'Quality')}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={70}
                  max={100}
                  value={Math.round(quality * 100)}
                  onChange={(e) => setQuality(Number(e.target.value) / 100)}
                  className="flex-1 accent-d-accent"
                  aria-label={t('common.quality', 'Quality')}
                />
                <span className="w-12 text-right font-mono text-sm tabular-nums text-d-muted">{Math.round(quality * 100)}%</span>
              </div>
            </Section>
          )}
          {outputSize !== null && (
            <Section title={t('common.sizes', 'Sizes')}>
              <dl>
                <Row label={t('common.original_size', 'Original')} value={formatBytes(fileInfo.file.size)} />
                <Row label={t('common.output_size', 'Clean copy')} value={formatBytes(outputSize)} />
              </dl>
            </Section>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={stripAndDownload} disabled={processing}>
              <span className="inline-flex items-center justify-center gap-2">
                {processing
                  ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  : <Download className="h-5 w-5" aria-hidden />}
                {processing ? t('common.processing', 'Processing') : t('image.strip_download', 'Strip and download')}
              </span>
            </PrimaryAction>
            <Btn variant="secondary" onClick={clearFile}>{t('common.choose_another', 'Choose another file')}</Btn>
          </div>
        </div>
      }
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div className="flex items-center justify-center rounded-d border border-d-border bg-d-raised p-3">
          {fileInfo.width > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileInfo.objectUrl} alt={fileInfo.file.name} className="max-h-[50vh] max-w-full rounded-sm object-contain" />
          ) : (
            <div className="px-6 py-12 text-center text-d-muted">
              <Shield className="mx-auto mb-3 h-10 w-10" aria-hidden />
              <p className="font-display text-base font-semibold text-d-ink">{t('image.no_preview_available', 'No preview available')}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-d-muted">
          {fileInfo.width > 0 ? `${fileInfo.width}×${fileInfo.height}px` : t('image.unknown_dimensions', 'Unknown dimensions')} · {formatBytes(fileInfo.file.size)}
        </p>

        <Section title={t('image.metadata_found', 'Metadata found')}>
          {hasMeta ? (
            <>
              <ul className="flex flex-wrap gap-2" aria-label={t('image.detected_tags', 'Detected tags')}>
                {fileInfo.exifTags.map((tag) => (
                  <li key={tag} className="inline-flex items-center gap-1.5 rounded-d border border-d-border bg-d-raised px-3 py-1.5 text-sm">
                    <Shield className="h-3.5 w-3.5 text-d-accent" aria-hidden />
                    {tag}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-d-muted">{t('image.metadata_will_be_removed', 'All detected metadata is removed in the clean download.')}</p>
            </>
          ) : (
            <Notice tone="ok">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" aria-hidden />{t('image.no_exif_found', 'No EXIF metadata detected')}. {t('image.image_already_clean', 'This image appears to be clean.')}</span>
            </Notice>
          )}
        </Section>
      </div>
    </StudioWorkspace>
  )
}
