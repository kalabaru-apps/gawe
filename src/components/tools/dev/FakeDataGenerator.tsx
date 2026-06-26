'use client'

import { useState } from 'react'
import { faker } from '@faker-js/faker'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { useTranslation } from '@/lib/i18n'

const FIELD_DEFS = [
  { key: 'name', label: 'Full Name', fn: () => faker.person.fullName() },
  { key: 'email', label: 'Email', fn: () => faker.internet.email() },
  { key: 'phone', label: 'Phone', fn: () => faker.phone.number() },
  { key: 'company', label: 'Company', fn: () => faker.company.name() },
  { key: 'address', label: 'Address', fn: () => faker.location.streetAddress() },
  { key: 'city', label: 'City', fn: () => faker.location.city() },
  { key: 'country', label: 'Country', fn: () => faker.location.country() },
  { key: 'username', label: 'Username', fn: () => faker.internet.username() },
  { key: 'uuid', label: 'UUID', fn: () => faker.string.uuid() },
  { key: 'date', label: 'Date', fn: () => faker.date.recent({ days: 365 }).toISOString().slice(0, 10) },
  { key: 'number', label: 'Number', fn: () => faker.number.int({ min: 1, max: 10000 }) },
]

type Format = 'json' | 'csv'

export default function FakeDataGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [selectedFields, setSelectedFields] = useState<string[]>(
    (initialState?.selectedFields as string[]) ?? ['name', 'email', 'company']
  )
  const [count, setCount] = useState<number>((initialState?.count as number) ?? 10)
  const [format, setFormat] = useState<Format>((initialState?.format as Format) ?? 'json')
  const [output, setOutput] = useState('')

  function toggleField(key: string) {
    setSelectedFields((prev) => prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key])
  }

  function generate() {
    if (selectedFields.length === 0) return
    const rows = Array.from({ length: count }, () => {
      const row: Record<string, string | number> = {}
      for (const key of selectedFields) {
        const def = FIELD_DEFS.find((f) => f.key === key)
        if (def) row[key] = def.fn()
      }
      return row
    })
    let result: string
    if (format === 'json') {
      result = JSON.stringify(rows, null, 2)
    } else {
      const header = selectedFields.join(',')
      const csvRows = rows.map((r) =>
        selectedFields.map((k) => `"${String(r[k]).replace(/"/g, '""')}"`).join(',')
      )
      result = [header, ...csvRows].join('\n')
    }
    setOutput(result)
    onOutput({ fields: selectedFields, count, format }, { rowCount: count, output: result })
  }

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">{t('dev.fake_schema', 'Fields')}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_DEFS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(f.key)}
                    onChange={() => toggleField(f.key)}
                    className="rounded"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.fake_count', 'Row Count')}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value))))}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            {(['json', 'csv'] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 py-2 rounded-md text-sm border uppercase transition-colors ${
                  format === f ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={generate}
            disabled={selectedFields.length === 0}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {t('action.generate', 'Generate')} {count} rows
          </button>
        </div>
      }
      right={
        <div className="space-y-2">
          <div className="flex justify-end">
            <CopyButton value={output} />
          </div>
          <CodeEditor
            value={output || `// ${t('action.generate', 'Click "Generate" to produce')} ${count} rows of fake data`}
            onChange={() => {}}
            language={format}
            readOnly
          />
        </div>
      }
    />
  )
}
