'use client'

import { useState } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

export interface ToolProps {
  onOutput: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  initialState?: Record<string, unknown>
}

interface Variable {
  symbol: string
  name: string
  unit: string
  defaultValue?: number
}

interface ExtraDropdown {
  key: string
  label: string
  options: { value: string; label: string }[]
}

interface Formula {
  id: string
  name: string
  equation: string
  variables: Variable[]
  extraDropdowns?: ExtraDropdown[]
  solve: (
    known: Record<string, number>,
    extras?: Record<string, string>
  ) => { solvedFor: string; result: number; extra?: string } | { error: string }
}

interface Category {
  id: string
  name: string
  formulas: Formula[]
}

const CATEGORIES: Category[] = [
  {
    id: 'kinematika',
    name: 'Kinematika (GLBB)',
    formulas: [
      {
        id: 'glbb_v',
        name: 'Kecepatan akhir (v = v₀ + at)',
        equation: 'v = v₀ + at',
        variables: [
          { symbol: 'v', name: 'Kecepatan akhir', unit: 'm/s' },
          { symbol: 'v0', name: 'Kecepatan awal', unit: 'm/s' },
          { symbol: 'a', name: 'Percepatan', unit: 'm/s²' },
          { symbol: 't', name: 'Waktu', unit: 's' },
        ],
        solve(k) {
          const { v, v0, a, t } = k
          const n = [v, v0, a, t].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          if (v === undefined) return { solvedFor: 'v', result: v0 + a * t }
          if (v0 === undefined) return { solvedFor: 'v0', result: v - a * t }
          if (a === undefined) return { solvedFor: 'a', result: (v - v0) / t }
          if (t === undefined) return { solvedFor: 't', result: (v - v0) / a }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'glbb_s',
        name: 'Perpindahan (s = v₀t + ½at²)',
        equation: 's = v₀t + ½at²',
        variables: [
          { symbol: 's', name: 'Perpindahan', unit: 'm' },
          { symbol: 'v0', name: 'Kecepatan awal', unit: 'm/s' },
          { symbol: 't', name: 'Waktu', unit: 's' },
          { symbol: 'a', name: 'Percepatan', unit: 'm/s²' },
        ],
        solve(k) {
          const { s, v0, t, a } = k
          const n = [s, v0, t, a].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          if (s === undefined) return { solvedFor: 's', result: v0 * t + 0.5 * a * t * t }
          if (v0 === undefined) return { solvedFor: 'v0', result: (s - 0.5 * a * t * t) / t }
          if (a === undefined) return { solvedFor: 'a', result: (2 * (s - v0 * t)) / (t * t) }
          if (t === undefined) {
            // quadratic: ½a·t² + v0·t - s = 0
            if (a === 0) {
              if (v0 === 0) return { error: 'Tidak dapat diselesaikan (a=0, v0=0).' }
              return { solvedFor: 't', result: s / v0 }
            }
            const disc = v0 * v0 + 2 * a * s
            if (disc < 0) return { error: 'Diskriminan negatif, tidak ada solusi real.' }
            const t1 = (-v0 + Math.sqrt(disc)) / a
            const t2 = (-v0 - Math.sqrt(disc)) / a
            const tPos = [t1, t2].filter((x) => x >= 0)
            if (tPos.length === 0) return { error: 'Tidak ada solusi waktu positif.' }
            return { solvedFor: 't', result: Math.min(...tPos) }
          }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'glbb_v2',
        name: 'Kecepatan tanpa waktu (v² = v₀² + 2as)',
        equation: 'v² = v₀² + 2as',
        variables: [
          { symbol: 'v', name: 'Kecepatan akhir', unit: 'm/s' },
          { symbol: 'v0', name: 'Kecepatan awal', unit: 'm/s' },
          { symbol: 'a', name: 'Percepatan', unit: 'm/s²' },
          { symbol: 's', name: 'Perpindahan', unit: 'm' },
        ],
        solve(k) {
          const { v, v0, a, s } = k
          const n = [v, v0, a, s].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          if (v === undefined) {
            const val = v0 * v0 + 2 * a * s
            if (val < 0) return { error: 'Nilai di bawah akar negatif.' }
            return { solvedFor: 'v', result: Math.sqrt(val) }
          }
          if (v0 === undefined) {
            const val = v * v - 2 * a * s
            if (val < 0) return { error: 'Nilai di bawah akar negatif.' }
            return { solvedFor: 'v0', result: Math.sqrt(val) }
          }
          if (a === undefined) return { solvedFor: 'a', result: (v * v - v0 * v0) / (2 * s) }
          if (s === undefined) return { solvedFor: 's', result: (v * v - v0 * v0) / (2 * a) }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
    ],
  },
  {
    id: 'dinamika',
    name: 'Dinamika',
    formulas: [
      {
        id: 'newton2',
        name: 'Hukum Newton II (F = ma)',
        equation: 'F = ma',
        variables: [
          { symbol: 'F', name: 'Gaya', unit: 'N' },
          { symbol: 'm', name: 'Massa', unit: 'kg' },
          { symbol: 'a', name: 'Percepatan', unit: 'm/s²' },
        ],
        solve(k) {
          const { F, m, a } = k
          const n = [F, m, a].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (F === undefined) return { solvedFor: 'F', result: m * a }
          if (m === undefined) return { solvedFor: 'm', result: F / a }
          if (a === undefined) return { solvedFor: 'a', result: F / m }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'berat',
        name: 'Berat (W = mg)',
        equation: 'W = mg',
        variables: [
          { symbol: 'W', name: 'Berat', unit: 'N' },
          { symbol: 'm', name: 'Massa', unit: 'kg' },
          { symbol: 'g', name: 'Percepatan gravitasi', unit: 'm/s²' },
        ],
        solve(k) {
          const { W, m, g } = k
          const n = [W, m, g].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (W === undefined) return { solvedFor: 'W', result: m * g }
          if (m === undefined) return { solvedFor: 'm', result: W / g }
          if (g === undefined) return { solvedFor: 'g', result: W / m }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'momentum',
        name: 'Momentum (p = mv)',
        equation: 'p = mv',
        variables: [
          { symbol: 'p', name: 'Momentum', unit: 'kg·m/s' },
          { symbol: 'm', name: 'Massa', unit: 'kg' },
          { symbol: 'v', name: 'Kecepatan', unit: 'm/s' },
        ],
        solve(k) {
          const { p, m, v } = k
          const n = [p, m, v].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (p === undefined) return { solvedFor: 'p', result: m * v }
          if (m === undefined) return { solvedFor: 'm', result: p / v }
          if (v === undefined) return { solvedFor: 'v', result: p / m }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'ek',
        name: 'Energi Kinetik (Ek = ½mv²)',
        equation: 'Ek = ½mv²',
        variables: [
          { symbol: 'Ek', name: 'Energi kinetik', unit: 'J' },
          { symbol: 'm', name: 'Massa', unit: 'kg' },
          { symbol: 'v', name: 'Kecepatan', unit: 'm/s' },
        ],
        solve(k) {
          const { Ek, m, v } = k
          const n = [Ek, m, v].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (Ek === undefined) return { solvedFor: 'Ek', result: 0.5 * m * v * v }
          if (m === undefined) return { solvedFor: 'm', result: (2 * Ek) / (v * v) }
          if (v === undefined) {
            const val = (2 * Ek) / m
            if (val < 0) return { error: 'Nilai di bawah akar negatif.' }
            return { solvedFor: 'v', result: Math.sqrt(val) }
          }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'ep',
        name: 'Energi Potensial (Ep = mgh)',
        equation: 'Ep = mgh',
        variables: [
          { symbol: 'Ep', name: 'Energi potensial', unit: 'J' },
          { symbol: 'm', name: 'Massa', unit: 'kg' },
          { symbol: 'g', name: 'Percepatan gravitasi', unit: 'm/s²' },
          { symbol: 'h', name: 'Ketinggian', unit: 'm' },
        ],
        solve(k) {
          const { Ep, m, g, h } = k
          const n = [Ep, m, g, h].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          if (Ep === undefined) return { solvedFor: 'Ep', result: m * g * h }
          if (m === undefined) return { solvedFor: 'm', result: Ep / (g * h) }
          if (g === undefined) return { solvedFor: 'g', result: Ep / (m * h) }
          if (h === undefined) return { solvedFor: 'h', result: Ep / (m * g) }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'usaha',
        name: 'Usaha (W = F·s)',
        equation: 'W = F·s',
        variables: [
          { symbol: 'W', name: 'Usaha', unit: 'J' },
          { symbol: 'F', name: 'Gaya', unit: 'N' },
          { symbol: 's', name: 'Perpindahan', unit: 'm' },
        ],
        solve(k) {
          const { W, F, s } = k
          const n = [W, F, s].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (W === undefined) return { solvedFor: 'W', result: F * s }
          if (F === undefined) return { solvedFor: 'F', result: W / s }
          if (s === undefined) return { solvedFor: 's', result: W / F }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'daya',
        name: 'Daya (P = W/t)',
        equation: 'P = W/t',
        variables: [
          { symbol: 'P', name: 'Daya', unit: 'W' },
          { symbol: 'W', name: 'Usaha', unit: 'J' },
          { symbol: 't', name: 'Waktu', unit: 's' },
        ],
        solve(k) {
          const { P, W, t } = k
          const n = [P, W, t].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (P === undefined) return { solvedFor: 'P', result: W / t }
          if (W === undefined) return { solvedFor: 'W', result: P * t }
          if (t === undefined) return { solvedFor: 't', result: W / P }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
    ],
  },
  {
    id: 'listrik',
    name: 'Listrik',
    formulas: [
      {
        id: 'ohm',
        name: 'Hukum Ohm (V = IR)',
        equation: 'V = IR',
        variables: [
          { symbol: 'V', name: 'Tegangan', unit: 'V' },
          { symbol: 'I', name: 'Kuat arus', unit: 'A' },
          { symbol: 'R', name: 'Hambatan', unit: 'Ω' },
        ],
        solve(k) {
          const { V, I, R } = k
          const n = [V, I, R].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (V === undefined) return { solvedFor: 'V', result: I * R }
          if (I === undefined) return { solvedFor: 'I', result: V / R }
          if (R === undefined) return { solvedFor: 'R', result: V / I }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'daya_vi',
        name: 'Daya Listrik (P = VI)',
        equation: 'P = VI',
        variables: [
          { symbol: 'P', name: 'Daya listrik', unit: 'W' },
          { symbol: 'V', name: 'Tegangan', unit: 'V' },
          { symbol: 'I', name: 'Kuat arus', unit: 'A' },
        ],
        solve(k) {
          const { P, V, I } = k
          const n = [P, V, I].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (P === undefined) return { solvedFor: 'P', result: V * I }
          if (V === undefined) return { solvedFor: 'V', result: P / I }
          if (I === undefined) return { solvedFor: 'I', result: P / V }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'daya_i2r',
        name: 'Daya Listrik (P = I²R)',
        equation: 'P = I²R',
        variables: [
          { symbol: 'P', name: 'Daya listrik', unit: 'W' },
          { symbol: 'I', name: 'Kuat arus', unit: 'A' },
          { symbol: 'R', name: 'Hambatan', unit: 'Ω' },
        ],
        solve(k) {
          const { P, I, R } = k
          const n = [P, I, R].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (P === undefined) return { solvedFor: 'P', result: I * I * R }
          if (I === undefined) {
            const val = P / R
            if (val < 0) return { error: 'Nilai di bawah akar negatif.' }
            return { solvedFor: 'I', result: Math.sqrt(val) }
          }
          if (R === undefined) return { solvedFor: 'R', result: P / (I * I) }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'muatan',
        name: 'Muatan Listrik (Q = It)',
        equation: 'Q = It',
        variables: [
          { symbol: 'Q', name: 'Muatan listrik', unit: 'C' },
          { symbol: 'I', name: 'Kuat arus', unit: 'A' },
          { symbol: 't', name: 'Waktu', unit: 's' },
        ],
        solve(k) {
          const { Q, I, t } = k
          const n = [Q, I, t].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (Q === undefined) return { solvedFor: 'Q', result: I * t }
          if (I === undefined) return { solvedFor: 'I', result: Q / t }
          if (t === undefined) return { solvedFor: 't', result: Q / I }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
    ],
  },
  {
    id: 'gelombang',
    name: 'Gelombang & Bunyi',
    formulas: [
      {
        id: 'cepat_rambat',
        name: 'Cepat Rambat Gelombang (v = λf)',
        equation: 'v = λf',
        variables: [
          { symbol: 'v', name: 'Cepat rambat', unit: 'm/s' },
          { symbol: 'λ', name: 'Panjang gelombang', unit: 'm' },
          { symbol: 'f', name: 'Frekuensi', unit: 'Hz' },
        ],
        solve(k) {
          const { v, λ, f } = k
          const n = [v, λ, f].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (v === undefined) return { solvedFor: 'v', result: λ * f }
          if (λ === undefined) return { solvedFor: 'λ', result: v / f }
          if (f === undefined) return { solvedFor: 'f', result: v / λ }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'periode',
        name: 'Periode (T = 1/f)',
        equation: 'T = 1/f',
        variables: [
          { symbol: 'T', name: 'Periode', unit: 's' },
          { symbol: 'f', name: 'Frekuensi', unit: 'Hz' },
        ],
        solve(k) {
          const { T, f } = k
          const n = [T, f].filter((x) => x !== undefined).length
          if (n !== 1) return { error: 'Isi tepat 1 variabel, kosongkan 1 untuk dicari.' }
          if (T === undefined) return { solvedFor: 'T', result: 1 / f }
          if (f === undefined) return { solvedFor: 'f', result: 1 / T }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'gelombang_bunyi',
        name: 'Gelombang Bunyi (v = λf)',
        equation: 'v = λf',
        variables: [
          { symbol: 'v', name: 'Cepat rambat bunyi', unit: 'm/s' },
          { symbol: 'λ', name: 'Panjang gelombang', unit: 'm' },
          { symbol: 'f', name: 'Frekuensi', unit: 'Hz' },
        ],
        solve(k) {
          const { v, λ, f } = k
          const n = [v, λ, f].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (v === undefined) return { solvedFor: 'v', result: λ * f }
          if (λ === undefined) return { solvedFor: 'λ', result: v / f }
          if (f === undefined) return { solvedFor: 'f', result: v / λ }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'doppler',
        name: "Efek Doppler (f' = f(v±vp)/(v±vs))",
        equation: "f' = f × (v + vp_sign·vp) / (v + vs_sign·vs)",
        variables: [
          { symbol: 'f_prime', name: 'Frekuensi yang Didengar', unit: 'Hz' },
          { symbol: 'f', name: 'Frekuensi Sumber', unit: 'Hz' },
          { symbol: 'v', name: 'Cepat Rambat Bunyi', unit: 'm/s', defaultValue: 340 },
          { symbol: 'vp', name: 'Kecepatan Pendengar', unit: 'm/s' },
          { symbol: 'vs', name: 'Kecepatan Sumber', unit: 'm/s' },
        ],
        extraDropdowns: [
          {
            key: 'arah_pendengar',
            label: 'Arah Pendengar',
            options: [
              { value: 'mendekati', label: 'Mendekati sumber (+vp)' },
              { value: 'menjauhi', label: 'Menjauhi sumber (−vp)' },
            ],
          },
          {
            key: 'arah_sumber',
            label: 'Arah Sumber',
            options: [
              { value: 'mendekati', label: 'Mendekati pendengar (−vs)' },
              { value: 'menjauhi', label: 'Menjauhi pendengar (+vs)' },
            ],
          },
        ],
        solve(k, extras) {
          const { f, v, vp, vs } = k
          if (f === undefined || v === undefined || vp === undefined || vs === undefined) {
            return { error: 'Isi semua variabel: f, v, vp, dan vs.' }
          }
          const vpSign = extras?.arah_pendengar === 'mendekati' ? 1 : -1
          const vsSign = extras?.arah_sumber === 'mendekati' ? -1 : 1
          const denom = v + vsSign * vs
          if (denom === 0) return { error: 'Pembagi nol: (v + vs_sign·vs) = 0.' }
          const result = f * (v + vpSign * vp) / denom
          return { solvedFor: 'f_prime', result }
        },
      },
    ],
  },
  {
    id: 'fluida_termo',
    name: 'Fluida & Termodinamika',
    formulas: [
      {
        id: 'massa_jenis',
        name: 'Massa Jenis (ρ = m/V)',
        equation: 'ρ = m/V',
        variables: [
          { symbol: 'ρ', name: 'Massa Jenis', unit: 'kg/m³' },
          { symbol: 'm', name: 'Massa', unit: 'kg' },
          { symbol: 'V', name: 'Volume', unit: 'm³' },
        ],
        solve(k) {
          const { ρ, m, V } = k
          const n = [ρ, m, V].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (ρ === undefined) return { solvedFor: 'ρ', result: m / V }
          if (m === undefined) return { solvedFor: 'm', result: ρ * V }
          if (V === undefined) return { solvedFor: 'V', result: m / ρ }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'tekanan_hidrostatis',
        name: 'Tekanan Hidrostatis (P = ρgh)',
        equation: 'P = ρgh',
        variables: [
          { symbol: 'P', name: 'Tekanan', unit: 'Pa' },
          { symbol: 'ρ', name: 'Massa Jenis Fluida', unit: 'kg/m³' },
          { symbol: 'g', name: 'Percepatan Gravitasi', unit: 'm/s²', defaultValue: 9.8 },
          { symbol: 'h', name: 'Kedalaman', unit: 'm' },
        ],
        solve(k) {
          const { P, ρ, g, h } = k
          const n = [P, ρ, g, h].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          if (P === undefined) return { solvedFor: 'P', result: ρ * g * h }
          if (ρ === undefined) return { solvedFor: 'ρ', result: P / (g * h) }
          if (g === undefined) return { solvedFor: 'g', result: P / (ρ * h) }
          if (h === undefined) return { solvedFor: 'h', result: P / (ρ * g) }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'tekanan_gaya',
        name: 'Tekanan (P = F/A)',
        equation: 'P = F/A',
        variables: [
          { symbol: 'P', name: 'Tekanan', unit: 'Pa' },
          { symbol: 'F', name: 'Gaya', unit: 'N' },
          { symbol: 'A', name: 'Luas Penampang', unit: 'm²' },
        ],
        solve(k) {
          const { P, F, A } = k
          const n = [P, F, A].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (P === undefined) return { solvedFor: 'P', result: F / A }
          if (F === undefined) return { solvedFor: 'F', result: P * A }
          if (A === undefined) return { solvedFor: 'A', result: F / P }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'archimedes',
        name: 'Gaya Apung (Fa = ρVg)',
        equation: 'Fa = ρ × V × g',
        variables: [
          { symbol: 'Fa', name: 'Gaya Apung', unit: 'N' },
          { symbol: 'ρ', name: 'Massa Jenis Fluida', unit: 'kg/m³' },
          { symbol: 'V', name: 'Volume Benda Tercelup', unit: 'm³' },
          { symbol: 'g', name: 'Percepatan Gravitasi', unit: 'm/s²', defaultValue: 9.8 },
        ],
        solve(k) {
          const { Fa, ρ, V, g } = k
          const n = [Fa, ρ, V, g].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          if (Fa === undefined) return { solvedFor: 'Fa', result: ρ * V * g }
          if (ρ === undefined) return { solvedFor: 'ρ', result: Fa / (V * g) }
          if (V === undefined) return { solvedFor: 'V', result: Fa / (ρ * g) }
          if (g === undefined) return { solvedFor: 'g', result: Fa / (ρ * V) }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'konversi_suhu',
        name: 'Konversi Suhu (K = °C + 273)',
        equation: 'K = C + 273.15',
        variables: [
          { symbol: 'C', name: 'Suhu Celcius', unit: '°C' },
          { symbol: 'K', name: 'Suhu Kelvin', unit: 'K' },
        ],
        solve(k) {
          const { C, K } = k
          const n = [C, K].filter((x) => x !== undefined).length
          if (n !== 1) return { error: 'Isi tepat 1 variabel, kosongkan 1 untuk dicari.' }
          if (K === undefined) return { solvedFor: 'K', result: C + 273.15 }
          if (C === undefined) return { solvedFor: 'C', result: K - 273.15 }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
    ],
  },
  {
    id: 'optika',
    name: 'Optika',
    formulas: [
      {
        id: 'cermin_lensa',
        name: 'Cermin & Lensa (1/f = 1/do + 1/di)',
        equation: '1/f = 1/do + 1/di',
        variables: [
          { symbol: 'f', name: 'Jarak Fokus', unit: 'cm' },
          { symbol: 'do', name: 'Jarak Benda', unit: 'cm' },
          { symbol: 'di', name: 'Jarak Bayangan', unit: 'cm' },
        ],
        solve(k) {
          const { f, do: doVal, di } = k
          const n = [f, doVal, di].filter((x) => x !== undefined).length
          if (n !== 2) return { error: 'Isi tepat 2 variabel, kosongkan 1 untuk dicari.' }
          if (f === undefined) {
            if (doVal === 0 || di === 0) return { error: 'Jarak tidak boleh nol.' }
            const result = 1 / (1 / doVal + 1 / di)
            const M = -(di / doVal)
            return { solvedFor: 'f', result, extra: `Perbesaran M = ${formatNumber(M)}×` }
          }
          if (doVal === undefined) {
            if (f === 0 || di === 0) return { error: 'Jarak fokus dan jarak bayangan tidak boleh nol.' }
            const inv = 1 / f - 1 / di
            if (inv === 0) return { error: 'Tidak ada solusi (1/f − 1/di = 0).' }
            const result = 1 / inv
            const M = -(di / result)
            return { solvedFor: 'do', result, extra: `Perbesaran M = ${formatNumber(M)}×` }
          }
          if (di === undefined) {
            if (f === 0 || doVal === 0) return { error: 'Jarak fokus dan jarak benda tidak boleh nol.' }
            const inv = 1 / f - 1 / doVal
            if (inv === 0) return { error: 'Tidak ada solusi (1/f − 1/do = 0).' }
            const result = 1 / inv
            const M = -(result / doVal)
            return { solvedFor: 'di', result, extra: `Perbesaran M = ${formatNumber(M)}×` }
          }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
      {
        id: 'snell',
        name: 'Hukum Snell (n₁ sin θ₁ = n₂ sin θ₂)',
        equation: 'n₁ sin θ₁ = n₂ sin θ₂',
        variables: [
          { symbol: 'n1', name: 'Indeks Bias Medium 1', unit: '' },
          { symbol: 'θ1', name: 'Sudut Datang', unit: '°' },
          { symbol: 'n2', name: 'Indeks Bias Medium 2', unit: '' },
          { symbol: 'θ2', name: 'Sudut Bias', unit: '°' },
        ],
        solve(k) {
          const { n1, θ1, n2, θ2 } = k
          const n = [n1, θ1, n2, θ2].filter((x) => x !== undefined).length
          if (n !== 3) return { error: 'Isi tepat 3 variabel, kosongkan 1 untuk dicari.' }
          const DEG = Math.PI / 180
          if (n1 === undefined) {
            const sinVal = (n2 * Math.sin(θ2 * DEG)) / Math.sin(θ1 * DEG)
            return { solvedFor: 'n1', result: sinVal }
          }
          if (θ1 === undefined) {
            const sinVal = (n2 * Math.sin(θ2 * DEG)) / n1
            if (sinVal < -1 || sinVal > 1) return { error: 'Nilai arcsin di luar jangkauan [-1, 1].' }
            return { solvedFor: 'θ1', result: Math.asin(sinVal) / DEG }
          }
          if (n2 === undefined) {
            const sinVal = (n1 * Math.sin(θ1 * DEG)) / Math.sin(θ2 * DEG)
            return { solvedFor: 'n2', result: sinVal }
          }
          if (θ2 === undefined) {
            const sinVal = (n1 * Math.sin(θ1 * DEG)) / n2
            if (sinVal < -1 || sinVal > 1) return { error: 'Nilai arcsin di luar jangkauan [-1, 1]. Mungkin terjadi pemantulan internal total.' }
            return { solvedFor: 'θ2', result: Math.asin(sinVal) / DEG }
          }
          return { error: 'Kosongkan tepat 1 variabel.' }
        },
      },
    ],
  },
]

function getAllFormulas(): Formula[] {
  return CATEGORIES.flatMap((c) => c.formulas)
}

function getUnit(formula: Formula, symbol: string): string {
  return formula.variables.find((v) => v.symbol === symbol)?.unit ?? ''
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 1e-3 && n !== 0)) {
    return n.toExponential(4)
  }
  const fixed = parseFloat(n.toFixed(6))
  return String(fixed)
}

export default function PhysicsSolver({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [formulaId, setFormulaId] = useState(CATEGORIES[0].formulas[0].id)
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [extras, setExtras] = useState<Record<string, string>>({})
  const [solveResult, setSolveResult] = useState<{
    solvedFor: string
    result: number
    unit: string
    extra?: string
  } | null>(null)
  const [error, setError] = useState('')

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]
  const formula =
    getAllFormulas().find((f) => f.id === formulaId) ?? CATEGORIES[0].formulas[0]

  function handleCategoryChange(id: string) {
    const cat = CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]
    setCategoryId(id)
    setFormulaId(cat.formulas[0].id)
    setInputs({})
    setExtras({})
    setSolveResult(null)
    setError('')
  }

  function handleFormulaChange(id: string) {
    setFormulaId(id)
    setInputs({})
    setExtras({})
    setSolveResult(null)
    setError('')
  }

  function handleInput(symbol: string, value: string) {
    setInputs((prev) => ({ ...prev, [symbol]: value }))
    setSolveResult(null)
    setError('')
  }

  function handleExtra(key: string, value: string) {
    setExtras((prev) => ({ ...prev, [key]: value }))
    setSolveResult(null)
    setError('')
  }

  // Build extras with defaults for dropdowns
  function getEffectiveExtras(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const dd of formula.extraDropdowns ?? []) {
      result[dd.key] = extras[dd.key] ?? dd.options[0]?.value ?? ''
    }
    return result
  }

  function solve() {
    setError('')
    setSolveResult(null)

    const known: Record<string, number> = {}
    for (const v of formula.variables) {
      const raw = inputs[v.symbol]?.trim()
      if (raw !== undefined && raw !== '') {
        const num = parseFloat(raw)
        if (isNaN(num)) {
          setError(`Nilai tidak valid untuk ${v.symbol}: "${raw}"`)
          return
        }
        known[v.symbol] = num
      } else if (v.defaultValue !== undefined && (inputs[v.symbol] === undefined || inputs[v.symbol].trim() === '')) {
        // use defaultValue only if field is untouched/empty
        known[v.symbol] = v.defaultValue
      }
    }

    const effectiveExtras = getEffectiveExtras()
    const result = formula.solve(known, effectiveExtras)
    if ('error' in result) {
      setError(result.error)
      return
    }

    const unit = getUnit(formula, result.solvedFor)
    const displaySymbol = formula.variables.find((v) => v.symbol === result.solvedFor)?.symbol ?? result.solvedFor

    setSolveResult({ solvedFor: displaySymbol, result: result.result, unit, extra: result.extra })

    onOutput(
      { formula: formula.name, inputs: known },
      { solvedFor: result.solvedFor, result: result.result, unit }
    )
  }

  function reset() {
    setInputs({})
    setExtras({})
    setSolveResult(null)
    setError('')
  }

  const effectiveExtras = getEffectiveExtras()

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">{t('physics.category')}</label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">{t('physics.formula')}</label>
          <select
            value={formulaId}
            onChange={(e) => handleFormulaChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {category.formulas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t('physics.formula')}:</span>
          <span className="rounded-md bg-muted px-2 py-1 font-mono text-sm">{formula.equation}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('physics.leave_blank')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {formula.variables.map((v) => (
          <div key={v.symbol} className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <span className="font-mono">{v.symbol}</span>
              <span className="text-muted-foreground">— {v.name}</span>
              {v.unit && <span className="ml-auto text-xs text-muted-foreground">({v.unit})</span>}
            </label>
            <input
              type="number"
              value={inputs[v.symbol] ?? ''}
              onChange={(e) => handleInput(v.symbol, e.target.value)}
              placeholder={v.defaultValue !== undefined ? `default: ${v.defaultValue}` : `${v.symbol}${v.unit ? ` dalam ${v.unit}` : ''}`}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
      </div>

      {formula.extraDropdowns && formula.extraDropdowns.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {formula.extraDropdowns.map((dd) => (
            <div key={dd.key} className="space-y-1">
              <label className="text-sm font-medium">{dd.label}</label>
              <select
                value={effectiveExtras[dd.key]}
                onChange={(e) => handleExtra(dd.key, e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {dd.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => { analytics.buttonClick('physics-solver', 'solve'); solve() }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t('action.solve')}
        </button>
        <button
          onClick={reset}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          {t('action.reset')}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {solveResult && (
        <div className="rounded-md bg-muted p-4 font-mono text-sm space-y-1">
          <div className="text-xs text-muted-foreground font-sans mb-2">{t('physics.result')}:</div>
          <div className="text-base font-semibold">
            {solveResult.solvedFor} = {formatNumber(solveResult.result)}{' '}
            {solveResult.unit}
          </div>
          <div className="text-xs text-muted-foreground font-sans mt-1">
            {formula.variables.find((v) => v.symbol === solveResult.solvedFor)?.name}
          </div>
          {solveResult.extra && (
            <div className="text-sm text-muted-foreground font-sans mt-2 border-t border-border pt-2">
              {solveResult.extra}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
