'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
type ContentType = 'application/json' | 'text/plain' | 'multipart/form-data'
type RequestTab = 'headers' | 'body' | 'templates'

interface HeaderRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
}

// ---------------------------------------------------------------------------
// Webhook templates
// ---------------------------------------------------------------------------

const TEMPLATES: Record<string, { headers: Record<string, string>; body: string }> = {
  'GitHub Push': {
    headers: { 'X-GitHub-Event': 'push', 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        ref: 'refs/heads/main',
        repository: { name: 'my-repo', full_name: 'user/my-repo' },
        pusher: { name: 'octocat' },
        commits: [{ id: 'abc123', message: 'feat: add feature', author: { name: 'octocat' } }],
      },
      null,
      2
    ),
  },
  'Stripe payment_intent.created': {
    headers: { 'Stripe-Signature': 't=1234567890,v1=fake_sig', 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        id: 'evt_test_123',
        type: 'payment_intent.created',
        data: {
          object: { id: 'pi_test_123', amount: 2000, currency: 'usd', status: 'requires_payment_method' },
        },
      },
      null,
      2
    ),
  },
  'Shopify order/create': {
    headers: { 'X-Shopify-Topic': 'orders/create', 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        id: 820982911946154500,
        email: 'jon@example.com',
        total_price: '199.99',
        line_items: [{ title: 'T-Shirt', quantity: 1, price: '199.99' }],
      },
      null,
      2
    ),
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2)
}

function statusColor(code: number): string {
  if (code >= 500) return 'bg-rose-500/15 text-rose-400 border-rose-500/30'
  if (code >= 400) return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  if (code >= 300) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
}

function isCorsError(message: string): boolean {
  return (
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('cors') ||
    message.toLowerCase().includes('network')
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ApiTester({ onOutput, initialState }: ToolProps) {
  const [method, setMethod] = useState<HttpMethod>((initialState?.method as HttpMethod) ?? 'GET')
  const [url, setUrl] = useState<string>((initialState?.url as string) ?? '')
  const [activeTab, setActiveTab] = useState<RequestTab>('headers')
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([
    { id: uid(), key: 'Accept', value: 'application/json', enabled: true },
  ])
  const [body, setBody] = useState<string>((initialState?.body as string) ?? '')
  const [contentType, setContentType] = useState<ContentType>('application/json')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [headersOpen, setHeadersOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // --- Header row helpers ---

  const addHeaderRow = () =>
    setHeaderRows((prev) => [...prev, { id: uid(), key: '', value: '', enabled: true }])

  const removeHeaderRow = (id: string) =>
    setHeaderRows((prev) => prev.filter((r) => r.id !== id))

  const updateHeaderRow = (id: string, field: keyof Omit<HeaderRow, 'id'>, value: string | boolean) =>
    setHeaderRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )

  // --- Template selection ---

  const applyTemplate = (name: string) => {
    setSelectedTemplate(name)
    if (!name) return
    const tpl = TEMPLATES[name]
    if (!tpl) return
    // Merge template headers into header rows
    setHeaderRows((prev) => {
      const next = [...prev]
      for (const [k, v] of Object.entries(tpl.headers)) {
        const existing = next.findIndex((r) => r.key.toLowerCase() === k.toLowerCase())
        if (existing >= 0) {
          next[existing] = { ...next[existing], value: v, enabled: true }
        } else {
          next.push({ id: uid(), key: k, value: v, enabled: true })
        }
      }
      return next
    })
    setBody(tpl.body)
    setActiveTab('body')
    if (tpl.headers['Content-Type']) {
      const ct = tpl.headers['Content-Type'] as ContentType
      if (['application/json', 'text/plain', 'multipart/form-data'].includes(ct)) {
        setContentType(ct)
      }
    }
  }

  // --- Send request ---

  const send = async () => {
    if (!url.trim()) return
    setNetworkError(null)
    setResponse(null)
    setLoading(true)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const compiledHeaders: Record<string, string> = {}
    for (const row of headerRows) {
      if (row.enabled && row.key.trim()) {
        compiledHeaders[row.key.trim()] = row.value
      }
    }

    // Add Content-Type if sending body and not already set
    const hasBody = method !== 'GET' && method !== 'HEAD' && body.trim()
    if (hasBody && !compiledHeaders['Content-Type'] && contentType !== 'multipart/form-data') {
      compiledHeaders['Content-Type'] = contentType
    }

    const start = performance.now()
    try {
      const res = await fetch(url.trim(), {
        method,
        headers: compiledHeaders,
        body: hasBody ? body.trim() : undefined,
        signal: ctrl.signal,
      })

      const elapsed = Math.round(performance.now() - start)
      const resHeaders: Record<string, string> = {}
      res.headers.forEach((v, k) => { resHeaders[k] = v })

      let resBody = ''
      try {
        resBody = await res.text()
        // Pretty-print JSON if possible
        const parsed = JSON.parse(resBody)
        resBody = JSON.stringify(parsed, null, 2)
      } catch {
        // keep as-is
      }

      const data: ResponseData = {
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders,
        body: resBody,
        time: elapsed,
      }
      setResponse(data)
      onOutput(
        { method, url: url.trim(), headers: compiledHeaders, body: hasBody ? body : null },
        { status: res.status, time: elapsed, bodyLength: resBody.length }
      )
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setLoading(false)
        return
      }
      const msg = (err as Error).message || 'Network error'
      setNetworkError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void send()
  }

  const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']

  return (
    <div className="flex flex-col gap-4">
      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        PWA runs locally — perfect for testing localhost endpoints. Browser-based fetch is used, so
        the target server must allow CORS or be on the same origin.
      </p>

      {/* Method + URL row */}
      <div className="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm font-mono font-medium focus:outline-none focus:ring-2 focus:ring-ring shrink-0"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="http://localhost:3000/api/..."
          spellCheck={false}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
        />
        <Button onClick={() => void send()} disabled={loading || !url.trim()} className="shrink-0">
          {loading ? 'Sending…' : 'Send'}
        </Button>
      </div>

      {/* Request tabs */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="flex border-b border-border bg-muted/20">
          {(['headers', 'body', 'templates'] as RequestTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-background text-foreground border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'templates' ? 'Webhook Templates' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-3">
          {/* Headers tab */}
          {activeTab === 'headers' && (
            <div className="flex flex-col gap-2">
              {headerRows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) => updateHeaderRow(row.id, 'enabled', e.target.checked)}
                    className="h-4 w-4 accent-primary shrink-0"
                  />
                  <input
                    value={row.key}
                    onChange={(e) => updateHeaderRow(row.id, 'key', e.target.value)}
                    placeholder="Header-Name"
                    spellCheck={false}
                    className="w-44 shrink-0 rounded border border-border bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => updateHeaderRow(row.id, 'value', e.target.value)}
                    placeholder="value"
                    spellCheck={false}
                    className="flex-1 rounded border border-border bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                  />
                  <button
                    onClick={() => removeHeaderRow(row.id)}
                    className="shrink-0 text-muted-foreground hover:text-rose-400 transition-colors text-lg leading-none px-1"
                    aria-label="Remove header"
                  >
                    ×
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addHeaderRow} className="self-start mt-1">
                + Add header
              </Button>
            </div>
          )}

          {/* Body tab */}
          {activeTab === 'body' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0">Content-Type</label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as ContentType)}
                  className="rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="application/json">application/json</option>
                  <option value="text/plain">text/plain</option>
                  <option value="multipart/form-data">multipart/form-data</option>
                </select>
              </div>
              <CodeEditor
                value={body}
                onChange={setBody}
                language={contentType === 'application/json' ? 'json' : 'text'}
                rows={10}
                placeholder={
                  contentType === 'application/json'
                    ? '{\n  "key": "value"\n}'
                    : 'Request body…'
                }
              />
            </div>
          )}

          {/* Templates tab */}
          {activeTab === 'templates' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Select a webhook template to pre-fill the body and headers.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(TEMPLATES).map((name) => (
                  <button
                    key={name}
                    onClick={() => applyTemplate(name)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      selectedTemplate === name
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground">
                  Template applied — switch to the <strong className="text-foreground">Body</strong> and{' '}
                  <strong className="text-foreground">Headers</strong> tabs to review.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Network error */}
      {networkError && (
        <ErrorAlert
          message={
            isCorsError(networkError)
              ? `Network / CORS error: "${networkError}". The target server is not returning CORS headers (Access-Control-Allow-Origin). To fix: add the header to your server, or use a proxy like https://corsproxy.io/?url=YOUR_URL.`
              : networkError
          }
        />
      )}

      {/* Response panel */}
      {response && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          {/* Status row */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-xs font-semibold ${statusColor(response.status)}`}
            >
              {response.status} {response.statusText}
            </span>
            <span className="text-xs text-muted-foreground">{response.time} ms</span>
          </div>

          {/* Response headers (collapsible) */}
          <div>
            <button
              onClick={() => setHeadersOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className={`inline-block transition-transform ${headersOpen ? 'rotate-90' : ''}`}>▶</span>
              Response headers ({Object.keys(response.headers).length})
            </button>
            {headersOpen && (
              <div className="mt-2 rounded border border-border bg-muted/30 p-3 font-mono text-xs space-y-1 max-h-48 overflow-auto">
                {Object.entries(response.headers).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{k}:</span>
                    <span className="break-all">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Response body */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Response body</span>
              <CopyButton value={response.body} />
            </div>
            <CodeEditor
              value={response.body}
              onChange={() => {}}
              readOnly
              language="json"
              rows={14}
              placeholder="(empty body)"
            />
          </div>
        </div>
      )}
    </div>
  )
}
