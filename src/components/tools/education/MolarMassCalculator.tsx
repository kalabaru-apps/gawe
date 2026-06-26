'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'

export interface ToolProps {
  onOutput: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  initialState?: Record<string, unknown>
}

const ELEMENTS: Record<string, number> = {
  H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.811, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305,
  Al: 26.982, Si: 28.086, P: 30.974, S: 32.065, Cl: 35.453, Ar: 39.948,
  K: 39.098, Ca: 40.078, Fe: 55.845, Cu: 63.546, Zn: 65.38, Br: 79.904,
  Ag: 107.868, I: 126.904, Ba: 137.327, Au: 196.967, Hg: 200.59, Pb: 207.2,
  Mn: 54.938, Cr: 51.996, Ni: 58.693, Co: 58.933, Se: 78.971, Sr: 87.62,
  Sn: 118.710, Ti: 47.867, V: 50.942, W: 183.84, Pt: 195.084, U: 238.029,
}

interface ElementEntry {
  symbol: string
  count: number
  atomicMass: number
  contribution: number
  percentage: number
}

interface ParseResult {
  elements: Record<string, number>
  error?: string
}

function parseFormula(formula: string): ParseResult {
  const elements: Record<string, number> = {}

  function parseSegment(str: string, multiplier: number): string | null {
    let i = 0
    while (i < str.length) {
      if (str[i] === '(') {
        let depth = 1
        let j = i + 1
        while (j < str.length && depth > 0) {
          if (str[j] === '(') depth++
          else if (str[j] === ')') depth--
          j++
        }
        if (depth !== 0) return 'Unmatched parenthesis'
        const inner = str.slice(i + 1, j - 1)
        let numStr = ''
        while (j < str.length && str[j] >= '0' && str[j] <= '9') {
          numStr += str[j]
          j++
        }
        const groupMult = numStr ? parseInt(numStr, 10) : 1
        const err = parseSegment(inner, multiplier * groupMult)
        if (err) return err
        i = j
      } else if (str[i] >= 'A' && str[i] <= 'Z') {
        let sym = str[i]
        i++
        while (i < str.length && str[i] >= 'a' && str[i] <= 'z') {
          sym += str[i]
          i++
        }
        let numStr = ''
        while (i < str.length && str[i] >= '0' && str[i] <= '9') {
          numStr += str[i]
          i++
        }
        const count = numStr ? parseInt(numStr, 10) : 1
        if (!(sym in ELEMENTS)) return `Unknown element: ${sym}`
        elements[sym] = (elements[sym] || 0) + count * multiplier
      } else {
        return `Unexpected character: ${str[i]}`
      }
    }
    return null
  }

  const err = parseSegment(formula.trim(), 1)
  if (err) return { elements: {}, error: err }
  if (Object.keys(elements).length === 0) return { elements: {}, error: 'No elements found' }
  return { elements }
}

export default function MolarMassCalculator({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [formula, setFormula] = useState('')
  const [result, setResult] = useState<{
    molarMass: number
    breakdown: ElementEntry[]
  } | null>(null)
  const [error, setError] = useState('')

  function calculate() {
    setError('')
    setResult(null)

    if (!formula.trim()) {
      setError(t('molar.invalid_formula'))
      return
    }

    const parsed = parseFormula(formula)
    if (parsed.error) {
      setError(parsed.error)
      return
    }

    let total = 0
    const entries: Omit<ElementEntry, 'percentage'>[] = []

    for (const [sym, count] of Object.entries(parsed.elements)) {
      const atomicMass = ELEMENTS[sym]
      const contribution = atomicMass * count
      total += contribution
      entries.push({ symbol: sym, count, atomicMass, contribution })
    }

    const breakdown: ElementEntry[] = entries.map((e) => ({
      ...e,
      percentage: (e.contribution / total) * 100,
    }))

    setResult({ molarMass: total, breakdown })

    onOutput(
      { formula },
      {
        molarMass: parseFloat(total.toFixed(4)),
        elements: breakdown.map((e) => ({
          symbol: e.symbol,
          count: e.count,
          atomicMass: e.atomicMass,
          contribution: parseFloat(e.contribution.toFixed(4)),
          percentage: parseFloat(e.percentage.toFixed(2)),
        })),
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') calculate()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t('molar.molar_mass')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('molar.formula_placeholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={calculate}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            {t('action.calculate')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="rounded-md bg-muted p-4 font-mono text-sm">
            <div className="text-base font-semibold">
              {t('molar.molar_mass')} = {result.molarMass.toFixed(4)} g/mol
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-medium">{t('molar.breakdown')}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium">{t('molar.element')}</th>
                    <th className="pb-2 font-medium text-right">{t('molar.count')}</th>
                    <th className="pb-2 font-medium text-right">{t('molar.atomic_mass')}</th>
                    <th className="pb-2 font-medium text-right">{t('molar.contribution')}</th>
                    <th className="pb-2 font-medium text-right">{t('molar.percentage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.breakdown.map((el) => (
                    <tr key={el.symbol} className="border-b border-border/50 last:border-0">
                      <td className="py-2 font-mono font-semibold">{el.symbol}</td>
                      <td className="py-2 text-right">{el.count}</td>
                      <td className="py-2 text-right">{el.atomicMass.toFixed(3)}</td>
                      <td className="py-2 text-right">{el.contribution.toFixed(4)}</td>
                      <td className="py-2 text-right">{el.percentage.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">{t('molar.examples')}</p>
        <div className="flex flex-wrap gap-2">
          {['H2O', 'NaCl', 'H2SO4', 'Ca(OH)2', 'Al2(SO4)3', 'C6H12O6', 'Fe2O3', 'KMnO4'].map(
            (ex) => (
              <button
                key={ex}
                onClick={() => setFormula(ex)}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors font-mono"
              >
                {ex}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
