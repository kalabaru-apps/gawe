'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface HistoryEntry {
  expression: string
  result: string
}

function evaluateExpression(raw: string, mode: 'DEG' | 'RAD'): string {
  if (!raw.trim()) throw new Error('Empty expression')

  let expr = raw
    .replace(/π/g, String(Math.PI))
    // e not preceded or followed by a letter (preserve "e" in scientific notation carefully)
    .replace(/(?<![a-zA-Z0-9])e(?![a-zA-Z0-9])/g, String(Math.E))

  // Replace display operators before function matching
  expr = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**')

  // Replace scientific functions (longer tokens first)
  expr = expr
    .replace(/sin⁻¹\(/g, '__asin__(')
    .replace(/cos⁻¹\(/g, '__acos__(')
    .replace(/tan⁻¹\(/g, '__atan__(')
    .replace(/sin\(/g, '__sin__(')
    .replace(/cos\(/g, '__cos__(')
    .replace(/tan\(/g, '__tan__(')
    .replace(/log\(/g, '__log10__(')
    .replace(/ln\(/g, '__ln__(')
    .replace(/√\(/g, '__sqrt__(')

  // Validate characters: digits, operators, parens, dots, whitespace, and our placeholders
  const check = expr.replace(/__[a-z0-9]+__/g, 'f')
  if (/[^0-9+\-*/.(),%\s]/.test(check)) {
    throw new Error('Invalid characters in expression')
  }

  const degFactor = mode === 'DEG' ? Math.PI / 180 : 1
  const degFactorInv = mode === 'DEG' ? 180 / Math.PI : 1

  const code = `
    "use strict";
    const __sin__   = (x) => Math.sin(x * ${degFactor});
    const __cos__   = (x) => Math.cos(x * ${degFactor});
    const __tan__   = (x) => Math.tan(x * ${degFactor});
    const __asin__  = (x) => Math.asin(x) * ${degFactorInv};
    const __acos__  = (x) => Math.acos(x) * ${degFactorInv};
    const __atan__  = (x) => Math.atan(x) * ${degFactorInv};
    const __log10__ = (x) => Math.log10(x);
    const __ln__    = (x) => Math.log(x);
    const __sqrt__  = (x) => Math.sqrt(x);
    return (${expr});
  `

  // eslint-disable-next-line no-new-func
  const result: unknown = new Function(code)()

  if (typeof result !== 'number') throw new Error('Not a number')
  if (isNaN(result)) throw new Error('Undefined')
  if (!isFinite(result)) throw new Error(result > 0 ? 'Infinity' : '-Infinity')

  if (Number.isInteger(result) && Math.abs(result) < 1e15) return String(result)
  return parseFloat(result.toPrecision(12)).toString()
}

type BtnType = 'num' | 'op' | 'fn' | 'action' | 'equals'

interface CalcButton {
  label: string
  value: string
  type: BtnType
  wide?: boolean
}

// 5-column grid layout, row by row
const ROWS: CalcButton[][] = [
  [
    { label: 'sin', value: 'sin(', type: 'fn' },
    { label: 'cos', value: 'cos(', type: 'fn' },
    { label: 'tan', value: 'tan(', type: 'fn' },
    { label: 'π', value: 'π', type: 'fn' },
    { label: 'e', value: 'e', type: 'fn' },
  ],
  [
    { label: 'sin⁻¹', value: 'sin⁻¹(', type: 'fn' },
    { label: 'cos⁻¹', value: 'cos⁻¹(', type: 'fn' },
    { label: 'tan⁻¹', value: 'tan⁻¹(', type: 'fn' },
    { label: '(', value: '(', type: 'op' },
    { label: ')', value: ')', type: 'op' },
  ],
  [
    { label: 'log', value: 'log(', type: 'fn' },
    { label: 'ln', value: 'ln(', type: 'fn' },
    { label: '√', value: '√(', type: 'fn' },
    { label: 'x²', value: '^2', type: 'fn' },
    { label: 'xʸ', value: '^', type: 'op' },
  ],
  [
    { label: 'C', value: 'C', type: 'action' },
    { label: '⌫', value: 'BACK', type: 'action' },
    { label: '%', value: '%', type: 'op' },
    { label: '÷', value: '÷', type: 'op' },
    { label: '×', value: '×', type: 'op' },
  ],
  [
    { label: '7', value: '7', type: 'num' },
    { label: '8', value: '8', type: 'num' },
    { label: '9', value: '9', type: 'num' },
    { label: '-', value: '-', type: 'op' },
    { label: '+', value: '+', type: 'op' },
  ],
  [
    { label: '4', value: '4', type: 'num' },
    { label: '5', value: '5', type: 'num' },
    { label: '6', value: '6', type: 'num' },
    { label: '=', value: '=', type: 'equals' },
  ],
  [
    { label: '1', value: '1', type: 'num' },
    { label: '2', value: '2', type: 'num' },
    { label: '3', value: '3', type: 'num' },
  ],
  [
    { label: '0', value: '0', type: 'num', wide: true },
    { label: '.', value: '.', type: 'num' },
  ],
]

function btnClass(type: BtnType, wide?: boolean) {
  const base = `rounded-md text-sm font-medium transition-all duration-75 h-11 flex items-center justify-center select-none cursor-pointer active:scale-95 ${wide ? 'col-span-2' : ''}`
  switch (type) {
    case 'equals': return `${base} bg-primary text-primary-foreground hover:bg-primary/90`
    case 'action': return `${base} border border-input bg-destructive/10 text-destructive hover:bg-destructive/20`
    case 'fn':     return `${base} border border-input bg-muted/40 hover:bg-muted text-foreground text-xs`
    case 'op':     return `${base} border border-input bg-muted hover:bg-muted/60 text-primary font-semibold`
    case 'num':    return `${base} border border-input bg-background hover:bg-muted`
  }
}

export default function ScientificCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [expression, setExpression] = useState<string>((initialState?.expression as string) ?? '')
  const [displayResult, setDisplayResult] = useState<string>('')
  const [mode, setMode] = useState<'DEG' | 'RAD'>((initialState?.mode as 'DEG' | 'RAD') ?? 'DEG')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [justEvaluated, setJustEvaluated] = useState(false)

  const handleButton = useCallback((btn: CalcButton) => {
    const { value } = btn

    if (value === 'C') {
      setExpression('')
      setDisplayResult('')
      setError(null)
      setJustEvaluated(false)
      return
    }

    if (value === 'BACK') {
      setExpression((prev) => {
        const s = prev.trimEnd()
        const multiTokens = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(']
        for (const tok of multiTokens) {
          if (s.endsWith(tok)) return s.slice(0, -tok.length)
        }
        return s.slice(0, -1)
      })
      setError(null)
      setJustEvaluated(false)
      return
    }

    if (value === '=') {
      const expr = expression.trim()
      if (!expr) return
      analytics.buttonClick('scientific-calculator', 'evaluate')
      try {
        const result = evaluateExpression(expr, mode)
        setDisplayResult(result)
        setError(null)
        setHistory((prev) => [{ expression: expr, result }, ...prev].slice(0, 5))
        onOutput({ expression: expr, mode }, { result })
        setExpression(result)
        setJustEvaluated(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error')
        setDisplayResult('')
      }
      return
    }

    if (justEvaluated) {
      const isOperator = ['+', '-', '×', '÷', '^', '%'].includes(value)
      if (!isOperator) {
        setExpression(value)
        setDisplayResult('')
        setError(null)
        setJustEvaluated(false)
        return
      }
      setJustEvaluated(false)
    }

    setExpression((prev) => prev + value)
    setError(null)
  }, [expression, mode, onOutput, justEvaluated])

  return (
    <div className="space-y-4 max-w-xs mx-auto w-full">
      {/* Display */}
      <div className="rounded-lg border border-border bg-card p-4 min-h-[5rem] flex flex-col justify-between">
        <div className="text-xs font-mono text-muted-foreground break-all min-h-[1.25rem]">
          {expression || <span className="opacity-30">0</span>}
        </div>
        <div className={`font-mono font-semibold text-right break-all mt-1 ${error ? 'text-sm text-destructive' : 'text-2xl'}`}>
          {error ?? (displayResult || (!expression ? '0' : ''))}
        </div>
      </div>

      {/* DEG / RAD toggle */}
      <div className="flex gap-2">
        {(['DEG', 'RAD'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium border transition-colors ${
              mode === m
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input bg-background hover:bg-muted'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Button grid */}
      <div className="space-y-1.5">
        {ROWS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-5 gap-1.5">
            {row.map((btn) => (
              <button
                key={btn.label}
                onClick={() => handleButton(btn)}
                className={btnClass(btn.type, btn.wide)}
                title={btn.label}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('sci.history')}</p>
          {history.map((h, i) => (
            <button
              key={i}
              className="w-full rounded-md bg-muted px-3 py-2 font-mono text-xs flex justify-between gap-2 hover:bg-muted/70 transition-colors text-left"
              onClick={() => {
                setExpression(h.result)
                setDisplayResult('')
                setError(null)
                setJustEvaluated(true)
              }}
            >
              <span className="text-muted-foreground truncate">{h.expression}</span>
              <span className="text-foreground font-semibold shrink-0">= {h.result}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
