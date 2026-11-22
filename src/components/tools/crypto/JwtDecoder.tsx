'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Copy, AlertCircle, CheckCircle2, Clock, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { decodeJwt } from 'jose'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, SplitPane, Pane, CodeArea, WbButton, StatusBar } from '@/components/domain/Workbench'
import { CopyBtn, Notice, Row } from '@/components/domain/kit'

/** JwtDecoder: Workbench with token pane (colored segments) + decoded header/payload, expiry as human status. */
export default function JwtDecoder({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [token, setToken] = useState((initialState?.token as string) ?? '')
  const [header, setHeader] = useState('')
  const [payload, setPayload] = useState('')
  const [expStatus, setExpStatus] = useState<'valid' | 'expired' | 'no-exp' | null>(null)
  const [expDate, setExpDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const parts = useMemo(() => token.trim().split('.'), [token])

  useEffect(() => {
    const raw = token.trim()
    if (!raw) { setHeader(''); setPayload(''); setExpStatus(null); setError(null); return }
    try {
      const [h, p] = raw.split('.')
      if (!h || !p) throw new Error('Invalid JWT')
      const headerObj = JSON.parse(decodeBase64Url(h))
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
      analytics.buttonClick('jwt-decoder', 'decode')
      onOutput({ token: '[redacted]' }, { alg: headerObj.alg, expired: expStatus === 'expired' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JWT')
      setHeader('')
      setPayload('')
      setExpStatus(null)
    }
  }, [token, onOutput])

  return (
    <Workbench
      status={
        <StatusBar>
          {token.trim() && parts.length === 3 && (
            <span className="flex items-center gap-1 text-d-muted">
              <span className="text-red-500 font-mono">{parts[0]}</span>
              <span className="text-d-muted">.</span>
              <span className="text-emerald-500 font-mono">{parts[1]}</span>
              <span className="text-d-muted">.</span>
              <span className="text-sky-500 font-mono">{parts[2].slice(0, 16)}…</span>
            </span>
          )}
          {expStatus && (
            <span className={`flex items-center gap-1 ${expStatus === 'expired' ? 'text-red-500' : expStatus === 'valid' ? 'text-emerald-500' : 'text-d-muted'}`}>
              {expStatus === 'expired' && <Clock className="h-3 w-3" aria-hidden />}
              {expStatus === 'valid' && <CheckCircle2 className="h-3 w-3" aria-hidden />}
              {expStatus === 'no-exp' && <AlertTriangle className="h-3 w-3" aria-hidden />}
              <span className="text-xs capitalize">{expStatus === 'valid' ? t('crypto.jwt_valid', 'Valid') : expStatus === 'expired' ? t('crypto.jwt_expired', 'Expired') : t('crypto.jwt_no_expiry', 'No Expiry')}</span>
            </span>
          )}
          {expDate && <span className="text-xs text-d-muted">{expDate}</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={t('crypto.jwt_token', 'JWT Token')}>
            <CodeArea
              label={t('crypto.jwt_token', 'JWT Token')}
              value={token}
              onChange={v => setToken(v)}
              placeholder={t('crypto.input_placeholder', 'Paste your JWT here...')}
            />
            {error && (
              <Notice tone="error" className="mt-3">
                <AlertCircle className="h-4 w-4" aria-hidden />
                {error}
              </Notice>
            )}
          </Pane>
        }
        right={
          <Pane label={t('action.output', 'Decoded')}>
            {header && (
              <div className="space-y-3">
                <Row label={t('crypto.jwt_header', 'Header')} value={header} copy mono />
                <Row label={t('crypto.jwt_payload', 'Payload')} value={payload} copy mono />
              </div>
            )}
            {!header && !error && (
              <p className="flex items-center justify-center p-10 text-d-muted text-sm">{t('crypto.empty_prompt', 'Paste a JWT to decode')}</p>
            )}
            <p className="mt-4 text-xs text-d-muted">{t('crypto.jwt_signature', 'Signature is not verified: this tool only decodes.')}</p>
          </Pane>
        }
      />
    </Workbench>
  )
}

function decodeBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=')
  return atob(padded)
}