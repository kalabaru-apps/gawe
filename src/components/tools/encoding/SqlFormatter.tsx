'use client'

// Domain: workbench (live code formatter, two panes).
import { useState, useMemo } from 'react'
import { format } from 'sql-formatter'
import { Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'
import { Select } from '@/components/domain'

type Dialect = 'sql' | 'mysql' | 'postgresql' | 'sqlite' | 'tsql' | 'plsql'
type Action = 'format' | 'minify'
const DIALECTS: { value: Dialect; label: string }[] = [
  { value: 'sql', label: 'SQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'tsql', label: 'T-SQL' },
  { value: 'plsql', label: 'PL/SQL' },
]

function minifySql(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()
}

export default function SqlFormatter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [dialect, setDialect] = useState<Dialect>((initialState?.dialect as Dialect) ?? 'sql')
  const [action, setAction] = useState<Action>('format')
  const [copied, setCopied] = useState(false)

  const res = useMemo(() => {
    if (!input.trim()) return { out: '', error: '' }
    try {
      const out = action === 'format'
        ? format(input, { language: dialect, keywordCase: 'upper', indentStyle: 'standard', tabWidth: 2 })
        : minifySql(input)
      return { out, error: '' }
    } catch (e) {
      return { out: '', error: e instanceof Error ? e.message.split('\n')[0] : 'Failed to format SQL' }
    }
  }, [input, dialect, action])

  const copy = async () => {
    if (!res.out) return
    await navigator.clipboard.writeText(res.out)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onOutput({ input, dialect, action }, { output: res.out, inputLines: input.split('\n').length, outputLines: res.out.split('\n').length })
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Select aria-label="SQL dialect" value={dialect} onChange={(e) => setDialect(e.target.value as Dialect)} className="h-7 w-auto py-0 text-xs">
            {DIALECTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <Segmented<Action>
            label="Action"
            value={action}
            onChange={setAction}
            options={[{ value: 'format', label: t('common.format', 'Format') }, { value: 'minify', label: t('common.minify', 'Minify') }]}
          />
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input.trim() && <span>Paste SQL. It formats as you type.</span>}
          {res.out && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />{action === 'format' ? 'Formatted' : 'Minified'}</span>}
          {res.error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{res.error}</span></span>}
          {res.out && <span className="ml-auto">{res.out.split('\n').length} lines</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label="Input SQL">
            <CodeArea label="Input SQL" value={input} onChange={setInput} placeholder="select * from users where id = 1" />
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
            <CodeArea label="Formatted SQL" value={res.out} readOnly placeholder="Formatted SQL appears here" />
          </Pane>
        }
      />
    </Workbench>
  )
}
