'use client'

import { useState } from 'react'
import bcrypt from 'bcryptjs'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Mode = 'hash' | 'verify'

export default function Bcrypt({ onOutput, initialState }: ToolProps) {
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'hash')
  const [password, setPassword] = useState('')
  const [rounds, setRounds] = useState(12)
  const [hashInput, setHashInput] = useState('')
  const [result, setResult] = useState('')
  const [match, setMatch] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleHash() {
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      const hash = await bcrypt.hash(password, rounds)
      setResult(hash)
      onOutput({ password: '[redacted]', rounds }, { hash })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!password || !hashInput) return
    setLoading(true)
    setError(null)
    try {
      const isMatch = await bcrypt.compare(password, hashInput)
      setMatch(isMatch)
      onOutput({ hashInput }, { match: isMatch })
    } catch (e) {
      setError('Invalid hash format')
      setMatch(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['hash', 'verify'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setResult(''); setMatch(null); setError(null) }}
                className={`flex-1 py-2 rounded-md text-sm border capitalize transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                {m === 'hash' ? 'Hash Password' : 'Verify Password'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter password..." />
          </div>
          {mode === 'hash' ? (
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Cost Rounds</label>
                <span className="text-xs font-mono text-muted-foreground">{rounds} (~{Math.round(2 ** rounds / 1000)}ms)</span>
              </div>
              <input type="range" min={8} max={14} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="w-full" />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bcrypt Hash</label>
              <input value={hashInput} onChange={(e) => setHashInput(e.target.value)}
                className="w-full font-mono text-xs border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="$2b$12$..." spellCheck={false} />
            </div>
          )}
          <button onClick={mode === 'hash' ? handleHash : handleVerify} disabled={loading || !password}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? 'Computing…' : mode === 'hash' ? 'Generate Hash' : 'Verify'}
          </button>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-4">
          {mode === 'hash' && result && (
            <div className="rounded-md border border-input p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Bcrypt Hash</span>
                <CopyButton value={result} />
              </div>
              <p className="font-mono text-xs break-all">{result}</p>
            </div>
          )}
          {mode === 'verify' && match !== null && (
            <div className={`rounded-md border p-6 text-center ${match ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'}`}>
              <p className={`text-2xl font-bold mb-1 ${match ? 'text-emerald-400' : 'text-rose-400'}`}>
                {match ? '✓ Match' : '✗ No Match'}
              </p>
              <p className="text-sm text-muted-foreground">
                {match ? 'The password matches the hash' : 'The password does not match the hash'}
              </p>
            </div>
          )}
          {!result && match === null && !loading && (
            <p className="text-sm text-muted-foreground">
              {mode === 'hash' ? 'Enter a password and click Generate Hash' : 'Enter a password and hash to verify'}
            </p>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Computing bcrypt hash (this takes a moment)…
            </div>
          )}
        </div>
      }
    />
  )
}
