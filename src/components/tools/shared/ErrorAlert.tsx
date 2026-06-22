import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ErrorAlertProps {
  message: string
  className?: string
}

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-500',
      className
    )}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="font-mono text-xs leading-relaxed">{message}</span>
    </div>
  )
}
