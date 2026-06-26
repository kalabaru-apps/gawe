'use client'

import { useState, useCallback } from 'react'
import { LoremIpsum } from 'lorem-ipsum'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

const lorem = new LoremIpsum()
type Unit = 'words' | 'sentences' | 'paragraphs'

export default function LoremIpsumGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [unit, setUnit] = useState<Unit>((initialState?.unit as Unit) ?? 'paragraphs')
  const [count, setCount] = useState<number>((initialState?.count as number) ?? 3)
  const [output, setOutput] = useState('')

  const generate = useCallback(() => {
    let text: string
    switch (unit) {
      case 'words': text = lorem.generateWords(count); break
      case 'sentences': text = lorem.generateSentences(count); break
      case 'paragraphs': text = lorem.generateParagraphs(count); break
    }
    setOutput(text)
    onOutput({ unit, count }, { text, charCount: text.length })
  }, [unit, count, onOutput])

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.type', 'Unit')}</label>
            <div className="flex gap-2">
              {(['words', 'sentences', 'paragraphs'] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`flex-1 py-2 rounded-md text-sm border capitalize transition-colors ${
                    unit === u ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('common.count', 'Count')}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => { analytics.buttonClick('lorem-ipsum', 'generate'); generate() }}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('dev.lorem_generate', 'Generate')}
          </button>
          <button
            onClick={generate}
            className="w-full py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors"
          >
            {t('action.reset', 'Regenerate (new random)')}
          </button>
        </div>
      }
      right={
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{output.length} characters</span>
            <CopyButton value={output} />
          </div>
          <div className="border border-input rounded-md p-4 min-h-[300px] text-sm leading-relaxed whitespace-pre-wrap">
            {output || <span className="text-muted-foreground">{t('dev.lorem_generate', 'Click Generate to produce lorem ipsum text')}</span>}
          </div>
        </div>
      }
    />
  )
}
