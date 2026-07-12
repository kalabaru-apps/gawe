'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { FileDropzone } from '../shared/FileDropzone'
import { CodeEditor } from '../shared/CodeEditor'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'
import {
  bytesToHex, byteToAscii, detectInputFormat, formatHexDump, parseBytesInput,
} from '@/lib/protobuf/bytes'
import {
  decodeProtobuf, interpretFixed32, interpretFixed64, interpretVarint, type DecodedField,
} from '@/lib/protobuf/decode'
import { decodeWithSchema, type SchemaDecodeResult } from '@/lib/protobuf/schema'

type Selection = { start: number; end: number } | null

export default function ProtobufInspector({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [rawInput, setRawInput] = useState((initialState?.rawInput as string) ?? '')
  const [useSchema, setUseSchema] = useState(false)
  const [protoSource, setProtoSource] = useState('')
  const [selectedTypeName, setSelectedTypeName] = useState('')
  const [selection, setSelection] = useState<Selection>(null)
  const [schemaResult, setSchemaResult] = useState<SchemaDecodeResult | null>(null)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const firedRef = useRef(false)

  const format = useMemo(() => detectInputFormat(rawInput), [rawInput])
  const bytes = useMemo(() => {
    try {
      return rawInput.trim() ? parseBytesInput(rawInput) : null
    } catch {
      return null
    }
  }, [rawInput])
  const inputInvalid = rawInput.trim().length > 0 && bytes === null

  const decodeResult = useMemo(() => (bytes ? decodeProtobuf(bytes) : null), [bytes])
  const hexRows = useMemo(() => (bytes ? formatHexDump(bytes) : []), [bytes])

  useEffect(() => {
    if (!useSchema || !protoSource.trim() || !bytes) {
      setSchemaResult(null)
      setSchemaError(null)
      return
    }
    let cancelled = false
    decodeWithSchema(bytes, protoSource, selectedTypeName || undefined)
      .then((result) => {
        if (cancelled) return
        setSchemaResult(result)
        setSchemaError(null)
        if (!selectedTypeName) setSelectedTypeName(result.typeName)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setSchemaResult(null)
        setSchemaError(e.message)
      })
    return () => { cancelled = true }
  }, [useSchema, protoSource, bytes, selectedTypeName])

  useEffect(() => {
    if (decodeResult && decodeResult.fields.length > 0 && bytes) {
      if (!firedRef.current) { analytics.buttonClick('protobuf-inspector', 'decode'); firedRef.current = true }
      onOutput({ rawInput, useSchema }, { byteLength: bytes.length, fieldCount: decodeResult.fields.length })
    }
  }, [decodeResult, bytes, rawInput, useSchema, onOutput])

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer()
    setRawInput(bytesToHex(new Uint8Array(buf), true))
  }

  function normalizeToHex() {
    if (bytes) setRawInput(bytesToHex(bytes, true))
  }

  return (
    <div className="space-y-4">
      <ToolPanel
        left={
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t('dev.pb_input', 'Payload')} {bytes && <span className="text-muted-foreground/70">({bytes.length} bytes, {format})</span>}
              </label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="w-full min-h-[140px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
                placeholder={t('dev.pb_input_placeholder', 'Paste hex or Base64, or drop a file below')}
                spellCheck={false}
              />
              {inputInvalid && <ErrorAlert message={t('dev.pb_invalid_input', 'Input is not valid hex or Base64')} className="mt-2" />}
              {bytes && format === 'base64' && (
                <button onClick={normalizeToHex} className="mt-2 text-xs text-primary hover:underline">
                  {t('dev.pb_normalize_hex', 'Normalize to hex')}
                </button>
              )}
            </div>
            <FileDropzone accept="*" onFile={handleFile} label={t('dev.pb_drop_file', 'Drop file or click to upload')} compact />

            <div className="border-t border-border pt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={useSchema} onChange={(e) => setUseSchema(e.target.checked)} className="rounded" />
                {t('dev.pb_use_schema', 'Use .proto schema (optional)')}
              </label>
              {useSchema && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={protoSource}
                    onChange={(e) => setProtoSource(e.target.value)}
                    className="w-full min-h-[120px] font-mono text-xs border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t('dev.pb_schema_placeholder', 'Paste .proto source…')}
                    spellCheck={false}
                  />
                  {schemaResult && schemaResult.messageTypes.length > 1 && (
                    <select
                      value={selectedTypeName}
                      onChange={(e) => setSelectedTypeName(e.target.value)}
                      className="w-full text-sm border border-input rounded-md px-2 py-1.5 bg-background"
                    >
                      {schemaResult.messageTypes.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  )}
                  {schemaError && <ErrorAlert message={schemaError} />}
                </div>
              )}
            </div>
          </div>
        }
        right={
          <div className="space-y-2">
            {!useSchema || !schemaResult ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dev.pb_tree', 'Decoded fields')}</span>
                  {decodeResult && <CopyButton value={JSON.stringify(summarizeFields(decodeResult.fields), null, 2)} />}
                </div>
                <div className="font-mono text-xs border border-input rounded-md p-2 bg-muted/30 min-h-[220px] max-h-[420px] overflow-auto">
                  {!bytes && <span className="text-muted-foreground">{t('dev.pb_empty_prompt', 'Paste protobuf bytes to decode')}</span>}
                  {decodeResult?.fields.map((f, i) => (
                    <FieldRow key={i} field={f} depth={0} selection={selection} onSelect={setSelection} />
                  ))}
                  {decodeResult?.error && <ErrorAlert message={decodeResult.error} className="mt-2" />}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('dev.pb_schema_output', 'Decoded (schema)')}: {schemaResult.typeName}</span>
                  <CopyButton value={JSON.stringify(schemaResult.value, null, 2)} />
                </div>
                <CodeEditor value={JSON.stringify(schemaResult.value, null, 2)} onChange={() => {}} language="json" readOnly rows={16} />
              </>
            )}
          </div>
        }
      />
      {bytes && bytes.length > 0 && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.pb_hex_dump', 'Hex dump')}</label>
          <div className="font-mono text-xs border border-input rounded-md p-2 bg-muted/30 overflow-auto max-h-[260px]">
            {hexRows.map((row) => (
              <div key={row.offset} className="flex gap-3 whitespace-pre">
                <span className="text-muted-foreground select-none">{row.offset.toString(16).padStart(6, '0')}</span>
                <span>
                  {row.bytes.map((b) => (
                    <span
                      key={b.index}
                      className={cn('px-px rounded-sm', selection && b.index >= selection.start && b.index < selection.end && 'bg-primary/25')}
                    >
                      {b.value.toString(16).padStart(2, '0')}{' '}
                    </span>
                  ))}
                </span>
                <span className="text-muted-foreground">
                  {row.bytes.map((b) => (
                    <span
                      key={b.index}
                      className={cn(selection && b.index >= selection.start && b.index < selection.end && 'bg-primary/25 text-foreground')}
                    >
                      {byteToAscii(b.value)}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FieldRow({ field, depth, selection, onSelect }: {
  field: DecodedField
  depth: number
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = !!field.subMessage && field.subMessage.length > 0
  const isSelected = selection?.start === field.startOffset && selection?.end === field.endOffset

  return (
    <div>
      <div
        onClick={() => onSelect({ start: field.startOffset, end: field.endOffset })}
        style={{ paddingLeft: depth * 14 }}
        className={cn('flex items-center gap-1.5 py-0.5 px-1 rounded cursor-pointer hover:bg-muted/60', isSelected && 'bg-primary/15')}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }} className="text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className="text-emerald-500 shrink-0">#{field.fieldNumber}</span>
        <span className="text-muted-foreground shrink-0">{field.wireTypeName}</span>
        <span className="truncate">{renderValueSummary(field)}</span>
      </div>
      {hasChildren && expanded && field.subMessage!.map((sub, i) => (
        <FieldRow key={i} field={sub} depth={depth + 1} selection={selection} onSelect={onSelect} />
      ))}
      {field.subMessageError && (
        <div style={{ paddingLeft: (depth + 1) * 14 }} className="text-rose-500 text-[11px] py-0.5">
          not a submessage: {field.subMessageError}
        </div>
      )}
    </div>
  )
}

function renderValueSummary(field: DecodedField): string {
  switch (field.wireTypeName) {
    case 'varint': {
      const v = interpretVarint(field.varintValue!)
      return `${v.uint} (int64 ${v.int64}, zigzag ${v.zigzag})`
    }
    case 'fixed32': {
      const v = interpretFixed32(field.fixedBytes!)
      return `${v.uint32} (float ${v.float32})`
    }
    case 'fixed64': {
      const v = interpretFixed64(field.fixedBytes!)
      return `${v.uint64} (double ${v.double})`
    }
    case 'bytes': {
      const value = field.bytesValue!
      if (field.subMessage?.length) return `message (${field.subMessage.length} field${field.subMessage.length === 1 ? '' : 's'})`
      if (field.utf8Value !== undefined) return `"${field.utf8Value}"`
      const preview = bytesToHex(value.slice(0, 16), true)
      return `${value.length} bytes: ${preview}${value.length > 16 ? '…' : ''}`
    }
  }
}

function summarizeFields(fields: DecodedField[]): unknown[] {
  return fields.map((f) => ({
    field: f.fieldNumber,
    wireType: f.wireTypeName,
    value: f.subMessage?.length ? summarizeFields(f.subMessage) : renderValueSummary(f),
  }))
}
