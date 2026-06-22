'use client'

import { useState, useCallback, useRef } from 'react'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

type Format = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/avif'
const FORMAT_EXT: Record<Format, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/avif': '.avif' }

export default function ImageConverter({ onOutput, initialState: _initialState }: ToolProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('')
  const [originalSize, setOriginalSize] = useState(0)
  const [outputFormat, setOutputFormat] = useState<Format>('image/webp')
  const [quality, setQuality] = useState(90)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const handleFile = useCallback((file: File) => {
    setOriginalName(file.name.replace(/\.[^.]+$/, ''))
    setOriginalSize(file.size)
    setOutputSize(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { imgRef.current = img; setPreview(url) }
    img.onerror = () => setError('Failed to load image')
    img.src = url
  }, [])

  async function convert() {
    if (!imgRef.current) return
    setLoading(true)
    setError(null)
    const img = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) { setError('Conversion failed'); setLoading(false); return }
      setOutputSize(blob.size)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = originalName + FORMAT_EXT[outputFormat]
      a.click()
      URL.revokeObjectURL(url)
      setLoading(false)
      onOutput({ format: outputFormat, quality }, { outputSize: blob.size })
    }, outputFormat, quality / 100)
  }

  function formatBytes(b: number): string {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(2)} MB`
  }

  const FORMATS: { value: Format; label: string }[] = [
    { value: 'image/webp', label: 'WebP' },
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/png', label: 'PNG' },
    { value: 'image/avif', label: 'AVIF' },
  ]

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image to convert" />
      {preview && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Output Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {FORMATS.map((f) => (
                    <button key={f.value} onClick={() => setOutputFormat(f.value)}
                      className={`py-2 rounded-md text-sm border transition-colors ${outputFormat === f.value ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {outputFormat !== 'image/png' && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Quality</label>
                    <span className="text-xs font-mono text-muted-foreground">{quality}%</span>
                  </div>
                  <input type="range" min={1} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full" />
                </div>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original size</span>
                  <span className="font-mono">{formatBytes(originalSize)}</span>
                </div>
                {outputSize !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output size</span>
                    <span className="font-mono">{formatBytes(outputSize)}</span>
                  </div>
                )}
                {outputSize !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saved</span>
                    <span className={`font-mono ${outputSize < originalSize ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {outputSize < originalSize ? '-' : '+'}{Math.abs(Math.round((1 - outputSize / originalSize) * 100))}%
                    </span>
                  </div>
                )}
              </div>
              <button onClick={convert} disabled={loading}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? 'Converting…' : `Convert to ${FORMATS.find((f) => f.value === outputFormat)?.label}`}
              </button>
            </div>
            <div className="border border-input rounded-md overflow-hidden">
              <img src={preview} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
        </>
      )}
    </div>
  )
}
