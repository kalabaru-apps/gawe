'use client'

import { useState, useEffect } from 'react'
import CryptoJS from 'crypto-js'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'

interface HashRow {
  label: string
  value: string
}

export default function HashGenerator({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [hmacKey, setHmacKey] = useState((initialState?.hmacKey as string) ?? '')
  const [uppercase, setUppercase] = useState(false)
  const [hashes, setHashes] = useState<HashRow[]>([])

  useEffect(() => {
    if (!input) { setHashes([]); return }
    const fmt = (h: string) => uppercase ? h.toUpperCase() : h
    const rows: HashRow[] = [
      { label: 'MD5', value: fmt(CryptoJS.MD5(input).toString()) },
      { label: 'SHA-1', value: fmt(CryptoJS.SHA1(input).toString()) },
      { label: 'SHA-256', value: fmt(CryptoJS.SHA256(input).toString()) },
      { label: 'SHA-512', value: fmt(CryptoJS.SHA512(input).toString()) },
    ]
    if (hmacKey) {
      rows.push({ label: 'HMAC-SHA256', value: fmt(CryptoJS.HmacSHA256(input, hmacKey).toString()) })
      rows.push({ label: 'HMAC-SHA512', value: fmt(CryptoJS.HmacSHA512(input, hmacKey).toString()) })
    }
    setHashes(rows)
    onOutput({ input, hmacKey }, { sha256: rows.find((r) => r.label === 'SHA-256')?.value ?? '' })
  }, [input, hmacKey, uppercase, onOutput])

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Input Text</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full min-h-[120px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter text to hash..."
              spellCheck={false}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">HMAC Key (optional)</label>
            <input
              value={hmacKey}
              onChange={(e) => setHmacKey(e.target.value)}
              className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="Secret key for HMAC..."
              spellCheck={false}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="rounded" />
            Uppercase output
          </label>
        </div>
      }
      right={
        <div className="space-y-2">
          {hashes.length > 0 ? (
            hashes.map((h) => (
              <div key={h.label} className="rounded-md border border-input p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{h.label}</span>
                  <CopyButton value={h.value} />
                </div>
                <p className="font-mono text-xs break-all">{h.value}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Enter text to compute hashes</p>
          )}
        </div>
      }
    />
  )
}
