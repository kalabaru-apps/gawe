'use client'

import { useState, useCallback } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = 'book' | 'journal' | 'website' | 'thesis'
type CitationFormat = 'apa7' | 'mla9' | 'chicago17'

interface Author {
  last: string
  first: string
}

interface BookFields {
  authors: Author[]
  year: string
  title: string
  publisher: string
  city: string
  edition: string
  isbn: string
}

interface JournalFields {
  authors: Author[]
  year: string
  articleTitle: string
  journalName: string
  volume: string
  issue: string
  pages: string
  doi: string
}

interface WebsiteFields {
  authors: Author[]
  year: string
  pageTitle: string
  websiteName: string
  url: string
  accessDate: string
}

interface ThesisFields {
  author: Author
  year: string
  title: string
  type: 'Skripsi' | 'Tesis' | 'Disertasi'
  institution: string
  city: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initAuthor(): Author {
  return { last: '', first: '' }
}

function initBookFields(): BookFields {
  return { authors: [initAuthor()], year: '', title: '', publisher: '', city: '', edition: '', isbn: '' }
}

function initJournalFields(): JournalFields {
  return { authors: [initAuthor()], year: '', articleTitle: '', journalName: '', volume: '', issue: '', pages: '', doi: '' }
}

function initWebsiteFields(): WebsiteFields {
  return { authors: [initAuthor()], year: '', pageTitle: '', websiteName: '', url: '', accessDate: '' }
}

function initThesisFields(): ThesisFields {
  return { author: initAuthor(), year: '', title: '', type: 'Skripsi', institution: '', city: '' }
}

/** "Last, F. M." */
function apaAuthor(a: Author): string {
  const first = a.first.trim()
  const last = a.last.trim()
  if (!last && !first) return ''
  if (!first) return last
  const initials = first
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() + '.')
    .join(' ')
  return `${last}, ${initials}`
}

/** "Last, First Middle" */
function mlaFirstAuthor(a: Author): string {
  const first = a.first.trim()
  const last = a.last.trim()
  if (!last && !first) return ''
  if (!first) return last
  return `${last}, ${first}`
}

/** "First Last" for subsequent MLA authors */
function mlaOtherAuthor(a: Author): string {
  return [a.first.trim(), a.last.trim()].filter(Boolean).join(' ')
}

/** APA author list: "Last, F., Last, F., & Last, F." */
function apaAuthors(authors: Author[]): string {
  const filtered = authors.filter((a) => a.last.trim() || a.first.trim())
  if (filtered.length === 0) return ''
  const formatted = filtered.map(apaAuthor)
  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`
  return formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1]
}

/** MLA author list */
function mlaAuthors(authors: Author[]): string {
  const filtered = authors.filter((a) => a.last.trim() || a.first.trim())
  if (filtered.length === 0) return ''
  if (filtered.length === 1) return mlaFirstAuthor(filtered[0])
  if (filtered.length === 2) return `${mlaFirstAuthor(filtered[0])}, and ${mlaOtherAuthor(filtered[1])}`
  return `${mlaFirstAuthor(filtered[0])}, et al.`
}

/** Chicago author list */
function chicagoAuthors(authors: Author[]): string {
  const filtered = authors.filter((a) => a.last.trim() || a.first.trim())
  if (filtered.length === 0) return ''
  const full = (a: Author) => [a.first.trim(), a.last.trim()].filter(Boolean).join(' ')
  if (filtered.length === 1) return mlaFirstAuthor(filtered[0])
  if (filtered.length <= 3) {
    const parts = filtered.map((a, i) => (i === 0 ? mlaFirstAuthor(a) : full(a)))
    const last = parts.pop()!
    return parts.join(', ') + ', and ' + last
  }
  return `${mlaFirstAuthor(filtered[0])}, et al.`
}

function italicize(text: string): string {
  return `*${text}*`
}

// ─── Citation generators ──────────────────────────────────────────────────────

function generateBookCitation(fields: BookFields, format: CitationFormat): string {
  const { authors, year, title, publisher, city, edition } = fields
  const yr = year.trim() || 'n.d.'
  const t = title.trim() || 'Untitled'
  const pub = publisher.trim()
  const ed = edition.trim()

  if (format === 'apa7') {
    const auth = apaAuthors(authors)
    const edPart = ed ? ` (${ed}th ed.)` : ''
    const parts = [auth ? `${auth}.` : null, `(${yr}).`, `${italicize(t)}${edPart}.`, pub ? `${pub}.` : null]
    return parts.filter(Boolean).join(' ')
  }

  if (format === 'mla9') {
    const auth = mlaAuthors(authors)
    const edPart = ed ? `, ${ed}th ed.` : ''
    const parts = [auth ? `${auth}.` : null, `${italicize(t)}${edPart}.`, pub ? `${pub},` : null, yr ? `${yr}.` : null]
    return parts.filter(Boolean).join(' ')
  }

  // chicago17
  const auth = chicagoAuthors(authors)
  const ct = city.trim()
  const edPart = ed ? `, ${ed}th ed.` : ''
  const parts = [
    auth ? `${auth}.` : null,
    `${italicize(t)}${edPart}.`,
    ct && pub ? `${ct}: ${pub}, ${yr}.` : pub ? `${pub}, ${yr}.` : `${yr}.`,
  ]
  return parts.filter(Boolean).join(' ')
}

function generateJournalCitation(fields: JournalFields, format: CitationFormat): string {
  const { authors, year, articleTitle, journalName, volume, issue, pages, doi } = fields
  const yr = year.trim() || 'n.d.'
  const at = articleTitle.trim() || 'Untitled'
  const jn = journalName.trim()
  const vol = volume.trim()
  const iss = issue.trim()
  const pg = pages.trim()
  const doiStr = doi.trim()

  if (format === 'apa7') {
    const auth = apaAuthors(authors)
    const volPart = vol ? italicize(vol) : ''
    const issPart = iss ? `(${iss})` : ''
    const pgPart = pg ? `, ${pg}` : ''
    const doiPart = doiStr ? ` https://doi.org/${doiStr.replace(/^https?:\/\/doi\.org\//i, '')}` : ''
    const journalPart = [jn ? italicize(jn) : null, volPart + issPart + pgPart].filter(Boolean).join(', ')
    return [auth ? `${auth}.` : null, `(${yr}).`, at + '.', journalPart ? `${journalPart}.` : null, doiPart].filter(Boolean).join(' ')
  }

  if (format === 'mla9') {
    const auth = mlaAuthors(authors)
    const volPart = vol ? `vol. ${vol}` : ''
    const issPart = iss ? `no. ${iss}` : ''
    const pgPart = pg ? `pp. ${pg}` : ''
    const doiPart = doiStr ? `https://doi.org/${doiStr.replace(/^https?:\/\/doi\.org\//i, '')}` : ''
    const parts = [
      auth ? `${auth}.` : null,
      `"${at}."`,
      jn ? `${italicize(jn)},` : null,
      [volPart, issPart, yr, pgPart].filter(Boolean).join(', ') + (doiPart ? '.' : '.'),
      doiPart || null,
    ]
    return parts.filter(Boolean).join(' ')
  }

  // chicago17
  const auth = chicagoAuthors(authors)
  const volPart = vol && iss ? `${vol}, no. ${iss}` : vol ? vol : ''
  const pgPart = pg ? `: ${pg}` : ''
  const doiPart = doiStr ? ` https://doi.org/${doiStr.replace(/^https?:\/\/doi\.org\//i, '')}` : ''
  const parts = [
    auth ? `${auth}.` : null,
    `"${at}."`,
    jn ? `${italicize(jn)}` : null,
    volPart ? `${volPart} (${yr})${pgPart}.` : `(${yr})${pgPart}.`,
    doiPart || null,
  ]
  return parts.filter(Boolean).join(' ')
}

function generateWebsiteCitation(fields: WebsiteFields, format: CitationFormat): string {
  const { authors, year, pageTitle, websiteName, url, accessDate } = fields
  const yr = year.trim() || 'n.d.'
  const pt = pageTitle.trim() || 'Untitled'
  const wn = websiteName.trim()
  const u = url.trim()
  const acc = accessDate.trim()

  if (format === 'apa7') {
    const auth = apaAuthors(authors)
    return [
      auth ? `${auth}.` : null,
      `(${yr}).`,
      `${italicize(pt)}.`,
      wn ? `${wn}.` : null,
      u || null,
    ].filter(Boolean).join(' ')
  }

  if (format === 'mla9') {
    const auth = mlaAuthors(authors)
    const accPart = acc ? `, accessed ${acc}` : ''
    return [
      auth ? `${auth}.` : null,
      `"${pt}."`,
      wn ? `${italicize(wn)},` : null,
      yr ? `${yr},` : null,
      u ? `${u}${accPart}.` : null,
    ].filter(Boolean).join(' ')
  }

  // chicago17
  const auth = chicagoAuthors(authors)
  const accPart = acc ? ` Accessed ${acc}.` : ''
  return [
    auth ? `${auth}.` : null,
    `"${pt}."`,
    wn ? `${italicize(wn)}.` : null,
    yr ? `${yr}.` : null,
    u ? `${u}.` : null,
    accPart || null,
  ].filter(Boolean).join(' ')
}

function generateThesisCitation(fields: ThesisFields, format: CitationFormat): string {
  const { author, year, title, type, institution, city } = fields
  const yr = year.trim() || 'n.d.'
  const t = title.trim() || 'Untitled'
  const inst = institution.trim()
  const ct = city.trim()
  const typeLabel = type || 'Skripsi'

  if (format === 'apa7') {
    const auth = apaAuthor(author)
    return [
      auth ? `${auth}.` : null,
      `(${yr}).`,
      `${italicize(t)}`,
      `[${typeLabel}, ${inst}].`,
    ].filter(Boolean).join(' ')
  }

  if (format === 'mla9') {
    const auth = mlaFirstAuthor(author)
    return [
      auth ? `${auth}.` : null,
      `${italicize(t)}.`,
      `${typeLabel},`,
      inst ? `${inst},` : null,
      yr ? `${yr}.` : null,
    ].filter(Boolean).join(' ')
  }

  // chicago17
  const auth = mlaFirstAuthor(author)
  return [
    auth ? `${auth}.` : null,
    `"${t}."`,
    `${typeLabel},`,
    ct && inst ? `${inst}, ${ct}, ${yr}.` : inst ? `${inst}, ${yr}.` : `${yr}.`,
  ].filter(Boolean).join(' ')
}

function generateCitation(
  sourceType: SourceType,
  format: CitationFormat,
  bookFields: BookFields,
  journalFields: JournalFields,
  websiteFields: WebsiteFields,
  thesisFields: ThesisFields
): string {
  switch (sourceType) {
    case 'book': return generateBookCitation(bookFields, format)
    case 'journal': return generateJournalCitation(journalFields, format)
    case 'website': return generateWebsiteCitation(websiteFields, format)
    case 'thesis': return generateThesisCitation(thesisFields, format)
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
const LABEL = 'text-sm font-medium'

function AuthorRows({
  authors,
  onChange,
  onAdd,
  onRemove,
}: {
  authors: Author[]
  onChange: (i: number, field: keyof Author, val: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <label className={LABEL}>{t('citation.author')}</label>
      {authors.map((a, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Last name"
            value={a.last}
            onChange={(e) => onChange(i, 'last', e.target.value)}
            className={INPUT}
          />
          <input
            type="text"
            placeholder="First name(s)"
            value={a.first}
            onChange={(e) => onChange(i, 'first', e.target.value)}
            className={INPUT}
          />
          {authors.length > 1 && (
            <button
              onClick={() => onRemove(i)}
              className="shrink-0 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
              title={t('citation.add_author')}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted transition-colors"
      >
        + {t('citation.add_author')}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CitationGenerator({ onOutput, initialState }: ToolProps) {
  const { t } = useTranslation()
  const [sourceType, setSourceType] = useState<SourceType>(
    (initialState?.sourceType as SourceType) ?? 'book'
  )
  const [format, setFormat] = useState<CitationFormat>(
    (initialState?.format as CitationFormat) ?? 'apa7'
  )
  const [bookFields, setBookFields] = useState<BookFields>(
    (initialState?.bookFields as BookFields) ?? initBookFields()
  )
  const [journalFields, setJournalFields] = useState<JournalFields>(
    (initialState?.journalFields as JournalFields) ?? initJournalFields()
  )
  const [websiteFields, setWebsiteFields] = useState<WebsiteFields>(
    (initialState?.websiteFields as WebsiteFields) ?? initWebsiteFields()
  )
  const [thesisFields, setThesisFields] = useState<ThesisFields>(
    (initialState?.thesisFields as ThesisFields) ?? initThesisFields()
  )
  const [citation, setCitation] = useState<string>('')
  const [copied, setCopied] = useState(false)

  // Book helpers
  const updateBookAuthor = (i: number, field: keyof Author, val: string) =>
    setBookFields((f) => { const a = [...f.authors]; a[i] = { ...a[i], [field]: val }; return { ...f, authors: a } })
  const addBookAuthor = () => setBookFields((f) => ({ ...f, authors: [...f.authors, initAuthor()] }))
  const removeBookAuthor = (i: number) => setBookFields((f) => ({ ...f, authors: f.authors.filter((_, idx) => idx !== i) }))

  // Journal helpers
  const updateJournalAuthor = (i: number, field: keyof Author, val: string) =>
    setJournalFields((f) => { const a = [...f.authors]; a[i] = { ...a[i], [field]: val }; return { ...f, authors: a } })
  const addJournalAuthor = () => setJournalFields((f) => ({ ...f, authors: [...f.authors, initAuthor()] }))
  const removeJournalAuthor = (i: number) => setJournalFields((f) => ({ ...f, authors: f.authors.filter((_, idx) => idx !== i) }))

  // Website helpers
  const updateWebsiteAuthor = (i: number, field: keyof Author, val: string) =>
    setWebsiteFields((f) => { const a = [...f.authors]; a[i] = { ...a[i], [field]: val }; return { ...f, authors: a } })
  const addWebsiteAuthor = () => setWebsiteFields((f) => ({ ...f, authors: [...f.authors, initAuthor()] }))
  const removeWebsiteAuthor = (i: number) => setWebsiteFields((f) => ({ ...f, authors: f.authors.filter((_, idx) => idx !== i) }))

  const generate = useCallback(() => {
    const result = generateCitation(sourceType, format, bookFields, journalFields, websiteFields, thesisFields)
    setCitation(result)

    const fields =
      sourceType === 'book' ? bookFields :
      sourceType === 'journal' ? journalFields :
      sourceType === 'website' ? websiteFields :
      thesisFields

    onOutput({ sourceType, format, fields }, { citation: result })
  }, [sourceType, format, bookFields, journalFields, websiteFields, thesisFields, onOutput])

  const handleCopy = useCallback(() => {
    if (!citation) return
    navigator.clipboard.writeText(citation).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [citation])

  const SOURCE_TABS: { id: SourceType; label: string }[] = [
    { id: 'book', label: t('citation.book') },
    { id: 'journal', label: t('citation.journal') },
    { id: 'website', label: t('citation.website') },
    { id: 'thesis', label: t('citation.thesis') },
  ]

  const FORMAT_TABS: { id: CitationFormat; label: string }[] = [
    { id: 'apa7', label: 'APA 7th' },
    { id: 'mla9', label: 'MLA 9th' },
    { id: 'chicago17', label: 'Chicago 17th' },
  ]

  return (
    <div className="space-y-5">
      {/* Source type tabs */}
      <div className="space-y-1">
        <label className={LABEL}>{t('citation.source_type')}</label>
        <div className="flex flex-wrap gap-2">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSourceType(tab.id)}
              className={
                sourceType === tab.id
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors'
                  : 'rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Format tabs */}
      <div className="space-y-1">
        <label className={LABEL}>{t('citation.format')}</label>
        <div className="flex flex-wrap gap-2">
          {FORMAT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFormat(tab.id)}
              className={
                format === tab.id
                  ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors'
                  : 'rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted transition-colors'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic form */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {sourceType === 'book' && (
          <>
            <AuthorRows
              authors={bookFields.authors}
              onChange={updateBookAuthor}
              onAdd={addBookAuthor}
              onRemove={removeBookAuthor}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.year')}</label>
                <input type="text" placeholder="2023" value={bookFields.year}
                  onChange={(e) => setBookFields((f) => ({ ...f, year: e.target.value }))} className={INPUT} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.edition')}</label>
                <input type="text" placeholder="3" value={bookFields.edition}
                  onChange={(e) => setBookFields((f) => ({ ...f, edition: e.target.value }))} className={INPUT} />
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.title')}</label>
              <input type="text" placeholder={t('citation.title')} value={bookFields.title}
                onChange={(e) => setBookFields((f) => ({ ...f, title: e.target.value }))} className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.publisher')}</label>
                <input type="text" placeholder={t('citation.publisher')} value={bookFields.publisher}
                  onChange={(e) => setBookFields((f) => ({ ...f, publisher: e.target.value }))} className={INPUT} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.city')}</label>
                <input type="text" placeholder="Jakarta" value={bookFields.city}
                  onChange={(e) => setBookFields((f) => ({ ...f, city: e.target.value }))} className={INPUT} />
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL}>ISBN</label>
              <input type="text" placeholder="978-..." value={bookFields.isbn}
                onChange={(e) => setBookFields((f) => ({ ...f, isbn: e.target.value }))} className={INPUT} />
            </div>
          </>
        )}

        {sourceType === 'journal' && (
          <>
            <AuthorRows
              authors={journalFields.authors}
              onChange={updateJournalAuthor}
              onAdd={addJournalAuthor}
              onRemove={removeJournalAuthor}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.year')}</label>
                <input type="text" placeholder="2023" value={journalFields.year}
                  onChange={(e) => setJournalFields((f) => ({ ...f, year: e.target.value }))} className={INPUT} />
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.title')}</label>
              <input type="text" placeholder={t('citation.title')} value={journalFields.articleTitle}
                onChange={(e) => setJournalFields((f) => ({ ...f, articleTitle: e.target.value }))} className={INPUT} />
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.journal_name')}</label>
              <input type="text" placeholder={t('citation.journal_name')} value={journalFields.journalName}
                onChange={(e) => setJournalFields((f) => ({ ...f, journalName: e.target.value }))} className={INPUT} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.volume')}</label>
                <input type="text" placeholder="12" value={journalFields.volume}
                  onChange={(e) => setJournalFields((f) => ({ ...f, volume: e.target.value }))} className={INPUT} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.issue')}</label>
                <input type="text" placeholder="3" value={journalFields.issue}
                  onChange={(e) => setJournalFields((f) => ({ ...f, issue: e.target.value }))} className={INPUT} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.pages')}</label>
                <input type="text" placeholder="45–67" value={journalFields.pages}
                  onChange={(e) => setJournalFields((f) => ({ ...f, pages: e.target.value }))} className={INPUT} />
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.doi')}</label>
              <input type="text" placeholder="10.xxxx/xxxxx" value={journalFields.doi}
                onChange={(e) => setJournalFields((f) => ({ ...f, doi: e.target.value }))} className={INPUT} />
            </div>
          </>
        )}

        {sourceType === 'website' && (
          <>
            <AuthorRows
              authors={websiteFields.authors}
              onChange={updateWebsiteAuthor}
              onAdd={addWebsiteAuthor}
              onRemove={removeWebsiteAuthor}
            />
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.year')}</label>
              <input type="text" placeholder="2023, March 15" value={websiteFields.year}
                onChange={(e) => setWebsiteFields((f) => ({ ...f, year: e.target.value }))} className={INPUT} />
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.title')}</label>
              <input type="text" placeholder={t('citation.title')} value={websiteFields.pageTitle}
                onChange={(e) => setWebsiteFields((f) => ({ ...f, pageTitle: e.target.value }))} className={INPUT} />
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.website_name')}</label>
              <input type="text" placeholder={t('citation.website_name')} value={websiteFields.websiteName}
                onChange={(e) => setWebsiteFields((f) => ({ ...f, websiteName: e.target.value }))} className={INPUT} />
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.url')}</label>
              <input type="url" placeholder="https://..." value={websiteFields.url}
                onChange={(e) => setWebsiteFields((f) => ({ ...f, url: e.target.value }))} className={INPUT} />
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.access_date')}</label>
              <input type="text" placeholder={t('citation.access_date')} value={websiteFields.accessDate}
                onChange={(e) => setWebsiteFields((f) => ({ ...f, accessDate: e.target.value }))} className={INPUT} />
            </div>
          </>
        )}

        {sourceType === 'thesis' && (
          <>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.author')}</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Last name" value={thesisFields.author.last}
                  onChange={(e) => setThesisFields((f) => ({ ...f, author: { ...f.author, last: e.target.value } }))} className={INPUT} />
                <input type="text" placeholder="First name(s)" value={thesisFields.author.first}
                  onChange={(e) => setThesisFields((f) => ({ ...f, author: { ...f.author, first: e.target.value } }))} className={INPUT} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.year')}</label>
                <input type="text" placeholder="2023" value={thesisFields.year}
                  onChange={(e) => setThesisFields((f) => ({ ...f, year: e.target.value }))} className={INPUT} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.thesis_type')}</label>
                <select
                  value={thesisFields.type}
                  onChange={(e) => setThesisFields((f) => ({ ...f, type: e.target.value as ThesisFields['type'] }))}
                  className={INPUT}
                >
                  <option value="Skripsi">Skripsi</option>
                  <option value="Tesis">Tesis</option>
                  <option value="Disertasi">Disertasi</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className={LABEL}>{t('citation.title')}</label>
              <input type="text" placeholder={t('citation.title')} value={thesisFields.title}
                onChange={(e) => setThesisFields((f) => ({ ...f, title: e.target.value }))} className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.institution')}</label>
                <input type="text" placeholder="Universitas Indonesia" value={thesisFields.institution}
                  onChange={(e) => setThesisFields((f) => ({ ...f, institution: e.target.value }))} className={INPUT} />
              </div>
              <div className="space-y-1">
                <label className={LABEL}>{t('citation.city')}</label>
                <input type="text" placeholder="Jakarta" value={thesisFields.city}
                  onChange={(e) => setThesisFields((f) => ({ ...f, city: e.target.value }))} className={INPUT} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => { analytics.buttonClick('citation-generator', 'generate'); generate() }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {t('citation.generate')}
        </button>
        {citation && (
          <button onClick={handleCopy}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition-colors">
            {copied ? t('action.copied') : t('citation.copy')}
          </button>
        )}
      </div>

      {/* Citation output */}
      {citation && (
        <div className="space-y-2">
          <label className={LABEL}>{t('citation.result')}</label>
          <div className="rounded-md bg-muted p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
            {citation}
          </div>
          <p className="text-xs text-muted-foreground">
            Catatan: Tanda *teks* menandakan cetak miring dalam format akhir.
          </p>
        </div>
      )}
    </div>
  )
}
