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

// TER applies its rate to the WHOLE income, not just the marginal slice above a
// threshold. That means take-home pay is monotonic *within* one TER bracket but can
// drop sharply at a bracket boundary (crossing into the next bracket retaxes the
// entire amount at the higher rate) — a documented quirk of PP 58/2023's TER system.
// A single global binary search over gross would silently return a wrong root near
// those boundaries, so we scan brackets in ascending gross order and binary-search
// only within the first bracket whose take-home range can reach the target — that
// bracket is strictly monotonic, so the search there is always valid. This yields
// the smallest gross that produces the target take-home pay.
function binarySearchInRange(targetThp: number, ptkp: PtkpStatus, jkkTier: JkkTier, lo: number, hi: number): number {
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    const thp = computePaycheck(mid, ptkp, jkkTier).takeHomePay
    if (Math.abs(thp - targetThp) < 1) return mid
    if (thp < targetThp) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function solveGrossFromThp(targetThp: number, ptkp: PtkpStatus, jkkTier: JkkTier): PaycheckBreakdown {
  const category = ptkpToTerCategory(ptkp)
  const table = terTable(category)
  let segStart = 0
  for (const [upTo] of table) {
    const segEnd = upTo === null ? segStart + Math.max(targetThp * 3, 2_000_000_000) : upTo
    const thpAtStart = computePaycheck(segStart, ptkp, jkkTier).takeHomePay
    const thpAtEnd = computePaycheck(segEnd, ptkp, jkkTier).takeHomePay
    if (targetThp >= thpAtStart - 1 && targetThp <= thpAtEnd + 1) {
      const gross = binarySearchInRange(targetThp, ptkp, jkkTier, segStart, segEnd)
      return computePaycheck(Math.round(gross), ptkp, jkkTier)
    }
    segStart = segEnd
  }
  return computePaycheck(Math.round(targetThp), ptkp, jkkTier)
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
