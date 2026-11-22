'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { downloadPdf } from './downloadPdf'
import { usePdfPages } from './usePdfPages'
import { DropHero, StudioWorkspace, PrimaryAction, Btn, Section, Seg, Notice } from '@/components/domain'

type RotateTarget = 'all' | 'odd' | 'even'
type RotateAngle = 90 | 180 | 270

export default function RotateTab({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const { pages, loading, error, load, reset } = usePdfPages()
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState('')
  const [angle, setAngle] = useState<RotateAngle>(90)
  const [target, setTarget] = useState<RotateTarget>('all')
  const [rotating, setRotating] = useState(false)
  const [rotateError, setRotateError] = useState('')
  const [previewRotation, setPreviewRotation] = useState<Record<number, number>>({})

  const loadFile = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setRotateError('')
    setFileName(file.name)
    setPreviewRotation({})
    const buf = await load(file, 0.3)
    if (buf) {
      setBuffer(buf)
      setAngle(90)
      setTarget('all')
    }
  }, [load])

  const handleThumbClick = useCallback((index: number) => {
    setPreviewRotation((prev) => ({
      ...prev,
      [index]: ((prev[index] || 0) + angle) % 360,
    }))
  }, [angle])

  const rotateAll = useCallback(async () => {
    if (!buffer) return
    setRotateError('')
    setRotating(true)
    try {
      const { PDFDocument, degrees } = await import('pdf-lib')
      const srcDoc = await PDFDocument.load(buffer)
      const pagesArr = srcDoc.getPages()
      pagesArr.forEach((p, i) => {
        const pageNum = i + 1
        const shouldRotate = target === 'all' || (target === 'odd' && pageNum % 2 === 1) || (target === 'even' && pageNum % 2 === 0)
        if (shouldRotate) {
          p.setRotation(degrees((p.getRotation().angle + angle) % 360))
        }
      })
      const bytes = await srcDoc.save()
      downloadPdf(bytes, fileName.replace(/\.pdf$/i, '') + `-rotated-${angle}.pdf`)
      onOutput({ angle, target }, { pages: pagesArr.length })
      analytics.buttonClick('pdf-tools', 'rotate')
    } catch (e) {
      setRotateError(`${t('image.failed_convert', 'Failed to rotate PDF')}: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRotating(false)
    }
  }, [buffer, angle, target, fileName, onOutput, t])

  const busy = loading || rotating

  const ANGLE_OPTS = [
    { value: '90', label: '90°' },
    { value: '180', label: '180°' },
    { value: '270', label: '270°' },
  ]
  const TARGET_OPTS: { value: RotateTarget; label: string }[] = [
    { value: 'all', label: t('image.all_pages', 'All') },
    { value: 'odd', label: t('image.odd_pages', 'Odd') },
    { value: 'even', label: t('image.even_pages', 'Even') },
  ]

  if (pages.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {(error || rotateError) && <div className="p-4 pb-0"><Notice tone="error">{error || rotateError}</Notice></div>}
        {loading ? (
          <p className="m-auto text-sm text-d-muted" role="status">{t('common.processing', 'Reading pages')}</p>
        ) : (
          <DropHero
            accept=".pdf"
            onFiles={loadFile}
            title={t('image.rotate', 'Rotate PDF')}
            hint="Drop a PDF here. It stays on your device."
          />
        )}
      </div>
    )
  }

  return (
    <StudioWorkspace
      rail={
        <div className="flex h-full flex-col gap-5">
          <div>
            <h2 className="font-display text-lg font-semibold">{t('image.rotate', 'Rotate')}</h2>
            <p className="mt-1 break-all text-sm text-d-muted">{fileName}</p>
          </div>
          <p className="text-sm" aria-live="polite">
            <span className="font-display text-3xl font-semibold tabular-nums">{pages.length}</span>
            <span className="text-d-muted"> {t('image.pages', 'pages')}</span>
          </p>
          <Section title={t('common.angle', 'Angle')}>
            <Seg<string> value={String(angle)} onChange={(v) => setAngle(Number(v) as RotateAngle)} options={ANGLE_OPTS} label={t('common.angle', 'Angle')} />
          </Section>
          <Section title={t('image.pages', 'Pages')}>
            <Seg<RotateTarget> value={target} onChange={setTarget} options={TARGET_OPTS} label={t('image.pages', 'Pages')} />
          </Section>
          {error && <Notice tone="error">{error}</Notice>}
          {rotateError && <Notice tone="error">{rotateError}</Notice>}
          <div className="mt-auto flex flex-col gap-2">
            <PrimaryAction onClick={() => void rotateAll()} disabled={busy}>
              {rotating ? t('common.processing', 'Rotating') : `${t('image.rotate', 'Rotate')} & ${t('common.download', 'Download')}`}
            </PrimaryAction>
            <Btn variant="secondary" onClick={() => { setBuffer(null); reset() }}>
              {t('common.choose_another', 'Choose another file')}
            </Btn>
          </div>
        </div>
      }
    >
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-4" role="list" aria-label={t('image.page_previews', 'Page previews')}>
        {pages.map((th) => {
          const rot = previewRotation[th.index] || 0
          return (
            <li key={th.index} className="flex flex-col items-center gap-1.5">
              <div
                onClick={() => handleThumbClick(th.index)}
                className={cn(
                  'relative w-full cursor-pointer rounded-d border-2 bg-d-raised p-1.5 transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                  'border-d-border hover:border-d-muted',
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleThumbClick(th.index) } }}
                aria-label={`${t('image.page', 'Page')} ${th.index + 1}, ${t('image.rotate', 'rotate')} ${angle}°`}
              >
                <img
                  src={th.dataUrl}
                  alt={`${t('image.page', 'Page')} ${th.index + 1}`}
                  className="w-full rounded-sm bg-white"
                  style={{ transform: rot ? `rotate(${rot}deg)` : undefined }}
                />
                {rot !== 0 && (
                  <span className="absolute top-1 right-1 rounded bg-d-accent/90 text-d-accent-ink text-[10px] px-1">
                    {rot}°
                  </span>
                )}
              </div>
              <span className="text-xs tabular-nums text-d-muted">{th.index + 1}</span>
            </li>
          )
        })}
      </ul>
    </StudioWorkspace>
  )
}