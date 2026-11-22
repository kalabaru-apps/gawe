'use client'

/**
 * HoursCalculator — Paper domain (category = office).
 * Timesheet ledger with ruled rows, running total.
 * Uses Paper primitives for the ledger feel.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Region, Btn, CopyBtn, Empty, Stat } from '@/components/domain'

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

  const summaryText = useMemo(() => [
    'Working Hours Summary',
    '=====================',
    `Total days:  ${totalDays}`,
    `Total hours: ${totalHours.toFixed(2)} (${decimalToHHMM(totalHours)})`,
    `Average:     ${avgHours.toFixed(2)} h/day`,
    `Overtime:    ${overtimeHours.toFixed(2)} h`,
    `Standard:    ${standardHours} h/day`,
    '',
    ...enabledEntries.map((e) => {
      const h = calcHours(e)
      return `${e.date}  ${e.label ? e.label.padEnd(16) : ''.padEnd(16)}  ${e.startTime}–${e.endTime}  ${h !== null ? h.toFixed(2) + 'h' : '?'}`
    }),
  ].join('\n'), [enabledEntries, totalDays, totalHours, avgHours, overtimeHours, standardHours])

  return (
    <div className="h-full flex flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4">
        {/* Top controls */}

        {/* Ledger table */}
        {entries.length === 0 ? (
          <Empty
            title={t('common.history_empty', 'No entries yet')}
            action={<Btn onClick={addRow}><Plus className="h-3.5 w-3.5" aria-hidden /> {t('action.add', 'Add')} Row</Btn>}
          >
            {t('office.hours_empty_desc', 'Click "Add Row" to start logging work hours.')}
          </Empty>
        ) : (
          <Region domain="workbench" className="min-h-0 flex-1 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-d-border text-left text-xs text-d-muted">
                    <th className="pb-2 pr-4 font-medium w-32">{t('office.date', 'Date')}</th>
                    <th className="pb-2 pr-4 font-medium w-36">{t('common.name', 'Label')}</th>
                    <th className="pb-2 pr-4 font-medium w-24">{t('common.start', 'Start')}</th>
                    <th className="pb-2 pr-4 font-medium w-24">{t('common.end', 'End')}</th>
                    <th className="pb-2 pr-4 font-medium w-28">{t('office.break_min', 'Break (min)')}</th>
                    <th className="pb-2 pr-4 font-medium text-right w-24">{t('office.hours', 'Hours')}</th>
                    <th className="pb-2 font-medium w-12 text-center">{t('common.on', 'On')}</th>
                    <th className="pb-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const h = calcHours(entry)
                    const isOT = h !== null && h > standardHours
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-d-border/50 transition-colors ${!entry.enabled ? 'opacity-40' : ''}`}
                      >
                        <td className="py-2 pr-4">
                          <input
                            type="date"
                            value={entry.date}
                            onChange={(e) => patchEntry(entry.id, { date: e.target.value })}
                            className="w-full rounded-d border border-d-border bg-d-raised px-2 py-1 text-xs text-d-ink outline-none focus:ring-1 focus:ring-d-accent"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={entry.label}
                            onChange={(e) => patchEntry(entry.id, { label: e.target.value })}
                            placeholder={t('common.name', 'Label')}
                            className="w-full rounded-d border border-d-border bg-d-raised px-2 py-1 text-xs text-d-ink outline-none focus:ring-1 focus:ring-d-accent"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="time"
                            value={entry.startTime}
                            onChange={(e) => patchEntry(entry.id, { startTime: e.target.value })}
                            className="w-full rounded-d border border-d-border bg-d-raised px-2 py-1 text-xs text-d-ink outline-none focus:ring-1 focus:ring-d-accent"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="time"
                            value={entry.endTime}
                            onChange={(e) => patchEntry(entry.id, { endTime: e.target.value })}
                            className="w-full rounded-d border border-d-border bg-d-raised px-2 py-1 text-xs text-d-ink outline-none focus:ring-1 focus:ring-d-accent"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="number"
                            min={0}
                            value={entry.breakMinutes}
                            onChange={(e) => patchEntry(entry.id, { breakMinutes: Math.max(0, Number(e.target.value)) })}
                            className="w-full rounded-d border border-d-border bg-d-raised px-2 py-1 text-xs text-d-ink outline-none focus:ring-1 focus:ring-d-accent"
                          />
                        </td>
                        <td className={`py-2 pr-4 text-right font-mono text-xs ${isOT ? 'text-amber-500' : 'text-d-ink'}`}>
                          {h !== null ? `${h.toFixed(2)}h` : '—'}
                          {isOT && <span className="ml-1 text-amber-500/70">(+{(h - standardHours).toFixed(2)})</span>}
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={(e) => patchEntry(entry.id, { enabled: e.target.checked })}
                            className="accent-d-accent"
                          />
                        </td>
                        <td className="py-2">
                          <Btn size="sm" variant="quiet" onClick={() => removeRow(entry.id)} aria-label={t('common.delete', 'Delete')}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Btn>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
            </table>
          </Region>
        )}

        {/* Summary */}
        {totalDays > 0 && (
          <div className="flex flex-col gap-4 border-t border-d-border pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label={t('office.total_days', 'Total days')} value={String(totalDays)} tone="display" />
              <Stat label={t('office.total_hours', 'Total hours')} value={`${totalHours.toFixed(2)}h`} note={decimalToHHMM(totalHours)} tone="display" />
              <Stat label={t('office.avg_per_day', 'Average/day')} value={`${avgHours.toFixed(2)}h`} tone="display" />
              <Stat label={t('office.overtime', 'Overtime')} value={`${overtimeHours.toFixed(2)}h`} tone={overtimeHours > 0 ? 'display' : 'mono'} note={overtimeHours > 0 ? t('office.overtime_warn', 'Above standard') : ''} />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <div className="col-span-2 sm:col-span-4">
                <Btn size="sm" variant="quiet" onClick={clearAll} className="col-span-2 sm:col-span-4 justify-self-end text-red-500 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> {t('action.clear', 'Clear All')}
                </Btn>
                <Btn size="sm" variant="quiet" onClick={addRow} className="col-span-2 sm:col-span-4 justify-self-end">
                  <Plus className="h-3.5 w-3.5" aria-hidden /> {t('action.add', 'Add')} Row
                </Btn>
              </div>
              <CopyBtn value={summaryText} label={t('action.copy', 'Copy')} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}