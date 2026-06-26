'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

type EncodeType = 'url' | 'html'

const HTML_ENTITIES: [string, string][] = [
  ['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;'],
]

function encodeHtml(str: string): string {
  return HTML_ENTITIES.reduce((s, [char, entity]) => s.replaceAll(char, entity), str)
}

function decodeHtml(str: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

export default function UrlHtmlEncode({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<EncodeType>((initialState?.type as EncodeType) ?? 'url')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const encode = () => {
    if (!input) return
    try {
      const result = type === 'url' ? encodeURIComponent(input) : encodeHtml(input)
      setOutput(result)
      setError('')
      onOutput({ input, type, mode: 'encode' }, { output: result })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Encoding failed')
    }
  }

  const decode = () => {
    if (!input) return
    try {
      const result = type === 'url' ? decodeURIComponent(input) : decodeHtml(input)
      setOutput(result)
      setError('')
      onOutput({ input, type, mode: 'decode' }, { output: result })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decoding failed : invalid input')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={type} onValueChange={(v) => setType(v as EncodeType)}>
          <TabsList>
            <TabsTrigger value="url">URL encode</TabsTrigger>
            <TabsTrigger value="html">HTML entities</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => { analytics.buttonClick('url-html-encode', 'encode'); encode() }}>{t('common.encode', 'Encode →')}</Button>
        <Button size="sm" variant="outline" onClick={() => { analytics.buttonClick('url-html-encode', 'decode'); decode() }}>{t('common.decode', '← Decode')}</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={<CodeEditor value={input} onChange={setInput} language={t('action.input', 'Input')} rows={12} placeholder={type === 'url' ? 'https://example.com/search?q=hello world' : '<p>Hello & "world"</p>'} />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('action.output', 'Output')}</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={12} />
          </div>
        }
      />
    </div>
  )
}
