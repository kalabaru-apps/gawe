'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToolPanel } from '@/components/tools/shared/ToolPanel'
import { CodeEditor } from '@/components/tools/shared/CodeEditor'
import { CopyButton } from '@/components/tools/shared/CopyButton'
import { FileDropzone } from '@/components/tools/shared/FileDropzone'
import { ErrorAlert } from '@/components/tools/shared/ErrorAlert'
import type { ToolProps } from '@/types'

type Mode = 'text' | 'file'

export default function Base64({ onOutput, initialState }: ToolProps) {
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'text')
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const encode = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(input.trim())))
      setOutput(encoded)
      setError('')
      onOutput({ input, mode: 'encode' }, { output: encoded })
    } catch {
      setError('Encoding failed — input may contain unsupported characters')
    }
  }

  const decode = () => {
    try {
      const decoded = decodeURIComponent(escape(atob(input.trim())))
      setOutput(decoded)
      setError('')
      onOutput({ input, mode: 'decode' }, { output: decoded })
    } catch {
      setError('Invalid Base64 string')
    }
  }

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setOutput(base64)
      setError('')
      onOutput({ fileName: file.name, fileType: file.type }, { output: base64, dataUrl })
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="file">File / Image</TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'text' ? (
        <>
          <div className="flex gap-2">
            <Button size="sm" onClick={encode}>Encode →</Button>
            <Button size="sm" variant="outline" onClick={decode}>← Decode</Button>
          </div>
          {error && <ErrorAlert message={error} />}
          <ToolPanel
            left={<CodeEditor value={input} onChange={setInput} language="Input" rows={12} placeholder="Enter text to encode or Base64 to decode…" />}
            right={
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Output</span>
                  <CopyButton value={output} />
                </div>
                <CodeEditor value={output} onChange={() => {}} readOnly rows={12} />
              </div>
            }
          />
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <FileDropzone accept="*/*" onFile={handleFile} label="Drop any file or image to convert to Base64" />
          {fileName && <p className="text-xs text-muted-foreground">File: {fileName}</p>}
          {error && <ErrorAlert message={error} />}
          {output && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Base64 output</span>
                <CopyButton value={output} />
              </div>
              <CodeEditor value={output} onChange={() => {}} readOnly rows={10} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
