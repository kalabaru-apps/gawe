'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

// ---------------------------------------------------------------------------
// curl parser
// ---------------------------------------------------------------------------

interface ParsedCurl {
  method: string
  url: string
  headers: Record<string, string>
  body: string | null
  formFields: Record<string, string>
}

function tokenize(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let i = 0
  const s = input.trim().replace(/\\\n/g, ' ')
  while (i < s.length) {
    const ch = s[i]
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble
    } else if ((ch === ' ' || ch === '\t') && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = '' }
    } else {
      current += ch
    }
    i++
  }
  if (current) tokens.push(current)
  return tokens
}

function parseCurl(raw: string): ParsedCurl | { error: string } {
  const tokens = tokenize(raw)
  if (!tokens.length || tokens[0].toLowerCase() !== 'curl') {
    return { error: 'Input must start with "curl"' }
  }

  let method = ''
  let url = ''
  const headers: Record<string, string> = {}
  let body: string | null = null
  const formFields: Record<string, string> = {}

  let i = 1
  while (i < tokens.length) {
    const tok = tokens[i]

    if (tok === '-X' || tok === '--request') {
      method = (tokens[++i] ?? '').toUpperCase()
    } else if (tok === '-H' || tok === '--header') {
      const hdr = tokens[++i] ?? ''
      const colon = hdr.indexOf(':')
      if (colon !== -1) {
        const key = hdr.slice(0, colon).trim()
        const val = hdr.slice(colon + 1).trim()
        headers[key] = val
      }
    } else if (tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') {
      body = tokens[++i] ?? ''
    } else if (tok === '-F' || tok === '--form') {
      const field = tokens[++i] ?? ''
      const eq = field.indexOf('=')
      if (eq !== -1) {
        formFields[field.slice(0, eq)] = field.slice(eq + 1)
      }
    } else if (tok === '-u' || tok === '--user') {
      const userPass = tokens[++i] ?? ''
      const b64 = btoa(userPass)
      headers['Authorization'] = `Basic ${b64}`
    } else if (
      tok === '-L' || tok === '--location' ||
      tok === '-s' || tok === '--silent' ||
      tok === '-i' || tok === '--include' ||
      tok === '-v' || tok === '--verbose' ||
      tok === '-k' || tok === '--insecure' ||
      tok === '--compressed'
    ) {
      // ignore these flags
    } else if (tok.startsWith('-')) {
      // unknown flag — skip next token if it doesn't look like a flag
      if (tokens[i + 1] && !tokens[i + 1].startsWith('-')) i++
    } else if (!url && (tok.startsWith('http://') || tok.startsWith('https://') || tok.startsWith('/'))) {
      url = tok
    } else if (!url) {
      url = tok
    }

    i++
  }

  if (!url) return { error: 'Could not find a URL in the curl command' }

  // Defaults
  const hasForm = Object.keys(formFields).length > 0
  if (!method) {
    method = body || hasForm ? 'POST' : 'GET'
  }

  return { method, url, headers, body: body ?? null, formFields }
}

// ---------------------------------------------------------------------------
// Code generators
// ---------------------------------------------------------------------------

function headersObj(headers: Record<string, string>): string {
  const entries = Object.entries(headers)
  if (!entries.length) return '{}'
  const inner = entries.map(([k, v]) => `    '${k}': '${escStr(v)}'`).join(',\n')
  return `{\n${inner}\n  }`
}

function escStr(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function toJsFetch(p: ParsedCurl): string {
  const hasBody = p.body !== null || Object.keys(p.formFields).length > 0
  const bodyStr = p.body ?? null
  const lines: string[] = [
    `const response = await fetch('${p.url}', {`,
    `  method: '${p.method}',`,
  ]
  if (Object.keys(p.headers).length) {
    lines.push(`  headers: ${headersObj(p.headers)},`)
  }
  if (bodyStr) {
    lines.push(`  body: \`${bodyStr.replace(/`/g, '\\`')}\`,`)
  } else if (Object.keys(p.formFields).length) {
    const fd = Object.entries(p.formFields).map(([k, v]) => `  formData.append('${escStr(k)}', '${escStr(v)}')`).join('\n')
    return `const formData = new FormData()\n${fd}\n\n` +
      lines.join('\n') + `\n  body: formData,\n})\n\nconst data = await response.json()\nconsole.log(data)`
  }
  lines.push(`})`)
  lines.push(`\nconst data = await response.json()`)
  lines.push(`console.log(data)`)
  if (hasBody || p.method !== 'GET') {
    return `async function request() {\n  ${lines.join('\n  ')}\n}\n\nrequest()`
  }
  return `const data = await (await fetch('${p.url}')).json()\nconsole.log(data)`
}

function toAxios(p: ParsedCurl): string {
  const config: string[] = [
    `  method: '${p.method.toLowerCase()}',`,
    `  url: '${p.url}',`,
  ]
  if (Object.keys(p.headers).length) {
    config.push(`  headers: ${headersObj(p.headers)},`)
  }
  if (p.body) {
    try {
      JSON.parse(p.body)
      config.push(`  data: ${p.body},`)
    } catch {
      config.push(`  data: \`${p.body.replace(/`/g, '\\`')}\`,`)
    }
  } else if (Object.keys(p.formFields).length) {
    const fd = Object.entries(p.formFields)
      .map(([k, v]) => `  formData.append('${escStr(k)}', '${escStr(v)}')`)
      .join('\n')
    return `import axios from 'axios'\n\nconst formData = new FormData()\n${fd}\n\nconst response = await axios({\n${config.join('\n')}\n  data: formData,\n})\n\nconsole.log(response.data)`
  }
  return `import axios from 'axios'\n\nconst response = await axios({\n${config.join('\n')}\n})\n\nconsole.log(response.data)`
}

function toPythonRequests(p: ParsedCurl): string {
  const method = p.method.toLowerCase()
  const args: string[] = [`'${p.url}'`]

  if (Object.keys(p.headers).length) {
    const entries = Object.entries(p.headers)
      .map(([k, v]) => `    '${escStr(k)}': '${escStr(v)}'`)
      .join(',\n')
    args.push(`headers={\n${entries}\n}`)
  }

  if (p.body) {
    try {
      JSON.parse(p.body)
      args.push(`json=${pythonValue(JSON.parse(p.body))}`)
    } catch {
      args.push(`data='${escStr(p.body)}'`)
    }
  } else if (Object.keys(p.formFields).length) {
    const entries = Object.entries(p.formFields)
      .map(([k, v]) => `    '${escStr(k)}': '${escStr(v)}'`)
      .join(',\n')
    args.push(`files={\n${entries}\n}`)
  }

  const argStr = args.join(',\n    ')
  return `import requests\n\nresponse = requests.${method}(\n    ${argStr}\n)\n\nprint(response.status_code)\nprint(response.json())`
}

function pythonValue(val: unknown, indent = 0): string {
  if (val === null) return 'None'
  if (val === true) return 'True'
  if (val === false) return 'False'
  if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) {
    const pad = ' '.repeat(indent + 4)
    const items = val.map((v) => `${pad}${pythonValue(v, indent + 4)}`).join(',\n')
    return `[\n${items}\n${' '.repeat(indent)}]`
  }
  if (typeof val === 'object') {
    const pad = ' '.repeat(indent + 4)
    const entries = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => `${pad}'${k}': ${pythonValue(v, indent + 4)}`)
      .join(',\n')
    return `{\n${entries}\n${' '.repeat(indent)}}`
  }
  return String(val)
}

function toGo(p: ParsedCurl): string {
  const lines: string[] = [
    `package main`,
    ``,
    `import (`,
    `\t"fmt"`,
    `\t"io"`,
    `\t"net/http"`,
    p.body ? `\t"strings"` : '',
    `)`,
    ``,
    `func main() {`,
  ]

  if (p.body) {
    lines.push(`\tbody := strings.NewReader(\`${p.body.replace(/`/g, '` + "`" + `')}\`)`)
    lines.push(`\treq, err := http.NewRequest("${p.method}", "${p.url}", body)`)
  } else {
    lines.push(`\treq, err := http.NewRequest("${p.method}", "${p.url}", nil)`)
  }

  lines.push(`\tif err != nil { panic(err) }`)

  for (const [k, v] of Object.entries(p.headers)) {
    lines.push(`\treq.Header.Set("${escStr(k)}", "${escStr(v)}")`)
  }

  lines.push(``)
  lines.push(`\tclient := &http.Client{}`)
  lines.push(`\tresp, err := client.Do(req)`)
  lines.push(`\tif err != nil { panic(err) }`)
  lines.push(`\tdefer resp.Body.Close()`)
  lines.push(``)
  lines.push(`\trespBody, _ := io.ReadAll(resp.Body)`)
  lines.push(`\tfmt.Println(resp.Status)`)
  lines.push(`\tfmt.Println(string(respBody))`)
  lines.push(`}`)

  return lines.filter((l) => l !== '').join('\n')
}

function toPhp(p: ParsedCurl): string {
  const headerLines = Object.entries(p.headers)
    .map(([k, v]) => `    '${escStr(k)}: ${escStr(v)}'`)
  const optLines: string[] = [
    `    CURLOPT_URL => '${escStr(p.url)}',`,
    `    CURLOPT_RETURNTRANSFER => true,`,
    `    CURLOPT_CUSTOMREQUEST => '${p.method}',`,
  ]
  if (headerLines.length) {
    optLines.push(`    CURLOPT_HTTPHEADER => [\n${headerLines.join(',\n')}\n    ],`)
  }
  if (p.body) {
    optLines.push(`    CURLOPT_POSTFIELDS => '${escStr(p.body)}',`)
  } else if (Object.keys(p.formFields).length) {
    const fd = Object.entries(p.formFields).map(([k, v]) => `'${escStr(k)}' => '${escStr(v)}'`).join(', ')
    optLines.push(`    CURLOPT_POSTFIELDS => [${fd}],`)
  }

  return `<?php\n\n$curl = curl_init();\n\ncurl_setopt_array($curl, [\n${optLines.join('\n')}\n]);\n\n$response = curl_exec($curl);\n$error = curl_error($curl);\ncurl_close($curl);\n\nif ($error) {\n    echo 'Error: ' . $error;\n} else {\n    echo $response;\n}\n?>`
}

// ---------------------------------------------------------------------------
// Language tab definitions
// ---------------------------------------------------------------------------

type LangKey = 'fetch' | 'axios' | 'python' | 'go' | 'php'

const LANGS: { key: LangKey; label: string; language: string }[] = [
  { key: 'fetch', label: 'JS fetch', language: 'javascript' },
  { key: 'axios', label: 'Axios', language: 'javascript' },
  { key: 'python', label: 'Python', language: 'python' },
  { key: 'go', label: 'Go', language: 'go' },
  { key: 'php', label: 'PHP', language: 'php' },
]

const EXAMPLE_CURL = `curl -X POST https://api.example.com/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"name":"Alice","email":"alice@example.com"}'`

function generateCode(parsed: ParsedCurl, lang: LangKey): string {
  switch (lang) {
    case 'fetch': return toJsFetch(parsed)
    case 'axios': return toAxios(parsed)
    case 'python': return toPythonRequests(parsed)
    case 'go': return toGo(parsed)
    case 'php': return toPhp(parsed)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurlToCode({ onOutput, initialState }: ToolProps) {
  const [curlInput, setCurlInput] = useState((initialState?.curlInput as string) ?? '')
  const [activeLang, setActiveLang] = useState<LangKey>((initialState?.activeLang as LangKey) ?? 'fetch')
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedCurl | null>(null)

  const handleConvert = () => {
    const trimmed = curlInput.trim()
    if (!trimmed) {
      setError('Paste a curl command above to get started.')
      setParsed(null)
      return
    }
    const result = parseCurl(trimmed)
    if ('error' in result) {
      setError(result.error)
      setParsed(null)
      return
    }
    setError(null)
    setParsed(result)
    const code = generateCode(result, activeLang)
    onOutput({ curlInput: trimmed, language: activeLang }, { code })
  }

  const handleLangChange = (lang: LangKey) => {
    setActiveLang(lang)
    if (parsed) {
      const code = generateCode(parsed, lang)
      onOutput({ curlInput, language: lang }, { code })
    }
  }

  const outputCode = parsed ? generateCode(parsed, activeLang) : ''

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">curl command</label>
          <Button size="sm" onClick={handleConvert}>Convert</Button>
        </div>
        <textarea
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={EXAMPLE_CURL}
          className="w-full resize-y rounded-md border border-border bg-muted/30 p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/40"
        />
        {error && <ErrorAlert message={error} />}
      </div>

      {/* Language tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {LANGS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleLangChange(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeLang === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Output */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {LANGS.find((l) => l.key === activeLang)?.language ?? ''}
          </span>
          <CopyButton value={outputCode} />
        </div>
        <CodeEditor
          value={outputCode}
          onChange={() => {}}
          readOnly
          language={LANGS.find((l) => l.key === activeLang)?.language}
          rows={18}
          placeholder="Converted code will appear here after you click Convert…"
        />
      </div>
    </div>
  )
}
