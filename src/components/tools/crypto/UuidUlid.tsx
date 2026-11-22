'use client'

import { useState, useCallback, useEffect } from 'react'
import { Copy, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { v1, v4, v5, NIL, validate, version } from 'uuid'
import { ulid } from 'ulid'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Workbench, SplitPane, Pane, CodeArea, WbButton, StatusBar, Toolbar, Segmented } from '@/components/domain/Workbench'
import { CopyBtn, Notice, Row, Empty, TextInput } from '@/components/domain/kit'

type UuidVersion = 'v1' | 'v4' | 'v5' | 'ulid'

const DNS_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const URL_NS = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

/** UuidUlid: Workbench with live generation, bulk copy, validate pane. */
export default function UuidUlid({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [uuidVersion, setUuidVersion] = useState<UuidVersion>((initialState?.uuidVersion as UuidVersion) ?? 'v4')
  const [count, setCount] = useState((initialState?.count as number) ?? 5)
  const [v5Name, setV5Name] = useState((initialState?.v5Name as string) ?? 'example.com')
  const [v5Ns, setV5Ns] = useState<'dns' | 'url'>('dns')
  const [generated, setGenerated] = useState<string[]>([])
  const [validateInput, setValidateInput] = useState('')
  const [validateResult, setValidateResult] = useState<{ valid: boolean; version?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(() => {
    setError(null)
    try {
      const ids = Array.from({ length: count }, () => {
        switch (uuidVersion) {
          case 'v1': return v1()
          case 'v4': return v4()
          case 'v5': return v5(v5Name, v5Ns === 'dns' ? DNS_NS : URL_NS)
          case 'ulid': return ulid()
        }
      })
      setGenerated(ids)
      onOutput({ type: uuidVersion, count }, { ids })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
    }
  }, [uuidVersion, count, v5Name, v5Ns, onOutput])

  useEffect(() => { generate() }, [uuidVersion, count, v5Name, v5Ns, generate])

  const checkValidate = useCallback(() => {
    const raw = validateInput.trim()
    if (!raw) return
    const isValid = validate(raw)
    setValidateResult({ valid: isValid, version: isValid ? version(raw) : undefined })
  }, [validateInput])

  const TYPE_OPTIONS = [
    { value: 'v1' as UuidVersion, label: 'UUID v1', desc: t('crypto.uuid_v1', 'Time-based') },
    { value: 'v4' as UuidVersion, label: 'UUID v4', desc: t('crypto.uuid_v4', 'Random') },
    { value: 'v5' as UuidVersion, label: 'UUID v5', desc: t('crypto.uuid_v5', 'Name-based (SHA-1)') },
    { value: 'ulid' as UuidVersion, label: 'ULID', desc: t('crypto.ulid_desc', 'Sortable') },
  ]

  return (
    <Workbench
      toolbar={
        <Toolbar>
          <Segmented<UuidVersion>
            label={t('crypto.type', 'Type')}
            value={uuidVersion}
            onChange={setUuidVersion}
            options={TYPE_OPTIONS}
          />
        </Toolbar>
      }
      status={
        <StatusBar>
          {generated.length > 0 && <span className="text-xs font-mono text-d-muted">{generated.length} generated</span>}
        </StatusBar>
      }
    >
      <SplitPane
        left={
          <Pane label={t('crypto.options', 'Options')}>
            {uuidVersion === 'v5' && (
              <div className="mb-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-d-ink mb-1 block">{t('common.text', 'Name')}</label>
                  <TextInput
                    value={v5Name}
                    onChange={e => setV5Name(e.target.value)}
                    className="w-full"
                    placeholder="example.com"
                    mono
                  />
                </div>
                <div className="flex gap-2">
                  {(['dns', 'url'] as const).map((ns) => (
                    <WbButton
                      key={ns}
                      primary={v5Ns === ns}
                      onClick={() => setV5Ns(ns)}
                      className="flex-1 h-7 text-xs"
                    >
                      {ns.toUpperCase()}
                    </WbButton>
                  ))}
                </div>
              </div>
            )}
            <div className="mb-3">
              <label className="text-xs font-medium text-d-ink mb-1 block">{t('crypto.count', 'Count')} (1-50)</label>
              <input
                type="number" min={1} max={50} value={count} onChange={e => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
                className="w-full text-sm border border-d-border rounded-d px-3 py-2 bg-d-raised outline-none focus-visible:border-d-accent font-mono"
              />
            </div>
            <WbButton onClick={() => { analytics.buttonClick('uuid-ulid', 'regenerate'); generate() }} className="w-full">
              <RefreshCw className="h-3 w-3 inline mr-1" aria-hidden /> {t('common.regenerate', 'Regenerate')}
            </WbButton>
            {error && (
              <Notice tone="error" className="mt-3">
                <AlertCircle className="h-4 w-4" aria-hidden />
                {error}
              </Notice>
            )}
            <div className="mt-4 border-t border-d-border pt-4">
              <label className="text-xs font-medium text-d-ink mb-2 block">{t('crypto.uuid_validate', 'Validate UUID')}</label>
              <div className="flex gap-2">
                <TextInput
                  value={validateInput}
                  onChange={e => setValidateInput(e.target.value)}
                  className="flex-1"
                  placeholder={t('crypto.input_placeholder', 'Paste UUID to validate...')}
                  mono
                />
                <WbButton onClick={checkValidate} className="h-7">Check</WbButton>
              </div>
              {validateResult && (
                <Notice tone={validateResult.valid ? 'ok' : 'error'} className="mt-2">
                  {validateResult.valid ? <Check className="h-4 w-4" aria-hidden /> : <AlertCircle className="h-4 w-4" aria-hidden />}
                  {validateResult.valid
                    ? `${t('crypto.uuid_valid', 'Valid UUID')} v${validateResult.version}`
                    : t('action.error', 'Invalid UUID')}
                </Notice>
              )}
            </div>
          </Pane>
        }
        right={
          <Pane
            label={t('action.output', 'Generated')}
            actions={generated.length > 0 && <CopyBtn value={generated.join('\n')} label="Copy all" />}
          >
            {generated.length > 0 ? (
              <div className="space-y-1 font-mono text-sm">
                {generated.map((id, i) => (
                  <Row key={i} label={`${i + 1}`} value={id} copy mono />
                ))}
              </div>
            ) : (
              <Empty title={t('crypto.empty_prompt', 'Click Generate to produce IDs')} />
            )}
          </Pane>
        }
      />
    </Workbench>
  )
}