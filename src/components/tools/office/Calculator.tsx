'use client'

import { useState } from 'react'
import { evaluate } from 'mathjs'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'

interface HistoryItem { expr: string; result: string }

const BUTTONS = [
  ['(', ')', 'CE', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '^', '='],
]

export default function Calculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  function compute(expression: string) {
    if (!expression.trim()) return
    try {
      const res = String(evaluate(expression))
      setResult(res)
      setError(null)
      setHistory((h) => [{ expr: expression, result: res }, ...h].slice(0, 20))
      onOutput({ expression }, { result: res })
    } catch (e) {
      setError((e as Error).message.replace('Error: ', ''))
      setResult('')
    }
  }

  function handleButton(btn: string) {
    if (btn === '=') { compute(expr); return }
    if (btn === 'CE') { setExpr(''); setResult(''); setError(null); return }
    setExpr((e) => e + btn)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="rounded-md border border-input bg-muted/30 p-4 min-h-[80px]">
          <p className="font-mono text-sm text-muted-foreground break-all">{expr || '0'}</p>
          {result && <p className="font-mono text-2xl font-bold mt-1 break-all">= {result}</p>}
        </div>
        {error && <ErrorAlert message={error} />}
        <div className="space-y-1.5">
          {BUTTONS.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-1.5">
              {row.map((btn) => (
                <button key={btn} onClick={() => handleButton(btn)}
                  className={`py-3 rounded-md text-sm font-medium border transition-colors ${
                    btn === '=' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' :
                    ['CE', '/', '*', '-', '+', '^'].includes(btn) ? 'border-input bg-muted/50 hover:bg-muted' :
                    'border-input hover:bg-muted/50'
                  }`}>
                  {btn}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.expression', 'Expression')}</label>
          <div className="flex gap-2">
            <input value={expr} onChange={(e) => setExpr(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(expr) }}
              className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('office.expression_placeholder', 'e.g. sqrt(144) + 2^8 - PI')} spellCheck={false} />
            <button onClick={() => compute(expr)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">=</button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t('office.supports', 'Supports')}: sqrt, sin, cos, log, PI, E, %, ^</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">{t('common.history', 'History')}</p>
        {history.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-auto">
            {history.map((h, i) => (
              <div key={i} onClick={() => { setExpr(h.expr); setResult(h.result) }}
                className="flex items-center justify-between rounded-md border border-input px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{h.expr}</p>
                  <p className="font-mono text-sm font-medium">= {h.result}</p>
                </div>
                <CopyButton value={h.result} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('common.history_empty', 'Calculations will appear here')}</p>
        )}
      </div>
    </div>
  )
}
