'use client'

import { useState } from 'react'
import { format as sqlFormat } from 'sql-formatter'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type Language = 'javascript' | 'css' | 'html' | 'sql'
const LANGUAGES: Language[] = ['javascript', 'css', 'html', 'sql']

async function beautify(code: string, lang: Language): Promise<string> {
  if (lang === 'sql') {
    return sqlFormat(code, { language: 'sql', tabWidth: 2, keywordCase: 'upper' })
  }
  const prettier = await import('prettier/standalone')
  const plugins = await Promise.all([
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
  ])
  const parserMap: Record<Language, string> = {
    javascript: 'babel',
    css: 'css',
    html: 'html',
    sql: 'sql',
  }
  return prettier.format(code, {
    parser: parserMap[lang],
    plugins: plugins.map((p) => p.default ?? p),
    tabWidth: 2,
    singleQuote: true,
    semi: true,
  })
}

function minify(code: string, lang: Language): string {
  if (lang === 'sql') return code.replace(/\s+/g, ' ').trim()
  if (lang === 'css') return code.replace(/\s*([{}:;,])\s*/g, '$1').replace(/\s+/g, ' ').trim()
  if (lang === 'html') return code.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim()
  // JS: basic whitespace collapse (full minification needs a minifier lib)
  return code.replace(/\s+/g, ' ').trim()
}

export default function CodeBeautifier({ onOutput, initialState }: ToolProps) {
  const [lang, setLang] = useState<Language>((initialState?.lang as Language) ?? 'javascript')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleBeautify = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      const result = await beautify(input, lang)
      setOutput(result)
      setError('')
      onOutput({ input, language: lang, mode: 'beautify' }, { output: result })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Formatting failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMinify = () => {
    if (!input.trim()) return
    const result = minify(input, lang)
    setOutput(result)
    setError('')
    onOutput({ input, language: lang, mode: 'minify' }, { output: result })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded px-2 py-1 text-xs font-mono uppercase transition-colors ${
                lang === l
                  ? 'bg-indigo-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleBeautify} disabled={loading}>
          {loading ? 'Formatting…' : 'Beautify'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleMinify}>Minify</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={<CodeEditor value={input} onChange={setInput} language={lang} rows={16} placeholder={`Paste ${lang} code here…`} />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={16} />
          </div>
        }
      />
    </div>
  )
}
