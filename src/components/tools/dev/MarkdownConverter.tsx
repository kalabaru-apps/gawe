'use client'

import { useState, useEffect, useRef } from 'react'
import { marked } from 'marked'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, Pane, CodeArea, Chip, Row, Notice, SplitPane, Region, CopyBtn, Column, Section, Btn } from '@/components/domain'
import { FileText, Download, Copy } from 'lucide-react'

/** Paper + Workbench: markdown pane and a rendered/HTML result */

export default function MarkdownConverter({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [markdown, setMarkdown] = useState((initialState?.markdown as string) ?? '')
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    try {
      const rawHtml = marked.parse(markdown, { async: false }) as string
      setHtml(rawHtml)
      setError(null)
      if (!firedRef.current) { analytics.buttonClick('markdown-converter', 'convert'); firedRef.current = true }
      onOutput({ markdown }, { html: rawHtml })
    } catch (e) {
      setError((e as Error).message)
      setHtml('')
    }
  }, [markdown, onOutput])

  return (
    <Region domain="workbench">
      <Workbench
        toolbar={
          <Toolbar>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(html)}>
                <Copy className="h-3.5 w-3.5" aria-hidden /> {t('action.copy_html', 'Copy HTML')}
              </Btn>
              <Btn variant="secondary" onClick={() => {
                const blob = new Blob([html], { type: 'text/html' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'output.html'
                a.click()
                URL.revokeObjectURL(url)
              }}>
                <Download className="h-3.5 w-3.5" aria-hidden /> {t('action.download', 'Download HTML')}
              </Btn>
            </div>
          </Toolbar>
        }
      >
        <Region domain="paper">
          <SplitPane
            left={
              <Pane label={t('dev.markdown_input', 'Markdown')}>
                <CodeArea
                  value={markdown}
                  onChange={setMarkdown}
                  label={t('dev.markdown_input', 'Markdown')}
                  placeholder="Write markdown here..."
                />
              </Pane>
            }
            right={
              <Pane label={t('dev.preview', 'Preview')}>
                <div className="flex-1 overflow-auto p-4 prose prose-stone dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: html || `<p class="text-d-muted">${t('dev.preview_empty', 'Markdown preview appears here')}</p>` }} />
                </div>
              </Pane>
            }
          />
        </Region>
      </Workbench>
    </Region>
  )
}