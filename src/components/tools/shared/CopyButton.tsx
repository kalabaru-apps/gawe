'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

interface CopyButtonProps {
  value: string
  className?: string
}

export function CopyButton({ value, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation()

  const copy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className={className}
      disabled={!value}
    >
      {copied ? (
        <><Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" aria-hidden />{t('common.copied', 'Copied')}</>
      ) : (
        <><Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden />{t('common.copy', 'Copy')}</>
      )}
    </Button>
  )
}
