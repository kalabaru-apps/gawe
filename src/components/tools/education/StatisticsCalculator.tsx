'use client'

/**
 * Statistics Calculator — Paper domain (education category).
 * Paper: serif headings, ruled Sheet, printed Result cards, live summary table.
 * Paste data, live compute, copy results. No Calculate button.
 */

import { useState, useCallback, useMemo } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Sheet, Page, Result, Column, Scroll, Region, Field, TextArea, Btn, Row, Notice, Empty, CopyBtn, Stat, Section } from '@/components/domain/kit'

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatisticsCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState<string>((initialState?.input as string) ?? '')
  const [copied, setCopied] = useState(false)

  const parsed = useMemo(() => parseNumbers(input), [input])
  const { values, errors } = parsed

  const result = useMemo(() => {
    if (values.length === 0) return null
    return computeStats(values)
  }, [values])

  // Fire analytics + onOutput when result changes
  const prevResultRef = useState<StatsResult | null>(result)[0]
  if (prevResultRef !== result && result) {
    analytics.buttonClick('statistics-calculator', 'calculate')
    onOutput(
      { values },
      {
        count: result.count,
        sum: result.sum,
        mean: result.mean,
        median: result.median,
        mode: result.mode,
        min: result.min,
        max: result.max,
        variance: result.variance,
        stdDev: result.stdDev,
        sampleVariance: result.sampleVariance,
        sampleStdDev: result.sampleStdDev,
        q1: result.q1,
        q3: result.q3,
        iqr: result.iqr,
      }
    )
  }

  const copyResults = useCallback(() => {
    if (!result) return
    const modeStr = result.mode ? result.mode.map(fmt).join(', ') : t('stats.no_mode', 'No mode')
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
      : t('stats.no_mode', 'No mode')
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
    <Scroll>
      <Column width="md">
        <Sheet>
          <header className="mb-6">
            <h1 className="font-serif text-2xl font-semibold text-d-ink mb-2">{t('stats.title', 'Statistics Calculator')}</h1>
            <p className="text-d-muted text-sm">{t('stats.description', 'Paste or type numbers (comma, space, or newline separated). Results update live.')}</p>
          </header>

          {/* Input */}
          <Section title={t('stats.enter_numbers', 'Data')} className="mb-4">
            <Field id="stats-input" label={t('stats.enter_numbers', 'Enter numbers')} hint={t('stats.hint', 'Separate with commas, spaces, or newlines')}>
              <TextArea
                id="stats-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('stats.placeholder', 'e.g. 1, 2, 3, 4, 5 or 10\n20\n30')}
                rows={6}
                mono
              />
            </Field>

            {errors.length > 0 && (
              <Notice tone="error" className="mt-3">
                {t('stats.invalid_skip', 'Skipped invalid entries')}: {errors.join(', ')}
              </Notice>
            )}
          </Section>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Btn variant="primary" onClick={copyResults} disabled={!result} className="min-w-0">
              <CopyBtn value="" label={copied ? t('action.copied', 'Copied') : t('stats.copy_results', 'Copy results')} size="md" />
            </Btn>
            {input && (
              <Btn variant="secondary" onClick={() => { setInput('') }}>
                {t('action.reset', 'Reset')}
              </Btn>
            )}
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Summary stats grid */}
              <Section title={t('stats.summary', 'Summary')} className="mb-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label={t('stats.count')} value={result.count} tone="display" />
                  <Stat label={t('stats.mean')} value={fmt(result.mean)} tone="display" />
                  <Stat label={t('stats.median')} value={fmt(result.median)} tone="display" />
                  <Stat label={t('stats.std_dev')} value={fmt(result.stdDev)} tone="display" />
                </div>
              </Section>

              {/* Detailed results */}
              <Page className="mb-4 space-y-3">
                <h2 className="font-serif text-lg font-semibold">{t('stats.details', 'Detailed Statistics')}</h2>
                <div className="space-y-2 border-t border-d-border pt-3">
                  {statRows.map(({ label, value }, i) => (
                    <Row key={label} label={label} value={value} mono />
                  ))}
                </div>
              </Page>

              {/* Quartiles box */}
              <Page className="mb-4">
                <h2 className="font-serif text-lg font-semibold mb-3">{t('stats.quartiles', 'Quartiles')}</h2>
                <div className="grid gap-4 sm:grid-cols-4">
                  <Result label={t('stats.min', 'Min')} value={fmt(result.min)} />
                  <Result label={t('stats.q1', 'Q1')} value={fmt(result.q1)} />
                  <Result label={t('stats.median', 'Median')} value={fmt(result.median)} />
                  <Result label={t('stats.q3', 'Q3')} value={fmt(result.q3)} />
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Result label={t('stats.max', 'Max')} value={fmt(result.max)} />
                  <Result label={t('stats.iqr', 'IQR')} value={fmt(result.iqr)} />
                  <Result label={t('stats.range', 'Range')} value={fmt(result.range)} />
                </div>
              </Page>

              {/* Sorted values */}
              <Page>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-serif text-lg font-semibold">{t('stats.sorted', 'Sorted Values')}</h2>
                  <CopyBtn value={result.sorted.map(fmt).join(', ')} size="sm" />
                </div>
                <Region domain="workbench">
                  <div className="rounded-d border border-d-border bg-d-surface p-4 font-mono text-sm break-all leading-relaxed max-h-60 overflow-auto">
                    {result.sorted.map(fmt).join(', ')}
                  </div>
                </Region>
              </Page>
            </>
          )}

          {!result && !input && (
            <Empty
              title={t('stats.enter_numbers', 'Enter numbers')}
              children={t('stats.results_appear', 'Statistics appear here as you type.')}
            />
          )}

          {!result && input && (
            <Notice tone="info">
              {t('stats.need_valid', 'Enter at least one valid number to see statistics.')}
            </Notice>
          )}
        </Sheet>
      </Column>
    </Scroll>
  )
}