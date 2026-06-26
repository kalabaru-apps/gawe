'use client'

import { useState, useEffect } from 'react'
import { marked } from 'marked'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { useTranslation } from '@/lib/i18n'

const SAMPLE = `# Hello, World!

This is **bold** and _italic_ text.

## Code Example

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`
\`\`\`

## List

- Item one
- Item two
- Item three

> A blockquote with some wisdom.
`

type Tab = 'preview' | 'html'

export default function MarkdownConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState((initialState?.input as string) ?? SAMPLE)
  const [tab, setTab] = useState<Tab>('preview')
  const [html, setHtml] = useState('')

  useEffect(() => {
    const result = marked.parse(input, { async: false }) as string
    setHtml(result)
    if (input) {
      onOutput({ markdown: input }, { html: result })
    }
  }, [input, onOutput])

  return (
    <ToolPanel
      left={
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">{t('dev.markdown_input', 'Markdown')}</label>
          <CodeEditor value={input} onChange={setInput} language="markdown" />
        </div>
      }
      right={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 border border-input rounded-md p-0.5">
              {(['preview', 'html'] as Tab[]).map((tabVal) => (
                <button
                  key={tabVal}
                  onClick={() => setTab(tabVal)}
                  className={`px-3 py-1 rounded text-xs capitalize transition-colors ${
                    tab === tabVal ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {tabVal === 'preview' ? t('dev.markdown_preview', 'Preview') : tabVal}
                </button>
              ))}
            </div>
            <CopyButton value={tab === 'preview' ? input : html} />
          </div>
          {tab === 'preview' ? (
            <div
              className="border border-input rounded-md p-4 min-h-[300px] text-sm [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-auto [&_pre]:my-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <CodeEditor value={html} onChange={() => {}} language="html" readOnly />
          )}
        </div>
      }
    />
  )
}
