'use client'

import { useState, useCallback, useRef } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface OutputRow { label: string; value: string }

export default function ImageBase64({ onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const firedRef = useRef(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [outputs, setOutputs] = useState<OutputRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)

  const handleFile = useCallback((file: File) => {
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
  }, [onOutput])

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1048576).toFixed(2)} MB`
  }

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/*" onFile={handleFile} label={t('image.to_base64', 'Drop an image to convert to Base64')} />
      {error && <ErrorAlert message={error} />}
      {preview && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="border border-input rounded-md overflow-hidden flex items-center justify-center bg-muted/20 p-2">
              <img src={preview} alt={fileName} className="max-w-full max-h-48 object-contain" />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{fileName}</p>
              <p>{t('common.original', 'Original')}: {formatBytes(originalSize)}</p>
              <p>{t('image.from_base64', 'Base64')}: {formatBytes(outputs[1]?.value.length ?? 0)}</p>
              <p>{t('image.from_base64', 'Overhead')}: +{Math.round(((outputs[1]?.value.length ?? 0) / originalSize - 1) * 100)}%</p>
            </div>
          </div>
          <div className="space-y-3">
            {outputs.map((o) => (
              <div key={o.label} className="rounded-md border border-input p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{o.label}</span>
                  <CopyButton value={o.value} />
                </div>
                <p className="font-mono text-xs break-all text-muted-foreground line-clamp-3">{o.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
