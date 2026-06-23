'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ToolProps } from '@/types'

// ─── types ────────────────────────────────────────────────────────────────────
type TimerMode = 'countup' | 'countdown'

interface TimerEntry {
  id: string
  label: string
  mode: TimerMode
  target: number        // seconds : only used for countdown
  elapsed: number       // seconds accumulated
  running: boolean
  startedAt: number | null  // Date.now() when last started
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9) }

function formatHMS(s: number) {
  const abs = Math.abs(s)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const sec = abs % 60
  const sign = s < 0 ? '-' : ''
  if (h > 0) return `${sign}${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${sign}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatHMSLabel(s: number) {
  const abs = Math.abs(s)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const sec = abs % 60
  const parts = []
  if (h) parts.push(`${h}h`)
  if (m || h) parts.push(`${m}m`)
  parts.push(`${sec}s`)
  return parts.join(' ')
}

function liveElapsed(t: TimerEntry): number {
  if (!t.running || t.startedAt === null) return t.elapsed
  return t.elapsed + Math.floor((Date.now() - t.startedAt) / 1000)
}

function displaySeconds(t: TimerEntry): number {
  const el = liveElapsed(t)
  return t.mode === 'countdown' ? t.target - el : el
}

// ─── canvas favicon blip ──────────────────────────────────────────────────────
function setFavicon(active: boolean) {
  if (typeof window === 'undefined') return
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Draw base icon (simple clock face)
  ctx.fillStyle = active ? '#18181b' : '#27272a'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#71717a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.stroke()

  // Clock hands
  const cx = size / 2, cy = size / 2
  const now = new Date()
  const hours = now.getHours() % 12
  const mins  = now.getMinutes()
  const secs  = now.getSeconds()

  // hour hand
  const ha = (Math.PI * 2 * (hours + mins / 60) / 12) - Math.PI / 2
  ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ha) * 7, cy + Math.sin(ha) * 7)
  ctx.stroke()

  // minute hand
  const ma = (Math.PI * 2 * (mins + secs / 60) / 60) - Math.PI / 2
  ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ma) * 10, cy + Math.sin(ma) * 10)
  ctx.stroke()

  // Red blip when active
  if (active) {
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(size - 7, 7, 5, 0, Math.PI * 2)
    ctx.fill()
    // pulse ring
    ctx.strokeStyle = 'rgba(239,68,68,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(size - 7, 7, 8, 0, Math.PI * 2)
    ctx.stroke()
  }

  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = canvas.toDataURL()
}

// ─── individual timer card ────────────────────────────────────────────────────
interface TimerCardProps {
  timer: TimerEntry
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onDelete: (id: string) => void
  onLabelChange: (id: string, label: string) => void
  onTargetChange: (id: string, seconds: number) => void
}

function TimerCard({ timer, onToggle, onReset, onDelete, onLabelChange, onTargetChange }: TimerCardProps) {
  const [tick, setTick] = useState(0)
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetInput, setTargetInput] = useState('')

  useEffect(() => {
    if (!timer.running) return
    const id = setInterval(() => setTick(t => t + 1), 500)
    return () => clearInterval(id)
  }, [timer.running])

  const secs = displaySeconds(timer)
  const isOver = timer.mode === 'countdown' && secs <= 0
  const elapsed = liveElapsed(timer)
  const pct = timer.mode === 'countdown' ? Math.min(1, elapsed / Math.max(timer.target, 1)) : null

  // Color coding
  let numColor = 'text-foreground'
  if (timer.running) numColor = 'text-sky-300'
  if (isOver) numColor = 'text-rose-400'

  function openTargetEdit() {
    const h = Math.floor(timer.target / 3600)
    const m = Math.floor((timer.target % 3600) / 60)
    const s = timer.target % 60
    setTargetInput(`${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`)
    setEditingTarget(true)
  }

  function commitTarget() {
    // Parse HH:MM:SS or MM:SS or raw seconds
    const parts = targetInput.trim().split(':').map(Number)
    let total = 0
    if (parts.length === 3) total = parts[0] * 3600 + parts[1] * 60 + parts[2]
    else if (parts.length === 2) total = parts[0] * 60 + parts[1]
    else total = parts[0] || 0
    if (total > 0) onTargetChange(timer.id, total)
    setEditingTarget(false)
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors ${timer.running ? 'border-sky-500/40 bg-sky-500/5' : 'border-input bg-muted/20'} ${isOver ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <input
          value={timer.label}
          onChange={e => onLabelChange(timer.id, e.target.value)}
          className="font-medium text-sm bg-transparent outline-none border-b border-transparent focus:border-input/60 w-full truncate"
          placeholder="Timer name…"
        />
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${timer.mode === 'countup' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-violet-500/15 text-violet-400'}`}>
            {timer.mode === 'countup' ? '▲ up' : '▼ down'}
          </span>
          <button onClick={() => onDelete(timer.id)} className="text-muted-foreground hover:text-rose-400 transition-colors ml-1 text-xs px-1">✕</button>
        </div>
      </div>

      {/* Big time display */}
      <div className="text-center py-2">
        <div className={`font-mono font-bold tabular-nums ${isOver ? 'text-4xl text-rose-400' : 'text-5xl'} ${numColor}`}>
          {formatHMS(Math.abs(secs))}{isOver ? ' OVER' : ''}
        </div>
        {timer.mode === 'countdown' && (
          <div className="text-xs text-muted-foreground mt-1">
            of {formatHMSLabel(timer.target)}
            {' · '}
            <button onClick={openTargetEdit} className="underline underline-offset-2 hover:text-foreground">edit</button>
          </div>
        )}
        {timer.mode === 'countup' && elapsed > 0 && (
          <div className="text-xs text-muted-foreground mt-1">{formatHMSLabel(elapsed)} elapsed</div>
        )}
      </div>

      {/* Countdown progress bar */}
      {pct !== null && (
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : pct > 0.8 ? 'bg-amber-500' : 'bg-sky-500'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}

      {/* Target edit inline */}
      {editingTarget && (
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            value={targetInput}
            onChange={e => setTargetInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
            className="flex-1 text-sm font-mono border border-input rounded px-2 py-1 bg-background outline-none focus:ring-1 focus:ring-ring"
            placeholder="1:30:00 or 90:00 or 5400"
          />
          <button onClick={commitTarget} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Set</button>
          <button onClick={() => setEditingTarget(false)} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => onToggle(timer.id)}
          className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${timer.running ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-sky-500/20 text-sky-400 hover:bg-sky-500/30'}`}>
          {timer.running ? '⏸ Pause' : elapsed > 0 ? '▶ Resume' : '▶ Start'}
        </button>
        <button
          onClick={() => onReset(timer.id)}
          className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted/60 transition-colors border border-input/60">
          ↺ Reset
        </button>
      </div>
    </div>
  )
}

// ─── add timer modal ──────────────────────────────────────────────────────────
interface AddTimerFormProps {
  onAdd: (timer: TimerEntry) => void
  onCancel: () => void
}

function AddTimerForm({ onAdd, onCancel }: AddTimerFormProps) {
  const [label, setLabel] = useState('')
  const [mode, setMode] = useState<TimerMode>('countup')
  const [hours, setHours] = useState(0)
  const [mins, setMins] = useState(0)
  const [secs, setSecs] = useState(0)

  function submit() {
    const target = hours * 3600 + mins * 60 + secs
    onAdd({
      id: uid(),
      label: label.trim() || 'Timer',
      mode,
      target: mode === 'countdown' ? (target || 1500) : 0,
      elapsed: 0,
      running: false,
      startedAt: null,
    })
  }

  return (
    <div className="rounded-xl border border-input bg-muted/30 p-4 space-y-4">
      <p className="text-sm font-medium">New timer</p>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Name</label>
        <input value={label} onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g. Project Alpha" autoFocus />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Mode</label>
        <div className="flex gap-2">
          {(['countup', 'countdown'] as TimerMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-md text-sm transition-colors ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
              {m === 'countup' ? '▲ Count up' : '▼ Count down'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'countdown' && (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Duration</label>
          <div className="flex items-center gap-2">
            {[['h', hours, setHours, 23], ['m', mins, setMins, 59], ['s', secs, setSecs, 59]].map(([unit, val, set, max]) => (
              <label key={unit as string} className="flex flex-col items-center gap-0.5 flex-1">
                <input type="number" value={val as number} min={0} max={max as number}
                  onChange={e => (set as (v: number) => void)(+e.target.value)}
                  className="w-full text-center text-sm font-mono border border-input rounded-md px-2 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring" />
                <span className="text-xs text-muted-foreground">{unit}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={submit} className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Add Timer
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted/60 border border-input/60 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function SessionTimer({ onOutput }: ToolProps) {
  const [timers, setTimers] = useState<TimerEntry[]>([])
  const [adding, setAdding] = useState(false)
  const originalTitle = useRef<string>('')
  const faviconTimer = useRef<NodeJS.Timeout | null>(null)

  // Track page title + favicon
  useEffect(() => {
    originalTitle.current = document.title
    return () => {
      document.title = originalTitle.current
      setFavicon(false)
    }
  }, [])

  // Tick: update page title + favicon when any timer is running
  useEffect(() => {
    const running = timers.filter(t => t.running)
    const anyRunning = running.length > 0

    if (faviconTimer.current) clearInterval(faviconTimer.current)

    if (!anyRunning) {
      document.title = originalTitle.current
      setFavicon(false)
      return
    }

    function tick() {
      // Pick the "primary" running timer for title (first running one)
      const primary = timers.find(t => t.running)
      if (!primary) return
      const secs = displaySeconds(primary)
      const time = formatHMS(Math.abs(secs))
      const label = primary.label || 'Timer'
      document.title = `${time} : ${label}`
      setFavicon(true)
    }

    tick()
    faviconTimer.current = setInterval(tick, 1000)
    return () => { if (faviconTimer.current) clearInterval(faviconTimer.current) }
  }, [timers])

  function addTimer(timer: TimerEntry) {
    setTimers(prev => [...prev, timer])
    setAdding(false)
    onOutput({ action: 'add', label: timer.label, mode: timer.mode }, {})
  }

  function toggleTimer(id: string) {
    setTimers(prev => prev.map(t => {
      if (t.id !== id) return t
      if (t.running) {
        // Pause: freeze elapsed
        const el = liveElapsed(t)
        return { ...t, running: false, elapsed: el, startedAt: null }
      } else {
        return { ...t, running: true, startedAt: Date.now() }
      }
    }))
  }

  function resetTimer(id: string) {
    setTimers(prev => prev.map(t =>
      t.id !== id ? t : { ...t, running: false, elapsed: 0, startedAt: null }
    ))
  }

  function deleteTimer(id: string) {
    setTimers(prev => prev.filter(t => t.id !== id))
  }

  function updateLabel(id: string, label: string) {
    setTimers(prev => prev.map(t => t.id !== id ? t : { ...t, label }))
  }

  function updateTarget(id: string, target: number) {
    setTimers(prev => prev.map(t => t.id !== id ? t : { ...t, target, elapsed: 0, running: false, startedAt: null }))
  }

  // Summary row at top
  const running = timers.filter(t => t.running)
  const totalElapsed = timers.reduce((acc, t) => acc + liveElapsed(t), 0)

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Summary bar */}
      {timers.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-input bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-3">
            {running.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                {running.length} running
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              Total: <span className="font-mono font-medium text-foreground">{formatHMS(totalElapsed)}</span>
            </span>
          </div>
          <div className="flex gap-2">
            {running.length > 0 && (
              <button onClick={() => setTimers(prev => prev.map(t => t.running ? { ...t, running: false, elapsed: liveElapsed(t), startedAt: null } : t))}
                className="text-xs px-3 py-1 rounded-md bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors">
                ⏸ Pause all
              </button>
            )}
            {timers.some(t => !t.running && liveElapsed(t) === 0) ? null : (
              <button onClick={() => setTimers(prev => prev.map(t => ({ ...t, running: false, elapsed: 0, startedAt: null })))}
                className="text-xs px-3 py-1 rounded-md bg-muted/60 text-muted-foreground hover:bg-muted border border-input/40 transition-colors">
                ↺ Reset all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timer grid */}
      {timers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {timers.map(t => (
            <TimerCard
              key={t.id}
              timer={t}
              onToggle={toggleTimer}
              onReset={resetTimer}
              onDelete={deleteTimer}
              onLabelChange={updateLabel}
              onTargetChange={updateTarget}
            />
          ))}
        </div>
      )}

      {/* Add form or button */}
      {adding ? (
        <AddTimerForm onAdd={addTimer} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full rounded-xl border-2 border-dashed border-input/60 py-8 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/20 transition-colors text-sm flex flex-col items-center gap-1.5">
          <span className="text-2xl">＋</span>
          Add a timer
        </button>
      )}

      {timers.length === 0 && !adding && (
        <p className="text-center text-xs text-muted-foreground pb-2">
          Track billable hours across projects. Each timer counts independently : count up or set a target duration.
        </p>
      )}
    </div>
  )
}
