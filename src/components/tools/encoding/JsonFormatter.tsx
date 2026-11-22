'use client'

import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ToolProps } from '@/types'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain/Workbench'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

type Indent = '2' | '4' | 'tab'

function parse(input: string): { ok: true; value: unknown } | { ok: false; error: string } | null {
  if (!input.trim()) return null
  try { return { ok: true, value: JSON.parse(input) } } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
  }
}

export default function JsonFormatter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState<Indent>('2')
  const [copied, setCopied] = useState(false)

  const result = useMemo(() => parse(input), [input])
  const error = result && !result.ok ? result.error : ''
  const space = indent === 'tab' ? '\t' : Number(indent)

  // Live format: output follows input.
  useEffect(() => {
    if (result?.ok) setOutput(JSON.stringify(result.value, null, space))
    else if (!result) setOutput('')
  }, [result, space])

  const commit = (formatted: string) => {
    setOutput(formatted)
    analytics.buttonClick('json-formatter', 'format')
    onOutput({ input, indent }, { formatted, isValid: true })
  }
  const minify = () => result?.ok && commit(JSON.stringify(result.value))
  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const bytes = new Blob([output]).size
  const lines = output ? output.split('\n').length : 0

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<Indent>
            label={t('encoding.indent', 'Indent')}
            value={indent}
            onChange={setIndent}
            options={[{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tab' }]}
          />
          <WbButton primary disabled={!result?.ok} onClick={() => result?.ok && commit(JSON.stringify(result.value, null, space))}>
            {t('common.format', 'Format')}
          </WbButton>
          <WbButton disabled={!result?.ok} onClick={minify}>{t('common.minify', 'Minify')}</WbButton>
        </Toolbar>
      }
      status={
        <StatusBar>
          {!result && <span>Paste JSON to begin</span>}
          {result?.ok && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />Valid JSON</span>}
          {error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{error}</span></span>}
          {output && <span className="ml-auto">{lines} lines · {bytes} B</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={t('encoding.json_input', 'Input')}>
            <CodeArea label="JSON input" value={input} onChange={setInput} placeholder='{"key": "value"}' />
          </Pane>
        }
        right={
          <Pane
            label={t('action.output', 'Output')}
            actions={
              <WbButton onClick={copy} disabled={!output} className="h-6">
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </WbButton>
            }
          >
            <CodeArea label="Formatted JSON" value={output} readOnly placeholder={t('encoding.formatted', 'Formatted JSON appears here')} />
          </Pane>
        }
      />
    </Workbench>
  )
}
