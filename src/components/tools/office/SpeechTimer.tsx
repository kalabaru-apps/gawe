'use client'

import { useState, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface Pace {
  key: string
  label: string
  wpm: number
}

const PACES: Pace[] = [
  { key: 'slow', label: 'Slow / Deliberate', wpm: 100 },
  { key: 'normal', label: 'Normal', wpm: 130 },
  { key: 'conversational', label: 'Conversational', wpm: 150 },
  { key: 'fast', label: 'Fast / Energetic', wpm: 180 },
]

const READING_WPM = 250

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function countSentences(text: string): number {
  const matches = text.match(/[.?!]+/g)
  return matches ? matches.length : (text.trim() ? 1 : 0)
}

function countWordySentences(text: string): number {
  const sentences = text.split(/[.?!]+/).filter((s) => s.trim())
  return sentences.filter((s) => s.trim().split(/\s+/).filter(Boolean).length > 40).length
}

export default function SpeechTimer({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [text, setText] = useState((initialState?.text as string) ?? '')
  const [paceKey, setPaceKey] = useState('normal')
  const [targetMinutes, setTargetMinutes] = useState('')

  const pace = PACES.find((p) => p.key === paceKey) ?? PACES[1]

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : []
    const wordCount = words.length
    const charCount = text.length
    const sentenceCount = countSentences(text)
    const wordySentences = countWordySentences(text)
    const speakSeconds = wordCount > 0 ? (wordCount / pace.wpm) * 60 : 0
    const readSeconds = wordCount > 0 ? (wordCount / READING_WPM) * 60 : 0
    return { wordCount, charCount, sentenceCount, wordySentences, speakSeconds, readSeconds }
  }, [text, pace.wpm])

  const target = useMemo(() => {
    const mins = parseFloat(targetMinutes)
    if (isNaN(mins) || mins <= 0) return null
    const targetSecs = mins * 60
    const diff = stats.speakSeconds - targetSecs
    const diffWords = Math.round(Math.abs(diff / 60) * pace.wpm)
    return { targetSecs, diff, diffWords }
  }, [targetMinutes, stats.speakSeconds, pace.wpm])

  const firedRef = useRef(false)
  const handleChange = (val: string) => {
    setText(val)
    if (!firedRef.current && val.trim()) { analytics.buttonClick('speech-timer', 'start'); firedRef.current = true }
    onOutput({ text: val, pace: paceKey }, { wordCount: val.trim().split(/\s+/).filter(Boolean).length })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Textarea */}
      <textarea
        className="w-full min-h-[200px] rounded-lg border border-border bg-background text-foreground text-sm p-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t('office.paste_text', 'Paste your speech or script here…')}
        rows={12}
      />

      {/* Pace selector */}
      <div className="flex flex-wrap gap-2">
        {PACES.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={paceKey === p.key ? 'default' : 'outline'}
            onClick={() => setPaceKey(p.key)}
          >
            {p.label}
            <span className="ml-1.5 opacity-70 text-xs">{p.wpm} WPM</span>
          </Button>
        ))}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label={t('office.words', 'Words')} value={stats.wordCount.toLocaleString()} />
        <StatCard label={t('office.characters', 'Characters')} value={stats.charCount.toLocaleString()} />
        <StatCard label={t('office.sentences', 'Sentences')} value={stats.sentenceCount.toLocaleString()} />
        <StatCard label={t('office.reading_time', 'Reading time')} value={stats.wordCount > 0 ? formatTime(stats.readSeconds) : '—'} sub="at 250 WPM" />
        {stats.wordySentences > 0 && (
          <StatCard label={t('office.speech_duration', 'Long sentences')} value={String(stats.wordySentences)} sub=">40 words" warn />
        )}
      </div>

      {/* Big time display */}
      <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t('office.speech_duration', 'Estimated speaking time')}</div>
        <div className="text-5xl font-bold text-foreground tabular-nums">
          {stats.wordCount > 0 ? formatTime(stats.speakSeconds) : '—'}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{pace.label} · {pace.wpm} WPM</div>
      </div>

      {/* Target duration */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground shrink-0">{t('office.speech_duration', 'Target duration')} ({t('office.minutes', 'min')}):</label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={targetMinutes}
          onChange={(e) => setTargetMinutes(e.target.value)}
          className="w-24 rounded border border-border bg-background text-foreground text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. 5"
        />
        {target && (
          <span className={`text-sm font-medium ${Math.abs(target.diff) < 5 ? 'text-green-500' : target.diff > 0 ? 'text-destructive' : 'text-yellow-500'}`}>
            {Math.abs(target.diff) < 5
              ? t('office.speech_pace', 'On target')
              : target.diff > 0
              ? `~${target.diffWords} ${t('office.words', 'words')} too many (${formatTime(target.diff)} over)`
              : `~${target.diffWords} ${t('office.words', 'words')} short (${formatTime(-target.diff)} under)`}
          </span>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-center ${warn ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-border bg-muted/10'}`}>
      <div className={`text-xl font-semibold ${warn ? 'text-yellow-500' : 'text-foreground'}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground/60">{sub}</div>}
    </div>
  )
}
