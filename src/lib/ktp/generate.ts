import { fakerID_ID as faker } from '@faker-js/faker'
import { buildNik, type Gender } from './nik'
import { randomKabKota, randomProvince, type Province } from './wilayah'

export interface KtpRecord {
  nik: string
  nama: string
  tempatLahir: string
  tanggalLahir: string
  jenisKelamin: Gender
  golonganDarah: string
  alamat: string
  rt: string
  rw: string
  kelurahan: string
  kecamatan: string
  provinsi: string
  kabupatenKota: string
  agama: string
  statusPerkawinan: string
  pekerjaan: string
  kewarganegaraan: string
  berlakuHingga: string
}

const BLOOD_TYPES = ['A', 'B', 'AB', 'O', '-']
const RELIGIONS = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU']
const MARITAL_STATUSES = ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI']
const OCCUPATIONS = [
  'KARYAWAN SWASTA', 'WIRASWASTA', 'PELAJAR/MAHASISWA', 'PEGAWAI NEGERI SIPIL',
  'IBU RUMAH TANGGA', 'BURUH HARIAN LEPAS', 'GURU', 'PETANI/PEKEBUN', 'BELUM/TIDAK BEKERJA',
]
const KECAMATAN_NAMES = [
  'Kebon Jeruk', 'Cempaka Putih', 'Sukajadi', 'Batu Aji', 'Tanjung Mulia', 'Sidoarjo',
  'Pasar Minggu', 'Cibeunying', 'Panakkukang', 'Klojen', 'Rungkut', 'Wonokromo',
  'Gubeng', 'Tegalsari', 'Bojongloa', 'Cimahi Selatan', 'Medan Baru', 'Denpasar Barat',
]
const KELURAHAN_NAMES = [
  'Sukamaju', 'Sukamulya', 'Cempaka Sari', 'Melati Indah', 'Mekar Jaya', 'Tanjung Harapan',
  'Bumi Ayu', 'Cinta Damai', 'Sido Mukti', 'Karya Bakti', 'Mulyorejo', 'Sumber Sari',
  'Rawa Bambu', 'Puri Indah', 'Wates', 'Kalisari', 'Bina Karya', 'Suka Rasa',
]

export interface GenerateOptions {
  province?: Province
  gender?: Gender
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateKtpRecord(options: GenerateOptions = {}): KtpRecord {
  const province = options.province ?? randomProvince()
  const kabkota = randomKabKota(province)
  const gender: Gender = options.gender ?? (Math.random() < 0.5 ? 'male' : 'female')

  const nama = `${faker.person.firstName(gender)} ${faker.person.lastName(gender)}`.toUpperCase()
  const birthDate = faker.date.birthdate({ mode: 'age', min: 17, max: 65 })
  // Kecamatan (district) code isn't in the bundled dataset (province + kabupaten/kota only,
  // see design doc) — randomized within the valid 01-99 range like the rest of the NIK generators
  // that don't ship a full 3-level wilayah table.
  const kecamatanCode = String(faker.number.int({ min: 1, max: 99 })).padStart(2, '0')
  const nik = buildNik({ provinceCode: province.provinceCode, kabkotaCode: kabkota.code, kecamatanCode, birthDate, gender })

  return {
    nik,
    nama,
    tempatLahir: faker.location.city().toUpperCase(),
    tanggalLahir: birthDate.toISOString().slice(0, 10),
    jenisKelamin: gender,
    golonganDarah: pick(BLOOD_TYPES),
    alamat: `JL. ${faker.location.street().toUpperCase()} NO. ${faker.number.int({ min: 1, max: 200 })}`,
    rt: String(faker.number.int({ min: 1, max: 20 })).padStart(3, '0'),
    rw: String(faker.number.int({ min: 1, max: 12 })).padStart(3, '0'),
    kelurahan: `KEL. ${pick(KELURAHAN_NAMES).toUpperCase()}`,
    kecamatan: `KEC. ${pick(KECAMATAN_NAMES).toUpperCase()}`,
    provinsi: province.provinceName,
    kabupatenKota: kabkota.name,
    agama: pick(RELIGIONS),
    statusPerkawinan: pick(MARITAL_STATUSES),
    pekerjaan: pick(OCCUPATIONS),
    kewarganegaraan: 'WNI',
    berlakuHingga: 'SEUMUR HIDUP',
  }
}

export function generateKtpBatch(count: number, options: GenerateOptions = {}): KtpRecord[] {
  const seen = new Set<string>()
  const records: KtpRecord[] = []
  let guard = 0
  const maxAttempts = count * 50
  while (records.length < count && guard < maxAttempts) {
    guard++
    const record = generateKtpRecord(options)
    if (seen.has(record.nik)) continue
    seen.add(record.nik)
    records.push(record)
  }
  return records
}

export const KTP_FIELDS: (keyof KtpRecord)[] = [
  'nik', 'nama', 'tempatLahir', 'tanggalLahir', 'jenisKelamin', 'golonganDarah',
  'alamat', 'rt', 'rw', 'kelurahan', 'kecamatan', 'provinsi', 'kabupatenKota',
  'agama', 'statusPerkawinan', 'pekerjaan', 'kewarganegaraan', 'berlakuHingga',
]

export function ktpRecordsToCsv(records: KtpRecord[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const header = KTP_FIELDS.join(',')
  const rows = records.map((r) => KTP_FIELDS.map((f) => escape(String(r[f]))).join(','))
  return [header, ...rows].join('\n')
}
