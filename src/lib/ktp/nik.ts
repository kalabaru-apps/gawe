export type Gender = 'male' | 'female'

export interface NikOptions {
  provinceCode: string
  kabkotaCode: string
  kecamatanCode: string
  birthDate: Date
  gender: Gender
  serial?: number
}

/**
 * Builds a 16-digit NIK per the Permendagri structure: PPKKSSDDMMYYSSSS
 * (province, kabupaten/kota, kecamatan, birth date+40 if female, month, year, 4-digit serial).
 */
export function buildNik({ provinceCode, kabkotaCode, kecamatanCode, birthDate, gender, serial }: NikOptions): string {
  const day = birthDate.getDate() + (gender === 'female' ? 40 : 0)
  const month = birthDate.getMonth() + 1
  const year = birthDate.getFullYear() % 100
  const s = serial ?? Math.floor(Math.random() * 10000)
  return [
    provinceCode.padStart(2, '0'),
    kabkotaCode.padStart(2, '0'),
    kecamatanCode.padStart(2, '0'),
    String(day).padStart(2, '0'),
    String(month).padStart(2, '0'),
    String(year).padStart(2, '0'),
    String(s).padStart(4, '0'),
  ].join('')
}

export interface ParsedNik {
  provinceCode: string
  kabkotaCode: string
  kecamatanCode: string
  day: number
  month: number
  yearTwoDigit: number
  gender: Gender
  serial: string
  valid: boolean
  reason?: string
}

export function parseNik(nik: string): ParsedNik {
  if (!/^\d{16}$/.test(nik)) {
    return {
      provinceCode: '', kabkotaCode: '', kecamatanCode: '', day: 0, month: 0, yearTwoDigit: 0,
      gender: 'male', serial: '', valid: false, reason: 'NIK must be exactly 16 digits',
    }
  }
  const provinceCode = nik.slice(0, 2)
  const kabkotaCode = nik.slice(2, 4)
  const kecamatanCode = nik.slice(4, 6)
  const rawDay = Number(nik.slice(6, 8))
  const month = Number(nik.slice(8, 10))
  const yearTwoDigit = Number(nik.slice(10, 12))
  const serial = nik.slice(12, 16)
  const gender: Gender = rawDay > 40 ? 'female' : 'male'
  const day = gender === 'female' ? rawDay - 40 : rawDay
  const valid = day >= 1 && day <= 31 && month >= 1 && month <= 12
  return {
    provinceCode, kabkotaCode, kecamatanCode, day, month, yearTwoDigit, gender, serial,
    valid, reason: valid ? undefined : 'Day/month out of range',
  }
}
