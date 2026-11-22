'use client'

import { useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Big drop target. The hero until a file lands. */
export function DropHero({ accept, multiple, onFiles, title, hint }: {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  title: string
  hint: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)) }}
        className={cn(
          'flex w-full max-w-2xl flex-col items-center gap-5 rounded-[1.25rem] border-2 border-dashed px-8 py-16 text-center transition-colors',
          over ? 'border-d-accent bg-d-accent/10' : 'border-d-border bg-d-raised',
        )}
      >
        <FileUp className="h-10 w-10 text-d-accent" aria-hidden />
        <h2 className="font-display text-3xl font-semibold tracking-tight">{title}</h2>
        <button
          onClick={() => input.current?.click()}
          className="cursor-pointer rounded-d bg-d-accent px-6 py-3 text-base font-semibold text-d-accent-ink transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent"
        >
          Choose files
        </button>
        <p className="text-sm text-d-muted">{hint}</p>
        <input
          ref={input}
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          aria-label={title}
          onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
        />
      </div>
    </div>
  )
}

/** Workspace after a file lands: work area left, options rail right (stacked on phones). */
export function StudioWorkspace({ children, rail }: { children: React.ReactNode; rail: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-5">{children}</div>
      <aside aria-label="Options" className="shrink-0 overflow-auto border-t border-d-border bg-d-raised p-5 lg:w-80 lg:border-l lg:border-t-0">
        {rail}
      </aside>
    </div>
  )
}

/** The one big action at the bottom of the rail. */
export function PrimaryAction({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        'w-full cursor-pointer rounded-d bg-d-accent px-4 py-3.5 text-base font-semibold text-d-accent-ink transition-[filter] hover:brightness-110',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    />
  )
}
export * from './kit'
