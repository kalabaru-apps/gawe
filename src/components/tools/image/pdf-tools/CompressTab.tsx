'use client'

import { useCallback, useState } from 'react'
import { FileUp, Download, Loader2, Archive, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './downloadPdf'
import { compressPdf, type CompressLevel } from './compress'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, Section, Stat, Empty } from '@/components/domain/kit'

const LEVELS: { value: CompressLevel; label: string; desc: string }[] = [
  { value: 'low', label: 'Low', desc: 'Light compression, best quality' },
  { value: 'recommended', label: 'Recommended', desc: 'Balanced quality and size' },
  { value: 'extreme', label: 'Extreme', desc: 'Maximum compression, lower quality' },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function CompressTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<CompressLevel>('recommended')
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ originalSize: number; outputSize: number; imagesProcessed: number } | null>(null)

  const handleFile = useCallback((files: File[]) => {
    const f = files[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError(t('image.invalid_file', 'Please drop a PDF file.'))
      return
    }
    setFile(f)
    setResult(null)
    setError('')
  }, [t])

  const run = useCallback(async () => {
    if (!file) return
    setCompressing(true)
    setError('')
    setResult(null)
    try {
      const buffer = await file.arrayBuffer()
      const { bytes, originalSize, outputSize, imagesProcessed } = await compressPdf(buffer, level)
      downloadPdf(bytes, file.name.replace(/\.pdf$/i, '') + '-compressed.pdf')
      setResult({ originalSize, outputSize, imagesProcessed })
      onOutput({ level, imagesProcessed }, { originalSize, outputSize })
      analytics.buttonClick('pdf-tools', 'compress')
    } catch (e) {
      setError(`${t('image.failed_convert', 'Compression failed')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setCompressing(false)
    }
  }, [file, level, onOutput, t])

  const savedPct = result && result.originalSize > 0
    ? Math.max(0, Math.round((1 - result.outputSize / result.originalSize) * 100))
    : 0

  if (!file) {
    return (
      <div className="flex h-full flex-col">
        {error && <div className="p-4 pb-0" role="alert"><Empty title={error} /></div>}
        <DropHero
          accept=".pdf"
          onFiles={handleFile}
          title={t('image.compress', 'Compress PDF')}
          hint="Drop a PDF here. It stays on your device."
        />
      </div>
    )
  }

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold">{t('image.compress', 'Compress')}</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{file.name}</p>
            <p className="mt-1 text-sm text-d-muted">{formatSize(file.size)}</p>
          </div>
          <Section title={t('image.compress_level', 'Compression level')}>
            <div className="flex flex-col gap-2">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  onClick={() => setLevel(lvl.value)}
                  className={cn(
                    'flex items-center gap-3 rounded-d border p-3 text-left transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                    level === lvl.value
                      ? 'border-d-accent bg-d-accent/10'
                      : 'border-d-border bg-d-raised hover:border-d-muted',
                  )}
                >
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', level === lvl.value ? 'bg-d-accent text-d-accent-ink' : 'border-d-border text-d-muted')}>
                    {level === lvl.value ? <Check className="h-3.5 w-3.5" aria-hidden /> : <span className="text-xs font-semibold">{LEVELS.indexOf(lvl) + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium text-sm truncate', level === lvl.value ? 'text-d-accent' : 'text-d-ink')}>{lvl.label}</p>
                    <p className="text-xs text-d-muted truncate">{lvl.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>
          {error && <div role="alert"><Empty title={error} /></div>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={() => void run()} disabled={compressing}>
              {compressing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  <span>{t('common.processing', 'Compressing…')}</span>
                </>
              ) : (
                <>
                  <Archive className="h-5 w-5" aria-hidden />
                  <span>{t('image.compress', 'Compress')} & {t('common.download', 'Download')}</span>
                </>
              )}
            </PrimaryAction>
            <Btn variant="quiet" onClick={() => { setFile(null); setResult(null) }}>
              {t('common.choose_another', 'Choose another file')}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col">
        {result ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="grid grid-cols-3 gap-4">
              <Stat label={t('image.original_size', 'Original')} value={formatSize(result.originalSize)} tone="display" />
              <Stat label={t('image.output_size', 'Compressed')} value={formatSize(result.outputSize)} tone="display" />
              <Stat label={t('image.saved', 'Saved')} value={`${savedPct}%`} tone="display" note={result.imagesProcessed ? `${result.imagesProcessed} ${t('image.images_processed', 'images processed')}` : t('image.no_images', 'No images')} />
            </div>
            {result.imagesProcessed === 0 && (
              <div className="rounded-d border border-d-border bg-d-raised p-3">
                <p className="text-sm text-d-muted">{t('image.compress_no_images', 'No compressible images found in this PDF — text and vector content are left untouched.')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <Archive className="h-16 w-16 mx-auto text-d-muted mb-4" aria-hidden />
              <p className="font-display text-lg font-semibold">{t('image.ready_to_compress', 'Ready to compress')}</p>
              <p className="mt-1 text-sm text-d-muted">{t('image.choose_level', 'Choose a level and click Compress')}</p>
            </div>
          </div>
        )}
      </div>
    </StudioWorkspace>
  )
}