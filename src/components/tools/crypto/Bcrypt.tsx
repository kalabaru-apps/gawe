'use client'

import { useState, useCallback, useEffect } from 'react'
import { AlertCircle, Check, AlertTriangle, Key as KeyIcon } from 'lucide-react'
import bcrypt from 'bcryptjs'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Key } from '@/components/domain/Instrument'
import { WbButton } from '@/components/domain/Workbench'
import { Workbench, SplitPane, Pane, CodeArea } from '@/components/domain/Workbench'
import { Notice, CopyBtn } from '@/components/domain/kit'

/** Bcrypt: Workbench with hash/verify modes, live results, match/no-match notice. */
export default function Bcrypt({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'hash' | 'verify'>((initialState?.mode as 'hash' | 'verify') ?? 'hash')
  const [password, setPassword] = useState('')
  const [rounds, setRounds] = useState(12)
  const [hashInput, setHashInput] = useState('')
  const [result, setResult] = useState('')
  const [match, setMatch] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setResult('') }, [mode])

  async function handleHash() {
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      const hash = await bcrypt.hash(password, rounds)
      setResult(hash)
      onOutput({ password: '[redacted]', rounds }, { hash })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hash failed')
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
      setError(t('action.error', 'Invalid hash'))
      setMatch(null)
    } finally {
      setLoading(false)
    }
  }

  const ready = password && !loading

  return (
    <Workbench>
      <div className="mb-3 flex gap-2">
        <Key accent={mode === 'hash'} onClick={() => { setMode('hash'); setResult(''); setMatch(null); setError(null) }} className="flex-1 h-9 text-xs font-semibold">
          <KeyIcon className="h-3 w-3 inline mr-1" aria-hidden /> {t('crypto.bcrypt_hash', 'Hash')}
        </Key>
        <Key accent={mode === 'verify'} onClick={() => { setMode('verify'); setResult(''); setMatch(null); setError(null) }} className="flex-1 h-9 text-xs font-semibold">
          <KeyIcon className="h-3 w-3 inline mr-1" aria-hidden /> {t('crypto.bcrypt_verify', 'Verify')}
        </Key>
      </div>

      <SplitPane
        left={
          <Pane label={mode === 'hash' ? t('crypto.passphrase', 'Password') : t('crypto.bcrypt_hash', 'Bcrypt Hash')}>
            {mode === 'hash' ? (
              <>
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-d-ink">Cost Rounds</label>
                    <span className="text-xs font-mono text-d-muted">{rounds} (~{Math.round(2 ** rounds / 1000)}ms)</span>
                  </div>
                  <input
                    type="range" min={8} max={14} value={rounds} onChange={e => setRounds(Number(e.target.value))}
                    className="w-full cursor-pointer"
                    aria-label={t('crypto.bcrypt_rounds', 'Rounds')}
                  />
                </div>
                <CodeArea
                  label={t('crypto.passphrase', 'Password')}
                  value={password}
                  onChange={setPassword}
                  placeholder={t('crypto.passphrase', 'Enter password...')}
                />
              </>
            ) : (
              <CodeArea
                label={t('crypto.bcrypt_hash', 'Bcrypt Hash')}
                value={hashInput}
                onChange={v => setHashInput(v)}
                placeholder="$2b$12$..."
              />
            )}
          </Pane>
        }
        right={
          <Pane
            label={mode === 'hash' ? t('crypto.bcrypt_hash', 'Bcrypt Hash') : t('action.result', 'Result')}
            actions={result && <CopyBtn value={result} />}
          >
            {mode === 'hash' ? (
              loading
                ? <p className="flex items-center justify-center gap-2 p-10 text-d-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-d-accent border-t-transparent" />Computing...</p>
                : result
                  ? <p className="font-mono text-sm break-all p-3">{result}</p>
                  : <p className="flex items-center justify-center gap-2 p-10 text-d-muted"><Check className="h-4 w-4" aria-hidden /><span className="text-xs">{t('crypto.empty_prompt', 'Enter password and click Generate Hash')}</span></p>
            ) : match !== null ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6">
                <p className={`text-3xl font-bold ${match ? 'text-emerald-600' : 'text-red-600'}`}>
                  {match ? t('crypto.bcrypt_match', 'Match') : t('crypto.bcrypt_no_match', 'No Match')}
                </p>
                <p className="text-sm text-d-muted">
                  {match ? t('crypto.bcrypt_match', 'The password matches the hash') : t('crypto.bcrypt_no_match', 'The password does not match the hash')}
                </p>
                {match && <p className="text-xs text-d-muted">The hash was calculated with {rounds} rounds</p>}
              </div>
            ) : (
              <p className="flex items-center justify-center gap-2 p-10 text-d-muted"><span className="text-xs">{t('crypto.empty_prompt', 'Enter password and hash to verify')}</span></p>
            )}
          </Pane>
        }
      />

      <div className="mt-3">
        <Key
          onClick={() => { analytics.buttonClick('bcrypt', mode); (mode === 'hash' ? handleHash : handleVerify)() }}
          disabled={!ready}
          className="w-full h-11 text-sm font-semibold"
        >
          {loading ? t('common.processing', 'Computing…') : (mode === 'hash' ? t('common.generate', 'Generate Hash') : t('crypto.bcrypt_verify', 'Verify'))}
        </Key>
      </div>

      {error && (
        <Notice tone="error" className="mt-3">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {error}
        </Notice>
      )}
    </Workbench>
  )
}