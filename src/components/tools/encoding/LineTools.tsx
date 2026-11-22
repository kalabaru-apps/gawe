'use client'

// Domain: workbench (live chip operations on lines → output pane; undo via re-click).
import { useState, useMemo } from 'react'
import { Copy, Check, ArrowUpDown, Minus, Shuffle } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'
import { Chip, CopyBtn } from '@/components/domain'

type Operation = 'sort-asc' | 'sort-desc' | 'dedupe' | 'reverse' | 'trim' | 'remove-empty' | 'shuffle'

const OPERATIONS: { key: Operation; label: string; icon: React.ReactNode }[] = [
  { key: 'sort-asc', label: 'Sort A to Z', icon: <ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'sort-desc', label: 'Sort Z to A', icon: <ArrowUpDown className="h-3.5 w-3.5 rotate-180" aria-hidden /> },
  { key: 'dedupe', label: 'Deduplicate', icon: <Minus className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'reverse', label: 'Reverse', icon: <Shuffle className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'trim', label: 'Trim whitespace', icon: <Minus className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'remove-empty', label: 'Remove empty', icon: <Minus className="h-3.5 w-3.5" aria-hidden /> },
  { key: 'shuffle', label: 'Shuffle', icon: <Shuffle className="h-3.5 w-3.5" aria-hidden /> },
]

function applyOperation(lines: string[], op: Operation): string[] {
  switch (op) {
    case 'sort-asc': return [...lines].sort((a, b) => a.localeCompare(b))
    case 'sort-desc': return [...lines].sort((a, b) => b.localeCompare(a))
    case 'dedupe': return [...new Set(lines)]
    case 'reverse': return [...lines].reverse()
    case 'trim': return lines.map((l) => l.trim())
    case 'remove-empty': return lines.filter((l) => l.trim() !== '')
    case 'shuffle': {
      const arr = [...lines]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }
  }
}

export default function LineTools({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [ops, setOps] = useState<Operation[]>([])
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => {
    if (!input || !ops.length) return ''
    return ops.reduce<string[]>((acc, op) => applyOperation(acc, op), input.split('\n')).join('\n')
  }, [input, ops])

  const apply = (op: Operation) => {
    setOps((p) => (p.includes(op) ? p.filter((x) => x !== op) : [...p, op]))
    onOutput({ input, operation: op }, { output, lineCount: output.split('\n').length })
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
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Line operations">
            {OPERATIONS.map((op) => (
              <Chip
                key={op.key}
                on={ops.includes(op.key)}
                onClick={() => apply(op.key)}
                title={op.label}
              >
                {op.icon}
                <span className="ml-1">{op.label}</span>
              </Chip>
            ))}
          </div>
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input && <span>Paste lines, then click an operation.</span>}
          {ops.length > 0 && <span className="flex items-center gap-1 text-d-accent"><Check className="h-3 w-3" aria-hidden />Applied: {ops.map((k) => OPERATIONS.find((o) => o.key === k)?.label).join(', ')}</span>}
          {output && <span className="ml-auto">{output.split('\n').length} lines</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label="Input">
            <CodeArea label="Input lines" value={input} onChange={setInput} placeholder="line 1\nline 2\nline 3" />
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