'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import type { ToolProps } from '@/types'

async function scanExif(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer()
  const view = new DataView(buf)
  const found: string[] = []
  if (view.getUint16(0) !== 0xffd8) return found
  const bytes = new Uint8Array(buf)
  const str = new TextDecoder('latin1').decode(bytes.slice(0, Math.min(bytes.length, 65536)))
  if (str.includes('Exif')) found.push('EXIF data')
  if (str.includes('GPS')) found.push('GPS location')
  if (str.includes('Make') || str.includes('Model')) found.push('Camera info')
  if (str.includes('DateTime') || str.includes('DateTimeOriginal')) found.push('Date & time')
  if (str.includes('Software')) found.push('Software info')
  return found
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

interface FileInfo {
  file: File
  width: number
  height: number
  exifTags: string[]
  objectUrl: string
}

export default function ExifRemover({ onOutput }: ToolProps) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [quality, setQuality] = useState(0.9)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPEG or PNG image.')
      return
    }
    setError('')
    setOutputSize(null)

    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.src = objectUrl
    await new Promise<void>((res) => { img.onload = () => res() })
    const exifTags = await scanExif(file)
    setFileInfo({ file, width: img.naturalWidth, height: img.naturalHeight, exifTags, objectUrl })
  }, [])

  const stripAndDownload = useCallback(() => {
    if (!fileInfo) return
    setProcessing(true)
    setError('')
    const img = new Image()
    img.src = fileInfo.objectUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const mime = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png'
      const q = outputFormat === 'jpeg' ? quality : undefined
      canvas.toBlob((blob) => {
        if (!blob) {
          setError('Failed to process image.')
          setProcessing(false)
          return
        }
        setOutputSize(blob.size)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const ext = outputFormat === 'jpeg' ? 'jpg' : 'png'
        a.href = url
        a.download = fileInfo.file.name.replace(/\.[^.]+$/, '') + `-clean.${ext}`
        a.click()
        URL.revokeObjectURL(url)
        setProcessing(false)
        onOutput(
          { fileName: fileInfo.file.name, format: outputFormat, quality },
          { originalSize: fileInfo.file.size, outputSize: blob.size, exifRemoved: fileInfo.exifTags }
        )
      }, mime, q)
    }
    img.onerror = () => {
      setError('Failed to load image.')
      setProcessing(false)
    }
  }, [fileInfo, outputFormat, quality, onOutput])

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorAlert message={error} />}
      <ToolPanel
        left={
          <div className="flex flex-col gap-4">
            <FileDropzone
              onFiles={handleFiles}
              accept="image/jpeg,image/png"
              label="Drop a JPEG or PNG image here"
            />
            {fileInfo && (
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1">
                  <div className="font-medium text-foreground truncate">{fileInfo.file.name}</div>
                  <div className="text-muted-foreground">{formatBytes(fileInfo.file.size)} · {fileInfo.width}×{fileInfo.height}px</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Detected metadata</div>
                  {fileInfo.exifTags.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No EXIF metadata detected</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {fileInfo.exifTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center rounded-full bg-destructive/15 text-destructive text-xs px-2 py-0.5 font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        }
        right={
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border p-4 flex flex-col gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Output format</div>
                <div className="flex gap-2">
                  {(['jpeg', 'png'] as const).map((fmt) => (
                    <Button
                      key={fmt}
                      size="sm"
                      variant={outputFormat === fmt ? 'default' : 'outline'}
                      onClick={() => setOutputFormat(fmt)}
                    >
                      {fmt.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
              {outputFormat === 'jpeg' && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Quality: {Math.round(quality * 100)}%
                  </div>
                  <input
                    type="range"
                    min={70}
                    max={100}
                    value={Math.round(quality * 100)}
                    onChange={(e) => setQuality(Number(e.target.value) / 100)}
                    className="w-full accent-primary"
                  />
                </div>
              )}
            </div>
            {fileInfo && outputSize !== null && (
              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div className="text-muted-foreground">Before: <span className="text-foreground">{formatBytes(fileInfo.file.size)}</span></div>
                <div className="text-muted-foreground">After: <span className="text-foreground">{formatBytes(outputSize)}</span></div>
                <div className="text-muted-foreground">
                  Saved: <span className="text-green-500">{formatBytes(fileInfo.file.size - outputSize)} ({Math.round((1 - outputSize / fileInfo.file.size) * 100)}%)</span>
                </div>
              </div>
            )}
            <Button
              onClick={stripAndDownload}
              disabled={!fileInfo || processing}
              className="w-full"
            >
              {processing ? 'Processing…' : 'Strip & Download'}
            </Button>
          </div>
        }
      />
    </div>
  )
}
