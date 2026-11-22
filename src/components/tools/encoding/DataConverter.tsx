'use client'

// Domain: workbench (live two-pane converter with format switches and status bar).
import { useState, useMemo } from 'react'
import { ArrowLeftRight, Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'
import * as yaml from 'js-yaml'
import * as toml from 'smol-toml'
import Papa from 'papaparse'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'

type Format = 'json' | 'yaml' | 'toml' | 'csv' | 'xml'
const FORMATS: { value: Format; label: string }[] = [
  { value: 'json', label: 'JSON' }, { value: 'yaml', label: 'YAML' }, { value: 'toml', label: 'TOML' },
  { value: 'csv', label: 'CSV' }, { value: 'xml', label: 'XML' },
]
const PLACEHOLDER: Record<Format, string> = {
  json: '{"name": "Ada", "tags": ["a", "b"]}',
  yaml: 'name: Ada\ntags:\n  - a\n  - b',
  toml: 'name = "Ada"\ntags = ["a", "b"]',
  csv: 'name,age\nAda,36',
  xml: '<root><name>Ada</name></root>',
}

function parseInput(input: string, format: Format): unknown {
  switch (format) {
    case 'json': return JSON.parse(input)
    case 'yaml': return yaml.load(input)
    case 'toml': return toml.parse(input)
    case 'csv': return Papa.parse(input, { header: true, skipEmptyLines: true }).data
    case 'xml': return new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' }).parse(input)
  }
}

function serializeOutput(data: unknown, format: Format): string {
  switch (format) {
    case 'json': return JSON.stringify(data, null, 2)
    case 'yaml': return yaml.dump(data)
    case 'toml':
      if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('TOML needs an object at the root. Wrap arrays in a key first.')
      return toml.stringify(data as Record<string, unknown>)
    case 'csv': return Papa.unparse((Array.isArray(data) ? data : [data]) as object[])
    case 'xml': return new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true }).build(data as Record<string, unknown>)
  }
}

export default function DataConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [from, setFrom] = useState<Format>((initialState?.from as Format) ?? 'json')
  const [to, setTo] = useState<Format>((initialState?.to as Format) ?? 'yaml')
  const [copied, setCopied] = useState(false)

  const res = useMemo(() => {
    if (!input.trim()) return { out: '', error: '' }
    let value: unknown
    try { value = parseInput(input, from) } catch (e) {
      return { out: '', error: `Cannot read as ${from.toUpperCase()}: ${e instanceof Error ? e.message.split('\n')[0] : 'parse failed'}` }
    }
    try { return { out: serializeOutput(value, to), error: '' } } catch (e) {
      return { out: '', error: e instanceof Error ? e.message : 'Cannot write ' + to.toUpperCase() }
    }
  }, [input, from, to])

  const swap = () => {
    if (res.out) setInput(res.out)
    setFrom(to)
    setTo(from)
  }

  const copy = async () => {
    if (!res.out) return
    await navigator.clipboard.writeText(res.out)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onOutput({ input, from, to }, { output: res.out })
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<Format> label={t('encoding.from', 'From')} value={from} onChange={setFrom} options={FORMATS} />
          <WbButton onClick={swap} aria-label="Swap formats and move output to input">
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />Swap
          </WbButton>
          <Segmented<Format> label={t('encoding.to', 'To')} value={to} onChange={setTo} options={FORMATS} />
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input.trim() && <span>Paste {from.toUpperCase()} to convert to {to.toUpperCase()}.</span>}
          {res.out && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />Valid {from.toUpperCase()}</span>}
          {res.error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{res.error}</span></span>}
          {res.out && <span className="ml-auto">{to.toUpperCase()} · {res.out.length.toLocaleString()} chars</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={`${t('encoding.input', 'Input')} (${from.toUpperCase()})`}>
            <CodeArea label="Input" value={input} onChange={setInput} placeholder={PLACEHOLDER[from]} />
          </Pane>
        }
        right={
          <Pane
            label={`${t('action.output', 'Output')} (${to.toUpperCase()})`}
            actions={
              <WbButton onClick={copy} disabled={!res.out} className="h-6">
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </WbButton>
            }
          >
            <CodeArea label="Output" value={res.out} readOnly placeholder="Converted result appears here" />
          </Pane>
        }
      />
    </Workbench>
  )
}
