'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ToolProps } from '@/types'

type Mode = 'work' | 'short' | 'long'
const DURATIONS: Record<Mode, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 }
const LABELS: Record<Mode, string> = { work: 'Focus', short: 'Short Break', long: 'Long Break' }

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

  const total = DURATIONS[mode]
  const progress = (total - secondsLeft) / total
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <div className="flex gap-2">
        {(['work', 'short', 'long'] as Mode[]).map((m) => (
          <button key={m} onClick={() => switchMode(m)}
            className={`px-4 py-2 rounded-full text-sm border transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
            {LABELS[m]}
          </button>
        ))}
      </div>
      <div className="relative">
        <svg width="200" height="200" className="-rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
          <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="8"
            className={mode === 'work' ? 'text-primary' : mode === 'short' ? 'text-emerald-400' : 'text-sky-400'}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-bold tabular-nums">{formatTime(secondsLeft)}</span>
          <span className="text-xs text-muted-foreground mt-1">{LABELS[mode]}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={() => setIsRunning((r) => !r)}
          className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button onClick={() => { setSecondsLeft(DURATIONS[mode]); setIsRunning(false) }}
          className="px-6 py-3 rounded-full border border-input hover:bg-muted/50 transition-colors text-sm">
          Reset
        </button>
      </div>
      {completed > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Completed today:</span>
          <div className="flex gap-1">
            {Array.from({ length: completed }).map((_, i) => (
              <span key={i} className="w-3 h-3 rounded-full bg-primary" />
            ))}
          </div>
          <span className="font-medium text-foreground">{completed} pomodoro{completed !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  )
}
