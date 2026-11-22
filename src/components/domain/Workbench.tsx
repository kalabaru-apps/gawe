'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Toolbar row: groups separated by hairlines. */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="toolbar" className={cn('flex min-h-10 flex-wrap items-center gap-2 border-b border-d-border bg-d-raised px-3 py-1', className)}>
      {children}
    </div>
  )
}

export function StatusBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-4 border-t border-d-border bg-d-raised px-3 font-mono text-[11px] text-d-muted">
      {children}
    </div>
  )
}

/** A titled pane: label left, actions right, content fills. */
export function Pane({ label, actions, children, className }: {
  label: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)} aria-label={label}>
      <header className="flex h-8 shrink-0 items-center justify-between border-b border-d-border px-3">
        <h2 className="text-xs font-medium text-d-muted">{label}</h2>
        <div className="flex items-center gap-1">{actions}</div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}

/**
 * Two panes with a draggable divider. Side by side from lg, stacked below.
 * Keyboard: focus the divider, arrow keys move it.
 */
export function SplitPane({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const [ratio, setRatio] = useState(50)
  const box = useRef<HTMLDivElement>(null)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !box.current) return
    const r = box.current.getBoundingClientRect()
    setRatio(Math.min(80, Math.max(20, ((e.clientX - r.left) / r.width) * 100)))
  }, [])
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setRatio((v) => Math.max(20, v - 5))
    if (e.key === 'ArrowRight') setRatio((v) => Math.min(80, v + 5))
  }

  return (
    <div ref={box} className="flex min-h-0 flex-1 flex-col lg:flex-row" style={{ ['--split' as string]: `${ratio}%` }}>
      <div className="flex min-h-[240px] min-w-0 flex-1 flex-col lg:min-h-0 lg:flex-none lg:basis-[var(--split)]">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(ratio)}
        aria-valuemin={20}
        aria-valuemax={80}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className="hidden w-1 shrink-0 cursor-col-resize touch-none bg-d-border transition-colors hover:bg-d-accent focus-visible:bg-d-accent focus-visible:outline-none lg:block"
      />
      <div className="flex min-h-[240px] min-w-0 flex-1 flex-col border-t border-d-border lg:min-h-0 lg:border-t-0">{right}</div>
    </div>
  )
}

/** Full-height workbench frame. */
export function Workbench({ toolbar, status, children }: {
  toolbar?: React.ReactNode
  status?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {toolbar}
      {children}
      {status}
    </div>
  )
}

/** Workbench button: flat, square-ish, accent when primary. */
export function WbButton({ primary, className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-d border px-2.5 text-xs font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-accent disabled:cursor-not-allowed disabled:opacity-40',
        primary
          ? 'border-d-accent bg-d-accent text-d-accent-ink hover:brightness-110'
          : 'border-d-border bg-transparent text-d-ink hover:bg-d-border/40',
        className,
      )}
    />
  )
}

/** Segmented choice, e.g. indent size. */
export function Segmented<T extends string>({ value, onChange, options, label }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-d border border-d-border">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-7 cursor-pointer px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-d-accent',
            value === o.value ? 'bg-d-ink text-d-surface' : 'text-d-muted hover:bg-d-border/40',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Code surface: line-numbered textarea feel without a heavy editor dependency. */
export function CodeArea({ value, onChange, readOnly, placeholder, label }: {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  placeholder?: string
  label: string
}) {
  return (
    <textarea
      aria-label={label}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      placeholder={placeholder}
      spellCheck={false}
      className="min-h-0 w-full flex-1 resize-none bg-d-surface p-3 font-mono text-[13px] leading-6 text-d-ink outline-none placeholder:text-d-muted/70 focus-visible:bg-d-raised"
    />
  )
}
export * from './kit'
