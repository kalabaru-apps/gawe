'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { FileDropzone } from '../shared/FileDropzone'
import { CodeEditor } from '../shared/CodeEditor'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'optimize' | 'favicon'

const FAVICON_SIZES = [16, 32, 48, 64, 96, 128, 192, 512]

export default function SvgTools({ onOutput, initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('optimize')
  // Optimize tab
  const [svgInput, setSvgInput] = useState((initialState?.svgInput as string) ?? '')
  const [optimized, setOptimized] = useState('')
  const [svgError, setSvgError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  // Favicon tab
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconPreviews, setFaviconPreviews] = useState<Array<{ size: number; url: string }>>([])
  const [faviconError, setFaviconError] = useState<string | null>(null)

  async function optimizeSvg() {
    const input = svgInput.trim()
    if (!input) return
    setOptimizing(true)
    setSvgError(null)
    try {
      const { optimize } = await import('svgo')
      const result = optimize(input, {
        multipass: true,
        plugins: ['preset-default'],
      })
      setOptimized(result.data)
      onOutput({ originalSize: input.length }, { optimizedSize: result.data.length, saved: input.length - result.data.length })
    } catch (e) {
      setSvgError((e as Error).message)
    } finally {
      setOptimizing(false)
    }
  }

  const handleSvgFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => setSvgInput(e.target?.result as string)
    reader.onerror = () => setSvgError('Failed to read file')
    reader.readAsText(file)
  }, [])

  const handleFaviconFile = useCallback((file: File) => {
    setFaviconPreviews([])
    setFaviconError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setFaviconPreview(url)
      const previews = FAVICON_SIZES.map((size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        canvas.getContext('2d')!.drawImage(img, 0, 0, size, size)
        return { size, url: canvas.toDataURL('image/png') }
      })
      setFaviconPreviews(previews)
    }
    img.onerror = () => setFaviconError('Failed to load image')
    img.src = url
  }, [])

  function downloadFavicon(url: string, size: number) {
    const a = document.createElement('a'); a.href = url; a.download = `favicon-${size}x${size}.png`; a.click()
  }

  const htmlSnippet = faviconPreviews.length > 0
    ? `<link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32">\n<link rel="apple-touch-icon" href="/favicon-192x192.png">`
    : ''

  const savings = svgInput.length > 0 && optimized.length > 0
    ? Math.round((1 - optimized.length / svgInput.length) * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['optimize', 'favicon'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'optimize' ? 'Optimize SVG' : 'Favicon Generator'}
          </button>
        ))}
      </div>
      {tab === 'optimize' ? (
        <ToolPanel
          left={
            <div className="space-y-3">
              <FileDropzone accept=".svg,image/svg+xml" onFile={handleSvgFile} label="Drop an SVG file or paste code below" />
              <CodeEditor value={svgInput} onChange={setSvgInput} language="svg" />
              <button onClick={optimizeSvg} disabled={optimizing || !svgInput.trim()}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {optimizing ? 'Optimizing…' : 'Optimize SVG'}
              </button>
              {svgError && <ErrorAlert message={svgError} />}
            </div>
          }
          right={
            <div className="space-y-3">
              {optimized && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-400 font-medium">Saved {savings}% ({svgInput.length - optimized.length} bytes)</span>
                    <CopyButton value={optimized} />
                  </div>
                  <CodeEditor value={optimized} onChange={() => {}} language="svg" readOnly />
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Before: {svgInput.length} bytes</span>
                    <span>After: {optimized.length} bytes</span>
                  </div>
                </>
              )}
              {!optimized && <p className="text-sm text-muted-foreground">Optimized SVG will appear here</p>}
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleFaviconFile} label="Drop an image (PNG, SVG, JPG) to generate favicons" />
          {faviconError && <ErrorAlert message={faviconError} />}
          {faviconPreviews.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                {faviconPreviews.map(({ size, url }) => (
                  <div key={size} className="flex flex-col items-center gap-1">
                    <div className="border border-input rounded overflow-hidden" style={{ width: Math.min(size, 64), height: Math.min(size, 64) }}>
                      <img src={url} width={Math.min(size, 64)} height={Math.min(size, 64)} alt={`${size}px`} />
                    </div>
                    <button onClick={() => downloadFavicon(url, size)}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                      {size}×{size}
                    </button>
                  </div>
                ))}
              </div>
              {htmlSnippet && (
                <div className="rounded-md border border-input p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">HTML Snippet</span>
                    <CopyButton value={htmlSnippet} />
                  </div>
                  <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">{htmlSnippet}</pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
