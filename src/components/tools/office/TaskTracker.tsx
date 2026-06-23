'use client'

import {
  useState, useEffect, useRef, useCallback,
} from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  horizontalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ToolProps } from '@/types'

// ─── types ────────────────────────────────────────────────────────────────────
type LabelColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink' | 'slate'

interface CardLabel { color: LabelColor; text: string }

interface Card {
  id: string
  title: string
  description: string
  labels: CardLabel[]
  due: string        // ISO date string or ''
  checklist: { id: string; text: string; done: boolean }[]
  createdAt: number
}

interface Column {
  id: string
  title: string
  color: string     // accent color class
  cardIds: string[]
}

interface Board {
  id: string
  title: string
  columns: Column[]
  cards: Record<string, Card>
}

// ─── constants ────────────────────────────────────────────────────────────────
const LABEL_COLORS: Record<LabelColor, { bg: string; text: string }> = {
  red:    { bg: 'bg-rose-500/80',   text: 'text-white' },
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

// ─── helpers ──────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 9) }

function emptyCard(title: string): Card {
  return { id: uid(), title, description: '', labels: [], due: '', checklist: [], createdAt: Date.now() }
}

function formatDue(iso: string) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.setHours(0, 0, 0, 0)
  const days = Math.ceil(diff / 86400000)
  const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (days < 0) return { label, cls: 'text-rose-400 bg-rose-500/10' }
  if (days === 0) return { label: 'Today', cls: 'text-amber-400 bg-amber-500/10' }
  if (days === 1) return { label: 'Tomorrow', cls: 'text-amber-300 bg-amber-500/10' }
  return { label, cls: 'text-muted-foreground bg-muted/40' }
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

// ─── card chip (small, in column) ────────────────────────────────────────────
function CardChip({
  card, onClick, dragging,
}: { card: Card; onClick: () => void; dragging?: boolean }) {
  const due = formatDue(card.due)
  const done = card.checklist.filter(c => c.done).length
  const total = card.checklist.length

  return (
    <div
      onClick={onClick}
      className={`group rounded-lg border border-input bg-card px-3 py-2.5 cursor-pointer select-none space-y-1.5 transition-all hover:border-primary/40 hover:shadow-md ${dragging ? 'opacity-40' : ''}`}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.labels.map((l, i) => (
            <span key={i} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${LABEL_COLORS[l.color].bg} ${LABEL_COLORS[l.color].text}`}>
              {l.text}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm font-medium leading-snug">{card.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {due && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${due.cls}`}>
            📅 {due.label}
          </span>
        )}
        {total > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${done === total ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground bg-muted/40'}`}>
            ☑ {done}/{total}
          </span>
        )}
        {card.description && (
          <span className="text-[10px] text-muted-foreground">≡</span>
        )}
      </div>
    </div>
  )
}

// ─── sortable card wrapper ────────────────────────────────────────────────────
function SortableCard({ card, activeId, onOpen }: { card: Card; activeId: string | null; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card' },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <CardChip card={card} onClick={onOpen} dragging={isDragging} />
    </div>
  )
}

// ─── column ───────────────────────────────────────────────────────────────────
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
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [colTitle, setColTitle] = useState(col.title)
  const inputRef = useRef<HTMLInputElement>(null)

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
      className={`flex flex-col w-72 shrink-0 rounded-xl border-t-2 ${col.color} bg-muted/30 border border-input border-t-[currentColor]`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors text-xs">⠿</div>
        {editingTitle ? (
          <input autoFocus value={colTitle} onChange={e => setColTitle(e.target.value)}
            onBlur={submitRename} onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setColTitle(col.title); setEditingTitle(false) } }}
            className="flex-1 text-sm font-semibold bg-background border border-input rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-ring" />
        ) : (
          <button onClick={() => setEditingTitle(true)} className="flex-1 text-left text-sm font-semibold hover:text-primary transition-colors truncate">
            {col.title}
          </button>
        )}
        <span className="text-xs text-muted-foreground font-mono shrink-0">{cards.length}</span>
        <button onClick={() => onColDelete(col.id)}
          className="text-muted-foreground hover:text-rose-400 transition-colors text-xs shrink-0">✕</button>
      </div>

      {/* Cards */}
      <SortableContext items={col.cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 px-2 pb-2 min-h-[48px]">
          {cards.map(card => (
            <SortableCard key={card.id} card={card} activeId={activeId} onOpen={() => onCardOpen(card.id)} />
          ))}
        </div>
      </SortableContext>

      {/* Add card */}
      {adding ? (
        <div className="px-2 pb-2 space-y-1.5">
          <textarea
            autoFocus
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAdd() } if (e.key === 'Escape') setAdding(false) }}
            rows={2}
            placeholder="Card title…"
            className="w-full text-sm border border-input rounded-md p-2 bg-background resize-none outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-1.5">
            <button onClick={submitAdd} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">Add</button>
            <button onClick={() => setAdding(false)} className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors">✕</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="mx-2 mb-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
          + Add a card
        </button>
      )}
    </div>
  )
}

// ─── card detail modal ────────────────────────────────────────────────────────
interface CardModalProps {
  card: Card
  colTitle: string
  onSave: (card: Card) => void
  onDelete: () => void
  onClose: () => void
}

function CardModal({ card, colTitle, onSave, onDelete, onClose }: CardModalProps) {
  const [draft, setDraft] = useState<Card>({ ...card, labels: [...card.labels], checklist: card.checklist.map(c => ({ ...c })) })
  const [newCheckItem, setNewCheckItem] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [labelText, setLabelText] = useState('')
  const [labelColor, setLabelColor] = useState<LabelColor>('blue')

  function field<K extends keyof Card>(key: K, value: Card[K]) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return
    field('checklist', [...draft.checklist, { id: uid(), text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }

  function toggleCheck(id: string) {
    field('checklist', draft.checklist.map(c => c.id === id ? { ...c, done: !c.done } : c))
  }

  function deleteCheck(id: string) {
    field('checklist', draft.checklist.filter(c => c.id !== id))
  }

  function addLabel() {
    if (!labelText.trim()) return
    field('labels', [...draft.labels, { color: labelColor, text: labelText.trim() }])
    setLabelText(''); setAddingLabel(false)
  }

  function removeLabel(i: number) {
    field('labels', draft.labels.filter((_, idx) => idx !== i))
  }

  const doneCount = draft.checklist.filter(c => c.done).length
  const pct = draft.checklist.length ? Math.round((doneCount / draft.checklist.length) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onSave(draft) }}>
      <div className="w-full max-w-xl bg-background border border-input rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-input/40">
          <div className="flex items-start gap-2 mb-1">
            <textarea
              value={draft.title}
              onChange={e => field('title', e.target.value)}
              rows={1}
              className="flex-1 text-base font-semibold bg-transparent outline-none resize-none border-b border-transparent focus:border-input leading-snug"
              placeholder="Card title…"
            />
            <button onClick={() => onSave(draft)} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors text-xs px-2 py-1 rounded hover:bg-muted">Save ↵</button>
            <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none px-1">×</button>
          </div>
          <p className="text-xs text-muted-foreground">in <span className="font-medium text-foreground">{colTitle}</span></p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Labels */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Labels</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.labels.map((l, i) => (
                <button key={i} onClick={() => removeLabel(i)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1 ${LABEL_COLORS[l.color].bg} ${LABEL_COLORS[l.color].text}`}>
                  {l.text} ×
                </button>
              ))}
              <button onClick={() => setAddingLabel(true)} className="text-[11px] px-2 py-0.5 rounded border border-dashed border-input text-muted-foreground hover:border-primary/50 transition-colors">+ label</button>
            </div>
            {addingLabel && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-input/40">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(LABEL_COLORS) as LabelColor[]).map(c => (
                    <button key={c} onClick={() => setLabelColor(c)}
                      className={`w-6 h-6 rounded-full ${LABEL_COLORS[c].bg} ${labelColor === c ? 'ring-2 ring-offset-1 ring-offset-background ring-white' : ''}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input autoFocus value={labelText} onChange={e => setLabelText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addLabel(); if (e.key === 'Escape') setAddingLabel(false) }}
                    placeholder="Label text…"
                    className="flex-1 text-xs border border-input rounded px-2 py-1 bg-background outline-none focus:ring-1 focus:ring-ring" />
                  <button onClick={addLabel} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Add</button>
                  <button onClick={() => setAddingLabel(false)} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">✕</button>
                </div>
              </div>
            )}
          </div>

          {/* Due date */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Due date</p>
            <input type="date" value={draft.due}
              onChange={e => field('due', e.target.value)}
              className="text-sm border border-input rounded-md px-3 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring" />
            {draft.due && (
              <button onClick={() => field('due', '')} className="ml-2 text-xs text-muted-foreground hover:text-rose-400 transition-colors">clear</button>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Description</p>
            <textarea
              value={draft.description}
              onChange={e => field('description', e.target.value)}
              rows={3}
              placeholder="Add more detail…"
              className="w-full text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring leading-relaxed"
            />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <p className="text-xs font-medium text-muted-foreground">Checklist</p>
              {draft.checklist.length > 0 && (
                <span className="text-xs text-muted-foreground font-mono">{doneCount}/{draft.checklist.length} ({pct}%)</span>
              )}
            </div>
            {draft.checklist.length > 0 && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
            <div className="space-y-1 mb-2">
              {draft.checklist.map(item => (
                <div key={item.id} className="flex items-start gap-2 group">
                  <input type="checkbox" checked={item.done} onChange={() => toggleCheck(item.id)}
                    className="mt-0.5 rounded" />
                  <span className={`flex-1 text-sm leading-snug ${item.done ? 'line-through text-muted-foreground' : ''}`}>{item.text}</span>
                  <button onClick={() => deleteCheck(item.id)} className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all">✕</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCheckItem() }}
                placeholder="Add item… (Enter to add)"
                className="flex-1 text-xs border border-input rounded px-2 py-1.5 bg-background outline-none focus:ring-1 focus:ring-ring" />
              <button onClick={addCheckItem} className="text-xs px-2 py-1.5 rounded border border-input hover:bg-muted/60 transition-colors">Add</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-input/40 flex justify-between">
          <button onClick={onDelete} className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded hover:bg-rose-500/10 transition-colors">Delete card</button>
          <button onClick={() => onSave(draft)} className="text-sm px-4 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────
export default function TaskTracker({ onOutput }: ToolProps) {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoardId, setActiveBoardId] = useState('default')
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [addingBoard, setAddingBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [newColName, setNewColName] = useState('')

  // Load from localStorage
  useEffect(() => {
    const data = load()
    setBoards(data)
    setActiveBoardId(data[0]?.id ?? 'default')
  }, [])

  // Persist on change
  useEffect(() => {
    if (boards.length > 0) save(boards)
  }, [boards])

  const board = boards.find(b => b.id === activeBoardId)

  function updateBoard(patch: Partial<Board>) {
    setBoards(prev => prev.map(b => b.id === activeBoardId ? { ...b, ...patch } : b))
  }

  // ── card ops ────────────────────────────────────────────────────────────────
  function addCard(colId: string, title: string) {
    if (!board) return
    const card = emptyCard(title)
    updateBoard({
      cards: { ...board.cards, [card.id]: card },
      columns: board.columns.map(c => c.id === colId ? { ...c, cardIds: [...c.cardIds, card.id] } : c),
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
      columns: board.columns.map(c => ({ ...c, cardIds: c.cardIds.filter(id => id !== cardId) })),
    })
    setOpenCardId(null)
  }

  // ── column ops ──────────────────────────────────────────────────────────────
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
    updateBoard({ columns: board.columns.map(c => c.id === colId ? { ...c, title } : c) })
  }

  function deleteColumn(colId: string) {
    if (!board || !confirm('Delete this column and all its cards?')) return
    const col = board.columns.find(c => c.id === colId)
    if (!col) return
    const cards = { ...board.cards }
    col.cardIds.forEach(id => delete cards[id])
    updateBoard({ cards, columns: board.columns.filter(c => c.id !== colId) })
  }

  // ── board ops ───────────────────────────────────────────────────────────────
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
    setBoards(prev => [...prev, newBoard])
    setActiveBoardId(id)
    setAddingBoard(false)
    setNewBoardName('')
  }

  function deleteBoard(id: string) {
    if (boards.length <= 1) return
    if (!confirm('Delete this board?')) return
    const next = boards.filter(b => b.id !== id)
    setBoards(next)
    setActiveBoardId(next[0].id)
  }

  // ── DnD ─────────────────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function findColumnOfCard(cardId: string) {
    return board?.columns.find(c => c.cardIds.includes(cardId))
  }

  const onDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }, [])

  const onDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over || !board) return
    const activeId = active.id as string
    const overId = over.id as string
    const activeType = active.data.current?.type
    if (activeType === 'column') return

    const activeCol = findColumnOfCard(activeId)
    if (!activeCol) return

    // over a column directly
    const overCol = board.columns.find(c => c.id === overId)
    if (overCol && overCol.id !== activeCol.id) {
      updateBoard({
        columns: board.columns.map(c => {
          if (c.id === activeCol.id) return { ...c, cardIds: c.cardIds.filter(id => id !== activeId) }
          if (c.id === overCol.id) return { ...c, cardIds: [...c.cardIds, activeId] }
          return c
        }),
      })
      return
    }

    // over a card
    const overCol2 = findColumnOfCard(overId)
    if (!overCol2) return
    if (activeCol.id !== overCol2.id) {
      // move to new column, before the over card
      const overIdx = overCol2.cardIds.indexOf(overId)
      updateBoard({
        columns: board.columns.map(c => {
          if (c.id === activeCol.id) return { ...c, cardIds: c.cardIds.filter(id => id !== activeId) }
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
    const activeId = active.id as string
    const overId = over.id as string
    const activeType = active.data.current?.type

    if (activeType === 'column') {
      const oldIdx = board.columns.findIndex(c => c.id === activeId)
      const newIdx = board.columns.findIndex(c => c.id === overId)
      if (oldIdx !== newIdx) updateBoard({ columns: arrayMove(board.columns, oldIdx, newIdx) })
      return
    }

    // same-column reorder
    const col = findColumnOfCard(activeId)
    if (!col) return
    const overCol = findColumnOfCard(overId)
    if (!overCol || col.id !== overCol.id) return
    const oldIdx = col.cardIds.indexOf(activeId)
    const newIdx = col.cardIds.indexOf(overId)
    if (oldIdx !== newIdx) {
      updateBoard({
        columns: board.columns.map(c =>
          c.id === col.id ? { ...c, cardIds: arrayMove(c.cardIds, oldIdx, newIdx) } : c
        ),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board])

  if (!board) return <div className="text-sm text-muted-foreground p-4">Loading…</div>

  const openCard = openCardId ? board.cards[openCardId] : null
  const openCardCol = openCardId ? board.columns.find(c => c.cardIds.includes(openCardId)) : null

  return (
    <div className="flex flex-col h-full gap-3" style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>
      {/* Board tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {boards.map(b => (
          <div key={b.id} className="flex items-center gap-0.5">
            <button onClick={() => setActiveBoardId(b.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${b.id === activeBoardId ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
              {b.title}
            </button>
            {boards.length > 1 && b.id === activeBoardId && (
              <button onClick={() => deleteBoard(b.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors px-1">✕</button>
            )}
          </div>
        ))}
        {addingBoard ? (
          <div className="flex items-center gap-1.5">
            <input autoFocus value={newBoardName} onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addBoard(newBoardName.trim() || 'New Board'); if (e.key === 'Escape') setAddingBoard(false) }}
              placeholder="Board name…"
              className="text-sm border border-input rounded-md px-2 py-1 bg-background outline-none focus:ring-1 focus:ring-ring w-32" />
            <button onClick={() => addBoard(newBoardName.trim() || 'New Board')} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Add</button>
            <button onClick={() => setAddingBoard(false)} className="text-xs text-muted-foreground px-1">✕</button>
          </div>
        ) : (
          <button onClick={() => setAddingBoard(true)}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground border border-dashed border-input/60 hover:border-primary/40 hover:text-foreground transition-colors">
            + Board
          </button>
        )}
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
          <SortableContext items={board.columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-3 h-full pb-2 items-start">
              {board.columns.map(col => (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  cards={col.cardIds.map(id => board.cards[id]).filter(Boolean)}
                  activeId={activeId}
                  onCardOpen={setOpenCardId}
                  onAddCard={addCard}
                  onColRename={renameColumn}
                  onColDelete={deleteColumn}
                />
              ))}

              {/* Add column */}
              {addingCol ? (
                <div className="w-72 shrink-0 rounded-xl border border-input bg-muted/30 p-3 space-y-2">
                  <input autoFocus value={newColName} onChange={e => setNewColName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addColumn(newColName.trim() || 'New Column'); setNewColName(''); setAddingCol(false) } if (e.key === 'Escape') setAddingCol(false) }}
                    placeholder="Column name…"
                    className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
                  <div className="flex gap-1.5">
                    <button onClick={() => { addColumn(newColName.trim() || 'New Column'); setNewColName(''); setAddingCol(false) }}
                      className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground">Add column</button>
                    <button onClick={() => setAddingCol(false)} className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-muted transition-colors">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingCol(true)}
                  className="w-64 shrink-0 rounded-xl border-2 border-dashed border-input/40 py-6 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/20 transition-colors text-sm flex items-center justify-center gap-1.5 self-start">
                  + Add column
                </button>
              )}
            </div>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId && board.cards[activeId] && (
              <div className="rotate-2 opacity-90 w-72">
                <CardChip card={board.cards[activeId]} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card detail modal */}
      {openCard && openCardCol && (
        <CardModal
          card={openCard}
          colTitle={openCardCol.title}
          onSave={saveCard}
          onDelete={() => deleteCard(openCard.id)}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </div>
  )
}
