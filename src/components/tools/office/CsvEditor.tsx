'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'

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

  function downloadCsv() {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'data.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 border border-input rounded-md p-0.5">
          {(['paste', 'upload', 'table'] as Tab[]).map((tabItem) => (
            <button key={tabItem} onClick={() => setTab(tabItem)}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${tab === tabItem ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
              {tabItem === 'paste' ? t('office.paste_text', 'Paste CSV') : tabItem === 'upload' ? t('common.upload', 'Upload') : `${t('common.preview', 'Table')} ${data.length > 0 ? `(${data.length}×${data[0]?.length ?? 0})` : ''}`}
            </button>
          ))}
        </div>
        {data.length > 0 && (
          <div className="ml-auto flex gap-2">
            <button onClick={addRow} className="px-3 py-1.5 rounded-md border border-input text-xs hover:bg-muted/50 transition-colors">+ {t('office.csv_add_row', 'Row')}</button>
            <button onClick={addCol} className="px-3 py-1.5 rounded-md border border-input text-xs hover:bg-muted/50 transition-colors">+ {t('office.csv_add_col', 'Col')}</button>
            <button onClick={downloadCsv} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">{t('action.export', 'Export')} CSV</button>
          </div>
        )}
      </div>
      {error && <ErrorAlert message={error} />}
      {tab === 'paste' && (
        <div className="space-y-2">
          <textarea value={rawCsv} onChange={(e) => setRawCsv(e.target.value)}
            className="w-full min-h-[200px] font-mono text-xs border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
            placeholder="name,email,age&#10;Alice,alice@example.com,30&#10;Bob,bob@example.com,25" spellCheck={false} />
          <button onClick={() => parseCsv(rawCsv)} disabled={!rawCsv.trim()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            {t('action.import', 'Parse')} CSV
          </button>
        </div>
      )}
      {tab === 'upload' && (
        <FileDropzone accept=".csv,text/csv" onFile={handleFile} label="Drop a CSV file or click to upload" />
      )}
      {tab === 'table' && (
        data.length > 0 ? (
          <div className="overflow-auto border border-input rounded-md max-h-[500px]">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri} className={`border-b border-border/50 ${ri === 0 ? 'bg-muted/50 font-medium' : ''}`}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-r border-border/30 last:border-r-0 p-0">
                        <input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)}
                          className="w-full px-2 py-1.5 font-mono text-xs bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-primary min-w-[80px]" />
                      </td>
                    ))}
                    <td className="p-1">
                      <button onClick={() => removeRow(ri)} className="text-xs text-muted-foreground hover:text-rose-400 px-1">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('office.paste_text', 'Paste')} or {t('common.upload', 'upload')} a CSV to start editing</p>
        )
      )}
    </div>
  )
}
