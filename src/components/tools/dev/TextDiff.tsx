'use client'

import { useState, useEffect, useRef } from 'react'
import { diffLines } from 'diff'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

export default function TextDiff({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [original, setOriginal] = useState((initialState?.original as string) ?? '')
  const [modified, setModified] = useState((initialState?.modified as string) ?? '')
  const [added, setAdded] = useState(0)
  const [removed, setRemoved] = useState(0)
  const firedRef = useRef(false)

  const parts = diffLines(original, modified)

  useEffect(() => {
    let a = 0, r = 0
    for (const p of parts) {
      const lines = (p.value.match(/\n/g) ?? []).length
      if (p.added) a += lines
      if (p.removed) r += lines
    }
    setAdded(a)
    setRemoved(r)
    if (a > 0 || r > 0) {
      if (!firedRef.current) { analytics.buttonClick('text-diff', 'diff'); firedRef.current = true }
      onOutput({ original, modified }, { linesAdded: a, linesRemoved: r })
    }
  }, [original, modified])

  const diffText = parts
    .map((p) => {
      const prefix = p.added ? '+ ' : p.removed ? '- ' : '  '
      return p.value.replace(/\n$/, '').split('\n').map((l) => prefix + l).join('\n')
    })
    .join('\n')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-xs text-emerald-400 font-medium">+{added} {t('action.add', 'added')}</span>
        <span className="text-xs text-rose-400 font-medium">-{removed} {t('action.remove', 'removed')}</span>
        <div className="ml-auto">
          <CopyButton value={diffText} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.diff_original', 'Original')}</label>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            className="w-full min-h-[300px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
            placeholder={t('dev.diff_original', 'Paste original text here...')}
            spellCheck={false}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.diff_modified', 'Modified')}</label>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            className="w-full min-h-[300px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
            placeholder={t('dev.diff_modified', 'Paste modified text here...')}
            spellCheck={false}
          />
        </div>
      </div>
      {(original || modified) && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.diff_no_diff', 'Diff')}</label>
          <div className="font-mono text-xs border border-input rounded-md overflow-auto max-h-96 bg-muted/20">
            {parts.map((part, i) => {
              const lines = part.value.replace(/\n$/, '').split('\n')
              return lines.map((line, j) => (
                <div
                  key={`${i}-${j}`}
                  className={`px-3 py-0.5 whitespace-pre ${
                    part.added
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : part.removed
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span className="mr-2 select-none opacity-50">{part.added ? '+' : part.removed ? '-' : ' '}</span>
                  {line}
                </div>
              ))
            })}
          </div>
        </div>
      )}
    </div>
  )
}
