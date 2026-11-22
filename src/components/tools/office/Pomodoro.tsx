'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'

type Mode = 'work' | 'short' | 'long'
const DURATIONS: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 }

function beep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.frequency.value = 880
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
  } catch { /* AudioContext not available */ }
}

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Pomodoro({ onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const LABELS: Record<Mode, string> = { work: t('office.focus', 'Focus'), short: t('office.short_break', 'Short Break'), long: t('office.long_break', 'Long Break') }
  const [mode, setMode] = useState<Mode>('work')
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.work)
  const [isRunning, setIsRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const switchMode = useCallback((m: Mode) => {
    setMode(m)
    setSecondsLeft(DURATIONS[m])
    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          beep()
          setIsRunning(false)
          if (mode === 'work') {
            const newCount = completed + 1
            setCompleted(newCount)
            onOutput({ mode }, { completedPomodoros: newCount })
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, mode, completed, onOutput])

  const MODES: Mode[] = ['work', 'short', 'long']

  return (
    <Instrument>
      <div role="radiogroup" aria-label={t('office.mode', 'Mode')} className="mb-4 grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <Key key={m} role="radio" aria-checked={mode === m} accent={mode === m} onClick={() => switchMode(m)} className="min-h-10 px-2 text-xs">
            {LABELS[m]}
          </Key>
        ))}
      </div>
      <Readout label={LABELS[mode]}>{formatTime(secondsLeft)}</Readout>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-d-border"
        role="progressbar" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(((DURATIONS[mode] - secondsLeft) / DURATIONS[mode]) * 100)}
      >
        <div className="h-full bg-d-accent transition-[width] duration-1000 ease-linear" style={{ width: `${((DURATIONS[mode] - secondsLeft) / DURATIONS[mode]) * 100}%` }} />
      </div>
      <div className="mt-5 grid grid-cols-[2fr_1fr] gap-2">
        <Key accent onClick={() => { if (!isRunning) analytics.buttonClick('pomodoro', 'start'); setIsRunning((r) => !r) }}>
          {isRunning ? t('common.pause', 'Pause') : t('common.start', 'Start')}
        </Key>
        <Key onClick={() => { setSecondsLeft(DURATIONS[mode]); setIsRunning(false) }}>
          {t('office.timer_reset', 'Reset')}
        </Key>
      </div>
      <p className="mt-4 text-center text-sm text-d-muted" aria-live="polite">
        {completed > 0
          ? `${completed} ${completed !== 1 ? t('office.pomodoros', 'pomodoros') : t('office.pomodoro', 'pomodoro')} ${t('office.completed_today', 'completed today').toLowerCase()}`
          : t('office.pomodoro_empty', 'Finish a focus round and it is counted here.')}
      </p>
    </Instrument>
  )
}
