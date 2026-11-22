'use client'

import { useCallback, useState } from 'react'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { DropHero, StudioWorkspace, PrimaryAction } from '@/components/domain/Studio'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { usePdfPages } from './usePdfPages'
import { downloadPdf } from './downloadPdf'

export default function SplitTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const { pages: thumbs, loading, error, load, reset } = usePdfPages()
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

  if (thumbs.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {(error || extractError) && <div className="p-4 pb-0"><ErrorAlert message={error || extractError} /></div>}
        {loading
          ? <p className="m-auto text-sm text-d-muted" role="status">{t('common.processing', 'Reading pages')}</p>
          : <DropHero accept=".pdf" onFiles={loadFile} title={t('image.drop_pdf', 'Split a PDF')} hint="Drop a PDF here. It stays on your device." />}
      </div>
    )
  }

  const btn = 'flex-1 cursor-pointer rounded-d border border-d-border px-3 py-2 text-sm hover:bg-d-border/40 focus-visible:outline-2 focus-visible:outline-d-accent'

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Split</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{fileName}</p>
          </div>
          <p className="text-sm" aria-live="polite">
            <span className="font-display text-3xl font-semibold tabular-nums">{selected.size}</span>
            <span className="text-d-muted"> of {thumbs.length} {t('image.pages', 'pages selected')}</span>
          </p>
          <div className="flex gap-2">
            <button onClick={selectAll} className={btn}>{t('common.select_all', 'Select all')}</button>
            <button onClick={deselectAll} className={btn}>{t('common.deselect_all', 'Clear')}</button>
          </div>
          {(error || extractError) && <ErrorAlert message={error || extractError} />}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={() => { analytics.buttonClick('pdf-tools', 'split'); void extractPages() }} disabled={busy || selected.size === 0}>
              {extracting ? t('common.processing', 'Working') : t('image.extract', 'Extract selected pages')}
            </PrimaryAction>
            <button onClick={() => { setBuffer(null); setSelected(new Set()); reset() }} className={btn}>Choose another file</button>
          </div>
        </div>
      }
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-4">
        {thumbs.map((th) => {
          const on = selected.has(th.index)
          return (
            <li key={th.index}>
              <button
                onClick={() => toggleThumb(th.index)}
                aria-pressed={on}
                className={cn(
                  'flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-d border-2 bg-d-raised p-1.5 transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                  on ? 'border-d-accent' : 'border-d-border hover:border-d-muted',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={th.dataUrl} alt={`Page ${th.index + 1}`} className="w-full rounded-sm bg-white" />
                <span className={cn('text-xs tabular-nums', on ? 'font-semibold text-d-accent' : 'text-d-muted')}>{th.index + 1}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </StudioWorkspace>
  )
}
