'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, Pane, CodeArea, Chip, Row, Notice, SplitPane, Region, CopyBtn, Column, Section, Seg, Btn } from '@/components/domain'
import { Copy, Download } from 'lucide-react'

/** Workbench: paste curl, live language tabs, copy */

const LANGS = [
  { key: 'node', label: 'Node.js', ext: 'js' },
  { key: 'bash', label: 'Bash', ext: 'sh' },
]

export default function CurlToCode({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [curl, setCurl] = useState((initialState?.curl as string) ?? '')
  const [lang, setLang] = useState((initialState?.lang as string) ?? 'node')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!curl.trim()) {
      setCode('')
      setError(null)
      return
    }

    try {
      // Parse basic curl command
      let method: string = 'GET'
      let url: string = ''
      const args = curl.trim().match(/[^ ]+/g) || []
      for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
          case '-X':
          case '--request':
            method = args[i + 1] || 'GET'
            i++
            break
          case '-H':
          case '--header':
            // Headers will be stored for next version
            i++
            break
          case '-d':
          case '--data':
            // Body will be extracted
            // i++ // skip until next flag or end
            // const bodyIndex = i
            // while (i < args.length && !args[i].startsWith('-')) i++
            // const body = args.slice(bodyIndex, i).join(' ')
            i++
            break
          default:
            if (!args[i].startsWith('-')) url = args[i]
            break
        }
      }

      const nodeCode = `
const response = await fetch('${url}', {
  method: '${method.toUpperCase()}',
  headers: {
    'Content-Type': 'application/json',
    // Add headers here
  },
  // body: JSON.stringify({ /* request body */ })
});

const data = await response.json();
console.log(data);
`.trim()

      const bashCode = `curl -X ${method} '${url}' \\
  -H 'Content-Type: application/json' \\
  # Add headers here

# Response saved to output.json
# jq -r '.data' output.json`

      setCode(lang === 'node' ? nodeCode : bashCode)
      setError(null)
      if (!firedRef.current) { analytics.buttonClick('curl-to-code', 'parse'); firedRef.current = true }
      onOutput({ curl, lang }, { code, url, method })
    } catch (e) {
      setError('Failed to parse curl command. Make sure it is in a standard format.')
      setCode('')
    }
  }, [curl, lang])

  return (
    <Region domain="workbench">
      <Workbench
        toolbar={
          <Toolbar>
            <Seg<string>
              value={lang}
              onChange={setLang}
              options={LANGS.map(l => ({ value: l.key, label: l.label }))}
              label="Language"
            />
            <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(code)}>
              <Copy className="h-3.5 w-3.5" aria-hidden /> {t('action.copy', 'Copy')}
            </Btn>
            <Btn variant="secondary" onClick={() => {
              const blob = new Blob([code], { type: 'text/plain' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `curl-to-${lang}.${LANGS.find(l => l.key === lang)?.ext || 'txt'}`
              a.click()
              URL.revokeObjectURL(url)
            }}>
              <Download className="h-3.5 w-3.5" aria-hidden /> {t('action.download', 'Download')}
            </Btn>
          </Toolbar>
        }
      >
        <SplitPane
          left={
            <Pane label="curl">
              <CodeArea
                value={curl}
                onChange={setCurl}
                label="curl command"
                placeholder="curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{...}'"
              />
              {error && <Notice tone="error">{error}</Notice>}
            </Pane>
          }
          right={
            <Pane label={LANGS.find(l => l.key === lang)?.label || 'Code'}>
              <div className="flex-1 overflow-auto">
                {code ? (
                  <pre className="p-4 font-mono text-sm bg-d-surface text-d-ink">
                    {code}
                  </pre>
                ) : (
                  <Notice tone="info">{t('dev.paste_curl', 'Paste a curl command to generate code')}</Notice>
                )}
              </div>
            </Pane>
          }
        />
      </Workbench>
    </Region>
  )
}