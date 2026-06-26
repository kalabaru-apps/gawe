'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'

type Size = 2 | 3
type Operation = 'add' | 'subtract' | 'multiply' | 'determinant' | 'inverse' | 'transpose'
type Matrix = number[][]

function makeMatrix(size: Size): Matrix {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

function det2(m: Matrix): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0]
}

function det3(m: Matrix): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  )
}

function determinant(m: Matrix, size: Size): number {
  return size === 2 ? det2(m) : det3(m)
}

function addMatrix(a: Matrix, b: Matrix, size: Size): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => a[i][j] + b[i][j])
  )
}

function subtractMatrix(a: Matrix, b: Matrix, size: Size): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => a[i][j] - b[i][j])
  )
}

function multiplyMatrix(a: Matrix, b: Matrix, size: Size): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) =>
      Array.from({ length: size }, (_, k) => a[i][k] * b[k][j]).reduce((s, v) => s + v, 0)
    )
  )
}

function transposeMatrix(m: Matrix, size: Size): Matrix {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => m[j][i])
  )
}

function inverse2(m: Matrix): Matrix | null {
  const d = det2(m)
  if (d === 0) return null
  return [
    [m[1][1] / d, -m[0][1] / d],
    [-m[1][0] / d, m[0][0] / d],
  ]
}

function inverse3(m: Matrix): Matrix | null {
  const d = det3(m)
  if (d === 0) return null
  const cofactors: Matrix = [
    [
      m[1][1] * m[2][2] - m[1][2] * m[2][1],
      -(m[1][0] * m[2][2] - m[1][2] * m[2][0]),
      m[1][0] * m[2][1] - m[1][1] * m[2][0],
    ],
    [
      -(m[0][1] * m[2][2] - m[0][2] * m[2][1]),
      m[0][0] * m[2][2] - m[0][2] * m[2][0],
      -(m[0][0] * m[2][1] - m[0][1] * m[2][0]),
    ],
    [
      m[0][1] * m[1][2] - m[0][2] * m[1][1],
      -(m[0][0] * m[1][2] - m[0][2] * m[1][0]),
      m[0][0] * m[1][1] - m[0][1] * m[1][0],
    ],
  ]
  // adjugate is transpose of cofactor matrix
  return Array.from({ length: 3 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) => cofactors[j][i] / d)
  )
}

function inverseMatrix(m: Matrix, size: Size): Matrix | null {
  return size === 2 ? inverse2(m) : inverse3(m)
}

function formatNum(n: number): string {
  const rounded = Math.round(n * 1e10) / 1e10
  return String(rounded)
}

const OPERATION_IDS: Operation[] = ['add', 'subtract', 'multiply', 'determinant', 'inverse', 'transpose']

const SINGLE_MATRIX_OPS: Operation[] = ['determinant', 'inverse', 'transpose']

interface MatrixInputProps {
  label: string
  size: Size
  matrix: Matrix
  onChange: (row: number, col: number, value: string) => void
}

function MatrixInput({ label, size, matrix, onChange }: MatrixInputProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {matrix.map((row, i) =>
          row.map((val, j) => (
            <input
              key={`${i}-${j}`}
              type="number"
              value={val === 0 ? '' : val}
              onChange={(e) => onChange(i, j, e.target.value)}
              placeholder="0"
              className="w-14 rounded-md border border-input bg-background px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring font-mono"
            />
          ))
        )}
      </div>
    </div>
  )
}

interface MatrixDisplayProps {
  matrix: Matrix
  size: Size
}

function MatrixDisplay({ matrix, size }: MatrixDisplayProps) {
  return (
    <div
      className="inline-grid gap-1"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
    >
      {matrix.map((row, i) =>
        row.map((val, j) => (
          <div
            key={`${i}-${j}`}
            className="w-16 rounded-md bg-muted px-2 py-2 text-sm text-center font-mono"
          >
            {formatNum(val)}
          </div>
        ))
      )}
    </div>
  )
}

export default function MatrixCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [size, setSize] = useState<Size>((initialState?.size as Size) ?? 2)
  const [operation, setOperation] = useState<Operation>(
    (initialState?.operation as Operation) ?? 'add'
  )
  const [matrixA, setMatrixA] = useState<Matrix>(makeMatrix(size))
  const [matrixB, setMatrixB] = useState<Matrix>(makeMatrix(size))
  const [resultMatrix, setResultMatrix] = useState<Matrix | null>(null)
  const [resultScalar, setResultScalar] = useState<number | null>(null)
  const [singular, setSingular] = useState(false)

  const updateA = useCallback((row: number, col: number, value: string) => {
    setMatrixA((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = parseFloat(value) || 0
      return next
    })
  }, [])

  const updateB = useCallback((row: number, col: number, value: string) => {
    setMatrixB((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = parseFloat(value) || 0
      return next
    })
  }, [])

  const changeSize = useCallback((s: Size) => {
    setSize(s)
    setMatrixA(makeMatrix(s))
    setMatrixB(makeMatrix(s))
    setResultMatrix(null)
    setResultScalar(null)
    setSingular(false)
  }, [])

  const calculate = useCallback(() => {
    setSingular(false)
    setResultMatrix(null)
    setResultScalar(null)

    let resMatrix: Matrix | null = null
    let resScalar: number | null = null

    switch (operation) {
      case 'add':
        resMatrix = addMatrix(matrixA, matrixB, size)
        break
      case 'subtract':
        resMatrix = subtractMatrix(matrixA, matrixB, size)
        break
      case 'multiply':
        resMatrix = multiplyMatrix(matrixA, matrixB, size)
        break
      case 'determinant':
        resScalar = determinant(matrixA, size)
        break
      case 'transpose':
        resMatrix = transposeMatrix(matrixA, size)
        break
      case 'inverse': {
        const inv = inverseMatrix(matrixA, size)
        if (inv === null) {
          setSingular(true)
        } else {
          resMatrix = inv
        }
        break
      }
    }

    setResultMatrix(resMatrix)
    setResultScalar(resScalar)

    onOutput(
      { operation, matrixA, matrixB: SINGLE_MATRIX_OPS.includes(operation) ? null : matrixB, size },
      {
        result: resMatrix ?? resScalar,
        determinant: operation === 'determinant' ? resScalar : null,
      }
    )
  }, [operation, matrixA, matrixB, size, onOutput])

  const reset = useCallback(() => {
    setMatrixA(makeMatrix(size))
    setMatrixB(makeMatrix(size))
    setResultMatrix(null)
    setResultScalar(null)
    setSingular(false)
  }, [size])

  const needsB = !SINGLE_MATRIX_OPS.includes(operation)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('matrix.size')}</p>
          <div className="flex gap-2">
            {([2, 3] as Size[]).map((s) => (
              <button
                key={s}
                onClick={() => changeSize(s)}
                className={`px-4 py-2 rounded-md text-sm border transition-colors ${
                  size === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input bg-background hover:bg-muted'
                }`}
              >
                {s}×{s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">{t('matrix.operation')}</p>
        <div className="flex flex-wrap gap-2">
          {OPERATION_IDS.map((id) => (
            <button
              key={id}
              onClick={() => {
                setOperation(id)
                setResultMatrix(null)
                setResultScalar(null)
                setSingular(false)
              }}
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

      <div className={`flex gap-8 flex-wrap ${needsB ? '' : ''}`}>
        <MatrixInput label={t('matrix.matrix_a')} size={size} matrix={matrixA} onChange={updateA} />
        {needsB && (
          <MatrixInput label={t('matrix.matrix_b')} size={size} matrix={matrixB} onChange={updateB} />
        )}
      </div>

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

      {singular && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive">
          {t('matrix.singular')}
        </div>
      )}

      {resultMatrix && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">{t('matrix.result')}</p>
          <MatrixDisplay matrix={resultMatrix} size={size} />
        </div>
      )}

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
