'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

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
    <div className="max-w-lg mx-auto space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.attendees', 'Attendees')}</label>
          <input type="number" min={1} max={100} value={attendees} onChange={(e) => setAttendees(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.hourly_rate', 'Avg Hourly Rate')} (USD)</label>
          <input type="number" min={1} value={hourlyRate} onChange={(e) => setHourlyRate(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="rounded-xl border border-input bg-muted/30 p-8 text-center space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{t('office.meeting_cost', 'Meeting Cost')}</p>
        <p className={`font-mono text-5xl font-bold tabular-nums transition-colors ${isRunning ? 'text-rose-400' : 'text-foreground'}`}>
          ${totalCost.toFixed(2)}
        </p>
        <p className="font-mono text-lg text-muted-foreground">{formatTime(elapsed)}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { if (!isRunning) analytics.buttonClick('meeting-cost', 'start'); setIsRunning((r) => !r) }}
            className={`px-8 py-3 rounded-full font-medium text-sm transition-colors ${isRunning ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {isRunning ? t('common.pause', 'Pause') : elapsed > 0 ? t('common.resume', 'Resume') : t('common.start', 'Start')}
          </button>
          <button onClick={reset} className="px-6 py-3 rounded-full border border-input hover:bg-muted/50 transition-colors text-sm">{t('office.timer_reset', 'Reset')}</button>
        </div>
      </div>
      <div className="rounded-md border border-input p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('action.result', 'Breakdown')}</p>
        {[
          { label: t('office.rate', 'Cost per second'), value: `$${costPerSecond.toFixed(4)}` },
          { label: t('office.duration', 'Cost per minute'), value: `$${(costPerSecond * 60).toFixed(2)}` },
          { label: t('office.attendees', 'Cost per person (so far)'), value: `$${(totalCost / attendees).toFixed(2)}` },
        ].map((r) => (
          <div key={r.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-mono">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
