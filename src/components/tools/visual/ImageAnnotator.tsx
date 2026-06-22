'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'

const TldrawAnnotator = dynamic(
  () => import('./TldrawAnnotatorInner'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading canvas…</div> }
)

export default function ImageAnnotator({ onOutput, initialState: _initialState }: ToolProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const handleFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    setImageUrl(url)
    onOutput({ fileName: file.name }, { loaded: true })
  }, [onOutput])

  return (
    <div className="space-y-4">
      {!imageUrl ? (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image to annotate" />
          <p className="text-xs text-muted-foreground text-center">Supports PNG, JPG, WebP, SVG</p>
        </div>
      ) : (
        <div className="space-y-2">
          <button onClick={() => setImageUrl(null)}
            className="px-3 py-1.5 rounded-md border border-input text-xs hover:bg-muted/50 transition-colors">
            ← Upload Different Image
          </button>
          <div className="w-full rounded-lg border border-input overflow-hidden" style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}>
            <TldrawAnnotator imageUrl={imageUrl} />
          </div>
        </div>
      )}
    </div>
  )
}
