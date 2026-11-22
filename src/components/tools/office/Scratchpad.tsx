'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { Page, Section, Btn, IconBtn, Seg, TextInput, TextArea, Notice, Column, Scroll } from '@/components/domain'
import { Plus, Trash2 } from 'lucide-react'

interface TodoItem { id: string; text: string; done: boolean }

type Tab = 'notes' | 'todo'

export default function Scratchpad({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('notes')
  const [notes, setNotes] = useState('')
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    try {
      setNotes(localStorage.getItem('gawe-scratchpad-notes') ?? '')
      setTodos(JSON.parse(localStorage.getItem('gawe-scratchpad-todos') ?? '[]') as TodoItem[])
    } catch { /* corrupt storage: start empty */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem('gawe-scratchpad-notes', notes)
    }, 500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [notes, loaded])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem('gawe-scratchpad-todos', JSON.stringify(todos))
  }, [todos, loaded])

  function addTodo() {
    if (!newTodo.trim()) return
    setTodos((prev) => [...prev, { id: Date.now().toString(), text: newTodo.trim(), done: false }])
    setNewTodo('')
  }

  const toggleTodo = (id: string) => setTodos((prev) => prev.map((x) => x.id === id ? { ...x, done: !x.done } : x))
  const deleteTodo = (id: string) => setTodos((prev) => prev.filter((x) => x.id !== id))

  const pending = todos.filter((x) => !x.done)
  const done = todos.filter((x) => x.done)

  const row = (todo: TodoItem) => (
    <li key={todo.id} className="flex items-center gap-3 rounded-d border border-d-border px-3 py-1.5">
      <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} className="h-4 w-4 cursor-pointer accent-[hsl(var(--d-accent))]" aria-label={todo.text} />
      <span className={todo.done ? 'min-w-0 flex-1 break-words text-sm text-d-muted line-through' : 'min-w-0 flex-1 break-words text-sm'}>{todo.text}</span>
      <IconBtn label={`${t('action.delete', 'Delete')} ${todo.text}`} onClick={() => deleteTodo(todo.id)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </IconBtn>
    </li>
  )

  return (
    <Scroll>
      <Column width="md">
        <header>
          <h1 className="font-serif text-3xl font-semibold">{t('office.scratchpad', 'Scratchpad')}</h1>
          <p className="mt-1 text-sm text-d-muted">{t('office.scratchpad_desc', 'Notes and tasks. Auto-saved locally. Nothing leaves your device.')}</p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <Seg<Tab>
            label={t('office.scratchpad', 'Scratchpad')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'notes', label: t('office.note_placeholder', 'Notes') },
              { value: 'todo', label: `${t('office.task_title', 'To-Do')}${todos.length > 0 ? ` (${done.length}/${todos.length})` : ''}` },
            ]}
          />
          <span className="text-xs text-d-muted">Auto-saved locally</span>
        </div>

        {tab === 'notes' ? (
          <Page>
            <TextArea
              aria-label={t('office.note_placeholder', 'Notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Start typing your notes. Everything is saved automatically."
              className="min-h-[24rem] font-sans"
            />
          </Page>
        ) : (
          <Page className="flex flex-col gap-5">
            <div className="flex gap-2">
              <TextInput
                aria-label={t('office.task_title', 'To-Do')}
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
                placeholder="New task, press Enter to add"
              />
              <Btn variant="primary" onClick={addTodo} disabled={!newTodo.trim()}>
                <Plus className="h-4 w-4" aria-hidden />
                {t('action.add', 'Add')}
              </Btn>
            </div>

            {pending.length > 0 && (
              <Section title={t('office.task_pending', 'Pending')}>
                <ul className="flex flex-col gap-2">{pending.map(row)}</ul>
              </Section>
            )}
            {done.length > 0 && (
              <Section title={t('office.task_done', 'Completed')}>
                <ul className="flex flex-col gap-2">{done.map(row)}</ul>
              </Section>
            )}
            {todos.length === 0 && <Notice tone="info">No tasks yet. Add one above.</Notice>}
          </Page>
        )}
      </Column>
    </Scroll>
  )
}
