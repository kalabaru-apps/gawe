'use client'

// Domain: workbench (live two-pane text transform).
import { useState, useMemo } from 'react'
import { Copy, Check, AlertCircle, CheckCircle2, ArrowLeftRight } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'

type Type = 'url' | 'html'
type Dir = 'encode' | 'decode'

const HTML_ENTITIES: [string, string][] = [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]

const encodeHtml = (s: string) => HTML_ENTITIES.reduce((acc, [c, e]) => acc.replaceAll(c, e), s)
function decodeHtml(s: string) {
  const el = document.createElement('textarea')
  el.innerHTML = s
  return el.value
}

export default function UrlHtmlEncode({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [type, setType] = useState<Type>((initialState?.type as Type) ?? 'url')
  const [dir, setDir] = useState<Dir>('encode')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [copied, setCopied] = useState(false)

  const res = useMemo(() => {
    if (!input) return { out: '', error: '' }
    try {
      if (dir === 'encode') return { out: type === 'url' ? encodeURIComponent(input) : encodeHtml(input), error: '' }
      return { out: type === 'url' ? decodeURIComponent(input) : decodeHtml(input), error: '' }
    } catch {
      return { out: '', error: 'Cannot decode: a % sequence is incomplete or not valid UTF-8. Fix the escape or switch to Encode.' }
    }
  }, [input, type, dir])

  const copy = async () => {
    if (!res.out) return
    await navigator.clipboard.writeText(res.out)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onOutput({ input, type, mode: dir }, { output: res.out })
  }

  const swap = () => {
    if (!res.out) return
    setInput(res.out)
    setDir(dir === 'encode' ? 'decode' : 'encode')
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<Type>
            label="Type"
            value={type}
            onChange={setType}
            options={[{ value: 'url', label: 'URL' }, { value: 'html', label: 'HTML entities' }]}
          />
          <Segmented<Dir>
            label="Direction"
            value={dir}
            onChange={setDir}
            options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]}
          />
          <WbButton onClick={swap} disabled={!res.out}>
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />Swap
          </WbButton>
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input && <span>Paste text to {dir}. Result updates as you type.</span>}
          {input && !res.error && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />{dir === 'encode' ? 'Encoded' : 'Decoded'}</span>}
          {res.error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{res.error}</span></span>}
          {res.out && <span className="ml-auto">{res.out.length.toLocaleString()} chars</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={t('encoding.input', 'Input')}>
            <CodeArea label="Input" value={input} onChange={setInput} placeholder={type === 'url' ? 'https://example.com/search?q=hello world' : '<p>Hello & "world"</p>'} />
          </Pane>
        }
        right={
          <Pane
            label={t('action.output', 'Output')}
            actions={
              <WbButton onClick={copy} disabled={!res.out} className="h-6">
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </WbButton>
            }
          >
            <CodeArea label="Output" value={res.out} readOnly placeholder="Result appears here" />
          </Pane>
        }
      />
    </Workbench>
  )
}
