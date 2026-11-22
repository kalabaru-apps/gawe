'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { X, Play, Pause } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Page, Section, Field, TextInput, TextArea, Seg, Btn, CopyBtn, Stat, Column, Scroll } from '@/components/domain'

type Pace = 'slow' | 'normal' | 'conversational' | 'fast'

const PACES: { key: Pace; label: string; wpm: number }[] = [
  { key: 'slow', label: 'Slow', wpm: 100 },
  { key: 'normal', label: 'Normal', wpm: 130 },
  { key: 'conversational', label: 'Chatty', wpm: 150 },
  { key: 'fast', label: 'Fast', wpm: 180 },
]

const READING_WPM = 250

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return m === 0 ? `${s}s` : `${m}m ${s % 60}s`
}

function countSentences(text: string): number {
  const matches = text.match(/[.?!]+/g)
  return matches ? matches.length : (text.trim() ? 1 : 0)
}

function countWordySentences(text: string): number {
  return text.split(/[.?!]+/).filter((s) => s.trim().split(/\s+/).filter(Boolean).length > 40).length
}

export default function SpeechTimer({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [text, setText] = useState((initialState?.text as string) ?? '')
  const [paceKey, setPaceKey] = useState<Pace>('normal')
  const [targetMin, setTargetMin] = useState((initialState?.targetMinutes as string) ?? '')
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const valueRef = useRef('')
  valueRef.current = text

  const pace = PACES.find((p) => p.key === paceKey) ?? PACES[1]

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const stats = useMemo(() => {
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
    return {
      wordCount,
      charCount: text.length,
      sentenceCount: countSentences(text),
      wordySentences: countWordySentences(text),
      speakSeconds: wordCount > 0 ? (wordCount / pace.wpm) * 60 : 0,
      readSeconds: wordCount > 0 ? (wordCount / READING_WPM) * 60 : 0,
    }
  }, [text, pace.wpm])

  const target = useMemo(() => {
    const mins = parseFloat(targetMin)
    if (isNaN(mins) || mins <= 0 || stats.wordCount === 0) return null
    const diff = stats.speakSeconds - mins * 60
    return { diff, diffWords: Math.round(Math.abs(diff / 60) * pace.wpm) }
  }, [targetMin, stats, pace.wpm])

  const remaining = stats.speakSeconds - elapsed
  const over = stats.speakSeconds > 0 && remaining < 0
  const pct = stats.speakSeconds > 0 ? Math.min(100, (elapsed / stats.speakSeconds) * 100) : 0

  const handleChange = (val: string) => {
    if (!valueRef.current && val.trim()) analytics.buttonClick('speech-timer', 'input')
    setText(val)
    onOutput({ text: val, pace: paceKey }, { wordCount: val.trim().split(/\s+/).filter(Boolean).length })
  }

  const toggle = () => {
    if (!running) analytics.buttonClick('speech-timer', 'start')
    setRunning((r) => !r)
  }

  const reset = () => {
    setRunning(false)
    setElapsed(0)
  }

  return (
    <Scroll>
      <Column width="lg">
        <header>
          <h1 className="font-serif text-3xl font-semibold">{t('office.speech_timer', 'Speech Timer')}</h1>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_20rem]">
          <Page>
            <Field id="speech-timer-text" label={t('office.script', 'Script')}>
              <TextArea
                id="speech-timer-text"
                value={text}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={t('office.paste_text', 'Paste your speech or script here')}
                className="min-h-[22rem]"
              />
            </Field>
            <div className="mt-3 flex justify-end">
              <CopyBtn value={text} label={t('common.copy', 'Copy')} />
            </div>
          </Page>

          <div className="flex flex-col gap-5">
            <Page className="flex flex-col gap-4">
              <div role="timer" aria-label={t('office.speech_duration', 'Time remaining')} className="rounded-d bg-d-surface px-4 py-5 text-center">
                <p className={`font-display text-5xl font-semibold tabular-nums ${over ? 'text-red-700 dark:text-red-300' : ''}`}>
                  {over ? '+' : ''}{formatTime(Math.abs(remaining))}
                </p>
                <p className="mt-1 text-xs text-d-muted">
                  {over ? t('office.speech_complete', 'Over time') : running ? t('office.speech_duration', 'Remaining') : elapsed > 0 ? t('office.speech_paused', 'Paused') : t('office.speech_ready', 'Estimated length')}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-d-border" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${over ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : 'bg-d-accent'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="flex gap-2">
                <Btn variant="primary" onClick={toggle} disabled={stats.wordCount === 0} className="flex-1">
                  {running ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
                  {running ? t('common.pause', 'Pause') : elapsed > 0 ? t('common.resume', 'Resume') : t('common.start', 'Start')}
                </Btn>
                <Btn onClick={reset}>
                  <X className="h-3.5 w-3.5" aria-hidden />
                  {t('common.reset', 'Reset')}
                </Btn>
              </div>
            </Page>

            <Page>
              <Section title={t('office.speech_pace', 'Speaking pace')}>
                <Seg<Pace> value={paceKey} onChange={setPaceKey} label={t('office.speech_pace', 'Speaking pace')} options={PACES.map((p) => ({ value: p.key, label: p.label }))} className="w-full [&>button]:flex-1 [&>button]:px-1" />
                <p className="text-xs text-d-muted">{pace.wpm} words per minute</p>
                <Field id="speech-target" label={`${t('office.speech_target', 'Target duration')} (${t('office.minutes', 'min')})`}>
                  <TextInput id="speech-target" type="number" min={0} step={0.5} value={targetMin} onChange={(e) => setTargetMin(e.target.value)} placeholder="5" />
                </Field>
                {target && (
                  <p className="text-sm font-medium" aria-live="polite">
                    {Math.abs(target.diff) < 5
                      ? t('office.speech_on_target', 'On target')
                      : target.diff > 0
                        ? `${t('office.speech_too_long', 'Too long')}: about ${target.diffWords} words over`
                        : `${t('office.speech_too_short', 'Too short')}: about ${target.diffWords} words short`}
                  </p>
                )}
              </Section>
            </Page>
          </div>
        </div>

        <Page>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <Stat label={t('office.words', 'Words')} value={stats.wordCount.toLocaleString()} tone="serif" />
            <Stat label={t('office.characters', 'Characters')} value={stats.charCount.toLocaleString()} tone="serif" />
            <Stat label={t('office.sentences', 'Sentences')} value={stats.sentenceCount.toLocaleString()} tone="serif" />
            <Stat label={t('office.reading_time', 'Reading time')} value={stats.wordCount > 0 ? formatTime(stats.readSeconds) : '-'} note={`${READING_WPM} WPM`} tone="serif" />
            {stats.wordySentences > 0 && (
              <Stat label={t('office.long_sentences', 'Long sentences')} value={String(stats.wordySentences)} note="over 40 words" tone="serif" />
            )}
          </div>
        </Page>
      </Column>
    </Scroll>
  )
}
