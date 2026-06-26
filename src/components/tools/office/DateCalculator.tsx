'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import {
  differenceInDays, differenceInCalendarWeeks, differenceInMonths, differenceInYears,
  addDays, addWeeks, addMonths, addYears, format, eachDayOfInterval, isWeekend,
} from 'date-fns'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'

type Tab = 'diff' | 'add'
type AddUnit = 'days' | 'weeks' | 'months' | 'years'

const today = format(new Date(), 'yyyy-MM-dd')

export default function DateCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('diff')
  // Diff tab
  const [date1, setDate1] = useState((initialState?.date1 as string) ?? today)
  const [date2, setDate2] = useState((initialState?.date2 as string) ?? today)
  // Add tab
  const [baseDate, setBaseDate] = useState(today)
  const [addAmount, setAddAmount] = useState(30)
  const [addUnit, setAddUnit] = useState<AddUnit>('days')
  const [addDir, setAddDir] = useState<1 | -1>(1)

  function computeDiff() {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const days = Math.abs(differenceInDays(d2, d1))
    const weeks = Math.abs(differenceInCalendarWeeks(d2, d1))
    const months = Math.abs(differenceInMonths(d2, d1))
    const years = Math.abs(differenceInYears(d2, d1))
    const [start, end] = d1 <= d2 ? [d1, d2] : [d2, d1]
    const allDays = days > 0 ? eachDayOfInterval({ start, end }) : []
    const businessDays = allDays.filter((d) => !isWeekend(d)).length
    return { days, weeks, months, years, businessDays, direction: d2 >= d1 ? 'after' : 'before' }
  }

  function computeAdd() {
    const base = new Date(baseDate)
    const amount = addAmount * addDir
    let result: Date
    switch (addUnit) {
      case 'days': result = addDays(base, amount); break
      case 'weeks': result = addWeeks(base, amount); break
      case 'months': result = addMonths(base, amount); break
      case 'years': result = addYears(base, amount); break
    }
    return { result: format(result, 'MMMM d, yyyy'), iso: format(result, 'yyyy-MM-dd') }
  }

  const diff = tab === 'diff' ? computeDiff() : null
  const added = tab === 'add' ? computeAdd() : null

  useEffect(() => {
    if (diff) onOutput({ date1, date2 }, { days: diff.days, businessDays: diff.businessDays })
    if (added) onOutput({ baseDate, addAmount, addUnit, addDir }, { result: added.result })
  }, [tab, date1, date2, baseDate, addAmount, addUnit, addDir, diff, added, onOutput])

  const DIFF_ROWS = diff ? [
    { label: t('office.days', 'Days'), value: String(diff.days) },
    { label: t('office.difference', 'Business Days'), value: String(diff.businessDays) },
    { label: t('office.weeks', 'Weeks'), value: String(diff.weeks) },
    { label: t('office.months', 'Months'), value: String(diff.months) },
    { label: t('office.years', 'Years'), value: String(diff.years) },
  ] : []

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-1 border border-input rounded-md p-0.5">
            {(['diff', 'add'] as Tab[]).map((tabItem) => (
              <button key={tabItem} onClick={() => setTab(tabItem)}
                className={`flex-1 py-1.5 rounded text-sm transition-colors ${tab === tabItem ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
                {tabItem === 'diff' ? t('office.date_from', 'Date Difference') : t('action.calculate', 'Add / Subtract')}
              </button>
            ))}
          </div>
          {tab === 'diff' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.date_from', 'Start Date')}</label>
                <input type="date" value={date1} onChange={(e) => setDate1(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.date_to', 'End Date')}</label>
                <input type="date" value={date2} onChange={(e) => setDate2(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.date_from', 'Base Date')}</label>
                <input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAddDir(1)} className={`flex-1 py-2 rounded-md text-sm border transition-colors ${addDir === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'border-input hover:bg-muted/50'}`}>+ {t('action.add', 'Add')}</button>
                <button onClick={() => setAddDir(-1)} className={`flex-1 py-2 rounded-md text-sm border transition-colors ${addDir === -1 ? 'bg-rose-500/20 text-rose-400 border-rose-500' : 'border-input hover:bg-muted/50'}`}>− {t('action.remove', 'Subtract')}</button>
              </div>
              <div className="flex gap-2">
                <input type="number" min={1} value={addAmount} onChange={(e) => setAddAmount(Math.max(1, Number(e.target.value)))}
                  className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
                <select value={addUnit} onChange={(e) => setAddUnit(e.target.value as AddUnit)}
                  className="text-sm border border-input rounded-md px-2 py-2 bg-background outline-none">
                  {(['days', 'weeks', 'months', 'years'] as AddUnit[]).map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      }
      right={
        <div className="space-y-3">
          {tab === 'diff' && DIFF_ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{r.value}</span>
                <CopyButton value={r.value} />
              </div>
            </div>
          ))}
          {tab === 'add' && added && (
            <div className="rounded-md border border-input p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('action.result', 'Result')}</p>
              <p className="text-2xl font-semibold">{added.result}</p>
              <p className="font-mono text-sm text-muted-foreground mt-1">{added.iso}</p>
              <div className="flex gap-2 mt-3">
                <CopyButton value={added.result} />
                <CopyButton value={added.iso} />
              </div>
            </div>
          )}
        </div>
      }
    />
  )
}
