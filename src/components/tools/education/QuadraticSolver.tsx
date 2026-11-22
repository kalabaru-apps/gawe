'use client'

/**
 * Quadratic Solver — Paper domain (education category) with Workbench region for formula/steps.
 * Paper: serif headings, ruled Sheet, printed Result. Workbench region: mono equation + discriminant steps.
 * Live solve as you type (no Calculate button), sensible defaults, keyboard friendly.
 */

import { useState, useCallback, useMemo } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Sheet, Page, Result } from '@/components/domain/Paper'
import { Column, Scroll, Region, Field, TextInput, Row, Notice, Empty, CopyBtn } from '@/components/domain/kit'

// ---------------------------------------------------------------------------
// Solvers
// ---------------------------------------------------------------------------

interface Root {
  real: number
  imag: number
}

interface QuadraticResult {
  discriminant: number
  roots: Root[]
  type: 'two_real' | 'one_real' | 'complex' | 'error'
  steps: string[]
}

function solveQuadratic(a: number, b: number, c: number): QuadraticResult {
  const D = b * b - 4 * a * c
  const steps: string[] = [
    'D = b² − 4ac',
    `D = (${b})² − 4·(${a})·(${c})`,
    `D = ${b * b} − ${4 * a * c}`,
    `D = ${D}`,
  ]

  if (D > 0) {
    const sqrtD = Math.sqrt(D)
    const x1 = (-b + sqrtD) / (2 * a)
    const x2 = (-b - sqrtD) / (2 * a)
    steps.push('x = (−b ± √D) / 2a')
    steps.push(`x₁ = (${-b} + ${sqrtD.toFixed(6)}) / ${2 * a} = ${x1.toFixed(6)}`)
    steps.push(`x₂ = (${-b} − ${sqrtD.toFixed(6)}) / ${2 * a} = ${x2.toFixed(6)}`)
    return { discriminant: D, roots: [{ real: x1, imag: 0 }, { real: x2, imag: 0 }], type: 'two_real', steps }
  } else if (D === 0) {
    const x = -b / (2 * a)
    steps.push('x = −b / 2a')
    steps.push(`x = ${x.toFixed(6)}`)
    return { discriminant: D, roots: [{ real: x, imag: 0 }], type: 'one_real', steps }
  } else {
    const realPart = -b / (2 * a)
    const imagPart = Math.sqrt(-D) / (2 * a)
    steps.push('x = (−b ± i√|D|) / 2a')
    steps.push(`x₁ = ${realPart.toFixed(6)} + ${imagPart.toFixed(6)}i`)
    steps.push(`x₂ = ${realPart.toFixed(6)} − ${imagPart.toFixed(6)}i`)
    return {
      discriminant: D,
      roots: [{ real: realPart, imag: imagPart }, { real: realPart, imag: -imagPart }],
      type: 'complex',
      steps,
    }
  }
}

function fmt(n: number): string {
  return parseFloat(n.toFixed(6)).toString()
}

function fmtRoot(r: Root): string {
  if (Math.abs(r.imag) < 1e-9) return fmt(r.real)
  const sign = r.imag >= 0 ? '+' : '−'
  return `${fmt(r.real)} ${sign} ${fmt(Math.abs(r.imag))}i`
}

function buildEquation(a: number, b: number, c: number): string {
  const parts: string[] = []
  if (a !== 0) {
    const coef = Math.abs(a) === 1 ? '' : String(Math.abs(a))
    const sign = a < 0 ? '−' : ''
    parts.push(`${sign}${coef}x²`)
  }
  if (b !== 0) {
    const coef = Math.abs(b) === 1 ? '' : String(Math.abs(b))
    const sign = parts.length === 0 ? (b < 0 ? '−' : '') : (b < 0 ? ' − ' : ' + ')
    parts.push(`${sign}${coef}x`)
  }
  if (c !== 0) {
    const sign = parts.length === 0 ? (c < 0 ? '−' : '') : (c < 0 ? ' − ' : ' + ')
    parts.push(`${sign}${Math.abs(c)}`)
  }
  return (parts.join('') || '0') + ' = 0'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuadraticSolver({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [a, setA] = useState<string>((initialState?.a as string) ?? '1')
  const [b, setB] = useState<string>((initialState?.b as string) ?? '-5')
  const [c, setC] = useState<string>((initialState?.c as string) ?? '6')

  // Live computation
  const result = useMemo(() => {
    const aNum = parseFloat(a)
    const bNum = parseFloat(b)
    const cNum = parseFloat(c)
    if (isNaN(aNum) || isNaN(bNum) || isNaN(cNum)) return null
    if (aNum === 0) return { error: 'a = 0: not a quadratic equation.' } as const
    return solveQuadratic(aNum, bNum, cNum)
  }, [a, b, c])

  // Fire analytics + onOutput on change
  const handleChange = useCallback(() => {
    const res = result
    if (!res || 'error' in res) return
    analytics.buttonClick('quadratic-solver', 'solve')
    onOutput({ a: parseFloat(a), b: parseFloat(b), c: parseFloat(c) }, {
      roots: res.roots.map(fmtRoot),
      discriminant: res.discriminant,
      type: res.type,
    })
  }, [result, a, b, c, onOutput])

  // Trigger onOutput when result changes (but not on initial mount)
  const prevResultRef = useState<unknown>(result)[0]
  if (prevResultRef !== result && result && !('error' in result)) {
    handleChange()
  }

  const equation = buildEquation(parseFloat(a) || 0, parseFloat(b) || 0, parseFloat(c) || 0)

  return (
    <Scroll>
      <Column width="md">
        <Sheet>
          <header className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-d-ink mb-2">{t('poly.quadratic_solver', 'Quadratic Solver')}</h1>
            <p className="text-d-muted text-sm">{t('poly.enter_coefficients', 'Enter coefficients a, b, c for a x² + b x + c = 0.')}</p>
          </header>

          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Field label={t('poly.coeff_a', 'a')} id="coeff-a" hint={t('poly.coeff_a_hint', 'Coefficient of x²')}>
              <TextInput id="coeff-a" value={a} onChange={(e) => setA(e.target.value)} mono placeholder="1" />
            </Field>
            <Field label={t('poly.coeff_b', 'b')} id="coeff-b" hint={t('poly.coeff_b_hint', 'Coefficient of x')}>
              <TextInput id="coeff-b" value={b} onChange={(e) => setB(e.target.value)} mono placeholder="-5" />
            </Field>
            <Field label={t('poly.coeff_c', 'c')} id="coeff-c" hint={t('poly.coeff_c_hint', 'Constant term')}>
              <TextInput id="coeff-c" value={c} onChange={(e) => setC(e.target.value)} mono placeholder="6" />
            </Field>
          </div>

          {/* Equation preview in Workbench region */}
          <Region domain="workbench" className="mb-4">
            <div className="rounded-d border border-d-border bg-d-surface p-4 font-mono text-sm">
              {equation}
            </div>
          </Region>

          {result && 'error' in result && (
            <Notice tone="error" className="mb-4">{result.error}</Notice>
          )}

          {result && !('error' in result) && (
            <>
              {/* Discriminant step */}
              <Region domain="workbench" className="mb-4">
                <div className="rounded-d border border-d-border bg-d-surface p-4 font-mono text-sm space-y-1">
                  {result.steps.slice(0, 4).map((step, i) => (
                    <div key={i} className={i === 3 ? 'font-semibold text-d-ink' : 'text-d-muted'}>
                      {step}
                    </div>
                  ))}
                </div>
              </Region>

              {/* Result card */}
              <Page className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg font-semibold">
                    {result.type === 'two_real' ? t('poly.two_real', 'Two real roots') :
                     result.type === 'one_real' ? t('poly.one_real', 'One real root') :
                     t('poly.two_complex', 'Two complex roots')}
                  </span>
                  <CopyBtn value={result.roots.map(fmtRoot).join(', ')} size="sm" />
                </div>

                <Result
                  label={t('poly.discriminant', 'Discriminant')}
                  value={String(result.discriminant)}
                  note={
                    result.discriminant > 0 ? t('poly.discriminant_pos', 'D greater than 0 - two distinct real roots') :
                    result.discriminant === 0 ? t('poly.discriminant_zero', 'D equals 0 - one repeated real root') :
                    t('poly.discriminant_neg', 'D less than 0 - two complex conjugate roots')
                  }
                />

                <div className="space-y-2">
                  {result.roots.map((r, i) => {
                    const rootLabel = `${t('poly.root', 'Root')} ${i + 1}`
                    return (
                      <Row
                        key={i}
                        label={rootLabel}
                        value={fmtRoot(r)}
                        mono
                      />
                    )
                  })}
                </div>

                {/* Vertex */}
                <div className="border-t border-d-border pt-3">
                  <p className="text-sm text-d-muted">{t('poly.vertex', 'Vertex')}</p>
                  <p className="font-mono text-base">
                    ({fmt(-parseFloat(b) / (2 * parseFloat(a)))}, {fmt((4 * parseFloat(a) * parseFloat(c) - parseFloat(b) * parseFloat(b)) / (4 * parseFloat(a)))})
                  </p>
                </div>
              </Page>
            </>
          )}

          {!result && (
            <Empty
              title={t('poly.enter_coefficients', 'Enter coefficients')}
              children={t('poly.results_appear', 'Results appear here as you type.')}
            />
          )}
        </Sheet>
      </Column>
    </Scroll>
  )
}