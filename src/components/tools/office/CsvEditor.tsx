'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Sheet, Page, Section, Btn, TextInput, CodeArea, Notice, Column, Scroll, Region } from '@/components/domain/kit'
import { cn } from '@/lib/utils'
import { FileText, Download, Plus, X, Trash2, Upload, Clipboard } from 'lucide-react'

type Tab = 'paste' | 'upload' | 'table'

export default function CsvEditor({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('paste')
  const [rawCsv, setRawCsv] = useState((initialState?.rawCsv as string) ?? '')
  const [data, setData] = useState<string[][]>([])
  const [error, setError] = useState<string | null>(null)

  function parseCsv(csv: string) {
    const result = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true })
    if (result.errors.length > 0 && result.data.length === 0) {
      setError(result.errors[0].message)
      return
    }
    setError(null)
    setData(result.data as string[][])
    setTab('table')
    onOutput({ rowCount: result.data.length }, { parsed: true })
  }

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawCsv(text)
      parseCsv(text)
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }, [])

  function updateCell(row: number, col: number, value: string) {
    setData((prev) => prev.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : r))
  }

  function addRow() {
    const cols = data[0]?.length ?? 3
    setData((prev) => [...prev, Array(cols).fill('')])
  }

  function addCol() {
    setData((prev) => prev.map((row) => [...row, '']))
  }

  function removeRow(i: number) {
    setData((prev) => prev.filter((_, ri) => ri !== i))
  }

  function removeCol(i: number) {
    setData((prev) => prev.map((row) => row.filter((_, ci) => ci !== i)))
  }

  function downloadCsv() {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'data.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function copyCsv() {
    const csv = Papa.unparse(data)
    navigator.clipboard.writeText(csv)
  }

  const hasData = data.length > 0

  return (
    <Scroll>
      <Column width="xl">
        <Sheet>
          <h1 className="font-serif text-2xl font-semibold mb-1">{t('office.csv_editor', 'CSV Editor')}</h1>
          <p className="text-d-muted text-sm mb-6">{t('office.csv_editor_desc', 'Paste, upload, or edit CSV data. Import/export with one click.')}</p>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1 rounded-d border border-d-border p-0.5 bg-d-raised/50">
              {(['paste', 'upload', 'table'] as Tab[]).map((tabItem) => (
                <Btn key={tabItem} variant={tab === tabItem ? 'primary' : 'secondary'} size="sm" onClick={() => setTab(tabItem)} className="capitalize">
                  {tabItem === 'paste' ? t('office.paste_text', 'Paste CSV') : tabItem === 'upload' ? t('common.upload', 'Upload') : `${t('common.preview', 'Table')} ${hasData ? `(${data.length}×${data[0]?.length ?? 0})` : ''}`}
                </Btn>
              ))}
            </div>
            {hasData && (
              <div className="ml-auto flex items-center gap-1">
                <Btn size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5" aria-hidden /> <span className="hidden sm:inline">Row</span></Btn>
                <Btn size="sm" onClick={addCol}><Plus className="h-3.5 w-3.5" aria-hidden /> <span className="hidden sm:inline">Col</span></Btn>
                <Btn size="sm" onClick={downloadCsv}><Download className="h-3.5 w-3.5" aria-hidden /> <span className="hidden sm:inline">{t('action.export', 'Export')}</span></Btn>
                <Btn variant="quiet" size="sm" onClick={copyCsv}><Clipboard className="h-3.5 w-3.5" aria-hidden /> <span className="hidden sm:inline">{t('action.copy', 'Copy')}</span></Btn>
              </div>
            )}
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          {tab === 'paste' && (
            <Page>
              <Section title={t('office.paste_text', 'Paste CSV')}>
                <CodeArea
                  value={rawCsv}
                  onChange={(v) => setRawCsv(v)}
                  placeholder="name,email,age\nAlice,alice@example.com,30\nBob,bob@example.com,25"
                  label={t('office.paste_text', 'Paste CSV')}
                />
                <div className="flex gap-2 mt-3">
                  <Btn variant="primary" onClick={() => { analytics.buttonClick('csv-editor', 'import'); parseCsv(rawCsv) }} disabled={!rawCsv.trim()}>
                    {t('action.import', 'Parse CSV')}
                  </Btn>
                  <Btn variant="quiet" onClick={() => { setRawCsv(''); setError(null) }}>{t('action.clear', 'Clear')}</Btn>
                </div>
              </Section>
            </Page>
          )}

          {tab === 'upload' && (
            <Page>
              <Section title={t('common.upload', 'Upload')}>
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFile(file) }}
                  className="flex min-h-[200px] items-center justify-center p-8 border-2 border-dashed border-d-border rounded-d bg-d-raised/50 transition-colors hover:border-d-accent/50 hover:bg-d-accent/5 cursor-pointer"
                >
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto text-d-muted mb-3" aria-hidden />
                    <p className="text-d-muted">{t('office.drop_csv', 'Drop a CSV file or click to upload')}</p>
                    <input type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} className="sr-only" id="csv-upload" />
                    <label htmlFor="csv-upload" className="mt-3 inline-flex cursor-pointer rounded-d bg-d-accent px-5 py-2 text-sm font-semibold text-d-accent-ink hover:brightness-110 transition-colors">{t('common.choose_file', 'Choose file')}</label>
                  </div>
                </div>
              </Section>
            </Page>
          )}

          {tab === 'table' && (
            <Page>
              <Section title={t('common.preview', 'Table')}>
                {hasData ? (
                  <Region domain="workbench">
                    <div className="overflow-auto border border-d-border rounded-d max-h-[500px]">
                      <table className="w-full border-collapse text-sm font-mono">
                        <tbody>
                          {data.map((row, ri) => (
                            <tr key={ri} className={cn('border-b border-d-border/50', ri === 0 ? 'bg-d-border/30 font-medium' : '')}>
                              {row.map((cell, ci) => (
                                <td key={ci} className="border-r border-d-border/30 last:border-r-0 p-0">
                                  <input
                                    value={cell}
                                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                                    className="w-full min-w-[80px] px-2 py-1.5 text-xs bg-transparent outline-none focus-visible:bg-d-raised focus-visible:outline-2 focus-visible:outline-d-accent"
                                  />
                                </td>
                              ))}
                              <td className="p-1">
                                <Btn variant="quiet" size="sm" onClick={() => removeRow(ri)} aria-label={t('action.delete', 'Delete row')}>
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                </Btn>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-d-border">
                      <span className="text-xs text-d-muted">{data.length} rows × {data[0]?.length ?? 0} columns</span>
                      <Btn variant="quiet" size="sm" onClick={addCol}><Plus className="h-3.5 w-3.5" aria-hidden /> Col</Btn>
                      <Btn variant="quiet" size="sm" onClick={addRow}><Plus className="h-3.5 w-3.5" aria-hidden /> Row</Btn>
                    </div>
                  </Region>
                ) : (
                  <Notice tone="info">{t('office.paste_or_upload', 'Paste or upload a CSV to start editing')}</Notice>
                )}
              </Section>
            </Page>
          )}
        </Sheet>
      </Column>
    </Scroll>
  )
}