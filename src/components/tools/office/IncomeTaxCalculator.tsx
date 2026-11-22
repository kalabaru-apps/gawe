'use client'

/**
 * IncomeTaxCalculator - Paper domain (category = office).
 * A worksheet that reads like a tax form; per-bracket breakdown table; result printed in serif.
 * Keep ALL existing calculation logic and the Indonesian domain wording exactly.
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import { Copy, Check, Download, FileText } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Scroll, Field, TextInput, Btn, CopyBtn, Seg, Row, Stat, Notice } from '@/components/domain'
import { FormattedNumberInput } from '@/components/tools/shared/FormattedNumberInput'
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

  const summaryText = useMemo(() => [
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
  ].join('\n'), [result])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col">
      <div className="flex flex-col gap-6">
        {/* Mode selector */}
        <Field id="tax-mode" label={t('office.calculation_mode', 'Calculation mode')}>
          <Seg<Mode>
            value={mode}
            onChange={setMode}
            label={t('office.calculation_mode', 'Mode')}
            options={[
              { value: 'gross-to-thp', label: t('office.mode_gross_to_thp', 'Gross → Take Home Pay') },
              { value: 'thp-to-gross', label: t('office.mode_thp_to_gross', 'Take Home Pay → Gross') },
            ]}
          />
        </Field>

        {/* Input grid */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Field id="tax-amount" label={mode === 'gross-to-thp' ? t('office.gross_salary', 'Gross Monthly Salary') : t('office.known_thp', 'Known Take Home Pay')}>
            <FormattedNumberInput value={amount} onChange={setAmount} min={0} />
          </Field>
          <Field id="tax-ptkp" label={t('office.marital_status', 'Marital / Dependent Status (PTKP)')}>
            <select
              value={ptkp}
              onChange={(e) => setPtkp(e.target.value as PtkpStatus)}
              className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink outline-none focus:ring-2 focus:ring-d-accent cursor-pointer"
            >
              {PTKP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.code} — {t(`office.ptkp_${o.value.toLowerCase()}`, o.descriptor)}</option>
              ))}
            </select>
          </Field>
          <Field id="tax-jkk" label={t('office.jkk_tier', 'Work Risk Level (JKK)')}>
            <select
              value={jkkTier}
              onChange={(e) => setJkkTier(e.target.value as JkkTier)}
              className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink outline-none focus:ring-2 focus:ring-d-accent cursor-pointer"
            >
              {JKK_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>{tier.label} — {t(`office.jkk_example_${tier.value}`, tier.example)}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Employee breakdown - Paper-like result card with serif font */}
        <Region domain="paper" className="rounded-xl border border-d-border bg-d-raised p-6 space-y-2">
          <p className="text-xs font-medium text-d-muted uppercase tracking-wider">{t('office.employee_breakdown', 'Your Paycheck Breakdown')}</p>
          <div className="font-serif text-base space-y-1.5">
            <Row label={t('office.gross_salary', 'Gross Monthly Salary')} value={formatRupiah(result.gross)} />
            <Row label={t('office.pph21', 'Income Tax (PPh 21)')} value={`-${formatRupiah(result.pph21)}`} />
            <Row label={t('office.bpjs_kesehatan', 'BPJS Kesehatan (1%)')} value={`-${formatRupiah(result.bpjsKesehatanEmployee)}`} />
            <Row label={t('office.bpjs_jht', 'BPJS Ketenagakerjaan – JHT (2%)')} value={`-${formatRupiah(result.jhtEmployee)}`} />
            <Row label={t('office.bpjs_jp', 'BPJS Ketenagakerjaan - JP (1%)')} value={`-${formatRupiah(result.jpEmployee)}`} />
            <div className="border-t border-d-border pt-2 mt-2">
              <Row label={t('office.take_home_pay', 'Take Home Pay')} value={formatRupiah(result.takeHomePay)} />
            </div>
          </div>
        </Region>

        {/* Employer breakdown */}
        <Region domain="paper" className="rounded-xl border border-d-border bg-d-raised p-6 space-y-2">
          <p className="text-xs font-medium text-d-muted uppercase tracking-wider">{t('office.employer_breakdown', 'Employer Cost (Not Deducted From You)')}</p>
          <div className="font-serif text-base space-y-1.5">
            <Row label={t('office.bpjs_kesehatan', 'BPJS Kesehatan (4%)')} value={formatRupiah(result.bpjsKesehatanEmployer)} />
            <Row label={t('office.bpjs_jht', 'BPJS Ketenagakerjaan – JHT (3.7%)')} value={formatRupiah(result.jhtEmployer)} />
            <Row label={t('office.bpjs_jp', 'BPJS Ketenagakerjaan – JP (2%)')} value={formatRupiah(result.jpEmployer)} />
            <Row label={t('office.bpjs_jkk', 'BPJS Ketenagakerjaan – JKK')} value={formatRupiah(result.jkkEmployer)} />
            <Row label={t('office.bpjs_jkm', 'BPJS Ketenagakerjaan – JKM (0.3%)')} value={formatRupiah(result.jkmEmployer)} />
            <div className="border-t border-d-border pt-2 mt-2">
              <Row label={t('office.total_cost_company', 'Total Cost to Company')} value={formatRupiah(result.totalCostToCompany)} />
            </div>
          </div>
        </Region>

        {/* Disclaimer */}
        <Notice tone="info" className="text-xs">
          {t('office.ter_disclaimer', 'Uses the TER (Tarif Efektif Rata-rata) monthly withholding method for January–November. December is reconciled separately using annual progressive rates and is not calculated here.')}
        </Notice>

        <div className="flex justify-end">
          <CopyBtn value={summaryText} label={t('action.copy', 'Copy')} />
        </div>
      </div>
    </div>
  )
}