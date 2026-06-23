'use client'

import { useState, useEffect, useRef } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { ErrorAlert } from '../shared/ErrorAlert'

const SAMPLE = `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E[Fix the issue]
    E --> B`

export default function MermaidDiagram({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? SAMPLE)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const renderIdRef = useRef(0)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!input.trim()) return
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })
        renderIdRef.current++
        const id = `gawe-mermaid-${renderIdRef.current}`
        const { svg: renderedSvg } = await mermaid.render(id, input.trim())
        setSvg(renderedSvg)
        setError(null)
        onOutput({ definition: input }, { rendered: true })
      } catch (e) {
        setError((e as Error).message)
        setSvg('')
      }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // onOutput is intentionally excluded : it's stable via useCallback in ToolPageClient
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input])

  return (
    <ToolPanel
      left={
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground block">Diagram Definition</label>
          <CodeEditor value={input} onChange={setInput} language="mermaid" />
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-2">
          <div className="flex justify-end">
            <CopyButton value={svg} />
          </div>
          <div className="border border-input rounded-md p-4 min-h-[300px] flex items-center justify-center bg-muted/20 overflow-auto">
            {svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} className="max-w-full" />
            ) : (
              <p className="text-sm text-muted-foreground">Diagram will render here</p>
            )}
          </div>
        </div>
      }
    />
  )
}
