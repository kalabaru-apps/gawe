'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'generate' | 'read'

export default function QrCode({ onOutput, initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('generate')
  const [input, setInput] = useState((initialState?.input as string) ?? 'https://example.com')
  const [decoded, setDecoded] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (tab !== 'generate' || !input.trim() || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, input.trim(), {
      width: 256, margin: 2,
      color: { dark: '#000000ff', light: '#ffffffff' },
    }).catch(() => {})
  }, [input, tab])

  function downloadQr() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  const handleFile = useCallback((file: File) => {
    setReadError(null)
    setDecoded('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height)
        if (result) {
          setDecoded(result.data)
          onOutput({ action: 'read' }, { decoded: result.data })
        } else {
          setReadError('No QR code found in image')
        }
      }
      img.onerror = () => setReadError('Failed to load image')
      img.src = e.target?.result as string
    }
    reader.onerror = () => setReadError('Failed to read file')
    reader.readAsDataURL(file)
  }, [onOutput])

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['generate', 'read'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setDecoded(''); setReadError(null) }}
            className={`px-4 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'generate' ? 'Generate QR' : 'Read QR'}
          </button>
        ))}
      </div>
      {tab === 'generate' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Text or URL</label>
              <textarea value={input} onChange={(e) => { setInput(e.target.value); onOutput({ text: e.target.value }, {}) }}
                className="w-full min-h-[100px] text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://example.com" spellCheck={false} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <canvas ref={canvasRef} className="rounded-lg border border-input" style={{ imageRendering: 'pixelated' }} />
            <button onClick={downloadQr}
              className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">
              Download PNG
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image containing a QR code" />
          {readError && <ErrorAlert message={readError} />}
          {decoded && (
            <div className="rounded-md border border-input p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-400">✓ QR Code Decoded</span>
                <CopyButton value={decoded} />
              </div>
              <p className="font-mono text-sm break-all">{decoded}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
