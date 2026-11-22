'use client'

/**
 * SessionTimer — Instrument domain.
 * Stopwatch / timer device with multiple independent timers, big readout, laps.
 * Nested Workbench region for lap history list (code-like density).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Flag, RotateCcw, Play, Pause } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'
import { Region, Column, Scroll, Field, Row, Notice, Empty, Btn, TextInput } from '@/components/domain/kit'

type TimerMode = 'countup' | 'countdown'

interface TimerEntry {
  id: string
  label: string
  mode: TimerMode
  target: number
  elapsed: number
  running: boolean
  startedAt: number | null
  laps: number[]
}

function uid() { return Math.random().toString(36).slice(2, 9) }

function formatHMS(s: number) {
  const abs = Math.abs(s)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const sec = abs % 60
  const sign = s < 0 ? '−' : ''
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

function setFavicon(active: boolean) {
  if (typeof window === 'undefined') return
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = active ? '#18181b' : '#27272a'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#71717a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
  ctx.stroke()

  const cx = size / 2, cy = size / 2
  const now = new Date()
  const hours = now.getHours() % 12
  const mins  = now.getMinutes()
  const secs  = now.getSeconds()

  const ha = (Math.PI * 2 * (hours + mins / 60) / 12) - Math.PI / 2
  ctx.strokeStyle = '#a1a1aa'; ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ha) * 7, cy + Math.sin(ha) * 7)
  ctx.stroke()

  const ma = (Math.PI * 2 * (mins + secs / 60) / 60) - Math.PI / 2
  ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ma) * 10, cy + Math.sin(ma) * 10)
  ctx.stroke()

  if (active) {
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(size - 7, 7, 5, 0, Math.PI * 2)
    ctx.fill()
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

interface TimerCardProps {
  timer: TimerEntry
  onToggle: (id: string) => void
  onReset: (id: string) => void
  onLap: (id: string) => void
  onDelete: (id: string) => void
  onLabelChange: (id: string, label: string) => void
  onTargetChange: (id: string, seconds: number) => void
}

function TimerCard({ timer, onToggle, onReset, onLap, onDelete, onLabelChange, onTargetChange }: TimerCardProps) {
  const { t } = useTranslation()
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

  let numColor = 'text-d-ink'
  if (timer.running) numColor = 'text-d-accent'
  if (isOver) numColor = 'text-red-500 dark:text-red-400'

  function openTargetEdit() {
    const h = Math.floor(timer.target / 3600)
    const m = Math.floor((timer.target % 3600) / 60)
    const s = timer.target % 60
    setTargetInput(`${h ? h + ':' : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`)
    setEditingTarget(true)
  }

  function commitTarget() {
    const parts = targetInput.trim().split(':').map(Number)
    let total = 0
    if (parts.length === 3) total = parts[0] * 3600 + parts[1] * 60 + parts[2]
    else if (parts.length === 2) total = parts[0] * 60 + parts[1]
    else total = parts[0] || 0
    if (total > 0) onTargetChange(timer.id, total)
    setEditingTarget(false)
  }

  return (
    <div className={`rounded-xl border border-d-border bg-d-raised p-4 space-y-3 transition-colors ${timer.running ? 'border-d-accent/40 bg-d-accent/5' : ''} ${isOver ? 'border-red-500/40 bg-red-500/5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <TextInput
          id={`timer-label-${timer.id}`}
          value={timer.label}
          onChange={e => onLabelChange(timer.id, e.target.value)}
          placeholder="Timer name…"
          className="bg-transparent border-b border-transparent focus:border-d-accent/60"
        />
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${timer.mode === 'countup' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-violet-500/15 text-violet-400'}`}>
            {timer.mode === 'countup' ? '▲ up' : '▼ down'}
          </span>
          <button onClick={() => onDelete(timer.id)} className="text-d-muted hover:text-red-400 transition-colors ml-1 text-xs px-1" aria-label={t('common.delete', 'Delete')}>
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="text-center py-2">
        <div className={`font-mono font-bold tabular-nums ${isOver ? 'text-4xl text-red-500' : 'text-5xl'} ${numColor}`}>
          {formatHMS(Math.abs(secs))}{isOver ? ' OVER' : ''}
        </div>
        {timer.mode === 'countdown' && (
          <div className="text-xs text-d-muted mt-1">
            of {formatHMSLabel(timer.target)}
            {' · '}
            <button onClick={openTargetEdit} className="underline underline-offset-2 hover:text-d-ink">{t('common.edit', 'Edit')}</button>
          </div>
        )}
        {timer.mode === 'countup' && elapsed > 0 && (
          <div className="text-xs text-d-muted mt-1">{formatHMSLabel(elapsed)} {t('office.timer_elapsed', 'elapsed')}</div>
        )}
      </div>

      {pct !== null && (
        <div className="h-1 bg-d-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 0.8 ? 'bg-amber-500' : 'bg-d-accent'}`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}

      {editingTarget && (
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            value={targetInput}
            onChange={e => setTargetInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitTarget(); if (e.key === 'Escape') setEditingTarget(false) }}
            className="flex-1 text-sm font-mono border border-d-border rounded px-2 py-1 bg-d-raised outline-none focus:ring-1 focus:ring-d-accent"
            placeholder="1:30:00 or 90:00 or 5400"
          />
          <Btn size="sm" onClick={commitTarget}>Set</Btn>
          <Btn size="sm" variant="quiet" onClick={() => setEditingTarget(false)}>✕</Btn>
        </div>
      )}

      <div className="flex gap-2">
        <Btn
          variant={timer.running ? 'secondary' : 'primary'}
          onClick={() => onToggle(timer.id)}
          className="flex-1"
        >
          {timer.running ? (
            <>
              <Pause className="h-3.5 w-3.5" aria-hidden />
              {t('common.pause', 'Pause')}
            </>
          ) : elapsed > 0 ? (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden />
              {t('common.resume', 'Resume')}
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" aria-hidden />
              {t('common.start', 'Start')}
            </>
          )}
        </Btn>
        <Btn variant="secondary" onClick={() => onLap(timer.id)} disabled={!timer.running}>
          <Flag className="h-3.5 w-3.5" aria-hidden />
          {t('office.timer_lap', 'Lap')}
        </Btn>
        <Btn variant="secondary" onClick={() => onReset(timer.id)}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          {t('office.timer_reset', 'Reset')}
        </Btn>
      </div>

      {timer.laps.length > 0 && (
        <Region domain="workbench" className="mt-3">
          <div className="text-xs text-d-muted mb-1 font-mono">{t('office.timer_laps', 'Laps')}</div>
          <Scroll className="max-h-32">
            <div className="space-y-1 font-mono text-xs">
              {timer.laps.map((lap, i) => (
                <Row key={i} label={t('office.timer_lap', 'Lap')} value={formatHMS(lap)} mono />
              ))}
            </div>
          </Scroll>
        </Region>
      )}
    </div>
  )
}

interface AddTimerFormProps {
  onAdd: (timer: TimerEntry) => void
  onCancel: () => void
}

function AddTimerForm({ onAdd, onCancel }: AddTimerFormProps) {
  const { t } = useTranslation()
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
      laps: [],
    })
  }

  return (
    <div className="rounded-xl border border-d-border bg-d-raised p-4 space-y-4">
      <p className="font-display text-sm font-semibold">{t('office.timer_new', 'New timer')}</p>
      <Field id="new-timer-label" label={t('common.name', 'Name')}>
        <TextInput
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. Project Alpha"
          autoFocus
        />
      </Field>
      <Field id="new-timer-mode" label={t('common.mode', 'Mode')}>
        <div className="flex gap-2">
          {(['countup', 'countdown'] as TimerMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 rounded-d text-sm font-medium transition-colors ${
                mode === m ? 'bg-d-accent text-d-accent-ink' : 'bg-d-border text-d-muted hover:bg-d-border/80'
              }`}
            >
              {m === 'countup' ? '▲ Count up' : '▼ Count down'}
            </button>
          ))}
        </div>
      </Field>
      {mode === 'countdown' && (
        <Field id="new-timer-duration" label={t('office.timer_duration', 'Duration')}>
          <div className="flex items-center gap-2">
            {([['h', hours, setHours, 23], ['m', mins, setMins, 59], ['s', secs, setSecs, 59]] as [string, number, (v: number) => void, number][]).map(([unit, val, set, max]) => (
              <label key={unit} className="flex flex-col items-center gap-0.5 flex-1">
                <input
                  type="number"
                  value={val}
                  min={0}
                  max={max}
                  onChange={e => set(+e.target.value)}
                  className="w-full text-center text-sm font-mono border border-d-border rounded-d px-2 py-1.5 bg-d-raised outline-none focus:ring-1 focus:ring-d-accent"
                />
                <span className="text-xs text-d-muted">{unit}</span>
              </label>
            ))}
          </div>
        </Field>
      )}
      <div className="flex gap-2">
        <Btn variant="primary" onClick={submit} className="flex-1">{t('action.add', 'Add')} Timer</Btn>
        <Btn variant="quiet" onClick={onCancel}>{t('action.cancel', 'Cancel')}</Btn>
      </div>
    </div>
  )
}

export default function SessionTimer({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [timers, setTimers] = useState<TimerEntry[]>([])
  const [adding, setAdding] = useState(false)
  const originalTitle = useRef<string>('')
  const faviconTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    originalTitle.current = document.title
    return () => {
      document.title = originalTitle.current
      setFavicon(false)
    }
  }, [])

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
    analytics.buttonClick('session-timer', 'start')
    setTimers(prev => [...prev, timer])
    setAdding(false)
    onOutput({ action: 'add', label: timer.label, mode: timer.mode }, {})
  }

  function toggleTimer(id: string) {
    setTimers(prev => prev.map(t => {
      if (t.id !== id) return t
      if (t.running) {
        const el = liveElapsed(t)
        return { ...t, running: false, elapsed: el, startedAt: null }
      } else {
        return { ...t, running: true, startedAt: Date.now() }
      }
    }))
  }

  function lapTimer(id: string) {
    setTimers(prev => prev.map(t => {
      if (t.id !== id) return t
      const el = liveElapsed(t)
      return { ...t, laps: [...t.laps, el] }
    }))
  }

  function resetTimer(id: string) {
    setTimers(prev => prev.map(t =>
      t.id !== id ? t : { ...t, running: false, elapsed: 0, startedAt: null, laps: [] }
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

  const running = timers.filter(t => t.running)
  const totalElapsed = timers.reduce((acc, t) => acc + liveElapsed(t), 0)

  return (
    <Instrument>
      <Column width="lg">
        {timers.length > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-d-border bg-d-raised px-4 py-2.5 mb-4">
            <div className="flex items-center gap-3">
              {running.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs text-d-accent font-medium">
                  <span className="inline-block w-2 h-2 rounded-full bg-d-accent animate-pulse" aria-hidden />
                  {running.length} {t('office.timer_running', 'running')}
                </span>
              )}
              <span className="text-xs text-d-muted">
                {t('office.total', 'Total')}: <span className="font-mono font-medium text-d-ink">{formatHMS(totalElapsed)}</span>
              </span>
            </div>
            <div className="flex gap-2">
              {running.length > 0 && (
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setTimers(prev => prev.map(t => t.running ? { ...t, running: false, elapsed: liveElapsed(t), startedAt: null } : t))}
                >
                  <Pause className="h-3.5 w-3.5" aria-hidden />
                  {t('common.pause', 'Pause')} {t('common.all', 'all')}
                </Btn>
              )}
              {timers.some(t => !t.running && liveElapsed(t) === 0) ? null : (
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setTimers(prev => prev.map(t => ({ ...t, running: false, elapsed: 0, startedAt: null, laps: [] })))}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  {t('office.timer_reset', 'Reset')} {t('common.all', 'all')}
                </Btn>
              )}
            </div>
          </div>
        )}

        {timers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {timers.map(t => (
              <TimerCard
                key={t.id}
                timer={t}
                onToggle={toggleTimer}
                onReset={resetTimer}
                onLap={lapTimer}
                onDelete={deleteTimer}
                onLabelChange={updateLabel}
                onTargetChange={updateTarget}
              />
            ))}
          </div>
        ) : null}

        {adding ? (
          <AddTimerForm onAdd={addTimer} onCancel={() => setAdding(false)} />
        ) : (
          <Btn
            variant="secondary"
            className="w-full py-8 border-2 border-dashed border-d-border/60 text-d-muted hover:border-d-accent/40 hover:text-d-ink hover:bg-d-border/40 transition-colors flex flex-col items-center gap-1.5"
            onClick={() => setAdding(true)}
          >
            <Plus className="text-2xl" aria-hidden />
            {t('action.add', 'Add')} a timer
          </Btn>
        )}

        {timers.length === 0 && !adding && (
          <Empty
            title={t('office.timer_empty_title', 'No timers yet')}
            children={t('office.timer_empty_desc', 'Track billable hours across projects. Each timer counts independently — count up or set a target duration.')}
          />
        )}
      </Column>
    </Instrument>
  )
}