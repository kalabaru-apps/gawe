'use client'

import { useState, useEffect, useRef } from 'react'
import cronstrue from 'cronstrue'
import { CronExpressionParser } from 'cron-parser'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, Pane, CodeArea, Chip, Row, Notice, Stat, Region, CopyBtn, SplitPane, WbButton, Btn, TextInput, Section, Field, IconBtn } from '@/components/domain'
import { Calendar, Copy, X } from 'lucide-react'

/** Instrument + Workbench: human sentence readout, field pickers, next 5 run times */
const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at noon', value: '0 12 * * *' },
  { label: 'Weekly (Sunday midnight)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
  { label: 'Weekdays at 9am', value: '0 9 * * 1-5' },
]

export default function CronBuilder({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [expression, setExpression] = useState((initialState?.expression as string) ?? '0 9 * * 1-5')
  const [description, setDescription] = useState('')
  const [nextRuns, setNextRuns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!expression.trim()) return
    try {
      const desc = cronstrue.toString(expression, { throwExceptionOnParseError: true })
      const cron = CronExpressionParser.parse(expression, { currentDate: new Date() })
      const runs: string[] = []
      for (let i = 0; i < 5; i++) {
        runs.push(cron.next().toDate().toLocaleString())
      }
      setDescription(desc)
      setNextRuns(runs)
      setError(null)
      if (!firedRef.current) { analytics.buttonClick('cron-builder', 'parse'); firedRef.current = true }
      onOutput({ expression }, { description: desc, nextRuns: runs })
    } catch (e) {
      setError((e as Error).message)
      setDescription('')
      setNextRuns([])
    }
  }, [expression])

  const fields = expression.trim().split(/\s+/)
  const fieldLabels = ['Minute', 'Hour', 'Day (Month)', 'Month', 'Day (Week)']

  return (
    <Region domain="instrument">
      <div className="mx-auto max-w-xl h-full flex flex-col">
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <Section title={t('dev.cron_expression', 'Cron Expression')}>
            <Field
              id="cron-expression"
              label={t('dev.cron_expression', 'Cron Expression')}
              hint={t('dev.cron_hint', '5 fields: minute hour day month weekday')}
            >
              <TextInput
                mono
                value={expression}
                onChange={e => setExpression(e.target.value)}
                placeholder="* * * * *"
              />
            </Field>
            {fields.length === 5 && (
              <div className="flex gap-1 mt-2 overflow-x-auto">
                {fields.map((f, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[70px] px-2 py-2 rounded-d bg-d-surface border border-d-border">
                    <span className="font-mono text-sm text-d-ink">{f}</span>
                    <span className="text-[10px] text-d-muted">{fieldLabels[i]}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={t('common.examples', 'Presets')}>
            <div className="grid gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setExpression(p.value)}
                  className="flex items-center justify-between rounded-d border border-d-border bg-d-raised p-3 text-left hover:bg-d-border/40 transition-colors"
                >
                  <span className="text-sm">{p.label}</span>
                  <span className="font-mono text-xs text-d-muted shrink-0">{p.value}</span>
                </button>
              ))}
            </div>
          </Section>

          {error && <Notice tone="error">{error}</Notice>}
        </div>

        <div className="border-t border-d-border p-6 space-y-4">
          {description && (
            <div className="rounded-d border border-d-border bg-d-raised p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-base">{description}</p>
                <CopyBtn value={description} label={t('action.copy', 'Copy')} />
              </div>
            </div>
          )}

          {nextRuns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-d-muted mb-2">{t('dev.next_runs', 'Next 5 runs')}</p>
              <div className="space-y-2">
                {nextRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-d border border-d-border bg-d-raised p-3">
                    <span className="w-6 text-center text-xs text-d-muted">{i + 1}</span>
                    <span className="font-mono text-sm flex-1">{run}</span>
                    <CopyBtn value={run} size="sm" label="" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!description && !error && (
            <p className="text-sm text-d-muted text-center">{t('dev.cron_description', 'Enter a valid cron expression to see its schedule')}</p>
          )}
        </div>
      </div>
    </Region>
  )
}