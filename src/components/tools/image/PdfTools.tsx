'use client'

import { useState } from 'react'
import { Scissors, Merge, RotateCw, PenLine, FileDown } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import SplitTab from './pdf-tools/SplitTab'
import MergeTab from './pdf-tools/MergeTab'
import RotateTab from './pdf-tools/RotateTab'
import SignTab from './pdf-tools/SignTab'
import CompressTab from './pdf-tools/CompressTab'

const TABS = ['split', 'merge', 'rotate', 'sign', 'compress'] as const
type Tab = typeof TABS[number]
const ICONS = { split: Scissors, merge: Merge, rotate: RotateCw, sign: PenLine, compress: FileDown }

export default function PdfTools(props: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('split')

  const labels: Record<Tab, string> = {
    split: t('image.split', 'Split'),
    merge: t('image.merge', 'Merge'),
    rotate: t('image.rotate', 'Rotate'),
    sign: t('image.sign', 'Sign'),
    compress: t('image.compress', 'Compress'),
  }
  const blurbs: Record<Tab, string> = {
    split: 'Pull pages out into a new PDF',
    merge: 'Join several PDFs into one',
    rotate: 'Turn pages the right way up',
    sign: 'Place your signature on a page',
    compress: 'Make the file smaller',
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="PDF tools" className="flex shrink-0 gap-2 overflow-x-auto border-b border-d-border bg-d-raised px-4 py-3">
        {TABS.map((tb) => {
          const Icon = ICONS[tb]
          const on = tab === tb
          return (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex min-w-36 cursor-pointer items-center gap-3 rounded-d border px-3 py-2 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent',
                on ? 'border-d-accent bg-d-accent text-d-accent-ink' : 'border-d-border hover:bg-d-border/40',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold">{labels[tb]}</span>
                <span className={cn('hidden truncate text-xs xl:block', on ? 'opacity-85' : 'text-d-muted')}>{blurbs[tb]}</span>
              </span>
            </button>
          )
        })}
      </nav>

      {/* Each tab stays mounted so switching back and forth doesn't lose in-progress work */}
      <div className={cn('min-h-0 flex-1 overflow-auto', tab !== 'split' && 'hidden')}><SplitTab {...props} /></div>
      <div className={cn('min-h-0 flex-1 overflow-auto p-5', tab !== 'merge' && 'hidden')}><MergeTab {...props} /></div>
      <div className={cn('min-h-0 flex-1 overflow-auto p-5', tab !== 'rotate' && 'hidden')}><RotateTab {...props} /></div>
      <div className={cn('min-h-0 flex-1 overflow-auto p-5', tab !== 'sign' && 'hidden')}><SignTab {...props} /></div>
      <div className={cn('min-h-0 flex-1 overflow-auto p-5', tab !== 'compress' && 'hidden')}><CompressTab {...props} /></div>
    </div>
  )
}
