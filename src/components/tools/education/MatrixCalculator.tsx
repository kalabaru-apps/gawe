'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'

type Operation = 'add' | 'subtract' | 'multiply' | 'determinant' | 'inverse' | 'transpose'
type Matrix = number[][]

function makeMatrix(rows: number, cols: number): Matrix {
  return Array.from({ length: rows }, () => Array(cols).fill(0))
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

const OPERATION_IDS: Operation[] = ['add', 'subtract', 'multiply', 'determinant', 'inverse', 'transpose']
const SINGLE_MATRIX_OPS: Operation[] = ['determinant', 'inverse', 'transpose']
const SAME_SIZE_OPS: Operation[] = ['add', 'subtract']
const SQUARE_OPS: Operation[] = ['determinant', 'inverse']

const MIN_SIZE = 1
const MAX_SIZE = 8

function clamp(v: number) {
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, v))
}

interface SizeInputProps {
  label: string
  rows: number
  cols: number
  onRowsChange: (v: number) => void
  onColsChange: (v: number) => void
  disabled?: boolean
  disabledRows?: boolean
}

function SizeInput({ label, rows, cols, onRowsChange, onColsChange, disabled, disabledRows }: SizeInputProps) {
  const rowsDisabled = disabled || disabledRows
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-xs text-muted-foreground">Rows:</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onRowsChange(rows - 1)}
            disabled={rowsDisabled || rows <= MIN_SIZE}
            className="w-6 h-6 rounded border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs leading-none"
          >
            −
          </button>
          <input
            type="number"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={rows}
            disabled={rowsDisabled}
            onChange={(e) => onRowsChange(clamp(parseInt(e.target.value) || MIN_SIZE))}
            className="w-10 h-6 text-center text-xs rounded border border-input bg-background disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => onRowsChange(rows + 1)}
            disabled={rowsDisabled || rows >= MAX_SIZE}
            className="w-6 h-6 rounded border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs leading-none"
          >
            +
          </button>
        </div>
        <span className="text-muted-foreground">×</span>
        <span className="text-xs text-muted-foreground">Cols:</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onColsChange(cols - 1)}
            disabled={disabled || cols <= MIN_SIZE}
            className="w-6 h-6 rounded border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs leading-none"
          >
            −
          </button>
          <input
            type="number"
            min={MIN_SIZE}
            max={MAX_SIZE}
            value={cols}
            disabled={disabled}
            onChange={(e) => onColsChange(clamp(parseInt(e.target.value) || MIN_SIZE))}
            className="w-10 h-6 text-center text-xs rounded border border-input bg-background disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => onColsChange(cols + 1)}
            disabled={disabled || cols >= MAX_SIZE}
            className="w-6 h-6 rounded border border-input bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

interface MatrixInputProps {
  label: string
  rows: number
  cols: number
  matrix: Matrix
  onChange: (row: number, col: number, value: string) => void
}

function MatrixInput({ label, rows, cols, matrix, onChange }: MatrixInputProps) {
  const large = rows > 5 || cols > 5
  const cellClass = large
    ? 'w-9 h-7 text-center text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono'
    : 'w-12 h-8 text-center text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono'

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: rows }, (_, i) =>
          Array.from({ length: cols }, (_, j) => (
            <input
              key={`${i}-${j}`}
              type="number"
              value={matrix[i]?.[j] === 0 ? '' : matrix[i]?.[j] ?? ''}
              onChange={(e) => onChange(i, j, e.target.value)}
              placeholder="0"
              className={cellClass}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface MatrixDisplayProps {
  matrix: Matrix
}

function MatrixDisplay({ matrix }: MatrixDisplayProps) {
  const rows = matrix.length
  const cols = matrix[0]?.length ?? 0
  const large = rows > 5 || cols > 5
  const cellClass = large
    ? 'w-10 h-7 rounded bg-muted px-1 py-1 text-xs text-center font-mono'
    : 'w-14 h-8 rounded bg-muted px-2 py-2 text-sm text-center font-mono'

  return (
    <div
      className="inline-grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {matrix.map((row, i) =>
        row.map((val, j) => (
          <div key={`${i}-${j}`} className={cellClass}>
            {formatNum(val)}
          </div>
        ))
      )}
    </div>
  )
}

export default function MatrixCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()

  const [operation, setOperation] = useState<Operation>(
    (initialState?.operation as Operation) ?? 'add'
  )

  const [aRows, setARows] = useState(3)
  const [aCols, setACols] = useState(3)
  const [bRows, setBRows] = useState(3)
  const [bCols, setBCols] = useState(3)

  const [matrixA, setMatrixA] = useState<Matrix>(() => makeMatrix(3, 3))
  const [matrixB, setMatrixB] = useState<Matrix>(() => makeMatrix(3, 3))
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
    setResultMatrix(null)
    setResultScalar(null)
    setSingular(false)
    setError(null)
    if (SAME_SIZE_OPS.includes(op)) {
      setBRows(aRows)
      setBCols(aCols)
      setMatrixB(makeMatrix(aRows, aCols))
    }
    if (SQUARE_OPS.includes(op) && aRows !== aCols) {
      setACols(aRows)
      setMatrixA(makeMatrix(aRows, aRows))
    }
  }, [aRows, aCols])

  const updateA = useCallback((row: number, col: number, value: string) => {
    setMatrixA((prev) => {
      const next = prev.map((r) => [...r])
      if (next[row]) next[row][col] = parseFloat(value) || 0
      return next
    })
  }, [])

  const updateB = useCallback((row: number, col: number, value: string) => {
    setMatrixB((prev) => {
      const next = prev.map((r) => [...r])
      if (next[row]) next[row][col] = parseFloat(value) || 0
      return next
    })
  }, [])

  const calculate = useCallback(() => {
    setResultMatrix(null)
    setResultScalar(null)
    setSingular(false)
    setError(null)

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

    if (err) {
      setError(err)
      return
    }

    setResultMatrix(resMatrix)
    setResultScalar(resScalar)

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
  }, [operation, matrixA, matrixB, aRows, aCols, bRows, bCols, onOutput])

  const reset = useCallback(() => {
    setMatrixA(makeMatrix(aRows, aCols))
    setMatrixB(makeMatrix(bRows, bCols))
    setResultMatrix(null)
    setResultScalar(null)
    setSingular(false)
    setError(null)
  }, [aRows, aCols, bRows, bCols])

  const resultRows = operation === 'transpose' ? aCols : aRows
  const resultCols = operation === 'transpose' ? aRows : operation === 'multiply' ? bCols : aCols

  return (
    <div className="space-y-4">
      {/* Operation selector */}
      <div className="space-y-1">
        <p className="text-sm font-medium">{t('matrix.operation')}</p>
        <div className="flex flex-wrap gap-2">
          {OPERATION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => handleOperationChange(id)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                operation === id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-muted'
              }`}
            >
              {t(`matrix.${id}` as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Size inputs */}
      <div className="flex flex-col gap-6 items-start">
        <div className="space-y-1">
          <SizeInput
            label={`${t('matrix.matrix_a')} ${t('matrix.size')}`}
            rows={aRows}
            cols={aCols}
            onRowsChange={handleARowsChange}
            onColsChange={handleAColsChange}
          />
          {isSquareOp && (
            <p className="text-xs text-muted-foreground">Square matrix enforced (rows = cols)</p>
          )}
        </div>

        {needsB && (
          <div className="space-y-1">
            <SizeInput
              label={`${t('matrix.matrix_b')} ${t('matrix.size')}`}
              rows={bRows}
              cols={bCols}
              onRowsChange={handleBRowsChange}
              onColsChange={handleBColsChange}
              disabled={isSameSize}
              disabledRows={operation === 'multiply'}
            />
            {isSameSize && (
              <p className="text-xs text-muted-foreground">Size synced to Matrix A</p>
            )}
            {operation === 'multiply' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                B rows locked to A cols ({aCols}). B cols is free.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Matrix inputs */}
      <div className="flex gap-8 flex-wrap">
        <MatrixInput
          label={t('matrix.matrix_a')}
          rows={aRows}
          cols={aCols}
          matrix={matrixA}
          onChange={updateA}
        />
        {needsB && (
          <MatrixInput
            label={t('matrix.matrix_b')}
            rows={bRows}
            cols={bCols}
            matrix={matrixB}
            onChange={updateB}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={calculate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('action.calculate')}
        </button>
        <button
          onClick={reset}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          {t('action.reset')}
        </button>
      </div>

      {/* Error / singular */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {singular && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
          {t('matrix.singular')}
        </div>
      )}

      {/* Result matrix */}
      {resultMatrix && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">
            {t('matrix.result')}{' '}
            <span className="text-xs text-muted-foreground font-normal">
              ({resultRows}×{resultCols})
            </span>
          </p>
          <MatrixDisplay matrix={resultMatrix} />
        </div>
      )}

      {/* Scalar result */}
      {resultScalar !== null && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium">{t('matrix.determinant')}</p>
          <div className="rounded-md bg-muted p-4 font-mono text-sm">
            det(A) = {formatNum(resultScalar)}
          </div>
        </div>
      )}
    </div>
  )
}
