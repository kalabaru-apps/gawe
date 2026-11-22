'use client'

// Domain: workbench (live chip operations on a string → output pane).
import { useState, useMemo } from 'react'
import slugifyFn from 'slugify'
import { Copy, Check } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'
import { Chip, CopyBtn } from '@/components/domain'

type Operation =
  | 'slugify'
  | 'json-escape'
  | 'json-unescape'
  | 'regex-escape'
  | 'html-escape'
  | 'html-unescape'
  | 'count-chars'

const OPERATIONS: { key: Operation; label: string }[] = [
  { key: 'slugify', label: 'Slugify' },
  { key: 'json-escape', label: 'JSON escape' },
  { key: 'json-unescape', label: 'JSON unescape' },
  { key: 'regex-escape', label: 'Regex escape' },
  { key: 'html-escape', label: 'HTML escape' },
  { key: 'html-unescape', label: 'HTML unescape' },
  { key: 'count-chars', label: 'Count chars' },
]

function applyOperation(input: string, op: Operation): string {
  switch (op) {
    case 'slugify': return slugifyFn(input, { lower: true, strict: true })
    case 'json-escape': return JSON.stringify(input).slice(1, -1)
    case 'json-unescape':
      try { return JSON.parse(`"${input}"`) } catch { return input }
    case 'regex-escape': return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    case 'html-escape': {
      const entities: [string, string][] = [['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;']]
      return entities.reduce((s, [c, e]) => s.replaceAll(c, e), input)
    }
    case 'html-unescape': {
      const el = document.createElement('textarea')
      el.innerHTML = input
      return el.value
    }
    case 'count-chars':
      return `Characters: ${input.length}\nWords: ${input.trim().split(/\s+/).filter(Boolean).length}\nLines: ${input.split('\n').length}`
  }
}

export default function StringTools({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [ops, setOps] = useState<Operation[]>([])
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    if (!input || !ops.length) return ''
    return ops.reduce<string>((acc, op) => applyOperation(acc, op), input)
  }, [input, ops])

  const apply = (op: Operation) => {
    if (!input) return
    setOps((p) => (p.includes(op) ? p.filter((x) => x !== op) : [...p, op]))
    onOutput({ input, operation: op }, { output })
  }

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="String operations">
            {OPERATIONS.map((op) => (
              <Chip
                key={op.key}
                on={ops.includes(op.key)}
                onClick={() => apply(op.key)}
                title={op.label}
              >
                {op.label}
              </Chip>
            ))}
          </div>
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input && <span>Type a string, then click an operation.</span>}
          {ops.length > 0 && <span className="flex items-center gap-1 text-d-accent"><Check className="h-3 w-3" aria-hidden />Applied: {ops.map((k) => OPERATIONS.find((o) => o.key === k)?.label).join(', ')}</span>}
          {output && <span className="ml-auto">{output.length} chars</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label="Input">
            <CodeArea label="Input string" value={input} onChange={setInput} placeholder="Enter string to transform…" />
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
            <CodeArea label="Output" value={output} readOnly placeholder="Click an operation above" />
          </Pane>
        }
      />
    </Workbench>
  )
}