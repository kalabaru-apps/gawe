'use client'

import { useState, useEffect } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { useTranslation } from '@/lib/i18n'

const DEFAULT_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
]

const ALL_ZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') as string[] : DEFAULT_ZONES

export default function TimezoneClock({ onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(new Date())
  const [pinnedZones, setPinnedZones] = useState<string[]>(DEFAULT_ZONES)
  const [addZone, setAddZone] = useState('')
  const [filterZone, setFilterZone] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function addPinnedZone(tz: string) {
    if (!tz || pinnedZones.includes(tz)) return
    setPinnedZones((prev) => [...prev, tz])
    setAddZone('')
  }

  function removeZone(tz: string) {
    setPinnedZones((prev) => prev.filter((z) => z !== tz))
  }

  const filteredAll = ALL_ZONES.filter((z) => z.toLowerCase().includes(filterZone.toLowerCase())).slice(0, 50)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          placeholder={t('common.search', 'Search') + ' timezone (e.g. Tokyo, New_York)...'}
        />
        {filterZone && (
          <div className="relative">
            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-auto rounded-md border border-input bg-background shadow-lg">
              {filteredAll.map((z) => (
                <button key={z} onClick={() => { addPinnedZone(z); setFilterZone('') }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors">
                  {z}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pinnedZones.map((tz) => {
          let timeStr = '—'
          let dateStr = '—'
          let offsetStr = '—'
          try {
            timeStr = formatInTimeZone(now, tz, 'HH:mm:ss')
            dateStr = formatInTimeZone(now, tz, 'EEE, MMM d yyyy')
            offsetStr = formatInTimeZone(now, tz, 'zzz')
          } catch { /* invalid tz */ }
          return (
            <div key={tz} className="rounded-md border border-input p-3 relative group">
              <button onClick={() => removeZone(tz)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-foreground transition-opacity">
                ✕
              </button>
              <p className="text-xs text-muted-foreground truncate">{tz}</p>
              <p className="font-mono text-2xl font-semibold tabular-nums mt-1">{timeStr}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
              <p className="text-xs text-muted-foreground">{offsetStr}</p>
              <CopyButton value={`${tz}: ${timeStr} ${dateStr}`} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
