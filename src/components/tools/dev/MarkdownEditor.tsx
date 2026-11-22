'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import type { ToolProps } from '@/types'
import {
  FilePlus, FolderOpen, Save, Download, Bold, Italic, Strikethrough, Code, SquareCode, List, ListOrdered,
  ListChecks, Quote, Link as LinkIcon, Image as ImageIcon, Table, Minus, FileText, X, Plus,
} from 'lucide-react'

// ─── File System Access API types ────────────────────────────────────────────
interface FSFileHandle {
  kind: 'file'
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<FSWritableStream>
}
interface FSWritableStream {
  write(data: string): Promise<void>
  close(): Promise<void>
}
declare global {
  interface Window {
    showOpenFilePicker?(opts?: {
      types?: { description: string; accept: Record<string, string[]> }[]
      multiple?: boolean
    }): Promise<FSFileHandle[]>
    showSaveFilePicker?(opts?: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }): Promise<FSFileHandle>
  }
}

// ─── marked setup ─────────────────────────────────────────────────────────────
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  })
)
marked.setOptions({ gfm: true, breaks: true })

// ─── recent file entry (handle can't be serialized : stored in memory) ───────
interface RecentEntry { name: string; handle: FSFileHandle | null; content: string; savedAt: number }

// ─── helpers ──────────────────────────────────────────────────────────────────
const FS_SUPPORTED = typeof window !== 'undefined' && 'showOpenFilePicker' in window

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function lineCount(text: string) {
  return text.split('\n').length
}

function estimateReadTime(text: string) {
  const words = wordCount(text)
  const mins = Math.ceil(words / 200)
  return mins < 1 ? '<1 min' : `${mins} min`
}

// ─── insert helpers ────────────────────────────────────────────────────────────
function insertAround(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string,
  setValue: (v: string) => void,
) {
  const { selectionStart: s, selectionEnd: e, value } = textarea
  const sel = value.slice(s, e) || placeholder
  const next = value.slice(0, s) + before + sel + after + value.slice(e)
  setValue(next)
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(s + before.length, s + before.length + sel.length)
  }, 0)
}

function insertLine(
  textarea: HTMLTextAreaElement,
  prefix: string,
  placeholder: string,
  setValue: (v: string) => void,
) {
  const { selectionStart: s, value } = textarea
  const lineStart = value.lastIndexOf('\n', s - 1) + 1
  const lineEnd = value.indexOf('\n', s)
  const end = lineEnd === -1 ? value.length : lineEnd
  const line = value.slice(lineStart, end)
  const newLine = line ? `${prefix}${line}` : `${prefix}${placeholder}`
  const next = value.slice(0, lineStart) + newLine + value.slice(end)
  setValue(next)
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(lineStart + prefix.length, lineStart + newLine.length)
  }, 0)
}

// ─── file list panel ──────────────────────────────────────────────────────────
interface FileListProps {
  files: RecentEntry[]
  activeIdx: number | null
  onSelect: (i: number) => void
  onNew: () => void
  onDelete: (i: number) => void
}

function FileList({ files, activeIdx, onSelect, onNew, onDelete }: FileListProps) {
  return (
    <nav aria-label="Documents" className="flex w-52 shrink-0 flex-col border-r border-d-border bg-d-raised max-md:hidden">
      <div className="flex h-10 items-center justify-between border-b border-d-border px-3">
        <h2 className="font-serif text-base font-semibold">Documents</h2>
        <button onClick={onNew} aria-label="New file" title="New file"
          className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-d hover:bg-d-border/50 focus-visible:outline-2 focus-visible:outline-d-accent"><Plus className="h-4 w-4" aria-hidden /></button>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {files.length === 0 && (
          <li className="px-3 py-4 text-sm leading-relaxed text-d-muted">Nothing here yet. Create a document or open one from disk.</li>
        )}
        {files.map((f, i) => (
          <li key={i} className={`group flex items-center border-b border-d-border/60 ${activeIdx === i ? 'bg-d-accent/10' : ''}`}>
            <button onClick={() => onSelect(i)} aria-current={activeIdx === i ? 'true' : undefined}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-d-accent">
              <FileText className={`h-4 w-4 shrink-0 ${activeIdx === i ? 'text-d-accent' : 'text-d-muted'}`} aria-hidden />
              <span className="truncate">{f.name}</span>
            </button>
            <button onClick={() => onDelete(i)} aria-label={`Delete ${f.name}`} title="Delete"
              className="mr-1 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-d text-d-muted opacity-0 hover:bg-d-border/50 hover:text-d-ink focus-visible:opacity-100 group-hover:opacity-100 focus-visible:outline-2 focus-visible:outline-d-accent"><X className="h-3.5 w-3.5" aria-hidden /></button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function MarkdownEditor({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<RecentEntry[]>([])
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load in-memory files from sessionStorage (handles can't be serialized)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('gawe-md-editor-files')
      if (raw) {
        const parsed = JSON.parse(raw) as Omit<RecentEntry, 'handle'>[]
        setFiles(parsed.map(f => ({ ...f, handle: null })))
        if (parsed.length > 0) { setActiveIdx(0); setContent(parsed[0].content) }
      }
    } catch { /* empty */ }
  }, [])

  // Persist content list (without handles) to sessionStorage
  useEffect(() => {
    if (files.length === 0) return
    const serializable = files.map(({ handle: _h, ...rest }) => rest)
    sessionStorage.setItem('gawe-md-editor-files', JSON.stringify(serializable))
  }, [files])

  function flash(msg: string) { setStatus(msg); setTimeout(() => setStatus(''), 2500) }

  // ── file list ops ────────────────────────────────────────────────────────────
  function newFile() {
    const entry: RecentEntry = { name: `untitled-${Date.now()}.md`, handle: null, content: '# Untitled\n\n', savedAt: Date.now() }
    setFiles(prev => [entry, ...prev])
    setActiveIdx(0)
    setContent(entry.content)
    setDirty(false)
  }

  function selectFile(i: number) {
    if (dirty && activeIdx !== null) {
      // auto-save in-memory before switching
      setFiles(prev => prev.map((f, idx) => idx === activeIdx ? { ...f, content } : f))
    }
    setActiveIdx(i)
    setContent(files[i].content)
    setDirty(false)
  }

  function deleteFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i))
    if (activeIdx === i) { setActiveIdx(null); setContent(''); setDirty(false) }
    else if (activeIdx !== null && activeIdx > i) setActiveIdx(activeIdx - 1)
  }

  function handleContentChange(val: string) {
    setContent(val)
    setDirty(true)
    if (activeIdx !== null) {
      setFiles(prev => prev.map((f, i) => i === activeIdx ? { ...f, content: val } : f))
    }
  }

  // ── File System Access API ───────────────────────────────────────────────────
  async function openFile() {
    if (!FS_SUPPORTED) {
      flash('File System Access API not supported in this browser')
      return
    }
    try {
      const [handle] = await window.showOpenFilePicker!({
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.txt'] } }],
      })
      const file = await handle.getFile()
      const text = await file.text()
      const entry: RecentEntry = { name: file.name, handle, content: text, savedAt: Date.now() }
      setFiles(prev => {
        // Replace existing entry with same name if present
        const idx = prev.findIndex(f => f.name === file.name)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = entry
          setActiveIdx(idx)
          return next
        }
        setActiveIdx(0)
        return [entry, ...prev]
      })
      setContent(text)
      setDirty(false)
      flash(`Opened ${file.name}`)
      onOutput({ action: 'open', name: file.name }, {})
    } catch (e) {
      if ((e as Error).name !== 'AbortError') flash('Failed to open file')
    }
  }

  async function saveFile() {
    if (activeIdx === null) return
    setSaving(true)
    const entry = files[activeIdx]
    try {
      let handle = entry.handle
      if (!handle) {
        if (!FS_SUPPORTED) {
          // Fallback: download
          const blob = new Blob([content], { type: 'text/markdown' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = entry.name
          a.click()
          URL.revokeObjectURL(a.href)
          flash(`Downloaded ${entry.name}`)
          setSaving(false)
          return
        }
        handle = await window.showSaveFilePicker!({
          suggestedName: entry.name,
          types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } }],
        })
      }
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      const name = handle.name
      setFiles(prev => prev.map((f, i) => i === activeIdx ? { ...f, handle, name, content, savedAt: Date.now() } : f))
      setDirty(false)
      flash(`Saved ${name}`)
      onOutput({ action: 'save', name }, {})
    } catch (e) {
      if ((e as Error).name !== 'AbortError') flash('Save failed')
    }
    setSaving(false)
  }

  async function saveAs() {
    if (activeIdx === null || !FS_SUPPORTED) return
    const entry = files[activeIdx]
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName: entry.name,
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      setFiles(prev => prev.map((f, i) => i === activeIdx ? { ...f, handle, name: handle.name, content, savedAt: Date.now() } : f))
      setDirty(false)
      flash(`Saved as ${handle.name}`)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') flash('Save failed')
    }
  }

  function exportHtml() {
    if (!content) return
    const body = marked.parse(content) as string
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${files[activeIdx ?? 0]?.name ?? 'document'}</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.7;color:#111}
  pre{background:#f4f4f4;padding:1em;border-radius:6px;overflow-x:auto}
  code{background:#f4f4f4;padding:.2em .4em;border-radius:3px;font-size:.9em}
  pre code{background:none;padding:0}
  blockquote{border-left:4px solid #ddd;margin:0;padding:0 1em;color:#555}
  table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:.5em}
  img{max-width:100%}
</style>
</head>
<body>${body}</body>
</html>`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = (files[activeIdx ?? 0]?.name ?? 'document').replace(/\.(md|markdown)$/, '.html')
    a.click()
    URL.revokeObjectURL(a.href)
    flash('Exported as HTML')
  }

  // ── toolbar insert actions ────────────────────────────────────────────────────
  const ta = textareaRef.current
  const ins = useCallback((before: string, after: string, placeholder: string) => {
    if (ta) insertAround(ta, before, after, placeholder, handleContentChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ta])
  const insLine = useCallback((prefix: string, placeholder: string) => {
    if (ta) insertLine(ta, prefix, placeholder, handleContentChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ta])

  // Ctrl/Cmd+S shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveFile()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, content, files])

  // ── rendered HTML ─────────────────────────────────────────────────────────────
  const html = useMemo(() => {
    if (!content) return ''
    return marked.parse(content) as string
  }, [content])

  const activeFile = activeIdx !== null ? files[activeIdx] : null
  const tb = 'inline-flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-d px-2 text-sm text-d-ink transition-colors hover:bg-d-border/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-d-accent disabled:cursor-not-allowed disabled:opacity-40'
  const ic = 'h-4 w-4'
  const sep = <span className="mx-1.5 h-5 w-px bg-d-border" aria-hidden />

  return (
    <div className="flex h-full min-h-0">
      {/* Documents */}
      <FileList files={files} activeIdx={activeIdx} onSelect={selectFile} onNew={newFile} onDelete={deleteFile} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Ribbon: file actions, then formatting, then view */}
        <div role="toolbar" aria-label="Editor" className="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-d-border bg-d-raised px-3 py-1.5">
          <button className={tb} aria-label="New file" title="New file" onClick={newFile}><FilePlus className={ic} aria-hidden /><span className="hidden xl:inline">New</span></button>
          <button className={tb} aria-label="Open file from disk" title="Open file from disk" onClick={openFile}><FolderOpen className={ic} aria-hidden /><span className="hidden xl:inline">Open</span></button>
          <button className={tb} aria-label="Save (Ctrl+S)" title="Save (Ctrl+S)" onClick={() => { analytics.buttonClick('markdown-editor', 'copy'); void saveFile() }}>
            <Save className={ic} aria-hidden /><span className="hidden xl:inline">{saving ? 'Saving' : dirty ? 'Save *' : 'Save'}</span>
          </button>
          {FS_SUPPORTED && <button className={tb} onClick={saveAs}><span className="text-xs">Save as</span></button>}
          <button className={tb} aria-label="Export as HTML" title="Export as HTML" onClick={exportHtml}><Download className={ic} aria-hidden /><span className="hidden xl:inline">HTML</span></button>

          {activeFile && (
            <>
              {sep}
              <select
                aria-label="Paragraph style"
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v) insLine(`${'#'.repeat(Number(v))} `, `Heading ${v}`)
                  e.target.value = ''
                }}
                className="h-8 cursor-pointer rounded-d border border-d-border bg-d-raised px-2 text-sm text-d-ink focus-visible:outline-2 focus-visible:outline-d-accent"
              >
                <option value="" disabled>Style</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
              </select>
              <button className={tb} aria-label="Bold" title="Bold" onClick={() => ins('**', '**', 'bold text')}><Bold className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Italic" title="Italic" onClick={() => ins('*', '*', 'italic text')}><Italic className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Strikethrough" title="Strikethrough" onClick={() => ins('~~', '~~', 'text')}><Strikethrough className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Inline code" title="Inline code" onClick={() => ins('`', '`', 'code')}><Code className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Code block" title="Code block" onClick={() => ins('```\n', '\n```', 'code')}><SquareCode className={ic} aria-hidden /></button>
              {sep}
              <button className={tb} aria-label="Bulleted list" title="Bulleted list" onClick={() => insLine('- ', 'list item')}><List className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Numbered list" title="Numbered list" onClick={() => insLine('1. ', 'list item')}><ListOrdered className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Task list" title="Task list" onClick={() => insLine('- [ ] ', 'task')}><ListChecks className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Quote" title="Quote" onClick={() => insLine('> ', 'quote')}><Quote className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Link" title="Link" onClick={() => ins('[', '](url)', 'link text')}><LinkIcon className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Image" title="Image" onClick={() => ins('![', '](url)', 'alt text')}><ImageIcon className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Table" title="Table" onClick={() => handleContentChange(content + '\n\n| Column 1 | Column 2 |\n|---|---|\n| Cell | Cell |\n\n')}><Table className={ic} aria-hidden /></button>
              <button className={tb} aria-label="Divider" title="Divider" onClick={() => handleContentChange(content + '\n\n---\n\n')}><Minus className={ic} aria-hidden /></button>
            </>
          )}

          <div role="radiogroup" aria-label="View" className="ml-auto inline-flex overflow-hidden rounded-d border border-d-border">
            {([['editor', 'Write'], ['split', 'Both'], ['preview', 'Read']] as const).map(([v, label]) => (
              <button
                key={v}
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                className={`h-8 cursor-pointer px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-d-accent ${view === v ? 'bg-d-ink text-d-surface' : 'text-d-muted hover:bg-d-border/40'}`}
              >{label}</button>
            ))}
          </div>
        </div>

        {!activeFile ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <h2 className="font-serif text-3xl font-semibold">Start a document</h2>
            <p className="max-w-sm text-d-muted">Write Markdown on the left and read the formatted page on the right. Nothing leaves your device.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={newFile} className="cursor-pointer rounded-d bg-d-accent px-5 py-2.5 text-sm font-semibold text-d-accent-ink hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-d-accent">New document</button>
              {FS_SUPPORTED && <button onClick={openFile} className="cursor-pointer rounded-d border border-d-border px-5 py-2.5 text-sm hover:bg-d-border/40 focus-visible:outline-2 focus-visible:outline-d-accent">Open from disk</button>}
            </div>
            {!FS_SUPPORTED && <p className="text-sm text-d-muted">This browser cannot save in place, so Save downloads a file.</p>}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {(view === 'editor' || view === 'split') && (
              <div className={view === 'split' ? 'flex w-1/2 flex-col border-r border-d-border' : 'flex w-full flex-col'}>
                <textarea
                  ref={textareaRef}
                  aria-label="Markdown source"
                  value={content}
                  onChange={e => handleContentChange(e.target.value)}
                  spellCheck={false}
                  className="h-full w-full flex-1 resize-none bg-d-surface p-6 font-mono text-[13px] leading-7 text-d-ink outline-none focus-visible:bg-d-raised"
                  placeholder="Start writing Markdown"
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const el = e.currentTarget
                      const s = el.selectionStart, end = el.selectionEnd
                      handleContentChange(el.value.slice(0, s) + '  ' + el.value.slice(end))
                      setTimeout(() => el.setSelectionRange(s + 2, s + 2), 0)
                    }
                  }}
                />
              </div>
            )}

            {(view === 'preview' || view === 'split') && (
              <div className={`overflow-y-auto bg-d-surface p-6 ${view === 'split' ? 'w-1/2' : 'w-full'}`}>
                <article className="md-page mx-auto min-h-full max-w-[44rem] rounded-d border border-d-border bg-d-raised px-8 py-10 shadow-[0_8px_24px_-16px_hsl(var(--d-ink)/0.25)]">
                  {html
                    ? <div dangerouslySetInnerHTML={{ __html: html }} />
                    : <p className="text-d-muted">The formatted page appears here as you type.</p>}
                </article>
              </div>
            )}
          </div>
        )}

        {/* Document status */}
        <div className="flex h-7 shrink-0 items-center gap-4 border-t border-d-border bg-d-raised px-3 text-xs text-d-muted" role="status">
          <span className="truncate">{activeFile ? `${activeFile.name}${dirty ? ' (unsaved)' : ''}${activeFile.handle ? ' · on disk' : ''}` : 'No document open'}</span>
          {status && <span className="text-d-accent">{status}</span>}
          {content && <span className="ml-auto whitespace-nowrap tabular-nums">{wordCount(content)} words · {lineCount(content)} lines · {estimateReadTime(content)} read</span>}
        </div>
      </div>

      <style>{`
        .md-page{font-family:var(--font-newsreader),Georgia,serif;font-size:1.0625rem;line-height:1.75;color:hsl(var(--d-ink))}
        .md-page h1,.md-page h2,.md-page h3,.md-page h4{font-weight:600;line-height:1.25;margin:1.6em 0 .5em}
        .md-page h1{font-size:2rem;margin-top:0}
        .md-page h2{font-size:1.5rem;border-bottom:1px solid hsl(var(--d-border));padding-bottom:.2em}
        .md-page h3{font-size:1.2rem}
        .md-page p{margin:.8em 0}
        .md-page a{color:hsl(var(--d-accent));text-decoration:underline;text-underline-offset:2px}
        .md-page ul{list-style:disc;padding-left:1.5em;margin:.6em 0}
        .md-page ol{list-style:decimal;padding-left:1.5em;margin:.6em 0}
        .md-page blockquote{border-left:3px solid hsl(var(--d-border));padding-left:1em;color:hsl(var(--d-muted));margin:1em 0;font-style:italic}
        .md-page code{background:hsl(var(--d-surface));padding:.15em .4em;border-radius:3px;font-size:.85em;font-family:var(--font-plex-mono),monospace}
        .md-page pre{background:#282c34;color:#abb2bf;border-radius:4px;padding:1em;overflow-x:auto;margin:1em 0}
        .md-page pre code{background:none;padding:0;color:inherit}
        .md-page table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.95em}
        .md-page th,.md-page td{border:1px solid hsl(var(--d-border));padding:.4em .75em;text-align:left}
        .md-page th{background:hsl(var(--d-surface));font-weight:600}
        .md-page hr{border:none;border-top:1px solid hsl(var(--d-border));margin:2em 0}
        .md-page img{max-width:100%}
        .md-page input[type=checkbox]{margin-right:.4em}
        .hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}
        .hljs-doctag,.hljs-keyword,.hljs-formula{color:#c678dd}
        .hljs-section,.hljs-name,.hljs-selector-tag,.hljs-deletion,.hljs-subst{color:#e06c75}
        .hljs-literal{color:#56b6c2}
        .hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute{color:#98c379}
        .hljs-attr,.hljs-variable,.hljs-type,.hljs-selector-class,.hljs-number{color:#d19a66}
        .hljs-symbol,.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-title{color:#61aeee}
        .hljs-built_in{color:#e6c07b}
      `}</style>
    </div>
  )
}
