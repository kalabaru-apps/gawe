'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { useTranslation } from '@/lib/i18n'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

function generatePassword(length: number, charset: string): string {
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (n) => charset[n % charset.length]).join('')
}

function getStrength(entropy: number): { labelKey: string; color: string; width: string } {
  if (entropy < 40) return { labelKey: 'crypto.strength.weak', color: 'bg-rose-500', width: 'w-1/4' }
  if (entropy < 80) return { labelKey: 'crypto.strength.fair', color: 'bg-amber-500', width: 'w-2/4' }
  if (entropy < 120) return { labelKey: 'crypto.strength.strong', color: 'bg-emerald-500', width: 'w-3/4' }
  return { labelKey: 'crypto.strength.very_strong', color: 'bg-emerald-400', width: 'w-full' }
}

export default function PasswordGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [length, setLength] = useState((initialState?.length as number) ?? 24)
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(false)
  const [password, setPassword] = useState('')
  const [count, setCount] = useState(1)

  const charset = [
    useUpper ? UPPER : '',
    useLower ? LOWER : '',
    useNumbers ? NUMBERS : '',
    useSymbols ? SYMBOLS : '',
  ].join('')

  const generate = useCallback(() => {
    if (!charset) return
    const pwd = generatePassword(length, charset)
    setPassword(pwd)
    onOutput({ length, charset: charset.length }, { password: pwd })
  }, [length, charset, onOutput])

  useEffect(() => { generate() }, [length, useUpper, useLower, useNumbers, useSymbols, count])

  const entropy = charset ? length * Math.log2(charset.length) : 0
  const strength = getStrength(entropy)
  const passwords = count > 1 && charset
    ? Array.from({ length: count }, () => generatePassword(length, charset))
    : [password]

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">{t('crypto.password_length', 'Length')}</label>
              <span className="text-xs font-mono text-muted-foreground">{length}</span>
            </div>
            <input
              type="range" min={8} max={128} value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            {[
              { label: t('crypto.uppercase_chars', 'Uppercase (A-Z)'), state: useUpper, set: setUseUpper },
              { label: t('crypto.lowercase_chars', 'Lowercase (a-z)'), state: useLower, set: setUseLower },
              { label: t('crypto.numbers', 'Numbers (0-9)'), state: useNumbers, set: setUseNumbers },
              { label: t('crypto.symbols', `Symbols (${SYMBOLS.slice(0, 8)}...)`), state: useSymbols, set: setUseSymbols },
            ].map(({ label, state, set }) => (
              <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={state} onChange={(e) => set(e.target.checked)} className="rounded" />
                {label}
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('crypto.count', 'Count')}</label>
            <input
              type="number" min={1} max={20} value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setCount((c) => c)} // trigger re-render
            className="w-full py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors"
          >
            {t('crypto.regenerate', 'Regenerate')}
          </button>
        </div>
      }
      right={
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${strength.color} text-white`}>{t(strength.labelKey)}</span>
                <span className="text-xs text-muted-foreground">{Math.round(entropy)} {t('crypto.entropy', 'bits entropy')}</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
            </div>
          </div>
          <div className="space-y-2">
            {passwords.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-input p-3">
                <p className="font-mono text-sm flex-1 break-all">{p}</p>
                <CopyButton value={p} />
              </div>
            ))}
          </div>
          {!charset && <p className="text-sm text-amber-400">{t('crypto.at_least_one', 'Select at least one character type')}</p>}
        </div>
      }
    />
  )
}
