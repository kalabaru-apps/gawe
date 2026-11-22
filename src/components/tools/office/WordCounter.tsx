'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Page, Stat, Notice, Section, Column, Scroll, Field, TextArea } from '@/components/domain'

const STOP_WORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they'])

export default function WordCounter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [text, setText] = useState((initialState?.text as string) ?? '')
  const firedRef = useRef(false)

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
      if (!firedRef.current) { analytics.buttonClick('word-counter', 'count'); firedRef.current = true }
      onOutput({ text: text.slice(0, 100) }, { wordCount: stats.wordCount, charCount: stats.charCount })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.wordCount, stats.charCount])

  return (
    <Scroll>
      <Column width="md">
        <header>
          <h1 className="font-serif text-3xl font-semibold">{t('office.word_counter', 'Word Counter')}</h1>
          <p className="mt-1 text-sm text-d-muted">{t('office.word_counter_desc', 'Paste text and get live statistics. Nothing leaves your device.')}</p>
        </header>

        <Page>
          <Field id="wc-input" label={t('common.text', 'Text')}>
            <TextArea
              id="wc-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[18rem]"
              placeholder={t('office.paste_text', 'Paste or type your text here')}
              spellCheck={false}
            />
          </Field>
        </Page>

        {stats.wordCount === 0 ? (
          <Notice tone="info">{t('office.word_counter_empty', 'Start typing or paste text to see statistics.')}</Notice>
        ) : (
          <>
            <Page>
              <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4" aria-live="polite">
                <Stat label={t('office.words', 'Words')} value={stats.wordCount.toLocaleString()} tone="serif" />
                <Stat label={t('office.characters', 'Characters')} value={stats.charCount.toLocaleString()} tone="serif" />
                <Stat label={t('office.chars_no_spaces', 'Characters (no spaces)')} value={stats.charNoSpace.toLocaleString()} tone="serif" />
                <Stat label={t('office.sentences', 'Sentences')} value={stats.sentences.toLocaleString()} tone="serif" />
                <Stat label={t('office.paragraphs', 'Paragraphs')} value={stats.paragraphs.toLocaleString()} tone="serif" />
                <Stat label={t('office.reading_time', 'Reading time')} value={`~${stats.readMin} min`} tone="serif" />
                <Stat label={t('office.speaking_time', 'Speaking time')} value={`~${stats.speakMin} min`} tone="serif" />
              </div>
            </Page>

            {stats.topWords.length > 0 && (
              <Page>
                <Section title={t('office.top_words', 'Top words')}>
                  <ol className="flex flex-col gap-2">
                    {stats.topWords.map(([word, count], i) => (
                      <li key={word} className="flex items-center gap-3">
                        <span className="w-5 text-right font-mono text-xs text-d-muted">{i + 1}</span>
                        <span className="w-24 shrink-0 truncate font-mono text-sm">{word}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-d-border">
                          <div className="h-full rounded-full bg-d-accent" style={{ width: `${(count / stats.topWords[0][1]) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs tabular-nums text-d-muted">{count}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              </Page>
            )}
          </>
        )}
      </Column>
    </Scroll>
  )
}
