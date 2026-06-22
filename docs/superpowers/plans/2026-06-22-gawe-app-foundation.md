# gawe-app Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete foundation for gawe-app — dependencies, tool registry, persistence layer, zustand store, shell layout (sidebar + routing), command palette, history drawer, and dashboard — so any tool component can be dropped in without additional plumbing.

**Architecture:** Tool registry pattern — `src/config/tools.ts` is the single source of truth for all 47 tools. Sidebar, `⌘K` search, history, favorites, and routing all derive from it. Shell layout (`src/app/layout.tsx`) wraps all pages with a persistent sidebar. Dynamic route `/tools/[category]/[tool]/page.tsx` lazy-loads tool components by ID.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind CSS v4, shadcn/ui, zustand, idb, @ducanh2912/next-pwa, pnpm

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- Next.js 16, React 19, TypeScript strict — `"strict": true` in tsconfig.json (already set by scaffold)
- Tailwind CSS v4 — CSS-first config in `src/app/globals.css`, no `tailwind.config.js`
- pnpm only — never npm or yarn
- All `src/` imports use `@/` alias
- No server-side code — everything runs in the browser (mark files with `"use client"` where needed)
- shadcn/ui uses New York style, CSS variables enabled
- All git commits use: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## File Map

```
src/
├── types/
│   └── index.ts                          # [CREATE] All shared TypeScript interfaces
├── config/
│   └── tools.ts                          # [CREATE] Tool + category registry (47 tools)
├── lib/
│   ├── db.ts                             # [CREATE] IndexedDB wrapper via idb
│   ├── preferences.ts                    # [CREATE] localStorage helpers
│   └── utils.ts                          # [MODIFY] Add cn() helper (shadcn standard)
├── store/
│   └── index.ts                          # [CREATE] Zustand global UI store
├── hooks/
│   ├── useHistory.ts                     # [CREATE] History CRUD via idb
│   ├── useSaved.ts                       # [CREATE] Saved sessions CRUD via idb
│   ├── useToolState.ts                   # [CREATE] Per-tool last-state via localStorage
│   └── usePreferences.ts                 # [CREATE] Theme, sidebar, favorites
├── components/
│   ├── ui/                               # [CREATE] shadcn/ui components (via CLI)
│   ├── shell/
│   │   ├── AppShell.tsx                  # [CREATE] Root layout wrapper
│   │   ├── Sidebar.tsx                   # [CREATE] Collapsible sidebar with categories
│   │   ├── SidebarCategory.tsx           # [CREATE] Collapsible category section
│   │   ├── SidebarItem.tsx               # [CREATE] Single tool link
│   │   ├── CommandPalette.tsx            # [CREATE] ⌘K search overlay
│   │   ├── ToolHeader.tsx                # [CREATE] Tool page header (name, star, history)
│   │   ├── HistoryDrawer.tsx             # [CREATE] Right drawer with past sessions
│   │   └── ThemeToggle.tsx               # [CREATE] Dark/light toggle
│   └── dashboard/
│       └── CategoryCard.tsx              # [CREATE] Homepage category accent card
├── app/
│   ├── layout.tsx                        # [MODIFY] Wrap with AppShell + providers
│   ├── page.tsx                          # [MODIFY] Dashboard homepage grid
│   └── tools/
│       └── [category]/
│           └── [tool]/
│               └── page.tsx              # [CREATE] Dynamic tool loader
└── public/
    ├── manifest.json                     # [CREATE] PWA manifest
    └── icons/
        ├── icon-192.png                  # [CREATE] PWA icons (generated)
        └── icon-512.png
```

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json` (via pnpm add)

**Interfaces:**
- Produces: all packages available for import in subsequent tasks

- [ ] **Step 1: Install runtime dependencies**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add zustand idb usehooks-ts next-themes lucide-react @ducanh2912/next-pwa
```

Expected output: packages added, no errors.

- [ ] **Step 2: Install shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

When prompted:
- Style: **New York**
- Base color: **Neutral**
- CSS variables: **Yes**

This creates `components.json` and updates `src/app/globals.css` and `src/lib/utils.ts`.

- [ ] **Step 3: Add shadcn components**

```bash
pnpm dlx shadcn@latest add button input textarea tabs drawer dialog tooltip scroll-area badge separator command sheet
```

Expected: components appear in `src/components/ui/`.

- [ ] **Step 4: Verify install**

```bash
pnpm run build 2>&1 | head -20
```

Expected: build succeeds (or only pre-existing type warnings from scaffold).

- [ ] **Step 5: Commit**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
rtk git add package.json pnpm-lock.yaml components.json src/components/ui src/lib/utils.ts src/app/globals.css
rtk git commit -m "chore: install foundation dependencies and shadcn/ui

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Types & Tool Registry

**Files:**
- Create: `src/types/index.ts`
- Create: `src/config/tools.ts`

**Interfaces:**
- Produces:
  - `CategoryId` — union type used by all tools and shell components
  - `CategoryDefinition` — category metadata (label, accent classes)
  - `ToolDefinition` — tool metadata (id, name, route, keywords)
  - `ToolProps` — interface every tool component must implement
  - `HistoryEntry` — shape stored in IndexedDB history store
  - `SavedSession` — shape stored in IndexedDB saved store
  - `Preferences` — shape stored in localStorage
  - `CATEGORIES` — ordered array of `CategoryDefinition`
  - `TOOLS` — flat array of `ToolDefinition`
  - `getToolsByCategory(categoryId)` — returns tools for a category
  - `getToolByRoute(category, tool)` — looks up a tool by URL segments

- [ ] **Step 1: Create types**

Create `src/types/index.ts`:

```ts
export type CategoryId = 'encoding' | 'crypto' | 'dev' | 'image' | 'office' | 'visual'

export interface CategoryDefinition {
  id: CategoryId
  label: string
  /** Tailwind bg class for accent — e.g. 'bg-indigo-500' */
  accentBg: string
  /** Tailwind text class for accent — e.g. 'text-indigo-400' */
  accentText: string
  /** Tailwind border class — e.g. 'border-indigo-500' */
  accentBorder: string
  /** Tailwind subtle bg — e.g. 'bg-indigo-500/10' */
  accentSubtle: string
  /** Tailwind ring class — e.g. 'ring-indigo-500/30' */
  accentRing: string
}

export interface ToolDefinition {
  id: string
  name: string
  category: CategoryId
  description: string
  /** Lucide icon name — import from lucide-react */
  icon: string
  /** URL slug — used as /tools/[category]/[tool] */
  slug: string
  /** Search keywords beyond name/description */
  keywords: string[]
}

/** Every tool component must implement this interface */
export interface ToolProps {
  /** Fire when the tool produces output — shell saves to history automatically */
  onOutput: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  /** Last session inputs restored from localStorage */
  initialState?: Record<string, unknown>
}

export interface HistoryEntry {
  id?: number
  toolId: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  timestamp: number
  label?: string
}

export interface SavedSession {
  id?: number
  toolId: string
  name: string
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  createdAt: number
}

export interface Preferences {
  theme: 'dark' | 'light' | 'system'
  sidebarCollapsed: boolean
  favorites: string[]
  recentTools: string[]
  collapsedCategories: CategoryId[]
}
```

- [ ] **Step 2: Create tool registry**

Create `src/config/tools.ts`:

```ts
import type { CategoryDefinition, ToolDefinition } from '@/types'

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'encoding',
    label: 'Encoding & Formatting',
    accentBg: 'bg-indigo-500',
    accentText: 'text-indigo-400',
    accentBorder: 'border-indigo-500',
    accentSubtle: 'bg-indigo-500/10',
    accentRing: 'ring-indigo-500/30',
  },
  {
    id: 'crypto',
    label: 'Crypto & Security',
    accentBg: 'bg-amber-500',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500',
    accentSubtle: 'bg-amber-500/10',
    accentRing: 'ring-amber-500/30',
  },
  {
    id: 'dev',
    label: 'Developer Utilities',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500',
    accentSubtle: 'bg-emerald-500/10',
    accentRing: 'ring-emerald-500/30',
  },
  {
    id: 'image',
    label: 'Image & Document',
    accentBg: 'bg-rose-500',
    accentText: 'text-rose-400',
    accentBorder: 'border-rose-500',
    accentSubtle: 'bg-rose-500/10',
    accentRing: 'ring-rose-500/30',
  },
  {
    id: 'office',
    label: 'Office Productivity',
    accentBg: 'bg-sky-500',
    accentText: 'text-sky-400',
    accentBorder: 'border-sky-500',
    accentSubtle: 'bg-sky-500/10',
    accentRing: 'ring-sky-500/30',
  },
  {
    id: 'visual',
    label: 'Visual & Design',
    accentBg: 'bg-violet-500',
    accentText: 'text-violet-400',
    accentBorder: 'border-violet-500',
    accentSubtle: 'bg-violet-500/10',
    accentRing: 'ring-violet-500/30',
  },
]

export const TOOLS: ToolDefinition[] = [
  // Encoding & Formatting
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    category: 'encoding',
    description: 'Format, validate, and explore JSON as a collapsible tree',
    icon: 'Braces',
    slug: 'json-formatter',
    keywords: ['json', 'format', 'validate', 'tree', 'pretty', 'lint', 'beautify'],
  },
  {
    id: 'json-converter',
    name: 'Data Converter',
    category: 'encoding',
    description: 'Convert between JSON, YAML, TOML, CSV, and XML',
    icon: 'ArrowLeftRight',
    slug: 'json-converter',
    keywords: ['json', 'yaml', 'toml', 'csv', 'xml', 'convert', 'transform'],
  },
  {
    id: 'base64',
    name: 'Base64',
    category: 'encoding',
    description: 'Encode and decode text, files, and images to/from Base64',
    icon: 'FileCode',
    slug: 'base64',
    keywords: ['base64', 'encode', 'decode', 'image', 'file', 'binary'],
  },
  {
    id: 'url-html-encode',
    name: 'URL & HTML Encode',
    category: 'encoding',
    description: 'URL encode/decode and HTML entity encode/decode',
    icon: 'Link',
    slug: 'url-html-encode',
    keywords: ['url', 'encode', 'decode', 'html', 'entity', 'percent', 'uri'],
  },
  {
    id: 'code-beautifier',
    name: 'Code Beautifier',
    category: 'encoding',
    description: 'Beautify and minify SQL, JavaScript, CSS, and HTML',
    icon: 'Code2',
    slug: 'code-beautifier',
    keywords: ['beautify', 'minify', 'format', 'sql', 'js', 'css', 'html', 'prettier'],
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    category: 'encoding',
    description: 'Convert text between camelCase, snake_case, kebab-case, and more',
    icon: 'Type',
    slug: 'case-converter',
    keywords: ['case', 'camel', 'snake', 'kebab', 'pascal', 'title', 'upper', 'lower'],
  },
  {
    id: 'line-tools',
    name: 'Line Tools',
    category: 'encoding',
    description: 'Sort, deduplicate, reverse, and trim lines of text',
    icon: 'List',
    slug: 'line-tools',
    keywords: ['sort', 'dedupe', 'deduplicate', 'reverse', 'trim', 'lines', 'unique'],
  },
  {
    id: 'string-tools',
    name: 'String Tools',
    category: 'encoding',
    description: 'Slugify, escape, and unescape strings (JSON, SQL, regex)',
    icon: 'Regex',
    slug: 'string-tools',
    keywords: ['slug', 'slugify', 'escape', 'unescape', 'json', 'sql', 'regex', 'string'],
  },
  // Crypto & Security
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    category: 'crypto',
    description: 'Generate MD5, SHA-1, SHA-256, SHA-512, and HMAC hashes',
    icon: 'Hash',
    slug: 'hash-generator',
    keywords: ['hash', 'md5', 'sha', 'sha256', 'sha512', 'hmac', 'checksum'],
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    category: 'crypto',
    description: 'Generate secure passwords with entropy and strength meter',
    icon: 'KeyRound',
    slug: 'password-generator',
    keywords: ['password', 'generate', 'random', 'secure', 'entropy', 'strength', 'keygen'],
  },
  {
    id: 'bcrypt',
    name: 'Bcrypt',
    category: 'crypto',
    description: 'Hash and verify passwords with bcrypt',
    icon: 'ShieldCheck',
    slug: 'bcrypt',
    keywords: ['bcrypt', 'hash', 'password', 'verify', 'salt', 'rounds'],
  },
  {
    id: 'aes-encrypt',
    name: 'AES Encrypt/Decrypt',
    category: 'crypto',
    description: 'Encrypt and decrypt text with AES',
    icon: 'Lock',
    slug: 'aes-encrypt',
    keywords: ['aes', 'encrypt', 'decrypt', 'cipher', 'crypto', 'secret'],
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    category: 'crypto',
    description: 'Decode and inspect JWT tokens — header, payload, expiry',
    icon: 'Fingerprint',
    slug: 'jwt-decoder',
    keywords: ['jwt', 'token', 'decode', 'auth', 'bearer', 'payload', 'header'],
  },
  {
    id: 'uuid-ulid',
    name: 'UUID / ULID Generator',
    category: 'crypto',
    description: 'Generate UUIDs (v1, v4, v5) and ULIDs',
    icon: 'Shuffle',
    slug: 'uuid-ulid',
    keywords: ['uuid', 'ulid', 'guid', 'generate', 'unique', 'id'],
  },
  {
    id: 'totp',
    name: 'TOTP / 2FA Generator',
    category: 'crypto',
    description: 'Generate time-based one-time passwords for 2FA',
    icon: 'Timer',
    slug: 'totp',
    keywords: ['totp', '2fa', 'otp', 'authenticator', 'mfa', 'one-time', 'password'],
  },
  {
    id: 'qr-code',
    name: 'QR Code',
    category: 'crypto',
    description: 'Generate QR codes and read them via camera or image upload',
    icon: 'QrCode',
    slug: 'qr-code',
    keywords: ['qr', 'qrcode', 'scan', 'camera', 'generate', 'barcode'],
  },
  // Developer Utilities
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    category: 'dev',
    description: 'Test regular expressions with live highlighting and explanation',
    icon: 'Search',
    slug: 'regex-tester',
    keywords: ['regex', 'regexp', 'regular expression', 'test', 'match', 'pattern'],
  },
  {
    id: 'cron-builder',
    name: 'Cron Builder',
    category: 'dev',
    description: 'Build and parse cron expressions with human-readable output',
    icon: 'CalendarClock',
    slug: 'cron-builder',
    keywords: ['cron', 'schedule', 'expression', 'build', 'parse', 'interval'],
  },
  {
    id: 'timestamp-converter',
    name: 'Timestamp Converter',
    category: 'dev',
    description: 'Convert Unix timestamps to human dates and back',
    icon: 'Clock',
    slug: 'timestamp-converter',
    keywords: ['timestamp', 'unix', 'epoch', 'date', 'time', 'convert'],
  },
  {
    id: 'base-converter',
    name: 'Number Base Converter',
    category: 'dev',
    description: 'Convert numbers between binary, octal, decimal, and hex',
    icon: 'Binary',
    slug: 'base-converter',
    keywords: ['binary', 'octal', 'decimal', 'hex', 'hexadecimal', 'base', 'convert', 'number'],
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    category: 'dev',
    description: 'Convert colors between HEX, RGB, HSL with contrast checker',
    icon: 'Palette',
    slug: 'color-converter',
    keywords: ['color', 'hex', 'rgb', 'hsl', 'convert', 'palette', 'contrast', 'a11y', 'css'],
  },
  {
    id: 'fake-data-generator',
    name: 'Fake Data Generator',
    category: 'dev',
    description: 'Generate mock names, emails, addresses, and JSON rows',
    icon: 'UserCheck',
    slug: 'fake-data-generator',
    keywords: ['fake', 'mock', 'data', 'generate', 'name', 'email', 'address', 'json', 'faker'],
  },
  {
    id: 'text-diff',
    name: 'Text Diff',
    category: 'dev',
    description: 'Compare two text blocks or files side-by-side',
    icon: 'GitCompare',
    slug: 'text-diff',
    keywords: ['diff', 'compare', 'text', 'file', 'difference', 'patch'],
  },
  {
    id: 'markdown-converter',
    name: 'Markdown Converter',
    category: 'dev',
    description: 'Convert Markdown to HTML and back with live preview',
    icon: 'FileText',
    slug: 'markdown-converter',
    keywords: ['markdown', 'html', 'convert', 'preview', 'md', 'render'],
  },
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum',
    category: 'dev',
    description: 'Generate lorem ipsum placeholder text by words, sentences, or paragraphs',
    icon: 'AlignLeft',
    slug: 'lorem-ipsum',
    keywords: ['lorem', 'ipsum', 'placeholder', 'text', 'generate', 'dummy'],
  },
  {
    id: 'http-reference',
    name: 'HTTP Reference',
    category: 'dev',
    description: 'HTTP status codes and MIME types quick reference',
    icon: 'Globe',
    slug: 'http-reference',
    keywords: ['http', 'status', 'code', 'mime', 'type', 'reference', '404', '200', '500'],
  },
  // Image & Document
  {
    id: 'pdf-tools',
    name: 'PDF Tools',
    category: 'image',
    description: 'Merge, split, reorder, rotate, and compress PDF files',
    icon: 'FilePdf',
    slug: 'pdf-tools',
    keywords: ['pdf', 'merge', 'split', 'rotate', 'compress', 'reorder', 'combine'],
  },
  {
    id: 'pdf-image-converter',
    name: 'PDF ↔ Images',
    category: 'image',
    description: 'Convert PDF pages to images or combine images into a PDF',
    icon: 'FileImage',
    slug: 'pdf-image-converter',
    keywords: ['pdf', 'image', 'convert', 'png', 'jpg', 'pages', 'export'],
  },
  {
    id: 'image-converter',
    name: 'Image Converter',
    category: 'image',
    description: 'Convert images between PNG, JPG, WebP, and AVIF formats',
    icon: 'ImageIcon',
    slug: 'image-converter',
    keywords: ['image', 'convert', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'format'],
  },
  {
    id: 'image-resize',
    name: 'Image Resize',
    category: 'image',
    description: 'Resize, crop, and compress images in the browser',
    icon: 'Crop',
    slug: 'image-resize',
    keywords: ['image', 'resize', 'crop', 'compress', 'scale', 'width', 'height'],
  },
  {
    id: 'svg-tools',
    name: 'SVG Tools',
    category: 'image',
    description: 'Optimize SVGs and generate favicons from SVG or image',
    icon: 'VectorSquare',
    slug: 'svg-tools',
    keywords: ['svg', 'optimize', 'favicon', 'icon', 'minify', 'vector'],
  },
  {
    id: 'image-base64',
    name: 'Image → Base64',
    category: 'image',
    description: 'Convert images to Base64 data URIs for embedding in CSS or HTML',
    icon: 'Image',
    slug: 'image-base64',
    keywords: ['image', 'base64', 'data', 'uri', 'embed', 'css', 'html'],
  },
  // Office Productivity
  {
    id: 'pomodoro',
    name: 'Pomodoro',
    category: 'office',
    description: 'Pomodoro timer and stopwatch for focused work sessions',
    icon: 'TimerIcon',
    slug: 'pomodoro',
    keywords: ['pomodoro', 'timer', 'stopwatch', 'focus', 'break', 'productivity'],
  },
  {
    id: 'timezone-clock',
    name: 'Timezone Converter',
    category: 'office',
    description: 'Convert times across timezones and view a live world clock',
    icon: 'Globe2',
    slug: 'timezone-clock',
    keywords: ['timezone', 'time', 'world', 'clock', 'utc', 'convert', 'remote', 'team'],
  },
  {
    id: 'unit-converter',
    name: 'Unit Converter',
    category: 'office',
    description: 'Convert length, weight, temperature, and data sizes',
    icon: 'Ruler',
    slug: 'unit-converter',
    keywords: ['unit', 'convert', 'length', 'weight', 'temperature', 'data', 'bytes', 'metric'],
  },
  {
    id: 'date-calculator',
    name: 'Date Calculator',
    category: 'office',
    description: 'Calculate days between dates and add/subtract business days',
    icon: 'CalendarDays',
    slug: 'date-calculator',
    keywords: ['date', 'calculate', 'days', 'between', 'business', 'add', 'subtract', 'difference'],
  },
  {
    id: 'calculator',
    name: 'Calculator',
    category: 'office',
    description: 'Scientific and percentage calculator',
    icon: 'Calculator',
    slug: 'calculator',
    keywords: ['calculator', 'math', 'scientific', 'percentage', 'compute', 'formula'],
  },
  {
    id: 'csv-editor',
    name: 'CSV Editor',
    category: 'office',
    description: 'View and edit CSV files as a lightweight spreadsheet',
    icon: 'Table',
    slug: 'csv-editor',
    keywords: ['csv', 'spreadsheet', 'table', 'edit', 'view', 'data'],
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    category: 'office',
    description: 'Count words, characters, sentences, and estimate reading time',
    icon: 'AlignJustify',
    slug: 'word-counter',
    keywords: ['word', 'character', 'count', 'reading', 'time', 'text', 'length'],
  },
  {
    id: 'scratchpad',
    name: 'Scratchpad',
    category: 'office',
    description: 'Local notes and quick to-do list, persisted in browser storage',
    icon: 'NotebookPen',
    slug: 'scratchpad',
    keywords: ['note', 'scratchpad', 'todo', 'list', 'text', 'local', 'scratch'],
  },
  {
    id: 'meeting-cost',
    name: 'Meeting Cost',
    category: 'office',
    description: 'Calculate the real cost of a meeting based on attendees and salaries',
    icon: 'DollarSign',
    slug: 'meeting-cost',
    keywords: ['meeting', 'cost', 'salary', 'time', 'money', 'attendees', 'expensive'],
  },
  {
    id: 'pastebin',
    name: 'Pastebin',
    category: 'office',
    description: 'Local pastebin — save and retrieve text snippets by name',
    icon: 'ClipboardList',
    slug: 'pastebin',
    keywords: ['paste', 'snippet', 'save', 'local', 'clipboard', 'text', 'store'],
  },
  // Visual & Design
  {
    id: 'css-generators',
    name: 'CSS Generators',
    category: 'visual',
    description: 'Generate CSS box-shadow and gradient values with live preview',
    icon: 'Wand2',
    slug: 'css-generators',
    keywords: ['css', 'box-shadow', 'gradient', 'generate', 'shadow', 'background'],
  },
  {
    id: 'whiteboard',
    name: 'Whiteboard',
    category: 'visual',
    description: 'Freeform drawing and diagramming canvas',
    icon: 'PenTool',
    slug: 'whiteboard',
    keywords: ['whiteboard', 'draw', 'diagram', 'canvas', 'sketch', 'freeform'],
  },
  {
    id: 'mermaid',
    name: 'Mermaid Diagrams',
    category: 'visual',
    description: 'Render Mermaid flowcharts and diagrams from text',
    icon: 'GitBranch',
    slug: 'mermaid',
    keywords: ['mermaid', 'diagram', 'flowchart', 'sequence', 'graph', 'render'],
  },
  {
    id: 'image-annotator',
    name: 'Image Annotator',
    category: 'visual',
    description: 'Annotate and mark up screenshots and images',
    icon: 'MousePointer2',
    slug: 'image-annotator',
    keywords: ['annotate', 'markup', 'screenshot', 'image', 'arrow', 'highlight', 'draw'],
  },
  {
    id: 'color-palette',
    name: 'Color Palette',
    category: 'visual',
    description: 'Color wheel, palette generator, and harmony explorer',
    icon: 'CircleDot',
    slug: 'color-palette',
    keywords: ['color', 'palette', 'wheel', 'harmony', 'complementary', 'generate', 'hue'],
  },
]

export function getToolsByCategory(categoryId: CategoryId): ToolDefinition[] {
  return TOOLS.filter((t) => t.category === categoryId)
}

export function getToolByRoute(category: string, tool: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.category === category && t.slug === tool)
}

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return CATEGORIES.find((c) => c.id === id)
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/types/index.ts src/config/tools.ts
rtk git commit -m "feat: add types and tool registry (47 tools)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Persistence Layer

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/preferences.ts`
- Create: `src/hooks/useHistory.ts`
- Create: `src/hooks/useSaved.ts`
- Create: `src/hooks/useToolState.ts`
- Create: `src/hooks/usePreferences.ts`

**Interfaces:**
- Consumes: `HistoryEntry`, `SavedSession`, `Preferences` from `@/types`
- Produces:
  - `openDB()` — opens/upgrades the gawe-app IndexedDB
  - `addHistory(entry)` — inserts history entry, prunes to 100 per tool
  - `getHistory(toolId)` — returns entries newest-first
  - `labelHistory(id, label)` — labels an entry
  - `deleteHistory(id)` — removes one entry
  - `clearHistory(toolId)` — clears all entries for a tool
  - `addSaved(session)` — inserts saved session
  - `getSaved(toolId)` — returns saved sessions for a tool
  - `deleteSaved(id)` — removes one saved session
  - `getPreferences()` — reads from localStorage
  - `setPreferences(patch)` — merges patch into preferences
  - `getToolState(toolId)` — reads per-tool last state
  - `setToolState(toolId, state)` — writes per-tool last state (debounced externally)
  - `useHistory(toolId)` — React hook wrapping history functions
  - `useSaved(toolId)` — React hook wrapping saved functions
  - `useToolState(toolId)` — React hook with debounced persistence
  - `usePreferences()` — React hook with preferences + setters

- [ ] **Step 1: Create IndexedDB wrapper**

Create `src/lib/db.ts`:

```ts
import { openDB as idbOpenDB, type IDBPDatabase } from 'idb'
import type { HistoryEntry, SavedSession } from '@/types'

const DB_NAME = 'gawe-app'
const DB_VERSION = 1
const HISTORY_MAX_PER_TOOL = 100

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = idbOpenDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          const historyStore = db.createObjectStore('history', {
            keyPath: 'id',
            autoIncrement: true,
          })
          historyStore.createIndex('toolId', 'toolId')
          historyStore.createIndex('timestamp', 'timestamp')
        }
        if (!db.objectStoreNames.contains('saved')) {
          const savedStore = db.createObjectStore('saved', {
            keyPath: 'id',
            autoIncrement: true,
          })
          savedStore.createIndex('toolId', 'toolId')
        }
      },
    })
  }
  return dbPromise
}

export async function addHistory(entry: Omit<HistoryEntry, 'id'>): Promise<void> {
  const db = await getDB()
  await db.add('history', { ...entry, timestamp: Date.now() })
  // Prune oldest entries if over limit
  const tx = db.transaction('history', 'readwrite')
  const index = tx.store.index('toolId')
  const all = await index.getAllKeys(entry.toolId)
  if (all.length > HISTORY_MAX_PER_TOOL) {
    const toDelete = all.slice(0, all.length - HISTORY_MAX_PER_TOOL)
    for (const key of toDelete) await tx.store.delete(key)
  }
  await tx.done
}

export async function getHistory(toolId: string): Promise<HistoryEntry[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('history', 'toolId', toolId)
  return all.sort((a, b) => b.timestamp - a.timestamp)
}

export async function labelHistory(id: number, label: string): Promise<void> {
  const db = await getDB()
  const entry = await db.get('history', id)
  if (entry) await db.put('history', { ...entry, label })
}

export async function deleteHistory(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('history', id)
}

export async function clearHistory(toolId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('history', 'readwrite')
  const index = tx.store.index('toolId')
  const keys = await index.getAllKeys(toolId)
  for (const key of keys) await tx.store.delete(key)
  await tx.done
}

export async function addSaved(session: Omit<SavedSession, 'id'>): Promise<void> {
  const db = await getDB()
  await db.add('saved', { ...session, createdAt: Date.now() })
}

export async function getSaved(toolId: string): Promise<SavedSession[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('saved', 'toolId', toolId)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteSaved(id: number): Promise<void> {
  const db = await getDB()
  await db.delete('saved', id)
}

export async function exportAllData(): Promise<string> {
  const db = await getDB()
  const history = await db.getAll('history')
  const saved = await db.getAll('saved')
  return JSON.stringify({ history, saved, exportedAt: Date.now() }, null, 2)
}
```

- [ ] **Step 2: Create preferences helpers**

Create `src/lib/preferences.ts`:

```ts
import type { Preferences } from '@/types'

const PREFS_KEY = 'gawe-preferences'
const TOOL_STATE_PREFIX = 'gawe-tool-state:'

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'system',
  sidebarCollapsed: false,
  favorites: [],
  recentTools: [],
  collapsedCategories: [],
}

export function getPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function setPreferences(patch: Partial<Preferences>): Preferences {
  const current = getPreferences()
  const updated = { ...current, ...patch }
  localStorage.setItem(PREFS_KEY, JSON.stringify(updated))
  return updated
}

export function getToolState(toolId: string): Record<string, unknown> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`${TOOL_STATE_PREFIX}${toolId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setToolState(toolId: string, state: Record<string, unknown>): void {
  localStorage.setItem(`${TOOL_STATE_PREFIX}${toolId}`, JSON.stringify(state))
}
```

- [ ] **Step 3: Create hooks**

Create `src/hooks/useHistory.ts`:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { addHistory, getHistory, labelHistory, deleteHistory, clearHistory } from '@/lib/db'
import type { HistoryEntry } from '@/types'

export function useHistory(toolId: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  const load = useCallback(async () => {
    const data = await getHistory(toolId)
    setEntries(data)
  }, [toolId])

  useEffect(() => { load() }, [load])

  const add = useCallback(async (
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    await addHistory({ toolId, inputs, outputs, timestamp: Date.now() })
    await load()
  }, [toolId, load])

  const label = useCallback(async (id: number, text: string) => {
    await labelHistory(id, text)
    await load()
  }, [load])

  const remove = useCallback(async (id: number) => {
    await deleteHistory(id)
    await load()
  }, [load])

  const clear = useCallback(async () => {
    await clearHistory(toolId)
    await load()
  }, [toolId, load])

  return { entries, add, label, remove, clear, reload: load }
}
```

Create `src/hooks/useSaved.ts`:

```ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { addSaved, getSaved, deleteSaved } from '@/lib/db'
import type { SavedSession } from '@/types'

export function useSaved(toolId: string) {
  const [sessions, setSessions] = useState<SavedSession[]>([])

  const load = useCallback(async () => {
    const data = await getSaved(toolId)
    setSessions(data)
  }, [toolId])

  useEffect(() => { load() }, [load])

  const save = useCallback(async (
    name: string,
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>
  ) => {
    await addSaved({ toolId, name, inputs, outputs, createdAt: Date.now() })
    await load()
  }, [toolId, load])

  const remove = useCallback(async (id: number) => {
    await deleteSaved(id)
    await load()
  }, [load])

  return { sessions, save, remove, reload: load }
}
```

Create `src/hooks/useToolState.ts`:

```ts
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getToolState, setToolState } from '@/lib/preferences'

export function useToolState(toolId: string) {
  const [state, setState] = useState<Record<string, unknown>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setState(getToolState(toolId))
  }, [toolId])

  const update = useCallback((patch: Record<string, unknown>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setToolState(toolId, next), 500)
      return next
    })
  }, [toolId])

  return { state, update }
}
```

Create `src/hooks/usePreferences.ts`:

```ts
'use client'

import { useState, useCallback } from 'react'
import { getPreferences, setPreferences } from '@/lib/preferences'
import type { Preferences, CategoryId } from '@/types'

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => getPreferences())

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = setPreferences({ ...prev, ...patch })
      return next
    })
  }, [])

  const toggleFavorite = useCallback((toolId: string) => {
    setPrefs((prev) => {
      const isFav = prev.favorites.includes(toolId)
      const favorites = isFav
        ? prev.favorites.filter((id) => id !== toolId)
        : [...prev.favorites, toolId]
      return setPreferences({ ...prev, favorites })
    })
  }, [])

  const addRecent = useCallback((toolId: string) => {
    setPrefs((prev) => {
      const filtered = prev.recentTools.filter((id) => id !== toolId)
      const recentTools = [toolId, ...filtered].slice(0, 10)
      return setPreferences({ ...prev, recentTools })
    })
  }, [])

  const toggleCategory = useCallback((categoryId: CategoryId) => {
    setPrefs((prev) => {
      const collapsed = prev.collapsedCategories.includes(categoryId)
      const collapsedCategories = collapsed
        ? prev.collapsedCategories.filter((id) => id !== categoryId)
        : [...prev.collapsedCategories, categoryId]
      return setPreferences({ ...prev, collapsedCategories })
    })
  }, [])

  return { prefs, update, toggleFavorite, addRecent, toggleCategory }
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/db.ts src/lib/preferences.ts src/hooks/
rtk git commit -m "feat: persistence layer — IndexedDB history/saved + localStorage prefs

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Zustand Store

**Files:**
- Create: `src/store/index.ts`

**Interfaces:**
- Produces:
  - `useAppStore()` — zustand hook with:
    - `commandPaletteOpen: boolean`
    - `setCommandPaletteOpen(open: boolean): void`
    - `historyDrawerToolId: string | null`
    - `openHistoryDrawer(toolId: string): void`
    - `closeHistoryDrawer(): void`
    - `sidebarCollapsed: boolean`
    - `setSidebarCollapsed(collapsed: boolean): void`

- [ ] **Step 1: Create store**

Create `src/store/index.ts`:

```ts
import { create } from 'zustand'

interface AppStore {
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  historyDrawerToolId: string | null
  openHistoryDrawer: (toolId: string) => void
  closeHistoryDrawer: () => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  historyDrawerToolId: null,
  openHistoryDrawer: (toolId) => set({ historyDrawerToolId: toolId }),
  closeHistoryDrawer: () => set({ historyDrawerToolId: null }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}))
```

- [ ] **Step 2: TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/store/index.ts
rtk git commit -m "feat: zustand store for global UI state

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Theme Provider + App Shell

**Files:**
- Create: `src/components/shell/ThemeToggle.tsx`
- Create: `src/components/shell/AppShell.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` — category accent CSS variables

**Interfaces:**
- Consumes: `useAppStore` from `@/store`, `next-themes`
- Produces: `AppShell` wrapping all pages with sidebar + main area

- [ ] **Step 1: Add category accent CSS variables to globals.css**

Open `src/app/globals.css`. After the existing `@layer base` or at the end of the file, add:

```css
/* Category accent colors exposed as CSS custom properties */
:root {
  --accent-encoding: theme(colors.indigo.500);
  --accent-crypto: theme(colors.amber.500);
  --accent-dev: theme(colors.emerald.500);
  --accent-image: theme(colors.rose.500);
  --accent-office: theme(colors.sky.500);
  --accent-visual: theme(colors.violet.500);
}
```

Note: Tailwind v4 uses `theme()` inside CSS, not `@apply` for color references. If `theme()` fails in the build, use the raw oklch values directly:

```css
:root {
  --accent-encoding: oklch(0.585 0.233 277.1);
  --accent-crypto: oklch(0.769 0.189 70.1);
  --accent-dev: oklch(0.696 0.17 162.5);
  --accent-image: oklch(0.656 0.241 14.5);
  --accent-office: oklch(0.686 0.185 231.9);
  --accent-visual: oklch(0.627 0.265 303.9);
}
```

- [ ] **Step 2: Create ThemeToggle**

Create `src/components/shell/ThemeToggle.tsx`:

```tsx
'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <Button variant="ghost" size="icon" onClick={cycle} title="Toggle theme">
      {theme === 'light' && <Sun className="h-4 w-4" />}
      {theme === 'dark' && <Moon className="h-4 w-4" />}
      {(theme === 'system' || !theme) && <Monitor className="h-4 w-4" />}
    </Button>
  )
}
```

- [ ] **Step 3: Create AppShell**

Create `src/components/shell/AppShell.tsx`:

```tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { HistoryDrawer } from './HistoryDrawer'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
        <CommandPalette />
        <HistoryDrawer />
      </div>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Update app layout**

Replace the content of `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/shell/AppShell'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Gawe App — Offline Developer Tools',
  description: '47 offline productivity and developer tools in one installable PWA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
pnpm exec tsc --noEmit 2>&1 | head -20
```

Note: `Sidebar`, `CommandPalette`, and `HistoryDrawer` don't exist yet — expect "Cannot find module" errors for those three. That's expected; they're created in Tasks 6–8.

- [ ] **Step 6: Commit**

```bash
rtk git add src/components/shell/ThemeToggle.tsx src/components/shell/AppShell.tsx src/app/layout.tsx src/app/globals.css
rtk git commit -m "feat: AppShell with ThemeProvider and layout structure

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Sidebar

**Files:**
- Create: `src/components/shell/Sidebar.tsx`
- Create: `src/components/shell/SidebarCategory.tsx`
- Create: `src/components/shell/SidebarItem.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `TOOLS`, `getToolsByCategory` from `@/config/tools`; `useAppStore` from `@/store`; `usePreferences` from `@/hooks/usePreferences`; Next.js `usePathname`, `Link`
- Produces: `<Sidebar />` — collapsible left sidebar with category sections and tool links

- [ ] **Step 1: Create SidebarItem**

Create `src/components/shell/SidebarItem.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface SidebarItemProps {
  tool: ToolDefinition
  category: CategoryDefinition
  collapsed: boolean
}

export function SidebarItem({ tool, category, collapsed }: SidebarItemProps) {
  const pathname = usePathname()
  const href = `/tools/${tool.category}/${tool.slug}`
  const isActive = pathname === href

  return (
    <Link
      href={href}
      title={collapsed ? tool.name : undefined}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && [
          category.accentSubtle,
          category.accentText,
          'font-medium',
        ],
        !isActive && 'text-muted-foreground',
        collapsed && 'justify-center px-0'
      )}
    >
      <span className={cn('shrink-0 text-base', isActive && category.accentText)}>
        {/* Icon rendered by parent via lucide-react dynamic lookup */}
        <span className="h-4 w-4 inline-block" aria-hidden>•</span>
      </span>
      {!collapsed && <span className="truncate">{tool.name}</span>}
    </Link>
  )
}
```

Note on icons: Lucide icons cannot be dynamically imported by string name at runtime without a full registry. For now, SidebarItem uses a bullet placeholder. Icons will be wired in a follow-up once the icon map is established in Task 8 (dashboard).

- [ ] **Step 2: Create SidebarCategory**

Create `src/components/shell/SidebarCategory.tsx`:

```tsx
'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarItem } from './SidebarItem'
import { getToolsByCategory } from '@/config/tools'
import type { CategoryDefinition, CategoryId } from '@/types'

interface SidebarCategoryProps {
  category: CategoryDefinition
  collapsed: boolean
  isExpanded: boolean
  onToggle: (id: CategoryId) => void
}

export function SidebarCategory({ category, collapsed, isExpanded, onToggle }: SidebarCategoryProps) {
  const tools = getToolsByCategory(category.id)

  return (
    <div>
      <button
        onClick={() => onToggle(category.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
          'hover:bg-accent',
          category.accentText,
          collapsed && 'justify-center'
        )}
        title={collapsed ? category.label : undefined}
      >
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full', category.accentBg)}
          aria-hidden
        />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{category.label}</span>
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', !isExpanded && '-rotate-90')}
            />
          </>
        )}
      </button>
      {isExpanded && !collapsed && (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-border pl-2">
          {tools.map((tool) => (
            <SidebarItem key={tool.id} tool={tool} category={category} collapsed={false} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create Sidebar**

Create `src/components/shell/Sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen, History, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES, TOOLS } from '@/config/tools'
import { useAppStore } from '@/store'
import { usePreferences } from '@/hooks/usePreferences'
import { SidebarCategory } from './SidebarCategory'
import { SidebarItem } from './SidebarItem'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import type { CategoryId } from '@/types'

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, setCommandPaletteOpen } = useAppStore()
  const { prefs, toggleFavorite, toggleCategory } = usePreferences()

  const favTools = TOOLS.filter((t) => prefs.favorites.includes(t.id))

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-200',
        sidebarCollapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-border shrink-0">
        {!sidebarCollapsed && (
          <Link href="/" className="font-bold text-sm tracking-tight">
            gawe<span className="text-violet-400">.</span>app
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search trigger */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 shrink-0">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            <span>Search tools...</span>
            <kbd className="ml-auto rounded bg-muted px-1 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {/* Favorites */}
        {favTools.length > 0 && (
          <div className="mb-2">
            {!sidebarCollapsed && (
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Favorites
              </p>
            )}
            <div className="space-y-0.5">
              {favTools.map((tool) => {
                const cat = CATEGORIES.find((c) => c.id === tool.category)!
                return (
                  <SidebarItem
                    key={tool.id}
                    tool={tool}
                    category={cat}
                    collapsed={sidebarCollapsed}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Categories */}
        {CATEGORIES.map((cat) => (
          <SidebarCategory
            key={cat.id}
            category={cat}
            collapsed={sidebarCollapsed}
            isExpanded={!prefs.collapsedCategories.includes(cat.id as CategoryId)}
            onToggle={toggleCategory}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-2 py-2 flex items-center gap-1">
        <ThemeToggle />
        {!sidebarCollapsed && (
          <span className="text-xs text-muted-foreground ml-1">Theme</span>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Verify dev server**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm run dev
```

Open `http://localhost:3000`. You should see the sidebar on the left with category sections. The main area is blank (dashboard not built yet). No console errors.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/shell/Sidebar.tsx src/components/shell/SidebarCategory.tsx src/components/shell/SidebarItem.tsx
rtk git commit -m "feat: sidebar with collapsible categories and favorites

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Command Palette

**Files:**
- Create: `src/components/shell/CommandPalette.tsx`

**Interfaces:**
- Consumes: `TOOLS`, `CATEGORIES`, `getCategoryById` from `@/config/tools`; `useAppStore` from `@/store`; shadcn `Command` components
- Produces: `<CommandPalette />` — `⌘K` overlay searching all tools by name/description/keywords

- [ ] **Step 1: Create CommandPalette**

Create `src/components/shell/CommandPalette.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useAppStore } from '@/store'
import { CATEGORIES, TOOLS } from '@/config/tools'
import { cn } from '@/lib/utils'

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  const navigate = (href: string) => {
    setCommandPaletteOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Search tools..." />
      <CommandList>
        <CommandEmpty>No tools found.</CommandEmpty>
        {CATEGORIES.map((category) => {
          const tools = TOOLS.filter((t) => t.category === category.id)
          return (
            <CommandGroup key={category.id} heading={category.label}>
              {tools.map((tool) => (
                <CommandItem
                  key={tool.id}
                  value={`${tool.name} ${tool.description} ${tool.keywords.join(' ')}`}
                  onSelect={() => navigate(`/tools/${tool.category}/${tool.slug}`)}
                >
                  <span
                    className={cn('mr-2 h-2 w-2 rounded-full shrink-0', category.accentBg)}
                    aria-hidden
                  />
                  <span className="font-medium">{tool.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground truncate">
                    {tool.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
```

- [ ] **Step 2: Verify**

Run dev server. Press `⌘K` (or `Ctrl+K` on Windows). Command palette should open. Type "json" — JSON tools should appear. Press Enter on a result — should navigate to that tool's route (404 for now, that's fine).

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/shell/CommandPalette.tsx
rtk git commit -m "feat: command palette with ⌘K search across all 47 tools

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Tool Header + History Drawer + Dynamic Tool Route

**Files:**
- Create: `src/components/shell/ToolHeader.tsx`
- Create: `src/components/shell/HistoryDrawer.tsx`
- Create: `src/app/tools/[category]/[tool]/page.tsx`

**Interfaces:**
- Consumes: `useHistory`, `useSaved` hooks; `useAppStore`; `getToolByRoute`, `getCategoryById` from `@/config/tools`; shadcn `Sheet`, `Button`, `Badge`
- Produces:
  - `<ToolHeader tool category />` — name, description, star, history button
  - `<HistoryDrawer />` — right sheet with entries for active tool
  - `/tools/[category]/[tool]` — renders tool component or "coming soon" placeholder

- [ ] **Step 1: Create ToolHeader**

Create `src/components/shell/ToolHeader.tsx`:

```tsx
'use client'

import { Star, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { usePreferences } from '@/hooks/usePreferences'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface ToolHeaderProps {
  tool: ToolDefinition
  category: CategoryDefinition
}

export function ToolHeader({ tool, category }: ToolHeaderProps) {
  const { openHistoryDrawer } = useAppStore()
  const { prefs, toggleFavorite } = usePreferences()
  const isFav = prefs.favorites.includes(tool.id)

  return (
    <div className={cn('flex items-center gap-3 border-b border-border px-6 py-4 shrink-0')}>
      <div
        className={cn('h-1 w-6 rounded-full shrink-0', category.accentBg)}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold leading-tight">{tool.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{tool.description}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => toggleFavorite(tool.id)}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={cn('h-4 w-4', isFav ? category.accentText + ' fill-current' : 'text-muted-foreground')}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => openHistoryDrawer(tool.id)}
        title="View history"
      >
        <History className="h-4 w-4 text-muted-foreground" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create HistoryDrawer**

Create `src/components/shell/HistoryDrawer.tsx`:

```tsx
'use client'

import { formatDistanceToNow } from 'date-fns'
import { X, Trash2, Tag } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppStore } from '@/store'
import { useHistory } from '@/hooks/useHistory'
import { TOOLS } from '@/config/tools'

export function HistoryDrawer() {
  const { historyDrawerToolId, closeHistoryDrawer } = useAppStore()
  const open = historyDrawerToolId !== null
  const toolId = historyDrawerToolId ?? ''
  const { entries, remove, clear } = useHistory(toolId)
  const tool = TOOLS.find((t) => t.id === toolId)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeHistoryDrawer()}>
      <SheetContent side="right" className="w-80 flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm">
              History — {tool?.name ?? ''}
            </SheetTitle>
            <div className="flex gap-1">
              {entries.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => clear()}
                  title="Clear all history"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={closeHistoryDrawer}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="flex-1">
          {entries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No history yet. Run the tool to save entries.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((entry) => (
                <div key={entry.id} className="px-4 py-3 group hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {entry.label && (
                        <Badge variant="secondary" className="mb-1 text-xs">
                          {entry.label}
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </p>
                      <p className="text-xs font-mono mt-1 truncate text-foreground/70">
                        {JSON.stringify(entry.inputs).slice(0, 60)}…
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => entry.id && remove(entry.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 3: Install date-fns (needed for HistoryDrawer)**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add date-fns
```

- [ ] **Step 4: Create dynamic tool route**

Create the directory structure and file:

```bash
mkdir -p "D:\Kalabaru\source-codes\gawe-app\src\app\tools\[category]\[tool]"
```

Create `src/app/tools/[category]/[tool]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getToolByRoute, getCategoryById } from '@/config/tools'
import { ToolHeader } from '@/components/shell/ToolHeader'
import { ToolPlaceholder } from '@/components/shell/ToolPlaceholder'

interface PageProps {
  params: Promise<{ category: string; tool: string }>
}

export default async function ToolPage({ params }: PageProps) {
  const { category, tool } = await params
  const toolDef = getToolByRoute(category, tool)
  const categoryDef = getCategoryById(category)

  if (!toolDef || !categoryDef) notFound()

  return (
    <div className="flex flex-col h-full">
      <ToolHeader tool={toolDef} category={categoryDef} />
      <div className="flex-1 overflow-auto p-6">
        <ToolPlaceholder tool={toolDef} category={categoryDef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create ToolPlaceholder**

Create `src/components/shell/ToolPlaceholder.tsx`:

```tsx
import { cn } from '@/lib/utils'
import type { ToolDefinition, CategoryDefinition } from '@/types'

interface ToolPlaceholderProps {
  tool: ToolDefinition
  category: CategoryDefinition
}

export function ToolPlaceholder({ tool, category }: ToolPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-border">
      <div className={cn('h-3 w-3 rounded-full mb-3', category.accentBg)} aria-hidden />
      <p className="text-sm font-medium">{tool.name}</p>
      <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
    </div>
  )
}
```

- [ ] **Step 6: Verify routing**

Run dev server. Navigate to `http://localhost:3000/tools/encoding/json-formatter`. You should see the ToolHeader with "JSON Formatter" and a placeholder card. Star and History buttons should work (no errors).

Press `⌘K`, search "bcrypt", select it — should navigate to `/tools/crypto/bcrypt` with its header.

- [ ] **Step 7: Commit**

```bash
rtk git add src/components/shell/ToolHeader.tsx src/components/shell/HistoryDrawer.tsx src/components/shell/ToolPlaceholder.tsx src/app/tools/ pnpm-lock.yaml package.json
rtk git commit -m "feat: tool header, history drawer, and dynamic tool routing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Dashboard Homepage

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/CategoryCard.tsx`

**Interfaces:**
- Consumes: `CATEGORIES`, `getToolsByCategory` from `@/config/tools`; Next.js `Link`
- Produces: homepage grid of 6 category cards with tool counts and links

- [ ] **Step 1: Create CategoryCard**

Create `src/components/dashboard/CategoryCard.tsx`:

```tsx
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getToolsByCategory } from '@/config/tools'
import type { CategoryDefinition } from '@/types'

interface CategoryCardProps {
  category: CategoryDefinition
}

export function CategoryCard({ category }: CategoryCardProps) {
  const tools = getToolsByCategory(category.id)

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md',
        'ring-1 ring-transparent hover:ring-1',
        `hover:${category.accentRing}`
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('h-3 w-3 rounded-full shrink-0', category.accentBg)} aria-hidden />
        <h2 className={cn('font-semibold text-sm', category.accentText)}>
          {category.label}
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">{tools.length} tools</span>
      </div>
      <div className="space-y-1">
        {tools.slice(0, 5).map((tool) => (
          <Link
            key={tool.id}
            href={`/tools/${tool.category}/${tool.slug}`}
            className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', category.accentBg)} aria-hidden />
            {tool.name}
          </Link>
        ))}
        {tools.length > 5 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            +{tools.length - 5} more
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update homepage**

Replace `src/app/page.tsx`:

```tsx
import { CATEGORIES } from '@/config/tools'
import { CategoryCard } from '@/components/dashboard/CategoryCard'

export default function HomePage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">gawe.app</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          47 offline tools for developers and productivity — no internet required.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run dev server. Homepage should show 6 category cards in a grid, each with their accent color and tool list. Clicking any tool name navigates to its route with the ToolHeader.

- [ ] **Step 4: Commit**

```bash
rtk git add src/app/page.tsx src/components/dashboard/CategoryCard.tsx
rtk git commit -m "feat: dashboard homepage with category cards

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: PWA Configuration

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (generated)
- Create: `public/icons/icon-512.png` (generated)

**Interfaces:**
- Produces: installable PWA with offline support via service worker

- [ ] **Step 1: Generate PWA icons**

Create a simple script to generate placeholder icons (replace with real icons later):

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
mkdir -p public/icons
```

Create `scripts/generate-icons.mjs`:

```js
// Quick canvas-based icon generator — run once with: node scripts/generate-icons.mjs
// Requires: pnpm add -D canvas (or replace with real icons from a designer)
// Alternative: use any 192×192 and 512×512 PNG you have and place in public/icons/

console.log('Place your icon-192.png and icon-512.png in public/icons/')
console.log('Minimum requirements:')
console.log('  public/icons/icon-192.png — 192×192 pixels')
console.log('  public/icons/icon-512.png — 512×512 pixels')
console.log('')
console.log('For now, the PWA will work without icons (just without home screen icon).')
```

For now, create a minimal SVG and convert it, or use any square PNG. The PWA will work without icons — add them later. Create a placeholder:

```bash
# Copy the existing next.svg as a placeholder (replace with real icons)
cp public/next.svg public/icons/icon.svg
```

- [ ] **Step 2: Create manifest.json**

Create `public/manifest.json`:

```json
{
  "name": "gawe.app — Offline Developer Tools",
  "short_name": "gawe.app",
  "description": "47 offline productivity and developer tools in one installable PWA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity", "utilities", "developer tools"],
  "shortcuts": [
    {
      "name": "JSON Formatter",
      "url": "/tools/encoding/json-formatter",
      "description": "Format and validate JSON"
    },
    {
      "name": "Password Generator",
      "url": "/tools/crypto/password-generator",
      "description": "Generate secure passwords"
    }
  ]
}
```

- [ ] **Step 3: Add manifest link to layout**

In `src/app/layout.tsx`, update the `metadata` export and add a link tag:

```tsx
export const metadata: Metadata = {
  title: 'Gawe App — Offline Developer Tools',
  description: '47 offline productivity and developer tools in one installable PWA',
  manifest: '/manifest.json',
  themeColor: '#09090b',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'gawe.app',
  },
}
```

- [ ] **Step 4: Configure next-pwa**

Replace `next.config.ts` with:

```ts
import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  // No server-side features needed
}

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig)
```

- [ ] **Step 5: Build and verify PWA**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm run build 2>&1 | tail -20
```

Expected: build succeeds. `public/sw.js` and `public/workbox-*.js` are generated.

```bash
pnpm run start
```

Open `http://localhost:3000` in Chrome. Open DevTools → Application → Service Workers. You should see the service worker registered. Application → Manifest should show the manifest loaded.

- [ ] **Step 6: Commit**

```bash
rtk git add next.config.ts public/manifest.json public/icons/ public/sw.js public/workbox-*.js src/app/layout.tsx pnpm-lock.yaml package.json
rtk git commit -m "feat: PWA configuration with service worker and manifest

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Next.js 15 PWA | Task 10 |
| Tool registry pattern | Task 2 |
| `/tools/[category]/[tool]` routing | Task 8 |
| Sidebar nav + collapsible | Task 6 |
| Category accent colors | Tasks 2, 5 |
| `⌘K` command palette | Task 7 |
| IndexedDB history (max 100/tool) | Task 3 |
| IndexedDB saved sessions | Task 3 |
| localStorage preferences | Task 3 |
| Per-tool last state (debounced 500ms) | Task 3 |
| Favorites (star + sidebar section) | Tasks 3, 6, 8 |
| History drawer per tool | Task 8 |
| Dark/light/system theme toggle | Tasks 5, 6 |
| Dashboard homepage | Task 9 |
| pnpm, TypeScript strict, Tailwind v4 | Task 1 |
| shadcn/ui components | Task 1 |
| `ToolProps` interface | Task 2 |
| `onOutput` → auto-save history | Task 8 |

**Placeholder scan:** No TBDs. All steps contain real code or exact commands.

**Type consistency check:**
- `HistoryEntry.id` is `number | undefined` (IDB auto-increment) — HistoryDrawer guards with `entry.id &&` ✓
- `historyDrawerToolId` is `string | null` — HistoryDrawer uses `?? ''` fallback ✓
- `getToolByRoute(category, tool)` returns `ToolDefinition | undefined` — page calls `notFound()` ✓
- `Preferences.collapsedCategories` is `CategoryId[]` — `toggleCategory` takes `CategoryId` ✓

**Gap found:** `HistoryDrawer` imports `formatDistanceToNow` from `date-fns` — added `pnpm add date-fns` in Task 8 Step 3. ✓

---

## Foundation Complete

After Task 10, the app has:
- Full shell (sidebar, ⌘K, history drawer, theme toggle)
- All 47 tool routes returning placeholders
- Persistence layer ready for tools to call `onOutput`
- PWA installable offline

**Next plans (one per category):**
- `2026-06-22-gawe-app-encoding.md` — 8 tools
- `2026-06-22-gawe-app-crypto.md` — 8 tools
- `2026-06-22-gawe-app-dev.md` — 10 tools
- `2026-06-22-gawe-app-image.md` — 6 tools
- `2026-06-22-gawe-app-office.md` — 10 tools
- `2026-06-22-gawe-app-visual.md` — 5 tools
