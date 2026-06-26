'use client'

import { useState } from 'react'
import {
  camelCase, snakeCase, kebabCase, pascalCase,
  constantCase, dotCase, pathCase, sentenceCase, capitalCase,
} from 'change-case'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface CaseResult {
  label: string
  key: string
  value: string
}

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

  const results = input ? convertAll(input) : []

  const handleChange = (value: string) => {
    setInput(value)
    if (value) {
      analytics.buttonClick('case-converter', 'convert')
      const cases = convertAll(value)
      onOutput({ input: value }, { cases: Object.fromEntries(cases.map((c) => [c.key, c.value])) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('common.input_placeholder', 'Type or paste text to convert…')}
        rows={3}
        className="font-mono text-sm"
      />
      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="font-mono text-sm truncate">{r.value}</p>
              </div>
              <CopyButton value={r.value} className="ml-2 h-7 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
