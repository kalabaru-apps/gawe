'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'

interface StatsResult {
  count: number
  sum: number
  mean: number
  median: number
  mode: number[] | null
  min: number
  max: number
  range: number
  variance: number
  stdDev: number
  sampleVariance: number
  sampleStdDev: number
  q1: number
  q3: number
  iqr: number
  sorted: number[]
}

function parseNumbers(raw: string): { values: number[]; errors: string[] } {
  const tokens = raw.split(/[\s,;\n]+/).filter((t) => t.trim() !== '')
  const values: number[] = []
  const errors: string[] = []
  for (const tok of tokens) {
    const n = Number(tok)
    if (isNaN(n)) {
      errors.push(tok)
    } else {
      values.push(n)
    }
  }
  return { values, errors }
}

function computeStats(values: number[]): StatsResult {
  const n = values.length
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((acc, v) => acc + v, 0)
  const mean = sum / n
  const min = sorted[0]
  const max = sorted[n - 1]
  const range = max - min

  // Median
  let median: number
  if (n % 2 === 0) {
    median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2
  } else {
    median = sorted[Math.floor(n / 2)]
  }

  // Mode
  const freq = new Map<number, number>()
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1)
  const maxFreq = Math.max(...freq.values())
  let mode: number[] | null = null
  if (maxFreq > 1) {
    mode = [...freq.entries()]
      .filter(([, f]) => f === maxFreq)
      .map(([v]) => v)
      .sort((a, b) => a - b)
  }

  // Population variance & stddev
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  // Sample variance & stddev
  const sampleVariance = n > 1 ? values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1) : 0
  const sampleStdDev = Math.sqrt(sampleVariance)

  // Quartiles (inclusive method)
  function quartile(arr: number[], q: 0.25 | 0.75): number {
    const pos = q * (arr.length - 1)
    const lower = Math.floor(pos)
    const upper = Math.ceil(pos)
    if (lower === upper) return arr[lower]
    return arr[lower] + (arr[upper] - arr[lower]) * (pos - lower)
  }

  const q1 = quartile(sorted, 0.25)
  const q3 = quartile(sorted, 0.75)
  const iqr = q3 - q1

  return { count: n, sum, mean, median, mode, min, max, range, variance, stdDev, sampleVariance, sampleStdDev, q1, q3, iqr, sorted }
}

function fmt(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e12) return String(n)
  return parseFloat(n.toPrecision(10)).toString()
}

export default function StatisticsCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState<string>((initialState?.input as string) ?? '')
  const [result, setResult] = useState<StatsResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const calculate = useCallback(() => {
    const { values, errors: parseErrors } = parseNumbers(input)
    setErrors(parseErrors)

    if (values.length === 0) {
      setResult(null)
      return
    }

    const stats = computeStats(values)
    setResult(stats)

    onOutput(
      { values },
      {
        count: stats.count,
        sum: stats.sum,
        mean: stats.mean,
        median: stats.median,
        mode: stats.mode,
        min: stats.min,
        max: stats.max,
        variance: stats.variance,
        stdDev: stats.stdDev,
        sampleVariance: stats.sampleVariance,
        sampleStdDev: stats.sampleStdDev,
        q1: stats.q1,
        q3: stats.q3,
        iqr: stats.iqr,
      }
    )
  }, [input, onOutput])

  const copyResults = useCallback(() => {
    if (!result) return
    const modeStr = result.mode ? result.mode.map(fmt).join(', ') : t('stats.no_mode')
    const text = [
      `${t('stats.count')}     : ${result.count}`,
      `${t('stats.sum')}        : ${fmt(result.sum)}`,
      `${t('stats.mean')}    : ${fmt(result.mean)}`,
      `${t('stats.median')}              : ${fmt(result.median)}`,
      `${t('stats.mode')}        : ${modeStr}`,
      `${t('stats.min')}             : ${fmt(result.min)}`,
      `${t('stats.max')}            : ${fmt(result.max)}`,
      `${t('stats.range')}               : ${fmt(result.range)}`,
      `${t('stats.variance')} : ${fmt(result.variance)}`,
      `${t('stats.std_dev')}  : ${fmt(result.stdDev)}`,
      `${t('stats.sample_variance')}   : ${fmt(result.sampleVariance)}`,
      `${t('stats.sample_std_dev')}    : ${fmt(result.sampleStdDev)}`,
      `${t('stats.q1')}      : ${fmt(result.q1)}`,
      `${t('stats.q3')}      : ${fmt(result.q3)}`,
      `${t('stats.iqr')}       : ${fmt(result.iqr)}`,
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result, t])

  const modeDisplay = result
    ? result.mode
      ? result.mode.map(fmt).join(', ')
      : t('stats.no_mode')
    : null

  const statRows: { label: string; value: string }[] = result
    ? [
        { label: t('stats.count'), value: String(result.count) },
        { label: t('stats.sum'), value: fmt(result.sum) },
        { label: t('stats.mean'), value: fmt(result.mean) },
        { label: t('stats.median'), value: fmt(result.median) },
        { label: t('stats.mode'), value: modeDisplay! },
        { label: t('stats.min'), value: fmt(result.min) },
        { label: t('stats.max'), value: fmt(result.max) },
        { label: t('stats.range'), value: fmt(result.range) },
        { label: t('stats.variance'), value: fmt(result.variance) },
        { label: t('stats.std_dev'), value: fmt(result.stdDev) },
        { label: t('stats.sample_variance'), value: fmt(result.sampleVariance) },
        { label: t('stats.sample_std_dev'), value: fmt(result.sampleStdDev) },
        { label: t('stats.q1'), value: fmt(result.q1) },
        { label: t('stats.q3'), value: fmt(result.q3) },
        { label: t('stats.iqr'), value: fmt(result.iqr) },
      ]
    : []

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('stats.enter_numbers')}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('stats.enter_numbers')}
          rows={5}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono resize-y"
          spellCheck={false}
        />
        {errors.length > 0 && (
          <p className="text-xs text-destructive">
            {t('stats.invalid_skip')}: {errors.join(', ')}
          </p>
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
        {result && (
          <button
            onClick={copyResults}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {copied ? t('action.copied') : t('stats.copy_results')}
          </button>
        )}
        {input && (
          <button
            onClick={() => { setInput(''); setResult(null); setErrors([]) }}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {t('action.reset')}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Stats table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {statRows.map(({ label, value }, i) => (
                  <tr key={label} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                    <td className="px-4 py-2 text-muted-foreground font-medium whitespace-nowrap">{label}</td>
                    <td className="px-4 py-2 font-mono font-semibold text-right break-all">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sorted values */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t('stats.sorted')}</p>
            <div className="rounded-md bg-muted p-4 font-mono text-sm break-all leading-relaxed">
              {result.sorted.map(fmt).join(', ')}
            </div>
          </div>
        </div>
      )}

      {!result && !input && (
        <p className="text-sm text-muted-foreground">
          {t('stats.enter_numbers')}
        </p>
      )}
    </div>
  )
}
