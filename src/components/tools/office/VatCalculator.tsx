'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { FormattedNumberInput } from '@/components/tools/shared/FormattedNumberInput'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { ppnFromExclusive, ppnFromInclusive, type GoodsType, type PpnResult } from '@/lib/tax/id-tax-2026'

function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

export default function VatCalculator({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [price, setPrice] = useState(1000000)
  const [inclusive, setInclusive] = useState(false)
  const [goodsType, setGoodsType] = useState<GoodsType>('umum')
  const firedRef = useRef(false)

  const result: PpnResult = useMemo(() => {
    return inclusive ? ppnFromInclusive(price, goodsType) : ppnFromExclusive(price, goodsType)
  }, [price, inclusive, goodsType])

  useEffect(() => {
    if (!firedRef.current) { analytics.buttonClick('ppn-calculator', 'calculate'); firedRef.current = true }
    onOutput({ price, inclusive, goodsType }, { dpp: result.dpp, ppn: result.ppn, total: result.total })
  }, [price, inclusive, goodsType, result, onOutput])

  const summaryText = [
    'PPN Calculation',
    '================',
    `Goods type:    ${goodsType === 'mewah' ? 'Barang Mewah (12%)' : 'Umum / Non-Mewah (11% effective)'}`,
    `Price entered ${inclusive ? '(incl. PPN)' : '(excl. PPN)'}: ${formatRupiah(price)}`,
    `Tax base (DPP): ${formatRupiah(result.dpp)}`,
    `PPN:            ${formatRupiah(result.ppn)}`,
    `Total:          ${formatRupiah(result.total)}`,
  ].join('\n')

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.ppn_price', 'Price')}</label>
        <FormattedNumberInput value={price} onChange={setPrice} min={0} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} className="accent-primary" />
        {t('office.ppn_price_inclusive', 'Price already includes PPN')}
      </label>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.ppn_goods_type', 'Goods/Service Type')}</label>
        <div className="flex gap-2">
          <Button size="sm" variant={goodsType === 'umum' ? 'default' : 'outline'} onClick={() => setGoodsType('umum')}>
            {t('office.ppn_umum', 'General (Non-Luxury) — 11% effective')}
          </Button>
          <Button size="sm" variant={goodsType === 'mewah' ? 'default' : 'outline'} onClick={() => setGoodsType('mewah')}>
            {t('office.ppn_mewah', 'Luxury Goods — 12%')}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-input bg-muted/30 p-6 space-y-2">
        <Row label={t('office.ppn_dpp', 'Tax Base (DPP)')} value={formatRupiah(result.dpp)} />
        <Row label={t('office.ppn_amount', 'PPN Amount')} value={formatRupiah(result.ppn)} />
        <div className="border-t border-border pt-2 mt-2">
          <Row label={t('office.ppn_total', 'Total Price')} value={formatRupiah(result.total)} bold />
        </div>
      </div>

      <div className="flex justify-end">
        <CopyButton value={summaryText} />
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono ${bold ? 'font-semibold text-foreground' : ''}`}>{value}</span>
    </div>
  )
}
