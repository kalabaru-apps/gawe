'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { differenceInDays, differenceInCalendarWeeks, differenceInMonths, differenceInYears, addDays, addWeeks, addMonths, addYears, format, eachDayOfInterval, isWeekend } from 'date-fns'
import type { ToolProps } from '@/types'
import { Sheet, Page, Section, Btn, Field, TextInput, Select, Stat, CopyBtn, Column, Scroll, Seg } from '@/components/domain/kit'
import { Plus, Minus } from 'lucide-react'

type Tab = 'diff' | 'add'
type AddUnit = 'days' | 'weeks' | 'months' | 'years'

const today = format(new Date(), 'yyyy-MM-dd')

export default function DateCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('diff')
  const [date1, setDate1] = useState((initialState?.date1 as string) ?? today)
  const [date2, setDate2] = useState((initialState?.date2 as string) ?? today)
  const [baseDate, setBaseDate] = useState(today)
  const [addAmount, setAddAmount] = useState(30)
  const [addUnit, setAddUnit] = useState<AddUnit>('days')
  const [addDir, setAddDir] = useState<1 | -1>(1)
  const firedRef = useRef(false)

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
    return { result: format(result, 'MMMM d, yyyy'), iso: format(result, 'yyyy-MM-dd'), day: format(result, 'EEEE') }
  }

  const validDates = [date1, date2, baseDate].every((d) => !Number.isNaN(new Date(d).getTime()))
  const diff = tab === 'diff' && validDates ? computeDiff() : null
  const added = tab === 'add' && validDates ? computeAdd() : null

  useEffect(() => {
    if (diff) {
      if (!firedRef.current) { analytics.buttonClick('date-calculator', 'calculate'); firedRef.current = true }
      onOutput({ date1, date2 }, { days: diff.days, businessDays: diff.businessDays })
    }
    if (added) {
      if (!firedRef.current) { analytics.buttonClick('date-calculator', 'calculate'); firedRef.current = true }
      onOutput({ baseDate, addAmount, addUnit, addDir }, { result: added.result })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, date1, date2, baseDate, addAmount, addUnit, addDir, validDates])

  const dirText = diff ? `${date2} ${t(`office.${diff.direction}`, diff.direction)} ${date1}` : ''

  return (
    <Scroll>
      <Column width="lg">
        <Sheet>
          <h1 className="font-serif text-2xl font-semibold mb-1">{t('office.date_calculator', 'Date Calculator')}</h1>
          <p className="text-d-muted text-sm mb-6">{t('office.date_calculator_desc', 'Calculate difference between dates or add/subtract time. Results update live.')}</p>

          <Seg<Tab> value={tab} onChange={setTab} options={[{ value: 'diff', label: t('office.date_diff', 'Date Difference') }, { value: 'add', label: t('office.date_add', 'Add / Subtract') }]} label={t('office.date_calculator', 'Date Calculator')} className="mb-4" />

          {tab === 'diff' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Page>
                <Section title={t('office.date_from', 'Dates')}>
                  <Field id="dc-from" label={t('office.date_from', 'Start Date')}>
                    <TextInput id="dc-from" type="date" value={date1} onChange={(e) => setDate1(e.target.value)} />
                  </Field>
                  <Field id="dc-to" label={t('office.date_to', 'End Date')}>
                    <TextInput id="dc-to" type="date" value={date2} onChange={(e) => setDate2(e.target.value)} />
                  </Field>
                </Section>
              </Page>
              <Page>
                <Section title={t('action.result', 'Result')}>
                  {diff ? (
                    <div className="space-y-3">
                      <Stat label={t('office.days', 'Days')} value={String(diff.days)} tone="serif" />
                      <div className="grid grid-cols-2 gap-3">
                        <Stat label={t('office.business_days', 'Business days')} value={String(diff.businessDays)} />
                        <Stat label={t('office.weeks', 'Weeks')} value={String(diff.weeks)} />
                        <Stat label={t('office.months', 'Months')} value={String(diff.months)} />
                        <Stat label={t('office.years', 'Years')} value={String(diff.years)} />
                      </div>
                      <p className="border-t border-d-border pt-3 text-sm text-d-muted">{dirText}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-d-muted">{t('office.date_invalid', 'Enter valid dates.')}</p>
                  )}
                </Section>
              </Page>
            </div>
          )}

          {tab === 'add' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Page>
                <Section title={t('office.date_add', 'Add / Subtract')}>
                  <Field id="dc-base" label={t('office.date_from', 'Base Date')}>
                    <TextInput id="dc-base" type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} />
                  </Field>
                  <div className="flex gap-2">
                    <Btn variant={addDir === 1 ? 'primary' : 'secondary'} aria-pressed={addDir === 1} onClick={() => setAddDir(1)}>
                      <Plus className="h-3.5 w-3.5" aria-hidden /> {t('action.add', 'Add')}
                    </Btn>
                    <Btn variant={addDir === -1 ? 'primary' : 'secondary'} aria-pressed={addDir === -1} onClick={() => setAddDir(-1)}>
                      <Minus className="h-3.5 w-3.5" aria-hidden /> {t('action.remove', 'Subtract')}
                    </Btn>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field id="dc-amount" label={t('office.amount', 'Amount')}>
                      <TextInput id="dc-amount" type="number" min={1} value={addAmount} onChange={(e) => setAddAmount(Math.max(1, Number(e.target.value)))} />
                    </Field>
                    <Field id="dc-unit" label={t('office.unit', 'Unit')}>
                      <Select id="dc-unit" value={addUnit} onChange={(e) => setAddUnit(e.target.value as AddUnit)}>
                        <option value="days">{t('office.days', 'Days')}</option>
                        <option value="weeks">{t('office.weeks', 'Weeks')}</option>
                        <option value="months">{t('office.months', 'Months')}</option>
                        <option value="years">{t('office.years', 'Years')}</option>
                      </Select>
                    </Field>
                  </div>
                </Section>
              </Page>
              <Page>
                <Section title={t('action.result', 'Result')}>
                  {added ? (
                    <div className="space-y-3">
                      <Stat label={added.day} value={added.result} tone="serif" note={added.iso} />
                      <div className="flex flex-wrap gap-2 pt-1">
                        <CopyBtn value={added.result} label={t('action.copy', 'Copy')} />
                        <CopyBtn value={added.iso} label="ISO" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-d-muted">{t('office.date_invalid', 'Enter valid dates.')}</p>
                  )}
                </Section>
              </Page>
            </div>
          )}
        </Sheet>
      </Column>
    </Scroll>
  )
}
