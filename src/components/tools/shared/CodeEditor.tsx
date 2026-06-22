'use client'

import { cn } from '@/lib/utils'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  rows?: number
  placeholder?: string
  readOnly?: boolean
  className?: string
}

export function CodeEditor({
  value,
  onChange,
  language,
  rows = 12,
  placeholder,
  readOnly = false,
  className,
}: CodeEditorProps) {
  return (
    <div className="relative flex flex-col">
      {language && (
        <span className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">{language}</span>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        className={cn(
          'w-full resize-y rounded-md border border-border bg-muted/30 p-3 font-mono text-sm leading-relaxed',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
          'placeholder:text-muted-foreground/50',
          readOnly && 'cursor-default select-all',
          className
        )}
      />
    </div>
  )
}
