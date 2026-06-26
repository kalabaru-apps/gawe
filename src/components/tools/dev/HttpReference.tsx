'use client'

import { useState } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'

const STATUS_CODES = [
  // 1xx
  { code: 100, name: 'Continue', description: 'Server has received the request headers' },
  { code: 101, name: 'Switching Protocols', description: 'Requester asked to switch protocols' },
  { code: 102, name: 'Processing', description: 'Server has received and is processing the request' },
  // 2xx
  { code: 200, name: 'OK', description: 'Request succeeded' },
  { code: 201, name: 'Created', description: 'Request succeeded and a new resource was created' },
  { code: 202, name: 'Accepted', description: 'Request has been received but not yet acted upon' },
  { code: 204, name: 'No Content', description: 'No content to send for this request' },
  { code: 206, name: 'Partial Content', description: 'Partial GET request fulfilled' },
  // 3xx
  { code: 301, name: 'Moved Permanently', description: 'URL of the requested resource has been changed permanently' },
  { code: 302, name: 'Found', description: 'URI of requested resource has been changed temporarily' },
  { code: 304, name: 'Not Modified', description: 'Client can use cached response' },
  { code: 307, name: 'Temporary Redirect', description: 'Redirect with same method preserved' },
  { code: 308, name: 'Permanent Redirect', description: 'Permanent redirect, same method preserved' },
  // 4xx
  { code: 400, name: 'Bad Request', description: 'Server cannot process request due to client error' },
  { code: 401, name: 'Unauthorized', description: 'Authentication is required and has failed' },
  { code: 403, name: 'Forbidden', description: 'Server refuses to fulfill the request' },
  { code: 404, name: 'Not Found', description: 'Requested resource could not be found' },
  { code: 405, name: 'Method Not Allowed', description: 'HTTP method is not supported for this resource' },
  { code: 408, name: 'Request Timeout', description: 'Server timed out waiting for the request' },
  { code: 409, name: 'Conflict', description: 'Request conflicts with the current state of the server' },
  { code: 410, name: 'Gone', description: 'Resource is no longer available and will not be again' },
  { code: 413, name: 'Content Too Large', description: 'Request entity is larger than limits defined by server' },
  { code: 414, name: 'URI Too Long', description: 'URI is longer than the server will interpret' },
  { code: 415, name: 'Unsupported Media Type', description: 'Media format is not supported' },
  { code: 422, name: 'Unprocessable Content', description: 'Request was well-formed but was unable to be followed' },
  { code: 429, name: 'Too Many Requests', description: 'User has sent too many requests in a given time' },
  // 5xx
  { code: 500, name: 'Internal Server Error', description: 'Server encountered an unexpected condition' },
  { code: 501, name: 'Not Implemented', description: 'Server does not support functionality required to fulfill request' },
  { code: 502, name: 'Bad Gateway', description: 'Server received an invalid response from upstream' },
  { code: 503, name: 'Service Unavailable', description: 'Server is not ready to handle the request' },
  { code: 504, name: 'Gateway Timeout', description: 'Server did not get a response in time from upstream' },
]

const MIME_TYPES = [
  { type: 'text/html', description: 'HTML document', ext: '.html' },
  { type: 'text/css', description: 'CSS stylesheet', ext: '.css' },
  { type: 'text/javascript', description: 'JavaScript', ext: '.js' },
  { type: 'text/plain', description: 'Plain text', ext: '.txt' },
  { type: 'text/csv', description: 'CSV data', ext: '.csv' },
  { type: 'text/xml', description: 'XML document', ext: '.xml' },
  { type: 'application/json', description: 'JSON data', ext: '.json' },
  { type: 'application/xml', description: 'XML (generic)', ext: '.xml' },
  { type: 'application/pdf', description: 'PDF document', ext: '.pdf' },
  { type: 'application/zip', description: 'ZIP archive', ext: '.zip' },
  { type: 'application/gzip', description: 'Gzip archive', ext: '.gz' },
  { type: 'application/octet-stream', description: 'Binary data', ext: '.*' },
  { type: 'application/x-www-form-urlencoded', description: 'Form data (URL encoded)', ext: '—' },
  { type: 'multipart/form-data', description: 'Form data with files', ext: '—' },
  { type: 'image/jpeg', description: 'JPEG image', ext: '.jpg' },
  { type: 'image/png', description: 'PNG image', ext: '.png' },
  { type: 'image/gif', description: 'GIF image', ext: '.gif' },
  { type: 'image/webp', description: 'WebP image', ext: '.webp' },
  { type: 'image/svg+xml', description: 'SVG image', ext: '.svg' },
  { type: 'image/avif', description: 'AVIF image', ext: '.avif' },
  { type: 'audio/mpeg', description: 'MP3 audio', ext: '.mp3' },
  { type: 'audio/ogg', description: 'OGG audio', ext: '.ogg' },
  { type: 'video/mp4', description: 'MP4 video', ext: '.mp4' },
  { type: 'video/webm', description: 'WebM video', ext: '.webm' },
  { type: 'font/woff2', description: 'WOFF2 font', ext: '.woff2' },
]

type Tab = 'status' | 'mime'

function statusColor(code: number): string {
  if (code < 200) return 'bg-muted text-muted-foreground'
  if (code < 300) return 'bg-emerald-500/20 text-emerald-400'
  if (code < 400) return 'bg-sky-500/20 text-sky-400'
  if (code < 500) return 'bg-amber-500/20 text-amber-400'
  return 'bg-rose-500/20 text-rose-400'
}

export default function HttpReference({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('status')
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const filteredStatus = STATUS_CODES.filter(
    (s) => String(s.code).includes(q) || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
  )
  const filteredMime = MIME_TYPES.filter(
    (m) => m.type.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.ext.toLowerCase().includes(q)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 border border-input rounded-md p-0.5">
          {(['status', 'mime'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                tab === tabKey ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              {tabKey === 'status' ? 'HTTP Status Codes' : 'MIME Types'}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          placeholder={tab === 'status' ? 'Search codes, names, descriptions...' : 'Search MIME types, extensions...'}
        />
      </div>
      {tab === 'status' ? (
        <div className="rounded-md border border-input overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-16">Code</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-48">Name</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatus.map((s) => (
                <tr key={s.code} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${statusColor(s.code)}`}>
                      {s.code}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-input overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-64">MIME Type</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Description</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Ext</th>
              </tr>
            </thead>
            <tbody>
              {filteredMime.map((m) => (
                <tr key={m.type} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono text-xs">{m.type}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{m.description}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{m.ext}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
