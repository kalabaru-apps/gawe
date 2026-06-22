'use client'

import { useState } from 'react'
import slugifyFn from 'slugify'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'

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
    case 'slugify':
      return slugifyFn(input, { lower: true, strict: true })
    case 'json-escape':
      return JSON.stringify(input).slice(1, -1)
    case 'json-unescape':
      try { return JSON.parse(`"${input}"`) } catch { return input }
    case 'regex-escape':
      return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    case 'html-escape': {
      const entities: [string, string][] = [['&','&amp;'],['<','&lt;'],['>','&gt;'],['"','&quot;'],["'",'&#39;']]
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
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')

  const apply = (op: Operation) => {
    if (!input) return
    const result = applyOperation(input, op)
    setOutput(result)
    onOutput({ input, operation: op }, { output: result })
  }

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
        left={<CodeEditor value={input} onChange={setInput} language="Input" rows={14} placeholder="Enter string to transform…" />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={14} />
          </div>
        }
      />
    </div>
  )
}
