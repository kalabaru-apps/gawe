'use client'

import { useState, useMemo, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Section, Field, TextInput, Scroll, Notice, Chip, Btn } from '@/components/domain'
import { Search, X } from 'lucide-react'

/** Paper: searchable reference with status code groups, plain-language meanings */

const STATUS_GROUPS = {
  INFORMATIONAL: [
    { code: 100, label: 'Continue' },
    { code: 101, label: 'Switching Protocols' },
    { code: 102, label: 'Processing' },
  ],
  SUCCESS: [
    { code: 200, label: 'OK' },
    { code: 201, label: 'Created' },
    { code: 202, label: 'Accepted' },
    { code: 203, label: 'Non-Authoritative Information' },
    { code: 204, label: 'No Content' },
    { code: 205, label: 'Reset Content' },
    { code: 206, label: 'Partial Content' },
    { code: 207, label: 'Multi-Status' },
    { code: 226, label: 'IM Used' },
  ],
  REDIRECTION: [
    { code: 300, label: 'Multiple Choices' },
    { code: 301, label: 'Moved Permanently' },
    { code: 302, label: 'Found' },
    { code: 303, label: 'See Other' },
    { code: 304, label: 'Not Modified' },
    { code: 305, label: 'Use Proxy' },
    { code: 307, label: 'Temporary Redirect' },
    { code: 308, label: 'Permanent Redirect' },
  ],
  CLIENT_ERROR: [
    { code: 400, label: 'Bad Request' },
    { code: 401, label: 'Unauthorized' },
    { code: 402, label: 'Payment Required' },
    { code: 403, label: 'Forbidden' },
    { code: 404, label: 'Not Found' },
    { code: 405, label: 'Method Not Allowed' },
    { code: 406, label: 'Not Acceptable' },
    { code: 407, label: 'Proxy Authentication Required' },
    { code: 408, label: 'Request Timeout' },
    { code: 409, label: 'Conflict' },
    { code: 410, label: 'Gone' },
    { code: 411, label: 'Length Required' },
    { code: 412, label: 'Precondition Failed' },
    { code: 413, label: 'Payload Too Large' },
    { code: 414, label: 'URI Too Long' },
    { code: 415, label: 'Unsupported Media Type' },
    { code: 416, label: 'Range Not Satisfiable' },
    { code: 417, label: 'Expectation Failed' },
    { code: 421, label: 'Misdirected Request' },
    { code: 422, label: 'Unprocessable Entity' },
    { code: 423, label: 'Locked' },
    { code: 424, label: 'Failed Dependency' },
    { code: 425, label: 'Too Early' },
    { code: 426, label: 'Upgrade Required' },
    { code: 428, label: 'Precondition Required' },
    { code: 429, label: 'Too Many Requests' },
    { code: 431, label: 'Request Header Fields Too Large' },
    { code: 451, label: 'Unavailable For Legal Reasons' },
    { code: 494, label: 'Request Header Too Large' },
    { code: 495, label: 'Certificate Error' },
    { code: 496, label: 'No Certificate' },
    { code: 497, label: 'HTTP to HTTPS' },
    { code: 498, label: 'Invalid Token' },
    { code: 499, label: 'Client Closed Request' },
  ],
  SERVER_ERROR: [
    { code: 500, label: 'Internal Server Error' },
    { code: 501, label: 'Not Implemented' },
    { code: 502, label: 'Bad Gateway' },
    { code: 503, label: 'Service Unavailable' },
    { code: 504, label: 'Gateway Timeout' },
    { code: 505, label: 'HTTP Version Not Supported' },
    { code: 506, label: 'Variant Also Negotiates' },
    { code: 507, label: 'Insufficient Storage' },
    { code: 508, label: 'Loop Detected' },
    { code: 510, label: 'Not Extended' },
    { code: 511, label: 'Network Authentication Required' },
    { code: 520, label: 'Web Server Returns Unknown Error' },
    { code: 521, label: 'Web Server Is Down' },
    { code: 522, label: 'Connection Timed Out' },
    { code: 523, label: 'Origin Is Unreachable' },
    { code: 524, label: 'A Timeout Occurred' },
    { code: 525, label: 'SSL Handshake Failed' },
    { code: 526, label: 'Invalid SSL Certificate' },
    { code: 527, label: 'Railgun Error' },
    { code: 530, label: 'Site Launch' },
    { code: 598, label: 'Network Read Timeout Error' },
    { code: 599, label: 'Network Connect Timeout Error' },
  ],
}

export default function HttpReference({ onOutput, initialState }: any) {
  const ALL_CODES = useMemo(() => Object.values(STATUS_GROUPS).flat(), [])
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  const filtered = useMemo(() => {
    if (!query) return ALL_CODES
    const q = query.toLowerCase()
    return ALL_CODES.filter(c =>
      c.label.toLowerCase().includes(q) || c.code.toString().includes(q)
    )
  }, [query])

  function toggle(code: number) {
    setSelected(s => s.includes(code) ? s.filter(x => x !== code) : [...s, code])
  }

  function copy() {
    const codes = ALL_CODES.filter(c => selected.includes(c.code))
    const text = codes.map(c => `${c.code} ${c.label}`).join('\n')
    navigator.clipboard.writeText(text)
    if (!firedRef.current) { analytics.buttonClick('http-reference', 'copy'); firedRef.current = true }
    onOutput({ query, selected }, { codes })
  }

  function clear() {
    setQuery('')
    setSelected([])
  }

  return (
    <Region domain="paper">
      <Scroll>
        <Column width="lg">
          <Section title={t('dev.http_reference', 'HTTP Status Code Reference')}>
            <Field id="search" label={t('dev.search', 'Search')} hint="Enter code or keyword">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="404, not found, redirect..."
                  aria-label="Search HTTP status codes"
                  data-testid="http-ref-search"
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2.5 pl-9 text-sm outline-none focus:border-d-accent"
                />
                {query && (
                  <button
                    onClick={clear}
                    className="absolute inset-y-0 right-2 flex items-center text-d-muted hover:text-d-ink"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Search className="absolute inset-y-0 left-3 h-4 w-4 text-d-muted" />
              </div>
            </Field>
          </Section>

          {Object.entries(STATUS_GROUPS).map(([group, codes]) => {
            let filteredCodes = codes
            if (query) {
              filteredCodes = codes.filter(c =>
                c.label.toLowerCase().includes(query.toLowerCase()) ||
                c.code.toString().includes(query)
              )
            }

            if (filteredCodes.length === 0 && !query) return null
            if (filteredCodes.length === 0) return <div key={group} />

            const colors = {
              INFORMATIONAL: 'text-sky-500',
              SUCCESS: 'text-emerald-500',
              REDIRECTION: 'text-amber-500',
              CLIENT_ERROR: 'text-rose-400',
              SERVER_ERROR: 'text-rose-500',
            }[group]

            return (
              <div key={group} className="mb-6">
                <h3 className={`text-xs font-semibold uppercase tracking-wider ${colors} mb-2`}>{group}</h3>
                <div className="space-y-1">
                  {filteredCodes.map(c => (
                    <button
                      key={c.code}
                      onClick={() => toggle(c.code)}
                      className={`w-full text-left rounded-d border px-3 py-2 text-sm transition-colors ${
                        selected.includes(c.code)
                          ? 'border-d-accent bg-d-accent/10 text-d-accent-ink'
                          : 'border-d-border bg-d-surface text-d-ink hover:bg-d-border/40'
                      }`}
                    >
                      <span className="font-mono font-semibold">{c.code}</span>
                      <span className="ml-2">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {error && <Notice tone="error">{error}</Notice>}

          {selected.length > 0 && (
            <div className="flex gap-2 pt-4">
              <Btn variant="primary" onClick={copy}>
                {t('action.copy_selected', 'Copy selected codes')}
              </Btn>
            </div>
          )}

          {filtered.length === 0 && query && !error && (
            <Notice tone="info">{t('dev.not_found', 'No codes match your search')}</Notice>
          )}
        </Column>
      </Scroll>
    </Region>
  )
}