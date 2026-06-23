# gawe-app Phase 2: Encoding & Formatting Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 8 Encoding & Formatting tools plus the shared tool component library, replacing ToolPlaceholder stubs with fully working components.

**Architecture:** Each tool is a default-exported React component at `src/components/tools/encoding/[ComponentName].tsx` implementing `ToolProps`. The dynamic tool loader in `/tools/[category]/[tool]/page.tsx` is updated to lazy-import tool components via a static map. Shared UI primitives live in `src/components/tools/shared/`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4, shadcn/ui, js-yaml, smol-toml, papaparse, fast-xml-parser, prettier (browser), sql-formatter, change-case, slugify

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- pnpm only
- All tool components: `'use client'` at top, `export default function ToolName({ onOutput, initialState }: ToolProps)`
- `ToolProps` from `@/types`: `{ onOutput: (inputs, outputs) => void; initialState?: Record<string, unknown> }`
- Call `onOutput` every time the tool produces a result : shell saves history automatically
- Load `initialState` on mount to restore last session inputs
- No tool manages its own persistence : shell handles it
- `next/dynamic` with `ssr: false` for all tool components in the loader
- All imports use `@/` alias
- All git commits end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use `rtk git` prefix for all git commands
- Tailwind v4: use complete literal class strings (no dynamic string assembly like `bg-${color}-500`)

---

## File Map

```
[CREATE] src/components/tools/shared/ToolPanel.tsx
[CREATE] src/components/tools/shared/CopyButton.tsx
[CREATE] src/components/tools/shared/FileDropzone.tsx
[CREATE] src/components/tools/shared/CodeEditor.tsx
[CREATE] src/components/tools/shared/ErrorAlert.tsx
[MODIFY] src/app/tools/[category]/[tool]/page.tsx   : replace ToolPlaceholder with dynamic loader
[CREATE] src/components/tools/encoding/JsonFormatter.tsx
[CREATE] src/components/tools/encoding/DataConverter.tsx
[CREATE] src/components/tools/encoding/Base64.tsx
[CREATE] src/components/tools/encoding/UrlHtmlEncode.tsx
[CREATE] src/components/tools/encoding/CodeBeautifier.tsx
[CREATE] src/components/tools/encoding/CaseConverter.tsx
[CREATE] src/components/tools/encoding/LineTools.tsx
[CREATE] src/components/tools/encoding/StringTools.tsx
```

---

## Task 1: Install Phase 2 Dependencies

**Files:**
- Modify: `package.json` (via pnpm add)

**Interfaces:**
- Produces: all encoding tool libraries available for import

- [ ] **Step 1: Install runtime dependencies**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add js-yaml smol-toml papaparse fast-xml-parser sql-formatter change-case slugify
```

- [ ] **Step 2: Install type definitions**

```bash
pnpm add -D @types/js-yaml @types/papaparse
```

- [ ] **Step 3: Install prettier for browser-side formatting**

```bash
pnpm add prettier prettier/standalone prettier/plugins/babel prettier/plugins/postcss prettier/plugins/html prettier/plugins/estree
```

Note: prettier v3 ships browser-compatible standalone builds. Import as:
```ts
import * as prettier from 'prettier/standalone'
import * as parserBabel from 'prettier/plugins/babel'
import * as parserHtml from 'prettier/plugins/html'
import * as parserPostcss from 'prettier/plugins/postcss'
import * as parserEstree from 'prettier/plugins/estree'
```

- [ ] **Step 4: Verify TypeScript**

```bash
pnpm exec tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
rtk git add package.json pnpm-lock.yaml
rtk git commit -m "chore(phase2): install encoding tool dependencies

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Shared Tool Components

**Files:**
- Create: `src/components/tools/shared/ToolPanel.tsx`
- Create: `src/components/tools/shared/CopyButton.tsx`
- Create: `src/components/tools/shared/FileDropzone.tsx`
- Create: `src/components/tools/shared/CodeEditor.tsx`
- Create: `src/components/tools/shared/ErrorAlert.tsx`

**Interfaces:**
- Produces:
  - `<ToolPanel left={ReactNode} right={ReactNode} />` : two-column split layout
  - `<CopyButton value={string} />` : copy to clipboard with checkmark feedback
  - `<FileDropzone accept={string} onFile={(file: File) => void} label={string} />` : drag-drop file input
  - `<CodeEditor value={string} onChange={(v: string) => void} language?: string rows?: number />` : monospace textarea
  - `<ErrorAlert message={string} />` : red error display

- [ ] **Step 1: Create ToolPanel**

Create `src/components/tools/shared/ToolPanel.tsx`:

```tsx
import { cn } from '@/lib/utils'

interface ToolPanelProps {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}

export function ToolPanel({ left, right, className }: ToolPanelProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-2', className)}>
      <div className="flex flex-col gap-2">{left}</div>
      <div className="flex flex-col gap-2">{right}</div>
    </div>
  )
}
```

- [ ] **Step 2: Create CopyButton**

Create `src/components/tools/shared/CopyButton.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className={className}
      disabled={!value}
    >
      {copied ? (
        <><Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />Copied</>
      ) : (
        <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy</>
      )}
    </Button>
  )
}
```

- [ ] **Step 3: Create FileDropzone**

Create `src/components/tools/shared/FileDropzone.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  accept: string
  onFile: (file: File) => void
  label?: string
}

export function FileDropzone({ accept, onFile, label = 'Drop file here or click to upload' }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
    >
      <Upload className="h-6 w-6" />
      <span>{label}</span>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
    </div>
  )
}
```

- [ ] **Step 4: Create CodeEditor**

Create `src/components/tools/shared/CodeEditor.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
  rows?: number
  placeholder?: string
  readOnly?: boolean
  className?: string
}

export function CodeEditor({
  value,
  onChange,
  language,
  rows = 12,
  placeholder,
  readOnly = false,
  className,
}: CodeEditorProps) {
  return (
    <div className="relative flex flex-col">
      {language && (
        <span className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">{language}</span>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
        className={cn(
          'w-full resize-y rounded-md border border-border bg-muted/30 p-3 font-mono text-sm leading-relaxed',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
          'placeholder:text-muted-foreground/50',
          readOnly && 'cursor-default select-all',
          className
        )}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create ErrorAlert**

Create `src/components/tools/shared/ErrorAlert.tsx`:

```tsx
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorAlertProps {
  message: string
  className?: string
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500',
      className
    )}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="font-mono text-xs leading-relaxed">{message}</span>
    </div>
  )
}
```

- [ ] **Step 6: TypeScript check**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm exec tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
rtk git add src/components/tools/shared/
rtk git commit -m "feat: shared tool components (ToolPanel, CopyButton, FileDropzone, CodeEditor, ErrorAlert)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Dynamic Tool Loader

**Files:**
- Modify: `src/app/tools/[category]/[tool]/page.tsx`

**Interfaces:**
- Consumes: `ToolProps` from `@/types`, `next/dynamic`
- Produces: page that lazy-loads real tool components (or falls back to ToolPlaceholder for unimplemented tools)

- [ ] **Step 1: Update the tool page**

Replace the entire content of `src/app/tools/[category]/[tool]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'
import type { ToolProps, CategoryId } from '@/types'

type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>

const toolMap: Partial<Record<CategoryId, Record<string, ToolLoader>>> = {
  encoding: {
    'json-formatter': () => import('@/components/tools/encoding/JsonFormatter'),
    'json-converter': () => import('@/components/tools/encoding/DataConverter'),
    'base64': () => import('@/components/tools/encoding/Base64'),
    'url-html-encode': () => import('@/components/tools/encoding/UrlHtmlEncode'),
    'code-beautifier': () => import('@/components/tools/encoding/CodeBeautifier'),
    'case-converter': () => import('@/components/tools/encoding/CaseConverter'),
    'line-tools': () => import('@/components/tools/encoding/LineTools'),
    'string-tools': () => import('@/components/tools/encoding/StringTools'),
  },
}

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category)

  if (!toolDef || !categoryDef) notFound()

  const loader = toolMap[category as CategoryId]?.[tool]

  if (!loader) {
    return (
      <div className="flex flex-col h-full">
        <ToolHeader tool={toolDef} category={categoryDef} />
        <div className="flex-1 overflow-auto p-6">
          <ToolPlaceholder tool={toolDef} category={categoryDef} />
        </div>
      </div>
    )
  }

  const ToolComponent = dynamic(loader, { ssr: false })

  return (
    <ToolPageClient
      tool={toolDef}
      category={categoryDef}
      ToolComponent={ToolComponent}
    />
  )
}
```

Wait : `dynamic` cannot be called inside an async server component that also uses `notFound`. Split into a client wrapper:

Replace `src/app/tools/[category]/[tool]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'
import type { ToolProps, CategoryId } from '@/types'

type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>

const toolMap: Partial<Record<CategoryId, Record<string, ToolLoader>>> = {
  encoding: {
    'json-formatter': () => import('@/components/tools/encoding/JsonFormatter'),
    'json-converter': () => import('@/components/tools/encoding/DataConverter'),
    'base64': () => import('@/components/tools/encoding/Base64'),
    'url-html-encode': () => import('@/components/tools/encoding/UrlHtmlEncode'),
    'code-beautifier': () => import('@/components/tools/encoding/CodeBeautifier'),
    'case-converter': () => import('@/components/tools/encoding/CaseConverter'),
    'line-tools': () => import('@/components/tools/encoding/LineTools'),
    'string-tools': () => import('@/components/tools/encoding/StringTools'),
  },
}

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category)

  if (!toolDef || !categoryDef) notFound()

  const loader = toolMap[category as CategoryId]?.[tool]

  const ToolComponent = loader
    ? dynamic(loader, {
        ssr: false,
        loading: () => (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading tool…
          </div>
        ),
      })
    : null

  return (
    <div className="flex flex-col h-full">
      <ToolHeader tool={toolDef} category={categoryDef} />
      <div className="flex-1 overflow-auto p-6">
        {ToolComponent ? (
          <ToolComponent
            onOutput={() => {}}
            initialState={undefined}
          />
        ) : (
          <ToolPlaceholder tool={toolDef} category={categoryDef} />
        )}
      </div>
    </div>
  )
}
```

Note: `onOutput` and `initialState` are passed as stubs here. The persistence integration (connecting `onOutput` to the history hook and `initialState` from localStorage) requires a client component wrapper : see Step 2.

- [ ] **Step 2: Create ToolPageClient wrapper for persistence**

Create `src/app/tools/[category]/[tool]/ToolPageClient.tsx`:

```tsx
'use client'

import { useEffect, type ComponentType } from 'react'
import type { ToolProps } from '@/types'
import type { ToolDefinition, CategoryDefinition } from '@/types'
import { useHistory } from '@/hooks/useHistory'
import { useToolState } from '@/hooks/useToolState'
import { usePreferences } from '@/hooks/usePreferences'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'

interface ToolPageClientProps {
  tool: ToolDefinition
  category: CategoryDefinition
  ToolComponent: ComponentType<ToolProps> | null
}

export function ToolPageClient({ tool, category, ToolComponent }: ToolPageClientProps) {
  const { add: addHistory } = useHistory(tool.id)
  const { state: toolState, update: updateToolState } = useToolState(tool.id)
  const { addRecent } = usePreferences()

  useEffect(() => {
    addRecent(tool.id)
  }, [tool.id, addRecent])

  const handleOutput = (
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    addHistory(inputs, outputs)
    updateToolState(inputs)
  }

  return (
    <div className="flex flex-col h-full">
      <ToolHeader tool={tool} category={category} />
      <div className="flex-1 overflow-auto p-6">
        {ToolComponent ? (
          <ToolComponent
            onOutput={handleOutput}
            initialState={Object.keys(toolState).length > 0 ? toolState : undefined}
          />
        ) : (
          <ToolPlaceholder tool={tool} category={category} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Update page.tsx to use ToolPageClient**

Replace `src/app/tools/[category]/[tool]/page.tsx` with the final version:

```tsx
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolPageClient } from './ToolPageClient'
import type { ToolProps, CategoryId } from '@/types'

type ToolLoader = () => Promise<{ default: ComponentType<ToolProps> }>

const toolMap: Partial<Record<CategoryId, Record<string, ToolLoader>>> = {
  encoding: {
    'json-formatter': () => import('@/components/tools/encoding/JsonFormatter'),
    'json-converter': () => import('@/components/tools/encoding/DataConverter'),
    'base64': () => import('@/components/tools/encoding/Base64'),
    'url-html-encode': () => import('@/components/tools/encoding/UrlHtmlEncode'),
    'code-beautifier': () => import('@/components/tools/encoding/CodeBeautifier'),
    'case-converter': () => import('@/components/tools/encoding/CaseConverter'),
    'line-tools': () => import('@/components/tools/encoding/LineTools'),
    'string-tools': () => import('@/components/tools/encoding/StringTools'),
  },
}

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category)

  if (!toolDef || !categoryDef) notFound()

  const loader = toolMap[category as CategoryId]?.[tool]

  const ToolComponent = loader
    ? dynamic(loader, {
        ssr: false,
        loading: () => (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading tool…
          </div>
        ),
      })
    : null

  return (
    <ToolPageClient
      tool={toolDef}
      category={categoryDef}
      ToolComponent={ToolComponent}
    />
  )
}
```

- [ ] **Step 4: TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
rtk git add src/app/tools/
rtk git commit -m "feat: dynamic tool loader with persistence integration

Routes lazy-load tool components via next/dynamic (ssr:false).
ToolPageClient wires onOutput→history and initialState from localStorage.
Unimplemented tools fall back to ToolPlaceholder.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: JSON Formatter

**Files:**
- Create: `src/components/tools/encoding/JsonFormatter.tsx`

**Interfaces:**
- Consumes: `ToolProps`, `CodeEditor`, `CopyButton`, `ErrorAlert`, `ToolPanel` from shared
- `onOutput({ input }, { formatted, isValid, error })`

- [ ] **Step 1: Create JsonFormatter**

Create `src/components/tools/encoding/JsonFormatter.tsx`:

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type IndentSize = 2 | 4

export default function JsonFormatter({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [indent, setIndent] = useState<IndentSize>(2)

  const format = () => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      const formatted = JSON.stringify(parsed, null, indent)
      setOutput(formatted)
      setError('')
      onOutput({ input, indent }, { formatted, isValid: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON'
      setError(msg)
      setOutput('')
      onOutput({ input, indent }, { isValid: false, error: msg })
    }
  }

  const minify = () => {
    if (!input.trim()) return
    try {
      const parsed = JSON.parse(input)
      const minified = JSON.stringify(parsed)
      setOutput(minified)
      setError('')
      onOutput({ input }, { formatted: minified, isValid: true, minified: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON'
      setError(msg)
    }
  }

  useEffect(() => {
    if (input) format()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Tabs value={String(indent)} onValueChange={(v) => setIndent(Number(v) as IndentSize)}>
          <TabsList>
            <TabsTrigger value="2">2 spaces</TabsTrigger>
            <TabsTrigger value="4">4 spaces</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={format}>Format</Button>
        <Button size="sm" variant="outline" onClick={minify}>Minify</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={
          <CodeEditor
            value={input}
            onChange={setInput}
            language="JSON input"
            placeholder='{"key": "value"}'
            rows={16}
          />
        }
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor
              value={output}
              onChange={() => {}}
              readOnly
              rows={16}
              placeholder="Formatted JSON appears here…"
            />
          </div>
        }
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

```bash
pnpm run dev
```

Navigate to `http://localhost:3000/tools/encoding/json-formatter`. Paste `{"a":1,"b":[1,2,3]}` and click Format. Should show formatted JSON. Paste invalid JSON : should show red error. Copy button copies output.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/JsonFormatter.tsx
rtk git commit -m "feat(encoding): JSON formatter with format/minify and validation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Data Converter (JSON ↔ YAML ↔ TOML ↔ CSV ↔ XML)

**Files:**
- Create: `src/components/tools/encoding/DataConverter.tsx`

**Interfaces:**
- `onOutput({ input, fromFormat, toFormat }, { output })`

- [ ] **Step 1: Create DataConverter**

Create `src/components/tools/encoding/DataConverter.tsx`:

```tsx
'use client'

import { useState } from 'react'
import * as yaml from 'js-yaml'
import * as toml from 'smol-toml'
import Papa from 'papaparse'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type Format = 'json' | 'yaml' | 'toml' | 'csv' | 'xml'
const FORMATS: Format[] = ['json', 'yaml', 'toml', 'csv', 'xml']

function parseInput(input: string, format: Format): unknown {
  switch (format) {
    case 'json': return JSON.parse(input)
    case 'yaml': return yaml.load(input)
    case 'toml': return toml.parse(input)
    case 'csv': {
      const result = Papa.parse(input, { header: true, skipEmptyLines: true })
      return result.data
    }
    case 'xml': {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      return parser.parse(input)
    }
  }
}

function serializeOutput(data: unknown, format: Format): string {
  switch (format) {
    case 'json': return JSON.stringify(data, null, 2)
    case 'yaml': return yaml.dump(data)
    case 'toml': {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('TOML requires an object at the root level')
      }
      return toml.stringify(data as Record<string, unknown>)
    }
    case 'csv': {
      const rows = Array.isArray(data) ? data : [data]
      return Papa.unparse(rows as object[])
    }
    case 'xml': {
      const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true })
      return builder.build(data)
    }
  }
}

export default function DataConverter({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [from, setFrom] = useState<Format>((initialState?.from as Format) ?? 'json')
  const [to, setTo] = useState<Format>((initialState?.to as Format) ?? 'yaml')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const convert = () => {
    if (!input.trim()) return
    try {
      const parsed = parseInput(input, from)
      const result = serializeOutput(parsed, to)
      setOutput(result)
      setError('')
      onOutput({ input, fromFormat: from, toFormat: to }, { output: result })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Conversion failed'
      setError(msg)
      setOutput('')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From</span>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFrom(f)}
                className={`rounded px-2 py-1 text-xs font-mono uppercase transition-colors ${
                  from === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To</span>
          <div className="flex gap-1">
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setTo(f)}
                className={`rounded px-2 py-1 text-xs font-mono uppercase transition-colors ${
                  to === f
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={convert}>Convert</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={<CodeEditor value={input} onChange={setInput} language={from} rows={16} placeholder={`Paste ${from.toUpperCase()} here…`} />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{to} output</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={16} placeholder="Output appears here…" />
          </div>
        }
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/json-converter`. Paste JSON, select YAML as target, click Convert. Should output YAML.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/DataConverter.tsx
rtk git commit -m "feat(encoding): data converter JSON/YAML/TOML/CSV/XML

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Base64 Encoder/Decoder

**Files:**
- Create: `src/components/tools/encoding/Base64.tsx`

**Interfaces:**
- `onOutput({ input, mode }, { output })`

- [ ] **Step 1: Create Base64**

Create `src/components/tools/encoding/Base64.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type Mode = 'text' | 'file'

export default function Base64({ onOutput, initialState }: ToolProps) {
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'text')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const encode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(input)))
      setOutput(encoded)
      setError('')
      onOutput({ input, mode: 'encode' }, { output: encoded })
    } catch {
      setError('Encoding failed : input may contain unsupported characters')
    }
  }

  const decode = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(input.trim())))
      setOutput(decoded)
      setError('')
      onOutput({ input, mode: 'decode' }, { output: decoded })
    } catch {
      setError('Invalid Base64 string')
    }
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setOutput(base64)
      setError('')
      onOutput({ fileName: file.name, fileType: file.type }, { output: base64, dataUrl })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="file">File / Image</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'text' ? (
        <>
          <div className="flex gap-2">
            <Button size="sm" onClick={encode}>Encode →</Button>
            <Button size="sm" variant="outline" onClick={decode}>← Decode</Button>
          </div>
          {error && <ErrorAlert message={error} />}
          <ToolPanel
            left={<CodeEditor value={input} onChange={setInput} language="Input" rows={12} placeholder="Enter text to encode or Base64 to decode…" />}
            right={
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
                  <CopyButton value={output} />
                </div>
                <CodeEditor value={output} onChange={() => {}} readOnly rows={12} />
              </div>
            }
          />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <FileDropzone accept="*/*" onFile={handleFile} label="Drop any file or image to convert to Base64" />
          {fileName && <p className="text-xs text-muted-foreground">File: {fileName}</p>}
          {error && <ErrorAlert message={error} />}
          {output && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Base64 output</span>
                <CopyButton value={output} />
              </div>
              <CodeEditor value={output} onChange={() => {}} readOnly rows={10} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/base64`. Type "Hello World", click Encode → should show `SGVsbG8gV29ybGQ=`. Switch to decode, paste `SGVsbG8gV29ybGQ=`, click Decode → should show `Hello World`. File tab: drop an image → should show Base64 string.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/Base64.tsx
rtk git commit -m "feat(encoding): Base64 encode/decode for text and files

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: URL & HTML Encode

**Files:**
- Create: `src/components/tools/encoding/UrlHtmlEncode.tsx`

**Interfaces:**
- `onOutput({ input, mode, type }, { output })`

- [ ] **Step 1: Create UrlHtmlEncode**

Create `src/components/tools/encoding/UrlHtmlEncode.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type EncodeType = 'url' | 'html'

const HTML_ENTITIES: [string, string][] = [
  ['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&#39;'],
]

function encodeHtml(str: string): string {
  return HTML_ENTITIES.reduce((s, [char, entity]) => s.replaceAll(char, entity), str)
}

function decodeHtml(str: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

export default function UrlHtmlEncode({ onOutput, initialState }: ToolProps) {
  const [type, setType] = useState<EncodeType>((initialState?.type as EncodeType) ?? 'url')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const encode = () => {
    if (!input) return
    try {
      const result = type === 'url' ? encodeURIComponent(input) : encodeHtml(input)
      setOutput(result)
      setError('')
      onOutput({ input, type, mode: 'encode' }, { output: result })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Encoding failed')
    }
  }

  const decode = () => {
    if (!input) return
    try {
      const result = type === 'url' ? decodeURIComponent(input) : decodeHtml(input)
      setOutput(result)
      setError('')
      onOutput({ input, type, mode: 'decode' }, { output: result })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Decoding failed : invalid input')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={type} onValueChange={(v) => setType(v as EncodeType)}>
          <TabsList>
            <TabsTrigger value="url">URL encode</TabsTrigger>
            <TabsTrigger value="html">HTML entities</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={encode}>Encode →</Button>
        <Button size="sm" variant="outline" onClick={decode}>← Decode</Button>
      </div>
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={<CodeEditor value={input} onChange={setInput} language="Input" rows={12} placeholder={type === 'url' ? 'https://example.com/search?q=hello world' : '<p>Hello & "world"</p>'} />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={12} />
          </div>
        }
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/url-html-encode`. Enter `hello world & more`, click Encode (URL) → `hello%20world%20%26%20more`. Switch to HTML entities, enter `<b>bold</b>` → `&lt;b&gt;bold&lt;/b&gt;`.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/UrlHtmlEncode.tsx
rtk git commit -m "feat(encoding): URL and HTML entity encode/decode

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Code Beautifier

**Files:**
- Create: `src/components/tools/encoding/CodeBeautifier.tsx`

**Interfaces:**
- `onOutput({ input, language, mode }, { output })`

- [ ] **Step 1: Create CodeBeautifier**

Create `src/components/tools/encoding/CodeBeautifier.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/code-beautifier`. Paste `const x={a:1,b:2}` (JS), click Beautify → formats with newlines. Paste `SELECT * FROM users WHERE id=1` (SQL), click Beautify → formats with uppercase keywords and line breaks.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/CodeBeautifier.tsx
rtk git commit -m "feat(encoding): code beautifier/minifier for JS/CSS/HTML/SQL

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Case Converter

**Files:**
- Create: `src/components/tools/encoding/CaseConverter.tsx`

**Interfaces:**
- `onOutput({ input }, { cases: Record<string, string> })`

- [ ] **Step 1: Create CaseConverter**

Create `src/components/tools/encoding/CaseConverter.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  camelCase, snakeCase, kebabCase, pascalCase,
  constantCase, dotCase, pathCase, sentenceCase, titleCase,
} from 'change-case'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'

interface CaseResult {
  label: string
  key: string
  value: string
}

function convertAll(input: string): CaseResult[] {
  return [
    { label: 'camelCase', key: 'camel', value: camelCase(input) },
    { label: 'PascalCase', key: 'pascal', value: pascalCase(input) },
    { label: 'snake_case', key: 'snake', value: snakeCase(input) },
    { label: 'CONSTANT_CASE', key: 'constant', value: constantCase(input) },
    { label: 'kebab-case', key: 'kebab', value: kebabCase(input) },
    { label: 'dot.case', key: 'dot', value: dotCase(input) },
    { label: 'path/case', key: 'path', value: pathCase(input) },
    { label: 'Sentence case', key: 'sentence', value: sentenceCase(input) },
    { label: 'Title Case', key: 'title', value: titleCase(input) },
    { label: 'UPPER CASE', key: 'upper', value: input.toUpperCase() },
    { label: 'lower case', key: 'lower', value: input.toLowerCase() },
  ]
}

export default function CaseConverter({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')

  const results = input ? convertAll(input) : []

  const handleChange = (value: string) => {
    setInput(value)
    if (value) {
      const cases = convertAll(value)
      onOutput({ input: value }, { cases: Object.fromEntries(cases.map((c) => [c.key, c.value])) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Type or paste text to convert…"
        rows={3}
        className="font-mono text-sm"
      />
      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map((r) => (
            <div key={r.key} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="font-mono text-sm truncate">{r.value}</p>
              </div>
              <CopyButton value={r.value} className="ml-2 h-7 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/case-converter`. Type "hello world foo bar" → all variants appear instantly: `helloWorldFooBar`, `HelloWorldFooBar`, `hello_world_foo_bar`, etc. Copy button on each row works.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/CaseConverter.tsx
rtk git commit -m "feat(encoding): case converter with 11 simultaneous variants

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Line Tools

**Files:**
- Create: `src/components/tools/encoding/LineTools.tsx`

**Interfaces:**
- `onOutput({ input, operation }, { output, lineCount })`

- [ ] **Step 1: Create LineTools**

Create `src/components/tools/encoding/LineTools.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'

type Operation = 'sort-asc' | 'sort-desc' | 'dedupe' | 'reverse' | 'trim' | 'remove-empty' | 'shuffle'

const OPERATIONS: { key: Operation; label: string }[] = [
  { key: 'sort-asc', label: 'Sort A→Z' },
  { key: 'sort-desc', label: 'Sort Z→A' },
  { key: 'dedupe', label: 'Deduplicate' },
  { key: 'reverse', label: 'Reverse' },
  { key: 'trim', label: 'Trim whitespace' },
  { key: 'remove-empty', label: 'Remove empty' },
  { key: 'shuffle', label: 'Shuffle' },
]

function applyOperation(lines: string[], op: Operation): string[] {
  switch (op) {
    case 'sort-asc': return [...lines].sort((a, b) => a.localeCompare(b))
    case 'sort-desc': return [...lines].sort((a, b) => b.localeCompare(a))
    case 'dedupe': return [...new Set(lines)]
    case 'reverse': return [...lines].reverse()
    case 'trim': return lines.map((l) => l.trim())
    case 'remove-empty': return lines.filter((l) => l.trim() !== '')
    case 'shuffle': {
      const arr = [...lines]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    }
  }
}

export default function LineTools({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')

  const apply = (op: Operation) => {
    const lines = input.split('\n')
    const result = applyOperation(lines, op)
    const resultStr = result.join('\n')
    setOutput(resultStr)
    onOutput({ input, operation: op }, { output: resultStr, lineCount: result.length })
  }

  const inputLines = input ? input.split('\n').length : 0
  const outputLines = output ? output.split('\n').length : 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {OPERATIONS.map((op) => (
          <Button key={op.key} size="sm" variant="outline" onClick={() => apply(op.key)}>
            {op.label}
          </Button>
        ))}
      </div>
      <ToolPanel
        left={
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Input</span>
              <span>{inputLines} lines</span>
            </div>
            <CodeEditor value={input} onChange={setInput} rows={16} placeholder={'line 1\nline 2\nline 3'} />
          </div>
        }
        right={
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{outputLines} lines</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={16} placeholder="Result appears here…" />
          </div>
        }
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/line-tools`. Paste several lines with duplicates, click Deduplicate → duplicates removed. Click Sort A→Z → sorted. Click Shuffle → random order.

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/encoding/LineTools.tsx
rtk git commit -m "feat(encoding): line tools : sort/dedupe/reverse/trim/shuffle

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: String Tools

**Files:**
- Create: `src/components/tools/encoding/StringTools.tsx`

**Interfaces:**
- `onOutput({ input, operation }, { output })`

- [ ] **Step 1: Create StringTools**

Create `src/components/tools/encoding/StringTools.tsx`:

```tsx
'use client'

import { useState } from 'react'
import slugifyFn from 'slugify'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'

type Operation =
  | 'slugify'
  | 'json-escape'
  | 'json-unescape'
  | 'regex-escape'
  | 'html-escape'
  | 'html-unescape'
  | 'count-chars'

const OPERATIONS: { key: Operation; label: string }[] = [
  { key: 'slugify', label: 'Slugify' },
  { key: 'json-escape', label: 'JSON escape' },
  { key: 'json-unescape', label: 'JSON unescape' },
  { key: 'regex-escape', label: 'Regex escape' },
  { key: 'html-escape', label: 'HTML escape' },
  { key: 'html-unescape', label: 'HTML unescape' },
  { key: 'count-chars', label: 'Count chars' },
]

function applyOperation(input: string, op: Operation): string {
  switch (op) {
    case 'slugify':
      return slugifyFn(input, { lower: true, strict: true })
    case 'json-escape':
      return JSON.stringify(input).slice(1, -1)
    case 'json-unescape':
      try { return JSON.parse(`"${input}"`) } catch { return input }
    case 'regex-escape':
      return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    case 'html-escape': {
      const entities: [string, string][] = [['&','&amp;'],['<','&lt;'],['>','&gt;'],['"','&quot;'],["'",'&#39;']]
      return entities.reduce((s, [c, e]) => s.replaceAll(c, e), input)
    }
    case 'html-unescape': {
      const el = document.createElement('textarea')
      el.innerHTML = input
      return el.value
    }
    case 'count-chars':
      return `Characters: ${input.length}\nWords: ${input.trim().split(/\s+/).filter(Boolean).length}\nLines: ${input.split('\n').length}`
  }
}

export default function StringTools({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')

  const apply = (op: Operation) => {
    if (!input) return
    const result = applyOperation(input, op)
    setOutput(result)
    onOutput({ input, operation: op }, { output: result })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {OPERATIONS.map((op) => (
          <Button key={op.key} size="sm" variant="outline" onClick={() => apply(op.key)}>
            {op.label}
          </Button>
        ))}
      </div>
      <ToolPanel
        left={<CodeEditor value={input} onChange={setInput} language="Input" rows={14} placeholder="Enter string to transform…" />}
        right={
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
              <CopyButton value={output} />
            </div>
            <CodeEditor value={output} onChange={() => {}} readOnly rows={14} />
          </div>
        }
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:3000/tools/encoding/string-tools`. Enter "Hello World & More!", click Slugify → `hello-world-more`. Enter `She said "hello"`, click JSON escape → `She said \"hello\"`. Click Regex escape on `a.b*c` → `a\.b\*c`.

- [ ] **Step 3: Final TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/tools/encoding/StringTools.tsx
rtk git commit -m "feat(encoding): string tools : slugify, JSON/regex/HTML escape

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ All 8 encoding tools implemented
- ✅ Shared components (ToolPanel, CopyButton, FileDropzone, CodeEditor, ErrorAlert)
- ✅ Dynamic tool loader with ToolPageClient (persistence wired: onOutput→history, initialState from localStorage, addRecent on mount)
- ✅ `next/dynamic` with `ssr: false`
- ✅ All tools call `onOutput` on result

**Placeholder scan:** All tasks have complete code. No TBDs.

**Type consistency:**
- `ToolProps` used consistently across all components
- `onOutput` called with `(inputs, outputs)` in all tools
- `initialState?.input as string` pattern consistent across all tools that restore text input
