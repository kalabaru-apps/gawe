'use client'

import { useCallback, useState } from 'react'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './downloadPdf'
import { compressPdf, type CompressLevel } from './compress'

const LEVELS: CompressLevel[] = ['low', 'recommended', 'extreme']

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function CompressTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressLevel>('recommended')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ originalSize: number; outputSize: number; imagesProcessed: number } | null>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setResult(null)
    setError('')
  }, [])

  const run = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const buffer = await file.arrayBuffer()
      const { bytes, originalSize, outputSize, imagesProcessed } = await compressPdf(buffer, level)
      downloadPdf(bytes, file.name.replace(/\.pdf$/i, '') + '-compressed.pdf')
      setResult({ originalSize, outputSize, imagesProcessed })
      onOutput({ level, imagesProcessed }, { originalSize, outputSize })
    } catch (e) {
      setError(`${t('image.failed_convert', 'Compression failed')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [file, level, onOutput, t])

  const savedPct = result && result.originalSize > 0
    ? Math.max(0, Math.round((1 - result.outputSize / result.originalSize) * 100))
    : 0

  return (
    <div className="space-y-4">
      <FileDropzone accept="application/pdf" onFile={handleFile} label={t('image.drop_pdf', 'Drop a PDF file')} />
      {file && (
        <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
          <span className="flex-1 text-sm truncate">{file.name}</span>
          <button onClick={() => { setFile(null); setResult(null) }} className="text-xs text-muted-foreground hover:text-rose-400">✕</button>
        </div>
      )}
      {file && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">{t('image.compress_level', 'Compression level')}</p>
          <div className="flex gap-2">
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={`px-3 py-1.5 rounded-md border text-sm capitalize transition-colors ${level === lvl ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}
              >
                {lvl === 'low' ? t('image.compress_low', 'Low') : lvl === 'recommended' ? t('image.compress_recommended', 'Recommended') : t('image.compress_extreme', 'Extreme')}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <ErrorAlert message={error} />}
      {result && (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('image.original_size', 'Original size')}</span>
            <span>{formatSize(result.originalSize)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('image.output_size', 'Output size')}</span>
            <span>{formatSize(result.outputSize)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>{t('image.saved', 'Saved')}</span>
            <span>{savedPct}%</span>
          </div>
          {result.imagesProcessed === 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {t('image.compress_no_images', 'No compressible images found in this PDF — text and vector content are left untouched.')}
            </p>
          )}
        </div>
      )}
      <button
        onClick={() => { analytics.buttonClick('pdf-tools', 'compress'); void run() }}
        disabled={loading || !file}
        className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {loading ? t('common.processing', 'Processing…') : `${t('image.compress', 'Compress')} & ${t('common.download', 'Download')}`}
      </button>
    </div>
  )
}
