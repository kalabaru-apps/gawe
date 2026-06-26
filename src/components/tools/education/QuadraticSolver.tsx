'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

// ---------------------------------------------------------------------------
// Polynomial helpers
// ---------------------------------------------------------------------------

function evalPoly(coeffs: number[], x: number): number {
  return coeffs.reduce((acc, c) => acc * x + c, 0)
}

function evalPolyDeriv(coeffs: number[], x: number): number {
  const n = coeffs.length - 1
  return coeffs.slice(0, -1).reduce((acc, c, i) => acc * x + c * (n - i), 0)
}

function newtonRaphson(coeffs: number[], x0 = 0): number {
  let x = x0
  for (let i = 0; i < 200; i++) {
    const fx = evalPoly(coeffs, x)
    const fpx = evalPolyDeriv(coeffs, x)
    if (Math.abs(fpx) < 1e-12) break
    const xn = x - fx / fpx
    if (Math.abs(xn - x) < 1e-10) {
      x = xn
      break
    }
    x = xn
  }
  return x
}

function deflate(coeffs: number[], root: number): number[] {
  const result = [coeffs[0]]
  for (let i = 1; i < coeffs.length - 1; i++) {
    result.push(result[i - 1] * root + coeffs[i])
  }
  return result
}

// Try multiple starting points; return best root (smallest |f(x)|)
function findRealRoot(coeffs: number[]): number {
  const starts = [0, 1, -1, 2, -2, 5, -5, 10, -10]
  let best = newtonRaphson(coeffs, 0)
  let bestErr = Math.abs(evalPoly(coeffs, best))
  for (const s of starts) {
    const r = newtonRaphson(coeffs, s)
    const err = Math.abs(evalPoly(coeffs, r))
    if (err < bestErr) {
      best = r
      bestErr = err
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Root = { real: number; imag: number }
type RootType = 'two_real' | 'one_real' | 'complex' | 'error'

interface QuadraticResult {
  discriminant: number
  roots: Root[]
  type: RootType
  steps: string[]
}

interface SolveResult {
  roots: Root[]
  steps: string[]
  note: string
}

// ---------------------------------------------------------------------------
// Solvers
// ---------------------------------------------------------------------------

function solveQuadratic(a: number, b: number, c: number): QuadraticResult {
  const D = b * b - 4 * a * c
  const steps: string[] = [
    `D = b² - 4ac`,
    `D = (${b})² - 4·(${a})·(${c})`,
    `D = ${b * b} - ${4 * a * c}`,
    `D = ${D}`,
  ]

  if (D > 0) {
    const sqrtD = Math.sqrt(D)
    const x1 = (-b + sqrtD) / (2 * a)
    const x2 = (-b - sqrtD) / (2 * a)
    steps.push(`x = (-b ± √D) / 2a`)
    steps.push(`x₁ = (${-b} + ${sqrtD.toFixed(6)}) / ${2 * a} = ${x1.toFixed(6)}`)
    steps.push(`x₂ = (${-b} - ${sqrtD.toFixed(6)}) / ${2 * a} = ${x2.toFixed(6)}`)
    return { discriminant: D, roots: [{ real: x1, imag: 0 }, { real: x2, imag: 0 }], type: 'two_real', steps }
  } else if (D === 0) {
    const x = -b / (2 * a)
    steps.push(`x = -b / 2a = ${x.toFixed(6)}`)
    return { discriminant: D, roots: [{ real: x, imag: 0 }], type: 'one_real', steps }
  } else {
    const realPart = -b / (2 * a)
    const imagPart = Math.sqrt(-D) / (2 * a)
    steps.push(`x = (-b ± i√|D|) / 2a`)
    steps.push(`x₁ = ${realPart.toFixed(6)} + ${imagPart.toFixed(6)}i`)
    steps.push(`x₂ = ${realPart.toFixed(6)} - ${imagPart.toFixed(6)}i`)
    return {
      discriminant: D,
      roots: [{ real: realPart, imag: imagPart }, { real: realPart, imag: -imagPart }],
      type: 'complex',
      steps,
    }
  }
}

function solveCubic(coeffs: number[]): SolveResult {
  // coeffs = [a, b, c, d]
  const [a] = coeffs
  if (Math.abs(a) < 1e-12) {
    const q = solveQuadratic(coeffs[1], coeffs[2], coeffs[3])
    return { roots: q.roots, steps: q.steps, note: 'Leading coefficient ≈ 0; solved as quadratic.' }
  }

  const r1 = findRealRoot(coeffs)
  const quad = deflate(coeffs, r1) // degree 2
  const q = solveQuadratic(quad[0], quad[1], quad[2])

  return {
    roots: [{ real: r1, imag: 0 }, ...q.roots],
    steps: [],
    note: 'Roots found numerically via Newton-Raphson + polynomial deflation.',
  }
}

function solveQuartic(coeffs: number[]): SolveResult {
  // coeffs = [a, b, c, d, e]
  const [a] = coeffs
  if (Math.abs(a) < 1e-12) {
    return solveCubic(coeffs.slice(1))
  }

  const r1 = findRealRoot(coeffs)
  const cubic = deflate(coeffs, r1) // degree 3

  const r2 = findRealRoot(cubic)
  const quad = deflate(cubic, r2) // degree 2

  const q = solveQuadratic(quad[0], quad[1], quad[2])

  return {
    roots: [{ real: r1, imag: 0 }, { real: r2, imag: 0 }, ...q.roots],
    steps: [],
    note: 'Roots found numerically via repeated Newton-Raphson + polynomial deflation.',
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return parseFloat(n.toFixed(6)).toString()
}

function fmtRoot(r: Root): string {
  if (Math.abs(r.imag) < 1e-9) return fmt(r.real)
  const sign = r.imag >= 0 ? '+' : '-'
  return `${fmt(r.real)} ${sign} ${fmt(Math.abs(r.imag))}i`
}

function buildEquationPreview(degree: number, coeffs: number[]): string {
  const vars = ['', 'x', 'x²', 'x³', 'x⁴'].reverse()
  const superscripts = ['', 'x', 'x²', 'x³', 'x⁴']
  // coeffs[0] is highest degree
  const parts: string[] = []
  for (let i = 0; i <= degree; i++) {
    const exp = degree - i
    const c = coeffs[i]
    if (c === 0) continue
    const varLabel = exp === 0 ? '' : exp === 1 ? 'x' : superscripts[exp]
    const absC = Math.abs(c)
    const coefStr = absC === 1 && exp > 0 ? '' : String(absC)
    const sign = parts.length === 0 ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + '
    parts.push(`${sign}${coefStr}${varLabel}`)
  }
  return (parts.join('') || '0') + ' = 0'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Degree = 2 | 3 | 4

const DEGREE_LABELS: Record<Degree, string> = {
  2: 'Degree 2 (Quadratic)',
  3: 'Degree 3 (Cubic)',
  4: 'Degree 4 (Quartic)',
}

const COEFF_LABELS = ['a', 'b', 'c', 'd', 'e']
const DEFAULT_COEFFS: Record<Degree, string[]> = {
  2: ['1', '-5', '6'],
  3: ['1', '-6', '11', '-6'],
  4: ['1', '-10', '35', '-50', '24'],
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono'

export default function QuadraticSolver({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [degree, setDegree] = useState<Degree>((initialState?.degree as Degree) ?? 2)
  const [coeffStrs, setCoeffStrs] = useState<Record<Degree, string[]>>({
    2: DEFAULT_COEFFS[2],
    3: DEFAULT_COEFFS[3],
    4: DEFAULT_COEFFS[4],
  })

  const [result, setResult] = useState<{
    degree: Degree
    roots: Root[]
    steps: string[]
    discriminant?: number
    quadType?: RootType
    note: string
  } | null>(null)

  const currentCoeffs = coeffStrs[degree]

  function setCoeff(idx: number, val: string) {
    setCoeffStrs((prev) => {
      const copy = { ...prev, [degree]: [...prev[degree]] }
      copy[degree][idx] = val
      return copy
    })
  }

  const numCoeffs = degree + 1

  const solve = useCallback(() => {
    const nums = coeffStrs[degree].map((s) => {
      const n = parseFloat(s)
      return isNaN(n) ? 0 : n
    })

    if (degree === 2) {
      const [a, b, c] = nums
      if (a === 0) {
        setResult({ degree, roots: [], steps: [], note: 'a = 0: not a quadratic equation.' })
        onOutput({ degree, coefficients: nums }, { roots: [], type: 'error' })
        return
      }
      const q = solveQuadratic(a, b, c)
      setResult({ degree, roots: q.roots, steps: q.steps, discriminant: q.discriminant, quadType: q.type, note: '' })
      onOutput({ degree, coefficients: nums }, { roots: q.roots.map(fmtRoot), type: q.type })
    } else if (degree === 3) {
      const res = solveCubic(nums)
      setResult({ degree, roots: res.roots, steps: [], note: res.note })
      onOutput({ degree, coefficients: nums }, { roots: res.roots.map(fmtRoot), type: 'numerical' })
    } else {
      const res = solveQuartic(nums)
      setResult({ degree, roots: res.roots, steps: [], note: res.note })
      onOutput({ degree, coefficients: nums }, { roots: res.roots.map(fmtRoot), type: 'numerical' })
    }
  }, [degree, coeffStrs, onOutput])

  const reset = useCallback(() => {
    setCoeffStrs({ 2: DEFAULT_COEFFS[2], 3: DEFAULT_COEFFS[3], 4: DEFAULT_COEFFS[4] })
    setResult(null)
  }, [])

  const equationPreview = buildEquationPreview(degree, currentCoeffs.map((s) => { const n = parseFloat(s); return isNaN(n) ? 0 : n }))

  return (
    <div className="space-y-5">
      {/* Degree selector */}
      <div>
        <p className="text-sm font-medium mb-2">{t('poly.degree')}</p>
        <div className="flex gap-2">
          {([2, 3, 4] as Degree[]).map((d) => (
            <button
              key={d}
              onClick={() => { setDegree(d); setResult(null) }}
              className={
                d === degree
                  ? 'rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors'
                  : 'rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors'
              }
            >
              {d}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{DEGREE_LABELS[degree]}</p>
      </div>

      {/* Equation preview */}
      <div className="rounded-md bg-muted px-4 py-2 font-mono text-sm">
        {equationPreview}
      </div>

      {/* Coefficient inputs */}
      <div>
        <p className="text-sm font-medium mb-2">{t('poly.coefficients')}</p>
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${numCoeffs}, minmax(0, 1fr))` }}>
          {Array.from({ length: numCoeffs }).map((_, i) => (
            <div key={i} className="space-y-1">
              <label className="text-sm font-medium">{COEFF_LABELS[i]}</label>
              <input
                type="number"
                value={currentCoeffs[i] ?? '0'}
                onChange={(e) => setCoeff(i, e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => { analytics.buttonClick('quadratic-solver', 'solve'); solve() }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('action.solve')}
        </button>
        <button
          onClick={reset}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          {t('action.reset')}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {result.roots.length === 0 ? (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
              {result.note || 'Could not find roots.'}
            </div>
          ) : (
            <>
              {/* Degree 2: step-by-step */}
              {result.degree === 2 && result.steps.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <p className="text-sm font-medium">{t('poly.step_by_step')}</p>
                  <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-1">
                    {result.steps.map((step, i) => (
                      <p key={i}>{step}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Note for degree 3/4 */}
              {result.note && (
                <p className="text-sm text-muted-foreground italic">{result.note}</p>
              )}

              {/* Roots */}
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-medium">
                  {result.degree === 2
                    ? result.quadType === 'one_real'
                      ? t('poly.one_root')
                      : result.quadType === 'complex'
                      ? t('poly.two_complex')
                      : t('poly.two_real')
                    : `${result.roots.length} ${t('poly.roots')}`}
                </p>

                {result.degree === 2 && result.discriminant !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {t('poly.discriminant')} D = {result.discriminant}
                    {result.discriminant > 0 ? ' > 0' : result.discriminant === 0 ? ' = 0' : ' < 0'}
                  </p>
                )}

                <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-1">
                  {result.roots.map((r, i) => (
                    <p key={i}>
                      x{subscriptNum(i + 1)} = {fmtRoot(r)}
                      {Math.abs(r.imag) > 1e-9 ? ' (complex)' : ''}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function subscriptNum(n: number): string {
  const subs = ['₁', '₂', '₃', '₄']
  return subs[n - 1] ?? String(n)
}
