'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type InputMode = 'csv' | 'json'
type OutputTab = 'typescript' | 'zod' | 'jsonschema'

interface FieldDef {
  name: string
  type: 'string' | 'number' | 'boolean' | 'string | null' | 'object' | 'unknown'
  nested?: FieldDef[]
}

function inferType(value: unknown): FieldDef['type'] {
  if (value === null || value === undefined || value === '') return 'string | null'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'object' && !Array.isArray(value)) return 'object'
  if (typeof value === 'string') {
    if (value === 'true' || value === 'false') return 'boolean'
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number'
    return 'string'
  }
  return 'unknown'
}

function buildFields(obj: Record<string, unknown>): FieldDef[] {
  return Object.entries(obj).map(([name, value]) => {
    const type = inferType(value)
    if (type === 'object' && value !== null && typeof value === 'object') {
      return { name, type, nested: buildFields(value as Record<string, unknown>) }
    }
    return { name, type }
  })
}

function safeKey(name: string): string {
  // Quote keys that aren't valid JS identifiers
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : JSON.stringify(name)
}

function generateTsInterface(fields: FieldDef[], name: string, indent = 0): string {
  const pad = '  '.repeat(indent)
  const inner = fields
    .map((f) => {
      if (f.type === 'object' && f.nested) {
        const nestedName = name + capitalize(f.name)
        const nestedInterface = generateTsInterface(f.nested, nestedName, indent)
        return `${nestedInterface}\n${pad}  ${safeKey(f.name)}: ${nestedName}`
      }
      return `${pad}  ${safeKey(f.name)}: ${f.type}`
    })
    .join('\n')

  // Collect nested interfaces separately
  const nestedInterfaces = fields
    .filter((f) => f.type === 'object' && f.nested)
    .map((f) => generateTsInterface(f.nested!, name + capitalize(f.name), indent))

  const body = fields
    .map((f) => {
      if (f.type === 'object' && f.nested) {
        return `${pad}  ${safeKey(f.name)}: ${name + capitalize(f.name)}`
      }
      return `${pad}  ${safeKey(f.name)}: ${f.type}`
    })
    .join('\n')

  const selfInterface = `${pad}interface ${name} {\n${body}\n${pad}}`

  return nestedInterfaces.length > 0
    ? nestedInterfaces.join('\n\n') + '\n\n' + selfInterface
    : selfInterface
}

function generateZodSchema(fields: FieldDef[], name: string): string {
  const lines: string[] = []

  function buildZodObject(fs: FieldDef[], schemaName: string): string {
    const nestedDefs: string[] = []
    const props = fs
      .map((f) => {
        if (f.type === 'object' && f.nested) {
          const nestedName = schemaName + capitalize(f.name) + 'Schema'
          nestedDefs.push(buildZodObject(f.nested, schemaName + capitalize(f.name)))
          return `  ${safeKey(f.name)}: ${nestedName}`
        }
        const zodType = toZodType(f.type)
        return `  ${safeKey(f.name)}: ${zodType}`
      })
      .join(',\n')

    const def = `const ${schemaName}Schema = z.object({\n${props}\n})`

    if (nestedDefs.length > 0) {
      lines.push(...nestedDefs)
    }
    return def
  }

  const rootDef = buildZodObject(fields, name)
  lines.push(rootDef)
  return "import { z } from 'zod'\n\n" + lines.join('\n\n')
}

function toZodType(type: FieldDef['type']): string {
  switch (type) {
    case 'string': return 'z.string()'
    case 'number': return 'z.number()'
    case 'boolean': return 'z.boolean()'
    case 'string | null': return 'z.string().nullable()'
    default: return 'z.unknown()'
  }
}

function generateJsonSchema(fields: FieldDef[], name: string): string {
  function buildProperties(fs: FieldDef[]): Record<string, unknown> {
    const props: Record<string, unknown> = {}
    for (const f of fs) {
      if (f.type === 'object' && f.nested) {
        props[f.name] = {
          type: 'object',
          properties: buildProperties(f.nested),
          required: f.nested.filter((n) => n.type !== 'string | null').map((n) => n.name),
        }
      } else {
        props[f.name] = toJsonSchemaType(f.type)
      }
    }
    return props
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: name,
    type: 'object',
    properties: buildProperties(fields),
    required: fields.filter((f) => f.type !== 'string | null').map((f) => f.name),
  }

  return JSON.stringify(schema, null, 2)
}

function toJsonSchemaType(type: FieldDef['type']): unknown {
  switch (type) {
    case 'string': return { type: 'string' }
    case 'number': return { type: 'number' }
    case 'boolean': return { type: 'boolean' }
    case 'string | null': return { type: ['string', 'null'] }
    default: return {}
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function SchemaGenerator({ onOutput, initialState }: ToolProps) {
  const [inputMode, setInputMode] = useState<InputMode>((initialState?.inputMode as InputMode) ?? 'json')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [schemaName, setSchemaName] = useState((initialState?.schemaName as string) ?? 'MyType')
  const [outputTab, setOutputTab] = useState<OutputTab>('typescript')
  const [fields, setFields] = useState<FieldDef[] | null>(null)
  const [error, setError] = useState('')

  const [outputs, setOutputs] = useState<{ typescript: string; zod: string; jsonschema: string } | null>(null)

  const generate = () => {
    setError('')
    setFields(null)
    setOutputs(null)

    if (!input.trim()) {
      setError('Input is empty.')
      return
    }

    const name = schemaName.trim() || 'MyType'

    try {
      let parsedFields: FieldDef[]

      if (inputMode === 'csv') {
        const result = Papa.parse<Record<string, string>>(input, { header: true, skipEmptyLines: true })
        if (result.errors.length > 0 && result.data.length === 0) {
          setError(result.errors[0].message)
          return
        }
        if (result.data.length === 0) {
          setError('CSV has no data rows.')
          return
        }
        parsedFields = buildFields(result.data[0] as Record<string, unknown>)
      } else {
        let parsed: unknown
        try {
          parsed = JSON.parse(input)
        } catch (e) {
          setError('Invalid JSON: ' + (e instanceof Error ? e.message : String(e)))
          return
        }
        const obj = Array.isArray(parsed) ? parsed[0] : parsed
        if (typeof obj !== 'object' || obj === null) {
          setError('JSON must be an object or array of objects.')
          return
        }
        parsedFields = buildFields(obj as Record<string, unknown>)
      }

      setFields(parsedFields)

      const typescript = generateTsInterface(parsedFields, name)
      const zod = generateZodSchema(parsedFields, name)
      const jsonschema = generateJsonSchema(parsedFields, name)

      setOutputs({ typescript, zod, jsonschema })
      onOutput(
        { input, inputMode, schemaName: name },
        { typescript, zod, jsonschema, fieldCount: parsedFields.length }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate schema')
    }
  }

  const currentOutput = outputs ? outputs[outputTab] : ''

  const OUTPUT_TABS: { key: OutputTab; label: string }[] = [
    { key: 'typescript', label: 'TypeScript Interface' },
    { key: 'zod', label: 'Zod Schema' },
    { key: 'jsonschema', label: 'JSON Schema' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Input mode tabs */}
        <div className="flex rounded-md border border-border overflow-hidden">
          {(['csv', 'json'] as InputMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setInputMode(mode)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                inputMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Schema name */}
        <input
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          placeholder="Type name (e.g. MyType)"
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <Button size="sm" onClick={generate} disabled={!input.trim()}>
          Generate
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}

      <ToolPanel
        left={
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">
              {inputMode === 'csv' ? 'Paste CSV (first row = headers)' : 'Paste JSON object or array'}
            </div>
            <CodeEditor
              value={input}
              onChange={setInput}
              language={inputMode === 'csv' ? 'csv' : 'json'}
              rows={18}
              placeholder={
                inputMode === 'csv'
                  ? 'name,age,email\nAlice,30,alice@example.com'
                  : '{\n  "name": "Alice",\n  "age": 30,\n  "email": "alice@example.com"\n}'
              }
            />
          </div>
        }
        right={
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              {/* Output tabs */}
              <div className="flex rounded-md border border-border overflow-hidden">
                {OUTPUT_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setOutputTab(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      outputTab === tab.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <CopyButton value={currentOutput} />
            </div>
            <CodeEditor
              value={currentOutput}
              onChange={() => {}}
              language={outputTab === 'jsonschema' ? 'json' : outputTab === 'typescript' ? 'typescript' : 'typescript'}
              rows={17}
              readOnly
              placeholder="Generated schema appears here…"
            />
            {fields && (
              <div className="text-xs text-muted-foreground">
                {fields.length} field{fields.length !== 1 ? 's' : ''} detected
              </div>
            )}
          </div>
        }
      />
    </div>
  )
}
