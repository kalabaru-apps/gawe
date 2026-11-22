'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, type DragStartEvent, type DragOverEvent, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ToolProps } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { analytics } from '@/lib/analytics'
import { Sheet, Page, Section, Btn, TextInput, TextArea, Notice, Chip, Column, Scroll } from '@/components/domain/kit'
import { Plus, X, Check, Trash2, GripVertical, Calendar, Flag, MessageSquare, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type LabelColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink' | 'slate'

interface CardLabel { color: LabelColor; text: string }

interface Card {
  id: string
  title: string
  description: string
  labels: CardLabel[]
  due: string
  checklist: { id: string; text: string; done: boolean }[]
  createdAt: number
}

interface Column {
  id: string
  title: string
  color: string
  cardIds: string[]
}

interface Board {
  id: string
  title: string
  columns: Column[]
  cards: Record<string, Card>
}

const LABEL_COLORS: Record<LabelColor, { bg: string; text: string }> = {
  red:    { bg: 'bg-red-500/80',   text: 'text-white' },
  orange: { bg: 'bg-orange-500/80', text: 'text-white' },
  yellow: { bg: 'bg-yellow-400/80', text: 'text-black' },
  green:  { bg: 'bg-emerald-500/80',text: 'text-white' },
  blue:   { bg: 'bg-sky-500/80',    text: 'text-white' },
  violet: { bg: 'bg-violet-500/80', text: 'text-white' },
  pink:   { bg: 'bg-pink-500/80',   text: 'text-white' },
  slate:  { bg: 'bg-slate-500/80',  text: 'text-white' },
}

const COL_COLORS = [
  'border-sky-500/50', 'border-emerald-500/50', 'border-violet-500/50',
  'border-amber-500/50', 'border-rose-500/50', 'border-pink-500/50',
]

const DEFAULT_BOARDS: Board[] = [
  {
    id: 'default',
    title: 'My Board',
    columns: [
      { id: 'col-todo',       title: 'To Do',       color: COL_COLORS[0], cardIds: [] },
      { id: 'col-inprogress', title: 'In Progress',  color: COL_COLORS[2], cardIds: [] },
      { id: 'col-done',       title: 'Done',         color: COL_COLORS[1], cardIds: [] },
    ],
    cards: {},
  },
]

function uid() { return Math.random().toString(36).slice(2, 9) }

function emptyCard(title: string): Card {
  return { id: uid(), title, description: '', labels: [], due: '', checklist: [], createdAt: Date.now() }
}

function formatDue(iso: string) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - new Date(now.setHours(0, 0, 0, 0)).getTime()
  const days = Math.ceil(diff / 86400000)
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (days < 0) return { label, cls: 'text-rose-400 bg-rose-500/10' }
  if (days === 0) return { label: 'Today', cls: 'text-amber-400 bg-amber-500/10' }
  if (days === 1) return { label: 'Tomorrow', cls: 'text-amber-300 bg-amber-500/10' }
  return { label, cls: 'text-d-muted bg-d-border/50' }
}

function load(): Board[] {
  try {
    const raw = localStorage.getItem('gawe-task-tracker')
    return raw ? (JSON.parse(raw) as Board[]) : DEFAULT_BOARDS
  } catch { return DEFAULT_BOARDS }
}

function save(boards: Board[]) {
  localStorage.setItem('gawe-task-tracker', JSON.stringify(boards))
}

function CardChip({ card, t, onClick, dragging }: { card: Card; t: ReturnType<typeof useTranslation>['t']; onClick: () => void; dragging?: boolean }) {
  const due = formatDue(card.due)
  const done = card.checklist.filter((c) => c.done).length
  const total = card.checklist.length

  return (
    <div
      onClick={onClick}
      className={cn(
        'group rounded-lg border border-d-border bg-d-raised px-3 py-2.5 cursor-pointer select-none space-y-1.5 transition-all hover:border-d-accent/50 hover:shadow-md',
        dragging ? 'opacity-40' : '',
      )}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((l, i) => (
            <span key={i} className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', LABEL_COLORS[l.color].bg, LABEL_COLORS[l.color].text)}>
              {l.text}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm font-medium leading-snug">{card.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {due && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1', due.cls)}>
            <Calendar className="h-2.5 w-2.5" aria-hidden />
            {due.label}
          </span>
        )}
        {total > 0 && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1', done === total ? 'text-emerald-400 bg-emerald-500/10' : 'text-d-muted bg-d-border/50')}>
            <Check className="h-2.5 w-2.5" aria-hidden />
            {done}/{total}
          </span>
        )}
        {card.description && (
          <span className="text-[10px] text-d-muted flex items-center gap-1">
            <MessageSquare className="h-2.5 w-2.5" aria-hidden />
            {t('office.task_has_desc', 'Has description')}
          </span>
        )}
      </div>
    </div>
  )
}

function SortableCard({ card, t, activeId, onOpen }: { card: Card; t: ReturnType<typeof useTranslation>['t']; activeId: string | null; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <CardChip card={card} t={t} onClick={onOpen} dragging={isDragging} />
    </div>
  )
}

interface ColumnProps {
  col: Column
  cards: Card[]
  activeId: string | null
  onCardOpen: (id: string) => void
  onAddCard: (colId: string, title: string) => void
  onColRename: (colId: string, title: string) => void
  onColDelete: (colId: string) => void
}

function KanbanColumn({ col, cards, activeId, onCardOpen, onAddCard, onColRename, onColDelete }: ColumnProps) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [colTitle, setColTitle] = useState(col.title)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { attributes, listeners, setNodeRef: setColRef, transform, transition } = useSortable({
    id: col.id,
    data: { type: 'column' },
  })

  useEffect(() => { setColTitle(col.title) }, [col.title])

  function submitAdd() {
    if (newTitle.trim()) { onAddCard(col.id, newTitle.trim()); setNewTitle('') }
    setAdding(false)
  }

  function submitRename() {
    if (colTitle.trim()) onColRename(col.id, colTitle.trim())
    else setColTitle(col.title)
    setEditingTitle(false)
  }

  return (
    <div
      ref={setColRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex flex-col w-72 shrink-0 rounded-xl border-t-2 bg-d-raised/50 border border-d-border border-t-[currentColor]', col.color)}
    >
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-d-muted hover:text-d-ink transition-colors text-xs">
          <GripVertical className="h-4 w-4" aria-hidden />
        </div>
        {editingTitle ? (
          <input autoFocus value={colTitle} onChange={(e) => setColTitle(e.target.value)}
            onBlur={submitRename} onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setColTitle(col.title); setEditingTitle(false) } }}
            className="flex-1 text-sm font-semibold bg-d-raised border border-d-border rounded-d px-2 py-0.5 outline-none focus-visible:border-d-accent focus-visible:outline-2 focus-visible:outline-d-accent" />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="flex-1 text-left text-sm font-semibold hover:text-d-accent transition-colors truncate">
            {col.title}
          </button>
        )}
        <span className="text-xs text-d-muted font-mono shrink-0">{cards.length}</span>
        <Btn variant="quiet" size="sm" onClick={() => onColDelete(col.id)} aria-label={t('action.delete', 'Delete')}>
          <X className="h-3.5 w-3.5" aria-hidden />
        </Btn>
      </div>

      <SortableContext items={col.cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-2 pb-2 min-h-[48px]">
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} t={t} activeId={activeId} onOpen={() => onCardOpen(card.id)} />
          ))}
        </div>
      </SortableContext>

      {adding ? (
        <div className="px-2 pb-2 space-y-1.5">
          <textarea
            autoFocus ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAdd() } if (e.key === 'Escape') setAdding(false) }}
            rows={2}
            placeholder="Card title…"
            className="w-full text-sm border border-d-border rounded-d p-2 bg-d-raised resize-none outline-none focus-visible:border-d-accent focus-visible:outline-2 focus-visible:outline-d-accent"
          />
          <div className="flex gap-1.5">
            <Btn size="sm" onClick={submitAdd}>{t('action.add', 'Add')}</Btn>
            <Btn variant="quiet" size="sm" onClick={() => setAdding(false)}>{t('action.cancel', 'Cancel')}</Btn>
          </div>
        </div>
      ) : (
        <Btn variant="quiet" size="sm" onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }} className="mx-2 mb-2 w-full justify-start">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('office.task_add', 'Add a card')}
        </Btn>
      )}
    </div>
  )
}

interface CardModalProps {
  card: Card
  colTitle: string
  onSave: (card: Card) => void
  onDelete: () => void
  onClose: () => void
}

function CardModal({ card, colTitle, onSave, onDelete, onClose }: CardModalProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Card>({ ...card, labels: [...card.labels], checklist: card.checklist.map((c) => ({ ...c })) })
  const [newCheckItem, setNewCheckItem] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [labelText, setLabelText] = useState('')
  const [labelColor, setLabelColor] = useState<LabelColor>('blue')

  function field<K extends keyof Card>(key: K, value: Card[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    field('checklist', [...draft.checklist, { id: uid(), text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  function toggleCheck(id: string) {
    field('checklist', draft.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)))
  }

  function deleteCheck(id: string) {
    field('checklist', draft.checklist.filter((c) => c.id !== id))
  }

  function addLabel() {
    if (!labelText.trim()) return
    field('labels', [...draft.labels, { color: labelColor, text: labelText.trim() }])
    setLabelText(''); setAddingLabel(false)
  }

  function removeLabel(i: number) {
    field('labels', draft.labels.filter((_, idx) => idx !== i))
  }

  const doneCount = draft.checklist.filter((c) => c.done).length
  const pct = draft.checklist.length ? Math.round((doneCount / draft.checklist.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onSave(draft) }}>
      <div className="w-full max-w-xl bg-d-raised border border-d-border rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 border-b border-d-border/40">
          <div className="flex items-start gap-2 mb-1">
            <textarea
              value={draft.title}
              onChange={(e) => field('title', e.target.value)}
              rows={1}
              className="flex-1 text-base font-semibold bg-transparent outline-none resize-none border-b border-transparent focus:border-d-border leading-snug"
              placeholder="Card title…"
            />
            <Btn variant="primary" size="sm" onClick={() => onSave(draft)}>
              {t('action.save', 'Save')}
            </Btn>
            <Btn variant="quiet" size="sm" onClick={onClose}>
              <XIcon className="h-3.5 w-3.5" aria-hidden />
            </Btn>
          </div>
          <p className="text-xs text-d-muted">in <span className="font-medium text-d-ink">{colTitle}</span></p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <div>
            <p className="text-xs font-medium text-d-muted mb-1.5">{t('common.type', 'Labels')}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.labels.map((l, i) => (
                <Btn key={i} variant="primary" size="sm" onClick={() => removeLabel(i)} className="gap-1">
                  <span className={cn(LABEL_COLORS[l.color].bg, LABEL_COLORS[l.color].text)}>{l.text}</span>
                  <X className="h-3 w-3" aria-hidden />
                </Btn>
              ))}
              <Btn variant="quiet" size="sm" onClick={() => setAddingLabel(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('action.add', 'Add')} label
              </Btn>
            </div>
            {addingLabel && (
              <div className="space-y-2 p-3 rounded-lg border border-d-border bg-d-surface">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(LABEL_COLORS) as LabelColor[]).map((c) => (
                    <button key={c} onClick={() => setLabelColor(c)}
                      className={cn('w-6 h-6 rounded-full', LABEL_COLORS[c].bg, labelColor === c ? 'ring-2 ring-offset-1 ring-offset-d-raised ring-white' : '')} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <TextInput autoFocus value={labelText} onChange={(e) => setLabelText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addLabel(); if (e.key === 'Escape') setAddingLabel(false) }}
                    placeholder="Label text…" />
                  <Btn size="sm" onClick={addLabel}>{t('action.add', 'Add')}</Btn>
                  <Btn variant="quiet" size="sm" onClick={() => setAddingLabel(false)}>{t('action.cancel', 'Cancel')}</Btn>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-d-muted mb-1.5">{t('office.date_to', 'Due date')}</p>
            <div className="flex items-center gap-2">
              <input type="date" value={draft.due}
                onChange={(e) => field('due', e.target.value)}
                className="text-sm border border-d-border rounded-d px-3 py-1.5 bg-d-raised outline-none focus-visible:border-d-accent focus-visible:outline-2 focus-visible:outline-d-accent" />
              {draft.due && (
                <Btn variant="quiet" size="sm" onClick={() => field('due', '')}>{t('action.clear', 'Clear')}</Btn>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-d-muted mb-1.5">{t('common.content', 'Description')}</p>
            <TextArea
              value={draft.description}
              onChange={(e) => field('description', e.target.value)}
              rows={3}
              placeholder="Add more detail…"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-xs font-medium text-d-muted">{t('office.task_all', 'Checklist')}</p>
              {draft.checklist.length > 0 && (
                <span className="text-xs text-d-muted font-mono">{doneCount}/{draft.checklist.length} ({pct}%)</span>
              )}
            </div>
            {draft.checklist.length > 0 && (
              <div className="h-1.5 bg-d-border rounded-full overflow-hidden mb-2">
                <div className="h-full bg-d-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="space-y-1 mb-2">
              {draft.checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)} className="mt-0.5 rounded border-d-border" />
                  <span className={cn('flex-1 text-sm leading-snug', item.done ? 'line-through text-d-muted' : '')}>{item.text}</span>
                  <Btn variant="quiet" size="sm" onClick={() => deleteCheck(item.id)} className="opacity-0 group-hover:opacity-100">
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Btn>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <TextInput value={newCheckItem} onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCheckItem() }}
                placeholder="Add item… (Enter to add)" className="flex-1" />
              <Btn size="sm" onClick={addCheckItem}>{t('action.add', 'Add')}</Btn>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-d-border/40 flex justify-between">
          <Btn variant="danger" size="sm" onClick={onDelete}>{t('action.delete', 'Delete')} card</Btn>
          <Btn variant="primary" onClick={() => onSave(draft)}>{t('action.save', 'Save')}</Btn>
        </div>
      </div>
    </div>
  )
}

export default function TaskTracker({ onOutput }: ToolProps) {
  const { t } = useTranslation()
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState('default')
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addingBoard, setAddingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [newColName, setNewColName] = useState('')

  useEffect(() => {
    const data = load()
    setBoards(data)
    setActiveBoardId(data[0]?.id ?? 'default')
  }, [])

  useEffect(() => {
    if (boards.length > 0) save(boards)
  }, [boards])

  const board = boards.find((b) => b.id === activeBoardId)

  function updateBoard(patch: Partial<Board>) {
    setBoards((prev) => prev.map((b) => (b.id === activeBoardId ? { ...b, ...patch } : b)))
  }

  function addCard(colId: string, title: string) {
    if (!board) return
    analytics.buttonClick('task-tracker', 'add_task')
    const card = emptyCard(title)
    updateBoard({
      cards: { ...board.cards, [card.id]: card },
      columns: board.columns.map((c) => (c.id === colId ? { ...c, cardIds: [...c.cardIds, card.id] } : c)),
    })
    onOutput({ action: 'addCard', title }, {})
  }

  function saveCard(card: Card) {
    if (!board) return
    updateBoard({ cards: { ...board.cards, [card.id]: card } })
    setOpenCardId(null)
  }

  function deleteCard(cardId: string) {
    if (!board) return
    const cards = { ...board.cards }
    delete cards[cardId]
    updateBoard({
      cards,
      columns: board.columns.map((c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== cardId) })),
    })
    setOpenCardId(null)
  }

  function addColumn(title: string) {
    if (!board) return
    const col: Column = {
      id: `col-${uid()}`,
      title,
      color: COL_COLORS[board.columns.length % COL_COLORS.length],
      cardIds: [],
    }
    updateBoard({ columns: [...board.columns, col] })
  }

  function renameColumn(colId: string, title: string) {
    if (!board) return
    updateBoard({ columns: board.columns.map((c) => (c.id === colId ? { ...c, title } : c)) })
  }

  function deleteColumn(colId: string) {
    if (!board || !confirm('Delete this column and all its cards?')) return
    const col = board.columns.find((c) => c.id === colId)
    if (!col) return
    const cards = { ...board.cards }
    col.cardIds.forEach((id) => delete cards[id])
    updateBoard({ cards, columns: board.columns.filter((c) => c.id !== colId) })
  }

  function addBoard(title: string) {
    const id = `board-${uid()}`
    const newBoard: Board = {
      id, title,
      columns: [
        { id: `${id}-todo`,  title: 'To Do',       color: COL_COLORS[0], cardIds: [] },
        { id: `${id}-wip`,   title: 'In Progress',  color: COL_COLORS[2], cardIds: [] },
        { id: `${id}-done`,  title: 'Done',         color: COL_COLORS[1], cardIds: [] },
      ],
      cards: {},
    }
    setBoards((prev) => [...prev, newBoard])
    setActiveBoardId(id)
    setAddingBoard(false)
    setNewBoardName('')
  }

  function deleteBoard(id: string) {
    if (boards.length <= 1) return
    if (!confirm('Delete this board?')) return
    const next = boards.filter((b) => b.id !== id)
    setBoards(next)
    setActiveBoardId(next[0].id)
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function findColumnOfCard(cardId: string) {
    return board?.columns.find((c) => c.cardIds.includes(cardId))
  }

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id))
  }, [])

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over || !board) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeType = active.data.current?.type
    if (activeType === 'column') return

    const activeCol = findColumnOfCard(activeId)
    if (!activeCol) return

    const overCol = board.columns.find((c) => c.id === overId)
    if (overCol && overCol.id !== activeCol.id) {
      updateBoard({
        columns: board.columns.map((c) => {
          if (c.id === activeCol.id) return { ...c, cardIds: c.cardIds.filter((id) => id !== activeId) }
          if (c.id === overCol.id) return { ...c, cardIds: [...c.cardIds, activeId] }
          return c
        }),
      })
      return
    }

    const overCol2 = findColumnOfCard(overId)
    if (!overCol2) return
    if (activeCol.id !== overCol2.id) {
      const overIdx = overCol2.cardIds.indexOf(overId)
      updateBoard({
        columns: board.columns.map((c) => {
          if (c.id === activeCol.id) return { ...c, cardIds: c.cardIds.filter((id) => id !== activeId) }
          if (c.id === overCol2.id) {
            const ids = [...c.cardIds]
            ids.splice(overIdx, 0, activeId)
            return { ...c, cardIds: ids }
          }
          return c
        }),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  const onDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over || !board) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const activeType = active.data.current?.type

    if (activeType === 'column') {
      const oldIdx = board.columns.findIndex((c) => c.id === activeId)
      const newIdx = board.columns.findIndex((c) => c.id === overId)
      if (oldIdx !== newIdx) updateBoard({ columns: arrayMove(board.columns, oldIdx, newIdx) })
      return
    }

    const col = findColumnOfCard(activeId)
    if (!col) return
    const overCol = findColumnOfCard(overId)
    if (!overCol || col.id !== overCol.id) return
    const oldIdx = col.cardIds.indexOf(activeId)
    const newIdx = overCol.cardIds.indexOf(overId)
    if (oldIdx !== newIdx) {
      updateBoard({
        columns: board.columns.map((c) =>
          c.id === col.id ? { ...c, cardIds: arrayMove(c.cardIds, oldIdx, newIdx) } : c
        ),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  if (!board) return <div className="text-sm text-d-muted p-4">{t('common.search', 'Loading')}…</div>

  const openCard = openCardId ? board.cards[openCardId] : null
  const openCardCol = openCardId ? board.columns.find((c) => c.cardIds.includes(openCardId)) : null

  return (
    <Scroll>
      <Column width="xl">
        <Sheet>
          <h1 className="font-serif text-2xl font-semibold mb-1">{t('office.task_tracker', 'Task Tracker')}</h1>
          <p className="text-d-muted text-sm mb-6">{t('office.task_tracker_desc', 'Kanban board. Drag cards, add labels, due dates, checklists. Auto-saved locally.')}</p>

          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            {boards.map((b) => (
              <div key={b.id} className="flex items-center gap-0.5">
                <Btn variant={b.id === activeBoardId ? 'primary' : 'secondary'} onClick={() => setActiveBoardId(b.id)} className="text-sm">
                  {b.title}
                </Btn>
                {boards.length > 1 && b.id === activeBoardId && (
                  <Btn variant="quiet" size="sm" onClick={() => deleteBoard(b.id)}>
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Btn>
                )}
              </div>
            ))}
            {addingBoard ? (
              <div className="flex items-center gap-1.5">
                <TextInput autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addBoard(newBoardName.trim() || 'New Board'); if (e.key === 'Escape') setAddingBoard(false) }}
                  placeholder="Board name…" className="w-32" />
                <Btn size="sm" onClick={() => addBoard(newBoardName.trim() || 'New Board')}>{t('action.add', 'Add')}</Btn>
                <Btn variant="quiet" size="sm" onClick={() => setAddingBoard(false)}><X className="h-3.5 w-3.5" aria-hidden /></Btn>
              </div>
            ) : (
              <Btn variant="quiet" size="sm" onClick={() => setAddingBoard(true)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t('action.add', 'Add')} Board
              </Btn>
            )}
          </div>

          <div className="overflow-x-auto overflow-y-hidden pb-2">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
              <SortableContext items={board.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-3 h-full min-h-[480px] items-start">
                  {board.columns.map((col) => (
                    <KanbanColumn
                      key={col.id}
                      col={col}
                      cards={col.cardIds.map((id) => board.cards[id]).filter(Boolean)}
                      activeId={activeId}
                      onCardOpen={setOpenCardId}
                      onAddCard={addCard}
                      onColRename={renameColumn}
                      onColDelete={deleteColumn}
                    />
                  ))}

                  {addingCol ? (
                    <div className="w-72 shrink-0 rounded-xl border border-d-border bg-d-raised/50 p-3 space-y-2">
                      <TextInput autoFocus value={newColName} onChange={(e) => setNewColName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { addColumn(newColName.trim() || 'New Column'); setNewColName(''); setAddingCol(false) } if (e.key === 'Escape') setAddingCol(false) }}
                        placeholder="Column name…" />
                      <div className="flex gap-1.5">
                        <Btn size="sm" onClick={() => { addColumn(newColName.trim() || 'New Column'); setNewColName(''); setAddingCol(false) }}>
                          {t('action.add', 'Add')} column
                        </Btn>
                        <Btn variant="quiet" size="sm" onClick={() => setAddingCol(false)}>{t('action.cancel', 'Cancel')}</Btn>
                      </div>
                    </div>
                  ) : (
                    <Btn variant="quiet" className="w-64 shrink-0 rounded-xl border-2 border-dashed border-d-border/40 py-6 hover:border-d-accent/50 hover:bg-d-border/40 transition-colors flex items-center justify-center gap-1.5 self-start" onClick={() => setAddingCol(true)}>
                      <Plus className="h-4 w-4" aria-hidden />
                      {t('action.add', 'Add')} column
                    </Btn>
                  )}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId && board.cards[activeId] && (
                  <div className="rotate-2 opacity-90 w-72">
                    <CardChip card={board.cards[activeId]} t={t} onClick={() => {}} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>

          {openCard && openCardCol && (
            <CardModal
              card={openCard}
              colTitle={openCardCol.title}
              onSave={saveCard}
              onDelete={() => deleteCard(openCard.id)}
              onClose={() => setOpenCardId(null)}
            />
          )}
        </Sheet>
      </Column>
    </Scroll>
  )
}