'use client'

import { useState, useEffect } from 'react'
import { decodeJwt } from 'jose'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'

function decodeBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=')
  return atob(padded)
}

export default function JwtDecoder({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [token, setToken] = useState((initialState?.token as string) ?? '')
  const [header, setHeader] = useState('')
  const [payload, setPayload] = useState('')
  const [expStatus, setExpStatus] = useState<'valid' | 'expired' | 'no-exp' | null>(null)
  const [expDate, setExpDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = token.trim()
    if (!raw) { setHeader(''); setPayload(''); setExpStatus(null); setError(null); return }
    try {
      const parts = raw.split('.')
      if (parts.length !== 3) throw new Error('Not a valid JWT (expected 3 dot-separated parts)')
      const headerObj = JSON.parse(decodeBase64Url(parts[0]))
      const claims = decodeJwt(raw)
      setHeader(JSON.stringify(headerObj, null, 2))
      setPayload(JSON.stringify(claims, null, 2))
      if (claims.exp) {
        const exp = claims.exp as number
        const expired = Date.now() / 1000 > exp
        setExpStatus(expired ? 'expired' : 'valid')
        setExpDate(new Date(exp * 1000).toLocaleString())
      } else {
        setExpStatus('no-exp')
        setExpDate(null)
      }
      setError(null)
      onOutput({ token: '[redacted]' }, { alg: headerObj.alg, expired: expStatus === 'expired' })
    } catch (e) {
      setError((e as Error).message)
      setHeader('')
      setPayload('')
      setExpStatus(null)
    }
  }, [token])

  const parts = token.trim().split('.')

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('crypto.jwt_header', 'JWT Token')}</label>
            <textarea value={token} onChange={(e) => setToken(e.target.value)}
              className="w-full min-h-[120px] font-mono text-xs border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('crypto.input_placeholder', 'Paste your JWT here...')} spellCheck={false} />
          </div>
          {token.trim() && parts.length === 3 && (
            <div className="font-mono text-xs p-3 rounded-md border border-input bg-muted/30 break-all leading-relaxed">
              <span className="text-rose-400">{parts[0]}</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-emerald-400">{parts[1]}</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-sky-400">{parts[2].slice(0, 20)}…</span>
            </div>
          )}
          {expStatus && (
            <div className={`rounded-md border p-3 ${expStatus === 'expired' ? 'border-rose-500 bg-rose-500/10' : expStatus === 'valid' ? 'border-emerald-500 bg-emerald-500/10' : 'border-muted bg-muted/30'}`}>
              <p className={`text-sm font-medium ${expStatus === 'expired' ? 'text-rose-400' : expStatus === 'valid' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {expStatus === 'expired' ? `✗ ${t('crypto.jwt_expired', 'Expired')}` : expStatus === 'valid' ? `✓ ${t('crypto.jwt_valid', 'Valid')}` : t('crypto.jwt_valid', 'No Expiry')}
              </p>
              {expDate && <p className="text-xs text-muted-foreground mt-0.5">{t('crypto.totp_expires', 'Expires')}: {expDate}</p>}
            </div>
          )}
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-4">
          {header && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-rose-400">{t('crypto.jwt_header', 'Header')}</span>
                <CopyButton value={header} />
              </div>
              <CodeEditor value={header} onChange={() => {}} language="json" readOnly />
            </div>
          )}
          {payload && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-emerald-400">{t('crypto.jwt_payload', 'Payload')}</span>
                <CopyButton value={payload} />
              </div>
              <CodeEditor value={payload} onChange={() => {}} language="json" readOnly />
            </div>
          )}
          {!header && !error && (
            <p className="text-sm text-muted-foreground">{t('crypto.empty_prompt', 'Paste a JWT to decode its header and payload')}</p>
          )}
          <p className="text-xs text-muted-foreground">{t('crypto.jwt_signature', 'Signature is not verified : this tool only decodes.')}</p>
        </div>
      }
    />
  )
}
