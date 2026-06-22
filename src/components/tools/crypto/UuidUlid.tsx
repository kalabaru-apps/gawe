'use client'

import { useState } from 'react'
import { v1, v4, v5, NIL, validate, version } from 'uuid'
import { ulid } from 'ulid'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type UuidVersion = 'v1' | 'v4' | 'v5' | 'ulid'

const DNS_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const URL_NS = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

export default function UuidUlid({ onOutput, initialState }: ToolProps) {
  const [uuidVersion, setUuidVersion] = useState<UuidVersion>((initialState?.uuidVersion as UuidVersion) ?? 'v4')
  const [count, setCount] = useState<number>((initialState?.count as number) ?? 5)
  const [v5Name, setV5Name] = useState((initialState?.v5Name as string) ?? 'example.com')
  const [v5Ns, setV5Ns] = useState<'dns' | 'url'>('dns')
  const [generated, setGenerated] = useState<string[]>([])
  const [validateInput, setValidateInput] = useState('')
  const [validateResult, setValidateResult] = useState<{ valid: boolean; version?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function generate() {
    setError(null)
    try {
      const ids = Array.from({ length: count }, () => {
        switch (uuidVersion) {
          case 'v1': return v1()
          case 'v4': return v4()
          case 'v5': return v5(v5Name, v5Ns === 'dns' ? DNS_NS : URL_NS)
          case 'ulid': return ulid()
        }
      })
      setGenerated(ids)
      onOutput({ type: uuidVersion, count }, { ids })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function checkValidate() {
    const raw = validateInput.trim()
    if (!raw) return
    const isValid = validate(raw)
    setValidateResult({ valid: isValid, version: isValid ? version(raw) : undefined })
  }

  const TYPE_OPTIONS: { value: UuidVersion; label: string; desc: string }[] = [
    { value: 'v1', label: 'UUID v1', desc: 'Time-based' },
    { value: 'v4', label: 'UUID v4', desc: 'Random' },
    { value: 'v5', label: 'UUID v5', desc: 'Name-based (SHA-1)' },
    { value: 'ulid', label: 'ULID', desc: 'Sortable' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setUuidVersion(o.value)}
                className={`rounded-md border p-2.5 text-left transition-colors ${uuidVersion === o.value ? 'bg-primary/10 border-primary' : 'border-input hover:bg-muted/50'}`}>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.desc}</div>
              </button>
            ))}
          </div>
          {uuidVersion === 'v5' && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <input value={v5Name} onChange={(e) => setV5Name(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex gap-2">
                {(['dns', 'url'] as const).map((ns) => (
                  <button key={ns} onClick={() => setV5Ns(ns)}
                    className={`flex-1 py-1.5 rounded text-xs border uppercase transition-colors ${v5Ns === ns ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                    {ns} namespace
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Count (1-50)</label>
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <button onClick={generate}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Generate
          </button>
          {error && <ErrorAlert message={error} />}
          <div className="border-t border-border pt-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Validate UUID</label>
            <div className="flex gap-2">
              <input value={validateInput} onChange={(e) => setValidateInput(e.target.value)}
                className="flex-1 font-mono text-xs border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="Paste UUID to validate..." spellCheck={false} />
              <button onClick={checkValidate} className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">
                Check
              </button>
            </div>
            {validateResult && (
              <p className={`text-xs mt-1 ${validateResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {validateResult.valid ? `✓ Valid UUID v${validateResult.version}` : '✗ Invalid UUID'}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{generated.length} generated</span>
            <CopyButton value={generated.join('\n')} />
          </div>
          <div className="space-y-1 font-mono text-sm">
            {generated.length > 0 ? (
              generated.map((id, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-input px-3 py-2 hover:bg-muted/30">
                  <span className="flex-1 text-xs break-all">{id}</span>
                  <CopyButton value={id} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Click Generate to produce IDs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
