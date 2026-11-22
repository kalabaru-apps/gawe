'use client'

import { useCallback, useState } from 'react'
import { FileUp, GripVertical, Trash2, ChevronUp, ChevronDown, Download, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './downloadPdf'
import {
  DropHero,
  StudioWorkspace,
  PrimaryAction,
  Btn,
  IconBtn,
  Section,
  Stat,
  Empty,
} from '@/components/domain/kit'

interface MergeFile {
  id: string
  file: File
  pageCount: number
}

export default function MergeTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<MergeFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addFiles = useCallback(async (newFiles: File[]) => {
    const { PDFDocument } = await import('pdf-lib')
    for (const file of newFiles) {
      if (!file.name.toLowerCase().endsWith('.pdf')) continue
      try {
        const bytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(bytes)
        const pageCount = doc.getPageCount()
        setFiles((prev) => [
          ...prev,
          { id: `${file.name}-${Date.now()}-${Math.random()}`, file, pageCount },
        ])
      } catch {
        setError(t('image.failed_load', 'Failed to read one or more PDFs'))
      }
    }
  }, [t])

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const moveFile = (id: string, dir: -1 | 1) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const mergeAll = useCallback(async () => {
    if (files.length === 0) {
      setError(t('image.invalid_range', 'Add at least one PDF.'))
      return
    }
    setError('')
    setLoading(true)
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.create()
      for (const { file } of files) {
        const bytes = await file.arrayBuffer()
        const doc = await PDFDocument.load(bytes)
        const pages = await merged.copyPages(doc, doc.getPageIndices())
        pages.forEach((p) => merged.addPage(p))
      }
      const bytes = await merged.save()
      downloadPdf(bytes, 'merged.pdf')
      onOutput({ mode: 'merge', files: files.map((f) => f.file.name) }, { pageCount: merged.getPageCount() })
      analytics.buttonClick('pdf-tools', 'merge')
    } catch (e) {
      setError(`${t('image.failed_convert', 'Failed to merge PDFs')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [files, onOutput, t])

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0)

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {error && <div className="p-4 pb-0" role="alert"><Empty title={error} /></div>}
        <DropHero
          accept=".pdf"
          multiple
          onFiles={addFiles}
          title={t('image.merge', 'Merge PDFs')}
          hint="Drop PDFs here. They stay on your device."
        />
      </div>
    )
  }

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold">{t('image.merge', 'Merge')}</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{files.length} {t('image.pdfs', 'PDFs')} · {totalPages} {t('image.total_pages', 'total pages')}</p>
          </div>
          <Section title={t('common.order', 'Order')}>
            <p className="text-xs text-d-muted mb-2">{t('image.drag_reorder', 'Drag files to reorder')}</p>
            <ul className="flex flex-col gap-1.5 max-h-[240px] overflow-auto pr-1">
              {files.map((mf, idx) => (
                <li key={mf.id} className="flex items-center gap-2 rounded-d border border-d-border bg-d-raised p-2">
                  <IconBtn
                    label={t('common.move_up', 'Move up')}
                    onClick={() => moveFile(mf.id, -1)}
                    disabled={idx === 0}
                    className="text-d-muted hover:text-d-ink"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </IconBtn>
                  <span className="flex-1 min-w-0 truncate text-sm font-mono">{mf.file.name}</span>
                  <span className="text-xs text-d-muted shrink-0">{mf.pageCount} {t('image.pages_short', 'pp')}</span>
                  <IconBtn
                    label={t('common.move_down', 'Move down')}
                    onClick={() => moveFile(mf.id, 1)}
                    disabled={idx === files.length - 1}
                    className="text-d-muted hover:text-d-ink"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </IconBtn>
                  <IconBtn
                    label={t('common.remove', 'Remove')}
                    onClick={() => removeFile(mf.id)}
                    className="text-d-muted hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </IconBtn>
                </li>
              ))}
            </ul>
          </Section>
          {error && <div role="alert"><Empty title={error} /></div>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction
              onClick={() => void mergeAll()}
              disabled={loading || files.length === 0}
            >
              {loading ? t('common.processing', 'Merging…') : `${t('image.merge', 'Merge')} ${files.length} PDF${files.length > 1 ? 's' : ''}`}
            </PrimaryAction>
            <Btn variant="quiet" onClick={() => setFiles([])}>
              {t('common.clear_all', 'Clear all')}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-d-border px-2 py-2">
          <Stat label={t('image.files', 'Files')} value={files.length} tone="display" />
          <Stat label={t('image.total_pages', 'Total pages')} value={totalPages} tone="display" />
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 flex-1 overflow-auto p-2">
          {files.map((mf, idx) => (
            <li key={mf.id} className="flex flex-col items-center gap-1.5 rounded-d border border-d-border bg-d-raised p-3">
              <span className="font-display text-xl font-semibold text-d-muted">{idx + 1}</span>
              <p className="text-xs text-center truncate w-full px-1">{mf.file.name}</p>
              <p className="text-xs text-d-muted">{mf.pageCount} {t('image.pages_short', 'pp')}</p>
            </li>
          ))}
        </ul>
      </div>
    </StudioWorkspace>
  )
}