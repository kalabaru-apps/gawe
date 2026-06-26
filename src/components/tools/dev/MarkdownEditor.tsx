'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import type { ToolProps } from '@/types'

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

// ─── toolbar button ────────────────────────────────────────────────────────────
function TBtn({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button title={title} onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-mono transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}>
      {children}
    </button>
  )
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
    <div className="flex flex-col h-full border-r border-input/60 bg-muted/10" style={{ width: 200, minWidth: 160 }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-input/40">
        <span className="text-xs font-medium text-muted-foreground">Files</span>
        <button onClick={onNew} title="New file"
          className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded px-1.5 py-0.5 transition-colors">＋</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-4 text-center leading-relaxed">No files yet.<br />Create new or open from disk.</p>
        )}
        {files.map((f, i) => (
          <div key={i}
            className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer transition-colors border-b border-input/20 ${activeIdx === i ? 'bg-primary/10 text-primary' : 'hover:bg-muted/40 text-foreground'}`}
            onClick={() => onSelect(i)}>
            <span className="text-[10px] text-muted-foreground shrink-0">📄</span>
            <span className="flex-1 text-xs truncate">{f.name}</span>
            {f.handle && <span className="text-[9px] text-emerald-400 shrink-0" title="Linked to local file">●</span>}
            <button onClick={e => { e.stopPropagation(); onDelete(i) }}
              className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all shrink-0">✕</button>
          </div>
        ))}
      </div>
    </div>
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

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 120px)', minHeight: 500 }}>
      {/* Sidebar file list */}
      <FileList files={files} activeIdx={activeIdx} onSelect={selectFile} onNew={newFile} onDelete={deleteFile} />

      {/* Editor area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top toolbar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-input/60 bg-muted/10 flex-wrap">
          {/* File ops */}
          <div className="flex items-center gap-1 pr-2 border-r border-input/40">
            <TBtn title="New file" onClick={newFile}>＋ New</TBtn>
            <TBtn title="Open file from disk" onClick={openFile}>⬆ Open</TBtn>
            <TBtn title="Save (Ctrl+S)" onClick={() => { analytics.buttonClick('markdown-editor', 'copy'); void saveFile() }}>
              {saving ? '…' : dirty ? '● Save' : '✓ Save'}
            </TBtn>
            {FS_SUPPORTED && <TBtn title="Save As" onClick={saveAs}>Save As</TBtn>}
            <TBtn title="Export as HTML" onClick={exportHtml}>⬇ HTML</TBtn>
          </div>

          {/* Format ops */}
          {activeFile && (
            <div className="flex items-center gap-0.5 pr-2 border-r border-input/40">
              <TBtn title="Bold" onClick={() => ins('**', '**', 'bold text')}><b>B</b></TBtn>
              <TBtn title="Italic" onClick={() => ins('*', '*', 'italic text')}><i>I</i></TBtn>
              <TBtn title="Strikethrough" onClick={() => ins('~~', '~~', 'text')}>~~S~~</TBtn>
              <TBtn title="Inline code" onClick={() => ins('`', '`', 'code')}>` `</TBtn>
              <TBtn title="Code block" onClick={() => ins('```\n', '\n```', 'code')}>```</TBtn>
              <TBtn title="Link" onClick={() => ins('[', '](url)', 'link text')}>🔗</TBtn>
              <TBtn title="Image" onClick={() => ins('![', '](url)', 'alt text')}>🖼</TBtn>
              <TBtn title="Blockquote" onClick={() => insLine('> ', 'quote')}>❝</TBtn>
              <TBtn title="Heading 1" onClick={() => insLine('# ', 'Heading 1')}>H1</TBtn>
              <TBtn title="Heading 2" onClick={() => insLine('## ', 'Heading 2')}>H2</TBtn>
              <TBtn title="Heading 3" onClick={() => insLine('### ', 'Heading 3')}>H3</TBtn>
              <TBtn title="Unordered list" onClick={() => insLine('- ', 'list item')}>• –</TBtn>
              <TBtn title="Ordered list" onClick={() => insLine('1. ', 'list item')}>1.</TBtn>
              <TBtn title="Task list item" onClick={() => insLine('- [ ] ', 'task')}>☐</TBtn>
              <TBtn title="Horizontal rule" onClick={() => handleContentChange(content + '\n\n---\n\n')}>—</TBtn>
              <TBtn title="Table template" onClick={() => handleContentChange(content + '\n\n| Column 1 | Column 2 |\n|---|---|\n| Cell | Cell |\n\n')}>⊞</TBtn>
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center gap-0.5 ml-auto">
            {(['editor', 'split', 'preview'] as const).map(v => (
              <TBtn key={v} title={v} onClick={() => setView(v)} active={view === v}>
                {v === 'editor' ? '✏' : v === 'preview' ? '👁' : '⊟'}
              </TBtn>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-3 py-1 border-b border-input/30 bg-muted/5">
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {activeFile ? (
              <>{activeFile.handle ? '📁' : '🔵'} {activeFile.name}{dirty ? ' ●' : ''}</>
            ) : 'No file open'}
          </span>
          {content && (
            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
              {wordCount(content)} words · {lineCount(content)} lines · {estimateReadTime(content)} read
            </span>
          )}
          {status && <span className="text-[10px] text-emerald-400 whitespace-nowrap">{status}</span>}
        </div>

        {/* Empty state */}
        {!activeFile ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="text-5xl">📝</div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">No file open</p>
              <p className="text-xs">Create a new file or open one from your disk</p>
            </div>
            <div className="flex gap-2">
              <button onClick={newFile} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">New file</button>
              {FS_SUPPORTED && <button onClick={openFile} className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">Open from disk</button>}
            </div>
            {!FS_SUPPORTED && <p className="text-xs text-amber-400">File System Access API not supported : files will download on save</p>}
          </div>
        ) : (
          /* Editor + Preview panes */
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Editor pane */}
            {(view === 'editor' || view === 'split') && (
              <div className={`flex flex-col ${view === 'split' ? 'w-1/2 border-r border-input/40' : 'w-full'}`}>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => handleContentChange(e.target.value)}
                  spellCheck={false}
                  className="flex-1 w-full h-full resize-none bg-background font-mono text-sm p-4 outline-none leading-relaxed"
                  placeholder="Start writing Markdown…"
                  onKeyDown={e => {
                    // Tab inserts spaces
                    if (e.key === 'Tab') {
                      e.preventDefault()
                      const ta = e.currentTarget
                      const s = ta.selectionStart, end = ta.selectionEnd
                      const next = ta.value.slice(0, s) + '  ' + ta.value.slice(end)
                      handleContentChange(next)
                      setTimeout(() => ta.setSelectionRange(s + 2, s + 2), 0)
                    }
                  }}
                />
              </div>
            )}

            {/* Preview pane */}
            {(view === 'preview' || view === 'split') && (
              <div className={`overflow-y-auto p-6 ${view === 'split' ? 'w-1/2' : 'w-full'}`}>
                {html ? (
                  <div
                    className="prose prose-sm prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground italic">Preview will appear here…</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* hljs styles injected via style tag */}
      <style>{`
        .hljs{color:#abb2bf;background:#282c34}
        .hljs-comment,.hljs-quote{color:#5c6370;font-style:italic}
        .hljs-doctag,.hljs-keyword,.hljs-formula{color:#c678dd}
        .hljs-section,.hljs-name,.hljs-selector-tag,.hljs-deletion,.hljs-subst{color:#e06c75}
        .hljs-literal{color:#56b6c2}
        .hljs-string,.hljs-regexp,.hljs-addition,.hljs-attribute,.hljs-meta .hljs-string{color:#98c379}
        .hljs-attr,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-selector-class,.hljs-selector-attr,.hljs-selector-pseudo,.hljs-number{color:#d19a66}
        .hljs-symbol,.hljs-bullet,.hljs-link,.hljs-meta,.hljs-selector-id,.hljs-title{color:#61aeee}
        .hljs-built_in,.hljs-title.class_,.hljs-class .hljs-title{color:#e6c07b}
        .hljs-emphasis{font-style:italic}
        .hljs-strong{font-weight:bold}
        .hljs-link{text-decoration:underline}
        .prose h1,.prose h2,.prose h3,.prose h4{font-weight:600;margin-top:1.5em;margin-bottom:.5em;line-height:1.3}
        .prose h1{font-size:1.75em;border-bottom:1px solid #3f3f46;padding-bottom:.3em}
        .prose h2{font-size:1.4em;border-bottom:1px solid #3f3f46;padding-bottom:.2em}
        .prose h3{font-size:1.1em}
        .prose p{margin:.75em 0;line-height:1.75}
        .prose a{color:#60a5fa;text-decoration:underline}
        .prose strong{font-weight:700}
        .prose em{font-style:italic}
        .prose ul{list-style:disc;padding-left:1.5em;margin:.5em 0}
        .prose ol{list-style:decimal;padding-left:1.5em;margin:.5em 0}
        .prose li{margin:.25em 0}
        .prose blockquote{border-left:3px solid #4b5563;padding-left:1em;color:#9ca3af;margin:1em 0}
        .prose code{background:#27272a;padding:.15em .4em;border-radius:4px;font-size:.875em;font-family:monospace}
        .prose pre{background:#1c1c1e;border:1px solid #3f3f46;border-radius:8px;padding:1em;overflow-x:auto;margin:1em 0}
        .prose pre code{background:none;padding:0;font-size:.85em}
        .prose table{border-collapse:collapse;width:100%;margin:1em 0}
        .prose th,.prose td{border:1px solid #3f3f46;padding:.4em .75em;text-align:left}
        .prose th{background:#27272a;font-weight:600}
        .prose tr:nth-child(even){background:#1c1c1e}
        .prose hr{border:none;border-top:1px solid #3f3f46;margin:2em 0}
        .prose img{max-width:100%;border-radius:6px}
        input[type=checkbox]{margin-right:.4em}
      `}</style>
    </div>
  )
}
