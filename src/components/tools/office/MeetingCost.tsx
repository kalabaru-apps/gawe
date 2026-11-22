'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'
import { Users, DollarSign, Clock, RotateCcw, Play, Pause } from 'lucide-react'

export default function MeetingCost({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [attendees, setAttendees] = useState((initialState?.attendees as number) ?? 5)
  const [hourlyRate, setHourlyRate] = useState((initialState?.hourlyRate as number) ?? 75)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const costPerSecond = (attendees * hourlyRate) / 3600
  const totalCost = costPerSecond * elapsed

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning])

  function reset() {
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setElapsed(0)
  }

  function formatTime(s: number) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return [h, m, sec].map((v) => String(v).padStart(2, '0')).join(':')
  }

  useEffect(() => {
    if (elapsed > 0 && !isRunning) {
      onOutput({ attendees, hourlyRate, durationSeconds: elapsed }, { totalCost: totalCost.toFixed(2) })
    }
  }, [isRunning, elapsed])

  return (
    <Instrument>
      <h1 className="font-display text-sm font-semibold text-center text-d-muted mb-6">{t('office.meeting_cost', 'Meeting Cost')}</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-d-muted block">{t('office.attendees', 'Attendees')}</label>
          <input
            type="number"
            min={1}
            max={100}
            value={attendees}
            onChange={(e) => setAttendees(Math.max(1, Math.min(100, Number(e.target.value))))}
            className="w-full text-center text-lg font-mono border border-d-border rounded-d bg-d-raised px-3 py-2 outline-none focus-visible:border-d-accent focus-visible:outline-2 focus-visible:outline-d-accent"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-d-muted block">{t('office.hourly_rate', 'Avg Hourly Rate')} (USD)</label>
          <input
            type="number"
            min={1}
            step={0.01}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
            className="w-full text-center text-lg font-mono border border-d-border rounded-d bg-d-raised px-3 py-2 outline-none focus-visible:border-d-accent focus-visible:outline-2 focus-visible:outline-d-accent"
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <Readout label={t('office.meeting_cost', 'Meeting Cost')}>{`$${totalCost.toFixed(2)}`}</Readout>
        <div className="text-center">
          <span className="font-display text-2xl font-semibold tabular-nums text-d-muted">{formatTime(elapsed)}</span>
          <p className="text-xs text-d-muted">{t('office.elapsed', 'Elapsed')}</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-d-border">
          <div className="h-full bg-d-accent transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min((elapsed / 3600) * 100, 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Key accent onClick={() => { if (!isRunning) analytics.buttonClick('meeting-cost', 'start'); setIsRunning((r) => !r) }}>
          {isRunning ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          <span>{isRunning ? t('common.pause', 'Pause') : elapsed > 0 ? t('common.resume', 'Resume') : t('common.start', 'Start')}</span>
        </Key>
        <Key onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          {t('office.timer_reset', 'Reset')}
        </Key>
      </div>

      <div className="space-y-2 p-3 rounded-d border border-d-border bg-d-surface">
        <p className="text-xs font-medium text-d-muted text-center">{t('action.result', 'Breakdown')}</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-xs text-d-muted">{t('office.per_second', 'Per second')}</p>
            <p className="font-mono text-sm tabular-nums">${costPerSecond.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-xs text-d-muted">{t('office.per_minute', 'Per minute')}</p>
            <p className="font-mono text-sm tabular-nums">${(costPerSecond * 60).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-d-muted">{t('office.per_hour', 'Per hour')}</p>
            <p className="font-mono text-sm tabular-nums">${(costPerSecond * 3600).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-d-muted">{t('office.per_person', 'Per person (so far)')}</p>
            <p className="font-mono text-sm tabular-nums">${(totalCost / Math.max(1, attendees)).toFixed(2)}</p>
          </div>
        </div>
      </div>
    </Instrument>
  )
}