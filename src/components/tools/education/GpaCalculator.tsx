'use client'

/**
 * GPA Calculator — Paper domain (education = paper).
 * Ledger feel: ruled course rows, running GPA readout in serif, live calculation.
 * No Calculate button — results update as you type.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import {
  Scroll,
  Column,
  Sheet,
  Page,
  Result,
  Field,
  TextInput,
  TextArea,
  Select,
  Btn,
  Seg,
  Stat,
  Notice,
  Region,
} from '@/components/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

type Scale = '4.00' | '4.33' | '100'
type Grade400 = 'A' | 'AB' | 'B' | 'BC' | 'C' | 'D' | 'E'
type Grade433 = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F'
type InputMode = 'huruf' | 'angka'

interface Course {
  id: string
  nama: string
  sks: string
  nilaiHuruf400: Grade400
  nilaiHuruf433: Grade433
  nilaiAngka: string
}

interface Semester {
  id: string
  label: string
  courses: Course[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_MAP_400: Record<Grade400, number> = {
  A: 4.0,
  AB: 3.5,
  B: 3.0,
  BC: 2.5,
  C: 2.0,
  D: 1.0,
  E: 0.0,
}

const GRADE_OPTIONS_400: Grade400[] = ['A', 'AB', 'B', 'BC', 'C', 'D', 'E']

const GRADE_MAP_433: Record<Grade433, number> = {
  'A+': 4.33,
  A: 4.0,
  'A-': 3.67,
  'B+': 3.33,
  B: 3.0,
  'B-': 2.67,
  'C+': 2.33,
  C: 2.0,
  'C-': 1.67,
  'D+': 1.33,
  D: 1.0,
  F: 0.0,
}

const GRADE_OPTIONS_433: Grade433[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function initCourse(): Course {
  return {
    id: uid(),
    nama: '',
    sks: '3',
    nilaiHuruf400: 'A',
    nilaiHuruf433: 'A',
    nilaiAngka: '',
  }
}

function initSemester(index: number): Semester {
  return { id: uid(), label: `Semester ${index}`, courses: [initCourse()] }
}

function getCourseGrade(course: Course, scale: Scale, mode: InputMode): number {
  if (scale === '100') {
    const n = parseFloat(course.nilaiAngka)
    return isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
  }
  if (mode === 'angka') {
    const n = parseFloat(course.nilaiAngka)
    if (isNaN(n)) return 0
    const max = scale === '4.33' ? 4.33 : 4
    return Math.min(max, Math.max(0, n))
  }
  if (scale === '4.33') return GRADE_MAP_433[course.nilaiHuruf433]
  return GRADE_MAP_400[course.nilaiHuruf400]
}

function computeIP(courses: Course[], scale: Scale, mode: InputMode): { ip: number; totalSks: number } {
  let sumProduct = 0
  let totalSks = 0
  for (const c of courses) {
    const sks = parseInt(c.sks)
    if (!sks || sks <= 0) continue
    const nilai = getCourseGrade(c, scale, mode)
    sumProduct += sks * nilai
    totalSks += sks
  }
  const ip = totalSks > 0 ? sumProduct / totalSks : 0
  return { ip, totalSks }
}

function computeIPK(semesters: Semester[], scale: Scale, mode: InputMode): { ipk: number; totalSks: number } {
  let sumProduct = 0
  let totalSks = 0
  for (const sem of semesters) {
    const { ip, totalSks: semSks } = computeIP(sem.courses, scale, mode)
    sumProduct += ip * semSks
    totalSks += semSks
  }
  const ipk = totalSks > 0 ? sumProduct / totalSks : 0
  return { ipk, totalSks }
}

function getPredikat(ipk: number, scale: Scale): string {
  if (scale === '100') {
    if (ipk >= 85) return 'A'
    if (ipk >= 70) return 'B'
    if (ipk >= 55) return 'C'
    if (ipk >= 40) return 'D'
    return 'E'
  }
  if (scale === '4.33') {
    if (ipk >= 3.67) return 'gpa.cum_laude'
    if (ipk >= 3.34) return 'gpa.very_satisfactory'
    if (ipk >= 3.0) return 'gpa.satisfactory'
    return 'gpa.adequate'
  }
  // 4.00
  if (ipk >= 3.51) return 'gpa.cum_laude'
  if (ipk >= 3.01) return 'gpa.very_satisfactory'
  if (ipk >= 2.76) return 'gpa.satisfactory'
  return 'gpa.adequate'
}

function parseImportText(text: string, scale: Scale): Course[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const courses: Course[] = []
  for (const line of lines) {
    const parts = line.split(/[,\t]/).map((p) => p.trim())
    if (parts.length < 3) continue
    const [nama, sksRaw, nilaiRaw] = parts
    const sks = parseInt(sksRaw)
    if (!nama || isNaN(sks)) continue
    const course = initCourse()
    course.nama = nama
    course.sks = String(sks)
    const upper = nilaiRaw.toUpperCase()
    if (scale === '4.00' && GRADE_OPTIONS_400.includes(upper as Grade400)) {
      course.nilaiHuruf400 = upper as Grade400
    } else if (scale === '4.33' && GRADE_OPTIONS_433.includes(nilaiRaw as Grade433)) {
      course.nilaiHuruf433 = nilaiRaw as Grade433
    } else {
      const n = parseFloat(nilaiRaw)
      if (!isNaN(n)) course.nilaiAngka = String(n)
    }
    courses.push(course)
  }
  return courses
}

function resetCourseGrades(course: Course): Course {
  return { ...course, nilaiHuruf400: 'A', nilaiHuruf433: 'A', nilaiAngka: '' }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function GpaCalculator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [semesters, setSemesters] = useState<Semester[]>(
    (initialState?.semesters as Semester[]) ?? [initSemester(1)]
  )
  const [activeSem, setActiveSem] = useState<string>(
    (initialState?.semesters as Semester[])?.[0]?.id ?? semesters[0].id
  )
  const [scale, setScale] = useState<Scale>((initialState?.scale as Scale) ?? '4.00')
  const [mode, setMode] = useState<InputMode>('huruf')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  const { ipk, totalSks } = computeIPK(semesters, scale, mode)
  const predikatKey = getPredikat(ipk, scale)
  const predikat = predikatKey.startsWith('gpa.') ? t(predikatKey as Parameters<typeof t>[0]) : predikatKey

  useEffect(() => {
    onOutput({ semesters, scale }, { ipk: parseFloat(ipk.toFixed(2)), totalSks, predikat, scale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters, scale, mode])

  // ── Scale change ──────────────────────────────────────────────────────────

  const handleScaleChange = useCallback((next: Scale) => {
    setScale(next)
    setSemesters((prev) =>
      prev.map((s) => ({ ...s, courses: s.courses.map(resetCourseGrades) }))
    )
    if (next === '100') setMode('angka')
    else setMode('huruf')
  }, [])

  // ── Semester operations ──────────────────────────────────────────────────

  const addSemester = useCallback(() => {
    const next = initSemester(semesters.length + 1)
    setSemesters((prev) => [...prev, next])
    setActiveSem(next.id)
  }, [semesters.length])

  const removeSemester = useCallback((id: string) => {
    setSemesters((prev) => {
      if (prev.length === 1) return prev
      return prev.filter((s) => s.id !== id)
    })
    setActiveSem((prev) => {
      if (prev === id) {
        const remaining = semesters.filter((s) => s.id !== id)
        return remaining[0]?.id ?? ''
      }
      return prev
    })
  }, [semesters])

  // ── Course operations ────────────────────────────────────────────────────

  const updateCourse = useCallback((semId: string, courseId: string, field: keyof Course, value: string) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id !== semId ? s : {
          ...s,
          courses: s.courses.map((c) => c.id !== courseId ? c : { ...c, [field]: value }),
        }
      )
    )
  }, [])

  const addCourse = useCallback((semId: string) => {
    setSemesters((prev) =>
      prev.map((s) => s.id !== semId ? s : { ...s, courses: [...s.courses, initCourse()] })
    )
  }, [])

  const removeCourse = useCallback((semId: string, courseId: string) => {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id !== semId ? s : { ...s, courses: s.courses.filter((c) => c.id !== courseId) }
      )
    )
  }, [])

  // ── Import ────────────────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    const parsed = parseImportText(importText, scale)
    if (parsed.length === 0) {
      setImportError(t('gpa.import_placeholder'))
      return
    }
    setSemesters((prev) =>
      prev.map((s) => s.id !== activeSem ? s : { ...s, courses: parsed })
    )
    setImportText('')
    setShowImport(false)
    setImportError('')
  }, [importText, activeSem, scale])

  // ── Export ────────────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const sem = semesters.find((s) => s.id === activeSem)
    if (!sem) return
    const lines = sem.courses.map((c) => {
      let nilai: string
      if (scale === '100') {
        nilai = c.nilaiAngka
      } else if (mode === 'huruf') {
        nilai = scale === '4.33' ? c.nilaiHuruf433 : c.nilaiHuruf400
      } else {
        nilai = c.nilaiAngka
      }
      return `${c.nama}, ${c.sks}, ${nilai}`
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sem.label.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [semesters, activeSem, mode, scale])

  const currentSemester = semesters.find((s) => s.id === activeSem) ?? semesters[0]
  const { ip: currentIP, totalSks: currentSks } = computeIP(currentSemester.courses, scale, mode)

  // ── IPK display ───────────────────────────────────────────────────────────

  const ipkDisplay = scale === '100'
    ? `${ipk.toFixed(2)} / 100`
    : ipk.toFixed(2)

  const ipSemLabel = scale === '100' ? t('gpa.average') : t('gpa.ip')

  // ── Grade reference data ──────────────────────────────────────────────────

  const gradeRef400 = GRADE_OPTIONS_400.map((g) => ({ label: g, value: GRADE_MAP_400[g].toFixed(2) }))
  const gradeRef433 = GRADE_OPTIONS_433.map((g) => ({ label: g, value: GRADE_MAP_433[g].toFixed(2) }))
  const gradeRef100 = [
    { label: 'A', value: '≥ 85' },
    { label: 'B', value: '70-84' },
    { label: 'C', value: '55-69' },
    { label: 'D', value: '40-54' },
    { label: 'E', value: '< 40' },
  ]

  const activeGradeRef =
    scale === '4.33' ? gradeRef433 :
    scale === '100' ? gradeRef100 :
    gradeRef400

  const angkaMax = scale === '4.33' ? 4.33 : 4

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Scroll>
      <Column width="lg">
        {/* Scale selector */}
        <Sheet>
          <Page className="space-y-5">
            <Field label={t('gpa.scale')} id="gpa-scale">
              <Seg<Scale>
                value={scale}
                onChange={handleScaleChange}
                label={t('gpa.scale')}
                options={[
                  { value: '4.00', label: t('gpa.scale_4') },
                  { value: '4.33', label: t('gpa.scale_433') },
                  { value: '100', label: t('gpa.scale_100') },
                ]}
              />
            </Field>

            {/* IPK summary — printed result style */}
            <div className="space-y-3">
              <h3 className="font-display text-lg font-semibold">{t('gpa.ipk')}</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat
                  label={t('gpa.ipk')}
                  value={ipkDisplay}
                  tone="serif"
                  className="border-l-2 border-d-accent pl-3"
                />
                <Stat
                  label={t('gpa.total_credits')}
                  value={totalSks}
                  tone="display"
                  className="border-l-2 border-d-muted pl-3"
                />
                <Stat
                  label={t('gpa.predicate')}
                  value={predikat}
                  tone="serif"
                  className="border-l-2 border-d-muted pl-3"
                />
              </div>
            </div>

            {/* Mode toggle — only for 4.00 and 4.33 scales */}
            {scale !== '100' && (
              <Field label={t('gpa.grade')} id="gpa-mode">
                <Seg<InputMode>
                  value={mode}
                  onChange={setMode}
                  label={t('gpa.grade')}
                  options={[
                    { value: 'huruf', label: t('gpa.grade_letter') },
                    { value: 'angka', label: `${t('gpa.grade_numeric')} (0–${angkaMax})` },
                  ]}
                />
              </Field>
            )}

            {/* Semester tabs */}
            <div className="space-y-4">
              <div role="tablist" aria-label={t('gpa.semester')} className="flex flex-wrap gap-2">
                {semesters.map((sem) => (
                  <button
                    key={sem.id}
                    role="tab"
                    aria-selected={activeSem === sem.id}
                    onClick={() => setActiveSem(sem.id)}
                    className={`rounded-d px-3 py-1.5 text-sm font-medium transition-colors ${
                      activeSem === sem.id
                        ? 'bg-d-accent text-d-accent-ink'
                        : 'border border-d-border bg-d-raised text-d-ink hover:bg-d-border/40'
                    }`}
                  >
                    {sem.label}
                  </button>
                ))}
                <button
                  onClick={() => { analytics.buttonClick('gpa-calculator', 'add_semester'); addSemester() }}
                  className="rounded-d border border-d-border bg-d-raised px-3 py-1.5 text-sm hover:bg-d-border/40"
                >
                  + {t('gpa.add_semester')}
                </button>
              </div>

              {/* Current semester summary */}
              <div className="flex flex-wrap gap-4 text-sm text-d-muted">
                <span>
                  {ipSemLabel} {currentSemester.label}:{' '}
                  <strong className="text-d-ink font-mono">
                    {scale === '100' ? `${currentIP.toFixed(2)} / 100` : currentIP.toFixed(2)}
                  </strong>
                </span>
                <span>{t('gpa.credits_short')}: <strong className="text-d-ink font-mono">{currentSks}</strong></span>
              </div>

              {/* Course table — ruled ledger rows */}
              <Page className="space-y-3">
                <div className="space-y-2">
                  {/* Header */}
                  <div className="hidden sm:grid grid-cols-[1fr_80px_140px_40px] gap-2 text-xs font-medium text-d-muted border-b border-d-border pb-2">
                    <span>{t('gpa.course_name')}</span>
                    <span className="text-right">{t('gpa.credits')}</span>
                    <span className="text-right">{t('gpa.grade')}</span>
                    <span />
                  </div>

                  {/* Rows */}
                  {currentSemester.courses.map((course) => (
                    <div key={course.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                      <Field label="" id={`course-name-${course.id}`} className="mb-0 basis-full min-w-0 sm:basis-0 sm:flex-1">
                        <TextInput
                          aria-label={t('gpa.course_name')}
                          placeholder={t('gpa.course_name')}
                          value={course.nama}
                          onChange={(e) => updateCourse(currentSemester.id, course.id, 'nama', e.target.value)}
                        />
                      </Field>
                      <Field label="" id={`course-sk-${course.id}`} className="mb-0 w-24 shrink-0 sm:w-20">
                        <TextInput
                          aria-label={t('gpa.credits')}
                          type="number"
                          min={1}
                          max={6}
                          value={course.sks}
                          onChange={(e) => updateCourse(currentSemester.id, course.id, 'sks', e.target.value)}
                          className="text-right"
                        />
                      </Field>

                      {/* Grade input — varies by scale and mode */}
                      <Field label="" id={`course-grade-${course.id}`} className="mb-0 min-w-0 flex-1 sm:w-36 sm:flex-none">
                        {scale === '100' ? (
                          <TextInput
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            aria-label={t('gpa.grade')} placeholder="0–100"
                            value={course.nilaiAngka}
                            onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiAngka', e.target.value)}
                            className="text-right"
                          />
                        ) : scale === '4.33' ? (
                          mode === 'huruf' ? (
                            <Select
                              aria-label={t('gpa.grade')} value={course.nilaiHuruf433}
                              onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiHuruf433', e.target.value)}
                            >
                              {GRADE_OPTIONS_433.map((g) => (
                                <option key={g} value={g}>{g} ({GRADE_MAP_433[g].toFixed(2)})</option>
                              ))}
                            </Select>
                          ) : (
                            <TextInput
                              type="number"
                              min={0}
                              max={4.33}
                              step={0.01}
                              aria-label={t('gpa.grade')} placeholder="0–4.33"
                              value={course.nilaiAngka}
                              onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiAngka', e.target.value)}
                              className="text-right"
                            />
                          )
                        ) : (
                          // 4.00 scale
                          mode === 'huruf' ? (
                            <Select
                              aria-label={t('gpa.grade')} value={course.nilaiHuruf400}
                              onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiHuruf400', e.target.value)}
                            >
                              {GRADE_OPTIONS_400.map((g) => (
                                <option key={g} value={g}>{g} ({GRADE_MAP_400[g].toFixed(1)})</option>
                              ))}
                            </Select>
                          ) : (
                            <TextInput
                              type="number"
                              min={0}
                              max={4}
                              step={0.01}
                              aria-label={t('gpa.grade')} placeholder="0–4"
                              value={course.nilaiAngka}
                              onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiAngka', e.target.value)}
                              className="text-right"
                            />
                          )
                        )}
                      </Field>

                      <button
                        onClick={() => removeCourse(currentSemester.id, course.id)}
                        disabled={currentSemester.courses.length === 1}
                        className="rounded-d border border-d-border bg-d-raised p-1.5 hover:bg-d-border/40 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label={t('gpa.remove_course')}
                      >
                        <svg className="h-4 w-4" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { analytics.buttonClick('gpa-calculator', 'add_course'); addCourse(currentSemester.id) }}
                  className="rounded-d border border-d-border bg-d-raised px-4 py-2 text-sm hover:bg-d-border/40 w-full"
                >
                  + {t('gpa.add_course')}
                </button>
              </Page>

              {/* Import / Export */}
              <Page className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowImport((v) => !v); setImportError('') }}
                    className="rounded-d border border-d-border bg-d-raised px-4 py-2 text-sm hover:bg-d-border/40"
                  >
                    {showImport ? t('action.clear') : t('gpa.import_courses')}
                  </button>
                  <button
                    onClick={handleExport}
                    className="rounded-d border border-d-border bg-d-raised px-4 py-2 text-sm hover:bg-d-border/40"
                  >
                    {t('gpa.export')}
                  </button>
                </div>

                {showImport && (
                  <div className="space-y-2">
                    <Field label={t('gpa.import_courses')} id="import-text">
                      <p className="text-xs text-d-muted mb-2">
                        {t('gpa.import_format_line1').replace('Nama Mata Kuliah, SKS, Nilai', '<span className="font-mono">Nama Mata Kuliah, SKS, Nilai</span>')}<br />
                        {scale === '100'
                          ? 'Nilai berupa angka 0–100.'
                          : scale === '4.33'
                          ? 'Nilai bisa huruf (A+, A, A-, B+, …, F) atau angka (0–4.33).'
                          : 'Nilai bisa huruf (A, AB, B, BC, C, D, E) atau angka (0–4).'}
                      </p>
                      <TextArea
                        rows={5}
                        value={importText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImportText(e.target.value)}
                        placeholder={t('gpa.import_placeholder')}
                        className="font-mono"
                      />
                      {importError && (
                        <Notice tone="error">{importError}</Notice>
                      )}
                      <button
                        onClick={handleImport}
                        className="rounded-d bg-d-accent text-d-accent-ink px-4 py-2 text-sm font-medium hover:brightness-110 w-full"
                      >
                        {t('gpa.import_to')} {currentSemester.label}
                      </button>
                    </Field>
                  </div>
                )}
              </Page>
            </div>

            {/* Grade reference */}
            <Page className="space-y-2">
              <h4 className="font-display text-sm font-semibold">{t('gpa.grade_reference')}</h4>
              <div className="grid gap-1 sm:grid-cols-4">
                {activeGradeRef.map((g) => (
                  <div key={g.label} className="rounded-d border border-d-border bg-d-raised px-2 py-1.5 font-mono text-xs flex justify-between">
                    <span className="font-semibold">{g.label}</span>
                    <span className="text-d-muted">{g.value}</span>
                  </div>
                ))}
              </div>
              <div className="pt-1 text-xs text-d-muted space-y-0.5">
                {scale === '4.00' && (
                  <>
                    <p>{t('gpa.cum_laude')}: IPK ≥ 3.51</p>
                    <p>{t('gpa.very_satisfactory')}: 3.01–3.50  |  {t('gpa.satisfactory')}: 2.76–3.00  |  {t('gpa.adequate')}: {'<'} 2.76</p>
                  </>
                )}
                {scale === '4.33' && (
                  <>
                    <p>{t('gpa.cum_laude')}: IPK ≥ 3.67</p>
                    <p>{t('gpa.very_satisfactory')}: 3.34–3.66  |  {t('gpa.satisfactory')}: 3.00–3.33  |  {t('gpa.adequate')}: {'<'} 3.00</p>
                  </>
                )}
                {scale === '100' && (
                  <p>A ≥ 85  |  B 70–84  |  C 55–69  |  D 40–54  |  E {'<'} 40</p>
                )}
              </div>
            </Page>
          </Page>
        </Sheet>
      </Column>
    </Scroll>
  )
}