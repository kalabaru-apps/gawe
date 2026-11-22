'use client'

import { useState, useCallback, useEffect } from 'react'
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import CryptoJS from 'crypto-js'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, StatusBar, CodeArea, WbButton, Segmented } from '@/components/domain/Workbench'
import { CopyBtn, Notice } from '@/components/domain/kit'

/** HashGenerator: Workbench utility showing all hash algorithms live. */
export default function HashGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [uppercase, setUppercase] = useState(false)
  const [hashes, setHashes] = useState<Array<{ label: string; value: string }>>([])

  const compute = useCallback(() => {
    if (!input.trim()) return
    const fmt = (h: string) => uppercase ? h.toUpperCase() : h
    const rows: Array<{ label: string; value: string }> = [
      { label: 'MD5', value: fmt(CryptoJS.MD5(input).toString()) },
      { label: 'SHA-1', value: fmt(CryptoJS.SHA1(input).toString()) },
      { label: 'SHA-256', value: fmt(CryptoJS.SHA256(input).toString()) },
      { label: 'SHA-512', value: fmt(CryptoJS.SHA512(input).toString()) },
    ]
    setHashes(rows)
    analytics.buttonClick('hash-generator', 'hash')
    onOutput({ input }, { sha256: rows.find(r => r.label === 'SHA-256')?.value ?? '' })
  }, [input, uppercase, onOutput])

  useEffect(() => {
    const fs = setTimeout(() => { compute() }, 150)
    return () => clearTimeout(fs)
  }, [input, uppercase, compute])

  const bytes = hashes.length > 0 ? new Blob([hashes.map(h => h.value).join('')]).size : 0
  const lines = hashes.length

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<string>
            label={t('crypto.uppercase', 'Case')}
            value={uppercase ? 'upper' : 'lower'}
            onChange={v => setUppercase(v === 'upper')}
            options={[{ value: 'lower', label: 'Lowercase' }, { value: 'upper', label: 'Uppercase' }]}
          />
          <WbButton onClick={() => setInput('')}>Clear</WbButton>
        </Toolbar>
      }
      status={
        <StatusBar>
          {input.trim() && <span className="text-d-muted">{input.slice(0, 40)}{input.length > 40 ? '...' : ''}</span>}
          {lines > 0 && <span className="ml-auto text-xs text-d-muted">{lines} hashes · {bytes} B</span>}
        </StatusBar>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {hashes.map((h) => (
          <div key={h.label} className="flex items-center gap-3 rounded-d border border-d-border bg-d-raised p-3">
            <span className="w-20 shrink-0 font-mono text-xs font-semibold text-d-muted">{h.label}</span>
            <p className="flex-1 font-mono text-xs text-d-ink break-all">{h.value}</p>
            <CopyBtn value={h.value} />
          </div>
        ))}
        {hashes.length === 0 && (
          <p className="flex items-center justify-center p-10 text-d-muted text-sm">{t('crypto.empty_prompt', 'Enter text to compute hashes')}</p>
        )}
      </div>
    </Workbench>
  )
}