'use client'

import { useCallback, useRef, useState } from 'react'
import { Copy, Download } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { DropHero, StudioWorkspace, Btn, Section, Stat, Notice, Row, CopyBtn } from '@/components/domain'

interface OutputRow { label: string; value: string }

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}

export default function ImageBase64({ onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const firedRef = useRef(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<OutputRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)

  const handleFile = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setFileName(file.name)
    setOriginalSize(file.size)
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      if (!firedRef.current) { analytics.buttonClick('image-base64', 'convert'); firedRef.current = true }
      const dataUri = e.target?.result as string
      setPreview(dataUri)
      const bare = dataUri.split(',')[1]
      const rows: OutputRow[] = [
        { label: 'Data URI', value: dataUri },
        { label: 'Base64 (bare)', value: bare },
        { label: 'CSS background-image', value: `background-image: url('${dataUri}');` },
        { label: 'HTML <img> tag', value: `<img src="${dataUri}" alt="${file.name}" />` },
      ]
      setOutputs(rows)
      onOutput({ fileName: file.name, mimeType: file.type }, { dataUriLength: dataUri.length, base64Size: bare.length })
    }
    reader.onerror = () => setError(t('image.failed_load', 'Failed to read file'))
    reader.readAsDataURL(file)
  }, [onOutput, t])

  const copyAll = async () => {
    const all = outputs.map(o => `${o.label}:\n${o.value}`).join('\n\n')
    await navigator.clipboard.writeText(all)
  }

  if (!preview) {
    return (
      <div className="flex h-full flex-col">
        {error && <div className="p-4 pb-0"><Notice tone="error">{error}</Notice></div>}
        <DropHero
          accept="image/*"
          onFiles={handleFile}
          title={t('image.to_base64', 'Image to Base64')}
          hint="Drop an image here. It stays on your device."
        />
      </div>
    )
  }

  const base64Size = outputs[1]?.value.length ?? 0
  const overheadPct = originalSize > 0 ? Math.round(((base64Size / originalSize) - 1) * 100) : 0

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <Section title={t('common.info', 'Info')}>
            <div className="space-y-1.5 text-sm">
              <Row label={t('common.file', 'File')} value={fileName} />
              <Row label={t('common.original_size', 'Original')} value={formatBytes(originalSize)} />
              <Row label={t('image.base64_size', 'Base64')} value={formatBytes(base64Size)} />
              <Row label={t('image.overhead', 'Overhead')} value={`+${overheadPct}%`} />
            </div>
          </Section>
          <Section title={t('common.actions', 'Actions')}>
            <div className="flex flex-col gap-2">
              <Btn onClick={copyAll}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                <span>{t('common.copy_all', 'Copy all')}</span>
              </Btn>
              {outputs[0] && (
                <Btn variant="secondary" onClick={async () => {
                  const a = document.createElement('a')
                  a.href = outputs[0].value
                  a.download = fileName.replace(/\.[^.]+$/, '') + '.txt'
                  a.click()
                }}>
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  <span>{t('common.download_as_file', 'Download as .txt')}</span>
                </Btn>
              )}
            </div>
          </Section>
          <div className="mt-auto">
            <Btn variant="quiet" onClick={() => { setPreview(null); setOutputs([]); firedRef.current = false }}>
              {t('common.choose_another', 'Choose another file')}
            </Btn>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-d-border px-2 py-2">
          <Stat label={t('common.original_size', 'Original')} value={formatBytes(originalSize)} tone="display" />
          <Stat label={t('image.base64_size', 'Base64')} value={formatBytes(base64Size)} tone="display" />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-xl space-y-4">
            <div className="rounded-d border border-d-border bg-white p-3 flex items-center justify-center min-h-[200px]">
              <img src={preview} alt={fileName} className="max-w-full max-h-64 object-contain" />
            </div>
            <div className="space-y-3">
              {outputs.map((o) => (
                <div key={o.label} className="rounded-d border border-d-border bg-d-raised p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-d-muted">{o.label}</span>
                    <CopyBtn value={o.value} label={t('common.copy', 'Copy')} size="sm" />
                  </div>
                  <p className="font-mono text-xs break-all text-d-muted line-clamp-4">{o.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StudioWorkspace>
  )
}