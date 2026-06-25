'use client'

import { useState } from 'react'
import { format } from 'sql-formatter'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'tsql' | 'plsql'

const DIALECTS: { value: Dialect; label: string }[] = [
  { value: 'sql', label: 'SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'tsql', label: 'T-SQL' },
  { value: 'plsql', label: 'PL/SQL' },
]

function minifySql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function SqlFormatter({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [dialect, setDialect] = useState<Dialect>((initialState?.dialect as Dialect) ?? 'sql')
  const [error, setError] = useState('')

  const inputLines = input ? input.split('\n').length : 0
  const outputLines = output ? output.split('\n').length : 0

  const handleFormat = () => {
    setError('')
    if (!input.trim()) return
    try {
      const result = format(input, {
        language: dialect,
        keywordCase: 'upper',
        indentStyle: 'standard',
        tabWidth: 2,
      })
      setOutput(result)
      onOutput(
        { input, dialect, action: 'format' },
        { output: result, inputLines: inputLines, outputLines: result.split('\n').length }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to format SQL')
    }
  }

  const handleMinify = () => {
    setError('')
    if (!input.trim()) return
    try {
      const result = minifySql(input)
      setOutput(result)
      onOutput(
        { input, dialect, action: 'minify' },
        { output: result, inputLines: inputLines, outputLines: 1 }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to minify SQL')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={dialect}
          onChange={(e) => setDialect(e.target.value as Dialect)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DIALECTS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <Button size="sm" onClick={handleFormat} disabled={!input.trim()}>
          Format
        </Button>
        <Button size="sm" variant="outline" onClick={handleMinify} disabled={!input.trim()}>
          Minify
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}

      <ToolPanel
        left={
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Input SQL</span>
              <span>{inputLines} lines</span>
            </div>
            <CodeEditor
              value={input}
              onChange={setInput}
              language="sql"
              rows={18}
              placeholder="Paste your SQL here…"
            />
          </div>
        }
        right={
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{outputLines} lines</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor
              value={output}
              onChange={() => {}}
              language="sql"
              rows={18}
              readOnly
              placeholder="Formatted SQL appears here…"
            />
          </div>
        }
      />
    </div>
  )
}
