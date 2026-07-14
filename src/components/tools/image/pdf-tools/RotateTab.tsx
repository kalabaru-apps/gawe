'use client'

import { useCallback, useState } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../../shared/FileDropzone'
import { ErrorAlert } from '../../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './downloadPdf'

interface PdfFile { name: string; file: File }

export default function RotateTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [file, setFile] = useState<PdfFile | null>(null)
  const [angle, setAngle] = useState<90 | 180 | 270>(90)
  const [target, setTarget] = useState<'all' | 'odd' | 'even'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback((f: File) => {
    setFile({ name: f.name, file: f })
  }, [])

  async function rotate() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const { PDFDocument, degrees } = await import('pdf-lib')
      const bytes = await file.file.arrayBuffer()
      const doc = await PDFDocument.load(bytes)
      const pages = doc.getPages()
      pages.forEach((p, i) => {
        const pageNum = i + 1
        const shouldRotate = target === 'all' || (target === 'odd' && pageNum % 2 === 1) || (target === 'even' && pageNum % 2 === 0)
        if (shouldRotate) p.setRotation(degrees((p.getRotation().angle + angle) % 360))
      })
      const outBytes = await doc.save()
      downloadPdf(outBytes, `rotated-${angle}deg.pdf`)
      onOutput({ angle, target }, { pages: pages.length })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <FileDropzone accept="application/pdf" onFile={handleFile} label={t('image.drop_pdf', 'Drop a PDF file')} />
      {file && (
        <div className="flex items-center gap-2 rounded-md border border-input px-3 py-2">
          <span className="flex-1 text-sm truncate">{file.name}</span>
          <button onClick={() => setFile(null)} className="text-xs text-muted-foreground hover:text-rose-400">✕</button>
        </div>
      )}
      {file && (
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('image.rotate', 'Angle')}</p>
            <div className="flex gap-2">
              {([90, 180, 270] as const).map((a) => (
                <button key={a} onClick={() => setAngle(a)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${angle === a ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                  {a}°
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('image.pages', 'Pages')}</p>
            <div className="flex gap-2">
              {(['all', 'odd', 'even'] as const).map((pg) => (
                <button key={pg} onClick={() => setTarget(pg)}
                  className={`px-3 py-1.5 rounded-md border text-sm capitalize transition-colors ${target === pg ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                  {pg === 'all' ? t('image.all_pages', 'All') : pg === 'odd' ? t('image.odd_pages', 'Odd') : t('image.even_pages', 'Even')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {error && <ErrorAlert message={error} />}
      <button
        onClick={() => { analytics.buttonClick('pdf-tools', 'rotate'); void rotate() }}
        disabled={loading || !file}
        className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? t('common.processing', 'Processing…') : `${t('image.rotate', 'Rotate')} & ${t('common.download', 'Download')}`}
      </button>
    </div>
  )
}
