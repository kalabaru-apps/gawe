'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'

const ARTICLES = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'but', 'nor', 'yet', 'so', 'and', 'or'])

function toTitleCase(text: string): string {
  return text.replace(/\S+/g, (word, offset, str) => {
    const isFirst = offset === 0
    const isLast = offset + word.length === str.length
    const lower = word.toLowerCase()
    if (!isFirst && !isLast && ARTICLES.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}

function toSentenceCase(text: string): string {
  return text
    .replace(/(^|[.?!]\s+|[\r\n]+)([a-z])/g, (_, pre, char) => pre + char.toUpperCase())
}

function joinBrokenLines(text: string): string {
  return text.replace(/([^.?!\n])\n([^\n])/g, '$1 $2')
}

interface Operation {
  key: string
  label: string
  group: string
  fn: (text: string) => string
}

const OPERATIONS: Operation[] = [
  // Case
  { key: 'title-case', label: 'Title Case', group: 'Case', fn: toTitleCase },
  { key: 'sentence-case', label: 'Sentence case', group: 'Case', fn: toSentenceCase },
  { key: 'uppercase', label: 'UPPERCASE', group: 'Case', fn: (t) => t.toUpperCase() },
  { key: 'lowercase', label: 'lowercase', group: 'Case', fn: (t) => t.toLowerCase() },
  // Spacing
  { key: 'double-space', label: 'Remove double spaces', group: 'Spacing', fn: (t) => t.replace(/ {2,}/g, ' ') },
  { key: 'trim-lines', label: 'Trim line whitespace', group: 'Spacing', fn: (t) => t.split('\n').map((l) => l.trim()).join('\n') },
  { key: 'remove-empty', label: 'Remove empty lines', group: 'Spacing', fn: (t) => t.split('\n').filter((l) => l.trim() !== '').join('\n') },
  { key: 'join-lines', label: 'Join broken lines', group: 'Spacing', fn: joinBrokenLines },
  { key: 'normalize-lb', label: 'Normalize line breaks', group: 'Spacing', fn: (t) => t.replace(/\r\n/g, '\n').replace(/\r/g, '\n') },
  // Characters
  { key: 'remove-special', label: 'Remove special chars', group: 'Characters', fn: (t) => t.replace(/[^a-zA-Z0-9\s.,!?;:'"()\-]/g, '') },
  { key: 'smart-quotes', label: 'Replace smart quotes', group: 'Characters', fn: (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'") },
  { key: 'em-dash', label: 'Replace em-dashes', group: 'Characters', fn: (t) => t.replace(/—/g, ' - ') },
  { key: 'bullets', label: 'Replace bullet variants', group: 'Characters', fn: (t) => t.replace(/[•·▪▸►]/g, '-') },
  { key: 'non-ascii', label: 'Remove non-ASCII', group: 'Characters', fn: (t) => t.replace(/[^\x00-\x7F]/g, '') },
]

const GROUPS = Array.from(new Set(OPERATIONS.map((o) => o.group)))

export default function TextCleaner({ onOutput }: ToolProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')

  const apply = (fn: (text: string) => string, key: string) => {
    const result = fn(input)
    setOutput(result)
    onOutput({ input, operation: key }, { output: result })
  }

  const copyOutputToInput = () => {
    setInput(output)
    setOutput('')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Operations toolbar */}
      <div className="flex flex-col gap-2">
        {GROUPS.map((group) => (
          <div key={group} className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground w-20 shrink-0">{group}</span>
            {OPERATIONS.filter((o) => o.group === group).map((op) => (
              <Button
                key={op.key}
                size="sm"
                variant="outline"
                onClick={() => apply(op.fn, op.key)}
              >
                {op.label}
              </Button>
            ))}
          </div>
        ))}
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Input</span>
            <span>{input ? input.split(/\s+/).filter(Boolean).length : 0} words</span>
          </div>
          <textarea
            className="w-full min-h-[300px] rounded-lg border border-border bg-background text-foreground text-sm p-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your text here…"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Output</span>
            <div className="flex gap-2 items-center">
              {output && (
                <button
                  onClick={copyOutputToInput}
                  className="text-xs underline text-primary hover:text-primary/80"
                >
                  Copy to input
                </button>
              )}
              <CopyButton value={output} />
            </div>
          </div>
          <textarea
            className="w-full min-h-[300px] rounded-lg border border-border bg-muted/30 text-foreground text-sm p-3 font-mono resize-y focus:outline-none"
            value={output}
            readOnly
            placeholder="Result appears here…"
          />
        </div>
      </div>
    </div>
  )
}
