'use client'

// Domain: workbench (live code formatter, two panes).
import { useState, useEffect } from 'react'
import { format as sqlFormat } from 'sql-formatter'
import { Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea } from '@/components/domain'

type Language = 'javascript' | 'css' | 'html' | 'sql'
type Mode = 'beautify' | 'minify'

async function beautify(code: string, lang: Language): Promise<string> {
  if (lang === 'sql') return sqlFormat(code, { language: 'sql', tabWidth: 2, keywordCase: 'upper' })
  const prettier = await import('prettier/standalone')
  const plugins = await Promise.all([
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
  ])
  const parserMap: Record<Language, string> = { javascript: 'babel', css: 'css', html: 'html', sql: 'sql' }
  return prettier.format(code, { parser: parserMap[lang], plugins: plugins.map((p) => p.default ?? p), tabWidth: 2, singleQuote: true, semi: true })
}

function minify(code: string, lang: Language): string {
  if (lang === 'css') return code.replace(/\s*([{}:;,])\s*/g, '$1').replace(/\s+/g, ' ').trim()
  if (lang === 'html') return code.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
  return code.replace(/\s+/g, ' ').trim()
}

export default function CodeBeautifier({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [lang, setLang] = useState<Language>((initialState?.lang as Language) ?? 'javascript')
  const [mode, setMode] = useState<Mode>('beautify')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Live: debounce typing, ignore stale async results.
  useEffect(() => {
    if (!input.trim()) { setOutput(''); setError(''); return }
    let stale = false
    const id = setTimeout(async () => {
      try {
        const out = mode === 'minify' ? minify(input, lang) : await beautify(input, lang)
        if (stale) return
        setOutput(out); setError('')
      } catch (e) {
        if (stale) return
        setOutput('')
        setError(e instanceof Error ? e.message.split('\n')[0] : 'Formatting failed')
      }
    }, 250)
    return () => { stale = true; clearTimeout(id) }
  }, [input, lang, mode])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onOutput({ input, language: lang, mode }, { output })
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<Language>
            label="Language"
            value={lang}
            onChange={setLang}
            options={[{ value: 'javascript', label: 'JavaScript' }, { value: 'css', label: 'CSS' }, { value: 'html', label: 'HTML' }, { value: 'sql', label: 'SQL' }]}
          />
          <Segmented<Mode>
            label="Action"
            value={mode}
            onChange={setMode}
            options={[{ value: 'beautify', label: t('common.format', 'Beautify') }, { value: 'minify', label: t('common.minify', 'Minify') }]}
          />
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input.trim() && <span>Paste {lang} code. It formats as you type.</span>}
          {output && !error && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />{mode === 'minify' ? 'Minified' : 'Formatted'}</span>}
          {error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{error}</span></span>}
          {output && <span className="ml-auto">{output.split('\n').length} lines</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={`Input ${lang}`}>
            <CodeArea label="Input code" value={input} onChange={setInput} placeholder={`Paste ${lang} code here`} />
          </Pane>
        }
        right={
          <Pane
            label={t('action.output', 'Output')}
            actions={
              <WbButton onClick={copy} disabled={!output} className="h-6">
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </WbButton>
            }
          >
            <CodeArea label="Formatted code" value={output} readOnly placeholder="Result appears here" />
          </Pane>
        }
      />
    </Workbench>
  )
}
