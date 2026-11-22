'use client'

import { useState, useEffect, useMemo } from 'react'
import { Globe, Sun, Moon, X, Clock, ArrowUp, ArrowDown } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Page, Column, Scroll, Field, TextInput, IconBtn, CopyBtn, Empty } from '@/components/domain'
import { cn } from '@/lib/utils'

const DEFAULT_ZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney',
]

const ALL_ZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') as string[] : DEFAULT_ZONES

interface ZoneInfo {
  zone: string
  time: string
  date: string
  offset: string
  isDay: boolean
  dayProgress: number
}

function getZoneInfo(zone: string, now: Date): ZoneInfo {
  try {
    const time = formatInTimeZone(now, zone, 'HH:mm:ss')
    const date = formatInTimeZone(now, zone, 'EEE, MMM d yyyy')
    const offset = formatInTimeZone(now, zone, 'zzz')
    const hour = Number(formatInTimeZone(now, zone, 'HH'))
    return { zone, time, date, offset, isDay: hour >= 6 && hour < 18, dayProgress: hour / 24 }
  } catch {
    return { zone, time: '-', date: '-', offset: '-', isDay: false, dayProgress: 0 }
  }
}

function formatZoneName(zone: string): string {
  return zone.replace(/_/g, ' ').replace(/\//g, ' / ')
}

export default function TimezoneClock({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(new Date())
  const [pinnedZones, setPinnedZones] = useState<string[]>(DEFAULT_ZONES)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [meetingTime, setMeetingTime] = useState('')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const zoneInfos = useMemo(() => pinnedZones.map((z) => getZoneInfo(z, now)), [pinnedZones, now])

  const filteredAll = useMemo(() =>
    ALL_ZONES.filter((z) =>
      z.toLowerCase().includes(searchQuery.toLowerCase().replace(/ /g, '_')) &&
      !pinnedZones.includes(z)
    ).slice(0, 20), [searchQuery, pinnedZones])

  function addPinnedZone(tz: string) {
    if (!tz || pinnedZones.includes(tz)) return
    analytics.buttonClick('timezone-clock', 'add_timezone')
    setPinnedZones((prev) => [...prev, tz])
    setSearchQuery('')
    setShowSearchResults(false)
  }

  function removeZone(tz: string) {
    setPinnedZones((prev) => prev.filter((z) => z !== tz))
  }

  function reorderZones(from: number, to: number) {
    setPinnedZones((prev) => {
      const next = [...prev]
      const [removed] = next.splice(from, 1)
      next.splice(to, 0, removed)
      return next
    })
  }

  const meetingFor = (zone: string) => {
    if (!meetingTime) return null
    try {
      const [h, m] = meetingTime.split(':').map(Number)
      const date = new Date()
      date.setHours(h, m, 0, 0)
      return `${formatInTimeZone(date, zone, 'HH:mm')} ${formatInTimeZone(date, zone, 'EEE, MMM d')}`
    } catch {
      return null
    }
  }

  return (
    <Scroll>
      <Column width="xl">
        <header>
          <h1 className="font-serif text-3xl font-semibold">{t('office.timezone_clock', 'Timezone Clock')}</h1>
        </header>

        <Page>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="tz-search" label={t('office.timezone_search', 'Add timezone')}>
              <div className="relative">
                <TextInput
                  id="tz-search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true) }}
                  onFocus={() => setShowSearchResults(true)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setShowSearchResults(false) }}
                  placeholder="Tokyo, New_York"
                  autoComplete="off"
                />
                {showSearchResults && searchQuery && filteredAll.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-auto rounded-d border border-d-border bg-d-raised shadow-lg">
                    {filteredAll.map((z) => (
                      <li key={z}>
                        <button
                          onClick={() => addPinnedZone(z)}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-d-border/40 focus-visible:bg-d-border/40 focus-visible:outline-none"
                        >
                          <Globe className="h-4 w-4 text-d-muted" aria-hidden />
                          {formatZoneName(z)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Field>
            <Field id="meeting-time" label={t('office.meeting_time', 'Meeting time (your local)')}>
              <TextInput id="meeting-time" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
            </Field>
          </div>
        </Page>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zoneInfos.map((info, i) => {
            const mt = meetingFor(info.zone)
            const Icon = info.isDay ? Sun : Moon
            return (
              <li key={info.zone} className="min-w-0 rounded-d border border-d-border bg-d-raised p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className="h-5 w-5 shrink-0 text-d-muted" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{formatZoneName(info.zone)}</p>
                      <p className="text-xs text-d-muted">{info.date}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {i > 0 && <IconBtn label={`${t('common.move_up', 'Move up')} ${formatZoneName(info.zone)}`} onClick={() => reorderZones(i, i - 1)}><ArrowUp className="h-3.5 w-3.5" aria-hidden /></IconBtn>}
                    {i < zoneInfos.length - 1 && <IconBtn label={`${t('common.move_down', 'Move down')} ${formatZoneName(info.zone)}`} onClick={() => reorderZones(i, i + 1)}><ArrowDown className="h-3.5 w-3.5" aria-hidden /></IconBtn>}
                    <IconBtn label={`${t('common.remove', 'Remove')} ${formatZoneName(info.zone)}`} onClick={() => removeZone(info.zone)}><X className="h-3.5 w-3.5" aria-hidden /></IconBtn>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-d-border" aria-hidden>
                    <div className={cn('h-full rounded-full', info.isDay ? 'bg-d-accent' : 'bg-d-muted')} style={{ width: `${info.dayProgress * 100}%` }} />
                  </div>
                  <span className="text-xs text-d-muted">{info.offset}</span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="font-display text-3xl font-semibold tabular-nums">{info.time}</p>
                  <CopyBtn value={`${formatZoneName(info.zone)}: ${info.time} ${info.date}`} label="" />
                </div>

                {mt && (
                  <p className="mt-2 flex items-center gap-1 border-t border-d-border/60 pt-2 text-xs text-d-muted">
                    <Clock className="h-3 w-3" aria-hidden />
                    {t('office.meeting_at', 'Meeting at')} {mt}
                  </p>
                )}
              </li>
            )
          })}
        </ul>

        {pinnedZones.length === 0 && (
          <Empty title={t('office.timezone_empty', 'No timezones added')}>
            {t('office.timezone_empty_desc', 'Search for a city or timezone above to add it.')}
          </Empty>
        )}
      </Column>
    </Scroll>
  )
}
