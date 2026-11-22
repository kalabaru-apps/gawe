'use client'

import { useState, useCallback, useEffect } from 'react'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'
import { CopyBtn, Chip, Stat, Notice } from '@/components/domain/kit'

/** PasswordGenerator: Instrument with big readout, strength meter, auto-regenerate. */
export default function PasswordGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [length, setLength] = useState((initialState?.length as number) ?? 24)
  const [useLower, setUseLower] = useState(true)
  const [useUpper, setUseUpper] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(false)
  const [password, setPassword] = useState('')
  const [count, setCount] = useState(1)

  const charset = [
    useUpper ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '',
    useLower ? 'abcdefghijklmnopqrstuvwxyz' : '',
    useNumbers ? '0123456789' : '',
    useSymbols ? '!@#$%^&*-_+=?' : '',
  ].join('')

  const generate = useCallback(() => {
    if (!charset) return
    const pwd = generatePassword(length, charset)
    setPassword(pwd)
    onOutput({ length, charset: charset.length }, { password: pwd })
  }, [charset, length, onOutput])

  useEffect(() => { generate() }, [length, useLower, useUpper, useNumbers, useSymbols, count])
  const entropy = charset ? length * Math.log2(charset.length) : 0
  const passwords = count > 1 ? Array.from({ length: Math.min(count, 5) }, () => generatePassword(length, charset)) : [password]

  return (
    <Instrument>
      <div className="space-y-5">
        <Readout label={t('crypto.password', 'Password')}>
          {password || '--'}
        </Readout>
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <Stat
              label="Strength"
              value={entropy < 40 ? t('crypto.strength.weak', 'Weak') : entropy < 80 ? t('crypto.strength.fair', 'Fair') : entropy < 120 ? t('crypto.strength.strong', 'Strong') : t('crypto.strength.very_strong', 'Very Strong')}
              tone="display"
              className={entropy < 40 ? 'text-red-600' : entropy < 80 ? 'text-amber-600' : 'text-emerald-600'}
            />
            <Stat label="Entropy" value={`${Math.round(entropy)} bits`} tone="mono" />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-d-border">
            <div className={`h-full transition-all ${
              entropy < 40 ? 'w-1/3 bg-red-600' : entropy < 80 ? 'w-2/3 bg-amber-600' : 'w-full bg-emerald-600'
            }`} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-d-ink mb-2 block">Length {length}</label>
          <input
            type="range" min={8} max={64} value={length} onChange={e => setLength(Number(e.target.value))}
            className="w-full cursor-pointer"
            aria-label={t('crypto.password_length', 'Password length')}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip on={useLower} onClick={() => setUseLower(!useLower)}>Lowercase (a-z)</Chip>
          <Chip on={useUpper} onClick={() => setUseUpper(!useUpper)}>Uppercase (A-Z)</Chip>
          <Chip on={useNumbers} onClick={() => setUseNumbers(!useNumbers)}>Numbers (0-9)</Chip>
          <Chip on={useSymbols} onClick={() => setUseSymbols(!useSymbols)}>Symbols (!@#$)</Chip>
        </div>
        {(passwords.length > 1) && (
          <div className="mt-4 space-y-2 border-t border-d-border pt-4">
            <p className="text-xs text-d-muted">{passwords.length} generated passwords</p>
            {passwords.map((p, i) => (
              <p key={i} className="font-mono text-xs break-all text-d-muted">{p}</p>
            ))}
          </div>
        )}
        <Key accent onClick={() => { analytics.buttonClick('password-generator', 'regenerate'); generate() }} className="w-full h-12">
          <RefreshCw className="h-4 w-4 inline mr-2" aria-hidden />
          {t('crypto.regenerate', 'Regenerate')}
        </Key>
      </div>
    </Instrument>
  )
}

function generatePassword(length: number, charset: string): string {
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (n) => charset[n % charset.length]).join('')
}