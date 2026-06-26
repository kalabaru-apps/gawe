'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

// ─── Types ────────────────────────────────────────────────────────────────────

type Scale = '4.00' | '4.33' | '100'
type Grade400 = 'A' | 'AB' | 'B' | 'BC' | 'C' | 'D' | 'E'
type Grade433 = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F'
type InputMode = 'huruf' | 'angka'

interface Course {
  id: string
  nama: string
  sks: string
  // 4.00 scale
  nilaiHuruf400: Grade400
  // 4.33 scale
  nilaiHuruf433: Grade433
  // numeric override (for 4.00/4.33 angka mode) or 100-scale value
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

// Reset only grade fields, preserving nama and sks
function resetCourseGrades(course: Course): Course {
  return { ...course, nilaiHuruf400: 'A', nilaiHuruf433: 'A', nilaiAngka: '' }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const LABEL = 'text-sm font-medium'
const BTN_ACTIVE = 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors'
const BTN_INACTIVE = 'rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors'

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
  const predikat = getPredikat(ipk, scale)

  useEffect(() => {
    onOutput({ semesters, scale }, { ipk: parseFloat(ipk.toFixed(2)), totalSks, predikat, scale })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesters, scale, mode])

  // ── Scale change ──────────────────────────────────────────────────────────

  const handleScaleChange = useCallback((next: Scale) => {
    setScale(next)
    // Reset grade values, keep names and SKS
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

  // ── Import ───────────────────────────────────────────────────────────────

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

  // ── Export ───────────────────────────────────────────────────────────────

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

  const ipLabel = scale === '100' ? 'Nilai Rata-rata' : 'IPK'
  const ipSemLabel = scale === '100' ? 'Rata-rata' : 'IP'

  // ── Grade reference data ───────────────────────────────────────────────────

  const gradeRef400 = GRADE_OPTIONS_400.map((g) => ({ label: g, value: GRADE_MAP_400[g].toFixed(2) }))
  const gradeRef433 = GRADE_OPTIONS_433.map((g) => ({ label: g, value: GRADE_MAP_433[g].toFixed(2) }))
  const gradeRef100 = [
    { label: 'A', value: '≥ 85' },
    { label: 'B', value: '70–84' },
    { label: 'C', value: '55–69' },
    { label: 'D', value: '40–54' },
    { label: 'E', value: '< 40' },
  ]

  const activeGradeRef =
    scale === '4.33' ? gradeRef433 :
    scale === '100' ? gradeRef100 :
    gradeRef400

  // ── Angka max for non-100 scales ───────────────────────────────────────────
  const angkaMax = scale === '4.33' ? 4.33 : 4

  return (
    <div className="space-y-5">
      {/* Scale selector */}
      <div className="space-y-1.5">
        <p className={LABEL}>{t('gpa.scale')}</p>
        <div className="flex gap-2 flex-wrap">
          {(['4.00', '4.33', '100'] as Scale[]).map((s) => (
            <button
              key={s}
              onClick={() => handleScaleChange(s)}
              className={scale === s ? BTN_ACTIVE : BTN_INACTIVE}
            >
              {s === '4.00' ? t('gpa.scale_4') : s === '4.33' ? t('gpa.scale_433') : t('gpa.scale_100')}
            </button>
          ))}
        </div>
      </div>

      {/* IPK summary */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className={LABEL}>{t('gpa.ipk')}</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('gpa.ipk')}</p>
            <p className="text-2xl font-bold font-mono">{ipkDisplay}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('gpa.total_credits')}</p>
            <p className="text-2xl font-bold font-mono">{totalSks}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('gpa.predicate')}</p>
            <p className="text-base font-semibold">{predikat.startsWith('gpa.') ? t(predikat as Parameters<typeof t>[0]) : predikat}</p>
          </div>
        </div>
      </div>

      {/* Mode toggle — only for 4.00 and 4.33 scales */}
      {scale !== '100' && (
        <div className="flex items-center gap-3">
          <span className={LABEL}>{t('gpa.grade')}:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('huruf')}
              className={mode === 'huruf' ? BTN_ACTIVE : BTN_INACTIVE}
            >
              {t('gpa.grade_letter')}
            </button>
            <button
              onClick={() => setMode('angka')}
              className={mode === 'angka' ? BTN_ACTIVE : BTN_INACTIVE}
            >
              {t('gpa.grade_numeric')} (0–{angkaMax})
            </button>
          </div>
        </div>
      )}

      {/* Semester tabs */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {semesters.map((sem) => (
            <div key={sem.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveSem(sem.id)}
                className={activeSem === sem.id ? BTN_ACTIVE : BTN_INACTIVE}
              >
                {sem.label}
              </button>
              {semesters.length > 1 && (
                <button
                  onClick={() => removeSemester(sem.id)}
                  className="rounded-full border border-input bg-background w-5 h-5 text-xs hover:bg-muted transition-colors flex items-center justify-center"
                  title="Hapus semester"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => { analytics.buttonClick('gpa-calculator', 'add_semester'); addSemester() }}
            className={BTN_INACTIVE}
          >
            + {t('gpa.add_semester')}
          </button>
        </div>

        {/* Current semester summary */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            {ipSemLabel} {currentSemester.label}:{' '}
            <strong className="text-foreground font-mono">
              {scale === '100' ? `${currentIP.toFixed(2)} / 100` : currentIP.toFixed(2)}
            </strong>
          </span>
          <span>SKS: <strong className="text-foreground font-mono">{currentSks}</strong></span>
        </div>

        {/* Course table */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_130px_40px] gap-2 text-xs font-medium text-muted-foreground">
              <span>{t('gpa.course_name')}</span>
              <span>{t('gpa.credits')}</span>
              <span>{t('gpa.grade')}</span>
              <span />
            </div>

            {/* Rows */}
            {currentSemester.courses.map((course) => (
              <div key={course.id} className="grid grid-cols-[1fr_80px_130px_40px] gap-2 items-center">
                <input
                  type="text"
                  placeholder={t('gpa.course_name')}
                  value={course.nama}
                  onChange={(e) => updateCourse(currentSemester.id, course.id, 'nama', e.target.value)}
                  className={INPUT}
                />
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={course.sks}
                  onChange={(e) => updateCourse(currentSemester.id, course.id, 'sks', e.target.value)}
                  className={INPUT}
                />

                {/* Grade input — varies by scale and mode */}
                {scale === '100' ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    placeholder="0–100"
                    value={course.nilaiAngka}
                    onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiAngka', e.target.value)}
                    className={INPUT}
                  />
                ) : scale === '4.33' ? (
                  mode === 'huruf' ? (
                    <select
                      value={course.nilaiHuruf433}
                      onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiHuruf433', e.target.value)}
                      className={INPUT}
                    >
                      {GRADE_OPTIONS_433.map((g) => (
                        <option key={g} value={g}>{g} ({GRADE_MAP_433[g].toFixed(2)})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={4.33}
                      step={0.01}
                      placeholder="0–4.33"
                      value={course.nilaiAngka}
                      onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiAngka', e.target.value)}
                      className={INPUT}
                    />
                  )
                ) : (
                  // 4.00 scale
                  mode === 'huruf' ? (
                    <select
                      value={course.nilaiHuruf400}
                      onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiHuruf400', e.target.value)}
                      className={INPUT}
                    >
                      {GRADE_OPTIONS_400.map((g) => (
                        <option key={g} value={g}>{g} ({GRADE_MAP_400[g].toFixed(1)})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={4}
                      step={0.01}
                      placeholder="0–4"
                      value={course.nilaiAngka}
                      onChange={(e) => updateCourse(currentSemester.id, course.id, 'nilaiAngka', e.target.value)}
                      className={INPUT}
                    />
                  )
                )}

                <button
                  onClick={() => removeCourse(currentSemester.id, course.id)}
                  disabled={currentSemester.courses.length === 1}
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Hapus mata kuliah"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => { analytics.buttonClick('gpa-calculator', 'add_course'); addCourse(currentSemester.id) }}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            + {t('gpa.add_course')}
          </button>
        </div>

        {/* Import / Export */}
        <div className="flex gap-2">
          <button
            onClick={() => { setShowImport((v) => !v); setImportError('') }}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {showImport ? t('action.clear') : t('gpa.import_courses')}
          </button>
          <button
            onClick={handleExport}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {t('gpa.export')}
          </button>
        </div>

        {showImport && (
          <div className="space-y-2">
            <label className={LABEL}>{t('gpa.import_courses')}</label>
            <p className="text-xs text-muted-foreground">
              Format per baris: <span className="font-mono">Nama Mata Kuliah, SKS, Nilai</span><br />
              {scale === '100'
                ? 'Nilai berupa angka 0–100.'
                : scale === '4.33'
                ? 'Nilai bisa huruf (A+, A, A-, B+, …, F) atau angka (0–4.33).'
                : 'Nilai bisa huruf (A, AB, B, BC, C, D, E) atau angka (0–4).'}
            </p>
            <textarea
              rows={5}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={t('gpa.import_placeholder')}
              className={`${INPUT} font-mono`}
            />
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
            <button
              onClick={handleImport}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Import ke {currentSemester.label}
            </button>
          </div>
        )}
      </div>

      {/* Grade reference */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <p className={LABEL}>{t('gpa.grade_reference')}</p>
        <div className={`grid gap-1 text-xs ${scale === '4.33' ? 'grid-cols-4' : 'grid-cols-4'}`}>
          {activeGradeRef.map((g) => (
            <div key={g.label} className="rounded-md bg-muted px-2 py-1 font-mono flex justify-between">
              <span className="font-semibold">{g.label}</span>
              <span className="text-muted-foreground">{g.value}</span>
            </div>
          ))}
        </div>
        <div className="pt-1 text-xs text-muted-foreground space-y-0.5">
          {scale === '4.00' && (
            <>
              <p>{t('gpa.cum_laude')}: IPK ≥ 3.51</p>
              <p>{t('gpa.very_satisfactory')}: 3.01–3.50 &nbsp;|&nbsp; {t('gpa.satisfactory')}: 2.76–3.00 &nbsp;|&nbsp; {t('gpa.adequate')}: &lt; 2.76</p>
            </>
          )}
          {scale === '4.33' && (
            <>
              <p>{t('gpa.cum_laude')}: IPK ≥ 3.67</p>
              <p>{t('gpa.very_satisfactory')}: 3.34–3.66 &nbsp;|&nbsp; {t('gpa.satisfactory')}: 3.00–3.33 &nbsp;|&nbsp; {t('gpa.adequate')}: &lt; 3.00</p>
            </>
          )}
          {scale === '100' && (
            <p>A ≥ 85 &nbsp;|&nbsp; B 70–84 &nbsp;|&nbsp; C 55–69 &nbsp;|&nbsp; D 40–54 &nbsp;|&nbsp; E &lt; 40</p>
          )}
        </div>
      </div>
    </div>
  )
}
