'use client'

import { useState, useEffect, useRef } from 'react'
import { evaluate } from 'mathjs'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'
import { CopyBtn, Notice, Column, Scroll } from '@/components/domain/kit'
import { History, RotateCcw, Copy, Trash2, Keyboard } from 'lucide-react'

interface HistoryItem { expr: string; result: string }

const BUTTONS = [
  ['(', ')', 'CE', '⌫'],
  ['π', 'e', '^', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '±', '='],
]

const FUNCTIONS = ['sqrt', 'sin', 'cos', 'tan', 'log', 'ln', 'abs', 'floor', 'ceil', 'round']

export default function Calculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const displayRef = useRef<HTMLDivElement>(null)

  function compute(expression: string) {
    if (!expression.trim()) return
    analytics.buttonClick('calculator', 'calculate')
    try {
      const res = String(evaluate(expression))
      setResult(res)
      setError(null)
      setHistory((h) => [{ expr: expression, result: res }, ...h].slice(0, 50))
      onOutput({ expression }, { result: res })
    } catch (e) {
      setError((e as Error).message.replace('Error: ', ''))
      setResult('')
    }
  }

  function handleButton(btn: string) {
    if (btn === '=') { compute(expr); return }
    if (btn === 'CE') { setExpr(''); setResult(''); setError(null); return }
    if (btn === '⌫') { setExpr((e) => e.slice(0, -1)); return }
    if (btn === '±') { setExpr((e) => e ? (e.startsWith('-') ? e.slice(1) : '-' + e) : ''); return }
    if (btn === 'π') { setExpr((e) => e + 'PI'); return }
    if (btn === 'e') { setExpr((e) => e + 'E'); return }
    setExpr((e) => e + btn)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); compute(expr); return }
    if (e.key === 'Escape') { setExpr(''); setResult(''); setError(null); return }
    if (e.key === 'Backspace') { e.preventDefault(); setExpr((v) => v.slice(0, -1)); return }
    if (e.key >= '0' && e.key <= '9') { setExpr((v) => v + e.key); return }
    if (['+', '-', '*', '/', '(', ')', '.', '^', '%'].includes(e.key)) { setExpr((v) => v + e.key); return }
  }

  return (
    <div className="flex h-full w-full">
      <div className="w-full max-w-sm">
        <Instrument>
          <h1 className="font-display text-sm font-semibold text-center text-d-muted mb-6">{t('office.calculator', 'Calculator')}</h1>

          <div className="space-y-3 mb-4">
            <Readout label={t('office.expression', 'Expression')}>{expr || '0'}</Readout>
            {result && (
              <Readout label={t('action.result', 'Result')}>{`= ${result}`}</Readout>
            )}
            {error && <Notice tone="error" className="text-center">{error}</Notice>}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {BUTTONS.map((row, i) => (
              <div key={i} className="contents">
                {row.map((btn) => (
                  <Key
                    key={btn}
                    accent={btn === '='}
                    onClick={() => handleButton(btn)}
                    className="min-h-12 text-base"
                  >
                    {btn}
                  </Key>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Key onClick={() => setShowHistory(!showHistory)} className="min-h-8 px-3 text-xs">
              <History className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{showHistory ? t('action.hide', 'Hide') : t('common.history', 'History')}</span>
            </Key>
            <Key onClick={() => { setHistory([]); setShowHistory(false) }} disabled={history.length === 0} className="min-h-8 px-3 text-xs">
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Key>
          </div>

          {showHistory && history.length > 0 && (
            <div className="mt-3 max-h-60 overflow-auto space-y-1 border-t border-d-border pt-3">
              {history.map((h, i) => (
                <div key={i} onClick={() => { setExpr(h.expr); setResult(h.result); setError(null); setShowHistory(false) }}
                  className="flex items-center justify-between rounded-d border border-d-border p-2 cursor-pointer hover:bg-d-border/40 transition-colors">
                  <div className="text-left min-w-0">
                    <p className="font-mono text-xs text-d-muted truncate">{h.expr}</p>
                    <p className="font-mono text-sm font-medium">= {h.result}</p>
                  </div>
                  <CopyBtn value={h.result} size="sm" label="" />
                </div>
              ))}
            </div>
          )}

          {showHistory && history.length === 0 && (
            <Notice tone="info" className="mt-3 text-center">{t('common.history_empty', 'Calculations will appear here')}</Notice>
          )}
        </Instrument>
      </div>

      <div className="hidden lg:block w-64 border-l border-d-border p-4">
        <h2 className="font-display text-sm font-semibold text-d-muted mb-3">{t('office.functions', 'Functions')}</h2>
        <div className="space-y-1">
          {FUNCTIONS.map((fn) => (
            <button
              key={fn}
              onClick={() => setExpr((e) => e + fn + '(')}
              className="w-full text-left text-sm text-d-ink hover:text-d-accent px-3 py-1.5 rounded-d hover:bg-d-border/40 transition-colors font-mono"
            >
              {fn}(x)
            </button>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-d-border">
          <p className="text-xs text-d-muted mb-2">{t('office.constants', 'Constants')}</p>
          <div className="grid grid-cols-2 gap-1">
            {['PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT1_2', 'SQRT2'].map((c) => (
              <button
                key={c}
                onClick={() => setExpr((e) => e + c)}
                className="text-sm text-d-ink hover:text-d-accent px-3 py-1.5 rounded-d hover:bg-d-border/40 transition-colors font-mono"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}