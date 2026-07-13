# Gawe

Offline-first toolbox for developers, students, and office work — 50+ browser tools, no sign-up, no server round-trip. Everything runs client-side; your data never leaves the browser (installable as a PWA, works without a network connection once loaded).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/kalabaru-apps/gawe)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kalabaru-apps/gawe)

## Tools

### Encoding & Formatting

| Tool | Description |
| --- | --- |
| JSON Formatter | Format, validate, and explore JSON as a collapsible tree |
| Data Converter | Convert between JSON, YAML, TOML, CSV, and XML |
| Base64 | Encode and decode text, files, and images to/from Base64 |
| URL & HTML Encode | URL encode/decode and HTML entity encode/decode |
| SQL Formatter | Format and minify SQL queries with keyword highlighting and indentation |
| Schema Generator | Generate TypeScript interfaces, Zod schemas, and JSON Schema from CSV or JSON |
| CSV / Excel Merger | Merge multiple CSV files with matching columns into one download |
| Code Beautifier | Beautify and minify SQL, JavaScript, CSS, and HTML |
| Case Converter | Convert text between camelCase, snake_case, kebab-case, and more |
| Line Tools | Sort, deduplicate, reverse, and trim lines of text |
| String Tools | Slugify, escape, and unescape strings (JSON, SQL, regex) |

### Crypto & Security

| Tool | Description |
| --- | --- |
| Hash Generator | Generate MD5, SHA-1, SHA-256, SHA-512, and HMAC hashes |
| Password Generator | Generate secure passwords with entropy and strength meter |
| Bcrypt | Hash and verify passwords with bcrypt |
| AES Encrypt/Decrypt | Encrypt and decrypt text with AES |
| JWT Decoder | Decode and inspect JWT tokens: header, payload, expiry |
| UUID / ULID Generator | Generate UUIDs (v1, v4, v5) and ULIDs |
| TOTP / 2FA Generator | Generate time-based one-time passwords for 2FA (testing/dev use) |
| QR Code | Generate QR codes and read them via camera or image upload |

### Developer Utilities

| Tool | Description |
| --- | --- |
| Regex Tester | Test regular expressions with live highlighting and explanation |
| Cron Builder | Build and parse cron expressions with human-readable output |
| Timestamp Converter | Convert Unix timestamps to human dates and back |
| Number Base Converter | Convert numbers between binary, octal, decimal, and hex |
| Color Converter | Convert colors between HEX, RGB, HSL with contrast checker |
| Fake Data Generator | Generate mock names, emails, addresses, and JSON rows |
| Text Diff | Compare two text blocks or files side-by-side |
| Markdown ↔ HTML | Convert Markdown to HTML and back with live preview |
| Lorem Ipsum | Generate lorem ipsum placeholder text by words, sentences, or paragraphs |
| HTTP Reference | HTTP status codes and MIME types quick reference |
| Markdown Editor | Offline markdown editor: open, edit, and save .md files from local disk |
| cURL to Code | Convert cURL commands to JS fetch, Axios, Python, Go, and PHP code |
| API Tester | Test HTTP endpoints and webhooks locally — method, headers, body, response viewer |
| Protobuf & Hex Inspector | Decode protobuf payloads from hex/Base64/file with synced hex dump and optional .proto schema |
| KTP Mock Generator | Generate fake Indonesian KTP data with structurally valid NIKs for QA/staging |

### Image & Document

| Tool | Description |
| --- | --- |
| PDF Tools | Merge, split, reorder, rotate, and compress PDF files |
| PDF ↔ Images | Convert PDF pages to images or combine images into a PDF |
| Image Converter | Convert images between PNG, JPG, WebP, and AVIF formats |
| Image Resize | Resize, crop, and compress images in the browser |
| SVG Tools | Optimize SVGs and generate favicons from SVG or image |
| Image → Base64 | Convert images to Base64 data URIs for embedding in CSS/HTML |
| EXIF Remover | Strip EXIF metadata (GPS, camera, dates) from JPEG/PNG/HEIC before sharing |
| PDF Splitter & Merger | Select pages to extract or merge multiple PDFs into one file — fully offline |

### Office Productivity

| Tool | Description |
| --- | --- |
| Pomodoro | Pomodoro timer and stopwatch for focused work sessions |
| Timezone Converter | Convert times across timezones and view a live world clock |
| Unit Converter | Convert length, weight, temperature, and data sizes |
| Date Calculator | Calculate days between dates and add/subtract business days |
| Calculator | Scientific and percentage calculator |
| CSV Editor | View and edit CSV files as a lightweight spreadsheet |
| Word Counter | Count words, characters, sentences, and estimate reading time |
| Scratchpad | Local notes and quick to-do list, persisted in browser storage |
| Meeting Cost | Calculate the real cost of a meeting based on attendees and salaries |
| Pastebin | Local pastebin: save and retrieve text snippets by name |
| Task Tracker | Offline Kanban board: columns, cards, labels, checklists, due dates |
| Session Timer | Multi-timer stopwatch for tracking billable hours across projects |
| Text Cleaner | Fix broken text from PDFs and emails: title case, clean spacing, remove junk characters |
| Speech Timer | Estimate speaking time for scripts and presentations by word count and pace |
| Working Hours Calculator | Calculate total hours worked with break deductions and overtime |
| Income Tax Calculator (PPh 21) | Calculate Indonesian income tax, BPJS Kesehatan, and BPJS Ketenagakerjaan |
| VAT Calculator (PPN) | Calculate Indonesian VAT (PPN) on purchases, inclusive or exclusive of tax |

### Visual & Design

| Tool | Description |
| --- | --- |
| CSS Generators | Generate CSS box-shadow and gradient values with live preview |
| Whiteboard | Freeform drawing and diagramming canvas |
| Mermaid Diagrams | Render Mermaid flowcharts and diagrams from text |
| Image Annotator | Annotate and mark up screenshots and images |
| Color Palette | Color wheel, palette generator, and harmony explorer |

### Education & Study

| Tool | Description |
| --- | --- |
| Quadratic Solver | Solve ax² + bx + c = 0 with step-by-step working |
| Matrix Calculator | Add, multiply, determinant, inverse, and transpose matrices |
| Scientific Calculator | Full scientific calculator with trig, log, and constants |
| Statistics Calculator | Mean, median, mode, variance, standard deviation and more |
| Molar Mass Calculator | Calculate molar mass from a chemical formula like H₂SO₄ |
| Physics Formula Solver | Solve physics formulas for GLBB, momentum, Ohm's law, and more |
| Citation Generator | Generate APA, MLA, Chicago citations for books, articles, websites |
| GPA Calculator | Calculate GPA / IPK using the Indonesian SKS credit system |

The tool list lives in [`src/config/tools.ts`](./src/config/tools.ts) — that file is the source of truth if this table drifts.

## Tech stack

Next.js 16 (App Router, standalone output) · React 19 · TypeScript · Tailwind CSS 4 · Zustand · IndexedDB (`idb`) for local history/persistence · PWA via `@ducanh2912/next-pwa`.

## Getting started

Requirements: Node 20+, [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm build   # production build
pnpm start   # run the production build
pnpm lint    # eslint
```

## Docker

A multi-stage `Dockerfile` (standalone Next.js output) is included:

```bash
docker build -t gawe-app .
docker run -p 3000:3000 gawe-app
```

## Deploy to Railway

Click the button above, or manually:

1. Push/fork this repo to your own GitHub account.
2. On [Railway](https://railway.app), create a new project → **Deploy from GitHub repo**.
3. Railway detects the `Dockerfile` automatically — no build config needed.
4. No environment variables are required to run. Optionally set `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (and `NEXT_PUBLIC_UMAMI_URL` if self-hosting) to enable Umami analytics — see [`.env.example`](./.env.example).

## Deploy to Vercel

Click the button above, or manually:

1. Push/fork this repo to your own GitHub account.
2. On [Vercel](https://vercel.com/new), import the repo — it's auto-detected as Next.js, no config needed (the `Dockerfile` is ignored; Vercel uses its own build pipeline).
3. No environment variables are required. Optionally set `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (and `NEXT_PUBLIC_UMAMI_URL` if self-hosting) for Umami analytics — see [`.env.example`](./.env.example).

Note: the PWA service worker (`@ducanh2912/next-pwa`) and `sharp`-based image tools both work fine on Vercel's serverless runtime — no changes needed from the Railway/Docker setup.

## Contributing

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the dev setup, project conventions, and how to add a new tool.

## License

MIT — see [LICENSE](./LICENSE).

## Third-party notices

The whiteboard tool uses [tldraw](https://tldraw.dev), which ships under its own license (free tier requires a "Made with tldraw" watermark; a paid business license removes it). This is separate from this repo's MIT license and only applies to that dependency.

## AI-assisted development

Parts of this codebase were written with AI coding assistants (Claude). All AI-generated code is human-reviewed before merge; contributions using AI tools are welcome under the same review standard — see [CONTRIBUTING.md](./CONTRIBUTING.md#ai-assisted-contributions).
