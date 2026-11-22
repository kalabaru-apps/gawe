'use client'

import { useState, useEffect, useRef } from 'react'
import { Copy, RefreshCw, Watch, Clock } from 'lucide-react'
import * as OTPAuth from 'otpauth'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Instrument, Readout, Key } from '@/components/domain/Instrument'
import { CopyBtn, Notice, TextInput } from '@/components/domain/kit'

/** Totp: Instrument with live countdown readout and refresh on click. */
export default function Totp({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [secret, setSecret] = useState((initialState?.secret as string) ?? 'JBSWY3DPEHPK3PXP')
  const [code, setCode] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const copy = async () => {
    if (code) {
      await navigator.clipboard.writeText(code)
      analytics.buttonClick('totp', 'copy')
    }
  }

  const updateCode = () => {
    try {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(secret.replace(/\s/g, '').toUpperCase()),
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      })
      const current = totp.generate()
      const secs = 30 - (Math.floor(Date.now() / 1000) % 30)
      setCode(current)
      setRemaining(secs)
      setError(null)
      onOutput({ secret: '[redacted]' }, { code: current })
    } catch {
      setCode('')
      setError(t('crypto.totp_secret', 'Invalid Base32 secret. Example: JBSWY3DPEHPK3PXP'))
    }
  }

  useEffect(() => {
    updateCode()
    intervalRef.current = setInterval(() => { updateCode() }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [secret, onOutput])

  const progress = ((30 - remaining) / 30) * 100
  const urgentColor = remaining <= 5 ? 'text-red-600' : remaining <= 10 ? 'text-amber-600' : 'text-emerald-600'
  const urgentBg = remaining <= 5 ? 'bg-red-600' : remaining <= 10 ? 'bg-amber-600' : 'bg-emerald-600'

  const refresh = () => { updateCode(); analytics.buttonClick('totp', 'refresh') }

  return (
    <Instrument>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-medium text-d-ink mb-2 block">
            <Watch className="h-3 w-3 inline mr-1" aria-hidden />
            {t('crypto.totp_secret', 'Base32 Secret')}
          </label>
          <TextInput
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="w-full font-mono text-sm uppercase"
            placeholder="JBSWY3DPEHPK3PXP"
            spellCheck={false}
          />
          <p className="text-xs text-d-muted mt-1">{t('crypto.totp_hint', 'From authenticator app or QR code')}</p>
        </div>
        {error && (
          <Notice tone="error">
            <Clock className="h-4 w-4" aria-hidden />
            {error}
          </Notice>
        )}
        {code && (
          <Readout label={t('crypto.totp_code', 'Time-based Code')}>
            <div className="flex items-center justify-center gap-3">
              <p className="font-mono text-6xl font-bold tabular-nums tracking-widest leading-none">
                <span className={urgentColor}>{code.slice(0, 3)}</span>
                <span className={urgentColor}>{code.slice(3)}</span>
              </p>
              <CopyBtn value={code} />
            </div>
          </Readout>
        )}
        {(code && remaining > 0) && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-d-muted">{t('crypto.totp_expires', 'Next refresh in')}</span>
              <span className={`font-mono font-bold ${urgentColor}`}>{remaining}s</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-d-border">
              <div className={`h-full rounded-full transition-all ${urgentBg}`} style={{ width: `${100 - progress}%` }} />
            </div>
          </div>
        )}
        <Key accent onClick={refresh} className="h-12">
          <RefreshCw className="h-4 w-4 inline mr-2" aria-hidden />
          {t('common.refresh', 'Refresh')}
        </Key>
      </div>
    </Instrument>
  )
}