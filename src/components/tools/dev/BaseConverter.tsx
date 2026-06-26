'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

const BASES = [
  { label: 'Binary', base: 2, prefix: '0b' },
  { label: 'Octal', base: 8, prefix: '0o' },
  { label: 'Decimal', base: 10, prefix: '' },
  { label: 'Hexadecimal', base: 16, prefix: '0x' },
]

interface Conversion {
  label: string
  base: number
  prefix: string
  value: string
}

export default function BaseConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '255')
  const [fromBase, setFromBase] = useState<number>((initialState?.fromBase as number) ?? 10)
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const raw = input.trim().replace(/^0[xXbBoO]/, '') // strip prefix
    if (!raw) { setConversions([]); setError(null); return }
    const decimal = parseInt(raw, fromBase)
    if (isNaN(decimal) || decimal < 0) {
      setError(`"${raw}" is not a valid base-${fromBase} number`)
      setConversions([])
      return
    }
    setError(null)
    if (!firedRef.current) { analytics.buttonClick('base-converter', 'convert'); firedRef.current = true }
    const result = BASES.map((b) => {
      let val = decimal.toString(b.base).toUpperCase()
      // Group binary by 4 bits
      if (b.base === 2) val = val.replace(/(.{4})(?=.)/g, '$1 ')
      return { ...b, value: b.base === 16 ? val : decimal.toString(b.base) }
    })
    setConversions(result)
    onOutput({ input, fromBase }, { decimal, hex: decimal.toString(16), binary: decimal.toString(2), octal: decimal.toString(8) })
  }, [input, fromBase, onOutput])

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.base_from', 'Input Base')}</label>
            <div className="flex gap-2">
              {BASES.map((b) => (
                <button
                  key={b.base}
                  onClick={() => setFromBase(b.base)}
                  className={`flex-1 py-2 rounded-md text-sm border transition-colors ${
                    fromBase === b.base ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'
                  }`}
                >
                  {b.label.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {BASES.find((b) => b.base === fromBase)?.label} Number
            </label>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder={fromBase === 16 ? 'FF' : fromBase === 2 ? '11111111' : '255'}
              spellCheck={false}
            />
          </div>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-3">
          {conversions.length > 0 ? (
            conversions.map((c) => (
              <div key={c.base} className="rounded-md border border-input p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{c.label} (base {c.base})</span>
                  <CopyButton value={c.value} />
                </div>
                <p className="font-mono text-sm break-all">{c.prefix}{c.value}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('dev.base_input', 'Enter a number to convert it across all bases')}</p>
          )}
        </div>
      }
    />
  )
}
