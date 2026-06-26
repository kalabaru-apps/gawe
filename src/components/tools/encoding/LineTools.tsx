'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'

type Operation = 'sort-asc' | 'sort-desc' | 'dedupe' | 'reverse' | 'trim' | 'remove-empty' | 'shuffle'

const OPERATIONS: { key: Operation; label: string }[] = [
  { key: 'sort-asc', label: 'Sort A→Z' },
  { key: 'sort-desc', label: 'Sort Z→A' },
  { key: 'dedupe', label: 'Deduplicate' },
  { key: 'reverse', label: 'Reverse' },
  { key: 'trim', label: 'Trim whitespace' },
  { key: 'remove-empty', label: 'Remove empty' },
  { key: 'shuffle', label: 'Shuffle' },
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
  const [output, setOutput] = useState('')

  const apply = (op: Operation) => {
    const lines = input.split('\n')
    const result = applyOperation(lines, op)
    const resultStr = result.join('\n')
    setOutput(resultStr)
    onOutput({ input, operation: op }, { output: resultStr, lineCount: result.length })
  }

  const inputLines = input ? input.split('\n').length : 0
  const outputLines = output ? output.split('\n').length : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {OPERATIONS.map((op) => (
          <Button key={op.key} size="sm" variant="outline" onClick={() => apply(op.key)}>
            {op.label}
          </Button>
        ))}
      </div>
      <ToolPanel
        left={
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('action.input', 'Input')}</span>
              <span>{inputLines} lines</span>
            </div>
            <CodeEditor value={input} onChange={setInput} rows={16} placeholder={'line 1\nline 2\nline 3'} />
          </div>
        }
        right={
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{outputLines} lines</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={16} placeholder={t('action.result', 'Result appears here…')} />
          </div>
        }
      />
    </div>
  )
}
