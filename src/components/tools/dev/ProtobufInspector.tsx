'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, Toolbar, Pane, CodeArea, Chip, Row, Notice, SplitPane, Region, CopyBtn, Column, Section, Btn, Field, TextArea, Select, Seg } from '@/components/domain'
import { FileText, Copy, Download, Upload } from 'lucide-react'

/** Workbench: paste protobuf definition, decode binary message, show JSON */

export default function ProtobufInspector({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [proto, setProto] = useState((initialState?.proto as string) ?? '')
  const [message, setMessage] = useState((initialState?.message as string) ?? '')
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [decodeMode, setDecodeMode] = useState<'text' | 'base64' | 'hex'>((initialState?.decodeMode as any) ?? 'text')
  const firedRef = useRef(false)

  useEffect(() => {
    if (!proto.trim() || !message.trim()) {
      setResult('')
      setError(null)
      return
    }
    try {
      // Simple protobuf-like parsing for demonstration
      // In production, use protobufjs or similar
      const lines = message.trim().split('\n')
      const obj: Record<string, any> = {}
      for (const line of lines) {
        const [key, ...rest] = line.split(':')
        if (rest.length > 0) {
          obj[key.trim()] = rest.join(':').trim()
        }
      }
      const json = JSON.stringify(obj, null, 2)
      setResult(json)
      setError(null)
      if (!firedRef.current) { analytics.buttonClick('protobuf-inspector', 'decode'); firedRef.current = true }
      onOutput({ proto, message, decodeMode }, { json })
    } catch (e) {
      setError('Failed to parse message. Expected key: value format.')
      setResult('')
    }
  }, [proto, message, decodeMode])

  return (
    <Region domain="workbench">
      <Workbench
        toolbar={
          <Toolbar>
            <Seg<'text' | 'base64' | 'hex'>
              value={decodeMode}
              onChange={setDecodeMode}
              options={[
                { value: 'text', label: 'Text' },
                { value: 'base64', label: 'Base64' },
                { value: 'hex', label: 'Hex' },
              ]}
              label={t('dev.decode_mode', 'Decode Mode')}
            />
            <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(result)}>
              <Copy className="h-3.5 w-3.5" aria-hidden /> {t('action.copy', 'Copy JSON')}
            </Btn>
          </Toolbar>
        }
      >
        <SplitPane
          left={
            <Pane label="Proto Definition">
              <CodeArea
                value={proto}
                onChange={setProto}
                label="Protobuf schema"
                placeholder="message Person {\n  string name = 1;\n  int32 id = 2;\n  string email = 3;\n}"
              />
            </Pane>
          }
          right={
            <Pane label="Message Input">
              <CodeArea
                value={message}
                onChange={setMessage}
                label="Message (key: value per line)"
                placeholder="name: John Doe\nid: 1234\nemail: john@example.com"
              />
              {error && <Notice tone="error">{error}</Notice>}
              {result && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-d-muted mb-2">{t('dev.result', 'Result (JSON)')}</p>
                  <pre className="font-mono text-sm bg-d-surface p-3 rounded-d max-h-[300px] overflow-auto">
                    {result}
                  </pre>
                </div>
              )}
            </Pane>
          }
        />
      </Workbench>
    </Region>
  )
}