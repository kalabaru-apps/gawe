'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/lib/i18n'

type IndentSize = 2 | 4

export default function JsonFormatter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState<IndentSize>(2)

  const format = () => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      const formatted = JSON.stringify(parsed, null, indent)
      setOutput(formatted)
      setError('')
      onOutput({ input, indent }, { formatted, isValid: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON'
      setError(msg)
      setOutput('')
      onOutput({ input, indent }, { isValid: false, error: msg })
    }
  }

  const minify = () => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      const minified = JSON.stringify(parsed)
      setOutput(minified)
      setError('')
      onOutput({ input }, { formatted: minified, isValid: true, minified: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON'
      setError(msg)
    }
  }

  useEffect(() => {
    if (input) format()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Tabs value={String(indent)} onValueChange={(v) => setIndent(Number(v) as IndentSize)}>
          <TabsList>
            <TabsTrigger value="2">{t('encoding.indent_2', '2 spaces')}</TabsTrigger>
            <TabsTrigger value="4">{t('encoding.indent_4', '4 spaces')}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={format}>{t('common.format', 'Format')}</Button>
        <Button size="sm" variant="outline" onClick={minify}>{t('common.minify', 'Minify')}</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={
          <CodeEditor
            value={input}
            onChange={setInput}
            language={t('encoding.json_input', 'JSON input')}
            placeholder='{"key": "value"}'
            rows={16}
          />
        }
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('action.output', 'Output')}</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor
              value={output}
              onChange={() => {}}
              readOnly
              rows={16}
              placeholder={t('encoding.formatted', 'Formatted JSON appears here…')}
            />
          </div>
        }
      />
    </div>
  )
}
