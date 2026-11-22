'use client'

import { useState, useEffect, useRef } from 'react'
import { fromUnixTime, format, getUnixTime, formatDistanceToNow } from 'date-fns'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Row, CopyBtn, Stat, Section, Field, TextInput, Btn, Notice, Scroll, Seg } from '@/components/domain'
import { Clock, Copy } from 'lucide-react'

/** Workbench: live "now" ticker, paste anything, show all formats and zones with copy */

type Mode = 'ts-to-date' | 'date-to-ts'

interface OutputRow {
  label: string
  value: string
}

export default function TimestampConverter({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'ts-to-date')
  const [tsInput, setTsInput] = useState((initialState?.tsInput as string) ?? String(Math.floor(Date.now() / 1000)))
  const [dateInput, setDateInput] = useState((initialState?.dateInput as string) ?? new Date().toISOString().slice(0, 16))
  const [rows, setRows] = useState<OutputRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)
  const [now, setNow] = useState(Date.now())

  // Live ticker
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      let date: Date
      if (mode === 'ts-to-date') {
        const raw = tsInput.trim()
        if (!raw) { setRows([]); return }
        const num = Number(raw)
        if (isNaN(num)) throw new Error('Not a valid number')
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
      if (!firedRef.current) { analytics.buttonClick('timestamp-converter', 'convert'); firedRef.current = true }
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
    <Region domain="workbench">
      <Scroll>
        <Column width="md">
          <Section title={t('dev.timestamp_converter', 'Timestamp Converter')}>
            <Seg<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: 'ts-to-date', label: t('dev.timestamp_to_date', 'Timestamp → Date') },
                { value: 'date-to-ts', label: t('dev.date_to_timestamp', 'Date → Timestamp') },
              ]}
              label={t('dev.mode', 'Mode')}
            />
          </Section>

          <Section title={mode === 'ts-to-date' ? t('dev.unix_timestamp', 'Unix Timestamp') : t('dev.date_to_timestamp', 'Date & Time')}>
            {mode === 'ts-to-date' ? (
              <div className="space-y-2">
                <Field
                  id="ts-input"
                  label={t('dev.unix_timestamp', 'Unix Timestamp')}
                  hint={t('dev.auto_detect', 'Auto-detects seconds vs milliseconds')}
                >
                  <TextInput
                    mono
                    value={tsInput}
                    onChange={e => setTsInput(e.target.value)}
                    placeholder="1703001600"
                    aria-label="Unix timestamp input"
                  />
                </Field>
                <Btn variant="secondary" onClick={() => setTsInput(String(Math.floor(now / 1000)))}>
                  {t('common.now', 'Now')} ({format(new Date(now), 'HH:mm:ss')})
                </Btn>
              </div>
            ) : (
              <Field
                id="date-input"
                label={t('dev.date_to_timestamp', 'Date & Time')}
              >
                <input
                  type="datetime-local"
                  value={dateInput}
                  onChange={e => setDateInput(e.target.value)}
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink placeholder:text-d-muted/70 focus-visible:border-d-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-d-accent font-mono"
                />
              </Field>
            )}
          </Section>

          {error && <Notice tone="error">{error}</Notice>}

          {rows.length > 0 && (
            <Section title={t('action.result', 'Result')}>
              <div className="space-y-2">
                {rows.map((row) => (
                  <Row key={row.label} label={row.label} value={row.value} copy mono />
                ))}
              </div>
            </Section>
          )}

          {rows.length === 0 && !error && (
            <Notice tone="info">{t('action.result', 'Enter a timestamp or date to see all formats')}</Notice>
          )}
        </Column>
      </Scroll>
    </Region>
  )
}