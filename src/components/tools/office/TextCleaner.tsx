'use client'

import { useState, useMemo } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Page, Btn, Chip, CopyBtn, Notice, Column, Scroll, Field, TextArea } from '@/components/domain'
import { ArrowRightLeft, Play, X } from 'lucide-react'

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
  return text.replace(/(^|[.?!]\s+|[\r\n]+)([a-z])/g, (_, pre, char) => pre + char.toUpperCase())
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
  { key: 'title-case', label: 'Title Case', group: 'Case', fn: toTitleCase },
  { key: 'sentence-case', label: 'Sentence case', group: 'Case', fn: toSentenceCase },
  { key: 'uppercase', label: 'UPPERCASE', group: 'Case', fn: (t) => t.toUpperCase() },
  { key: 'lowercase', label: 'lowercase', group: 'Case', fn: (t) => t.toLowerCase() },
  { key: 'double-space', label: 'Remove double spaces', group: 'Spacing', fn: (t) => t.replace(/ {2,}/g, ' ') },
  { key: 'trim-lines', label: 'Trim line whitespace', group: 'Spacing', fn: (t) => t.split('\n').map((l) => l.trim()).join('\n') },
  { key: 'remove-empty', label: 'Remove empty lines', group: 'Spacing', fn: (t) => t.split('\n').filter((l) => l.trim() !== '').join('\n') },
  { key: 'join-lines', label: 'Join broken lines', group: 'Spacing', fn: joinBrokenLines },
  { key: 'normalize-lb', label: 'Normalize line breaks', group: 'Spacing', fn: (t) => t.replace(/\r\n/g, '\n').replace(/\r/g, '\n') },
  { key: 'remove-special', label: 'Remove special chars', group: 'Characters', fn: (t) => t.replace(/[^a-zA-Z0-9\s.,!?;:'"()\-]/g, '') },
  { key: 'smart-quotes', label: 'Replace smart quotes', group: 'Characters', fn: (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'") },
  { key: 'em-dash', label: 'Replace long dashes', group: 'Characters', fn: (t) => t.replace(/—/g, ' - ') },
  { key: 'bullets', label: 'Replace bullet variants', group: 'Characters', fn: (t) => t.replace(/[•·▪▸►]/g, '-') },
  { key: 'non-ascii', label: 'Remove non-ASCII', group: 'Characters', fn: (t) => t.replace(/[^\x00-\x7F]/g, '') },
]

const GROUPS = Array.from(new Set(OPERATIONS.map((o) => o.group)))

export default function TextCleaner({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [activeOps, setActiveOps] = useState<Set<string>>(new Set())

  const stats = useMemo(() => {
    const words = input.trim() ? input.trim().split(/\s+/).filter(Boolean).length : 0
    return { words, chars: input.length }
  }, [input])

  const apply = (fn: (text: string) => string, key: string) => {
    analytics.buttonClick('text-cleaner', 'clean')
    const result = fn(input)
    setOutput(result)
    onOutput({ input, operation: key }, { output: result })
  }

  const applyAll = () => {
    let result = input
    activeOps.forEach((key) => {
      const op = OPERATIONS.find((o) => o.key === key)
      if (op) result = op.fn(result)
    })
    setOutput(result)
    onOutput({ input, operations: Array.from(activeOps) }, { output: result })
  }

  const copyOutputToInput = () => {
    setInput(output)
    setOutput('')
  }

  return (
    <Scroll>
      <Column width="xl">
        <header>
          <h1 className="font-serif text-3xl font-semibold">{t('office.text_cleaner', 'Text Cleaner')}</h1>
          <p className="mt-1 text-sm text-d-muted">{t('office.text_cleaner_desc', 'Paste text, pick cleanups, get live output. Combine multiple operations.')}</p>
        </header>

        <Page className="flex flex-col gap-4">
          {GROUPS.map((group) => (
            <div key={group} role="group" aria-label={group} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-d-muted">{group}</span>
              {OPERATIONS.filter((o) => o.group === group).map((op) => (
                <Chip
                  key={op.key}
                  on={activeOps.has(op.key)}
                  onClick={() => {
                    const next = new Set(activeOps)
                    if (next.has(op.key)) next.delete(op.key); else next.add(op.key)
                    setActiveOps(next)
                    apply(op.fn, op.key)
                  }}
                >
                  {op.label}
                </Chip>
              ))}
            </div>
          ))}
          {activeOps.size > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-d-border pt-3">
              <Btn variant="primary" size="sm" onClick={applyAll}>
                <Play className="h-3.5 w-3.5" aria-hidden />
                {t('action.apply', 'Apply all')} ({activeOps.size})
              </Btn>
              <Btn variant="quiet" size="sm" onClick={() => setActiveOps(new Set())}>
                <X className="h-3.5 w-3.5" aria-hidden />
                {t('action.clear', 'Clear')}
              </Btn>
            </div>
          )}
        </Page>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Page>
            <Field id="tc-in" label={t('action.input', 'Input')} hint={`${stats.words} words, ${stats.chars} chars`}>
              <TextArea id="tc-in" mono value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste your text here" className="min-h-[20rem]" />
            </Field>
          </Page>
          <Page>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="tc-out" className="text-sm font-medium">{t('action.output', 'Output')}</label>
                <div className="flex items-center gap-2">
                  {output && (
                    <Btn variant="quiet" size="sm" onClick={copyOutputToInput}>
                      <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
                      Use as input
                    </Btn>
                  )}
                  <CopyBtn value={output} label={t('action.copy', 'Copy')} />
                </div>
              </div>
              <TextArea id="tc-out" mono readOnly value={output} placeholder="Result appears here" className="min-h-[20rem]" />
            </div>
          </Page>
        </div>

        {!input && !output && <Notice tone="info">Paste text and choose cleanups above. Results update live.</Notice>}
      </Column>
    </Scroll>
  )
}
