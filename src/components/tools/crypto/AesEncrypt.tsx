'use client'

import { useState } from 'react'
import CryptoJS from 'crypto-js'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

type Mode = 'encrypt' | 'decrypt'

export default function AesEncrypt({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'encrypt')
  const [text, setText] = useState((initialState?.text as string) ?? '')
  const [key, setKey] = useState((initialState?.key as string) ?? '')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)

  function process() {
    if (!text || !key) return
    setError(null)
    try {
      if (mode === 'encrypt') {
        const encrypted = CryptoJS.AES.encrypt(text, key).toString()
        setResult(encrypted)
        onOutput({ mode, key: '[redacted]' }, { encrypted })
      } else {
        const bytes = CryptoJS.AES.decrypt(text, key)
        const decrypted = bytes.toString(CryptoJS.enc.Utf8)
        if (!decrypted) throw new Error('Decryption failed : wrong key or invalid ciphertext')
        setResult(decrypted)
        onOutput({ mode, key: '[redacted]' }, { decrypted })
      }
    } catch (e) {
      setError((e as Error).message)
      setResult('')
    }
  }

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['encrypt', 'decrypt'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setResult(''); setError(null) }}
                className={`flex-1 py-2 rounded-md text-sm border capitalize transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                {m === 'encrypt' ? t('crypto.aes_encrypt', 'Encrypt') : t('crypto.aes_decrypt', 'Decrypt')}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {mode === 'encrypt' ? t('crypto.plaintext', 'Plaintext') : t('crypto.ciphertext', 'Ciphertext (Base64)')}
            </label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[120px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder={mode === 'encrypt' ? t('crypto.input_placeholder', 'Enter text to encrypt...') : t('crypto.ciphertext', 'Paste ciphertext to decrypt...')} spellCheck={false} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('crypto.aes_key', 'Secret Key')}</label>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('crypto.passphrase', 'Encryption key...')} />
          </div>
          <button onClick={() => { analytics.buttonClick('aes-encrypt', mode === 'encrypt' ? 'encrypt' : 'decrypt'); process() }} disabled={!text || !key}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mode === 'encrypt' ? t('crypto.aes_encrypt', 'Encrypt') : t('crypto.aes_decrypt', 'Decrypt')}
          </button>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-2">
          <div className="flex justify-end"><CopyButton value={result} /></div>
          <div className="min-h-[200px] font-mono text-sm border border-input rounded-md p-3 bg-muted/30 break-all whitespace-pre-wrap">
            {result || <span className="text-muted-foreground">{t('action.result', 'Result will appear here')}</span>}
          </div>
        </div>
      }
    />
  )
}
