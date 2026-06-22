'use client'

import { useState, useCallback, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { ErrorAlert } from '../shared/ErrorAlert'

export default function ImageResize({ onOutput, initialState: _initialState }: ToolProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState('')
  const [origW, setOrigW] = useState(0)
  const [origH, setOrigH] = useState(0)
  const [origSize, setOrigSize] = useState(0)
  const [targetW, setTargetW] = useState(800)
  const [targetH, setTargetH] = useState(600)
  const [lockAspect, setLockAspect] = useState(true)
  const [maxSizeMB, setMaxSizeMB] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)
  const aspectRatioRef = useRef(1)

  const handleFile = useCallback((file: File) => {
    fileRef.current = file
    setOriginalName(file.name.replace(/\.[^.]+$/, ''))
    setOrigSize(file.size)
    setError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setOrigW(img.naturalWidth)
      setOrigH(img.naturalHeight)
      setTargetW(img.naturalWidth)
      setTargetH(img.naturalHeight)
      aspectRatioRef.current = img.naturalWidth / img.naturalHeight
      setPreview(url)
    }
    img.src = url
  }, [])

  function handleWidthChange(w: number) {
    setTargetW(w)
    if (lockAspect) setTargetH(Math.round(w / aspectRatioRef.current))
  }

  function handleHeightChange(h: number) {
    setTargetH(h)
    if (lockAspect) setTargetW(Math.round(h * aspectRatioRef.current))
  }

  async function resize() {
    if (!fileRef.current) return
    setLoading(true)
    setError(null)
    try {
      const compressed = await imageCompression(fileRef.current, {
        maxWidthOrHeight: Math.max(targetW, targetH),
        maxSizeMB,
        useWebWorker: true,
      })
      // Then resize to exact dimensions
      const url = URL.createObjectURL(compressed)
      const img = new Image()
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
      const canvas = document.createElement('canvas')
      canvas.width = targetW; canvas.height = targetH
      canvas.getContext('2d')!.drawImage(img, 0, 0, targetW, targetH)
      canvas.toBlob((blob) => {
        if (!blob) { setError('Resize failed'); setLoading(false); return }
        const outUrl = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = outUrl; a.download = `${originalName}-${targetW}x${targetH}.png`; a.click()
        URL.revokeObjectURL(outUrl); URL.revokeObjectURL(url)
        setLoading(false)
        onOutput({ targetW, targetH, maxSizeMB }, { outputSize: blob.size })
      }, 'image/png')
    } catch (e) {
      setError((e as Error).message)
      setLoading(false)
    }
  }

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1048576).toFixed(2)} MB`
  }

  return (
    <div className="space-y-4">
      <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image to resize" />
      {preview && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Width (px)</label>
                <input type="number" min={1} value={targetW} onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Height (px)</label>
                <input type="number" min={1} value={targetH} onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring font-mono" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} className="rounded" />
              Lock aspect ratio
            </label>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Max file size</label>
              <select value={maxSizeMB} onChange={(e) => setMaxSizeMB(Number(e.target.value))}
                className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none">
                {[0.25, 0.5, 1, 2, 5, 10].map((v) => <option key={v} value={v}>{v < 1 ? `${v * 1000}KB` : `${v}MB`}</option>)}
              </select>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Original: {origW}×{origH} · {formatBytes(origSize)}</p>
              <p>Output: {targetW}×{targetH} (target)</p>
            </div>
            <button onClick={resize} disabled={loading}
              className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading ? 'Resizing…' : 'Resize & Download'}
            </button>
            {error && <ErrorAlert message={error} />}
          </div>
          <div className="border border-input rounded-md overflow-hidden flex items-center justify-center bg-muted/20 p-2">
            <img src={preview} alt="Preview" className="max-w-full max-h-64 object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
