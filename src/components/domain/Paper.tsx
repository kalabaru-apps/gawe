import { cn } from '@/lib/utils'

/** A4-ish reading column. Everything on a Paper tool flows top to bottom inside it. */
export function Sheet({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="h-full overflow-auto">
      <div className={cn('mx-auto w-full max-w-7xl px-5 py-8 sm:px-8', className)}>{children}</div>
    </div>
  )
}

/** Raised page: where the user's working content sits. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-d border border-d-border bg-d-raised p-5 shadow-[0_1px_0_hsl(var(--d-border)),0_8px_24px_-16px_hsl(var(--d-ink)/0.25)]', className)}>
      {children}
    </div>
  )
}

/** Printed result: serif figure, small caption. */
export function Result({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t-2 border-d-ink pt-3">
      <p className="text-sm text-d-muted">{label}</p>
      <p className="font-serif text-4xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-sm text-d-muted">{note}</p>}
    </div>
  )
}
export * from './kit'
