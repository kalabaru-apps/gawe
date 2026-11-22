'use client'

/**
 * Molar Mass Calculator — Paper domain (education = paper).
 * Live formula parsing: type a formula, see element breakdown table and total in serif.
 * Workbench region for the mono formula input, Paper for the results table.
 */

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import type { ToolProps } from '@/types'
import {
  Scroll,
  Column,
  Sheet,
  Page,
  Region,
  Field,
  TextInput,
  Btn,
  CopyBtn,
  Stat,
  Notice,
  Row,
} from '@/components/domain'

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

const EXAMPLES = ['H2O', 'NaCl', 'H2SO4', 'Ca(OH)2', 'Al2(SO4)3', 'C6H12O6', 'Fe2O3', 'KMnO4']

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

  function handleExampleClick(ex: string) {
    setFormula(ex)
    calculate()
  }

  return (
    <Scroll>
      <Column width="md">
        <Sheet>
          <Page className="space-y-5">
            {/* Formula input — workbench mono region */}
            <Field label={t('molar.molar_mass')} id="molar-formula">
              <Region domain="workbench" className="flex gap-2">
                <TextInput
                  type="text"
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('molar.formula_placeholder')}
                  mono
                />
                <Btn variant="primary" onClick={() => { analytics.buttonClick('molar-mass', 'calculate'); calculate() }}>
                  {t('action.calculate')}
                </Btn>
              </Region>
            </Field>

            {error && (
              <Notice tone="error">{error}</Notice>
            )}

            {result && (
              <>
                {/* Total — printed result in serif */}
                <div className="space-y-3">
                  <Stat
                    label={t('molar.molar_mass')}
                    value={`${result.molarMass.toFixed(4)} g/mol`}
                    tone="serif"
                    className="border-l-2 border-d-accent pl-3 text-2xl"
                  />
                </div>

                {/* Breakdown table */}
                <Page className="space-y-3">
                  <h4 className="font-display text-sm font-semibold">{t('molar.breakdown')}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="border-b border-d-border text-left">
                          <th className="pb-2 font-medium w-24">{t('molar.element')}</th>
                          <th className="pb-2 font-medium text-right w-20">{t('molar.count')}</th>
                          <th className="pb-2 font-medium text-right w-32">{t('molar.atomic_mass')}</th>
                          <th className="pb-2 font-medium text-right w-32">{t('molar.contribution')}</th>
                          <th className="pb-2 font-medium text-right w-28">{t('molar.percentage')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.breakdown.map((el) => (
                          <tr key={el.symbol} className="border-b border-d-border/50 last:border-0">
                            <td className="py-2 font-mono font-semibold">{el.symbol}</td>
                            <td className="py-2 text-right">{el.count}</td>
                            <td className="py-2 text-right font-mono">{el.atomicMass.toFixed(3)}</td>
                            <td className="py-2 text-right font-mono">{el.contribution.toFixed(4)}</td>
                            <td className="py-2 text-right font-mono">{el.percentage.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <CopyBtn
                    value={`${formula} = ${result.molarMass.toFixed(4)} g/mol`}
                    label={t('molar.copy_result')}
                    className="mt-2"
                  />
                </Page>
              </>
            )}

            {/* Examples */}
            <Page className="space-y-2">
              <h4 className="font-display text-sm font-semibold text-d-muted">{t('molar.examples')}</h4>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleExampleClick(ex)}
                    className="rounded-d border border-d-border bg-d-raised px-3 py-1.5 text-sm font-mono hover:bg-d-border/40"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </Page>
          </Page>
        </Sheet>
      </Column>
    </Scroll>
  )
}