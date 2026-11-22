'use client'

// Domain: workbench (live chip operations on a string → grid of results; copy per result).
import { useState, useMemo } from 'react'
import {
  camelCase, snakeCase, kebabCase, pascalCase,
  constantCase, dotCase, pathCase, sentenceCase, capitalCase,
} from 'change-case'
import { Copy, Check } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, CodeArea } from '@/components/domain'
import { Chip, CopyBtn, Scroll, Column } from '@/components/domain'

interface CaseResult {
  label: string
  key: string
  value: string
}

const CASES: { key: CaseResult['key']; label: string }[] = [
  { key: 'camel', label: 'camelCase' },
  { key: 'pascal', label: 'PascalCase' },
  { key: 'snake', label: 'snake_case' },
  { key: 'constant', label: 'CONSTANT_CASE' },
  { key: 'kebab', label: 'kebab-case' },
  { key: 'dot', label: 'dot.case' },
  { key: 'path', label: 'path/case' },
  { key: 'sentence', label: 'Sentence case' },
  { key: 'title', label: 'Title Case' },
  { key: 'upper', label: 'UPPER CASE' },
  { key: 'lower', label: 'lower case' },
]

function convertAll(input: string): CaseResult[] {
  return [
    { label: 'camelCase', key: 'camel', value: camelCase(input) },
    { label: 'PascalCase', key: 'pascal', value: pascalCase(input) },
    { label: 'snake_case', key: 'snake', value: snakeCase(input) },
    { label: 'CONSTANT_CASE', key: 'constant', value: constantCase(input) },
    { label: 'kebab-case', key: 'kebab', value: kebabCase(input) },
    { label: 'dot.case', key: 'dot', value: dotCase(input) },
    { label: 'path/case', key: 'path', value: pathCase(input) },
    { label: 'Sentence case', key: 'sentence', value: sentenceCase(input) },
    { label: 'Title Case', key: 'title', value: capitalCase(input) },
    { label: 'UPPER CASE', key: 'upper', value: input.toUpperCase() },
    { label: 'lower case', key: 'lower', value: input.toLowerCase() },
  ]
}

export default function CaseConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [activeKeys, setActiveKeys] = useState<string[]>(CASES.map(c => c.key))
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const results = useMemo(() => input ? convertAll(input).filter(r => activeKeys.includes(r.key)) : [], [input, activeKeys])

  const handleChange = (value: string) => {
    setInput(value)
    if (value) onOutput({ input: value }, { cases: Object.fromEntries(convertAll(value).map((c) => [c.key, c.value])) })
  }

  const copy = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Case styles">
            {CASES.map((c) => (
              <Chip
                key={c.key}
                on={activeKeys.includes(c.key)}
                onClick={() => setActiveKeys(prev => prev.includes(c.key) ? prev.filter(k => k !== c.key) : [...prev, c.key])}
                title={c.label}
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input && <span>Type text to see all case conversions live.</span>}
          {input && <span className="flex items-center gap-1 text-d-accent"><Check className="h-3 w-3" aria-hidden />{results.length} case{results.length !== 1 ? 's' : ''} active</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label="Input">
            <CodeArea label="Input text" value={input} onChange={handleChange} placeholder="Type or paste text to convert…" />
          </Pane>
        }
        right={
          <Pane label={t('action.output', 'Output')}>
            <Scroll>
              <Column width="lg">
                {results.length === 0 && !input && (
                  <div className="p-6 text-center text-d-muted">
                    <p className="font-display text-lg">Start typing to see case conversions</p>
                  </div>
                )}
                {results.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((r) => (
                      <div key={r.key} className="flex items-center justify-between rounded-d border border-d-border bg-d-raised p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-d-muted">{r.label}</p>
                          <p className="font-mono text-sm truncate">{r.value}</p>
                        </div>
                        <CopyBtn value={r.value} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </Column>
            </Scroll>
          </Pane>
        }
      />
    </Workbench>
  )
}