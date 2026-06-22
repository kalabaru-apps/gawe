'use client'

import { useState, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

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
  if (Math.abs(n) >= 1e9 || (Math.abs(n) < 0.0001 && n !== 0)) return n.toExponential(4)
  return Number(n.toPrecision(8)).toString()
}

export default function UnitConverter({ onOutput, initialState }: ToolProps) {
  const [category, setCategory] = useState((initialState?.category as string) ?? 'length')
  const [fromUnit, setFromUnit] = useState(() => {
    const cat = initialState?.category as string ?? 'length'
    return (initialState?.fromUnit as string) ?? Object.keys(CATEGORIES[cat].units)[0]
  })
  const [value, setValue] = useState((initialState?.value as string) ?? '1')

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
      }))
    } catch {
      return []
    }
  }

  const results = computeAll()

  useEffect(() => {
    if (results.length > 0) {
      onOutput(
        { value, fromUnit, category },
        { results: Object.fromEntries(results.map(r => [r.key, r.result])) }
      )
    }
  }, [value, fromUnit, category, results, onOutput])

  function handleCategoryChange(c: string) {
    setCategory(c)
    setFromUnit(Object.keys(CATEGORIES[c].units)[0])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => handleCategoryChange(key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              category === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input hover:bg-muted/50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Value
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              From Unit
            </label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
            >
              {units.map(([key, u]) => (
                <option key={key} value={key}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.key}
              className={`flex items-center justify-between rounded-md border p-2.5 ${
                r.key === fromUnit ? 'border-primary/50 bg-primary/5' : 'border-input'
              }`}
            >
              <div>
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className="font-mono text-sm mt-0.5">{r.result}</p>
              </div>
              <CopyButton value={r.result} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
