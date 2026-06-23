# Phase 6: Visual & Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 5 Visual & Design tools as real React components replacing ToolPlaceholder stubs.

**Architecture:** Each tool is a `'use client'` React component. Heavy libs (tldraw, mermaid) are dynamically imported with `next/dynamic` inside the component files themselves (not in ToolPageClient : tool files are already loaded via ToolPageClient's dynamic loader, so internal dynamic imports work fine). The `visual` category entry is added to `toolMap` in Task 1.

**Tech Stack:** Next.js 16, React 19, TypeScript, tldraw, mermaid, chroma-js (from Phase 3 if already installed, else install here), Tailwind v4

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- pnpm only (never npm or yarn)
- All tool components: `'use client'` directive at top
- All tool components: `export default function ComponentName({ onOutput, initialState }: ToolProps)`
- ToolProps: `{ onOutput: (inputs, outputs) => void; initialState?: Record<string, unknown> }`
- UI: use `ToolPanel`, `CopyButton`, `CodeEditor`, `ErrorAlert` from `@/components/tools/shared/`
- Tailwind v4: complete literal class strings only : no dynamic assembly
- Git commits end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use `rtk git` prefix for all git commands
- tldraw and mermaid: use dynamic import with `{ ssr: false }` INSIDE the component file (not in ToolPageClient)

---

## File Map

```
[MODIFY] src/app/tools/[category]/[tool]/ToolPageClient.tsx  : add visual entries to toolMap
[CREATE] src/components/tools/visual/CssGenerators.tsx
[CREATE] src/components/tools/visual/Whiteboard.tsx
[CREATE] src/components/tools/visual/MermaidDiagram.tsx
[CREATE] src/components/tools/visual/ImageAnnotator.tsx
[CREATE] src/components/tools/visual/ColorPalette.tsx
```

---

## Task 1: Install Phase 6 Dependencies + Update ToolPageClient

- [ ] **Step 1: Install dependencies**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add tldraw mermaid
```

Note: `chroma-js` + `@types/chroma-js` should already be installed from Phase 3. If not:

```bash
pnpm add chroma-js
pnpm add -D @types/chroma-js
```

- [ ] **Step 2: Add visual entry to toolMap in ToolPageClient.tsx**

```ts
  visual: {
    'css-generators': () => import('@/components/tools/visual/CssGenerators'),
    'whiteboard': () => import('@/components/tools/visual/Whiteboard'),
    'mermaid': () => import('@/components/tools/visual/MermaidDiagram'),
    'image-annotator': () => import('@/components/tools/visual/ImageAnnotator'),
    'color-palette': () => import('@/components/tools/visual/ColorPalette'),
  },
```

- [ ] **Step 3: Commit**

```bash
rtk git add package.json pnpm-lock.yaml src/app/tools/\[category\]/\[tool\]/ToolPageClient.tsx
rtk git commit -m "chore(phase6): install visual tools dependencies and register loaders

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: CSS Generators

**Files:**
- Create: `src/components/tools/visual/CssGenerators.tsx`

- [ ] **Step 1: Create CssGenerators.tsx**

Key logic: No external deps : pure CSS generation with sliders.
- Two tabs: "Box Shadow" and "Gradient"
- Box Shadow tab:
  - Sliders: X offset (-50 to 50), Y offset (-50 to 50), blur (0-100), spread (-50 to 50), opacity (0-100)
  - Color picker for shadow color
  - Inset toggle checkbox
  - Generates: `box-shadow: Xpx Ypx Bpx Spx rgba(r,g,b,alpha);` or `box-shadow: inset ...`
  - Live preview: a white box on dark bg with the shadow applied
- Gradient tab:
  - Type: linear, radial, conic
  - Direction: angle (0-360) for linear, or preset directions
  - Color stops: min 2, add/remove, each with color picker + position (0-100%)
  - Generates: `background: linear-gradient(90deg, #ff0000 0%, #0000ff 100%);`
  - Live preview: full-width colored box

```tsx
'use client'

import { useState } from 'react'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'

type Tab = 'shadow' | 'gradient'
type GradientType = 'linear' | 'radial' | 'conic'

interface ColorStop { id: string; color: string; position: number }

export default function CssGenerators({ onOutput, initialState: _initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('shadow')

  // Shadow state
  const [shadowX, setShadowX] = useState(4)
  const [shadowY, setShadowY] = useState(8)
  const [shadowBlur, setShadowBlur] = useState(16)
  const [shadowSpread, setShadowSpread] = useState(0)
  const [shadowColor, setShadowColor] = useState('#000000')
  const [shadowAlpha, setShadowAlpha] = useState(25)
  const [shadowInset, setShadowInset] = useState(false)

  // Gradient state
  const [gradType, setGradType] = useState<GradientType>('linear')
  const [gradAngle, setGradAngle] = useState(90)
  const [stops, setStops] = useState<ColorStop[]>([
    { id: '1', color: '#6366f1', position: 0 },
    { id: '2', color: '#ec4899', position: 100 },
  ])

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${(alpha / 100).toFixed(2)})`
  }

  const shadowCss = `box-shadow: ${shadowInset ? 'inset ' : ''}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(shadowColor, shadowAlpha)};`

  function gradientCss(): string {
    const stopStr = stops.map((s) => `${s.color} ${s.position}%`).join(', ')
    if (gradType === 'linear') return `background: linear-gradient(${gradAngle}deg, ${stopStr});`
    if (gradType === 'radial') return `background: radial-gradient(circle, ${stopStr});`
    return `background: conic-gradient(from ${gradAngle}deg, ${stopStr});`
  }

  const gradCss = gradientCss()

  function addStop() {
    setStops((prev) => [...prev, { id: Date.now().toString(), color: '#ffffff', position: 50 }])
  }

  function updateStop(id: string, field: 'color' | 'position', value: string | number) {
    setStops((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
  }

  function removeStop(id: string) {
    if (stops.length <= 2) return
    setStops((prev) => prev.filter((s) => s.id !== id))
  }

  const currentCss = tab === 'shadow' ? shadowCss : gradCss

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['shadow', 'gradient'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'shadow' ? 'Box Shadow' : 'Gradient'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {tab === 'shadow' ? (
            <>
              {[
                { label: 'X Offset', value: shadowX, set: setShadowX, min: -50, max: 50 },
                { label: 'Y Offset', value: shadowY, set: setShadowY, min: -50, max: 50 },
                { label: 'Blur Radius', value: shadowBlur, set: setShadowBlur, min: 0, max: 100 },
                { label: 'Spread Radius', value: shadowSpread, set: setShadowSpread, min: -50, max: 50 },
                { label: 'Opacity', value: shadowAlpha, set: setShadowAlpha, min: 0, max: 100 },
              ].map(({ label, value, set, min, max }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">{label}</label>
                    <span className="text-xs font-mono text-muted-foreground">{value}{label === 'Opacity' ? '%' : 'px'}</span>
                  </div>
                  <input type="range" min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} className="w-full" />
                </div>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground">Shadow Color</label>
                <input type="color" value={shadowColor} onChange={(e) => setShadowColor(e.target.value)}
                  className="h-8 w-12 rounded border border-input cursor-pointer bg-background p-1" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={shadowInset} onChange={(e) => setShadowInset(e.target.checked)} className="rounded" />
                Inset shadow
              </label>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                {(['linear', 'radial', 'conic'] as GradientType[]).map((t) => (
                  <button key={t} onClick={() => setGradType(t)}
                    className={`flex-1 py-1.5 rounded-md text-xs border capitalize transition-colors ${gradType === t ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {(gradType === 'linear' || gradType === 'conic') && (
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-medium text-muted-foreground">Angle</label>
                    <span className="text-xs font-mono text-muted-foreground">{gradAngle}°</span>
                  </div>
                  <input type="range" min={0} max={360} value={gradAngle} onChange={(e) => setGradAngle(Number(e.target.value))} className="w-full" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Color Stops</label>
                  <button onClick={addStop} className="text-xs text-primary hover:underline">+ Add Stop</button>
                </div>
                {stops.map((stop) => (
                  <div key={stop.id} className="flex items-center gap-2">
                    <input type="color" value={stop.color} onChange={(e) => updateStop(stop.id, 'color', e.target.value)}
                      className="h-8 w-12 rounded border border-input cursor-pointer bg-background p-1" />
                    <input type="range" min={0} max={100} value={stop.position} onChange={(e) => updateStop(stop.id, 'position', Number(e.target.value))}
                      className="flex-1" />
                    <span className="text-xs font-mono w-8 text-right text-muted-foreground">{stop.position}%</span>
                    <button onClick={() => removeStop(stop.id)} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors" disabled={stops.length <= 2}>✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="space-y-4">
          {/* Live preview */}
          <div className="h-32 rounded-lg border border-input overflow-hidden bg-neutral-900 flex items-center justify-center">
            {tab === 'shadow' ? (
              <div className="w-24 h-24 rounded-lg bg-white" style={{ boxShadow: `${shadowInset ? 'inset ' : ''}${shadowX}px ${shadowY}px ${shadowBlur}px ${shadowSpread}px ${hexToRgba(shadowColor, shadowAlpha)}` }} />
            ) : (
              <div className="w-full h-full" style={{ background: gradCss.replace('background: ', '').replace(';', '') }} />
            )}
          </div>
          {/* CSS output */}
          <div className="rounded-md border border-input p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">CSS</span>
              <CopyButton value={currentCss} />
            </div>
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-all">{currentCss}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/visual/CssGenerators.tsx
rtk git commit -m "feat(visual): CSS generators : box-shadow and gradient with live preview

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Whiteboard (tldraw)

**Files:**
- Create: `src/components/tools/visual/Whiteboard.tsx`

**Interfaces:**
- Consumes: `tldraw` : `Tldraw` component (self-contained canvas)
- tldraw handles its own persistence via `persistenceKey`

- [ ] **Step 1: Create Whiteboard.tsx**

Key logic:
- `tldraw` provides a full-featured drawing canvas
- Must use dynamic import with `ssr: false` INSIDE this file
- `Tldraw` accepts `persistenceKey` prop for localStorage auto-save
- `onOutput` is not meaningful for whiteboard (it's a freeform canvas) : call once on mount
- tldraw needs to be in a container with explicit height (100vh - header offset or a fixed min-height)

```tsx
'use client'

import { useEffect, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import type { ToolProps } from '@/types'

// tldraw imports CSS : we need to load it
// tldraw's Tldraw component is SSR-incompatible
const TldrawComponent = dynamic(
  async () => {
    const { Tldraw } = await import('tldraw')
    return Tldraw
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading whiteboard…
      </div>
    ),
  }
)

export default function Whiteboard({ onOutput, initialState: _initialState }: ToolProps) {
  useEffect(() => {
    onOutput({}, { message: 'whiteboard active' })
    // Import tldraw CSS
    import('tldraw/tldraw.css').catch(() => {})
  }, [])

  return (
    <div className="w-full rounded-lg border border-input overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      <TldrawComponent persistenceKey="gawe-whiteboard" />
    </div>
  )
}
```

**Important note on tldraw CSS:** tldraw requires its CSS file. The import `tldraw/tldraw.css` may need to be done in a layout or globally. If the dynamic CSS import fails, add `import 'tldraw/tldraw.css'` to `src/app/globals.css` using `@import 'tldraw/tldraw.css'` : but this may cause SSR issues. The safest approach is to add a `<link>` tag dynamically or import in a `useEffect`. If tldraw CSS import via `import()` in useEffect doesn't work, add it to the component with a `<style>` import trick or use Next.js `<Script>` for the CSS.

Alternative CSS approach that avoids SSR issues : add to `src/app/layout.tsx` or `src/app/globals.css`:
Actually, the simplest approach: add this line to `src/app/globals.css` at the top:

```css
@import 'tldraw/tldraw.css';
```

Do this in the globals.css import step. Check if `src/app/globals.css` exists and add `@import 'tldraw/tldraw.css';` at the top (before `@tailwind` directives).

- [ ] **Step 2: Add tldraw CSS to globals**

Open `src/app/globals.css`. At the very top, before `@tailwind` or `@import 'tailwindcss'`, add:

```css
@import 'tldraw/tldraw.css';
```

Note: In Tailwind v4, globals.css likely starts with `@import 'tailwindcss'`. Add the tldraw import AFTER it, or as a separate line. If there are CSS conflicts, wrap the tldraw import in a layer override.

- [ ] **Step 3: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/tools/visual/Whiteboard.tsx src/app/globals.css
rtk git commit -m "feat(visual): whiteboard powered by tldraw with localStorage persistence

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Mermaid Diagrams

**Files:**
- Create: `src/components/tools/visual/MermaidDiagram.tsx`

**Interfaces:**
- Consumes: `mermaid` : `mermaid.initialize()` + `mermaid.render(id, definition)` → SVG string

- [ ] **Step 1: Create MermaidDiagram.tsx**

Key logic:
- Left panel: CodeEditor for mermaid text input
- Right panel: rendered SVG (inserted via `dangerouslySetInnerHTML`)
- `import mermaid from 'mermaid'` inside the component
- `mermaid.initialize({ startOnLoad: false, theme: 'dark' })`
- `const { svg } = await mermaid.render('gawe-mermaid-' + Date.now(), definition)` : use unique ID each render
- Re-render on every input change (debounced 300ms)
- Default example: a simple flowchart
- Mermaid is large : wrap the import in a `useEffect` so it only loads client-side
- Actually mermaid is ESM-compatible and the component is already 'use client', so direct import is fine

```tsx
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
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/visual/MermaidDiagram.tsx
rtk git commit -m "feat(visual): mermaid diagram renderer with live preview

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Image Annotator (tldraw)

**Files:**
- Create: `src/components/tools/visual/ImageAnnotator.tsx`

**Interfaces:**
- Consumes: `tldraw` : `Tldraw` + `useEditor`, `AssetRecordType`, `createShapeId`, `TLAsset`, `getDefaultCDNBaseUrl`
- FileDropzone for image upload

- [ ] **Step 1: Create ImageAnnotator.tsx**

Key logic:
- User uploads an image → it becomes the background of a tldraw canvas
- tldraw canvas on top allows annotation with arrows, text, shapes
- Export: capture canvas as PNG (tldraw has `editor.exportToBlob()` or similar)
- This is more complex than Whiteboard due to image background

Simplified approach that definitely works:
- Show FileDropzone initially
- After image upload, show a two-layer approach:
  - `<img>` as absolute background (object-fit: contain)
  - tldraw canvas on top with transparent background
- For export: use `html2canvas` approach... or just tell users to use browser screenshot

Actually even simpler and reliable:
- Use tldraw's `createShapeId` and `editor.createAssets()` + `editor.createShapes()` to add the image as a locked background shape
- Use `useEditor` hook inside a nested component to access the editor instance

The cleanest approach for tldraw v2:

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
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
```

Create a separate inner component file `TldrawAnnotatorInner.tsx` that imports tldraw directly (since this file is only loaded via dynamic import with ssr:false):

```tsx
// src/components/tools/visual/TldrawAnnotatorInner.tsx
'use client'

import { useEffect, useRef } from 'react'
import { Tldraw, useEditor, createShapeId, AssetRecordType } from 'tldraw'

function ImageLoader({ imageUrl }: { imageUrl: string }) {
  const editor = useEditor()
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current || !editor) return
    loaded.current = true

    const img = new Image()
    img.onload = () => {
      const assetId = AssetRecordType.createId()
      editor.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: { name: 'background', src: imageUrl, w: img.naturalWidth, h: img.naturalHeight, mimeType: 'image/png', isAnimated: false },
        meta: {},
      }])
      editor.createShape({
        id: createShapeId(),
        type: 'image',
        x: 0, y: 0,
        isLocked: true,
        props: { assetId, w: img.naturalWidth, h: img.naturalHeight },
      })
      editor.zoomToFit()
    }
    img.src = imageUrl
  }, [editor, imageUrl])

  return null
}

export default function TldrawAnnotatorInner({ imageUrl }: { imageUrl: string }) {
  return (
    <Tldraw persistenceKey="gawe-annotator">
      <ImageLoader imageUrl={imageUrl} />
    </Tldraw>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/visual/ImageAnnotator.tsx src/components/tools/visual/TldrawAnnotatorInner.tsx
rtk git commit -m "feat(visual): image annotator with tldraw canvas overlay

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Color Palette

**Files:**
- Create: `src/components/tools/visual/ColorPalette.tsx`

**Interfaces:**
- Consumes: `chroma-js` : `chroma.scale()`, `chroma.distance()`, complementary/analogous/triadic harmony

- [ ] **Step 1: Create ColorPalette.tsx**

Key logic:
- Input: base color (color picker + text input)
- Tabs: "Tints & Shades", "Harmonies", "Scale"
- Tints & Shades: 10 shades from near-white to near-black using `chroma.mix(baseColor, 'white/black', ratio)`
  - Use: `Array.from({length: 10}, (_, i) => chroma.mix(base, 'white', i / 9).hex())` for tints
  - And: `Array.from({length: 10}, (_, i) => chroma.mix(base, 'black', i / 9).hex())` for shades
- Harmonies: complementary (rotate hue 180°), analogous (±30°), triadic (±120°), split-complementary (±150°)
  - Use: `chroma(base).set('hsl.h', hue + 180)` etc.
- Scale: `chroma.scale([color1, 'white', color2]).mode('lab').colors(10)`

```tsx
'use client'

import { useState, useEffect } from 'react'
import chroma from 'chroma-js'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'tints' | 'harmonies' | 'scale'

interface ColorSwatch { label: string; hex: string }

function Swatch({ label, hex }: ColorSwatch) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-12 h-12 rounded-md border border-input/30 cursor-pointer transition-transform hover:scale-110"
        style={{ backgroundColor: hex }}
        title={hex} />
      <span className="font-mono text-[10px] text-muted-foreground">{hex}</span>
      <CopyButton value={hex} />
    </div>
  )
}

export default function ColorPalette({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '#6366f1')
  const [tab, setTab] = useState<Tab>('tints')
  const [error, setError] = useState<string | null>(null)
  const [tints, setTints] = useState<ColorSwatch[]>([])
  const [shades, setShades] = useState<ColorSwatch[]>([])
  const [harmonies, setHarmonies] = useState<{ label: string; colors: string[] }[]>([])
  const [scale, setScale] = useState<string[]>([])

  useEffect(() => {
    try {
      const base = chroma(input.trim())
      const hue = base.get('hsl.h')
      setError(null)

      // Tints (mix with white)
      const newTints: ColorSwatch[] = Array.from({ length: 9 }, (_, i) => ({
        label: `${(i + 1) * 100}`,
        hex: chroma.mix(base, 'white', i / 8, 'lab').hex(),
      }))
      setTints(newTints)

      // Shades (mix with black)
      const newShades: ColorSwatch[] = Array.from({ length: 9 }, (_, i) => ({
        label: `${(i + 1) * 100}`,
        hex: chroma.mix(base, 'black', i / 8, 'lab').hex(),
      }))
      setShades(newShades)

      // Harmonies
      const rotate = (deg: number) => {
        try { return chroma(base.hex()).set('hsl.h', ((hue + deg) % 360 + 360) % 360).hex() } catch { return base.hex() }
      }
      setHarmonies([
        { label: 'Complementary', colors: [base.hex(), rotate(180)] },
        { label: 'Analogous', colors: [rotate(-30), base.hex(), rotate(30)] },
        { label: 'Triadic', colors: [base.hex(), rotate(120), rotate(240)] },
        { label: 'Split-Complementary', colors: [base.hex(), rotate(150), rotate(210)] },
        { label: 'Tetradic', colors: [base.hex(), rotate(90), rotate(180), rotate(270)] },
      ])

      // Scale
      const scaleColors = chroma.scale([chroma.mix(base, 'white', 0.8).hex(), base.hex(), chroma.mix(base, 'black', 0.6).hex()])
        .mode('lab').colors(11)
      setScale(scaleColors)

      onOutput({ baseColor: input }, { hex: base.hex() })
    } catch {
      setError('Invalid color format. Try: #6366f1, rgb(99,102,241), hsl(239,84%,67%)')
    }
  }, [input])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="color" value={input.startsWith('#') && input.length === 7 ? input : '#6366f1'}
          onChange={(e) => setInput(e.target.value)}
          className="h-10 w-14 rounded border border-input cursor-pointer bg-background p-1" />
        <input value={input} onChange={(e) => setInput(e.target.value)}
          className="flex-1 font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
          placeholder="#6366f1" spellCheck={false} />
        <div className="w-10 h-10 rounded-md border border-input" style={{ backgroundColor: input }} />
      </div>
      {error && <ErrorAlert message={error} />}
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['tints', 'harmonies', 'scale'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'tints' ? 'Tints & Shades' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'tints' && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Tints (mixed with white)</p>
            <div className="flex gap-3 flex-wrap">
              {tints.map((s) => <Swatch key={s.hex} {...s} />)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3">Shades (mixed with black)</p>
            <div className="flex gap-3 flex-wrap">
              {shades.map((s) => <Swatch key={s.hex} {...s} />)}
            </div>
          </div>
        </div>
      )}
      {tab === 'harmonies' && (
        <div className="space-y-4">
          {harmonies.map((h) => (
            <div key={h.label}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{h.label}</p>
              <div className="flex gap-3">
                {h.colors.map((c, i) => <Swatch key={i} label="" hex={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'scale' && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Color Scale (11 steps)</p>
          <div className="flex h-16 rounded-lg overflow-hidden border border-input">
            {scale.map((c) => <div key={c} className="flex-1" style={{ backgroundColor: c }} />)}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {scale.map((c) => <Swatch key={c} label="" hex={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check + commit**

```bash
rtk tsc --noEmit 2>&1 | head -20
rtk git add src/components/tools/visual/ColorPalette.tsx
rtk git commit -m "feat(visual): color palette : tints/shades, harmonies, scale

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ css-generators: box-shadow (X/Y/blur/spread/color/alpha/inset) + gradient (linear/radial/conic, color stops)
- ✅ whiteboard: tldraw with persistenceKey, dynamic import, tldraw CSS import
- ✅ mermaid: debounced render, dynamic import of mermaid, dark theme, error display
- ✅ image-annotator: file upload → tldraw canvas with locked image background shape
- ✅ color-palette: tints/shades, 5 harmony types, 11-step scale using chroma-js
- ✅ All 5 tools follow ToolProps interface with 'use client'

**tldraw notes:**
- tldraw v2+ uses `Tldraw` component from `tldraw` package (not `@tldraw/tldraw`)
- `persistenceKey` saves canvas state to localStorage automatically
- For ImageAnnotator, the inner component approach avoids SSR issues cleanly
- If tldraw version installed has different API (check `node_modules/tldraw/package.json`), adjust `createAssets` and `createShape` calls to match the installed version's API

**mermaid notes:**
- mermaid v10+ uses async `render()` API returning `{ svg }`
- `securityLevel: 'loose'` needed for clickable diagrams
- Dynamic import ensures mermaid is not bundled in initial load
