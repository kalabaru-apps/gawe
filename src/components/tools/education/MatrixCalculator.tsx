'use client'

/**
 * Matrix Calculator — Paper domain (education category) with Workbench region for matrix grids.
 * Paper: serif headings, ruled Sheet, printed Result. Workbench region: mono matrix inputs/outputs.
 * Live calculate on input change, local size controls, bracket styling via CSS.
 */

import { useState, useCallback, useMemo } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Sheet, Page, Result, Column, Scroll, Region, Field, TextInput, Btn, Row, Notice, Empty, CopyBtn, Section, Select } from '@/components/domain/kit'

// ---------------------------------------------------------------------------
// Matrix math
// ---------------------------------------------------------------------------

type Matrix = number[][]

function makeMatrix(rows: number, cols: number, fill = 0): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(fill))
}

function clone(m: Matrix): Matrix {
  return m.map((row) => [...row])
}

function det(m: Matrix): number {
  const n = m.length
  if (n === 1) return m[0][0]
  if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0]
  let result = 0
  for (let j = 0; j < n; j++) {
    result += m[0][j] * cofactor(m, 0, j)
  }
  return result
}

function cofactor(m: Matrix, row: number, col: number): number {
  const minor = m.filter((_, r) => r !== row).map((r) => r.filter((_, c) => c !== col))
  return Math.pow(-1, row + col) * det(minor)
}

function inverse(m: Matrix): Matrix | null {
  const d = det(m)
  if (Math.abs(d) < 1e-10) return null
  const n = m.length
  const adj: Matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => cofactor(m, j, i))
  )
  return adj.map((row) => row.map((v) => v / d))
}

function multiply(a: Matrix, b: Matrix): Matrix {
  const r = a.length
  const k = a[0].length
  const c = b[0].length
  return Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) =>
      a[i].reduce((sum, _, l) => sum + a[i][l] * b[l][j], 0)
    )
  )
}

function addMatrix(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((val, j) => val + b[i][j]))
}

function subtractMatrix(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((val, j) => val - b[i][j]))
}

function transposeMatrix(m: Matrix): Matrix {
  const rows = m.length
  const cols = m[0].length
  return Array.from({ length: cols }, (_, i) =>
    Array.from({ length: rows }, (_, j) => m[j][i])
  )
}

function formatNum(n: number): string {
  const rounded = Math.round(n * 1e10) / 1e10
  return String(rounded)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Operation = 'add' | 'subtract' | 'multiply' | 'determinant' | 'inverse' | 'transpose'

const OPERATION_IDS: Operation[] = ['add', 'subtract', 'multiply', 'determinant', 'inverse', 'transpose']
const SINGLE_MATRIX_OPS: Operation[] = ['determinant', 'inverse', 'transpose']
const SAME_SIZE_OPS: Operation[] = ['add', 'subtract']
const SQUARE_OPS: Operation[] = ['determinant', 'inverse']

const MIN_SIZE = 1
const MAX_SIZE = 8

function clamp(v: number): number {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, v))
}

function matrixToString(m: Matrix): string {
  return m.map((row) => '[' + row.map(formatNum).join('  ') + ']').join('\n')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MatrixCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()

  const [operation, setOperation] = useState<Operation>(
    (initialState?.operation as Operation) ?? 'add'
  )

  const [aRows, setARows] = useState((initialState?.aRows as number) ?? 3)
  const [aCols, setACols] = useState((initialState?.aCols as number) ?? 3)
  const [bRows, setBRows] = useState((initialState?.bRows as number) ?? 3)
  const [bCols, setBCols] = useState((initialState?.bCols as number) ?? 3)

  const [matrixA, setMatrixA] = useState<Matrix>(() => makeMatrix(aRows, aCols))
  const [matrixB, setMatrixB] = useState<Matrix>(() => makeMatrix(bRows, bCols))
  const [resultMatrix, setResultMatrix] = useState<Matrix | null>(null)
  const [resultScalar, setResultScalar] = useState<number | null>(null)
  const [singular, setSingular] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSameSize = SAME_SIZE_OPS.includes(operation)
  const isSquareOp = SQUARE_OPS.includes(operation)
  const needsB = !SINGLE_MATRIX_OPS.includes(operation)

  const clearResult = useCallback(() => {
    setResultMatrix(null)
    setResultScalar(null)
    setSingular(false)
    setError(null)
  }, [])

  // Size handlers
  const handleARowsChange = useCallback((v: number) => {
    clearResult()
    const newRows = clamp(v)
    if (isSquareOp) {
      setARows(newRows)
      setACols(newRows)
      setMatrixA(makeMatrix(newRows, newRows))
    } else {
      setARows(newRows)
      setMatrixA(makeMatrix(newRows, aCols))
      if (isSameSize) {
        setBRows(newRows)
        setMatrixB(makeMatrix(newRows, bCols))
      }
    }
  }, [aCols, bCols, isSameSize, isSquareOp, clearResult])

  const handleAColsChange = useCallback((v: number) => {
    clearResult()
    const newCols = clamp(v)
    if (isSquareOp) {
      setARows(newCols)
      setACols(newCols)
      setMatrixA(makeMatrix(newCols, newCols))
    } else {
      setACols(newCols)
      setMatrixA(makeMatrix(aRows, newCols))
      if (isSameSize) {
        setBCols(newCols)
        setMatrixB(makeMatrix(bRows, newCols))
      }
      if (operation === 'multiply') {
        setBRows(newCols)
        setMatrixB(makeMatrix(newCols, bCols))
      }
    }
  }, [aRows, bRows, bCols, isSameSize, isSquareOp, operation, clearResult])

  const handleBRowsChange = useCallback((v: number) => {
    clearResult()
    const newRows = clamp(v)
    setBRows(newRows)
    setMatrixB(makeMatrix(newRows, bCols))
  }, [bCols, clearResult])

  const handleBColsChange = useCallback((v: number) => {
    clearResult()
    const newCols = clamp(v)
    setBCols(newCols)
    setMatrixB(makeMatrix(bRows, newCols))
  }, [bRows, clearResult])

  const handleOperationChange = useCallback((op: Operation) => {
    setOperation(op)
    clearResult()
    if (SAME_SIZE_OPS.includes(op)) {
      setBRows(aRows)
      setBCols(aCols)
      setMatrixB(makeMatrix(aRows, aCols))
    }
    if (SQUARE_OPS.includes(op) && aRows !== aCols) {
      setACols(aRows)
      setMatrixA(makeMatrix(aRows, aRows))
    }
  }, [aRows, aCols, clearResult])

  // Input handlers
  const updateA = useCallback((row: number, col: number, value: string) => {
    setMatrixA((prev) => {
      const next = clone(prev)
      if (next[row]) next[row][col] = parseFloat(value) || 0
      return next
    })
  }, [])

  const updateB = useCallback((row: number, col: number, value: string) => {
    setMatrixB((prev) => {
      const next = clone(prev)
      if (next[row]) next[row][col] = parseFloat(value) || 0
      return next
    })
  }, [])

  // Live calculation
  const compute = useMemo(() => {
    setError(null)
    setSingular(false)

    let resMatrix: Matrix | null = null
    let resScalar: number | null = null
    let err: string | null = null

    switch (operation) {
      case 'add':
        if (aRows !== bRows || aCols !== bCols) {
          err = 'Matrix A and B must have the same dimensions for addition.'
          break
        }
        resMatrix = addMatrix(matrixA, matrixB)
        break
      case 'subtract':
        if (aRows !== bRows || aCols !== bCols) {
          err = 'Matrix A and B must have the same dimensions for subtraction.'
          break
        }
        resMatrix = subtractMatrix(matrixA, matrixB)
        break
      case 'multiply':
        if (aCols !== bRows) {
          err = 'A cols must equal B rows for multiplication.'
          break
        }
        resMatrix = multiply(matrixA, matrixB)
        break
      case 'determinant':
        if (aRows !== aCols) {
          err = 'Matrix A must be square (rows = cols) for determinant.'
          break
        }
        resScalar = det(matrixA)
        break
      case 'transpose':
        resMatrix = transposeMatrix(matrixA)
        break
      case 'inverse': {
        if (aRows !== aCols) {
          err = 'Matrix A must be square (rows = cols) for inverse.'
          break
        }
        const inv = inverse(matrixA)
        if (inv === null) {
          setSingular(true)
        } else {
          resMatrix = inv
        }
        break
      }
    }

    return { resMatrix, resScalar, err }
  }, [operation, matrixA, matrixB, aRows, aCols, bRows, bCols])

  const { resMatrix, resScalar, err } = compute

  // Fire analytics + onOutput when result changes
  const prevResultRef = useState<{ matrix: Matrix | null; scalar: number | null }>({ matrix: null, scalar: null })[0]
  if ((prevResultRef.matrix !== resMatrix || prevResultRef.scalar !== resScalar) && (resMatrix || resScalar !== null)) {
    analytics.buttonClick('matrix-calculator', 'calculate')
    onOutput(
      {
        operation,
        matrixA,
        matrixB: SINGLE_MATRIX_OPS.includes(operation) ? null : matrixB,
        aRows,
        aCols,
        bRows,
        bCols,
      },
      {
        result: resMatrix ?? resScalar,
        determinant: operation === 'determinant' ? resScalar : null,
      }
    )
  }

  const resultRows = operation === 'transpose' ? aCols : aRows
  const resultCols = operation === 'transpose' ? aRows : operation === 'multiply' ? bCols : aCols

  return (
    <Scroll>
      <Column width="xl">
        <Sheet>
          <header className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-d-ink mb-2">{t('matrix.title', 'Matrix Calculator')}</h1>
            <p className="text-d-muted text-sm">{t('matrix.description', 'Enter two matrices and choose an operation. Result updates live.')}</p>
          </header>

          {/* Operation selector */}
          <Section title={t('matrix.operation', 'Operation')}>
            <div className="flex flex-wrap gap-2">
              {OPERATION_IDS.map((id) => (
                <Btn
                  key={id}
                  variant={operation === id ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => handleOperationChange(id)}
                >
                  {t(`matrix.${id}` as Parameters<typeof t>[0])}
                </Btn>
              ))}
            </div>
          </Section>

          {/* Size controls */}
          <Section title={t('matrix.matrix_a', 'Matrix A')} className="mb-4">
            <div className="grid gap-4 sm:grid-cols-4 mb-3">
              <Field id="a-rows" label={t('matrix.rows', 'Rows')} hint={isSquareOp ? t('matrix.square_hint', 'Square matrix enforced') : undefined}>
                <TextInput
                  id="a-rows"
                  type="number"
                  value={aRows}
                  onChange={(e) => handleARowsChange(parseInt(e.target.value) || MIN_SIZE)}
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                />
              </Field>
              <Field id="a-cols" label={t('matrix.cols', 'Cols')} hint={isSquareOp ? t('matrix.square_hint', 'Square matrix enforced') : undefined}>
                <TextInput
                  id="a-cols"
                  type="number"
                  value={aCols}
                  onChange={(e) => handleAColsChange(parseInt(e.target.value) || MIN_SIZE)}
                  min={MIN_SIZE}
                  max={MAX_SIZE}
                />
              </Field>
            </div>

            {/* Matrix A input grid */}
            <Region domain="workbench" className="overflow-x-auto">
              <div className="inline-grid gap-0.5 p-2 bg-d-surface rounded-d" style={{ gridTemplateColumns: `repeat(${aCols}, minmax(40px, 1fr))` }}>
                {Array.from({ length: aRows }, (_, i) =>
                  Array.from({ length: aCols }, (_, j) => (
                    <input
                      key={`${i}-${j}`}
                      type="number"
                      value={matrixA[i]?.[j] === 0 ? '' : matrixA[i]?.[j] ?? ''}
                      onChange={(e) => updateA(i, j, e.target.value)}
                      aria-label={`A ${i + 1},${j + 1}`}
                      placeholder="0"
                      className="w-full h-8 text-center text-sm rounded border border-d-border bg-d-raised font-mono focus:outline-none focus:border-d-accent"
                    />
                  ))
                )}
              </div>
            </Region>
          </Section>

          {needsB && (
            <Section title={t('matrix.matrix_b', 'Matrix B')} className="mb-4">
              <div className="grid gap-4 sm:grid-cols-4 mb-3">
                <Field id="b-rows" label={t('matrix.rows', 'Rows')} hint={isSameSize ? t('matrix.synced_hint', 'Size synced to Matrix A') : operation === 'multiply' ? t('matrix.mul_rows_hint', `Rows locked to A cols (${aCols})`) : undefined}>
                  <TextInput
                    id="b-rows"
                    type="number"
                    value={bRows}
                    onChange={(e) => handleBRowsChange(parseInt(e.target.value) || MIN_SIZE)}
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    disabled={isSameSize || operation === 'multiply'}
                  />
                </Field>
                <Field id="b-cols" label={t('matrix.cols', 'Cols')} hint={isSameSize ? t('matrix.synced_hint', 'Size synced to Matrix A') : undefined}>
                  <TextInput
                    id="b-cols"
                    type="number"
                    value={bCols}
                    onChange={(e) => handleBColsChange(parseInt(e.target.value) || MIN_SIZE)}
                    min={MIN_SIZE}
                    max={MAX_SIZE}
                    disabled={isSameSize}
                  />
                </Field>
              </div>

              <Region domain="workbench" className="overflow-x-auto">
                <div className="inline-grid gap-0.5 p-2 bg-d-surface rounded-d" style={{ gridTemplateColumns: `repeat(${bCols}, minmax(40px, 1fr))` }}>
                  {Array.from({ length: bRows }, (_, i) =>
                    Array.from({ length: bCols }, (_, j) => (
                      <input
                        key={`${i}-${j}`}
                        type="number"
                        value={matrixB[i]?.[j] === 0 ? '' : matrixB[i]?.[j] ?? ''}
                        onChange={(e) => updateB(i, j, e.target.value)}
                        aria-label={`B ${i + 1},${j + 1}`}
                        placeholder="0"
                        className="w-full h-8 text-center text-sm rounded border border-d-border bg-d-raised font-mono focus:outline-none focus:border-d-accent"
                      />
                    ))
                  )}
                </div>
              </Region>
            </Section>
          )}

          {/* Errors */}
          {err && <Notice tone="error" className="mb-4">{err}</Notice>}
          {singular && <Notice tone="error" className="mb-4">{t('matrix.singular', 'Matrix is singular (determinant is zero). No inverse exists.')}</Notice>}

          {/* Results */}
          {resMatrix && (
            <Page className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-semibold">{t('matrix.result', 'Result')}</h2>
                <CopyBtn value={matrixToString(resMatrix)} size="sm" />
              </div>
              <Region domain="workbench">
                <div className="inline-grid gap-0.5 p-2 bg-d-surface rounded-d font-mono text-sm" style={{ gridTemplateColumns: `repeat(${resultCols}, minmax(50px, 1fr))` }}>
                  {resMatrix.map((row, i) =>
                    row.map((val, j) => (
                      <div key={`${i}-${j}`} className="px-2 py-1 text-center border-b border-r border-d-border/50 last:border-r-0 last:border-b-0">
                        {formatNum(val)}
                      </div>
                    ))
                  )}
                </div>
              </Region>
              <p className="mt-2 text-xs text-d-muted">({resultRows} × {resultCols})</p>
            </Page>
          )}

          {resScalar !== null && (
            <Page className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-lg font-semibold">{t('matrix.determinant', 'Determinant')}</h2>
                <CopyBtn value={formatNum(resScalar)} size="sm" />
              </div>
              <Result
                label={t('matrix.determinant', 'Determinant')}
                value={formatNum(resScalar)}
              />
            </Page>
          )}

          {!resMatrix && resScalar === null && !err && !singular && (
            <Empty
              title={t('matrix.enter_matrices', 'Enter matrices')}
              children={t('matrix.results_appear', 'Result appears here as you type.')}
            />
          )}
        </Sheet>
      </Column>
    </Scroll>
  )
}