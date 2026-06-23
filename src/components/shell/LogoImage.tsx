'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface LogoImageProps {
  size?: number
  className?: string
}

export function LogoImage({ size = 24, className }: LogoImageProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const src = mounted && resolvedTheme === 'light' ? '/logo-dark.png' : '/logo-white.png'

  return <Image src={src} alt="Gawe" width={size} height={size} className={className} />
}
