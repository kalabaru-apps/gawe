'use client'

import { useState, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface Snippet { id: string; name: string; content: string; createdAt: number; language: string }

const STORAGE_KEY = 'gawe-pastebin'

export default function Pastebin({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newLang, setNewLang] = useState('text')

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Snippet[]
    setSnippets(stored.sort((a, b) => b.createdAt - a.createdAt))
  }, [])

  function save(updated: Snippet[]) {
    const sorted = updated.sort((a, b) => b.createdAt - a.createdAt)
    setSnippets(sorted)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  }

  function createSnippet() {
    if (!newName.trim() || !newContent.trim()) return
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 h-full">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{snippets.length} snippets</p>
          <button onClick={() => { setCreating(true); setSelected(null) }}
            className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors">
            + {t('action.add', 'New')}
          </button>
        </div>
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {snippets.length > 0 ? snippets.map((s) => (
            <div key={s.id} onClick={() => { setSelected(s.id); setCreating(false) }}
              className={`flex items-center justify-between rounded-md border px-3 py-2 cursor-pointer transition-colors group ${selected === s.id ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/30'}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.language} · {new Date(s.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id) }}
                className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-rose-400 transition-all ml-2 shrink-0">✕</button>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('common.history_empty', 'No snippets yet')}</p>
          )}
        </div>
      </div>
      <div className="lg:col-span-2 space-y-3">
        {creating ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder={`${t('common.name', 'Snippet name')}...`} />
              <select value={newLang} onChange={(e) => setNewLang(e.target.value)}
                className="text-sm border border-input rounded-md px-2 py-2 bg-background outline-none">
                {['text', 'json', 'js', 'ts', 'css', 'html', 'python', 'sql', 'bash', 'markdown'].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <CodeEditor value={newContent} onChange={setNewContent} language={newLang} />
            <div className="flex gap-2">
              <button onClick={() => { analytics.buttonClick('pastebin', 'save'); createSnippet() }} disabled={!newName.trim() || !newContent.trim()}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {t('action.save', 'Save')} Snippet
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">
                {t('action.close', 'Cancel')}
              </button>
            </div>
          </div>
        ) : selectedSnippet ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedSnippet.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedSnippet.language} · {new Date(selectedSnippet.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <CopyButton value={selectedSnippet.content} />
                <button onClick={() => deleteSnippet(selectedSnippet.id)}
                  className="px-3 py-1.5 rounded-md border border-rose-500/30 text-rose-400 text-xs hover:bg-rose-500/10 transition-colors">
                  {t('action.delete', 'Delete')}
                </button>
              </div>
            </div>
            <CodeEditor value={selectedSnippet.content} onChange={() => {}} language={selectedSnippet.language} readOnly />
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            {t('common.history_empty', 'Select a snippet or create a new one')}
          </div>
        )}
      </div>
    </div>
  )
}
