'use client'

// Domain: workbench (live two-pane text transform); file drop reuses the same panes.
import { useState, useMemo, useRef } from 'react'
import { Copy, Check, FileUp, AlertCircle, CheckCircle2, ArrowLeftRight } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'

type Dir = 'auto' | 'encode' | 'decode'

const looksBase64 = (s: string) => {
  const c = s.replace(/\s+/g, '')
  return c.length > 0 && c.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(c)
}
const encode = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin)
}
const decode = (b64: string) => {
  const bin = atob(b64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export default function Base64({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [dir, setDir] = useState<Dir>('auto')
  const [file, setFile] = useState<{ name: string; b64: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [over, setOver] = useState(false)
  const picker = useRef<HTMLInputElement>(null)

  const effective: 'encode' | 'decode' = dir === 'auto' ? (looksBase64(input) ? 'decode' : 'encode') : dir

  const res = useMemo(() => {
    if (file) return { out: file.b64, error: '' }
    if (!input) return { out: '', error: '' }
    try {
      return { out: effective === 'decode' ? decode(input) : encode(input), error: '' }
    } catch {
      // Auto mode fell on a string that only looked like Base64: encode it instead.
      if (dir === 'auto') return { out: encode(input), error: '' }
      return { out: '', error: t('encoding.not_base64', 'Not valid Base64 (or not UTF-8 text). Check for stray characters, or switch to Encode.') }
    }
  }, [input, effective, dir, file])

  const shownDir = file ? 'encode' : dir === 'auto' && !res.error && effective === 'decode' && !res.out ? 'encode' : effective

  const readFile = (f?: File) => {
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      const b64 = String(r.result).split(',')[1] ?? ''
      setFile({ name: f.name, b64 })
      onOutput({ fileName: f.name }, { output: b64 })
    }
    r.readAsDataURL(f)
  }

  const copy = async () => {
    if (!res.out) return
    await navigator.clipboard.writeText(res.out)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onOutput({ input, mode: shownDir }, { output: res.out })
  }

  const swap = () => {
    if (!res.out || file) return
    setInput(res.out)
    setDir(shownDir === 'encode' ? 'decode' : 'encode')
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<Dir>
            label={t('encoding.mode', 'Direction')}
            value={dir}
            onChange={(v) => { setDir(v); setFile(null) }}
            options={[{ value: 'auto', label: t('encoding.auto', 'Auto') }, { value: 'encode', label: t('encoding.encode', 'Encode') }, { value: 'decode', label: t('encoding.decode', 'Decode') }]}
          />
          <WbButton onClick={swap} disabled={!res.out || !!file} aria-label={t('encoding.use_output', 'Use output as input')}>
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />{t('encoding.swap', 'Swap')}
          </WbButton>
          <WbButton onClick={() => picker.current?.click()}>
            <FileUp className="h-3.5 w-3.5" aria-hidden />{t('encoding.choose_file', 'Encode a file')}
          </WbButton>
          <input ref={picker} type="file" className="sr-only" aria-label={t('encoding.choose_file_to_encode', 'Choose file to encode')} onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = '' }} />
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input && !file && <span>{t('encoding.paste_base64', 'Paste text or Base64. Direction is detected for you.')}</span>}
          {(input || file) && !res.error && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />{file ? t('encoding.encoded_file', 'Encoded {name}').replace('{name}', file.name) : shownDir === 'decode' ? t('encoding.decoded_base64', 'Decoded Base64') : t('encoding.encoded_base64', 'Encoded to Base64')}</span>}
          {res.error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{res.error}</span></span>}
          {res.out && <span className="ml-auto">{res.out.length.toLocaleString()} chars</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <div
            className={'flex min-h-0 flex-1 flex-col ' + (over ? 'bg-d-accent/10' : '')}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); readFile(e.dataTransfer.files[0]) }}
          >
            <Pane label={t('encoding.input', 'Input')}>
              <CodeArea label={t('encoding.input', 'Input')} value={file ? '' : input} onChange={(v) => { setFile(null); setInput(v) }} placeholder={file ? `${t('common.file_size', 'File')}: ${file.name}` : t('encoding.type_or_drop', 'Type or paste text or Base64, or drop a file here')} />
            </Pane>
          </div>
        }
        right={
          <Pane
            label={t('action.output', 'Output')}
            actions={
              <WbButton onClick={copy} disabled={!res.out} className="h-6">
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </WbButton>
            }
          >
            <CodeArea label={t('action.output', 'Output')} value={res.out} readOnly placeholder={t('common.processing', 'Result appears here as you type')} />
          </Pane>
        }
      />
    </Workbench>
  )
}
