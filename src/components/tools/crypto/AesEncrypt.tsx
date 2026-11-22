'use client'

import { useState, useCallback, useEffect } from 'react'
import { Copy, AlertCircle, Lock, Unlock, Eye, EyeOff } from 'lucide-react'
import CryptoJS from 'crypto-js'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, SplitPane, Pane, CodeArea, WbButton, StatusBar } from '@/components/domain/Workbench'
import { CopyBtn, Notice, TextInput } from '@/components/domain/kit'

/** AesEncrypt: Workbench with encrypt/decrypt modes, live results, secret key input with show/hide. */
export default function AesEncrypt({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>((initialState?.mode as 'encrypt' | 'decrypt') ?? 'encrypt')
  const [text, setText] = useState((initialState?.text as string) ?? '')
  const [key, setKey] = useState((initialState?.key as string) ?? '')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  const process = useCallback(async () => {
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
        if (!decrypted) throw new Error(t('crypto.aes_failed', 'Decryption failed: wrong key or invalid ciphertext'))
        setResult(decrypted)
        onOutput({ mode, key: '[redacted]' }, { decrypted })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Operation failed')
      setResult('')
    }
  }, [text, key, mode, onOutput, t])

  const ready = text.trim() && key.trim() && !error

  return (
    <Workbench
      status={
        <StatusBar>
          {mode === 'encrypt' ? <Lock className="h-3 w-3" aria-hidden /> : <Unlock className="h-3 w-3" aria-hidden />}
          <span className="text-xs font-medium capitalize text-d-muted">{mode}</span>
          {result && <span className="ml-auto text-xs text-d-muted">{new Blob([result]).size} B</span>}
        </StatusBar>
      }
    >
      <div className="mb-3 flex gap-2">
        <WbButton primary={mode === 'encrypt'} onClick={() => { setMode('encrypt'); setResult(''); setError(null) }}>
          <Lock className="h-3 w-3 inline mr-1" aria-hidden /> {t('crypto.aes_encrypt', 'Encrypt')}
        </WbButton>
        <WbButton primary={mode === 'decrypt'} onClick={() => { setMode('decrypt'); setResult(''); setError(null) }}>
          <Unlock className="h-3 w-3 inline mr-1" aria-hidden /> {t('crypto.aes_decrypt', 'Decrypt')}
        </WbButton>
      </div>

      <SplitPane
        left={
          <Pane label={mode === 'encrypt' ? t('crypto.plaintext', 'Plaintext') : t('crypto.ciphertext', 'Ciphertext (Base64)')}>
            <CodeArea
              label={mode === 'encrypt' ? t('crypto.plaintext', 'Plaintext') : t('crypto.ciphertext', 'Ciphertext')}
              value={text}
              onChange={setText}
              placeholder={mode === 'encrypt' ? t('crypto.input_placeholder', 'Enter text to encrypt...') : t('crypto.ciphertext', 'Paste ciphertext to decrypt...')}
            />
            <div className="mt-3">
              <label className="text-xs font-medium text-d-ink mb-1 block">{t('crypto.aes_key', 'Secret Key')}</label>
              <div className="relative">
                <TextInput
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  className="w-full pr-10"
                  placeholder={t('crypto.passphrase', 'Encryption key...')}
                  mono
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-d-muted hover:text-d-ink"
                  aria-label={showKey ? t('common.hide', 'Hide key') : t('common.show', 'Show key')}
                >
                  {showKey ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>
            {error && (
              <Notice tone="error" className="mt-3">
                <AlertCircle className="h-4 w-4" aria-hidden />
                {error}
              </Notice>
            )}
          </Pane>
        }
        right={
          <Pane
            label={t('action.output', 'Output')}
            actions={result && <CopyBtn value={result} />}
          >
            {result
              ? <CodeArea label="Result" value={result} readOnly />
              : <p className="flex items-center justify-center p-10 text-d-muted text-sm">{t('action.result', 'Result appears here')}</p>}
          </Pane>
        }
      />

      <div className="mt-3">
        <WbButton primary onClick={process} disabled={!ready} className="w-full">
          {mode === 'encrypt' ? t('crypto.aes_encrypt', 'Encrypt') : t('crypto.aes_decrypt', 'Decrypt')}
        </WbButton>
      </div>
    </Workbench>
  )
}