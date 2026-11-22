'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, Pane, CodeArea, Chip, Row, Notice, Stat, Region, CopyBtn, SplitPane, WbButton } from '@/components/domain'

/** Workbench: pattern bar with flag chips, highlighted test text, match list with groups */
const FLAG_OPTS = ['g', 'i', 'm', 's', 'u'] as const

export default function RegexTester({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [pattern, setPattern] = useState((initialState?.pattern as string) ?? '')
  const [flags, setFlags] = useState((initialState?.flags as string) ?? 'g')
  const [testString, setTestString] = useState((initialState?.testString as string) ?? '')
  const [matches, setMatches] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    if (!pattern) {
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
      if (!firedRef.current) { analytics.buttonClick('regex-tester', 'test'); firedRef.current = true }
      onOutput({ pattern, flags, testString }, { matchCount: found.length, matches: found.map((m) => m[0]) })
    } catch (e) {
      setError((e as Error).message)
      setMatches([])
    }
  }, [pattern, flags, testString, onOutput])

  const toggleFlag = (f: string) => setFlags((prev) => (prev.includes(f) ? prev.replace(f, '') : prev + f))

  return (
    <Workbench
      toolbar={
        <Region domain="workbench">
          <Toolbar>
            <input
              aria-label={t('dev.pattern', 'Pattern')}
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              placeholder="([a-z]+)"
              className="flex h-8 min-w-64 flex-1 rounded-d border border-d-border bg-d-raised px-3 font-mono text-sm outline-none focus:border-d-accent"
            />
            <div className="flex items-center gap-1">
              {FLAG_OPTS.map(f => (
                <Chip key={f} on={flags.includes(f)} onClick={() => toggleFlag(f)} title={f}>
                  {f}
                </Chip>
              ))}
            </div>
          </Toolbar>
        </Region>
      }
    >
      <Region domain="workbench">
        <SplitPane
          left={
            <Pane label={t('dev.test_string', 'Test String')}>
              <CodeArea
                value={testString}
                onChange={setTestString}
                label={t('dev.test_string', 'Test String')}
                placeholder={t('dev.test_placeholder', 'Enter text to test against the pattern...')}
              />
              {error && <Notice tone="error">{error}</Notice>}
            </Pane>
          }
          right={
            <Pane label={t('dev.results', 'Results')}>
              <div className="mb-3">
                <Stat label={t('dev.matches', 'Matches')} value={matches.length} />
              </div>
              <Region domain="workbench" className="flex-1 overflow-auto">
                {matches.length > 0 ? (
                  <div className="space-y-1">
                    {matches.slice(0, 50).map((m, i) => (
                      <Row key={i} label={`${i+1}`} value={m} copy mono />
                    ))}
                    {matches.length > 50 && <p className="text-xs text-d-muted">{`... ${matches.length - 50} more`}</p>}
                  </div>
                ) : (
                  <Notice tone="info">{t('dev.match_prompt', 'Enter a pattern and test string : matches will be highlighted here')}</Notice>
                )}
              </Region>
            </Pane>
          }
        />
      </Region>
    </Workbench>
  )
}