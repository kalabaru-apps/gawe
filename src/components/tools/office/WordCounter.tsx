'use client'

import { useState, useEffect, useMemo } from 'react'
import type { ToolProps } from '@/types'

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they'])

export default function WordCounter({ onOutput, initialState }: ToolProps) {
  const [text, setText] = useState((initialState?.text as string) ?? '')

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : []
    const sentences = text.trim() ? text.split(/[.!?]+/).filter((s) => s.trim()).length : 0
    const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0
    const readMin = Math.ceil(words.length / 200)
    const speakMin = Math.ceil(words.length / 130)

    const freq: Record<string, number> = {}
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[^a-z]/g, '')
      if (lower && !STOP_WORDS.has(lower)) freq[lower] = (freq[lower] ?? 0) + 1
    }
    const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)

    return { wordCount: words.length, charCount: text.length, charNoSpace: text.replace(/\s/g, '').length, sentences, paragraphs, readMin, speakMin, topWords }
  }, [text])

  useEffect(() => {
    if (stats.wordCount > 0) {
      onOutput({ text: text.slice(0, 100) }, { wordCount: stats.wordCount, charCount: stats.charCount })
    }
  }, [stats.wordCount, stats.charCount])

  const STAT_ROWS = [
    { label: 'Words', value: stats.wordCount.toLocaleString() },
    { label: 'Characters', value: stats.charCount.toLocaleString() },
    { label: 'Characters (no spaces)', value: stats.charNoSpace.toLocaleString() },
    { label: 'Sentences', value: stats.sentences.toLocaleString() },
    { label: 'Paragraphs', value: stats.paragraphs.toLocaleString() },
    { label: 'Reading time', value: `~${stats.readMin} min` },
    { label: 'Speaking time', value: `~${stats.speakMin} min` },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[400px] text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring leading-relaxed"
          placeholder="Paste or type your text here..."
        />
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-input overflow-hidden">
          {STAT_ROWS.map((r, i) => (
            <div key={r.label} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-border/50' : ''}`}>
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className="font-mono font-semibold">{r.value}</span>
            </div>
          ))}
        </div>
        {stats.topWords.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Words</p>
            <div className="space-y-1">
              {stats.topWords.map(([word, count]) => (
                <div key={word} className="flex items-center gap-2">
                  <span className="font-mono text-sm w-32 truncate">{word}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(count / stats.topWords[0][1]) * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
