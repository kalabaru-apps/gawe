'use client'

import { useState } from 'react'
import * as yaml from 'js-yaml'
import * as toml from 'smol-toml'
import Papa from 'papaparse'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'

type Format = 'json' | 'yaml' | 'toml' | 'csv' | 'xml'
const FORMATS: Format[] = ['json', 'yaml', 'toml', 'csv', 'xml']

function parseInput(input: string, format: Format): unknown {
  switch (format) {
    case 'json': return JSON.parse(input)
    case 'yaml': return yaml.load(input)
    case 'toml': return toml.parse(input)
    case 'csv': {
      const result = Papa.parse(input, { header: true, skipEmptyLines: true })
      return result.data
    }
    case 'xml': {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      return parser.parse(input)
    }
  }
}

function serializeOutput(data: unknown, format: Format): string {
  switch (format) {
    case 'json': return JSON.stringify(data, null, 2)
    case 'yaml': return yaml.dump(data)
    case 'toml': {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('TOML requires an object at the root level')
      }
      return toml.stringify(data as Record<string, unknown>)
    }
    case 'csv': {
      const rows = Array.isArray(data) ? data : [data]
      return Papa.unparse(rows as object[])
    }
    case 'xml': {
      const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true })
      return builder.build(data)
    }
  }
}

export default function DataConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [from, setFrom] = useState<Format>((initialState?.from as Format) ?? 'json')
  const [to, setTo] = useState<Format>((initialState?.to as Format) ?? 'yaml')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const convert = () => {
    if (!input.trim()) return
    try {
      const parsed = parseInput(input, from)
      const result = serializeOutput(parsed, to)
      setOutput(result)
      setError('')
      onOutput({ input, fromFormat: from, toFormat: to }, { output: result })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Conversion failed'
      setError(msg)
      setOutput('')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('common.convert', 'From')}</span>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFrom(f)}
                className={`rounded px-2 py-1 text-xs font-mono uppercase transition-colors ${
                  from === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('common.output_format', 'To')}</span>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setTo(f)}
                className={`rounded px-2 py-1 text-xs font-mono uppercase transition-colors ${
                  to === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={convert}>{t('common.convert', 'Convert')}</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={<CodeEditor value={input} onChange={setInput} language={from} rows={16} placeholder={`Paste ${from.toUpperCase()} here…`} />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{to} {t('action.output', 'output')}</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={16} placeholder={t('common.no_output', 'Output appears here…')} />
          </div>
        }
      />
    </div>
  )
}
