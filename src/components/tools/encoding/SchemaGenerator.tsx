'use client'

// Domain: workbench (live input pane to generated-code pane).
import { useState, useMemo } from 'react'
import Papa from 'papaparse'
import { Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Workbench, Toolbar, StatusBar, SplitPane, Pane, WbButton, Segmented, CodeArea, TextInput } from '@/components/domain'

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
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : JSON.stringify(name)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function generateTsInterface(fields: FieldDef[], name: string): string {
  function buildNested(fs: FieldDef[], prefix: string): string[] {
    const out: string[] = []
    for (const f of fs) {
      if (f.type === 'object' && f.nested) {
        const nestedName = prefix + capitalize(f.name)
        out.push(...buildNested(f.nested, nestedName))
        out.push(`interface ${nestedName} {\n  ${f.nested.map(n => `${safeKey(n.name)}: ${n.type}`).join('\n  ')}\n}`)
      }
    }
    return out
  }

  const nested = buildNested(fields, name).join('\n\n')
  const body = fields
    .map((f) => {
      if (f.type === 'object' && f.nested) {
        return `  ${safeKey(f.name)}: ${name + capitalize(f.name)}`
      }
      return `  ${safeKey(f.name)}: ${f.type}`
    })
    .join('\n')

  return (nested ? nested + '\n\n' : '') + `interface ${name} {\n${body}\n}`
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

    if (nestedDefs.length > 0) lines.push(...nestedDefs)
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

export default function SchemaGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [inputMode, setInputMode] = useState<InputMode>((initialState?.inputMode as InputMode) ?? 'json')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [schemaName, setSchemaName] = useState((initialState?.schemaName as string) ?? 'MyType')
  const [outputTab, setOutputTab] = useState<OutputTab>('typescript')
  const [copied, setCopied] = useState(false)

  const { result, error } = useMemo(() => {
    if (!input.trim()) return { result: null, error: '' }
    try {
      let parsedFields: FieldDef[]
      if (inputMode === 'csv') {
        const r = Papa.parse<Record<string, string>>(input, { header: true, skipEmptyLines: true })
        if (r.errors.length > 0 && r.data.length === 0) throw new Error(r.errors[0].message)
        if (r.data.length === 0) throw new Error('CSV has no data rows. Add a header line and at least one row.')
        parsedFields = buildFields(r.data[0] as Record<string, unknown>)
      } else {
        let parsed: unknown
        try { parsed = JSON.parse(input) } catch (e) { throw new Error('Invalid JSON: ' + (e instanceof Error ? e.message : String(e))) }
        const obj = Array.isArray(parsed) ? parsed[0] : parsed
        if (typeof obj !== 'object' || obj === null) throw new Error('JSON must be an object or an array of objects.')
        parsedFields = buildFields(obj as Record<string, unknown>)
      }
      const name = schemaName.trim() || 'MyType'
      return {
        result: {
          fields: parsedFields,
          outputs: {
            typescript: generateTsInterface(parsedFields, name),
            zod: generateZodSchema(parsedFields, name),
            jsonschema: generateJsonSchema(parsedFields, name),
          },
        },
        error: '',
      }
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : 'Failed to generate schema' }
    }
  }, [input, inputMode, schemaName])

  const currentOutput = result ? result.outputs[outputTab] : ''

  const copy = async () => {
    if (!currentOutput) return
    await navigator.clipboard.writeText(currentOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    onOutput({ input, inputMode, schemaName, outputTab }, { output: currentOutput })
  }

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<InputMode>
            label="Input mode"
            value={inputMode}
            onChange={setInputMode}
            options={[{ value: 'json', label: 'JSON' }, { value: 'csv', label: 'CSV' }]}
          />
          <Segmented<OutputTab>
            label="Output format"
            value={outputTab}
            onChange={setOutputTab}
            options={[{ value: 'typescript', label: 'TypeScript' }, { value: 'zod', label: 'Zod' }, { value: 'jsonschema', label: 'JSON Schema' }]}
          />
          <label className="flex items-center gap-2 text-xs text-d-muted">
            Type name
            <TextInput value={schemaName} onChange={(e) => setSchemaName(e.target.value)} placeholder="MyType" mono className="h-7 w-32 py-0 text-xs" />
          </label>
        </Toolbar>
      }
      status={
        <StatusBar>
          {!input.trim() && <span>Paste a sample {inputMode.toUpperCase()}. The schema builds as you type.</span>}
          {result && <span className="flex items-center gap-1 text-d-accent"><CheckCircle2 className="h-3 w-3" aria-hidden />{result.fields.length} field{result.fields.length !== 1 ? 's' : ''} detected</span>}
          {error && <span role="alert" className="flex min-w-0 items-center gap-1 text-red-600 dark:text-red-400"><AlertCircle className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{error}</span></span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={inputMode === 'csv' ? 'CSV (first row is headers)' : 'JSON object or array'}>
            <CodeArea
              label="Input"
              value={input}
              onChange={setInput}
              placeholder={inputMode === 'csv' ? 'name,age,email\nAlice,30,alice@example.com' : '{\n  "name": "Alice",\n  "age": 30\n}'}
            />
          </Pane>
        }
        right={
          <Pane
            label={t('action.output', 'Output')}
            actions={
              <WbButton onClick={copy} disabled={!currentOutput} className="h-6">
                {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
                {copied ? 'Copied' : 'Copy'}
              </WbButton>
            }
          >
            <CodeArea label="Generated schema" value={currentOutput} readOnly placeholder="Generated code appears here" />
          </Pane>
        }
      />
    </Workbench>
  )
}
