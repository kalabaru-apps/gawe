# gawe-app Phase 2–7: Tools + Deployment Design Spec

**Date:** 2026-06-22  
**Status:** Approved

---

## Overview

Two parallel concerns:

1. **Docker/Coolify deployment** : make gawe-app deployable as a Docker container, auto-deployed from GitHub via Coolify.
2. **Tool implementation** : replace all 47 `ToolPlaceholder` stubs with real, working tool components across 6 category phases.

---

## Part 1: Docker/Coolify Deployment

### Approach

Next.js standalone output + multi-stage Dockerfile. Coolify connects to the GitHub repo and builds from the Dockerfile on every push to `main`.

### Changes to next.config.ts

Add `output: 'standalone'` to `nextConfig`:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
}
```

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm run build

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

### .dockerignore

```
node_modules
.next
.git
.superpowers
*.md
public/sw.js
public/workbox-*.js
public/swe-worker-*.js
```

### Coolify Configuration

- **Source:** GitHub repo (gawe-app)
- **Branch:** `main`
- **Build pack:** Dockerfile
- **Port:** `3000`
- **Auto-deploy:** on push to main ✅
- **Health check:** `GET /` → 200

### GitHub Remote

gawe-app is currently local-only. Before Coolify can connect:
```bash
gh repo create ticketpal-technologies/gawe-app --private
git remote add origin https://github.com/ticketpal-technologies/gawe-app.git
git push -u origin main
```

---

## Part 2: Tool Implementation

### Architecture

**File location:** `src/components/tools/[category]/[ToolId].tsx`

Example: `src/components/tools/encoding/JsonFormatter.tsx`

**Every tool exports a default component implementing ToolProps:**

```ts
import type { ToolProps } from '@/types'

export default function JsonFormatter({ onOutput, initialState }: ToolProps) {
  // initialState: last session inputs restored from localStorage
  // onOutput: call when tool produces a result → shell auto-saves to history
  return (...)
}
```

**Dynamic loader** : `/tools/[category]/[tool]/page.tsx` updated to lazy-load tool components:

```ts
import dynamic from 'next/dynamic'

const toolMap: Record<string, Record<string, () => Promise<{ default: ComponentType<ToolProps> }>>> = {
  encoding: {
    'json-formatter': () => import('@/components/tools/encoding/JsonFormatter'),
    // ...
  },
  // ...
}
```

`next/dynamic` with `ssr: false` for all tools (they run in browser only). Heavy libs (tldraw, pdf-lib, mermaid) only load when their tool is visited.

### Tool UI Pattern

Each tool follows a consistent two-panel layout:

```
┌─────────────────┬─────────────────┐
│  Input panel    │  Output panel   │
│  (left)         │  (right)        │
│                 │                 │
│  [inputs]       │  [outputs]      │
│                 │                 │
│  [Action btn]   │  [Copy btn]     │
└─────────────────┴─────────────────┘
```

Exceptions (single-panel tools): Scratchpad, Pomodoro, Meeting Cost, Whiteboard, Mermaid, HTTP Reference, Color Palette.

### Shared Tool Components

```
src/components/tools/shared/
├── ToolPanel.tsx          # Two-panel layout wrapper
├── CopyButton.tsx         # Copy-to-clipboard with toast feedback
├── FileDropzone.tsx       # Drag-and-drop file input
├── CodeEditor.tsx         # Monospace textarea with line numbers
└── ErrorAlert.tsx         # Error display for tool failures
```

### Implementation Phases

#### Phase 2: Encoding & Formatting (8 tools)

Dependencies: `js-yaml`, `smol-toml`, `papaparse`, `fast-xml-parser`, `prettier`, `sql-formatter`, `change-case`, `slugify`

| Tool | Component | Input → Output |
|---|---|---|
| JSON Formatter | `JsonFormatter.tsx` | Raw JSON → formatted/validated + tree view |
| Data Converter | `DataConverter.tsx` | Data in format A → format B (JSON/YAML/TOML/CSV/XML) |
| Base64 | `Base64.tsx` | Text or file → Base64 string (and reverse) |
| URL & HTML Encode | `UrlHtmlEncode.tsx` | Raw string → encoded (URL or HTML entities) |
| Code Beautifier | `CodeBeautifier.tsx` | Minified code → beautified (SQL/JS/CSS/HTML) |
| Case Converter | `CaseConverter.tsx` | Text → all case variants simultaneously |
| Line Tools | `LineTools.tsx` | Multi-line text → sorted/deduped/reversed/trimmed |
| String Tools | `StringTools.tsx` | String → slugified/escaped/unescaped |

#### Phase 3: Developer Utilities (10 tools)

Dependencies: `diff`, `marked`, `@faker-js/faker`, `cronstrue`, `cron-parser`, `chroma-js`, `lorem-ipsum`, `date-fns`

| Tool | Component | Input → Output |
|---|---|---|
| Regex Tester | `RegexTester.tsx` | Pattern + flags + test string → matches highlighted |
| Cron Builder | `CronBuilder.tsx` | Cron expression → human description + next 5 runs |
| Timestamp Converter | `TimestampConverter.tsx` | Unix timestamp ↔ human date (with timezone) |
| Base Converter | `BaseConverter.tsx` | Number → all bases simultaneously (bin/oct/dec/hex) |
| Color Converter | `ColorConverter.tsx` | Color value → all formats + contrast checker |
| Fake Data Generator | `FakeDataGenerator.tsx` | Schema config → rows of fake JSON/CSV |
| Text Diff | `TextDiff.tsx` | Two text inputs → side-by-side diff |
| Markdown Converter | `MarkdownConverter.tsx` | Markdown ↔ HTML with live preview |
| Lorem Ipsum | `LoremIpsum.tsx` | Config (words/sentences/paragraphs, count) → text |
| HTTP Reference | `HttpReference.tsx` | Searchable static reference (no input→output pattern) |

#### Phase 4: Crypto & Security (8 tools)

Dependencies: `crypto-js`, `bcryptjs`, `jose`, `uuid`, `ulid`, `otpauth`, `qrcode`, `html5-qrcode`

| Tool | Component | Input → Output |
|---|---|---|
| Hash Generator | `HashGenerator.tsx` | Text → MD5/SHA-1/SHA-256/SHA-512/HMAC hashes |
| Password Generator | `PasswordGenerator.tsx` | Config → password + entropy score + strength bar |
| Bcrypt | `Bcrypt.tsx` | Password → bcrypt hash / hash + password → verify |
| AES Encrypt/Decrypt | `AesEncrypt.tsx` | Text + key → encrypted / encrypted + key → decrypted |
| JWT Decoder | `JwtDecoder.tsx` | JWT string → decoded header + payload + expiry status |
| UUID/ULID Generator | `UuidUlid.tsx` | Click → batch of UUIDs/ULIDs |
| TOTP Generator | `Totp.tsx` | Secret → live 6-digit code + countdown |
| QR Code | `QrCode.tsx` | Text/URL → QR image / camera scan → decoded text |

#### Phase 5: Office Productivity (10 tools)

Dependencies: `date-fns`, `date-fns-tz`, `mathjs`, `papaparse`

| Tool | Component | Input → Output |
|---|---|---|
| Pomodoro | `Pomodoro.tsx` | Timer UI : 25/5/15 min cycles with sound |
| Timezone Converter | `TimezoneClock.tsx` | Time + timezone → conversions + live world clock |
| Unit Converter | `UnitConverter.tsx` | Value + unit → converted values across all units |
| Date Calculator | `DateCalculator.tsx` | Two dates → difference / date + offset → result |
| Calculator | `Calculator.tsx` | Expression → result (scientific + percentage) |
| CSV Editor | `CsvEditor.tsx` | CSV text/file → editable grid → export CSV |
| Word Counter | `WordCounter.tsx` | Text → word/char/sentence/reading-time counts |
| Scratchpad | `Scratchpad.tsx` | Freeform notes + checklist to-do (no output, just saves) |
| Meeting Cost | `MeetingCost.tsx` | Attendees + avg salary + duration → real-time cost ticker |
| Pastebin | `Pastebin.tsx` | Name + content → saved snippet list (CRUD) |

#### Phase 6: Visual & Design (5 tools)

Dependencies: `tldraw`, `mermaid`, `chroma-js`

| Tool | Component | Input → Output |
|---|---|---|
| CSS Generators | `CssGenerators.tsx` | Sliders → box-shadow/gradient CSS + live preview |
| Whiteboard | `Whiteboard.tsx` | Canvas (tldraw) : freeform drawing, auto-saves |
| Mermaid Diagrams | `MermaidDiagram.tsx` | Mermaid text → rendered diagram |
| Image Annotator | `ImageAnnotator.tsx` | Uploaded image + tldraw canvas → annotated export |
| Color Palette | `ColorPalette.tsx` | Base color → palette + wheel + harmony variants |

#### Phase 7: Image & Document (6 tools)

Dependencies: `pdf-lib`, `browser-image-conversion`, `svgo`

| Tool | Component | Input → Output |
|---|---|---|
| PDF Tools | `PdfTools.tsx` | PDF files → merged/split/rotated/compressed PDF |
| PDF ↔ Images | `PdfImageConverter.tsx` | PDF → images per page / images → PDF |
| Image Converter | `ImageConverter.tsx` | Image file → converted format (PNG/JPG/WebP/AVIF) |
| Image Resize | `ImageResize.tsx` | Image + dimensions → resized/cropped/compressed image |
| SVG Tools | `SvgTools.tsx` | SVG text/file → optimized SVG + favicon package |
| Image → Base64 | `ImageBase64.tsx` | Image file → Base64 data URI for CSS/HTML embedding |

---

## Shared Tool Components Spec

### ToolPanel.tsx
Two-column layout (50/50 split on desktop, stacked on mobile):
```tsx
<ToolPanel left={<InputSection />} right={<OutputSection />} />
```

### CopyButton.tsx
Copy string to clipboard, show checkmark for 2 seconds:
```tsx
<CopyButton value={outputString} />
```

### FileDropzone.tsx
Drag-and-drop zone accepting specified MIME types:
```tsx
<FileDropzone accept="application/pdf" onFile={(file) => ...} />
```

### CodeEditor.tsx
Monospace textarea with line numbers, optional syntax hint label:
```tsx
<CodeEditor value={code} onChange={setCode} language="json" />
```

### ErrorAlert.tsx
Red alert box for tool processing errors:
```tsx
<ErrorAlert message="Invalid JSON: Unexpected token at line 3" />
```

---

## Summary

| Concern | Decision |
|---|---|
| Docker base | node:20-alpine, multi-stage |
| Next.js output | standalone |
| Build command | `pnpm run build` (already `next build --webpack`) |
| Coolify source | GitHub repo, auto-deploy on main push |
| Port | 3000 |
| Tool component location | `src/components/tools/[category]/[ComponentName].tsx` |
| Tool loading | `next/dynamic` with `ssr: false` |
| Shared components | `src/components/tools/shared/` |
| Phase order | Encoding → Dev Utilities → Crypto → Office → Visual → Image |
| Plans | 7 total: 1 deployment plan + 6 category plans |
