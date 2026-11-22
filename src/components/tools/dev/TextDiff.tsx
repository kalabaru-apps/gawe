'use client'

import { useState, useEffect, useRef } from 'react'
import { diffLines } from 'diff'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Toolbar, StatusBar, Pane, CodeArea, Chip, Row, Notice, SplitPane, Seg, Column, Section, Stat, Scroll } from '@/components/domain'

/** Workbench: side-by-side or unified toggle, line numbers, +/- summary in status bar */

export default function TextDiff({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [original, setOriginal] = useState((initialState?.original as string) ?? '')
  const [modified, setModified] = useState((initialState?.modified as string) ?? '')
  const [view, setView] = useState<'side' | 'unified'>((initialState?.view as 'side' | 'unified') ?? 'side')
  const [parsed, setParsed] = useState<any[]>([])
  const firedRef = useRef(false)

  useEffect(() => {
    const parts = diffLines(original, modified)
    let inserted = 0, deleted = 0
    for (const p of parts) {
      const lines = (p.value.match(/\n/g) ?? []).length
      if (p.added) inserted += lines
      if (p.removed) deleted += lines
    }
    setParsed(parts)
    if (inserted > 0 || deleted > 0) {
      if (!firedRef.current) { analytics.buttonClick('text-diff', 'diff'); firedRef.current = true }
      onOutput({ original, modified }, { linesAdded: inserted, linesRemoved: deleted })
    }
  }, [original, modified, onOutput])

  const diffHtml = parsed
    .map(p => {
      const prefix = p.added ? '+ ' : p.removed ? '- ' : '  '
      return p.value.replace(/\n$/, '').split('\n').map((s: string) => prefix + s).join('\n')
    })
    .join('\n')

  return (
    <Region domain="workbench">
      <Scroll>
        <Column width="md">
          <Section title={t('dev.text_diff', 'Text Diff')}>
            <Seg<'side' | 'unified'>
              value={view}
              onChange={setView}
              options={[
                { value: 'side', label: t('dev.side_by_side', 'Side by Side') },
                { value: 'unified', label: t('dev.unified', 'Unified') },
              ]}
              label={t('dev.view', 'View')}
            />
          </Section>

          {view === 'side' && (
            <SplitPane
              left={
                <Pane label={t('dev.original', 'Original')}>
                  <CodeArea
                    value={original}
                    onChange={setOriginal}
                    label={t('dev.original', 'Original')}
                    placeholder="Paste original text here..."
                  />
                </Pane>
              }
              right={
                <Pane label={t('dev.modified', 'Modified')}>
                  <CodeArea
                    value={modified}
                    onChange={setModified}
                    label={t('dev.modified', 'Modified')}
                    placeholder="Paste modified text here..."
                  />
                </Pane>
              }
            />
          )}

          {view === 'unified' && (
            <div className="rounded-d border border-d-border bg-d-surface p-3 font-mono text-xs overflow-auto max-h-[500px]">
              {parsed.map((part, i) => {
                const lines = part.value.replace(/\n$/, '').split('\n')
                return lines.map((line: string, j: number) => (
                  <div
                    key={`${i}-${j}`}
                    className={`px-3 py-0.5 whitespace-pre ${
                      part.added
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : part.removed
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'text-d-ink'
                    }`}
                  >
                    <span className="mr-2 select-none opacity-50">{part.added ? '+' : part.removed ? '-' : ' '}</span>
                    {line}
                  </div>
                ))
              })}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="flex items-center gap-4 pt-4">
              <span className="text-xs font-semibold text-emerald-400">+{parsed.filter(p => p.added).reduce((a, p) => a + (p.value.match(/\n/g) || []).length, 0)} {t('action.add', 'added')}</span>
              <span className="text-xs font-semibold text-rose-400">-{parsed.filter(p => p.removed).reduce((a, p) => a + (p.value.match(/\n/g) || []).length, 0)} {t('action.remove', 'removed')}</span>
            </div>
          )}
        </Column>
      </Scroll>
    </Region>
  )
}