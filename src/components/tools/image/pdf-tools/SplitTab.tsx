'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { usePdfPages } from './usePdfPages'
import { downloadPdf } from './downloadPdf'

export default function SplitTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const { pages: thumbs, loading, error, load } = usePdfPages()
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')

  const loadFile = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setExtractError('')
    setFileName(file.name)
    const buf = await load(file, 0.3)
    if (buf) {
      setBuffer(buf)
      setSelected(new Set())
    }
  }, [load])

  const toggleThumb = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(thumbs.map((t) => t.index)))
  const deselectAll = () => setSelected(new Set())

  const extractPages = useCallback(async () => {
    if (!buffer) return
    const indices = [...selected].sort((a, b) => a - b)
    if (indices.length === 0) { setExtractError(t('image.invalid_range', 'Select at least one page.')); return }
    setExtractError('')
    setExtracting(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(buffer)
      const newDoc = await PDFDocument.create()
      const pages = await newDoc.copyPages(srcDoc, indices)
      pages.forEach((p) => newDoc.addPage(p))
      const bytes = await newDoc.save()
      downloadPdf(bytes, fileName.replace(/\.pdf$/i, '') + '-extracted.pdf')
      onOutput({ mode: 'split', pages: indices }, { pageCount: indices.length })
    } catch (e) {
      setExtractError(`${t('image.failed_convert', 'Failed to extract pages')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setExtracting(false)
    }
  }, [buffer, selected, fileName, onOutput, t])

  const busy = loading || extracting

  return (
    <div className="flex flex-col gap-4">
      {(error || extractError) && <ErrorAlert message={error || extractError} />}
      <FileDropzone onFile={(f) => loadFile([f])} accept=".pdf" label={t('image.drop_pdf', 'Drop a PDF to split')} />
      {loading && <div className="text-sm text-muted-foreground">{t('common.processing', 'Loading pages…')}</div>}
      {thumbs.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <Button size="sm" variant="outline" onClick={selectAll}>{t('common.select_all', 'Select all')}</Button>
            <Button size="sm" variant="outline" onClick={deselectAll}>{t('common.deselect_all', 'Deselect all')}</Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {selected.size} / {thumbs.length} {t('image.pages', 'pages selected')}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {thumbs.map((th) => (
              <button
                key={th.index}
                onClick={() => toggleThumb(th.index)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1 transition-colors ${
                  selected.has(th.index) ? 'border-primary' : 'border-border'
                }`}
              >
                <img src={th.dataUrl} alt={`Page ${th.index + 1}`} className="w-full rounded" />
                <span className="text-xs text-muted-foreground">{th.index + 1}</span>
              </button>
            ))}
          </div>
          <Button onClick={() => { analytics.buttonClick('pdf-tools', 'split'); void extractPages() }} disabled={busy} className="w-full">
            {extracting ? t('common.processing', 'Processing…') : t('image.extract', 'Extract selected pages')}
          </Button>
        </>
      )}
    </div>
  )
}
