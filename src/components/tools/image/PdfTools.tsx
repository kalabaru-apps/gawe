'use client'

import { useState } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import SplitTab from './pdf-tools/SplitTab'
import MergeTab from './pdf-tools/MergeTab'
import RotateTab from './pdf-tools/RotateTab'
import SignTab from './pdf-tools/SignTab'
import CompressTab from './pdf-tools/CompressTab'

const TABS = ['split', 'merge', 'rotate', 'sign', 'compress'] as const
type Tab = typeof TABS[number]

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

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit flex-wrap">
        {TABS.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${tab === tb ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
          >
            {labels[tb]}
          </button>
        ))}
      </div>

      {/* Each tab stays mounted so switching back and forth doesn't lose in-progress work */}
      <div className={tab === 'split' ? '' : 'hidden'}><SplitTab {...props} /></div>
      <div className={tab === 'merge' ? '' : 'hidden'}><MergeTab {...props} /></div>
      <div className={tab === 'rotate' ? '' : 'hidden'}><RotateTab {...props} /></div>
      <div className={tab === 'sign' ? '' : 'hidden'}><SignTab {...props} /></div>
      <div className={tab === 'compress' ? '' : 'hidden'}><CompressTab {...props} /></div>
    </div>
  )
}
