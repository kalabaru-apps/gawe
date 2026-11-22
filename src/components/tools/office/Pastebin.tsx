'use client'

import { useState, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Page, Btn, IconBtn, Field, TextInput, TextArea, Select, CopyBtn, Notice, Column, Scroll } from '@/components/domain'
import { cn } from '@/lib/utils'
import { Plus, X, Trash2 } from 'lucide-react'

interface Snippet { id: string; name: string; content: string; createdAt: number; language: string }

const STORAGE_KEY = 'gawe-pastebin'
const LANGS = [
  ['text', 'Text'], ['json', 'JSON'], ['js', 'JavaScript'], ['ts', 'TypeScript'], ['css', 'CSS'],
  ['html', 'HTML'], ['python', 'Python'], ['sql', 'SQL'], ['bash', 'Bash'], ['markdown', 'Markdown'],
] as const

export default function Pastebin({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newLang, setNewLang] = useState('text')
  const [langFilter, setLangFilter] = useState('all')

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Snippet[]
      setSnippets(stored.sort((a, b) => b.createdAt - a.createdAt))
    } catch { /* corrupt storage: start empty */ }
  }, [])

  function save(updated: Snippet[]) {
    const sorted = [...updated].sort((a, b) => b.createdAt - a.createdAt)
    setSnippets(sorted)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  }

  function createSnippet() {
    if (!newName.trim() || !newContent.trim()) return
    analytics.buttonClick('pastebin', 'save')
    const s: Snippet = { id: Date.now().toString(), name: newName.trim(), content: newContent, createdAt: Date.now(), language: newLang }
    save([s, ...snippets])
    setSelected(s.id)
    setCreating(false)
    setNewName('')
    setNewContent('')
    setNewLang('text')
  }

  function deleteSnippet(id: string) {
    save(snippets.filter((s) => s.id !== id))
    if (selected === id) setSelected(null)
  }

  const selectedSnippet = snippets.find((s) => s.id === selected)
  const filtered = langFilter === 'all' ? snippets : snippets.filter((s) => s.language === langFilter)

  return (
    <Scroll>
      <Column width="xl">
        <header>
          <h1 className="font-serif text-3xl font-semibold">{t('office.pastebin', 'Pastebin')}</h1>
          <p className="mt-1 text-sm text-d-muted">{t('office.pastebin_desc', 'Code snippets. Saved locally. Copy anytime.')}</p>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr]">
          <Page className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium" aria-live="polite">{filtered.length} snippets</p>
              <Btn size="sm" variant="primary" onClick={() => { setCreating(true); setSelected(null) }}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('action.add', 'New')}
              </Btn>
            </div>
            {snippets.length > 0 && (
              <Select aria-label={t('common.language', 'Language')} value={langFilter} onChange={(e) => setLangFilter(e.target.value)}>
                <option value="all">{t('common.all', 'All')}</option>
                {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
            <ul className="flex max-h-[28rem] flex-col gap-1 overflow-auto">
              {filtered.length === 0 && (
                <li className="py-4 text-center text-sm text-d-muted">{t('common.history_empty', 'No snippets yet')}</li>
              )}
              {filtered.map((s) => (
                <li key={s.id} className={cn('flex items-center rounded-d border', selected === s.id ? 'border-d-accent bg-d-accent/10' : 'border-d-border hover:bg-d-border/40')}>
                  <button
                    onClick={() => { setSelected(s.id); setCreating(false) }}
                    aria-current={selected === s.id ? 'true' : undefined}
                    className="min-w-0 flex-1 cursor-pointer px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-d-accent"
                  >
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-d-muted">{s.language}, {new Date(s.createdAt).toLocaleDateString()}</span>
                  </button>
                  <IconBtn label={`${t('action.delete', 'Delete')} ${s.name}`} onClick={() => deleteSnippet(s.id)}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </IconBtn>
                </li>
              ))}
            </ul>
          </Page>

          <div className="min-w-0">
            {creating ? (
              <Page className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_10rem]">
                  <Field id="pb-name" label={t('common.name', 'Name')}>
                    <TextInput id="pb-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="snippet.js" />
                  </Field>
                  <Field id="pb-lang" label={t('common.language', 'Language')}>
                    <Select id="pb-lang" value={newLang} onChange={(e) => setNewLang(e.target.value)}>
                      {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field id="pb-code" label={t('office.code', 'Code')}>
                  <TextArea id="pb-code" mono rows={14} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder={t('office.paste_text', 'Paste your code here')} />
                </Field>
                <div className="flex gap-2">
                  <Btn variant="primary" onClick={createSnippet} disabled={!newName.trim() || !newContent.trim()}>{t('action.save', 'Save')}</Btn>
                  <Btn variant="quiet" onClick={() => setCreating(false)}>{t('action.cancel', 'Cancel')}</Btn>
                </div>
              </Page>
            ) : selectedSnippet ? (
              <Page className="flex flex-col gap-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold break-words">{selectedSnippet.name}</h2>
                  <p className="text-xs text-d-muted">
                    {selectedSnippet.language}, {new Date(selectedSnippet.createdAt).toLocaleDateString()} {new Date(selectedSnippet.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <TextArea mono readOnly rows={14} aria-label={t('office.code', 'Code')} value={selectedSnippet.content} />
                <div className="flex items-center justify-between border-t border-d-border pt-3">
                  <CopyBtn value={selectedSnippet.content} label={t('action.copy', 'Copy')} />
                  <Btn variant="quiet" onClick={() => deleteSnippet(selectedSnippet.id)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {t('action.delete', 'Delete')}
                  </Btn>
                </div>
              </Page>
            ) : (
              <Notice tone="info">
                {snippets.length === 0
                  ? t('common.history_empty', 'No snippets yet. Press New to create one.')
                  : t('office.scratchpad_select', 'Select a snippet or create a new one.')}
              </Notice>
            )}
          </div>
        </div>
      </Column>
    </Scroll>
  )
}
