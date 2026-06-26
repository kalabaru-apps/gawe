'use client'

import { useState, useEffect, useRef } from 'react'
import * as OTPAuth from 'otpauth'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'

export default function Totp({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [secret, setSecret] = useState((initialState?.secret as string) ?? 'JBSWY3DPEHPK3PXP')
  const [code, setCode] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  function updateCode(sec: string) {
    try {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(sec.replace(/\s/g, '').toUpperCase()),
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
    updateCode(secret)
    intervalRef.current = setInterval(() => updateCode(secret), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [secret])

  const progress = ((30 - remaining) / 30) * 100
  const urgentColor = remaining <= 5 ? 'text-rose-400' : remaining <= 10 ? 'text-amber-400' : 'text-foreground'

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('crypto.totp_secret', 'Base32 Secret')}</label>
        <input value={secret} onChange={(e) => setSecret(e.target.value)}
          className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring uppercase"
          placeholder="JBSWY3DPEHPK3PXP" spellCheck={false} />
        <p className="text-xs text-muted-foreground mt-1">{t('crypto.totp_secret', 'The Base32 secret from your 2FA setup (from authenticator app or QR code)')}</p>
      </div>
      {error && <ErrorAlert message={error} />}
      {code && (
        <div className="rounded-xl border border-input bg-muted/30 p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className={`font-mono text-5xl font-bold tracking-widest tabular-nums ${urgentColor}`}>
              {code.slice(0, 3)} {code.slice(3)}
            </span>
            <CopyButton value={code} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('crypto.totp_expires', 'Refreshes in')}</span>
              <span className={`font-mono font-medium ${urgentColor}`}>{remaining}s</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${remaining <= 5 ? 'bg-rose-500' : remaining <= 10 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${100 - progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
