'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface FormattedNumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  placeholder?: string
}

function format(n: number): string {
  return n ? n.toLocaleString('id-ID') : ''
}

/**
 * Number input that displays "." as a thousands separator (e.g. 1.000.000) while
 * keeping the underlying value a plain number. Only meant for whole-number amounts
 * (money, quantities) — not for fields that need decimals or negative values.
 */
export function FormattedNumberInput({ value, onChange, min, max, className, placeholder }: FormattedNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const caretDigitsRef = useRef<number | null>(null)
  const [display, setDisplay] = useState(() => format(value))

  // Restore caret position after reformatting shifts separator characters around it.
  useLayoutEffect(() => {
    if (caretDigitsRef.current === null || !inputRef.current) return
    const target = caretDigitsRef.current
    let count = 0
    let pos = display.length
    for (let i = 0; i < display.length; i++) {
      if (/\d/.test(display[i])) count++
      if (count === target) { pos = i + 1; break }
    }
    if (target === 0) pos = 0
    inputRef.current.setSelectionRange(pos, pos)
    caretDigitsRef.current = null
  }, [display])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const caret = e.target.selectionStart ?? raw.length
    caretDigitsRef.current = raw.slice(0, caret).replace(/\D/g, '').length

    const digits = raw.replace(/\D/g, '')
    let num = digits ? Number(digits) : 0
    if (min !== undefined) num = Math.max(min, num)
    if (max !== undefined) num = Math.min(max, num)

    setDisplay(num ? format(num) : digits ? '0' : '')
    onChange(num)
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        'w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring',
        className,
      )}
    />
  )
}
