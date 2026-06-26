'use client'

import { useState, useEffect } from 'react'
import { fromUnixTime, format, getUnixTime, formatDistanceToNow, parseISO } from 'date-fns'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'

type Mode = 'ts-to-date' | 'date-to-ts'

interface OutputRow {
  label: string
  value: string
}

export default function TimestampConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'ts-to-date')
  const [tsInput, setTsInput] = useState((initialState?.tsInput as string) ?? String(Math.floor(Date.now() / 1000)))
  const [dateInput, setDateInput] = useState((initialState?.dateInput as string) ?? new Date().toISOString().slice(0, 16))
  const [rows, setRows] = useState<OutputRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      let date: Date
      if (mode === 'ts-to-date') {
        const raw = tsInput.trim()
        if (!raw) { setRows([]); return }
        const num = Number(raw)
        if (isNaN(num)) throw new Error('Not a valid number')
        // Auto-detect ms vs s
        date = num > 1e10 ? new Date(num) : fromUnixTime(num)
      } else {
        if (!dateInput) { setRows([]); return }
        date = new Date(dateInput)
      }
      if (isNaN(date.getTime())) throw new Error('Invalid date')
      const unixS = getUnixTime(date)
      const unixMs = date.getTime()
      const result: OutputRow[] = [
        { label: t('dev.iso8601', 'ISO 8601'), value: date.toISOString() },
        { label: t('dev.utc', 'UTC'), value: date.toUTCString() },
        { label: t('dev.local', 'Local'), value: date.toLocaleString() },
        { label: t('dev.formatted', 'Formatted'), value: format(date, 'yyyy-MM-dd HH:mm:ss') },
        { label: t('dev.relative', 'Relative'), value: formatDistanceToNow(date, { addSuffix: true }) },
        { label: t('dev.unix_seconds', 'Unix (seconds)'), value: String(unixS) },
        { label: t('dev.unix_ms', 'Unix (milliseconds)'), value: String(unixMs) },
      ]
      setRows(result)
      setError(null)
      onOutput(
        mode === 'ts-to-date' ? { timestamp: tsInput } : { date: dateInput },
        { iso: date.toISOString(), unixSeconds: unixS, unixMs }
      )
    } catch (e) {
      setError((e as Error).message)
      setRows([])
    }
  }, [mode, tsInput, dateInput])

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['ts-to-date', 'date-to-ts'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                  mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'
                }`}
              >
                {m === 'ts-to-date' ? t('dev.timestamp_to_date', 'Timestamp → Date') : t('dev.date_to_timestamp', 'Date → Timestamp')}
              </button>
            ))}
          </div>
          {mode === 'ts-to-date' ? (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.unix_timestamp', 'Unix Timestamp')}</label>
              <div className="flex gap-2">
                <input
                  value={tsInput}
                  onChange={(e) => setTsInput(e.target.value)}
                  className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                  placeholder="1703001600"
                />
                <button
                  onClick={() => setTsInput(String(Math.floor(Date.now() / 1000)))}
                  className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors"
                >
                  {t('common.now', 'Now')}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('dev.auto_detect', 'Auto-detects seconds vs milliseconds')}</p>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.date_to_timestamp', 'Date & Time')}</label>
              <input
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-2">
          {rows.length > 0 ? (
            rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="font-mono text-sm mt-0.5">{row.value}</p>
                </div>
                <CopyButton value={row.value} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('action.result', 'Enter a timestamp or date to see all formats')}</p>
          )}
        </div>
      }
    />
  )
}
