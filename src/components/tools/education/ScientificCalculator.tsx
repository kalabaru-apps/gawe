'use client'

/**
 * Scientific Calculator — Instrument domain (override from education category).
 * Instrument: calculator body, big Familjen Grotesk display, tactile key grid, deg/rad switch,
 * full keyboard support, history tape. Paper tokens for palette; Instrument layout.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'
import { Column, Scroll, Region, Notice, Section, Btn } from '@/components/domain/kit'
import { Calculator, RotateCcw, Minus, Plus, Divide, X, Hash } from 'lucide-react'

// ---------------------------------------------------------------------------
// Expression evaluation
// ---------------------------------------------------------------------------

function evaluateExpression(raw: string, mode: 'DEG' | 'RAD'): string {
  if (!raw.trim()) throw new Error('Empty expression')

  let expr = raw
    .replace(/π/g, String(Math.PI))
    .replace(/(?<![a-zA-Z0-9])e(?![a-zA-Z0-9])/g, String(Math.E))

  // Replace display operators
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

  // Validate characters
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

// ---------------------------------------------------------------------------
// Button layout
// ---------------------------------------------------------------------------

type BtnType = 'num' | 'op' | 'fn' | 'action' | 'equals'

interface CalcButton {
  label: string
  value: string
  type: BtnType
  wide?: boolean
  icon?: React.ReactNode
}

// 5-column grid, row by row
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
    { label: 'C', value: 'C', type: 'action', icon: <RotateCcw className="h-4 w-4" aria-hidden /> },
    { label: '⌫', value: 'BACK', type: 'action', icon: <Minus className="h-4 w-4" aria-hidden /> },
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
    { label: '=', value: '=', type: 'equals', wide: true },
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

// ---------------------------------------------------------------------------
// Keyboard mapping
// ---------------------------------------------------------------------------

const KEY_MAP: Record<string, { value: string; shiftValue?: string }> = {
  '0': { value: '0' }, '1': { value: '1' }, '2': { value: '2' }, '3': { value: '3' },
  '4': { value: '4' }, '5': { value: '5' }, '6': { value: '6' }, '7': { value: '7' },
  '8': { value: '8' }, '9': { value: '9' }, '.': { value: '.' },
  '+': { value: '+' }, '-': { value: '-' },
  '*': { value: '×' }, '/': { value: '÷' },
  'Enter': { value: '=' }, '=': { value: '=' },
  'Backspace': { value: 'BACK' }, 'Escape': { value: 'C' },
  '(': { value: '(', shiftValue: '(' }, ')': { value: ')', shiftValue: ')' },
  '%': { value: '%' }, '^': { value: '^' },
}

function handleKeyboard(e: KeyboardEvent, handleButton: (value: string) => void, expression: string) {
  // Don't intercept typing in inputs (none here) but allow normal keys
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  const key = e.key
  if (key in KEY_MAP) {
    e.preventDefault()
    const mapped = KEY_MAP[key]
    handleButton(e.shiftKey && mapped.shiftValue ? mapped.shiftValue : mapped.value)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HistoryEntry {
  expression: string
  result: string
}

export default function ScientificCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [expression, setExpression] = useState<string>((initialState?.expression as string) ?? '')
  const [displayResult, setDisplayResult] = useState<string>('')
  const [mode, setMode] = useState<'DEG' | 'RAD'>((initialState?.mode as 'DEG' | 'RAD') ?? 'DEG')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [justEvaluated, setJustEvaluated] = useState(false)
  const textareaRef = useRef<HTMLDivElement>(null)

  // Keyboard support
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      handleKeyboard(e, handleButtonClick, expression)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expression])

  const handleButtonClick = useCallback((value: string) => {
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
        setHistory((prev) => [{ expression: expr, result }, ...prev].slice(0, 10))
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

  const switchMode = useCallback((m: 'DEG' | 'RAD') => {
    setMode(m)
  }, [])

  const clearAll = useCallback(() => {
    setExpression('')
    setDisplayResult('')
    setHistory([])
    setError(null)
    setJustEvaluated(false)
  }, [])

  return (
    <Scroll>
      <Column width="sm">
        <Instrument>
          {/* Mode toggle */}
          <Section title={t('sci.mode', 'Angle Mode')}>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('sci.mode', 'Angle mode')}>
              {(['DEG', 'RAD'] as const).map((m) => (
                <Btn
                  key={m}
                  variant={mode === m ? 'primary' : 'secondary'}
                  onClick={() => switchMode(m)}
                  className="h-10"
                >
                  {m}
                </Btn>
              ))}
            </div>
          </Section>

          {/* Display */}
          <div className="relative">
            <Readout label={t('sci.expression', 'Expression')}>
              <div className="text-right text-base font-mono text-d-muted min-h-[1.5rem] break-all">
                {expression || <span className="opacity-30">0</span>}
              </div>
            </Readout>
            <Readout label={t('sci.result', 'Result')}>
              <div className={`text-right break-all ${error ? 'text-destructive' : ''}`}>
                {error ?? (displayResult || (!expression ? '0' : ''))}
              </div>
            </Readout>
          </div>

          {error && (
            <Notice tone="error" className="mb-3">
              {error}
            </Notice>
          )}

          {/* Button grid */}
          <div className="space-y-2" role="group" aria-label={t('sci.keypad', 'Calculator keypad')}>
            {ROWS.map((row, ri) => (
              <div key={ri} className="grid grid-cols-5 gap-2">
                {row.map((btn) => (
                  <Key
                    key={btn.label}
                    onClick={() => handleButtonClick(btn.value)}
                    accent={btn.type === 'equals'}
                    className={btn.wide ? 'col-span-2 min-h-12' : 'min-h-12'}
                    aria-label={btn.label}
                  >
                    {btn.icon ?? btn.label}
                  </Key>
                ))}
              </div>
            ))}
          </div>

          {/* Actions */}
          <Section title="" className="pt-2">
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="secondary" onClick={clearAll} className="h-10">
                <RotateCcw className="h-4 w-4 mr-1" aria-hidden />
                {t('sci.clear_history', 'Clear History')}
              </Btn>
              <Btn variant="quiet" onClick={() => { if (displayResult) navigator.clipboard.writeText(displayResult) }} disabled={!displayResult} className="h-10">
                <Hash className="h-4 w-4 mr-1" aria-hidden />
                {t('sci.copy_result', 'Copy Result')}
              </Btn>
            </div>
          </Section>

          {/* History tape */}
          {history.length > 0 && (
            <Section title={t('sci.history', 'History')}>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <Btn
                    key={i}
                    variant="quiet"
                    className="h-auto py-2 px-3 text-left justify-start gap-2 text-xs"
                    onClick={() => {
                      setExpression(h.result)
                      setDisplayResult('')
                      setError(null)
                      setJustEvaluated(true)
                    }}
                  >
                    <span className="text-d-muted truncate flex-1">{h.expression}</span>
                    <span className="font-mono font-semibold shrink-0">= {h.result}</span>
                  </Btn>
                ))}
              </div>
            </Section>
          )}

          {!history.length && !expression && !displayResult && (
            <p className="text-center text-d-muted text-sm py-8">
              {t('sci.enter_expression', 'Enter an expression using the keypad or your keyboard.')}
            </p>
          )}
        </Instrument>
      </Column>
    </Scroll>
  )
}