# Indonesian Tax Calculators (PPh21 / BPJS / PPN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new Office-category tools — an Income Tax Calculator (PPh 21 + BPJS Kesehatan + BPJS Ketenagakerjaan) and a PPN/VAT Calculator — using real 2026 Indonesian tax regulations.

**Architecture:** All regulatory data and math live in one pure-function module (`src/lib/tax/id-tax-2026.ts`), imported by two stateless client components that follow the existing office-tool UI conventions (`useTranslation`, `CopyButton`, `analytics.buttonClick`). No persistence, no new dependencies.

**Tech Stack:** Next.js (React client components), TypeScript, existing `src/lib/i18n` bilingual system, `npx tsx` for ad-hoc verification (no test framework — this repo has none, see spec).

## Global Constraints

- No localStorage/IndexedDB persistence for these two tools (stateless calculators, matches `Calculator.tsx`/`MeetingCost.tsx`, not `HoursCalculator.tsx`).
- No new npm dependencies, no test framework added.
- Tool `name`/`description` in `src/config/tools.ts` are English-only (matches every existing entry — not translated per locale).
- All user-facing UI strings inside the components go through `t('office.<key>', 'English fallback')` and get matching entries in both `src/lib/i18n/en.ts` and `src/lib/i18n/id.ts`.
- December PPh21 annual reconciliation is explicitly out of scope — Jan–Nov TER method only, with a visible disclaimer.
- Prefix all shell commands with `rtk` per the user's global CLAUDE.md convention (e.g. `rtk git commit`, `rtk npx tsc --noEmit`).

---

### Task 1: Tax/BPJS/PPN data & logic module

**Files:**
- Create: `src/lib/tax/id-tax-2026.ts`
- Temporary (not committed): `scripts/verify-tax.ts`

**Interfaces:**
- Produces (consumed by Task 2 and Task 3):
  - `type PtkpStatus = 'TK0'|'TK1'|'TK2'|'TK3'|'K0'|'K1'|'K2'|'K3'`
  - `type JkkTier = 'sangat_rendah'|'rendah'|'sedang'|'tinggi'|'sangat_tinggi'`
  - `type GoodsType = 'umum'|'mewah'`
  - `PTKP_OPTIONS: { value: PtkpStatus; label: string }[]`
  - `JKK_TIERS: { value: JkkTier; label: string; rate: number; example: string }[]`
  - `interface PaycheckBreakdown { gross, pph21, bpjsKesehatanEmployee, jhtEmployee, jpEmployee, takeHomePay, bpjsKesehatanEmployer, jhtEmployer, jpEmployer, jkkEmployer, jkmEmployer, totalCostToCompany: number }`
  - `interface PpnResult { dpp, ppn, total: number }`
  - `function computePaycheck(gross: number, ptkp: PtkpStatus, jkkTier: JkkTier): PaycheckBreakdown`
  - `function solveGrossFromThp(targetThp: number, ptkp: PtkpStatus, jkkTier: JkkTier): PaycheckBreakdown`
  - `function ppnFromExclusive(priceExclusive: number, goodsType: GoodsType): PpnResult`
  - `function ppnFromInclusive(priceInclusive: number, goodsType: GoodsType): PpnResult`
  - `function terRate(category: 'A'|'B'|'C', grossMonthly: number): number` (exported for verification only)

- [ ] **Step 1: Write the data/logic module**

Create `src/lib/tax/id-tax-2026.ts`:

```ts
// Indonesian payroll & consumption tax calculations, 2026 rates.
// PPh 21 TER tables: PP 58/2023 + PMK 168/2023 (Lampiran I/II/III).
// BPJS Kesehatan: Perpres 64/2020 (5% total, cap Rp12,000,000).
// BPJS Ketenagakerjaan: JHT 5.7%, JP 3% (cap Rp11,086,300, 2026 figure),
//   JKK 0.24%-1.74% by risk tier, JKM 0.3% (all employer-only except JHT/JP employee share).
// PPN: PMK-11/2025 DPP Nilai Lain scheme (11/12 x price @ 12% = 11% effective for non-luxury).

export type TerCategory = 'A' | 'B' | 'C'
export type PtkpStatus = 'TK0' | 'TK1' | 'TK2' | 'TK3' | 'K0' | 'K1' | 'K2' | 'K3'
export type JkkTier = 'sangat_rendah' | 'rendah' | 'sedang' | 'tinggi' | 'sangat_tinggi'
export type GoodsType = 'umum' | 'mewah'

type TerBracket = [number | null, number] // [upTo (inclusive, null = no limit), rate]

const TER_A: TerBracket[] = [
  [5_400_000, 0], [5_650_000, 0.0025], [5_950_000, 0.005], [6_300_000, 0.0075],
  [6_750_000, 0.01], [7_500_000, 0.0125], [8_550_000, 0.015], [9_650_000, 0.0175],
  [10_050_000, 0.02], [10_350_000, 0.0225], [10_700_000, 0.025], [11_050_000, 0.03],
  [11_600_000, 0.035], [12_500_000, 0.04], [13_750_000, 0.05], [15_100_000, 0.06],
  [16_950_000, 0.07], [19_750_000, 0.08], [24_150_000, 0.09], [26_450_000, 0.10],
  [28_000_000, 0.11], [30_050_000, 0.12], [32_400_000, 0.13], [35_400_000, 0.14],
  [39_100_000, 0.15], [43_850_000, 0.16], [47_800_000, 0.17], [51_400_000, 0.18],
  [56_300_000, 0.19], [62_200_000, 0.20], [68_600_000, 0.21], [77_500_000, 0.22],
  [89_000_000, 0.23], [103_000_000, 0.24], [125_000_000, 0.25], [157_000_000, 0.26],
  [206_000_000, 0.27], [337_000_000, 0.28], [454_000_000, 0.29], [550_000_000, 0.30],
  [695_000_000, 0.31], [910_000_000, 0.32], [1_400_000_000, 0.33], [null, 0.34],
]

const TER_B: TerBracket[] = [
  [6_200_000, 0], [6_500_000, 0.0025], [6_850_000, 0.005], [7_300_000, 0.0075],
  [9_200_000, 0.01], [10_750_000, 0.015], [11_250_000, 0.02], [11_600_000, 0.025],
  [12_600_000, 0.03], [13_600_000, 0.04], [14_950_000, 0.05], [16_400_000, 0.06],
  [18_450_000, 0.07], [21_850_000, 0.08], [26_000_000, 0.09], [27_700_000, 0.10],
  [29_350_000, 0.11], [31_450_000, 0.12], [33_950_000, 0.13], [37_100_000, 0.14],
  [41_100_000, 0.15], [45_800_000, 0.16], [49_500_000, 0.17], [53_800_000, 0.18],
  [58_500_000, 0.19], [64_000_000, 0.20], [71_000_000, 0.21], [80_000_000, 0.22],
  [93_000_000, 0.23], [109_000_000, 0.24], [129_000_000, 0.25], [163_000_000, 0.26],
  [211_000_000, 0.27], [374_000_000, 0.28], [459_000_000, 0.29], [555_000_000, 0.30],
  [704_000_000, 0.31], [957_000_000, 0.32], [1_405_000_000, 0.33], [null, 0.34],
]

const TER_C: TerBracket[] = [
  [6_600_000, 0], [6_950_000, 0.0025], [7_350_000, 0.005], [7_800_000, 0.0075],
  [8_850_000, 0.01], [9_800_000, 0.0125], [10_950_000, 0.015], [11_200_000, 0.0175],
  [12_050_000, 0.02], [12_950_000, 0.03], [14_150_000, 0.04], [15_550_000, 0.05],
  [17_050_000, 0.06], [19_500_000, 0.07], [22_700_000, 0.08], [26_600_000, 0.09],
  [28_100_000, 0.10], [30_100_000, 0.11], [32_600_000, 0.12], [35_400_000, 0.13],
  [38_900_000, 0.14], [43_000_000, 0.15], [47_400_000, 0.16], [51_200_000, 0.17],
  [55_800_000, 0.18], [60_400_000, 0.19], [66_700_000, 0.20], [74_500_000, 0.21],
  [83_200_000, 0.22], [95_600_000, 0.23], [110_000_000, 0.24], [134_000_000, 0.25],
  [169_000_000, 0.26], [221_000_000, 0.27], [390_000_000, 0.28], [463_000_000, 0.29],
  [561_000_000, 0.30], [709_000_000, 0.31], [965_000_000, 0.32], [1_419_000_000, 0.33],
  [null, 0.34],
]

const PTKP_TO_CATEGORY: Record<PtkpStatus, TerCategory> = {
  TK0: 'A', TK1: 'A', K0: 'A',
  TK2: 'B', TK3: 'B', K1: 'B', K2: 'B',
  K3: 'C',
}

export const PTKP_OPTIONS: { value: PtkpStatus; label: string }[] = [
  { value: 'TK0', label: 'TK/0 — Single, no dependents' },
  { value: 'TK1', label: 'TK/1 — Single, 1 dependent' },
  { value: 'TK2', label: 'TK/2 — Single, 2 dependents' },
  { value: 'TK3', label: 'TK/3 — Single, 3 dependents' },
  { value: 'K0', label: 'K/0 — Married, no dependents' },
  { value: 'K1', label: 'K/1 — Married, 1 dependent' },
  { value: 'K2', label: 'K/2 — Married, 2 dependents' },
  { value: 'K3', label: 'K/3 — Married, 3 dependents' },
]

export function ptkpToTerCategory(status: PtkpStatus): TerCategory {
  return PTKP_TO_CATEGORY[status]
}

function terTable(category: TerCategory): TerBracket[] {
  if (category === 'A') return TER_A
  if (category === 'B') return TER_B
  return TER_C
}

export function terRate(category: TerCategory, grossMonthly: number): number {
  const table = terTable(category)
  for (const [upTo, rate] of table) {
    if (upTo === null || grossMonthly <= upTo) return rate
  }
  return table[table.length - 1][1]
}

export function pph21Monthly(grossMonthly: number, category: TerCategory): number {
  return Math.round(grossMonthly * terRate(category, grossMonthly))
}

const BPJS_KESEHATAN_CAP = 12_000_000
const BPJS_KESEHATAN_EMPLOYEE_RATE = 0.01
const BPJS_KESEHATAN_EMPLOYER_RATE = 0.04

export function bpjsKesehatanEmployee(grossMonthly: number): number {
  return Math.round(Math.min(grossMonthly, BPJS_KESEHATAN_CAP) * BPJS_KESEHATAN_EMPLOYEE_RATE)
}
export function bpjsKesehatanEmployer(grossMonthly: number): number {
  return Math.round(Math.min(grossMonthly, BPJS_KESEHATAN_CAP) * BPJS_KESEHATAN_EMPLOYER_RATE)
}

const JHT_EMPLOYEE_RATE = 0.02
const JHT_EMPLOYER_RATE = 0.037
const JP_CAP = 11_086_300
const JP_EMPLOYEE_RATE = 0.01
const JP_EMPLOYER_RATE = 0.02
const JKM_EMPLOYER_RATE = 0.003

export const JKK_TIERS: { value: JkkTier; label: string; rate: number; example: string }[] = [
  { value: 'sangat_rendah', label: 'Sangat Rendah (0.24%)', rate: 0.0024, example: 'Office / administrative work' },
  { value: 'rendah', label: 'Rendah (0.54%)', rate: 0.0054, example: 'Trade, retail' },
  { value: 'sedang', label: 'Sedang (0.89%)', rate: 0.0089, example: 'Light manufacturing' },
  { value: 'tinggi', label: 'Tinggi (1.27%)', rate: 0.0127, example: 'Construction, surface mining' },
  { value: 'sangat_tinggi', label: 'Sangat Tinggi (1.74%)', rate: 0.0174, example: 'Underground construction / mining' },
]

export function jhtEmployee(grossMonthly: number): number { return Math.round(grossMonthly * JHT_EMPLOYEE_RATE) }
export function jhtEmployer(grossMonthly: number): number { return Math.round(grossMonthly * JHT_EMPLOYER_RATE) }
export function jpEmployee(grossMonthly: number): number { return Math.round(Math.min(grossMonthly, JP_CAP) * JP_EMPLOYEE_RATE) }
export function jpEmployer(grossMonthly: number): number { return Math.round(Math.min(grossMonthly, JP_CAP) * JP_EMPLOYER_RATE) }

export function jkkEmployer(grossMonthly: number, tier: JkkTier): number {
  const found = JKK_TIERS.find((t) => t.value === tier)
  const rate = found ? found.rate : JKK_TIERS[2].rate
  return Math.round(grossMonthly * rate)
}

export function jkmEmployer(grossMonthly: number): number { return Math.round(grossMonthly * JKM_EMPLOYER_RATE) }

export interface PaycheckBreakdown {
  gross: number
  pph21: number
  bpjsKesehatanEmployee: number
  jhtEmployee: number
  jpEmployee: number
  takeHomePay: number
  bpjsKesehatanEmployer: number
  jhtEmployer: number
  jpEmployer: number
  jkkEmployer: number
  jkmEmployer: number
  totalCostToCompany: number
}

export function computePaycheck(gross: number, ptkp: PtkpStatus, jkkTier: JkkTier): PaycheckBreakdown {
  const category = ptkpToTerCategory(ptkp)
  const pph21 = pph21Monthly(gross, category)
  const bkEmployee = bpjsKesehatanEmployee(gross)
  const jhtE = jhtEmployee(gross)
  const jpE = jpEmployee(gross)
  const takeHomePay = gross - pph21 - bkEmployee - jhtE - jpE
  const bkEmployer = bpjsKesehatanEmployer(gross)
  const jhtR = jhtEmployer(gross)
  const jpR = jpEmployer(gross)
  const jkk = jkkEmployer(gross, jkkTier)
  const jkm = jkmEmployer(gross)
  return {
    gross,
    pph21,
    bpjsKesehatanEmployee: bkEmployee,
    jhtEmployee: jhtE,
    jpEmployee: jpE,
    takeHomePay,
    bpjsKesehatanEmployer: bkEmployer,
    jhtEmployer: jhtR,
    jpEmployer: jpR,
    jkkEmployer: jkk,
    jkmEmployer: jkm,
    totalCostToCompany: gross + bkEmployer + jhtR + jpR + jkk + jkm,
  }
}

export function solveGrossFromThp(targetThp: number, ptkp: PtkpStatus, jkkTier: JkkTier): PaycheckBreakdown {
  let lo = targetThp
  let hi = targetThp * 2 + 10_000_000
  while (computePaycheck(hi, ptkp, jkkTier).takeHomePay < targetThp) {
    hi *= 2
  }
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const thp = computePaycheck(mid, ptkp, jkkTier).takeHomePay
    if (Math.abs(thp - targetThp) < 1) return computePaycheck(Math.round(mid), ptkp, jkkTier)
    if (thp < targetThp) lo = mid
    else hi = mid
  }
  return computePaycheck(Math.round((lo + hi) / 2), ptkp, jkkTier)
}

export interface PpnResult {
  dpp: number
  ppn: number
  total: number
}

export function ppnFromExclusive(priceExclusive: number, goodsType: GoodsType): PpnResult {
  if (goodsType === 'mewah') {
    const dpp = priceExclusive
    const ppn = Math.round(dpp * 0.12)
    return { dpp, ppn, total: dpp + ppn }
  }
  const dpp = (priceExclusive * 11) / 12
  const ppn = Math.round(dpp * 0.12)
  return { dpp: Math.round(dpp), ppn, total: priceExclusive + ppn }
}

export function ppnFromInclusive(priceInclusive: number, goodsType: GoodsType): PpnResult {
  if (goodsType === 'mewah') {
    const dpp = priceInclusive / 1.12
    const ppn = priceInclusive - dpp
    return { dpp: Math.round(dpp), ppn: Math.round(ppn), total: priceInclusive }
  }
  const priceExclusive = priceInclusive / 1.11
  const dpp = (priceExclusive * 11) / 12
  const ppn = priceInclusive - priceExclusive
  return { dpp: Math.round(dpp), ppn: Math.round(ppn), total: priceInclusive }
}
```

- [ ] **Step 2: Write and run the ad-hoc verification script**

Create `scripts/verify-tax.ts` (temporary, not committed):

```ts
import assert from 'node:assert'
import {
  terRate, bpjsKesehatanEmployee, bpjsKesehatanEmployer,
  jhtEmployee, jpEmployee, computePaycheck, solveGrossFromThp,
  ppnFromExclusive, ppnFromInclusive,
} from '../src/lib/tax/id-tax-2026'

// TER category A boundaries
assert.strictEqual(terRate('A', 5_400_000), 0)
assert.strictEqual(terRate('A', 5_400_001), 0.0025)
assert.strictEqual(terRate('A', 9_700_000), 0.02)
assert.strictEqual(terRate('A', 1_500_000_000), 0.34)

// TER category B / C boundaries
assert.strictEqual(terRate('B', 6_200_000), 0)
assert.strictEqual(terRate('B', 6_200_001), 0.0025)
assert.strictEqual(terRate('C', 6_600_000), 0)
assert.strictEqual(terRate('C', 6_600_001), 0.0025)

// BPJS Kesehatan cap at 12,000,000
assert.strictEqual(bpjsKesehatanEmployee(20_000_000), 120_000)
assert.strictEqual(bpjsKesehatanEmployer(20_000_000), 480_000)
assert.strictEqual(bpjsKesehatanEmployee(5_000_000), 50_000)

// JHT uncapped, JP capped at 11,086,300
assert.strictEqual(jhtEmployee(20_000_000), 400_000)
assert.strictEqual(jpEmployee(20_000_000), 110_863)
assert.strictEqual(jpEmployee(5_000_000), 50_000)

// Full paycheck sanity
const p = computePaycheck(10_000_000, 'TK0', 'sedang')
assert.strictEqual(p.pph21, Math.round(10_000_000 * terRate('A', 10_000_000)))
assert.strictEqual(p.takeHomePay, p.gross - p.pph21 - p.bpjsKesehatanEmployee - p.jhtEmployee - p.jpEmployee)
assert.ok(p.totalCostToCompany > p.gross)

// Reverse-solve round trip
const forward = computePaycheck(15_000_000, 'K1', 'tinggi')
const reverse = solveGrossFromThp(forward.takeHomePay, 'K1', 'tinggi')
assert.ok(Math.abs(reverse.gross - 15_000_000) <= 2, `expected ~15,000,000 got ${reverse.gross}`)

// PPN umum (effective 11%) vs mewah (12%)
const ppnUmum = ppnFromExclusive(1_000_000, 'umum')
assert.strictEqual(ppnUmum.ppn, 110_000)
assert.strictEqual(ppnUmum.total, 1_110_000)

const ppnMewah = ppnFromExclusive(1_000_000, 'mewah')
assert.strictEqual(ppnMewah.ppn, 120_000)
assert.strictEqual(ppnMewah.total, 1_120_000)

const incl = ppnFromInclusive(1_110_000, 'umum')
assert.ok(Math.abs(incl.total - 1_110_000) <= 1)

console.log('All tax calculation checks passed.')
```

Run: `rtk npx tsx scripts/verify-tax.ts`
Expected: `All tax calculation checks passed.` with no assertion errors.

If any assertion fails, fix the corresponding bracket/rate in `id-tax-2026.ts` (re-check against the values listed in the "Regulatory data" section of the spec) and re-run until it passes.

- [ ] **Step 3: Delete the verification script and typecheck**

```bash
rm scripts/verify-tax.ts
rtk npx tsc --noEmit
```
Expected: no TypeScript errors related to `src/lib/tax/id-tax-2026.ts`.

- [ ] **Step 4: Commit**

```bash
rtk git add src/lib/tax/id-tax-2026.ts
rtk git commit -m "feat: add Indonesian PPh21/BPJS/PPN calculation module"
```

---

### Task 2: Income Tax Calculator UI

**Files:**
- Create: `src/components/tools/office/IncomeTaxCalculator.tsx`

**Interfaces:**
- Consumes from Task 1: `PTKP_OPTIONS`, `JKK_TIERS`, `computePaycheck`, `solveGrossFromThp`, `PtkpStatus`, `JkkTier`, `PaycheckBreakdown` from `@/lib/tax/id-tax-2026`
- Consumes `ToolProps` from `@/types`, `useTranslation` from `@/lib/i18n`, `analytics` from `@/lib/analytics`, `Button` from `@/components/ui/button`, `CopyButton` from `@/components/tools/shared/CopyButton`

- [ ] **Step 1: Create the component**

Create `src/components/tools/office/IncomeTaxCalculator.tsx`:

```tsx
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
              <option key={o.value} value={o.value}>{o.label}</option>
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
              <option key={tier.value} value={tier.value}>{tier.label} — {tier.example}</option>
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
```

- [ ] **Step 2: Typecheck**

Run: `rtk npx tsc --noEmit`
Expected: no errors referencing `IncomeTaxCalculator.tsx` (errors about it not being wired into `ToolPageClient.tsx`/`tools.ts` yet are expected and resolved in Task 4 — this step only checks the component itself has no type errors).

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/IncomeTaxCalculator.tsx
rtk git commit -m "feat: add Income Tax Calculator UI (PPh21 + BPJS)"
```

---

### Task 3: PPN (VAT) Calculator UI

**Files:**
- Create: `src/components/tools/office/VatCalculator.tsx`

**Interfaces:**
- Consumes from Task 1: `ppnFromExclusive`, `ppnFromInclusive`, `GoodsType`, `PpnResult` from `@/lib/tax/id-tax-2026`

- [ ] **Step 1: Create the component**

Create `src/components/tools/office/VatCalculator.tsx`:

```tsx
'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/tools/shared/CopyButton'
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
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
          className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
        />
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
```

- [ ] **Step 2: Typecheck**

Run: `rtk npx tsc --noEmit`
Expected: no errors referencing `VatCalculator.tsx` (wiring errors resolved in Task 4).

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/office/VatCalculator.tsx
rtk git commit -m "feat: add PPN/VAT Calculator UI"
```

---

### Task 4: Wire up config, routing, and translations

**Files:**
- Modify: `src/config/tools.ts`
- Modify: `src/app/tools/[category]/[tool]/ToolPageClient.tsx`
- Modify: `src/lib/i18n/en.ts`
- Modify: `src/lib/i18n/id.ts`

**Interfaces:**
- Consumes: `ToolDefinition` fields from `@/types` (unchanged), the two new tool slugs `income-tax-calculator` and `ppn-calculator`.

- [ ] **Step 1: Register tools in `src/config/tools.ts`**

Find the `hours-calculator` entry (the last entry before the `// Visual & Design` comment) and add two new entries immediately after it:

```ts
  {
    id: 'income-tax-calculator',
    name: 'Income Tax Calculator (PPh 21)',
    category: 'office',
    description: 'Calculate Indonesian income tax, BPJS Kesehatan, and BPJS Ketenagakerjaan from gross salary or take-home pay',
    icon: 'Landmark',
    slug: 'income-tax-calculator',
    keywords: ['pph21', 'pph 21', 'pajak', 'penghasilan', 'income tax', 'tax', 'bpjs', 'ketenagakerjaan', 'kesehatan', 'gaji', 'salary', 'take home pay', 'thp', 'ter', 'payroll', 'indonesia'],
  },
  {
    id: 'ppn-calculator',
    name: 'VAT Calculator (PPN)',
    category: 'office',
    description: 'Calculate Indonesian VAT (PPN) on purchases, both inclusive and exclusive of tax',
    icon: 'Receipt',
    slug: 'ppn-calculator',
    keywords: ['ppn', 'vat', 'pajak', 'pertambahan', 'nilai', 'tax', 'consumption', 'purchase', 'barang', 'jasa', 'mewah', 'luxury', 'indonesia'],
  },
```

Use the Edit tool with this exact anchor (old_string):
```
    keywords: ['hours', 'working', 'time', 'calculate', 'overtime', 'break', 'timesheet', 'payroll', 'freelance'],
  },
  // Visual & Design
```
new_string: the same text with the two new entries inserted between `  },` and `  // Visual & Design`.

- [ ] **Step 2: Register lazy imports in `ToolPageClient.tsx`**

In the `office:` block of `toolMap`, add after the `hours-calculator` line:

```ts
    'income-tax-calculator': () => import('@/components/tools/office/IncomeTaxCalculator'),
    'ppn-calculator': () => import('@/components/tools/office/VatCalculator'),
```

Use the Edit tool with old_string:
```
    'hours-calculator': () => import('@/components/tools/office/HoursCalculator'),
  },
  visual: {
```
new_string: same text with the two new lines inserted between the `hours-calculator` line and `  },`.

- [ ] **Step 3: Add English translations to `src/lib/i18n/en.ts`**

Use the Edit tool with old_string:
```
  'office.csv_delete_row': 'Delete row',

  // ── Visual & Design ───────────────────────────────────────────────────
```
new_string:
```
  'office.csv_delete_row': 'Delete row',
  'office.mode_gross_to_thp': 'Gross → Take Home Pay',
  'office.mode_thp_to_gross': 'Take Home Pay → Gross',
  'office.gross_salary': 'Gross Monthly Salary',
  'office.known_thp': 'Known Take Home Pay',
  'office.marital_status': 'Marital / Dependent Status (PTKP)',
  'office.jkk_tier': 'Work Risk Level (JKK)',
  'office.employee_breakdown': 'Your Paycheck Breakdown',
  'office.employer_breakdown': 'Employer Cost (Not Deducted From You)',
  'office.pph21': 'Income Tax (PPh 21)',
  'office.bpjs_kesehatan': 'BPJS Kesehatan',
  'office.bpjs_jht': 'BPJS Ketenagakerjaan – JHT',
  'office.bpjs_jp': 'BPJS Ketenagakerjaan – JP',
  'office.bpjs_jkk': 'BPJS Ketenagakerjaan – JKK',
  'office.bpjs_jkm': 'BPJS Ketenagakerjaan – JKM',
  'office.take_home_pay': 'Take Home Pay',
  'office.total_cost_company': 'Total Cost to Company',
  'office.ter_disclaimer': 'Uses the TER (Tarif Efektif Rata-rata) monthly withholding method for January–November. December is reconciled separately using annual progressive rates and is not calculated here.',
  'office.ppn_price': 'Price',
  'office.ppn_price_inclusive': 'Price already includes PPN',
  'office.ppn_goods_type': 'Goods/Service Type',
  'office.ppn_umum': 'General (Non-Luxury) — 11% effective',
  'office.ppn_mewah': 'Luxury Goods — 12%',
  'office.ppn_dpp': 'Tax Base (DPP)',
  'office.ppn_amount': 'PPN Amount',
  'office.ppn_total': 'Total Price',

  // ── Visual & Design ───────────────────────────────────────────────────
```

- [ ] **Step 4: Add Indonesian translations to `src/lib/i18n/id.ts`**

Use the Edit tool with old_string:
```
  'office.csv_delete_row': 'Hapus baris',

  // ── Visual & Design ───────────────────────────────────────────────────
```
new_string:
```
  'office.csv_delete_row': 'Hapus baris',
  'office.mode_gross_to_thp': 'Gaji Kotor → Gaji Bersih',
  'office.mode_thp_to_gross': 'Gaji Bersih → Gaji Kotor',
  'office.gross_salary': 'Gaji Kotor Bulanan',
  'office.known_thp': 'Gaji Bersih (THP) yang Diketahui',
  'office.marital_status': 'Status Pernikahan / Tanggungan (PTKP)',
  'office.jkk_tier': 'Tingkat Risiko Kerja (JKK)',
  'office.employee_breakdown': 'Rincian Gaji Anda',
  'office.employer_breakdown': 'Biaya Perusahaan (Bukan Potongan Gaji Anda)',
  'office.pph21': 'Pajak Penghasilan (PPh 21)',
  'office.bpjs_kesehatan': 'BPJS Kesehatan',
  'office.bpjs_jht': 'BPJS Ketenagakerjaan – JHT',
  'office.bpjs_jp': 'BPJS Ketenagakerjaan – JP',
  'office.bpjs_jkk': 'BPJS Ketenagakerjaan – JKK',
  'office.bpjs_jkm': 'BPJS Ketenagakerjaan – JKM',
  'office.take_home_pay': 'Gaji Bersih (Take Home Pay)',
  'office.total_cost_company': 'Total Biaya untuk Perusahaan',
  'office.ter_disclaimer': 'Menggunakan metode pemotongan bulanan TER (Tarif Efektif Rata-rata) untuk Januari–November. Desember direkonsiliasi terpisah menggunakan tarif progresif tahunan dan tidak dihitung di sini.',
  'office.ppn_price': 'Harga',
  'office.ppn_price_inclusive': 'Harga sudah termasuk PPN',
  'office.ppn_goods_type': 'Jenis Barang/Jasa',
  'office.ppn_umum': 'Umum (Non-Mewah) — efektif 11%',
  'office.ppn_mewah': 'Barang Mewah — 12%',
  'office.ppn_dpp': 'Dasar Pengenaan Pajak (DPP)',
  'office.ppn_amount': 'Jumlah PPN',
  'office.ppn_total': 'Total Harga',

  // ── Visual & Design ───────────────────────────────────────────────────
```

- [ ] **Step 5: Typecheck and lint**

```bash
rtk npx tsc --noEmit
rtk lint
```
Expected: no errors in any of the four modified/created files.

- [ ] **Step 6: Commit**

```bash
rtk git add src/config/tools.ts src/app/tools/[category]/[tool]/ToolPageClient.tsx src/lib/i18n/en.ts src/lib/i18n/id.ts
rtk git commit -m "feat: wire up Income Tax and PPN calculators into Office category"
```

---

### Task 5: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
rtk npm run dev
```
Expected: server starts on `http://localhost:3000` with no compile errors.

- [ ] **Step 2: Verify Income Tax Calculator**

Navigate to `http://localhost:3000/tools/office/income-tax-calculator`.
- Default mode "Gross → Take Home Pay" with gross 10,000,000, TK/0, Sedang tier should show a non-zero PPh 21, BPJS Kesehatan, JHT, JP, and a Take Home Pay less than gross.
- Switch to "Take Home Pay → Gross" mode, enter the Take Home Pay value shown from the previous step — the resulting Gross should round-trip back to ~10,000,000 (within a few rupiah).
- Change PTKP to K/3 and confirm PPh 21 changes (different TER category).
- Change JKK tier and confirm only the employer-cost card changes (employee breakdown/THP unaffected).
- Click the locale toggle (EN/ID) in the app shell and confirm all labels on this page switch language with no missing/raw translation keys visible.
- Click Copy and confirm the clipboard summary text is well-formed.

- [ ] **Step 3: Verify PPN Calculator**

Navigate to `http://localhost:3000/tools/office/ppn-calculator`.
- Enter price 1,000,000, exclusive, Umum — PPN should show 110,000, total 1,110,000.
- Toggle "Price already includes PPN" with the same 1,000,000 — DPP/PPN should now be back-calculated (smaller DPP) and total should equal the entered 1,000,000.
- Switch to Barang Mewah — PPN on exclusive 1,000,000 should show 120,000, total 1,120,000.
- Toggle locale and confirm translations switch correctly.

- [ ] **Step 4: Stop the dev server and report results**

Stop the dev server (Ctrl+C or kill the background process). Note any visual/behavioral issues found; fix and re-verify before considering the feature complete.
