# gawe-app Design Spec

**Date:** 2026-06-22  
**Status:** Approved

## Overview

gawe-app is a Next.js 15 PWA — a fully offline, installable browser-based toolkit of 47 developer and productivity tools across 6 categories. No backend, no auth, no cloud sync. All data stays in the browser.

---

## Architecture

### Pattern: Tool Registry

A central registry at `src/config/tools.ts` is the single source of truth for all tools:

```ts
interface ToolDefinition {
  id: string
  name: string
  category: CategoryId
  description: string
  icon: string           // lucide icon name
  route: string          // /tools/[category]/[tool]
  keywords: string[]     // for ⌘K search
}
```

Sidebar, command palette, history, favorites, PWA manifest, and routing all derive from this registry. Adding a new tool requires one registry entry + one tool component.

### Categories & Accent Colors

| Category | ID | Accent |
|---|---|---|
| Encoding & Formatting | `encoding` | Indigo |
| Crypto & Security | `crypto` | Amber |
| Developer Utilities | `dev` | Emerald |
| Image & Document | `image` | Rose |
| Office Productivity | `office` | Sky |
| Visual & Design | `visual` | Violet |

---

## Routing

```
/                          → Dashboard (category grid)
/tools/encoding/json-formatter
/tools/encoding/json-converter
/tools/encoding/base64
/tools/encoding/url-html-encode
/tools/encoding/code-beautifier
/tools/encoding/case-converter
/tools/encoding/line-tools
/tools/encoding/string-tools
/tools/crypto/hash-generator
/tools/crypto/password-generator
/tools/crypto/bcrypt
/tools/crypto/aes-encrypt
/tools/crypto/jwt-decoder
/tools/crypto/uuid-ulid
/tools/crypto/totp
/tools/crypto/qr-code
/tools/dev/regex-tester
/tools/dev/cron-builder
/tools/dev/timestamp-converter
/tools/dev/base-converter
/tools/dev/color-converter
/tools/dev/fake-data-generator
/tools/dev/text-diff
/tools/dev/markdown-converter
/tools/dev/lorem-ipsum
/tools/dev/http-reference
/tools/image/pdf-tools
/tools/image/pdf-image-converter
/tools/image/image-converter
/tools/image/image-resize
/tools/image/svg-tools
/tools/image/image-base64
/tools/office/pomodoro
/tools/office/timezone-clock
/tools/office/unit-converter
/tools/office/date-calculator
/tools/office/calculator
/tools/office/csv-editor
/tools/office/word-counter
/tools/office/scratchpad
/tools/office/meeting-cost
/tools/office/pastebin
/tools/visual/css-generators
/tools/visual/whiteboard
/tools/visual/mermaid
/tools/visual/image-annotator
/tools/visual/color-palette
```

---

## Layout

### Shell (always present)

```
┌─────────────┬────────────────────────────────┐
│  Sidebar    │  Tool Area                     │
│  (240px)    │  /tools/[category]/[tool]      │
│             │                                │
│  [Logo]     │  [Tool Header]                 │
│  [⌘K Search]│  [Tool Component]              │
│  ─────────  │                                │
│  Favorites  │                                │
│  ─────────  │                                │
│  Encoding ▾ │                                │
│    json     │                                │
│    base64   │                                │
│  Crypto ▾   │                                │
│    hash     │                                │
│  ...        │                                │
│  ─────────  │                                │
│  [History]  │                                │
│  [Settings] │                                │
└─────────────┴────────────────────────────────┘
```

**Sidebar:**
- Collapsible to icon-only mode (state persisted in localStorage)
- Category sections collapsible, accent color on label and active item background
- Pinned favorites section at top (drag to reorder)
- Bottom: History drawer trigger + Settings link

**Tool Header (per tool page):**
- Tool name + one-line description
- Star icon → toggle favorite
- History icon → opens right drawer with past sessions for this tool

**Homepage `/`:**
- Grid of category accent cards
- Click card → expands tool list for that category
- Acts as visual index for discovery

**`⌘K` Command Palette:**
- Global search across all tool names, descriptions, keywords
- Results grouped by category with accent color dots
- Keyboard nav, Enter navigates to tool route

---

## Data & Persistence

### IndexedDB (via `idb`)

```
database: gawe-app
├── history    { id, toolId, inputs, outputs, timestamp, label? }
└── saved      { id, toolId, name, inputs, outputs, createdAt }
```

**History rules:**
- Auto-saved on every tool output
- Max 100 entries per tool (oldest pruned)
- User can label any entry → promotes to `saved`
- History drawer per tool: click entry to restore inputs

**Saved sessions:**
- No limit, user-managed
- Full export as JSON
- Import JSON to restore

### localStorage

```
preferences: {
  theme: 'dark' | 'light'
  sidebarCollapsed: boolean
  favorites: string[]       // toolId[]
  recentTools: string[]     // toolId[], max 10
}

per-tool last state: { [toolId]: Record<string, unknown> }
// debounced 500ms on input change, restored on next visit
```

### No cloud, no sync

All data lives in the browser at the installed PWA origin.

---

## Tool Component Contract

Every tool exports a default component implementing:

```ts
interface ToolProps {
  onOutput: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  initialState?: Record<string, unknown>
}
```

- `onOutput` fires when tool produces a result → shell handles history save
- `initialState` contains last session inputs restored by the shell
- Tools never manage their own persistence

---

## Full Tool Inventory

### Encoding & Formatting (Indigo)

| Tool | Route slug | Key libraries |
|---|---|---|
| JSON formatter / validator / tree viewer | `json-formatter` | `json-tree-view` |
| JSON ↔ YAML ↔ TOML ↔ CSV ↔ XML converters | `json-converter` | `js-yaml`, `smol-toml`, `papaparse`, `fast-xml-parser` |
| Base64 encode/decode (text + file/image) | `base64` | native `btoa/atob`, FileReader |
| URL encode/decode, HTML entity encode/decode | `url-html-encode` | native |
| SQL/JS/CSS/HTML beautifier & minifier | `code-beautifier` | `prettier`, `sql-formatter` |
| Text case converter | `case-converter` | `change-case` |
| Sort/dedupe/reverse/trim lines | `line-tools` | native |
| Slugify, string escape/unescape | `string-tools` | `slugify` |

### Crypto & Security (Amber)

| Tool | Route slug | Key libraries |
|---|---|---|
| Hash generator (MD5, SHA-1/256/512), HMAC | `hash-generator` | `crypto-js` |
| Password generator + entropy meter | `password-generator` | Web Crypto API |
| Bcrypt hash / check | `bcrypt` | `bcryptjs` |
| AES text encrypt/decrypt | `aes-encrypt` | `crypto-js` |
| JWT decoder / debugger | `jwt-decoder` | `jose` |
| UUID / ULID generator | `uuid-ulid` | `uuid`, `ulid` |
| TOTP / 2FA code generator | `totp` | `otpauth` |
| QR code generator + camera reader | `qr-code` | `qrcode`, `html5-qrcode` |

### Developer Utilities (Emerald)

| Tool | Route slug | Key libraries |
|---|---|---|
| Regex tester + live highlight + explanation | `regex-tester` | native |
| Cron expression builder / parser | `cron-builder` | `cronstrue`, `cron-parser` |
| Unix timestamp ↔ human date converter | `timestamp-converter` | `date-fns` |
| Number base converter (bin/oct/dec/hex) | `base-converter` | native |
| Color converter + palette + CSS gradient + a11y | `color-converter` | `chroma-js` |
| Mock / fake data generator | `fake-data-generator` | `@faker-js/faker` |
| Text diff / file compare | `text-diff` | `diff` |
| Markdown ↔ HTML converter | `markdown-converter` | `marked` |
| Lorem ipsum generator | `lorem-ipsum` | `lorem-ipsum` |
| HTTP status code & MIME type reference | `http-reference` | static data |

### Image & Document (Rose)

| Tool | Route slug | Key libraries |
|---|---|---|
| PDF merge / split / reorder / rotate / compress | `pdf-tools` | `pdf-lib` |
| PDF ↔ images, images → PDF | `pdf-image-converter` | `pdf-lib`, canvas |
| Image format converter (PNG/JPG/WebP/AVIF) | `image-converter` | `browser-image-conversion` |
| Image resize / crop / compress | `image-resize` | `jimp` (WASM) |
| SVG optimizer + favicon generator | `svg-tools` | `svgo` |
| Image → Base64 / data URI | `image-base64` | native FileReader |

### Office Productivity (Sky)

| Tool | Route slug | Key libraries |
|---|---|---|
| Pomodoro + stopwatch | `pomodoro` | native |
| Timezone / world clock converter | `timezone-clock` | `date-fns-tz` |
| Unit converter (length, weight, temp, data) | `unit-converter` | static formulas |
| Date calculator | `date-calculator` | `date-fns` |
| Scientific + percentage calculator | `calculator` | `mathjs` |
| CSV viewer / editor | `csv-editor` | `papaparse` + custom grid |
| Word / character / reading-time counter | `word-counter` | native |
| Scratchpad + quick to-do | `scratchpad` | localStorage |
| Meeting cost calculator | `meeting-cost` | native |
| Pastebin (local) | `pastebin` | IndexedDB |

### Visual & Design (Violet)

| Tool | Route slug | Key libraries |
|---|---|---|
| CSS box-shadow + gradient generator | `css-generators` | native |
| Whiteboard / drawing canvas | `whiteboard` | `tldraw` |
| Mermaid diagram / flowchart renderer | `mermaid` | `mermaid` |
| Screenshot annotation / image markup | `image-annotator` | `tldraw` |
| Color wheel + palette generator | `color-palette` | `chroma-js` |

---

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript strict |
| Styling | Tailwind CSS v4 + shadcn/ui |
| PWA | `@ducanh2912/next-pwa` |
| Global state | `zustand` |
| IndexedDB | `idb` |
| localStorage hooks | `usehooks-ts` |
| Package manager | `pnpm` |

### shadcn/ui components used
Button, Input, Textarea, Tabs, Drawer, Dialog, Tooltip, ScrollArea, Badge, Separator, Command (for ⌘K palette)

---

## PWA Configuration

- Service worker caches all routes + static assets (offline-first)
- `manifest.json`: standalone display mode, installable on desktop and mobile
- Icons: 192×192, 512×512
- Theme color: neutral dark (dynamic accent not in manifest — applied via CSS only)

---

## Project Structure

```
gawe-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Shell: sidebar + main area
│   │   ├── page.tsx                # Dashboard homepage
│   │   └── tools/
│   │       └── [category]/
│   │           └── [tool]/
│   │               └── page.tsx    # Dynamic tool page
│   ├── components/
│   │   ├── shell/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── ToolHeader.tsx
│   │   │   └── HistoryDrawer.tsx
│   │   ├── ui/                     # shadcn/ui components
│   │   └── tools/                  # Tool components
│   │       ├── encoding/
│   │       ├── crypto/
│   │       ├── dev/
│   │       ├── image/
│   │       ├── office/
│   │       └── visual/
│   ├── config/
│   │   └── tools.ts                # Tool registry
│   ├── lib/
│   │   ├── db.ts                   # IndexedDB via idb
│   │   ├── preferences.ts          # localStorage helpers
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useHistory.ts
│   │   ├── useSaved.ts
│   │   ├── useToolState.ts         # per-tool last state
│   │   └── usePreferences.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-06-22-gawe-app-design.md
└── CLAUDE.md
```
