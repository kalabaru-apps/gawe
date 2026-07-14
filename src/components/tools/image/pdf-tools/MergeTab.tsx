'use client'

import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './downloadPdf'

interface MergeFile {
  id: string
  file: File
}

export default function MergeTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<MergeFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addFiles = useCallback((newFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((f) => ({ id: `${f.name}-${Date.now()}-${Math.random()}`, file: f })),
    ])
  }, [])

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
    if (files.length === 0) { setError(t('image.invalid_range', 'Add at least one PDF.')); return }
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
    } catch (e) {
      setError(`${t('image.failed_convert', 'Failed to merge PDFs')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [files, onOutput, t])

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorAlert message={error} />}
      <FileDropzone onFile={(f) => addFiles([f])} accept=".pdf" label={t('image.drop_pdfs', 'Drop PDFs to merge (multiple allowed)')} />
      {files.length > 0 && (
        <>
          <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
            {files.map((mf, idx) => (
              <div key={mf.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                <span className="flex-1 truncate text-foreground">{mf.file.name}</span>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => moveFile(mf.id, -1)}
                    disabled={idx === 0}
                    className="px-1.5 py-0.5 rounded text-xs border border-border hover:bg-muted disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveFile(mf.id, 1)}
                    disabled={idx === files.length - 1}
                    className="px-1.5 py-0.5 rounded text-xs border border-border hover:bg-muted disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeFile(mf.id)}
                    className="px-1.5 py-0.5 rounded text-xs border border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={() => { analytics.buttonClick('pdf-tools', 'merge'); void mergeAll() }} disabled={loading} className="w-full">
            {loading ? t('common.processing', 'Merging…') : `${t('image.merge', 'Merge')} ${files.length} PDF${files.length > 1 ? 's' : ''}`}
          </Button>
        </>
      )}
    </div>
  )
}
