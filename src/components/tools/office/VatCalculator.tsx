'use client'

/**
 * VatCalculator (PPN Calculator) — Paper domain (category = office).
 * Receipt-style result; keep all logic and wording.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { Copy, Check, Receipt } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Scroll, Field, TextInput, Btn, CopyBtn, Row, Stat, Notice } from '@/components/domain'
import { FormattedNumberInput } from '@/components/tools/shared/FormattedNumberInput'
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

  const summaryText = useMemo(() => [
    'PPN Calculation',
    '================',
    `Goods type:    ${goodsType === 'mewah' ? 'Barang Mewah (12%)' : 'Umum / Non-Mewah (11% effective)'}`,
    `Price entered ${inclusive ? '(incl. PPN)' : '(excl. PPN)'}: ${formatRupiah(price)}`,
    `Tax base (DPP): ${formatRupiah(result.dpp)}`,
    `PPN:            ${formatRupiah(result.ppn)}`,
    `Total:          ${formatRupiah(result.total)}`,
  ].join('\n'), [goodsType, inclusive, price, result])

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto py-6 w-full">
        {/* Price input */}
        <Field id="ppn-price" label={t('office.ppn_price', 'Price')}>
          <FormattedNumberInput value={price} onChange={setPrice} min={0} />
        </Field>

        <Field id="ppn-inclusive" label="">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(e) => setInclusive(e.target.checked)}
              className="accent-d-accent"
            />
            {t('office.ppn_price_inclusive', 'Price already includes PPN')}
          </label>
        </Field>

        {/* Goods type selector */}
        <Field id="ppn-type" label={t('office.ppn_goods_type', 'Goods/Service Type')}>
          <div className="flex gap-2">
            <Btn
              variant={goodsType === 'umum' ? 'primary' : 'secondary'}
              onClick={() => setGoodsType('umum')}
            >
              {t('office.ppn_umum', 'General (Non-Luxury) — 11% effective')}
            </Btn>
            <Btn
              variant={goodsType === 'mewah' ? 'primary' : 'secondary'}
              onClick={() => setGoodsType('mewah')}
            >
              {t('office.ppn_mewah', 'Luxury Goods — 12%')}
            </Btn>
          </div>
        </Field>

        {/* Receipt-style result */}
        <Region domain="paper" className="rounded-xl border border-d-border bg-d-raised p-6 space-y-2">
          <div className="flex items-center justify-between mb-4">
            <Receipt className="h-5 w-5 text-d-muted" aria-hidden />
            <h3 className="font-serif text-lg font-semibold">{t('office.ppn_receipt', 'PPN Calculation Receipt')}</h3>
          </div>
          <div className="font-serif text-base space-y-2 border-t border-d-border pt-4">
            <Row label={t('office.ppn_dpp', 'Tax Base (DPP)')} value={formatRupiah(result.dpp)} />
            <Row label={t('office.ppn_amount', 'PPN Amount')} value={formatRupiah(result.ppn)} />
            <div className="border-t border-d-border pt-2 mt-2">
              <Row label={t('office.ppn_total', 'Total Price')} value={formatRupiah(result.total)} />
            </div>
          </div>
        </Region>

        {/* Info notice */}
        <Notice tone="info" className="text-xs">
          {goodsType === 'mewah'
            ? t('office.ppn_luxury_note', 'Luxury goods (Barang Mewah) are taxed at 12% PPN (PPnBM). Standard goods use 11% effective rate under TER.')
            : t('office.ppn_standard_note', 'Standard goods/services use 11% effective PPN rate under TER (Tarif Efektif Rata-rata).')}
        </Notice>

        <div className="flex justify-end">
          <CopyBtn value={summaryText} label={t('action.copy', 'Copy')} />
        </div>
      </div>
    </div>
  )
}