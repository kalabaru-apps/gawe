# Phase 5: Office Productivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 10 Office Productivity tools as real React components replacing ToolPlaceholder stubs.

**Architecture:** Each tool is a `'use client'` React component. Some tools (Pomodoro, Scratchpad, Meeting Cost) are single-panel. Others use `ToolPanel`. The `office` category entry is added to `toolMap` in `ToolPageClient.tsx` in Task 1.

**Tech Stack:** Next.js 16, React 19, TypeScript, date-fns (already installed), date-fns-tz, mathjs, papaparse (already installed), Tailwind v4

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- pnpm only (never npm or yarn)
- All tool components: `'use client'` directive at top
- All tool components: `export default function ComponentName({ onOutput, initialState }: ToolProps)`
- ToolProps: `{ onOutput: (inputs, outputs) => void; initialState?: Record<string, unknown> }`
- UI: use `ToolPanel` (left/right), `CopyButton`, `CodeEditor`, `ErrorAlert` from `@/components/tools/shared/`
- Tailwind v4: complete literal class strings only : no dynamic assembly
- Git commits end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use `rtk git` prefix for all git commands

---

## File Map

```
[MODIFY] src/app/tools/[category]/[tool]/ToolPageClient.tsx  : add office entries to toolMap
[CREATE] src/components/tools/office/Pomodoro.tsx
[CREATE] src/components/tools/office/TimezoneClock.tsx
[CREATE] src/components/tools/office/UnitConverter.tsx
[CREATE] src/components/tools/office/DateCalculator.tsx
[CREATE] src/components/tools/office/Calculator.tsx
[CREATE] src/components/tools/office/CsvEditor.tsx
[CREATE] src/components/tools/office/WordCounter.tsx
[CREATE] src/components/tools/office/Scratchpad.tsx
[CREATE] src/components/tools/office/MeetingCost.tsx
[CREATE] src/components/tools/office/Pastebin.tsx
```

---

## Task 1: Install Phase 5 Dependencies + Update ToolPageClient

- [ ] **Step 1: Install dependencies**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add date-fns-tz mathjs
pnpm add -D @types/mathjs
```

Note: `date-fns` and `papaparse` are already installed.

- [ ] **Step 2: Add office entry to toolMap in ToolPageClient.tsx**

```ts
  office: {
    'pomodoro': () => import('@/components/tools/office/Pomodoro'),
    'timezone-clock': () => import('@/components/tools/office/TimezoneClock'),
    'unit-converter': () => import('@/components/tools/office/UnitConverter'),
    'date-calculator': () => import('@/components/tools/office/DateCalculator'),
    'calculator': () => import('@/components/tools/office/Calculator'),
    'csv-editor': () => import('@/components/tools/office/CsvEditor'),
    'word-counter': () => import('@/components/tools/office/WordCounter'),
    'scratchpad': () => import('@/components/tools/office/Scratchpad'),
    'meeting-cost': () => import('@/components/tools/office/MeetingCost'),
    'pastebin': () => import('@/components/tools/office/Pastebin'),
  },
```

- [ ] **Step 3: Commit**

```bash
rtk git add package.json pnpm-lock.yaml src/app/tools/\[category\]/\[tool\]/ToolPageClient.tsx
rtk git commit -m "chore(phase5): install office productivity dependencies and register tool loaders

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Pomodoro Timer

**Files:**
- Create: `src/components/tools/office/Pomodoro.tsx`

- [ ] **Step 1: Create Pomodoro.tsx**

Key logic:
- Three modes: Work (25min), Short Break (5min), Long Break (15min)
- State: `mode`, `secondsLeft`, `isRunning`, `completedPomodoros`
- `useEffect` with `setInterval` when `isRunning` : decrement every 1s
- When reaches 0: auto-switch to break or work, play a simple beep using `AudioContext`
- Beep: `const ctx = new AudioContext(); const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.15);`
- Display: large `MM:SS` clock, mode buttons, start/pause/reset buttons
- Circular progress: SVG circle with `strokeDashoffset` animation
- `onOutput` called when a pomodoro (work session) completes

```tsx
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
```

- [ ] **Step 2: Type check**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/Pomodoro.tsx
rtk git commit -m "feat(office): pomodoro timer with circular progress and beep

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Timezone Converter

**Files:**
- Create: `src/components/tools/office/TimezoneClock.tsx`

**Interfaces:**
- Consumes: `date-fns-tz` : `formatInTimeZone(date, tz, formatStr)` and `toZonedTime`

- [ ] **Step 1: Create TimezoneClock.tsx**

Key logic:
- `import { formatInTimeZone } from 'date-fns-tz'`
- Source: `<input type="datetime-local">` (defaults to now) + source timezone dropdown
- List of timezones: use `Intl.supportedValuesOf('timeZone')` to get all valid IANA zones
- Pre-pinned timezones: user picks from a multi-select or pre-populated list (start with 8 common zones)
- Live clock: `setInterval` every 1s to update "now" display
- For each pinned zone, display: zone name, current time, UTC offset
- Default pinned zones: `['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney']`
- Convert a specific time: left panel inputs, right panel shows that time in all pinned zones

```tsx
'use client'

import { useState, useEffect } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

const DEFAULT_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
]

const ALL_ZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') as string[] : DEFAULT_ZONES

export default function TimezoneClock({ onOutput, initialState: _initialState }: ToolProps) {
  const [now, setNow] = useState(new Date())
  const [pinnedZones, setPinnedZones] = useState<string[]>(DEFAULT_ZONES)
  const [addZone, setAddZone] = useState('')
  const [filterZone, setFilterZone] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function addPinnedZone(tz: string) {
    if (!tz || pinnedZones.includes(tz)) return
    setPinnedZones((prev) => [...prev, tz])
    setAddZone('')
  }

  function removeZone(tz: string) {
    setPinnedZones((prev) => prev.filter((z) => z !== tz))
  }

  const filteredAll = ALL_ZONES.filter((z) => z.toLowerCase().includes(filterZone.toLowerCase())).slice(0, 50)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          placeholder="Search timezone (e.g. Tokyo, New_York)..."
        />
        {filterZone && (
          <div className="relative">
            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-md border border-input bg-background shadow-lg">
              {filteredAll.map((z) => (
                <button key={z} onClick={() => { addPinnedZone(z); setFilterZone('') }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                  {z}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pinnedZones.map((tz) => {
          let timeStr = '—'
          let dateStr = '—'
          let offsetStr = '—'
          try {
            timeStr = formatInTimeZone(now, tz, 'HH:mm:ss')
            dateStr = formatInTimeZone(now, tz, 'EEE, MMM d yyyy')
            offsetStr = formatInTimeZone(now, tz, 'zzz')
          } catch { /* invalid tz */ }
          return (
            <div key={tz} className="rounded-md border border-input p-3 relative group">
              <button onClick={() => removeZone(tz)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-foreground transition-opacity">
                ✕
              </button>
              <p className="text-xs text-muted-foreground truncate">{tz}</p>
              <p className="font-mono text-2xl font-semibold tabular-nums mt-1">{timeStr}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
              <p className="text-xs text-muted-foreground">{offsetStr}</p>
              <CopyButton value={`${tz}: ${timeStr} ${dateStr}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/TimezoneClock.tsx
rtk git commit -m "feat(office): timezone converter with live world clock

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Unit Converter

**Files:**
- Create: `src/components/tools/office/UnitConverter.tsx`

- [ ] **Step 1: Create UnitConverter.tsx**

Key logic: No external deps : conversion tables hardcoded.
- Categories: Length, Weight, Temperature, Data, Speed, Area
- Length: m, km, cm, mm, mi, yd, ft, in
- Weight: kg, g, mg, lb, oz, ton
- Temperature: °C, °F, K (special formula-based conversion)
- Data: bytes, KB, MB, GB, TB
- Speed: m/s, km/h, mph, knots
- Architecture: user picks category, picks source unit + enters value, all other units shown simultaneously
- Conversion: convert to SI base then to each unit

```tsx
'use client'

import { useState } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

interface Unit {
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

interface Category {
  name: string
  units: Record<string, Unit>
}

const CATEGORIES: Record<string, Category> = {
  length: {
    name: 'Length',
    units: {
      m:   { label: 'Meters (m)',      toBase: (v) => v,           fromBase: (v) => v },
      km:  { label: 'Kilometers (km)', toBase: (v) => v * 1000,    fromBase: (v) => v / 1000 },
      cm:  { label: 'Centimeters (cm)',toBase: (v) => v / 100,     fromBase: (v) => v * 100 },
      mm:  { label: 'Millimeters (mm)',toBase: (v) => v / 1000,    fromBase: (v) => v * 1000 },
      mi:  { label: 'Miles (mi)',      toBase: (v) => v * 1609.344,fromBase: (v) => v / 1609.344 },
      yd:  { label: 'Yards (yd)',      toBase: (v) => v * 0.9144,  fromBase: (v) => v / 0.9144 },
      ft:  { label: 'Feet (ft)',       toBase: (v) => v * 0.3048,  fromBase: (v) => v / 0.3048 },
      in:  { label: 'Inches (in)',     toBase: (v) => v * 0.0254,  fromBase: (v) => v / 0.0254 },
    },
  },
  weight: {
    name: 'Weight',
    units: {
      kg:  { label: 'Kilograms (kg)', toBase: (v) => v,         fromBase: (v) => v },
      g:   { label: 'Grams (g)',      toBase: (v) => v / 1000,  fromBase: (v) => v * 1000 },
      mg:  { label: 'Milligrams (mg)',toBase: (v) => v / 1e6,   fromBase: (v) => v * 1e6 },
      lb:  { label: 'Pounds (lb)',    toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      oz:  { label: 'Ounces (oz)',    toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
    },
  },
  temperature: {
    name: 'Temperature',
    units: {
      c: { label: 'Celsius (°C)',    toBase: (v) => v,              fromBase: (v) => v },
      f: { label: 'Fahrenheit (°F)', toBase: (v) => (v - 32) * 5/9, fromBase: (v) => v * 9/5 + 32 },
      k: { label: 'Kelvin (K)',      toBase: (v) => v - 273.15,     fromBase: (v) => v + 273.15 },
    },
  },
  data: {
    name: 'Data',
    units: {
      b:   { label: 'Bytes (B)',     toBase: (v) => v,       fromBase: (v) => v },
      kb:  { label: 'Kilobytes (KB)',toBase: (v) => v * 1024,fromBase: (v) => v / 1024 },
      mb:  { label: 'Megabytes (MB)',toBase: (v) => v * 1024**2, fromBase: (v) => v / 1024**2 },
      gb:  { label: 'Gigabytes (GB)',toBase: (v) => v * 1024**3, fromBase: (v) => v / 1024**3 },
      tb:  { label: 'Terabytes (TB)',toBase: (v) => v * 1024**4, fromBase: (v) => v / 1024**4 },
    },
  },
  speed: {
    name: 'Speed',
    units: {
      ms:   { label: 'm/s',    toBase: (v) => v,          fromBase: (v) => v },
      kmh:  { label: 'km/h',   toBase: (v) => v / 3.6,    fromBase: (v) => v * 3.6 },
      mph:  { label: 'mph',    toBase: (v) => v * 0.44704,fromBase: (v) => v / 0.44704 },
      kn:   { label: 'Knots',  toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    },
  },
}

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e9 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(4)
  return Number(n.toPrecision(8)).toString()
}

export default function UnitConverter({ onOutput, initialState }: ToolProps) {
  const [category, setCategory] = useState((initialState?.category as string) ?? 'length')
  const [fromUnit, setFromUnit] = useState('m')
  const [value, setValue] = useState((initialState?.value as string) ?? '1')
  const [error, setError] = useState<string | null>(null)

  const cat = CATEGORIES[category]
  const units = Object.entries(cat.units)

  const numVal = parseFloat(value)
  const isValid = !isNaN(numVal)

  function computeAll(): Array<{ key: string; label: string; result: string }> {
    if (!isValid || !cat.units[fromUnit]) return []
    try {
      const baseVal = cat.units[fromUnit].toBase(numVal)
      return units.map(([key, u]) => ({
        key,
        label: u.label,
        result: key === fromUnit ? value : formatNum(u.fromBase(baseVal)),
      }))
    } catch { return [] }
  }

  const results = computeAll()

  function handleCategoryChange(c: string) {
    setCategory(c)
    const firstUnit = Object.keys(CATEGORIES[c].units)[0]
    setFromUnit(firstUnit)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button key={key} onClick={() => handleCategoryChange(key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${category === key ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
            {cat.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Value</label>
            <input type="number" value={value} onChange={(e) => { setValue(e.target.value); setError(null) }}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring font-mono" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">From Unit</label>
            <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring">
              {units.map(([key, u]) => <option key={key} value={key}>{u.label}</option>)}
            </select>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.key} className={`flex items-center justify-between rounded-md border p-2.5 ${r.key === fromUnit ? 'border-primary/50 bg-primary/5' : 'border-input'}`}>
              <div>
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="font-mono text-sm mt-0.5">{r.result}</p>
              </div>
              <CopyButton value={r.result} />
            </div>
          ))}
          {results.length > 0 && (() => { onOutput({ value, fromUnit, category }, { results: Object.fromEntries(results.map(r => [r.key, r.result])) }); return null })()}
        </div>
      </div>
    </div>
  )
}
```

**Important:** The inline `onOutput` call in JSX will cause infinite re-renders. Instead, use a `useEffect` to call `onOutput` when results change. Fix the component to move `onOutput` into a `useEffect` that depends on `value`, `fromUnit`, and `category`.

The correct approach:

```tsx
useEffect(() => {
  const r = computeAll()
  if (r.length > 0) {
    onOutput({ value, fromUnit, category }, { results: Object.fromEntries(r.map(x => [x.key, x.result])) })
  }
}, [value, fromUnit, category])
```

Remove the inline `onOutput` call from the JSX. Compute `results` derived from state (not from a function call in render : call `computeAll()` once and store in variable).

Complete, correct component structure:

```tsx
'use client'

import { useState, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

// ... (CATEGORIES and formatNum as above) ...

export default function UnitConverter({ onOutput, initialState }: ToolProps) {
  const [category, setCategory] = useState((initialState?.category as string) ?? 'length')
  const [fromUnit, setFromUnit] = useState(Object.keys(CATEGORIES['length'].units)[0])
  const [value, setValue] = useState((initialState?.value as string) ?? '1')

  const cat = CATEGORIES[category]
  const units = Object.entries(cat.units)
  const numVal = parseFloat(value)
  const isValid = !isNaN(numVal)

  function computeAll() {
    if (!isValid || !cat.units[fromUnit]) return []
    const baseVal = cat.units[fromUnit].toBase(numVal)
    return units.map(([key, u]) => ({
      key, label: u.label,
      result: key === fromUnit ? value : formatNum(u.fromBase(baseVal)),
    }))
  }

  const results = computeAll()

  useEffect(() => {
    if (results.length > 0) {
      onOutput({ value, fromUnit, category }, { results: Object.fromEntries(results.map(r => [r.key, r.result])) })
    }
  }, [value, fromUnit, category])

  function handleCategoryChange(c: string) {
    setCategory(c)
    setFromUnit(Object.keys(CATEGORIES[c].units)[0])
  }

  return (
    // same JSX as above, but without inline onOutput call
    <div className="space-y-4">
      {/* category pills, value input, fromUnit select, results grid */}
    </div>
  )
}
```

The implementer should write the complete, correct component (not use the placeholder JSX comment above : fill in the real JSX from the detailed version above, just with the `useEffect` fix applied).

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/UnitConverter.tsx
rtk git commit -m "feat(office): unit converter : length/weight/temperature/data/speed

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Date Calculator

**Files:**
- Create: `src/components/tools/office/DateCalculator.tsx`

**Interfaces:**
- Consumes: `date-fns` (already installed) : `differenceInDays`, `differenceInCalendarWeeks`, `differenceInMonths`, `differenceInYears`, `addDays`, `addMonths`, `addYears`, `format`, `isWeekend`

- [ ] **Step 1: Create DateCalculator.tsx**

Key logic:
- Tab 1 (Difference): two date pickers → days/weeks/months/years between them + business days count
- Tab 2 (Add/Subtract): date picker + number + unit (days/weeks/months/years) + +/- → result date
- Business days: count non-weekend days between two dates
- `import { differenceInDays, differenceInCalendarWeeks, differenceInMonths, differenceInYears, addDays, addMonths, addYears, addWeeks, format, isWeekend, eachDayOfInterval } from 'date-fns'`

```tsx
'use client'

import { useState } from 'react'
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

  if (diff) onOutput({ date1, date2 }, { days: diff.days, businessDays: diff.businessDays })
  if (added) onOutput({ baseDate, addAmount, addUnit, addDir }, { result: added.result })

  const DIFF_ROWS = diff ? [
    { label: 'Days', value: String(diff.days) },
    { label: 'Business Days', value: String(diff.businessDays) },
    { label: 'Weeks', value: String(diff.weeks) },
    { label: 'Months', value: String(diff.months) },
    { label: 'Years', value: String(diff.years) },
  ] : []

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-1 border border-input rounded-md p-0.5">
            {(['diff', 'add'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
                {t === 'diff' ? 'Date Difference' : 'Add / Subtract'}
              </button>
            ))}
          </div>
          {tab === 'diff' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                <input type="date" value={date1} onChange={(e) => setDate1(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                <input type="date" value={date2} onChange={(e) => setDate2(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Base Date</label>
                <input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAddDir(1)} className={`flex-1 py-2 rounded-md text-sm border transition-colors ${addDir === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'border-input hover:bg-muted/50'}`}>+ Add</button>
                <button onClick={() => setAddDir(-1)} className={`flex-1 py-2 rounded-md text-sm border transition-colors ${addDir === -1 ? 'bg-rose-500/20 text-rose-400 border-rose-500' : 'border-input hover:bg-muted/50'}`}>− Subtract</button>
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
              <p className="text-xs text-muted-foreground mb-1">Result</p>
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
```

**Note:** Move `onOutput` calls inside a `useEffect` (same as UnitConverter note above) to avoid infinite re-renders.

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/DateCalculator.tsx
rtk git commit -m "feat(office): date calculator : difference and add/subtract

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Calculator

**Files:**
- Create: `src/components/tools/office/Calculator.tsx`

**Interfaces:**
- Consumes: `mathjs` : `math.evaluate(expression)` for arbitrary math expressions

- [ ] **Step 1: Create Calculator.tsx**

Key logic:
- `import { evaluate } from 'mathjs'`
- Two modes: "Expression" (type a math expression like `2^10 + sqrt(144)`) and "Button" (calculator buttons)
- Expression mode: textarea input, press Enter or "=" button to evaluate
- Button mode: standard calculator buttons (0-9, +, -, *, /, ., (, ), CE, =), display shows current expression + result
- History: last 10 calculations shown below
- mathjs handles: `sqrt()`, `sin()`, `cos()`, `log()`, `PI`, `E`, `%`, `^`

```tsx
'use client'

import { useState } from 'react'
import { evaluate } from 'mathjs'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

interface HistoryItem { expr: string; result: string }

const BUTTONS = [
  ['(', ')', 'CE', '/'],
  ['7', '8', '9', '*'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '^', '='],
]

export default function Calculator({ onOutput, initialState }: ToolProps) {
  const [expr, setExpr] = useState('')
  const [result, setResult] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [error, setError] = useState<string | null>(null)

  function compute(expression: string) {
    if (!expression.trim()) return
    try {
      const res = String(evaluate(expression))
      setResult(res)
      setError(null)
      setHistory((h) => [{ expr: expression, result: res }, ...h].slice(0, 20))
      onOutput({ expression }, { result: res })
    } catch (e) {
      setError((e as Error).message.replace('Error: ', ''))
      setResult('')
    }
  }

  function handleButton(btn: string) {
    if (btn === '=') { compute(expr); return }
    if (btn === 'CE') { setExpr(''); setResult(''); setError(null); return }
    setExpr((e) => e + btn)
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="rounded-md border border-input bg-muted/30 p-4 min-h-[80px]">
          <p className="font-mono text-sm text-muted-foreground break-all">{expr || '0'}</p>
          {result && <p className="font-mono text-2xl font-bold mt-1 break-all">= {result}</p>}
        </div>
        {error && <ErrorAlert message={error} />}
        <div className="space-y-1.5">
          {BUTTONS.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-1.5">
              {row.map((btn) => (
                <button key={btn} onClick={() => handleButton(btn)}
                  className={`py-3 rounded-md text-sm font-medium border transition-colors ${
                    btn === '=' ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' :
                    ['CE', '/', '*', '-', '+', '^'].includes(btn) ? 'border-input bg-muted/50 hover:bg-muted' :
                    'border-input hover:bg-muted/50'
                  }`}>
                  {btn}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Expression</label>
          <div className="flex gap-2">
            <input value={expr} onChange={(e) => setExpr(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(expr) }}
              className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. sqrt(144) + 2^8 - PI" spellCheck={false} />
            <button onClick={() => compute(expr)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">=</button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Supports: sqrt, sin, cos, log, PI, E, %, ^</p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">History</p>
        {history.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-auto">
            {history.map((h, i) => (
              <div key={i} onClick={() => { setExpr(h.expr); setResult(h.result) }}
                className="flex items-center justify-between rounded-md border border-input px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{h.expr}</p>
                  <p className="font-mono text-sm font-medium">= {h.result}</p>
                </div>
                <CopyButton value={h.result} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Calculations will appear here</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/Calculator.tsx
rtk git commit -m "feat(office): scientific calculator with history and expression mode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: CSV Editor

**Files:**
- Create: `src/components/tools/office/CsvEditor.tsx`

**Interfaces:**
- Consumes: `papaparse` (already installed) : `Papa.parse(csv, { header: false })` and `Papa.unparse(data)`

- [ ] **Step 1: Create CsvEditor.tsx**

Key logic:
- Three tabs: "Paste CSV", "Upload File", "Table" (the editable grid)
- Parse CSV with `Papa.parse(csv, { header: false, skipEmptyLines: true })`
- Display as HTML table with editable cells (contentEditable divs or input cells)
- Add/remove rows and columns buttons
- Export button: `Papa.unparse(data)` → download as .csv
- State: `data: string[][]` (rows × columns)
- Use `FileDropzone` for file upload tab

```tsx
'use client'

import { useState, useCallback } from 'react'
import Papa from 'papaparse'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'paste' | 'upload' | 'table'

export default function CsvEditor({ onOutput, initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('paste')
  const [rawCsv, setRawCsv] = useState((initialState?.rawCsv as string) ?? '')
  const [data, setData] = useState<string[][]>([])
  const [error, setError] = useState<string | null>(null)

  function parseCsv(csv: string) {
    const result = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true })
    if (result.errors.length > 0 && result.data.length === 0) {
      setError(result.errors[0].message)
      return
    }
    setError(null)
    setData(result.data as string[][])
    setTab('table')
    onOutput({ rowCount: result.data.length }, { parsed: true })
  }

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setRawCsv(text)
      parseCsv(text)
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }, [])

  function updateCell(row: number, col: number, value: string) {
    setData((prev) => prev.map((r, ri) => ri === row ? r.map((c, ci) => ci === col ? value : c) : r))
  }

  function addRow() {
    const cols = data[0]?.length ?? 3
    setData((prev) => [...prev, Array(cols).fill('')])
  }

  function addCol() {
    setData((prev) => prev.map((row) => [...row, '']))
  }

  function removeRow(i: number) {
    setData((prev) => prev.filter((_, ri) => ri !== i))
  }

  function downloadCsv() {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'data.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 border border-input rounded-md p-0.5">
          {(['paste', 'upload', 'table'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
              {t === 'paste' ? 'Paste CSV' : t === 'upload' ? 'Upload' : `Table ${data.length > 0 ? `(${data.length}×${data[0]?.length ?? 0})` : ''}`}
            </button>
          ))}
        </div>
        {data.length > 0 && (
          <div className="ml-auto flex gap-2">
            <button onClick={addRow} className="px-3 py-1.5 rounded-md border border-input text-xs hover:bg-muted/50 transition-colors">+ Row</button>
            <button onClick={addCol} className="px-3 py-1.5 rounded-md border border-input text-xs hover:bg-muted/50 transition-colors">+ Col</button>
            <button onClick={downloadCsv} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">Export CSV</button>
          </div>
        )}
      </div>
      {error && <ErrorAlert message={error} />}
      {tab === 'paste' && (
        <div className="space-y-2">
          <textarea value={rawCsv} onChange={(e) => setRawCsv(e.target.value)}
            className="w-full min-h-[200px] font-mono text-xs border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
            placeholder="name,email,age&#10;Alice,alice@example.com,30&#10;Bob,bob@example.com,25" spellCheck={false} />
          <button onClick={() => parseCsv(rawCsv)} disabled={!rawCsv.trim()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
            Parse CSV
          </button>
        </div>
      )}
      {tab === 'upload' && (
        <FileDropzone accept=".csv,text/csv" onFile={handleFile} label="Drop a CSV file or click to upload" />
      )}
      {tab === 'table' && (
        data.length > 0 ? (
          <div className="overflow-auto border border-input rounded-md max-h-[500px]">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {data.map((row, ri) => (
                  <tr key={ri} className={`border-b border-border/50 ${ri === 0 ? 'bg-muted/50 font-medium' : ''}`}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border-r border-border/30 last:border-r-0 p-0">
                        <input value={cell} onChange={(e) => updateCell(ri, ci, e.target.value)}
                          className="w-full px-2 py-1.5 font-mono text-xs bg-transparent outline-none focus:ring-1 focus:ring-inset focus:ring-primary min-w-[80px]" />
                      </td>
                    ))}
                    <td className="p-1">
                      <button onClick={() => removeRow(ri)} className="text-xs text-muted-foreground hover:text-rose-400 px-1">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Paste or upload a CSV to start editing</p>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/CsvEditor.tsx
rtk git commit -m "feat(office): CSV editor with inline cell editing and export

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Word Counter

**Files:**
- Create: `src/components/tools/office/WordCounter.tsx`

- [ ] **Step 1: Create WordCounter.tsx**

Key logic: No external deps. Pure string operations.
- Words: `text.trim().split(/\s+/).filter(Boolean).length`
- Characters (with spaces): `text.length`
- Characters (no spaces): `text.replace(/\s/g, '').length`
- Sentences: `text.split(/[.!?]+/).filter(s => s.trim()).length`
- Paragraphs: `text.split(/\n\s*\n/).filter(p => p.trim()).length`
- Reading time: `Math.ceil(words / 200)` minutes (200 WPM average)
- Speaking time: `Math.ceil(words / 130)` minutes (130 WPM)
- Top N most frequent words (excluding stop words)

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import type { ToolProps } from '@/types'

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they'])

export default function WordCounter({ onOutput, initialState }: ToolProps) {
  const [text, setText] = useState((initialState?.text as string) ?? '')

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : []
    const sentences = text.trim() ? text.split(/[.!?]+/).filter((s) => s.trim()).length : 0
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0
    const readMin = Math.ceil(words.length / 200)
    const speakMin = Math.ceil(words.length / 130)

    const freq: Record<string, number> = {}
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '')
      if (lower && !STOP_WORDS.has(lower)) freq[lower] = (freq[lower] ?? 0) + 1
    }
    const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)

    return { wordCount: words.length, charCount: text.length, charNoSpace: text.replace(/\s/g, '').length, sentences, paragraphs, readMin, speakMin, topWords }
  }, [text])

  useEffect(() => {
    if (stats.wordCount > 0) {
      onOutput({ text: text.slice(0, 100) }, { wordCount: stats.wordCount, charCount: stats.charCount })
    }
  }, [stats.wordCount, stats.charCount])

  const STAT_ROWS = [
    { label: 'Words', value: stats.wordCount.toLocaleString() },
    { label: 'Characters', value: stats.charCount.toLocaleString() },
    { label: 'Characters (no spaces)', value: stats.charNoSpace.toLocaleString() },
    { label: 'Sentences', value: stats.sentences.toLocaleString() },
    { label: 'Paragraphs', value: stats.paragraphs.toLocaleString() },
    { label: 'Reading time', value: `~${stats.readMin} min` },
    { label: 'Speaking time', value: `~${stats.speakMin} min` },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[400px] text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring leading-relaxed"
          placeholder="Paste or type your text here..."
        />
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-input overflow-hidden">
          {STAT_ROWS.map((r, i) => (
            <div key={r.label} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-border/50' : ''}`}>
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="font-mono font-semibold">{r.value}</span>
            </div>
          ))}
        </div>
        {stats.topWords.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Words</p>
            <div className="space-y-1">
              {stats.topWords.map(([word, count]) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="font-mono text-sm w-32 truncate">{word}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / stats.topWords[0][1]) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/WordCounter.tsx
rtk git commit -m "feat(office): word counter with reading time and top words

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Scratchpad

**Files:**
- Create: `src/components/tools/office/Scratchpad.tsx`

- [ ] **Step 1: Create Scratchpad.tsx**

Key logic:
- Two tabs: "Notes" and "To-Do"
- Notes: large textarea, auto-saves to localStorage every 500ms (debounced)
- To-Do: list of items with checkbox toggle + delete, add new item input, persists to localStorage
- No `onOutput` calls (pure persistence tool)
- Use `useEffect` + `localStorage.getItem/setItem` directly (no hook needed, simple enough)
- Keys: `'gawe-scratchpad-notes'` and `'gawe-scratchpad-todos'`

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'

interface TodoItem { id: string; text: string; done: boolean }

type Tab = 'notes' | 'todo'

export default function Scratchpad({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('notes')
  const [notes, setNotes] = useState('')
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodo, setNewTodo] = useState('')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('gawe-scratchpad-notes') ?? ''
    const savedTodos = JSON.parse(localStorage.getItem('gawe-scratchpad-todos') ?? '[]') as TodoItem[]
    setNotes(savedNotes)
    setTodos(savedTodos)
  }, [])

  // Auto-save notes
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem('gawe-scratchpad-notes', notes)
    }, 500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [notes])

  // Save todos immediately
  useEffect(() => {
    localStorage.setItem('gawe-scratchpad-todos', JSON.stringify(todos))
  }, [todos])

  function addTodo() {
    if (!newTodo.trim()) return
    setTodos((prev) => [...prev, { id: Date.now().toString(), text: newTodo.trim(), done: false }])
    setNewTodo('')
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const doneCount = todos.filter((t) => t.done).length

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 border border-input rounded-md p-0.5">
          {(['notes', 'todo'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
              {t === 'notes' ? 'Notes' : `To-Do ${todos.length > 0 ? `(${doneCount}/${todos.length})` : ''}`}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">Auto-saved locally</span>
      </div>
      {tab === 'notes' ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 min-h-[500px] text-sm border border-input rounded-md p-4 bg-background resize-none outline-none focus:ring-1 focus:ring-ring leading-relaxed"
          placeholder="Start typing your notes... Everything is saved automatically."
        />
      ) : (
        <div className="space-y-3 flex-1">
          <div className="flex gap-2">
            <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
              className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="New task... (press Enter to add)" />
            <button onClick={addTodo} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">Add</button>
          </div>
          <div className="space-y-1">
            {todos.filter((t) => !t.done).map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 rounded-md border border-input px-3 py-2.5 hover:bg-muted/20">
                <input type="checkbox" checked={false} onChange={() => toggleTodo(todo.id)} className="rounded" />
                <span className="flex-1 text-sm">{todo.text}</span>
                <button onClick={() => deleteTodo(todo.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">✕</button>
              </div>
            ))}
            {todos.some((t) => t.done) && (
              <>
                <p className="text-xs text-muted-foreground px-1 pt-2">Completed</p>
                {todos.filter((t) => t.done).map((todo) => (
                  <div key={todo.id} className="flex items-center gap-3 rounded-md border border-border/30 px-3 py-2.5 opacity-60">
                    <input type="checkbox" checked onChange={() => toggleTodo(todo.id)} className="rounded" />
                    <span className="flex-1 text-sm line-through text-muted-foreground">{todo.text}</span>
                    <button onClick={() => deleteTodo(todo.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">✕</button>
                  </div>
                ))}
              </>
            )}
            {todos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet : add one above</p>}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/Scratchpad.tsx
rtk git commit -m "feat(office): scratchpad with notes and to-do list, persisted locally

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Meeting Cost Calculator

**Files:**
- Create: `src/components/tools/office/MeetingCost.tsx`

- [ ] **Step 1: Create MeetingCost.tsx**

Key logic:
- Inputs: attendees count (1-50), average hourly salary (USD), meeting duration (minutes)
- Real-time cost ticker: when running, ticks up every second
- Formula: `cost = (attendees * hourlyRate / 3600) * elapsedSeconds`
- Start/Stop/Reset buttons
- Show: total cost, cost per minute, cost breakdown per person
- Display large running cost like a taxi meter: `$123.45`

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'

export default function MeetingCost({ onOutput, initialState }: ToolProps) {
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
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Attendees</label>
          <input type="number" min={1} max={100} value={attendees} onChange={(e) => setAttendees(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Avg Hourly Rate (USD)</label>
          <input type="number" min={1} value={hourlyRate} onChange={(e) => setHourlyRate(Math.max(1, Number(e.target.value)))}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
        </div>
      </div>
      <div className="rounded-xl border border-input bg-muted/30 p-8 text-center space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Meeting Cost</p>
        <p className={`font-mono text-5xl font-bold tabular-nums transition-colors ${isRunning ? 'text-rose-400' : 'text-foreground'}`}>
          ${totalCost.toFixed(2)}
        </p>
        <p className="font-mono text-lg text-muted-foreground">{formatTime(elapsed)}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setIsRunning((r) => !r)}
            className={`px-8 py-3 rounded-full font-medium text-sm transition-colors ${isRunning ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {isRunning ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start'}
          </button>
          <button onClick={reset} className="px-6 py-3 rounded-full border border-input hover:bg-muted/50 transition-colors text-sm">Reset</button>
        </div>
      </div>
      <div className="rounded-md border border-input p-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Breakdown</p>
        {[
          { label: 'Cost per second', value: `$${costPerSecond.toFixed(4)}` },
          { label: 'Cost per minute', value: `$${(costPerSecond * 60).toFixed(2)}` },
          { label: 'Cost per person (so far)', value: `$${(totalCost / attendees).toFixed(2)}` },
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
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/MeetingCost.tsx
rtk git commit -m "feat(office): meeting cost calculator with real-time ticker

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Pastebin

**Files:**
- Create: `src/components/tools/office/Pastebin.tsx`

- [ ] **Step 1: Create Pastebin.tsx**

Key logic:
- Local-only pastebin: create, view, delete text snippets
- State: list of snippets persisted in localStorage (`'gawe-pastebin'` key)
- Snippet: `{ id: string; name: string; content: string; createdAt: number; language?: string }`
- UI: left panel = snippet list; right panel = create new / view selected
- Features: create new (name + content + optional language tag), copy content, delete
- Sort by newest first

```tsx
'use client'

import { useState, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'

interface Snippet { id: string; name: string; content: string; createdAt: number; language: string }

const STORAGE_KEY = 'gawe-pastebin'

export default function Pastebin({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newLang, setNewLang] = useState('text')

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Snippet[]
    setSnippets(stored.sort((a, b) => b.createdAt - a.createdAt))
  }, [])

  function save(updated: Snippet[]) {
    const sorted = updated.sort((a, b) => b.createdAt - a.createdAt)
    setSnippets(sorted)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  }

  function createSnippet() {
    if (!newName.trim() || !newContent.trim()) return
    const s: Snippet = { id: Date.now().toString(), name: newName.trim(), content: newContent, createdAt: Date.now(), language: newLang }
    save([s, ...snippets])
    setSelected(s.id)
    setCreating(false)
    setNewName('')
    setNewContent('')
    setNewLang('text')
  }

  function deleteSnippet(id: string) {
    save(snippets.filter((s) => s.id !== id))
    if (selected === id) setSelected(null)
  }

  const selectedSnippet = snippets.find((s) => s.id === selected)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 h-full">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{snippets.length} snippets</p>
          <button onClick={() => { setCreating(true); setSelected(null) }}
            className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
            + New
          </button>
        </div>
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {snippets.length > 0 ? snippets.map((s) => (
            <div key={s.id} onClick={() => { setSelected(s.id); setCreating(false) }}
              className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors group ${selected === s.id ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/30'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.language} · {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id) }}
                className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-rose-400 transition-all ml-2 shrink-0">✕</button>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No snippets yet</p>
          )}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        {creating ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="Snippet name..." />
              <select value={newLang} onChange={(e) => setNewLang(e.target.value)}
                className="text-sm border border-input rounded-md px-2 py-2 bg-background outline-none">
                {['text', 'json', 'js', 'ts', 'css', 'html', 'python', 'sql', 'bash', 'markdown'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <CodeEditor value={newContent} onChange={setNewContent} language={newLang} />
            <div className="flex gap-2">
              <button onClick={createSnippet} disabled={!newName.trim() || !newContent.trim()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                Save Snippet
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : selectedSnippet ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedSnippet.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedSnippet.language} · {new Date(selectedSnippet.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <CopyButton value={selectedSnippet.content} />
                <button onClick={() => deleteSnippet(selectedSnippet.id)}
                  className="px-3 py-1.5 rounded-md border border-rose-500/30 text-rose-400 text-xs hover:bg-rose-500/10 transition-colors">
                  Delete
                </button>
              </div>
            </div>
            <CodeEditor value={selectedSnippet.content} language={selectedSnippet.language} readOnly />
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Select a snippet or create a new one
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/Pastebin.tsx
rtk git commit -m "feat(office): local pastebin : create/view/delete text snippets

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ pomodoro: 25/5/15 modes, circular SVG progress, Web Audio beep, completed counter
- ✅ timezone-clock: live world clock, Intl.supportedValuesOf, add/remove zones, 1s interval
- ✅ unit-converter: length/weight/temperature/data/speed, useEffect for onOutput
- ✅ date-calculator: date difference (days/weeks/months/years/business days) + add/subtract
- ✅ calculator: mathjs evaluate, button pad, expression input, history
- ✅ csv-editor: papaparse parse/unparse, editable table, add/remove rows/cols, export
- ✅ word-counter: words/chars/sentences/paragraphs/reading time/speaking time/top words
- ✅ scratchpad: notes + todo, localStorage persistence, auto-save debounce
- ✅ meeting-cost: real-time ticker, setInterval cleanup, breakdown
- ✅ pastebin: localStorage snippets, CRUD, language tag, CodeEditor
- ✅ All 10 tools follow ToolProps interface with 'use client'

**Important notes:**
- UnitConverter and DateCalculator: call `onOutput` in `useEffect`, NOT inline in render, to avoid infinite re-renders
- Pomodoro: `setInterval` inside `useEffect` with cleanup; `beep()` wraps AudioContext in try/catch (may be unavailable in some environments)
- TimezoneClock: `Intl.supportedValuesOf` may not exist in all browsers : fallback to DEFAULT_ZONES shown in code
