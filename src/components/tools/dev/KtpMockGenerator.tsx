'use client'

import { useMemo, useState } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { WILAYAH } from '@/lib/ktp/wilayah'
import { generateKtpBatch, ktpRecordsToCsv, type KtpRecord } from '@/lib/ktp/generate'

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function KtpMockGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [provinceCode, setProvinceCode] = useState((initialState?.provinceCode as string) ?? '')
  const [gender, setGender] = useState<'random' | 'male' | 'female'>((initialState?.gender as 'random' | 'male' | 'female') ?? 'random')
  const [count, setCount] = useState<number>((initialState?.count as number) ?? 10)
  const [records, setRecords] = useState<KtpRecord[]>([])
  const [detailRecord, setDetailRecord] = useState<KtpRecord | null>(null)

  const province = useMemo(() => WILAYAH.find((p) => p.provinceCode === provinceCode), [provinceCode])

  function generate() {
    const batch = generateKtpBatch(count, {
      province,
      gender: gender === 'random' ? undefined : gender,
    })
    setRecords(batch)
    analytics.buttonClick('ktp-mock-generator', 'generate')
    onOutput({ provinceCode, gender, count }, { rowCount: batch.length })
  }

  function exportJson() {
    downloadFile('ktp-mock-data.json', JSON.stringify(records, null, 2), 'application/json')
  }

  function exportCsv() {
    downloadFile('ktp-mock-data.csv', ktpRecordsToCsv(records), 'text/csv')
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
        {t('dev.ktp_disclaimer', 'Generated data is fictional and for QA/staging use only — every record carries a SAMPLE watermark and cannot be used as a real ID.')}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.ktp_province', 'Province')}</label>
          <select
            value={provinceCode}
            onChange={(e) => setProvinceCode(e.target.value)}
            className="text-sm border border-input rounded-md px-2 py-1.5 bg-background min-w-[180px]"
          >
            <option value="">{t('dev.ktp_random', 'Random')}</option>
            {WILAYAH.map((p) => (
              <option key={p.provinceCode} value={p.provinceCode}>{p.provinceName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.ktp_gender', 'Gender')}</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as 'random' | 'male' | 'female')}
            className="text-sm border border-input rounded-md px-2 py-1.5 bg-background"
          >
            <option value="random">{t('dev.ktp_random', 'Random')}</option>
            <option value="male">{t('dev.ktp_male', 'Male')}</option>
            <option value="female">{t('dev.ktp_female', 'Female')}</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('dev.ktp_count', 'Row count')}</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value))))}
            className="w-24 text-sm border border-input rounded-md px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          onClick={generate}
          className="py-1.5 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {t('dev.ktp_generate', 'Generate')}
        </button>
        {records.length > 0 && (
          <div className="flex gap-2 ml-auto">
            <button onClick={exportJson} className="py-1.5 px-3 rounded-md border border-input text-sm hover:bg-muted/50">
              {t('dev.ktp_export_json', 'Export JSON')}
            </button>
            <button onClick={exportCsv} className="py-1.5 px-3 rounded-md border border-input text-sm hover:bg-muted/50">
              {t('dev.ktp_export_csv', 'Export CSV')}
            </button>
          </div>
        )}
      </div>

      {records.length > 0 && (
        <div className="border border-input rounded-md overflow-auto max-h-[420px]">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left">
                <th className="px-2 py-1.5 font-medium">{t('dev.ktp_nik', 'NIK')}</th>
                <th className="px-2 py-1.5 font-medium">{t('dev.ktp_name', 'Nama')}</th>
                <th className="px-2 py-1.5 font-medium">{t('dev.ktp_gender', 'Gender')}</th>
                <th className="px-2 py-1.5 font-medium">{t('dev.ktp_city', 'Kabupaten/Kota')}</th>
                <th className="px-2 py-1.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.nik} className="border-t border-border hover:bg-muted/30">
                  <td className="px-2 py-1.5 font-mono">{r.nik}</td>
                  <td className="px-2 py-1.5">{r.nama}</td>
                  <td className="px-2 py-1.5">{r.jenisKelamin === 'male' ? t('dev.ktp_male', 'Male') : t('dev.ktp_female', 'Female')}</td>
                  <td className="px-2 py-1.5">{r.kabupatenKota}</td>
                  <td className="px-2 py-1.5 text-right">
                    <button onClick={() => setDetailRecord(r)} className="text-primary hover:underline">
                      {t('dev.ktp_detail', 'Show detail')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detailRecord} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dev.ktp_detail', 'Show detail')}</DialogTitle>
          </DialogHeader>
          {detailRecord && <KtpCard record={detailRecord} t={t} />}
          {detailRecord && (
            <div className="flex justify-end gap-2">
              <CopyButton value={JSON.stringify(detailRecord, null, 2)} />
              <button
                onClick={() => downloadFile(`ktp-${detailRecord.nik}.json`, JSON.stringify(detailRecord, null, 2), 'application/json')}
                className="text-sm py-1.5 px-3 rounded-md border border-input hover:bg-muted/50"
              >
                {t('dev.ktp_export_json', 'Export JSON')}
              </button>
              <button
                onClick={() => downloadFile(`ktp-${detailRecord.nik}.csv`, ktpRecordsToCsv([detailRecord]), 'text/csv')}
                className="text-sm py-1.5 px-3 rounded-md border border-input hover:bg-muted/50"
              >
                {t('dev.ktp_export_csv', 'Export CSV')}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KtpCard({ record, t }: { record: KtpRecord; t: (key: string, fallback?: string) => string }) {
  const rows: [string, string][] = [
    ['NIK', record.nik],
    [t('dev.ktp_name', 'Nama'), record.nama],
    [t('dev.ktp_birth', 'Tempat/Tgl Lahir'), `${record.tempatLahir}, ${record.tanggalLahir}`],
    [t('dev.ktp_gender', 'Gender'), record.jenisKelamin === 'male' ? 'LAKI-LAKI' : 'PEREMPUAN'],
    ['Gol. Darah', record.golonganDarah],
    [t('dev.ktp_address', 'Alamat'), record.alamat],
    ['RT/RW', `${record.rt}/${record.rw}`],
    ['Kel/Desa', record.kelurahan],
    ['Kecamatan', record.kecamatan],
    ['Agama', record.agama],
    ['Status Perkawinan', record.statusPerkawinan],
    ['Pekerjaan', record.pekerjaan],
    ['Kewarganegaraan', record.kewarganegaraan],
    ['Berlaku Hingga', record.berlakuHingga],
  ]

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-sky-600 bg-gradient-to-br from-sky-50 to-sky-100 p-4 text-sky-950 dark:from-sky-950 dark:to-sky-900 dark:text-sky-50">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span className="rotate-[-30deg] select-none whitespace-nowrap text-4xl font-black tracking-widest text-sky-900/20 dark:text-sky-100/10">
          {t('dev.ktp_watermark', 'CONTOH / SAMPLE')}
        </span>
      </div>
      <div className="relative flex gap-4">
        <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded border border-sky-700/40 bg-sky-200/60 text-sky-700/70 dark:bg-sky-800/40 dark:text-sky-200/60">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-semibold tracking-wide">PROVINSI {record.provinsi}</p>
          <p className="text-[10px] font-semibold tracking-wide mb-2">{record.kabupatenKota}</p>
          <table className="w-full text-[11px] leading-tight">
            <tbody>
              {rows.map(([label, value]) => (
                <tr key={label}>
                  <td className="w-[38%] align-top pr-1 font-medium">{label}</td>
                  <td className="align-top pr-1">:</td>
                  <td className="align-top">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
