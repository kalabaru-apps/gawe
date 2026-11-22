'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Section, Field, Select, Btn, Stat, Notice, Scroll, Sheet, Page, Result } from '@/components/domain'
import { Copy } from 'lucide-react'

const LOREM_TYPES = [
  { value: 'paragraphs', label: 'Paragraphs' },
  { value: 'sentences', label: 'Sentences' },
  { value: 'words', label: 'Words' },
]

const LOREM_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`

function generateLorem(type: string, count: number): string {
  const words = LOREM_TEXT.split(' ')
  const sentences = LOREM_TEXT.split('. ').filter(s => s).map(s => s.trim() + '.')
  const paragraphs = [LOREM_TEXT]

  switch (type) {
    case 'words':
      return Array.from({ length: count }, (_, i) => words[i % words.length]).join(' ')
    case 'sentences':
      return Array.from({ length: count }, (_, i) => sentences[i % sentences.length]).join(' ')
    case 'paragraphs':
      return Array.from({ length: count }, (_, i) => paragraphs[i % paragraphs.length]).join('\n\n')
    default:
      return ''
  }
}

export default function LoremIpsum({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [type, setType] = useState((initialState?.type as string) ?? 'paragraphs')
  const [count, setCount] = useState((initialState?.count as number) ?? 3)
  const [text, setText] = useState('')
  const firedRef = useRef(false)

  useEffect(() => {
    const generated = generateLorem(type, count)
    setText(generated)
    if (!firedRef.current) { analytics.buttonClick('lorem-ipsum', 'generate'); firedRef.current = true }
    onOutput({ type, count }, { text: generated, words: generated.split(/\s+/).length, chars: generated.length })
  }, [type, count])

  return (
    <Region domain="paper">
      <Scroll>
        <Column width="md">
          <Section title={t('dev.lorem_ipsum', 'Lorem Ipsum')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="type" label={t('dev.lorem_type', 'Type')}>
                <Select value={type} onChange={e => setType(e.target.value)}>
                  {LOREM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <Field id="count" label={t('dev.count', 'Count')}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={e => setCount(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink focus:border-d-accent outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-accent"
                />
              </Field>
            </div>
          </Section>

          <Sheet>
            <Page>
              <div className="prose prose-stone dark:prose-invert max-w-none whitespace-pre-wrap font-sans text-base leading-relaxed">
                {text || <span className="text-d-muted">{t('dev.lorem_empty', 'Select type and count to generate placeholder text')}</span>}
              </div>
            </Page>
          </Sheet>

          {text && (
            <div className="flex items-center gap-4 pt-4">
              <Stat label={t('dev.words', 'Words')} value={text.split(/\s+/).filter(Boolean).length} />
              <Stat label={t('dev.chars', 'Chars')} value={text.length} />
              <button
                className="ml-auto inline-flex items-center gap-1.5 rounded-d border border-d-border bg-d-raised px-3 py-1.5 text-sm font-medium text-d-ink hover:bg-d-border/40 transition-colors"
                onClick={() => navigator.clipboard.writeText(text)}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden /> {t('action.copy', 'Copy')}
              </button>
            </div>
          )}
        </Column>
      </Scroll>
    </Region>
  )
}