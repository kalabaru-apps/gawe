# Design: Indonesian Tax Calculators (PPh21 / BPJS / PPN)

Date: 2026-07-11
Status: Approved

## Problem

Indonesian payslips typically show only Take Home Pay (THP) without a breakdown of
income tax (PPh 21) and BPJS contributions withheld. Users who only know their gross
salary offer, or only know their THP, have no way to figure out how much they actually
pay in tax and social security each month, or what a competing offer's real take-home
would be.

## Scope

Two new tools in the existing **Office Productivity** category
(`src/components/tools/office/`, `category: 'office'` in `src/config/tools.ts`):

1. **Kalkulator Pajak Penghasilan** (Income Tax Calculator) — PPh 21 + BPJS Kesehatan +
   BPJS Ketenagakerjaan, combined on one page since all three are deducted from the
   same paycheck.
2. **Kalkulator PPN** (VAT Calculator) — consumption tax on purchases, separate page
   (unrelated to payroll).

Both follow the existing office-tool pattern: client component implementing
`ToolProps`, stateless (no localStorage — these are point-in-time calculators like
`Calculator.tsx` / `MeetingCost.tsx`, not persisted logs like `HoursCalculator.tsx`),
bilingual via `useTranslation()`/`office.*` i18n keys, `CopyButton` for exporting a
plain-text summary, `analytics.buttonClick` on primary actions.

## Regulatory data (verified 2026-07-11, two independent sources cross-checked)

All tax/contribution logic lives in a new pure-data/pure-function module:
`src/lib/tax/id-tax-2026.ts` — kept separate from the UI components so the tables are
easy to audit, unit-test, and update when rates change.

### PPh 21 — TER (Tarif Efektif Rata-rata) monthly withholding

Basis: PP 58/2023, technical rates PMK 168/2023, Lampiran I/II/III. This is the
method employers actually use for monthly withholding (Jan–Nov); December uses a
separate annual reconciliation under Art. 17 progressive rates.

PTKP → TER category:
- **Kategori A**: TK/0, TK/1, K/0
- **Kategori B**: TK/2, TK/3, K/1, K/2
- **Kategori C**: K/3

Each category is a full bracket table (44/40/41 rows respectively) mapping monthly
gross income ranges to a flat TER percentage applied to gross income for that month.
Full tables to be hardcoded verbatim in `id-tax-2026.ts` (already extracted and
cross-verified against two independent sources during design research).

**December / annual reconciliation is explicitly out of scope.** The tool computes
Jan–Nov TER withholding only, with a visible disclaimer that December differs because
of annual reconciliation against Art. 17 progressive rates (5%/15%/25%/30%/35%
brackets on annual PKP). Implementing full annual reconciliation would require annual
income history the tool doesn't have.

### BPJS Kesehatan

- Total 5% of monthly wage, split 1% employee / 4% employer
- Wage cap for contribution base: Rp12,000,000 (Perpres 64/2020, unchanged)

### BPJS Ketenagakerjaan

- **JHT** (Jaminan Hari Tua): 5.7% total, 2% employee / 3.7% employer, uncapped
- **JP** (Jaminan Pensiun): 3% total, 1% employee / 2% employer, wage cap
  **Rp11,086,300** (2026 figure, effective March 2026)
- **JKK** (Jaminan Kecelakaan Kerja): employer-only, 5 risk tiers selectable by
  dropdown, each with example industries:
  - Sangat Rendah 0.24% — pekerjaan perkantoran/administratif
  - Rendah 0.54% — perdagangan, retail
  - Sedang 0.89% — industri manufaktur ringan
  - Tinggi 1.27% — konstruksi, pertambangan permukaan
  - Sangat Tinggi 1.74% — konstruksi bawah tanah, pertambangan bawah tanah
- **JKM** (Jaminan Kematian): employer-only, 0.3% flat

### PPN (VAT)

Basis: PMK-11/2025, "DPP Nilai Lain" scheme, effective Feb 1, 2025.
- **Barang/Jasa Umum (non-luxury)**: nominal rate 12%, but DPP = 11/12 × harga jual,
  giving an effective rate of 11% on the sale price
- **Barang Mewah (luxury goods)**: DPP = harga jual directly, PPN = 12% × harga jual
  (full 12%, no 11/12 discount)

## Tool 1: Income Tax Calculator

- Slug: `income-tax-calculator`, id: `income-tax-calculator`
- File: `src/components/tools/office/IncomeTaxCalculator.tsx`
- Icon: `Landmark`

**Inputs:**
- Mode toggle: **Gross → THP** vs **THP → Gross** (reverse solve)
- Salary amount (gross monthly, or known THP depending on mode)
- Marital/dependents status: dropdown covering TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2,
  K/3 (maps internally to TER category A/B/C)
- JKK risk tier dropdown (5 tiers above, default Sedang)

**Reverse-solve algorithm (THP → Gross):**
THP as a function of gross is monotonic *within* a single TER bracket (same flat
rate applied to a larger base always yields more take-home), but **not** monotonic
*across* bracket boundaries: TER applies its rate to the whole income, not just the
marginal slice, so crossing into the next bracket by as little as Rp1 of gross can
retax the entire amount at a higher rate and drop net pay by a large, discontinuous
step (a documented quirk of PP 58/2023's TER system — sometimes multiple gross
values map to the same take-home pay). A single global binary search is invalid
here since it assumes monotonicity end-to-end.

The correct approach: scan the TER bracket table for the resolved category in
ascending gross order; within each bracket the mapping is strictly monotonic, so
binary-search locally inside the first bracket whose take-home range contains the
target. This returns the smallest gross that produces the target take-home pay —
the reasonable canonical answer, and well-defined even when the mapping isn't
globally injective.

**Output — two cards:**
1. **Take-home breakdown** (employee side, this is what changes your paycheck):
   Gross salary → PPh 21 (TER %, amount) → BPJS Kesehatan (1%) → JHT (2%) → JP (1%,
   cap-aware) → **Take Home Pay**
2. **Employer cost** (informational, not deducted from you):
   BPJS Kesehatan (4%) + JHT (3.7%) + JP (2%, cap-aware) + JKK (selected tier) + JKM
   (0.3%) → **Total Cost to Company**

Plain-text summary via `CopyButton`. Disclaimer caption: "TER applies to Jan–Nov
withholding; December is reconciled separately using annual progressive rates — not
calculated here."

## Tool 2: PPN (VAT) Calculator

- Slug: `ppn-calculator`, id: `ppn-calculator`
- File: `src/components/tools/office/VatCalculator.tsx`
- Icon: `Receipt`

**Inputs:**
- Price
- Toggle: price already includes PPN, or not (inclusive/exclusive)
- Goods type: Umum/Non-Mewah (effective 11%) vs Barang Mewah (12%)

**Output:** DPP (tax base), PPN amount, final total — computed correctly in both
inclusive and exclusive directions per the DPP Nilai Lain formula above.

## Wiring

- `src/config/tools.ts`: two new entries under the `office` category (after
  `hours-calculator`), each with `keywords` covering English + Indonesian terms
  (pajak, pph21, tax, ppn, vat, bpjs, gaji, salary, take home pay, ...)
- `src/app/tools/[category]/[tool]/ToolPageClient.tsx`: two new lazy-import entries
  in the `office` registry map
- `src/lib/i18n/en.ts` + `src/lib/i18n/id.ts`: new `office.*` keys for all new UI
  strings (labels, dropdown options, disclaimers), following the existing flat
  key-value convention

## Testing

Since this is a financial calculator, correctness matters more than usual for this
codebase. Plan should include: unit tests (or at minimum manual verification against
the two real payslips used for regulatory research) for:
- TER lookup at bracket boundaries for categories A/B/C
- BPJS caps applied correctly (JP wage cap, BPJS Kesehatan wage cap)
- Reverse-solve (THP→Gross) round-trips: gross → THP → gross should recover the
  original gross within a small tolerance
- PPN inclusive/exclusive round-trip for both goods types
