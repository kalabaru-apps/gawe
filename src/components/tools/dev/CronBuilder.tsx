'use client'

import { useState, useEffect, useRef } from 'react'
import cronstrue from 'cronstrue'
import { CronExpressionParser } from 'cron-parser'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at noon', value: '0 12 * * *' },
  { label: 'Weekly (Sunday midnight)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
  { label: 'Weekdays at 9am', value: '0 9 * * 1-5' },
]

export default function CronBuilder({ onOutput, initialState }: ToolProps) {
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
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.cron_expression', 'Cron Expression')}</label>
            <input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="* * * * *"
              spellCheck={false}
            />
            {fields.length === 5 && (
              <div className="flex gap-1 mt-1">
                {fields.map((f, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="font-mono text-xs bg-muted/50 rounded px-1 py-0.5 text-foreground">{f}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{fieldLabels[i]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('common.examples', 'Presets')}</p>
            <div className="grid grid-cols-1 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setExpression(p.value)}
                  className="text-left px-3 py-2 rounded-md border border-input hover:bg-muted/50 transition-colors text-sm flex justify-between items-center gap-2"
                >
                  <span>{p.label}</span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">{p.value}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-4">
          {description && (
            <div className="rounded-md border border-input bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{description}</p>
                <CopyButton value={description} />
              </div>
            </div>
          )}
          {nextRuns.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t('dev.next_runs', 'Next 5 runs')}</p>
              <div className="space-y-1">
                {nextRuns.map((run, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="font-mono">{run}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!description && !error && (
            <p className="text-sm text-muted-foreground">{t('dev.cron_description', 'Enter a valid cron expression to see its schedule')}</p>
          )}
        </div>
      }
    />
  )
}
