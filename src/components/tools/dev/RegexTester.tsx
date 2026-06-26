'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

const FLAG_OPTIONS = ['g', 'i', 'm', 's', 'u'] as const

export default function RegexTester({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [pattern, setPattern] = useState((initialState?.pattern as string) ?? '')
  const [flags, setFlags] = useState((initialState?.flags as string) ?? 'g')
  const [testString, setTestString] = useState((initialState?.testString as string) ?? '')
  const [error, setError] = useState<string | null>(null)
  const [matches, setMatches] = useState<string[]>([])
  const [highlighted, setHighlighted] = useState('')
  const firedRef = useRef(false)

  useEffect(() => {
    if (!pattern) {
      setHighlighted(escapeHtml(testString))
      setMatches([])
      setError(null)
      return
    }
    try {
      const flagStr = flags.includes('g') ? flags : flags + 'g'
      const re = new RegExp(pattern, flagStr)
      const found = [...testString.matchAll(re)]
      setMatches(found.map((m) => m[0]))
      setError(null)
      // Build highlighted HTML
      let result = ''
      let lastIndex = 0
      for (const m of found) {
        if (m.index === undefined) continue
        result += escapeHtml(testString.slice(lastIndex, m.index))
        result += `<mark class="bg-yellow-300/40 rounded px-0.5">${escapeHtml(m[0])}</mark>`
        lastIndex = m.index + m[0].length
      }
      result += escapeHtml(testString.slice(lastIndex))
      setHighlighted(result)
      if (found.length > 0) {
        if (!firedRef.current) { analytics.buttonClick('regex-tester', 'test'); firedRef.current = true }
        onOutput({ pattern, flags, testString }, { matchCount: found.length, matches: found.map((m) => m[0]) })
      }
    } catch (e) {
      setError((e as Error).message)
      setHighlighted(escapeHtml(testString))
      setMatches([])
    }
  }, [pattern, flags, testString])

  function toggleFlag(f: string) {
    setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f))
  }

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.pattern', 'Pattern')}</label>
            <div className="flex items-center gap-1 border border-input rounded-md px-3 py-2 bg-background font-mono text-sm focus-within:ring-1 focus-within:ring-ring">
              <span className="text-muted-foreground select-none">/</span>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="flex-1 outline-none bg-transparent"
                placeholder="([a-z]+)"
                spellCheck={false}
              />
              <span className="text-muted-foreground select-none">/</span>
              <input
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                className="w-12 outline-none bg-transparent"
                placeholder="gi"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {FLAG_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                  flags.includes(f)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input text-muted-foreground hover:border-primary/50'
                }`}
              >
                {f}
              </button>
            ))}
            <span className="text-xs text-muted-foreground self-center ml-1">{t('dev.flags', 'flags')}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.test_string', 'Test String')}</label>
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              className="w-full min-h-[200px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('dev.test_placeholder', 'Enter text to test against the pattern...')}
              spellCheck={false}
            />
          </div>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {matches.length} {matches.length !== 1 ? t('dev.matches', 'matches') : t('dev.match', 'match')}
            </span>
            <CopyButton value={matches.join('\n')} />
          </div>
          <div
            className="font-mono text-sm border border-input rounded-md p-3 bg-muted/30 min-h-[200px] whitespace-pre-wrap break-all"
            dangerouslySetInnerHTML={{
              __html:
                highlighted ||
                `<span class="text-muted-foreground">${t('dev.match_prompt', 'Enter a pattern and test string : matches will be highlighted here')}</span>`,
            }}
          />
          {matches.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t('dev.captures', 'Captures')} (first 20)</p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {matches.slice(0, 20).map((m, i) => (
                  <div key={i} className="font-mono text-xs bg-muted/50 rounded px-2 py-1 flex gap-2">
                    <span className="text-muted-foreground w-6 shrink-0">{i + 1}</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      }
    />
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
