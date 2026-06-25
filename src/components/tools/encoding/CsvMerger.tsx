'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'

interface FileEntry {
  id: string
  name: string
  rows: Record<string, string>[]
  headers: string[]
}

function uniqueId(): string {
  return Math.random().toString(36).slice(2)
}

async function parseFile(file: File): Promise<{ rows: Record<string, string>[]; headers: string[] }> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    const headers = rows.length > 0 ? Object.keys(rows[0]) : []
    return { rows, headers }
  }

  // CSV
  const text = await file.text()
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true })
  const headers = result.meta.fields ?? []
  return { rows: result.data, headers }
}

function mergeFiles(entries: FileEntry[]): Record<string, string>[] {
  // Union of all headers, preserving first-seen order
  const allHeaders: string[] = []
  for (const entry of entries) {
    for (const h of entry.headers) {
      if (!allHeaders.includes(h)) allHeaders.push(h)
    }
  }

  const merged: Record<string, string>[] = []
  for (const entry of entries) {
    for (const row of entry.rows) {
      const normalized: Record<string, string> = {}
      for (const h of allHeaders) {
        normalized[h] = h in row ? String(row[h]) : ''
      }
      merged.push(normalized)
    }
  }
  return merged
}

function headersMatch(entries: FileEntry[]): boolean {
  if (entries.length < 2) return true
  const first = entries[0].headers.join('|')
  return entries.every((e) => e.headers.join('|') === first)
}

function downloadCsv(rows: Record<string, string>[], filename: string) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CsvMerger({ onOutput }: ToolProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    setError('')
    setLoading(true)
    try {
      const { rows, headers } = await parseFile(file)
      if (headers.length === 0) {
        setError(`"${file.name}" has no headers or could not be parsed.`)
        return
      }
      setEntries((prev) => [
        ...prev,
        { id: uniqueId(), name: file.name, rows, headers },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to parse "${file.name}"`)
    } finally {
      setLoading(false)
    }
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const handleMerge = () => {
    if (entries.length < 2) return
    const merged = mergeFiles(entries)
    const filename = `merged_${Date.now()}.csv`
    downloadCsv(merged, filename)
    onOutput(
      { files: entries.map((e) => e.name) },
      { totalRows: merged.length, filename }
    )
  }

  const totalRows = entries.reduce((sum, e) => sum + e.rows.length, 0)
  const mismatch = !headersMatch(entries)

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone for multiple files — we handle multiple via sequential adds */}
      <FileDropzone
        accept=".csv,.xlsx,.xls"
        onFile={handleFile}
        label={
          loading
            ? 'Parsing file…'
            : 'Drop CSV or Excel files here, or click to upload (add one at a time)'
        }
      />

      {error && <ErrorAlert message={error} />}

      {mismatch && entries.length > 1 && (
        <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          Warning: files have different headers. Missing columns will be filled with empty strings.
        </div>
      )}

      {entries.length > 0 && (
        <>
          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{entries.length}</span> file{entries.length !== 1 ? 's' : ''}
            </span>
            <span>
              <span className="font-medium text-foreground">{totalRows}</span> total row{totalRows !== 1 ? 's' : ''}
            </span>
          </div>

          {/* File cards */}
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between rounded-md border border-border bg-muted/20 px-4 py-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground truncate">{entry.name}</span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {entry.rows.length} rows
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    Headers: {entry.headers.join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="ml-3 shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={`Remove ${entry.name}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <Button
            onClick={handleMerge}
            disabled={entries.length < 2}
            className="self-start"
          >
            Merge &amp; Download CSV
          </Button>

          {entries.length < 2 && (
            <p className="text-xs text-muted-foreground">Add at least 2 files to merge.</p>
          )}
        </>
      )}
    </div>
  )
}
