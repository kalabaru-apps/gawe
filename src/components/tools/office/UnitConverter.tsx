'use client'

/**
 * UnitConverter — Paper domain (category = office).
 * Type in any unit, see all in the category live; category as Seg/tabs.
 * Nested Workbench region for result table (code-like density).
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { Copy, Check, ArrowRightLeft } from 'lucide-react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Region, Column, Scroll, Field, TextInput, Seg, Btn, CopyBtn, Notice, Empty, Row, Stat } from '@/components/domain'

interface Unit {
  label: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

interface Category {
  name: string
  units: Record<string, Unit>
}

const CATEGORIES: Record<string, Category> = {
  length: {
    name: 'Length',
    units: {
      m:   { label: 'Meters (m)',      toBase: (v) => v,           fromBase: (v) => v },
      km:  { label: 'Kilometers (km)', toBase: (v) => v * 1000,    fromBase: (v) => v / 1000 },
      cm:  { label: 'Centimeters (cm)',toBase: (v) => v / 100,     fromBase: (v) => v * 100 },
      mm:  { label: 'Millimeters (mm)',toBase: (v) => v / 1000,    fromBase: (v) => v * 1000 },
      mi:  { label: 'Miles (mi)',      toBase: (v) => v * 1609.344,fromBase: (v) => v / 1609.344 },
      yd:  { label: 'Yards (yd)',      toBase: (v) => v * 0.9144,  fromBase: (v) => v / 0.9144 },
      ft:  { label: 'Feet (ft)',       toBase: (v) => v * 0.3048,  fromBase: (v) => v / 0.3048 },
      in:  { label: 'Inches (in)',     toBase: (v) => v * 0.0254,  fromBase: (v) => v / 0.0254 },
    },
  },
  weight: {
    name: 'Weight',
    units: {
      kg:  { label: 'Kilograms (kg)', toBase: (v) => v,         fromBase: (v) => v },
      g:   { label: 'Grams (g)',      toBase: (v) => v / 1000,  fromBase: (v) => v * 1000 },
      mg:  { label: 'Milligrams (mg)',toBase: (v) => v / 1e6,   fromBase: (v) => v * 1e6 },
      lb:  { label: 'Pounds (lb)',    toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      oz:  { label: 'Ounces (oz)',    toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
    },
  },
  temperature: {
    name: 'Temperature',
    units: {
      c: { label: 'Celsius (°C)',    toBase: (v) => v,              fromBase: (v) => v },
      f: { label: 'Fahrenheit (°F)', toBase: (v) => (v - 32) * 5/9, fromBase: (v) => v * 9/5 + 32 },
      k: { label: 'Kelvin (K)',      toBase: (v) => v - 273.15,     fromBase: (v) => v + 273.15 },
    },
  },
  data: {
    name: 'Data',
    units: {
      b:   { label: 'Bytes (B)',     toBase: (v) => v,       fromBase: (v) => v },
      kb:  { label: 'Kilobytes (KB)',toBase: (v) => v * 1024,fromBase: (v) => v / 1024 },
      mb:  { label: 'Megabytes (MB)',toBase: (v) => v * 1024**2, fromBase: (v) => v / 1024**2 },
      gb:  { label: 'Gigabytes (GB)',toBase: (v) => v * 1024**3, fromBase: (v) => v / 1024**3 },
      tb:  { label: 'Terabytes (TB)',toBase: (v) => v * 1024**4, fromBase: (v) => v / 1024**4 },
    },
  },
  speed: {
    name: 'Speed',
    units: {
      ms:   { label: 'm/s',    toBase: (v) => v,          fromBase: (v) => v },
      kmh:  { label: 'km/h',   toBase: (v) => v / 3.6,    fromBase: (v) => v * 3.6 },
      mph:  { label: 'mph',    toBase: (v) => v * 0.44704,fromBase: (v) => v / 0.44704 },
      kn:   { label: 'Knots',  toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    },
  },
}

function formatNum(n: number): string {
  if (!isFinite(n)) return '—'
  if (Math.abs(n) >= 1e9 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(4)
  return Number(n.toPrecision(8)).toString()
}

const CATEGORY_ORDER = ['length', 'weight', 'temperature', 'data', 'speed'] as const

export default function UnitConverter({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [category, setCategory] = useState((initialState?.category as string) ?? 'length')
  const [fromUnit, setFromUnit] = useState(() => {
    const cat = initialState?.category as string ?? 'length'
    return (initialState?.fromUnit as string) ?? Object.keys(CATEGORIES[cat].units)[0]
  })
  const [value, setValue] = useState((initialState?.value as string) ?? '1')
  const firedRef = useRef(false)

  const cat = CATEGORIES[category]
  const units = Object.entries(cat.units)
  const numVal = parseFloat(value)
  const isValid = !isNaN(numVal)

  function computeAll() {
    if (!isValid || !cat.units[fromUnit]) return []
    try {
      const baseVal = cat.units[fromUnit].toBase(numVal)
      return units.map(([key, u]) => ({
        key,
        label: u.label,
        result: key === fromUnit ? value : formatNum(u.fromBase(baseVal)),
        isFrom: key === fromUnit,
      }))
    } catch {
      return []
    }
  }

  const results = computeAll()

  useEffect(() => {
    if (results.length > 0) {
      if (!firedRef.current) { analytics.buttonClick('unit-converter', 'convert'); firedRef.current = true }
      onOutput(
        { value, fromUnit, category },
        { results: Object.fromEntries(results.map(r => [r.key, r.result])) }
      )
    }
  }, [value, fromUnit, category, results, onOutput])

  function handleCategoryChange(c: string) {
    setCategory(c)
    setFromUnit(Object.keys(CATEGORIES[c].units)[0])
    firedRef.current = false
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-6">
        {/* Category selector */}
        <Field id="unit-cat" label={t('office.unit_category', 'Category')}>
          <Seg<string>
            value={category}
            onChange={handleCategoryChange}
            label={t('office.unit_category', 'Category')}
            options={CATEGORY_ORDER.map(key => ({ value: key, label: CATEGORIES[key].name }))}
          />
        </Field>

        {/* Input area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Field id="unit-value" label={t('office.unit_value', 'Value')}>
              <TextInput
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </Field>
            <Field id="unit-from" label={t('office.unit_from', 'From unit')}>
              <select
                value={fromUnit}
                onChange={(e) => setFromUnit(e.target.value)}
                className="w-full rounded-d border border-d-border bg-d-raised px-3 py-2 text-sm text-d-ink outline-none focus:ring-2 focus:ring-d-accent cursor-pointer"
              >
                {units.map(([key, u]) => (
                  <option key={key} value={key}>{u.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Results table - nested Workbench region */}
          <Region domain="workbench" className="flex-1 min-h-0">
            <div className="h-full overflow-auto">
              <table className="w-full border-collapse font-mono text-sm">
                <thead>
                  <tr className="border-b border-d-border text-left text-xs text-d-muted">
                    <th className="pb-2 pr-4 font-medium">{t('office.unit_unit', 'Unit')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('office.unit_result', 'Result')}</th>
                    <th className="pb-2 text-right font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={r.key}
                      className={`border-b border-d-border/50 transition-colors ${r.isFrom ? 'bg-d-accent/5' : ''}`}
                    >
                      <td className="py-2 pr-4 text-d-muted">{r.label}</td>
                      <td className="py-2 pr-4 font-medium tabular-nums">
                        {r.result}
                      </td>
                      <td className="py-2 text-right">
                        <CopyBtn value={r.result} size="sm" label="" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length === 0 && (
                <Empty
                  title={t('office.unit_enter_value', 'Enter a value')}
                  children={t('office.unit_enter_value_desc', 'Type a number above to see conversions across all units in this category.')}
                />
              )}
            </div>
          </Region>
        </div>
      </div>
    </div>
  )
}