'use client'

// Domain: studio (drop hero until files land, then file list + preview with a merge rail).
import { useMemo, useRef, useState } from 'react'
import { X, Plus, Download } from 'lucide-react'
import Papa from 'papaparse'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { StudioWorkspace, PrimaryAction, DropHero, Btn, IconBtn, Notice, Stat, Field, TextInput, Section } from '@/components/domain'

interface FileEntry { id: string; name: string; rows: Record<string, string>[]; headers: string[] }

async function parseFile(file: File) {
  const result = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true })
  return { rows: result.data, headers: result.meta.fields ?? [] }
}

function mergeFiles(entries: FileEntry[]) {
  const headers: string[] = []
  for (const e of entries) for (const h of e.headers) if (!headers.includes(h)) headers.push(h)
  const rows = entries.flatMap((e) => e.rows.map((r) => Object.fromEntries(headers.map((h) => [h, h in r ? String(r[h]) : '']))))
  return { headers, rows }
}

export default function CsvMerger({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [error, setError] = useState('')
  const [filename, setFilename] = useState('merged.csv')
  const picker = useRef<HTMLInputElement>(null)

  const addFiles = async (files: File[]) => {
    setError('')
    const added: FileEntry[] = []
    for (const f of files) {
      if (!/\.csv$/i.test(f.name)) { setError(`"${f.name}" is not a .csv file. Export it as CSV and drop it again.`); continue }
      try {
        const { rows, headers } = await parseFile(f)
        if (!headers.length) { setError(`"${f.name}" has no header row. Add column names on the first line.`); continue }
        added.push({ id: crypto.randomUUID(), name: f.name, rows, headers })
      } catch (e) {
        setError(e instanceof Error ? e.message : `Could not parse "${f.name}".`)
      }
    }
    if (added.length) setEntries((p) => [...p, ...added])
  }

  const merged = useMemo(() => mergeFiles(entries), [entries])
  const mismatch = entries.some((e) => e.headers.join('|') !== entries[0].headers.join('|'))

  const download = () => {
    const blob = new Blob([Papa.unparse(merged.rows, { columns: merged.headers })], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.trim() || 'merged.csv'
    a.click()
    URL.revokeObjectURL(url)
    onOutput({ files: entries.map((e) => e.name) }, { totalRows: merged.rows.length, filename })
  }

  if (!entries.length) {
    return (
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1"><DropHero accept=".csv,text/csv" multiple onFiles={addFiles} title={t('encoding.csv_drop', 'Drop CSV files to merge')} hint="Two or more files. Columns are matched by name." /></div>
        {error && <div className="p-4"><Notice tone="error">{error}</Notice></div>}
      </div>
    )
  }

  return (
    <StudioWorkspace
      rail={
        <div className="flex flex-col gap-4">
          <Stat label="Merged rows" value={merged.rows.length.toLocaleString()} note={`${entries.length} files, ${merged.headers.length} columns`} />
          {mismatch && <Notice tone="info">Headers differ between files. Missing cells are left empty.</Notice>}
          {error && <Notice tone="error">{error}</Notice>}
          <Field id="csv-out" label="Output filename"><TextInput id="csv-out" value={filename} onChange={(e) => setFilename(e.target.value)} /></Field>
          <PrimaryAction onClick={download} disabled={entries.length < 2}>
            <span className="inline-flex items-center justify-center gap-2"><Download className="h-5 w-5" aria-hidden />Merge and download</span>
          </PrimaryAction>
          {entries.length < 2 && <p className="text-sm text-d-muted">Add one more file to merge.</p>}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Section
          title="Files"
          actions={
            <>
              <Btn size="sm" onClick={() => picker.current?.click()}><Plus className="h-3.5 w-3.5" aria-hidden />Add files</Btn>
              <input ref={picker} type="file" accept=".csv,text/csv" multiple className="sr-only" aria-label="Add CSV files" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
            </>
          }
        >
          <ul className="flex flex-col gap-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-d border border-d-border bg-d-raised px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">{e.name}</p>
                  <p className="truncate text-xs text-d-muted">{e.rows.length.toLocaleString()} rows: {e.headers.join(', ')}</p>
                </div>
                <IconBtn label={`Remove ${e.name}`} onClick={() => setEntries((p) => p.filter((x) => x.id !== e.id))}><X className="h-4 w-4" aria-hidden /></IconBtn>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Preview (first 5 rows)">
          <div className="max-w-full overflow-auto rounded-d border border-d-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-d-raised"><tr>{merged.headers.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {merged.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-t border-d-border">{merged.headers.map((h) => <td key={h} className="whitespace-nowrap px-3 py-1.5 font-mono">{r[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </StudioWorkspace>
  )
}
