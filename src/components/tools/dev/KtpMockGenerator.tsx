'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Section, Field, TextInput, Select, Btn, Notice, Scroll, Sheet, Page, Result, Stat, Chip } from '@/components/domain'
import { User, MapPin, Calendar, Mail, Phone, CreditCard, Shield, Copy } from 'lucide-react'

/** Paper + Studio: render the mock as an ID-card-like document with clear "MOCK DATA" labeling */

const PROVINCES = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi', 'Sumatera Selatan',
  'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung', 'Kepulauan Riau',
  'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur',
  'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
  'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat',
  'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Tengah', 'Papua Pegunungan', 'Papua Selatan', 'Papua Barat Daya'
]

const RELIGIONS = ['Islam', 'Kristen Protestan', 'Kristen Katolik', 'Hindu', 'Buddha', 'Khonghucu']
const MARITAL = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
const BLOOD = ['A', 'B', 'AB', 'O', 'Tidak Tahu']

function randomNIK(): string {
  // 16 digits: province(2) + city(2) + district(2) + birthdate(6) + random(4)
  const prov = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')
  const city = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')
  const dist = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const year = String(Math.floor(Math.random() * 30) + 70).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${prov}${city}${dist}${day}${month}${year}${rand}`
}

function randomName(): string {
  const first = ['Ahmad', 'Budi', 'Siti', 'Dewi', 'Agus', 'Rina', 'Andi', 'Maya', 'Rudi', 'Lina']
  const last = ['Santoso', 'Wijaya', 'Hidayat', 'Pratama', 'Saputra', 'Lestari', 'Kusuma', 'Permana', 'Putra', 'Sari']
  return `${first[Math.floor(Math.random() * first.length)]} ${last[Math.floor(Math.random() * last.length)]}`
}

function randomAddress(prov: string): string {
  const streets = ['Jl. Merdeka', 'Jl. Sudirman', 'Jl. Thamrin', 'Jl. Gatot Subroto', 'Jl. Diponegoro', 'Jl. Ahmad Yani']
  const rt = String(Math.floor(Math.random() * 99)).padStart(2, '0')
  const rw = String(Math.floor(Math.random() * 99)).padStart(2, '0')
  return `${streets[Math.floor(Math.random() * streets.length)]} No. ${Math.floor(Math.random() * 999) + 1} RT${rt}/RW${rw} Kel. Sukamaju Kec. Sukajaya ${prov}`
}

export default function KtpMockGenerator({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [nik, setNik] = useState((initialState?.nik as string) ?? randomNIK())
  const [name, setName] = useState((initialState?.name as string) ?? randomName())
  const [place, setPlace] = useState((initialState?.place as string) ?? 'Jakarta')
  const [dob, setDob] = useState((initialState?.dob as string) ?? '1990-01-01')
  const [gender, setGender] = useState((initialState?.gender as string) ?? 'Laki-laki')
  const [blood, setBlood] = useState((initialState?.blood as string) ?? 'O')
  const [address, setAddress] = useState((initialState?.address as string) ?? randomAddress('DKI Jakarta'))
  const [rt, setRt] = useState((initialState?.rt as string) ?? '01')
  const [rw, setRw] = useState((initialState?.rw as string) ?? '02')
  const [kel, setKel] = useState((initialState?.kel as string) ?? 'Sukamaju')
  const [kec, setKec] = useState((initialState?.kec as string) ?? 'Sukajaya')
  const [religion, setReligion] = useState((initialState?.religion as string) ?? 'Islam')
  const [marital, setMarital] = useState((initialState?.marital as string) ?? 'Belum Kawin')
  const [job, setJob] = useState((initialState?.job as string) ?? 'Pegawai Swasta')
  const [citizen, setCitizen] = useState((initialState?.citizen as string) ?? 'WNI')
  const [expired, setExpired] = useState((initialState?.expired as string) ?? 'Seumur Hidup')
  const firedRef = useRef(false)

  function generate() {
    setNik(randomNIK())
    setName(randomName())
    setPlace(PROVINCES[Math.floor(Math.random() * PROVINCES.length)])
    const year = Math.floor(Math.random() * 40) + 1970
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
    setDob(`${year}-${month}-${day}`)
    setGender(Math.random() > 0.5 ? 'Laki-laki' : 'Perempuan')
    setBlood(BLOOD[Math.floor(Math.random() * BLOOD.length)])
    setAddress(randomAddress(PROVINCES[Math.floor(Math.random() * PROVINCES.length)]))
    setReligion(RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)])
    setMarital(MARITAL[Math.floor(Math.random() * MARITAL.length)])
    setJob(['Pegawai Swasta', 'PNS', 'Wiraswasta', 'Pelajar', 'Ibu Rumah Tangga'][Math.floor(Math.random() * 5)])
    if (!firedRef.current) { analytics.buttonClick('ktp-mock-generator', 'generate'); firedRef.current = true }
    onOutput({ nik, name, place, dob, gender, blood, address, rt, rw, kel, kec, religion, marital, job, citizen, expired }, { nik, name })
  }

  return (
    <Region domain="paper">
      <Scroll>
        <Column width="md">
          <Section title={t('dev.ktp_mock', 'KTP Mock Generator')} actions={
            <Chip on={false} onClick={generate}><span className="text-xs">{t('action.generate', 'Generate New')}</span></Chip>
          }>
            <Notice tone="info" className="mb-4 text-center">
              <span className="font-semibold text-d-accent">MOCK DATA</span> — {t('dev.ktp_warning', 'This is generated test data. Not valid for official use.')}
            </Notice>
          </Section>

          <Section title={t('dev.identity', 'Identity')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="nik" label={t('dev.nik', 'NIK')}>
                <TextInput value={nik} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNik(e.target.value)} mono placeholder="16 digits" maxLength={16} />
              </Field>
              <Field id="name" label={t('dev.name', 'Name')}>
                <TextInput value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Full name" />
              </Field>
              <Field id="place" label={t('dev.place', 'Place of Birth')}>
                <TextInput value={place} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlace(e.target.value)} placeholder="City" />
              </Field>
              <Field id="dob" label={t('dev.dob', 'Date of Birth')}>
                <input type="date" value={dob} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDob(e.target.value)} className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm outline-none focus:border-d-accent" />
              </Field>
              <Field id="gender" label={t('dev.gender', 'Gender')}>
                <Select value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </Select>
              </Field>
              <Field id="blood" label={t('dev.blood', 'Blood Type')}>
                <Select value={blood} onChange={e => setBlood(e.target.value)}>
                  {BLOOD.map(b => <option key={b} value={b}>{b}</option>)}
                </Select>
              </Field>
            </div>
          </Section>

          <Section title={t('dev.address', 'Address')}>
            <Field id="address" label={t('dev.address', 'Street Address')}>
              <TextInput value={address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)} placeholder="Street, number, RT/RW" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-4">
              <Field id="rt" label="RT"><TextInput value={rt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRt(e.target.value)} maxLength={2} /></Field>
              <Field id="rw" label="RW"><TextInput value={rw} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRw(e.target.value)} maxLength={2} /></Field>
              <Field id="kel" label={t('dev.kelurahan', 'Kelurahan')}>
                <TextInput value={kel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKel(e.target.value)} placeholder="Kelurahan/Desa" />
              </Field>
              <Field id="kec" label={t('dev.kecamatan', 'Kecamatan')}>
                <TextInput value={kec} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKec(e.target.value)} placeholder="Kecamatan" />
              </Field>
            </div>
          </Section>

          <Section title={t('dev.other', 'Other Info')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="religion" label={t('dev.religion', 'Religion')}>
                <Select value={religion} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReligion(e.target.value)}>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </Select>
              </Field>
              <Field id="marital" label={t('dev.marital', 'Marital Status')}>
                <Select value={marital} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMarital(e.target.value)}>
                  {MARITAL.map(m => <option key={m} value={m}>{m}</option>)}
                </Select>
              </Field>
              <Field id="job" label={t('dev.job', 'Occupation')}>
                <TextInput value={job} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJob(e.target.value)} placeholder="Job" />
              </Field>
              <Field id="citizen" label={t('dev.citizen', 'Citizenship')}>
                <Select value={citizen} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCitizen(e.target.value)}>
                  <option value="WNI">WNI</option>
                  <option value="WNA">WNA</option>
                </Select>
              </Field>
              <Field id="expired" label={t('dev.expired', 'Valid Until')}>
                <TextInput value={expired} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpired(e.target.value)} placeholder="Seumur Hidup / YYYY-MM-DD" />
              </Field>
            </div>
          </Section>

          <div className="flex gap-2">
            <Btn variant="primary" onClick={generate}>{t('action.regenerate', 'Regenerate')}</Btn>
            <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify({ nik, name, place, dob, gender, blood, address, rt, rw, kel, kec, religion, marital, job, citizen, expired }, null, 2))}>
              <Copy className="h-3.5 w-3.5" aria-hidden /> {t('action.copy_json', 'Copy JSON')}
            </Btn>
          </div>

          <Sheet>
            <Page className="relative">
              <div className="absolute top-2 right-2 text-xs text-red-500 font-semibold bg-red-500/10 px-2 py-0.5 rounded">
                MOCK DATA
              </div>
              <div className="aspect-[85/54] bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900 rounded-lg border border-stone-300 dark:border-stone-700 p-4 shadow-lg relative">
                <div className="text-center mb-3">
                  <p className="font-bold text-lg tracking-wider">REPUBLIK INDONESIA</p>
                  <p className="font-semibold text-sm">KARTU TANDA PENDUDUK</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="col-span-2">
                    <p className="font-mono text-base font-bold tracking-wider">{nik}</p>
                    <p className="text-stone-500 dark:text-stone-400">NIK</p>
                  </div>
                  <div className="row-span-2 flex items-center justify-center">
                    <div className="w-20 h-24 bg-stone-300 dark:bg-stone-600 rounded flex items-center justify-center">
                      <User className="h-10 w-10 text-stone-500" />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <div className="flex justify-between"><span>{t('dev.name', 'Nama')}</span><span className="font-medium">{name}</span></div>
                    <div className="flex justify-between"><span>{t('dev.place', 'Tempat/Tgl Lahir')}</span><span className="font-medium">{place}, {dob}</span></div>
                    <div className="flex justify-between"><span>{t('dev.gender', 'Jenis Kelamin')}</span><span className="font-medium">{gender}</span></div>
                    <div className="flex justify-between"><span>{t('dev.blood', 'Gol Darah')}</span><span className="font-medium">{blood}</span></div>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <div className="flex justify-between"><span>{t('dev.address', 'Alamat')}</span><span className="font-medium">{address}</span></div>
                    <div className="flex justify-between"><span>RT/RW</span><span className="font-medium">{rt}/{rw}</span></div>
                    <div className="flex justify-between"><span>{t('dev.kelurahan', 'Kel/Desa')}</span><span className="font-medium">{kel}</span></div>
                    <div className="flex justify-between"><span>{t('dev.kecamatan', 'Kecamatan')}</span><span className="font-medium">{kec}</span></div>
                    <div className="flex justify-between"><span>{t('dev.religion', 'Agama')}</span><span className="font-medium">{religion}</span></div>
                    <div className="flex justify-between"><span>{t('dev.marital', 'Status')}</span><span className="font-medium">{marital}</span></div>
                    <div className="flex justify-between"><span>{t('dev.job', 'Pekerjaan')}</span><span className="font-medium">{job}</span></div>
                    <div className="flex justify-between"><span>{t('dev.citizen', 'Kewarganegaraan')}</span><span className="font-medium">{citizen}</span></div>
                    <div className="flex justify-between"><span>{t('dev.expired', 'Berlaku Hingga')}</span><span className="font-medium">{expired}</span></div>
                  </div>
                </div>
              </div>
            </Page>
          </Sheet>
        </Column>
      </Scroll>
    </Region>
  )
}