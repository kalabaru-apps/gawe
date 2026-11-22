'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Sparkles, Copy, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import {
  Region, Workbench, Toolbar, StatusBar, Pane, SplitPane, WbButton, CodeArea, Btn, IconBtn,
  CopyBtn, Section, Notice, DropHero, Scroll, Column,
} from '@/components/domain'

type Tab = 'optimize' | 'favicon'

const FAVICON_SIZES = [16, 32, 48, 64, 96, 128, 192, 512]

function svgUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function SvgTools({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('optimize')
  const [svgInput, setSvgInput] = useState((initialState?.svgInput as string) ?? '')
  const [optimized, setOptimized] = useState('')
  const [svgError, setSvgError] = useState<string | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const [faviconPreviews, setFaviconPreviews] = useState<Array<{ size: number; url: string }>>([])
  const [faviconError, setFaviconError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const optimizeSvg = useCallback(async () => {
    const input = svgInput.trim()
    if (!input) return
    setOptimizing(true)
    setSvgError(null)
    try {
      const res = await fetch('/api/tools/svgo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg: input }),
      })
      const json = await res.json() as { data?: string; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Optimization failed')
      const data = json.data!
      setOptimized(data)
      onOutput({ originalSize: input.length }, { optimizedSize: data.length, saved: input.length - data.length })
      analytics.buttonClick('svg-tools', 'optimize')
    } catch (e) {
      setSvgError((e as Error).message)
    } finally {
      setOptimizing(false)
    }
  }, [svgInput, onOutput])

  const handleSvgFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => { setSvgInput(e.target?.result as string); setOptimized('') }
    reader.onerror = () => setSvgError(t('image.failed_load', 'Failed to read file'))
    reader.readAsText(file)
  }, [t])

  const handleFaviconFiles = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setFaviconPreviews([])
    setFaviconError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setFaviconPreviews(FAVICON_SIZES.map((size) => {
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        canvas.getContext('2d')!.drawImage(img, 0, 0, size, size)
        return { size, url: canvas.toDataURL('image/png') }
      }))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => setFaviconError(t('image.failed_load', 'Failed to load image'))
    img.src = url
  }, [t])

  const downloadFavicon = (url: string, size: number) => {
    const a = document.createElement('a'); a.href = url; a.download = `favicon-${size}x${size}.png`; a.click()
  }

  const downloadSvg = () => {
    const blob = new Blob([optimized], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'optimized.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  const htmlSnippet = faviconPreviews.length > 0
    ? `<link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32">\n<link rel="apple-touch-icon" href="/favicon-192x192.png">`
    : ''

  const savedBytes = svgInput.length - optimized.length
  const savings = svgInput.length > 0 && optimized.length > 0 ? Math.round((1 - optimized.length / svgInput.length) * 100) : 0
  const previewSrc = useMemo(() => {
    const s = (optimized || svgInput).trim()
    return s.startsWith('<') ? svgUrl(s) : ''
  }, [optimized, svgInput])

  return (
    <Region domain="studio" className="flex h-full min-h-0 flex-col">
      <Toolbar>
        <div role="tablist" aria-label="SVG tools" className="flex gap-1 rounded-d border border-d-border p-0.5">
          {(['optimize', 'favicon'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              role="tab"
              aria-selected={tab === tabKey}
              onClick={() => { setTab(tabKey); setSvgError(null); setFaviconError(null) }}
              className={cn(
                'cursor-pointer rounded-[calc(var(--d-radius)-2px)] px-3 py-1 text-sm font-medium transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                tab === tabKey ? 'bg-d-accent text-d-accent-ink' : 'text-d-muted hover:bg-d-border/40 hover:text-d-ink',
              )}
            >
              {tabKey === 'optimize' ? t('image.optimize', 'Optimize SVG') : t('common.favicon', 'Favicon Generator')}
            </button>
          ))}
        </div>
        {tab === 'optimize' && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              className="sr-only"
              aria-label={t('image.drop_svg', 'Open SVG file')}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSvgFile(f); e.target.value = '' }}
            />
            <WbButton onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {t('common.choose_file', 'Open file')}
            </WbButton>
            <WbButton primary onClick={optimizeSvg} disabled={optimizing || !svgInput.trim()}>
              {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
              {optimizing ? t('image.optimizing', 'Optimizing') : t('image.optimize', 'Optimize SVG')}
            </WbButton>
          </>
        )}
      </Toolbar>

      {tab === 'optimize' ? (
        <Workbench
          status={
            <StatusBar>
              <span>{t('common.original_size', 'Before')}: {svgInput.length} B</span>
              <span>{t('common.output_size', 'After')}: {optimized ? `${optimized.length} B` : '-'}</span>
              <span aria-live="polite">{optimized ? `${t('image.saved', 'Saved')}: ${savings}% (${savedBytes} B)` : ''}</span>
            </StatusBar>
          }
        >
          <SplitPane
            left={
              <Pane label={t('common.input', 'SVG source')}>
                <CodeArea
                  value={svgInput}
                  onChange={(v) => { setSvgInput(v); setOptimized('') }}
                  placeholder={t('image.svg_placeholder', 'Paste SVG code or open a file')}
                  label={t('common.input', 'SVG source')}
                />
                {svgError && <div className="p-3"><Notice tone="error">{svgError}</Notice></div>}
              </Pane>
            }
            right={
              <div className="flex min-h-0 flex-1 flex-col">
                <Pane label={optimized ? t('common.optimized', 'Preview (optimized)') : 'Preview'} className="flex-[3]">
                  <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-d-surface p-4">
                    {previewSrc
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={previewSrc} alt="SVG preview" className="max-h-full max-w-full rounded-sm bg-white object-contain p-2" />
                      : <p className="text-sm text-d-muted">Paste SVG code and it draws here.</p>}
                  </div>
                </Pane>
                <Pane
                  label={t('common.output', 'Optimized SVG')}
                  className="flex-[2] border-t border-d-border"
                  actions={optimized ? (
                    <>
                      <CopyBtn value={optimized} label={t('common.copy', 'Copy')} />
                      <Btn size="sm" onClick={downloadSvg}><Download className="h-3.5 w-3.5" aria-hidden />SVG</Btn>
                    </>
                  ) : undefined}
                >
                  <CodeArea value={optimized} readOnly label={t('common.optimized', 'Optimized SVG')} placeholder={t('common.no_output', 'Press Optimize SVG to see the result.')} />
                </Pane>
              </div>
            }
          />
        </Workbench>
      ) : faviconPreviews.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {faviconError && <div className="p-4 pb-0"><Notice tone="error">{faviconError}</Notice></div>}
          <DropHero
            accept="image/*"
            onFiles={handleFaviconFiles}
            title={t('image.drop_image_for_favicon', 'Favicon generator')}
            hint="Drop a PNG, SVG, JPG or WebP. It stays on your device."
          />
        </div>
      ) : (
        <Scroll>
          <Column width="lg">
            <Section title={t('image.generated_favicons', 'Generated favicons')} actions={
              <label className="inline-flex h-8 cursor-pointer items-center rounded-d border border-d-border bg-d-raised px-3 text-xs font-medium hover:bg-d-border/40 focus-within:outline-2 focus-within:outline-d-accent">
                {t('common.choose_another', 'Choose another file')}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { handleFaviconFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              </label>
            }>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {faviconPreviews.map(({ size, url }) => (
                  <li key={size} className="flex flex-col items-center gap-2 rounded-d border border-d-border bg-d-raised p-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-sm border border-d-border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} width={Math.min(size, 64)} height={Math.min(size, 64)} alt={`${size}px favicon`} />
                    </div>
                    <span className="font-mono text-xs tabular-nums text-d-muted">{size}×{size}</span>
                    <IconBtn label={`${t('common.download', 'Download')} ${size}×${size}`} onClick={() => downloadFavicon(url, size)}>
                      <Download className="h-4 w-4" aria-hidden />
                    </IconBtn>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title={t('common.html_snippet', 'HTML snippet')} actions={<CopyBtn value={htmlSnippet} label={t('common.copy', 'Copy')} />}>
              <pre className="overflow-auto rounded-d border border-d-border bg-d-raised p-3 font-mono text-xs text-d-muted">{htmlSnippet}</pre>
            </Section>
          </Column>
        </Scroll>
      )}
    </Region>
  )
}
