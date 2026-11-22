'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Row, CopyBtn, Section, Field, Seg, Notice, Btn, Scroll } from '@/components/domain'

/** Workbench: type in any base, all others update live */

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

export default function BaseConverter({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '255')
  const [fromBase, setFromBase] = useState<string>((initialState?.fromBase as string) ?? '10')
  const [conversions, setConversions] = useState<Conversion[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const raw = input.trim().replace(/^0[xXbBoO]/, '')
    if (!raw) { setConversions([]); setError(null); return }
    const base = parseInt(fromBase, 10)
    const decimal = parseInt(raw, base)
    if (isNaN(decimal) || decimal < 0) {
      setError(`"${raw}" is not a valid base-${base} number`)
      setConversions([])
      return
    }
    setError(null)
    if (!firedRef.current) { analytics.buttonClick('base-converter', 'convert'); firedRef.current = true }
    const result = BASES.map((b) => {
      let val = decimal.toString(b.base).toUpperCase()
      if (b.base === 2) val = val.replace(/(.{4})(?=.)/g, '$1 ')
      return { ...b, value: b.base === 16 ? val : decimal.toString(b.base) }
    })
    setConversions(result)
    onOutput({ input, fromBase }, { decimal, hex: decimal.toString(16), binary: decimal.toString(2), octal: decimal.toString(8) })
  }, [input, fromBase, onOutput])

  return (
    <Region domain="workbench">
      <Scroll>
        <Column width="md">
          <Section title={t('dev.base_converter', 'Base Converter')}>
            <Field
              id="base-input"
              label={t('dev.base_input', 'Input Number')}
            >
              <div className="space-y-2">
                <Seg<string>
                  value={fromBase}
                  onChange={setFromBase}
                  options={BASES.map(b => ({ value: String(b.base), label: b.label.slice(0, 3) }))}
                  label={t('dev.base_from', 'Input Base')}
                />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  data-testid="base-input"
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink placeholder:text-d-muted/70 focus-visible:border-d-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-d-accent font-mono"
                  placeholder={fromBase === '16' ? 'FF' : fromBase === '2' ? '11111111' : '255'}
                  spellCheck={false}
                />
              </div>
            </Field>
          </Section>

          {error && <Notice tone="error">{error}</Notice>}

          {conversions.length > 0 && (
            <Section title={t('action.result', 'Results')}>
              <div className="space-y-2">
                {conversions.map((c) => (
                  <Row key={c.base} label={`${c.label} (base ${c.base})`} value={c.prefix + c.value} copy mono />
                ))}
              </div>
            </Section>
          )}

          {conversions.length === 0 && !error && (
            <Notice tone="info">{t('dev.base_input', 'Enter a number to convert it across all bases')}</Notice>
          )}
        </Column>
      </Scroll>
    </Region>
  )
}