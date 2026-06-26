'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface TimeEntry {
  id: string
  date: string
  label: string
  startTime: string
  endTime: string
  breakMinutes: number
  enabled: boolean
}

const STORAGE_KEY = 'gawe-hours-calculator'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseMinutes(hhmm: string): number | null {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

function calcHours(entry: TimeEntry): number | null {
  const start = parseMinutes(entry.startTime)
  const end = parseMinutes(entry.endTime)
  if (start === null || end === null) return null
  let diff = end - start
  if (diff < 0) diff += 24 * 60
  diff -= entry.breakMinutes
  return Math.max(0, diff / 60)
}

function decimalToHHMM(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function loadEntries(): TimeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as TimeEntry[]
  } catch {
    // ignore
  }
  return []
}

function saveEntries(entries: TimeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // ignore
  }
}

export default function HoursCalculator({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [standardHours, setStandardHours] = useState(8)

  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  const update = useCallback((updated: TimeEntry[]) => {
    setEntries(updated)
    saveEntries(updated)
  }, [])

  const addRow = () => {
    update([
      ...entries,
      {
        id: makeId(),
        date: todayStr(),
        label: '',
        startTime: '09:00',
        endTime: '17:00',
        breakMinutes: 60,
        enabled: true,
      },
    ])
  }

  const removeRow = (id: string) => update(entries.filter((e) => e.id !== id))

  const patchEntry = (id: string, patch: Partial<TimeEntry>) => {
    update(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const clearAll = () => {
    update([])
    onOutput({ action: 'clear' }, {})
  }

  // Summary calc
  const enabledEntries = entries.filter((e) => e.enabled)
  const rowHours = enabledEntries.map((e) => calcHours(e)).filter((h): h is number => h !== null)
  const totalHours = rowHours.reduce((s, h) => s + h, 0)
  const totalDays = rowHours.length
  const avgHours = totalDays > 0 ? totalHours / totalDays : 0
  const overtimeHours = rowHours.reduce((s, h) => s + Math.max(0, h - standardHours), 0)

  const summaryText = [
    `Working Hours Summary`,
    `=====================`,
    `Total days:  ${totalDays}`,
    `Total hours: ${totalHours.toFixed(2)} (${decimalToHHMM(totalHours)})`,
    `Average:     ${avgHours.toFixed(2)} h/day`,
    `Overtime:    ${overtimeHours.toFixed(2)} h`,
    `Standard:    ${standardHours} h/day`,
    ``,
    ...enabledEntries.map((e) => {
      const h = calcHours(e)
      return `${e.date}  ${e.label ? e.label.padEnd(16) : ''.padEnd(16)}  ${e.startTime}–${e.endTime}  ${h !== null ? h.toFixed(2) + 'h' : '?'}`
    }),
  ].join('\n')

  return (
    <div className="flex flex-col gap-4">
      {/* Top controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <Button size="sm" onClick={() => { analytics.buttonClick('hours-calculator', 'calculate'); addRow() }}>+ {t('action.add', 'Add')} Row</Button>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-muted-foreground">{t('office.hours', 'Standard hours')}/{t('office.days', 'day')}:</label>
          <input
            type="number"
            min={1}
            max={24}
            value={standardHours}
            onChange={(e) => setStandardHours(Math.max(1, Math.min(24, Number(e.target.value))))}
            className="w-16 rounded border border-border bg-background text-foreground px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button size="sm" variant="outline" onClick={clearAll} className="ml-auto text-destructive border-destructive/40 hover:bg-destructive/10">
          {t('action.clear', 'Clear')} {t('common.all', 'all')}
        </Button>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          {t('common.history_empty', 'No entries yet.')} {t('action.add', 'Click')} "+ Add Row" to start.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2 px-1 font-medium">{t('office.date_from', 'Date')}</th>
                <th className="text-left py-2 px-1 font-medium">{t('common.name', 'Label')}</th>
                <th className="text-left py-2 px-1 font-medium">{t('common.start', 'Start')}</th>
                <th className="text-left py-2 px-1 font-medium">{t('common.stop', 'End')}</th>
                <th className="text-left py-2 px-1 font-medium">{t('office.minutes', 'Break')} (min)</th>
                <th className="text-right py-2 px-1 font-medium">{t('office.hours', 'Hours')}</th>
                <th className="text-center py-2 px-1 font-medium">On</th>
                <th className="py-2 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const h = calcHours(entry)
                const isOT = h !== null && h > standardHours
                return (
                  <tr key={entry.id} className={`border-b border-border/50 ${!entry.enabled ? 'opacity-40' : ''}`}>
                    <td className="py-1.5 px-1">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => patchEntry(entry.id, { date: e.target.value })}
                        className="rounded border border-border bg-background text-foreground text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => patchEntry(entry.id, { label: e.target.value })}
                        placeholder={t('common.name', 'Label')}
                        className="w-28 rounded border border-border bg-background text-foreground text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => patchEntry(entry.id, { startTime: e.target.value })}
                        className="rounded border border-border bg-background text-foreground text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => patchEntry(entry.id, { endTime: e.target.value })}
                        className="rounded border border-border bg-background text-foreground text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        min={0}
                        value={entry.breakMinutes}
                        onChange={(e) => patchEntry(entry.id, { breakMinutes: Math.max(0, Number(e.target.value)) })}
                        className="w-16 rounded border border-border bg-background text-foreground text-xs px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className={`py-1.5 px-1 text-right font-mono text-xs ${isOT ? 'text-yellow-500' : 'text-foreground'}`}>
                      {h !== null ? `${h.toFixed(2)}h` : '—'}
                      {isOT && <span className="ml-1 text-yellow-500/70">(+{(h - standardHours).toFixed(2)})</span>}
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={entry.enabled}
                        onChange={(e) => patchEntry(entry.id, { enabled: e.target.checked })}
                        className="accent-primary"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <button
                        onClick={() => removeRow(entry.id)}
                        className="text-xs text-destructive hover:text-destructive/70 px-1"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {totalDays > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label={`${t('office.total', 'Total')} ${t('office.days', 'days')}`} value={String(totalDays)} />
            <SummaryCard label={`${t('office.total', 'Total')} ${t('office.hours', 'hours')}`} value={`${totalHours.toFixed(2)}h`} sub={decimalToHHMM(totalHours)} />
            <SummaryCard label={`${t('office.rate', 'Average')} / ${t('office.days', 'day')}`} value={`${avgHours.toFixed(2)}h`} />
            <SummaryCard label={t('office.total', 'Overtime')} value={`${overtimeHours.toFixed(2)}h`} warn={overtimeHours > 0} />
          </div>
          <div className="flex justify-end">
            <CopyButton value={summaryText} />
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border bg-muted/10'}`}>
      <div className={`text-xl font-semibold ${warn ? 'text-yellow-500' : 'text-foreground'}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}
