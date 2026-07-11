'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import {
  PTKP_OPTIONS,
  JKK_TIERS,
  computePaycheck,
  solveGrossFromThp,
  type PtkpStatus,
  type JkkTier,
  type PaycheckBreakdown,
} from '@/lib/tax/id-tax-2026'

type Mode = 'gross-to-thp' | 'thp-to-gross'

function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString('id-ID')}`
}

export default function IncomeTaxCalculator({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('gross-to-thp')
  const [amount, setAmount] = useState(10000000)
  const [ptkp, setPtkp] = useState<PtkpStatus>('TK0')
  const [jkkTier, setJkkTier] = useState<JkkTier>('sedang')
  const firedRef = useRef(false)

  const result: PaycheckBreakdown = useMemo(() => {
    if (mode === 'gross-to-thp') return computePaycheck(amount, ptkp, jkkTier)
    return solveGrossFromThp(amount, ptkp, jkkTier)
  }, [mode, amount, ptkp, jkkTier])

  useEffect(() => {
    if (!firedRef.current) { analytics.buttonClick('income-tax-calculator', 'calculate'); firedRef.current = true }
    onOutput({ mode, amount, ptkp, jkkTier }, { takeHomePay: result.takeHomePay, gross: result.gross, pph21: result.pph21 })
  }, [mode, amount, ptkp, jkkTier, result, onOutput])

  const summaryText = [
    'Income Tax & BPJS Breakdown',
    '============================',
    `Gross salary:           ${formatRupiah(result.gross)}`,
    `PPh 21:                 -${formatRupiah(result.pph21)}`,
    `BPJS Kesehatan (1%):    -${formatRupiah(result.bpjsKesehatanEmployee)}`,
    `JHT (2%):               -${formatRupiah(result.jhtEmployee)}`,
    `JP (1%):                -${formatRupiah(result.jpEmployee)}`,
    `Take Home Pay:           ${formatRupiah(result.takeHomePay)}`,
    '',
    'Employer cost (not deducted from you):',
    `BPJS Kesehatan (4%):     ${formatRupiah(result.bpjsKesehatanEmployer)}`,
    `JHT (3.7%):              ${formatRupiah(result.jhtEmployer)}`,
    `JP (2%):                 ${formatRupiah(result.jpEmployer)}`,
    `JKK:                     ${formatRupiah(result.jkkEmployer)}`,
    `JKM (0.3%):              ${formatRupiah(result.jkmEmployer)}`,
    `Total cost to company:   ${formatRupiah(result.totalCostToCompany)}`,
  ].join('\n')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={mode === 'gross-to-thp' ? 'default' : 'outline'} onClick={() => setMode('gross-to-thp')}>
          {t('office.mode_gross_to_thp', 'Gross → Take Home Pay')}
        </Button>
        <Button size="sm" variant={mode === 'thp-to-gross' ? 'default' : 'outline'} onClick={() => setMode('thp-to-gross')}>
          {t('office.mode_thp_to_gross', 'Take Home Pay → Gross')}
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {mode === 'gross-to-thp' ? t('office.gross_salary', 'Gross Monthly Salary') : t('office.known_thp', 'Known Take Home Pay')}
          </label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.marital_status', 'Marital / Dependent Status (PTKP)')}</label>
          <select
            value={ptkp}
            onChange={(e) => setPtkp(e.target.value as PtkpStatus)}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          >
            {PTKP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.code} — {t(`office.ptkp_${o.value.toLowerCase()}`, o.descriptor)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('office.jkk_tier', 'Work Risk Level (JKK)')}</label>
          <select
            value={jkkTier}
            onChange={(e) => setJkkTier(e.target.value as JkkTier)}
            className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          >
            {JKK_TIERS.map((tier) => (
              <option key={tier.value} value={tier.value}>{tier.label} — {t(`office.jkk_example_${tier.value}`, tier.example)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-input bg-muted/30 p-6 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('office.employee_breakdown', 'Your Paycheck Breakdown')}</p>
        <Row label={t('office.gross_salary', 'Gross Monthly Salary')} value={formatRupiah(result.gross)} />
        <Row label={t('office.pph21', 'Income Tax (PPh 21)')} value={`-${formatRupiah(result.pph21)}`} />
        <Row label={t('office.bpjs_kesehatan', 'BPJS Kesehatan')} value={`-${formatRupiah(result.bpjsKesehatanEmployee)}`} />
        <Row label={t('office.bpjs_jht', 'BPJS Ketenagakerjaan – JHT')} value={`-${formatRupiah(result.jhtEmployee)}`} />
        <Row label={t('office.bpjs_jp', 'BPJS Ketenagakerjaan – JP')} value={`-${formatRupiah(result.jpEmployee)}`} />
        <div className="border-t border-border pt-2 mt-2">
          <Row label={t('office.take_home_pay', 'Take Home Pay')} value={formatRupiah(result.takeHomePay)} bold />
        </div>
      </div>

      <div className="rounded-xl border border-input p-6 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('office.employer_breakdown', 'Employer Cost (Not Deducted From You)')}</p>
        <Row label={t('office.bpjs_kesehatan', 'BPJS Kesehatan')} value={formatRupiah(result.bpjsKesehatanEmployer)} />
        <Row label={t('office.bpjs_jht', 'BPJS Ketenagakerjaan – JHT')} value={formatRupiah(result.jhtEmployer)} />
        <Row label={t('office.bpjs_jp', 'BPJS Ketenagakerjaan – JP')} value={formatRupiah(result.jpEmployer)} />
        <Row label={t('office.bpjs_jkk', 'BPJS Ketenagakerjaan – JKK')} value={formatRupiah(result.jkkEmployer)} />
        <Row label={t('office.bpjs_jkm', 'BPJS Ketenagakerjaan – JKM')} value={formatRupiah(result.jkmEmployer)} />
        <div className="border-t border-border pt-2 mt-2">
          <Row label={t('office.total_cost_company', 'Total Cost to Company')} value={formatRupiah(result.totalCostToCompany)} bold />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('office.ter_disclaimer', 'Uses the TER (Tarif Efektif Rata-rata) monthly withholding method for January–November. December is reconciled separately using annual progressive rates and is not calculated here.')}</p>

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
