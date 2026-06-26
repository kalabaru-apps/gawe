'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'

interface TodoItem { id: string; text: string; done: boolean }

type Tab = 'notes' | 'todo'

export default function Scratchpad({ onOutput: _onOutput, initialState: _initialState }: ToolProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('notes')
  const [notes, setNotes] = useState('')
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTodo, setNewTodo] = useState('')
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('gawe-scratchpad-notes') ?? ''
    const savedTodos = JSON.parse(localStorage.getItem('gawe-scratchpad-todos') ?? '[]') as TodoItem[]
    setNotes(savedNotes)
    setTodos(savedTodos)
  }, [])

  // Auto-save notes
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      localStorage.setItem('gawe-scratchpad-notes', notes)
    }, 500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [notes])

  // Save todos immediately
  useEffect(() => {
    localStorage.setItem('gawe-scratchpad-todos', JSON.stringify(todos))
  }, [todos])

  function addTodo() {
    if (!newTodo.trim()) return
    setTodos((prev) => [...prev, { id: Date.now().toString(), text: newTodo.trim(), done: false }])
    setNewTodo('')
  }

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const doneCount = todos.filter((t) => t.done).length

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 border border-input rounded-md p-0.5">
          {(['notes', 'todo'] as Tab[]).map((tabItem) => (
            <button key={tabItem} onClick={() => setTab(tabItem)}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${tab === tabItem ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
              {tabItem === 'notes' ? t('office.note_placeholder', 'Notes') : `${t('office.task_title', 'To-Do')} ${todos.length > 0 ? `(${doneCount}/${todos.length})` : ''}`}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{t('action.save', 'Auto-saved')} locally</span>
      </div>
      {tab === 'notes' ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 min-h-[500px] text-sm border border-input rounded-md p-4 bg-background resize-none outline-none focus:ring-1 focus:ring-ring leading-relaxed"
          placeholder={t('office.note_placeholder', 'Start typing your notes... Everything is saved automatically.')}
        />
      ) : (
        <div className="space-y-3 flex-1">
          <div className="flex gap-2">
            <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTodo() }}
              className="flex-1 text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="New task... (press Enter to add)" />
            <button onClick={() => { analytics.buttonClick('scratchpad', 'save'); addTodo() }} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">{t('action.add', 'Add')}</button>
          </div>
          <div className="space-y-1">
            {todos.filter((t) => !t.done).map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 rounded-md border border-input px-3 py-2.5 hover:bg-muted/20">
                <input type="checkbox" checked={false} onChange={() => toggleTodo(todo.id)} className="rounded" />
                <span className="flex-1 text-sm">{todo.text}</span>
                <button onClick={() => deleteTodo(todo.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">✕</button>
              </div>
            ))}
            {todos.some((t) => t.done) && (
              <>
                <p className="text-xs text-muted-foreground px-1 pt-2">{t('office.task_done', 'Completed')}</p>
                {todos.filter((t) => t.done).map((todo) => (
                  <div key={todo.id} className="flex items-center gap-3 rounded-md border border-border/30 px-3 py-2.5 opacity-60">
                    <input type="checkbox" checked onChange={() => toggleTodo(todo.id)} className="rounded" />
                    <span className="flex-1 text-sm line-through text-muted-foreground">{todo.text}</span>
                    <button onClick={() => deleteTodo(todo.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">✕</button>
                  </div>
                ))}
              </>
            )}
            {todos.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t('office.task_pending', 'No tasks yet')} : {t('office.task_add', 'add one above')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
