'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, Pane, CodeArea, Chip, Row, Notice, SplitPane, Region, CopyBtn, Column, Section, Btn, Field, TextInput, TextArea, Select, Seg, IconBtn, StatusBar } from '@/components/domain'
import { Send, Copy, Download, Trash2, Plus, X, Eye, EyeOff } from 'lucide-react'

/** Workbench, Postman-like: request bar with method+URL, tabbed params/headers/body, response pane with status, time, size */

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const

interface Header { key: string; value: string; enabled: boolean }
interface Param { key: string; value: string; enabled: boolean }

export default function ApiTester({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [method, setMethod] = useState<typeof METHODS[number]>((initialState?.method as typeof METHODS[number]) ?? 'GET')
  const [url, setUrl] = useState((initialState?.url as string) ?? '')
  const [headers, setHeaders] = useState<Header[]>((initialState?.headers as Header[]) ?? [{ key: '', value: '', enabled: true }])
  const [params, setParams] = useState<Param[]>((initialState?.params as Param[]) ?? [])
  const [body, setBody] = useState((initialState?.body as string) ?? '')
  const [bodyType, setBodyType] = useState<'json' | 'form' | 'text' | 'none'>((initialState?.bodyType as any) ?? 'none')

  const [response, setResponse] = useState<string>('')
  const [status, setStatus] = useState<number | null>(null)
  const [time, setTime] = useState<number>(0)
  const [size, setSize] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'params' | 'headers' | 'body' | 'response'>('params')
  const firedRef = useRef(false)

  const sendRequest = useCallback(async () => {
    if (!url.trim()) { setError('URL is required'); return }
    setLoading(true)
    setError(null)
    const start = performance.now()

    try {
      const headerObj: Record<string, string> = {}
      headers.filter(h => h.enabled && h.key).forEach(h => { headerObj[h.key] = h.value })

      const paramObj: Record<string, string> = {}
      params.filter(p => p.enabled && p.key).forEach(p => { paramObj[p.key] = p.value })
      const queryString = new URLSearchParams(paramObj).toString()
      const fullUrl = queryString ? `${url}?${queryString}` : url

      let bodyStr: string | undefined
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        if (bodyType === 'json' && body.trim()) bodyStr = body
        else if (bodyType === 'form' && body.trim()) bodyStr = body
        else if (bodyType === 'text' && body.trim()) bodyStr = body
      }

      const res = await fetch(fullUrl, {
        method,
        headers: headerObj,
        body: bodyStr,
      })

      const text = await res.text()
      const end = performance.now()

      setResponse(text)
      setStatus(res.status)
      setTime(Math.round(end - start))
      setSize(new Blob([text]).size)
      setError(null)
      if (!firedRef.current) { analytics.buttonClick('api-tester', 'send'); firedRef.current = true }
      onOutput({ method, url, headers: headerObj, params: paramObj, body: bodyStr }, { status: res.status, time: Math.round(end - start), size: new Blob([text]).size, body: text })
    } catch (e) {
      setError((e as Error).message)
      setResponse('')
      setStatus(null)
      setTime(0)
      setSize(0)
    } finally {
      setLoading(false)
    }
  }, [method, url, headers, params, body, bodyType, onOutput])

  return (
    <Region domain="workbench">
      <Workbench
        toolbar={
          <Toolbar>
            <div className="flex items-center gap-2 flex-1">
              <Select value={method} onChange={e => setMethod(e.target.value as any)} className="w-24">
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="flex-1 rounded-d border border-d-border bg-d-raised px-3 py-1.5 font-mono text-sm outline-none focus:border-d-accent"
              />
              <Btn variant="primary" onClick={sendRequest} disabled={loading} className="ml-2">
                <Send className="h-3.5 w-3.5" aria-hidden /> {loading ? t('action.sending', 'Sending...') : t('action.send', 'Send')}
              </Btn>
            </div>
            <div className="flex gap-1">
              <Chip on={tab === 'params'} onClick={() => setTab('params')}>{t('dev.params', 'Params')}</Chip>
              <Chip on={tab === 'headers'} onClick={() => setTab('headers')}>{t('dev.headers', 'Headers')}</Chip>
              <Chip on={tab === 'body'} onClick={() => setTab('body')}>{t('dev.body', 'Body')}</Chip>
              <Chip on={tab === 'response'} onClick={() => setTab('response')}>{t('dev.response', 'Response')}</Chip>
            </div>
          </Toolbar>
        }
        status={
          <StatusBar>
            {status && (
              <>
                <span className={status >= 400 ? 'text-rose-400' : status >= 300 ? 'text-amber-400' : 'text-emerald-400'}>
                  {status} {['', '100', '200', '300', '400', '500'].find(s => status >= Number(s)) || ''}
                </span>
                <span>{time}ms</span>
                <span>{(size / 1024).toFixed(1)} KB</span>
              </>
            )}
          </StatusBar>
        }
      >
        <SplitPane
          left={
            <Pane label="Request">
              {tab === 'params' && (
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {params.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="checkbox" checked={p.enabled} onChange={e => setHeaders(h => h.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} className="mt-1" />
                      <TextInput value={p.key} onChange={e => setParams(p => p.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="Key" className="flex-1" />
                      <TextInput value={p.value} onChange={e => setParams(p => p.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="Value" className="flex-1" />
                      <IconBtn label="Remove" onClick={() => setParams(p => p.filter((_, j) => j !== i))}><X className="h-4 w-4" /></IconBtn>
                    </div>
                  ))}
                  <Btn variant="quiet" size="sm" onClick={() => setParams(p => [...p, { key: '', value: '', enabled: true }])}><Plus className="h-3.5 w-3.5" /> {t('action.add_param', 'Add Param')}</Btn>
                </div>
              )}

              {tab === 'headers' && (
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {headers.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="checkbox" checked={h.enabled} onChange={e => setHeaders(h => h.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} className="mt-1" />
                      <TextInput value={h.key} onChange={e => setHeaders(h => h.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="Key" className="flex-1" />
                      <TextInput value={h.value} onChange={e => setHeaders(h => h.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="Value" className="flex-1" />
                      <IconBtn label="Remove" onClick={() => setHeaders(h => h.filter((_, j) => j !== i))}><X className="h-4 w-4" /></IconBtn>
                    </div>
                  ))}
                  <Btn variant="quiet" size="sm" onClick={() => setHeaders(h => [...h, { key: '', value: '', enabled: true }])}><Plus className="h-3.5 w-3.5" /> {t('action.add_header', 'Add Header')}</Btn>
                </div>
              )}

              {tab === 'body' && (
                <div className="flex-1 flex flex-col p-3">
                  <Seg<'json' | 'form' | 'text' | 'none'>
                    value={bodyType}
                    onChange={setBodyType}
                    options={[
                      { value: 'none', label: t('dev.none', 'None') },
                      { value: 'json', label: 'JSON' },
                      { value: 'form', label: t('dev.form_data', 'Form Data') },
                      { value: 'text', label: 'Text' },
                    ]}
                    label={t('dev.body_type', 'Body Type')}
                  />
                  <CodeArea
                    value={body}
                    onChange={setBody}
                    label="Request body"
                    placeholder="Request body"
                  />
                </div>
              )}

              {tab === 'response' && (
                <div className="flex-1 overflow-auto p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-d-muted">{t('dev.response', 'Response')}</span>
                    {response && (
                      <>
                        <CopyBtn value={response} />
                        <Btn variant="quiet" size="sm" onClick={() => {
                          const blob = new Blob([response], { type: 'application/json' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'response.json'
                          a.click()
                          URL.revokeObjectURL(url)
                        }}><Download className="h-3.5 w-3.5" /></Btn>
                      </>
                    )}
                  </div>
                  {response ? (
                    <pre className="font-mono text-sm bg-d-surface p-3 rounded-d max-h-[400px] overflow-auto">
                      {response}
                    </pre>
                  ) : (
                    <Notice tone="info">{t('dev.no_response', 'Send a request to see the response')}</Notice>
                  )}
                </div>
              )}
            </Pane>
          }
          right={
            <Pane label="Response">
              {error && <Notice tone="error">{error}</Notice>}
              {response && (
                <div className="flex-1 overflow-auto p-3">
                  <pre className="font-mono text-sm bg-d-surface p-3 rounded-d max-h-[400px] overflow-auto">
                    {response}
                  </pre>
                </div>
              )}
            </Pane>
          }
        />
      </Workbench>
    </Region>
  )
}