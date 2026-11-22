'use client'

import { useState, useEffect, useRef } from 'react'
import { faker } from '@faker-js/faker'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Row, CopyBtn, Stat, Section, Field, TextInput, Select, Btn, Notice, Scroll, Chip } from '@/components/domain'

const LOCALES = ['en', 'zh_CN', 'ja', 'ko', 'de', 'fr', 'es', 'pt_BR', 'ru', 'ar']
const TEMPLATES = [
  { key: 'name', label: 'Full Name', fn: () => faker.person.fullName() },
  { key: 'email', label: 'Email', fn: () => faker.internet.email() },
  { key: 'phone', label: 'Phone', fn: () => faker.phone.number() },
  { key: 'address', label: 'Address', fn: () => faker.location.streetAddress() },
  { key: 'company', label: 'Company', fn: () => faker.company.name() },
  { key: 'job', label: 'Job Title', fn: () => faker.person.jobTitle() },
  { key: 'uuid', label: 'UUID', fn: () => faker.string.uuid() },
  { key: 'ip', label: 'IPv4', fn: () => faker.internet.ip() },
  { key: 'url', label: 'URL', fn: () => faker.internet.url() },
  { key: 'lorem', label: 'Lorem', fn: () => faker.lorem.sentence() },
  { key: 'date', label: 'Date', fn: () => faker.date.recent().toISOString().slice(0, 10) },
  { key: 'price', label: 'Price', fn: () => faker.commerce.price() },
  { key: 'credit', label: 'Credit Card', fn: () => faker.finance.creditCardNumber() },
]

export default function FakeDataGenerator({ onOutput, initialState }: any) {
  const { t } = useTranslation()
  const [count, setCount] = useState((initialState?.count as number) ?? 10)
  const [locale, setLocale] = useState((initialState?.locale as string) ?? 'en')
  const [selected, setSelected] = useState<string[]>((initialState?.selected as string[]) ?? ['name', 'email', 'phone'])
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const firedRef = useRef(false)

  useEffect(() => {
    try {
      faker.seed(Math.floor(Math.random() * 1e9))
      const result: any[] = []
      for (let i = 0; i < count; i++) {
        const obj: Record<string, string> = {}
        for (const key of selected) {
          const tmpl = TEMPLATES.find(t => t.key === key)
          if (tmpl) obj[key] = tmpl.fn()
        }
        result.push(obj)
      }
      setRows(result)
      setError(null)
      if (!firedRef.current) { analytics.buttonClick('fake-data-generator', 'generate'); firedRef.current = true }
      onOutput({ count, locale, fields: selected }, { rows: result })
    } catch (e) {
      setError((e as Error).message)
      setRows([])
    }
  }, [count, locale, selected])

  return (
    <Region domain="workbench">
      <Scroll>
        <Column width="lg">
          <Section title={t('dev.fake_data', 'Fake Data Generator')}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="count" label={t('dev.count', 'Count')}>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={count}
                  onChange={e => setCount(Math.max(1, Math.min(1000, Number(e.target.value))))}
                  className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink focus:border-d-accent outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-accent"
                />
              </Field>
              <Field id="locale" label={t('dev.locale', 'Locale')}>
                <Select value={locale} onChange={e => setLocale(e.target.value)}>
                  {LOCALES.map(l => <option key={l} value={l}>{l}</option>)}
                </Select>
              </Field>
            </div>
          </Section>

          <Section title={t('dev.fields', 'Fields')}>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map(t => (
                <Chip
                  key={t.key}
                  on={selected.includes(t.key)}
                  onClick={() => setSelected(s => s.includes(t.key) ? s.filter(x => x !== t.key) : [...s, t.key])}
                >
                  {t.label}
                </Chip>
              ))}
            </div>
            {selected.length === 0 && <Notice tone="error">{t('dev.select_field', 'Select at least one field')}</Notice>}
          </Section>

          {error && <Notice tone="error">{error}</Notice>}

          {rows.length > 0 && (
            <Section title={t('action.result', 'Generated Data')}>
              <Stat label={t('dev.rows', 'Rows')} value={rows.length} />
              <div className="overflow-auto max-h-96">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-d-border text-d-muted">
                      <th className="p-2 font-mono">#</th>
                      {selected.map(k => <th key={k} className="p-2">{TEMPLATES.find(t => t.key === k)?.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-d-border/50">
                        <td className="p-2 font-mono text-d-muted">{i + 1}</td>
                        {selected.map(k => (
                          <td key={k} className="p-2 font-mono text-sm">{row[k]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-3">
                <Btn variant="primary" onClick={() => { faker.seed(Math.floor(Math.random() * 1e9)); setRows(rows.map(r => { const o: any = {}; for (const k of selected) { const t = TEMPLATES.find(x => x.key === k); if (t) o[k] = t.fn() } return o })) }}>
                  {t('dev.regenerate', 'Regenerate')}
                </Btn>
                <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(rows, null, 2))}>
                  {t('action.copy_json', 'Copy JSON')}
                </Btn>
                <Btn variant="secondary" onClick={() => {
                  const csv = [selected, ...rows.map(r => selected.map(k => r[k]))].map(r => r.join(',')).join('\n')
                  navigator.clipboard.writeText(csv)
                }}>
                  {t('action.copy_csv', 'Copy CSV')}
                </Btn>
              </div>
            </Section>
          )}

          {rows.length === 0 && !error && (
            <Notice tone="info">{t('dev.fake_hint', 'Choose fields and count, then generate')}</Notice>
          )}
        </Column>
      </Scroll>
    </Region>
  )
}