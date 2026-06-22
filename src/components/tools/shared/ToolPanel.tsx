import { cn } from '@/lib/utils'

interface ToolPanelProps {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}

export function ToolPanel({ left, right, className }: ToolPanelProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 lg:grid-cols-2', className)}>
      <div className="flex flex-col gap-2">{left}</div>
      <div className="flex flex-col gap-2">{right}</div>
    </div>
  )
}
