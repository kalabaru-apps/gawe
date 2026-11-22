# Gawe Design Specification

**Design Read**: Reading this as: multi-domain browser toolset for developers, office workers, students and designers, in a per-domain native-tool style, dial ENERGY 1 / RHYTHM 3 / MOTION 1. RHYTHM is 3 on purpose: domains must look different from each other, while tools inside one domain stay uniform.

**Intent**: 71 offline tools for developers, office workers, students and designers. Each tool must feel native to its job — like kitchenware for chefs, plumbing tools for plumbers. Tools in the same domain share a family feel; tools across domains feel different on purpose.

---

## Domain ↔ Feel Mapping

| Domain | Categories | Feel | Why |
|--------|------------|------|-----|
| **Workbench** | dev, encoding, crypto | Code workbench | Developers expect mono-forward, dark-capable panes, tight density, resizable splits, keyboard-first. |
| **Paper** | office, education | Paper & ledger | Office and education tools are documents and sheets. Serif headings, ruled surfaces, "printed" results, left-aligned flow. |
| **Studio** | image, pdf | Drop-zone studio | Image/PDF tools follow the ilovepdf pattern: drop → options → result. Visual-first, minimal chrome. |
| **Stage** | visual | Full-bleed canvas | Mermaid, Color Palette, Whiteboard need the canvas to own the screen. Floating toolbars only. |
| **Instrument** | (timers, calculators, converters inside Paper) | Physical device | Pomodoro, Calculator, Timezone Clock look like instruments with tactile controls, not forms. |

---

## 1. Workbench (dev, encoding, crypto)

### Palette
- Base: neutral 950 / 900 / 50 (dark-first, light works)
- Accent: **emerald 500** (category accent for dev, reused for Workbench chrome)
- Surface: neutral 900 / 950 (dark), neutral 100 / 50 (light)
- Border: neutral 800 / 200
- Mono text: neutral 300 / 700

### Typography
- **Headings**: Public Sans, semibold
- **UI labels**: Public Sans, small, sentence case (no wide-tracked uppercase)
- **Body/Code**: IBM Plex Mono, regular
- **Why**: IBM Plex Mono has distinct 0/O, 1/l/I and a calm slab feel, which matters when reading hashes, JSON and base64 all day. It is chosen for glyph clarity, not for a terminal look. Mono is used only inside code panes and values; labels use Public Sans so the UI does not turn into a fake terminal.

### Layout Primitive: `Workbench`
- Three zones: **Toolbar** (top, 40px), **Pane Split** (resizable, horizontal or vertical), **Status Bar** (bottom, 28px).
- Default split: 50/50, user-draggable, remembered per tool.
- Toolbar holds: tool-specific controls, format selector, actions.
- Status bar: line/col, encoding, validation state.
- Keyboard shortcuts visible on hover (⌘K palette already exists).

### Components
- `Pane` (resizable, min 280px), `Toolbar`, `StatusBar`, `MonospaceField`, `CodeBlock`, `CopyButton`, `ErrorToast`.

### Density
- Compact: 8px base unit. Controls 32px high. No loose padding.

---

## 2. Paper (office, education)

### Palette
- Base: warm neutral (stone 50 / 950)
- Accent: **sky 500** (office), **teal 500** (education) — used only for active state and results
- Surface: paper white / stone 950
- Border: stone 200 / 800 (ruled lines)
- Ink: stone 900 / 100

### Typography
- **Display/Headings**: **Newsreader**, semibold, relaxed line-height
- **UI labels**: Public Sans, small, sentence case
- **Body/Results**: Public Sans, regular
- **Monospace (formulas, code)**: IBM Plex Mono
- **Why**: Newsreader is built for long reading and screen text, so it fits documents, ledgers and worked solutions. Public Sans is a neutral government-forms sans, apt for form fields and tables. The serif/sans contrast is the identity.

### Layout Primitive: `Paper`
- Single centered column, max-width 720px (A5-ish).
- Top: tool title + description (left-aligned).
- Middle: **Sheet** — the input surface, ruled or grid depending on tool.
- Bottom: **Result** — rendered output, looks printed (box-shadow like a page lift).
- No split panes. Flow is top-to-bottom.

### Components
- `Sheet` (ruled, grid, or plain), `ResultCard`, `InputRow`, `SelectField`, `NumberField`, `DateField`, `PrintButton`, `ExportButton`.

### Density
- Relaxed: 12px base unit. Line height 1.7. Generous margins.

---

## 3. Studio (image, pdf)

### Palette
- Base: neutral 50 / 900
- Accent: **rose 500** (image), **amber 500** (pdf) — used for primary action only
- Surface: neutral 100 / 800 (subtle)
- Border: neutral 200 / 700
- Drop-zone: accent 100 / 900 with dashed border

### Typography
- **Display/Headings**: **Familjen Grotesk**, bold, tight
- **UI labels**: Public Sans, small, sentence case
- **Body**: Public Sans
- **Why**: Familjen Grotesk has a slightly quirky, friendly grotesk shape that reads as a creative tool, distinct from Workbench mono and Paper serif. It avoids the Inter/Geist/Space Grotesk default roster.

### Layout Primitive: `Studio`
- Three steps, one screen: **Drop Zone** → **Options Rail** (right, 280px, collapsible) → **Result** (preview + download).
- Drop zone is the hero until a file lands.
- After upload: drop zone shrinks to thumbnail strip, options rail opens, result appears below.
- Mobile: stacked, options in a drawer.

### Components
- `DropZone`, `FileStrip`, `OptionsRail`, `PreviewPane`, `ActionBar`, `ProgressRing`.

### Density
- Medium: 8px unit. Generous drop zone. Options rail compact.

---

## 4. Stage (visual)

### Palette
- Base: neutral 950 (dark default), neutral 50 (light)
- Accent: **violet 500** (category accent) — used for selection, handles, active tool
- Surface: neutral 900 / 100 (panels)
- Border: neutral 800 / 200
- Canvas: neutral 950 / 100 (fills viewport)

### Typography
- **Display/Headings**: **Familjen Grotesk**, medium
- **UI labels**: Public Sans, small
- **Canvas text**: user-controlled
- **Why**: minimal chrome. Type only in floating panels.

### Layout Primitive: `Stage`
- Full-bleed `<canvas>` or SVG owns the viewport.
- Floating panels: **Toolbar** (top-left, icon-only), **Properties** (right, 300px, auto-hide), **Layers** (bottom, 200px, auto-hide).
- Panels are glass (backdrop-blur) over the canvas.
- Keyboard shortcuts: `V` select, `H` hand, `Z` zoom, `1-9` tools.
- Mobile: bottom sheet for properties, toolbar collapses to hamburger.

### Components
- `Canvas`, `FloatingPanel`, `Toolbar`, `PropertyPanel`, `LayerPanel`, `ColorSwatch`, `Handle`.

### Density
- Zero on canvas. Panels: 12px unit.

---

## 5. Instrument (Pomodoro, Calculator, Timezone Clock, Unit Converter, etc.)

### Palette
- Inherits Paper palette (warm neutral, sky/teal accent).
- Accent used for **active** state only (running timer, selected operator).

### Typography
- **Display**: **Familjen Grotesk**, bold, tabular-nums, large (96px for timer, 48px for calculator)
- **Labels**: Public Sans, small
- **Buttons**: Public Sans, medium
- **Why**: big numbers are the UI. Familjen Grotesk tabular-nums prevents jumping.

### Layout Primitive: `Instrument`
- Single centered card, max-width 400px.
- Large display at top.
- Tactile button grid below (calculator) or radial control (timer).
- No split panes, no toolbar. Feels like a physical device.

### Components
- `Display`, `ButtonGrid`, `RadialTimer`, `ModeSwitch`, `PresetChips`.

### Density
- Relaxed on the card. Buttons 48px min (tap target).

---

## Cross-Cutting Rules

1. **No emoji in UI** — replace all with Lucide icons or inline SVG.
2. **Category colors only as accents** — the 6px dot in ToolHeader and Sidebar stays; the rest of the tool uses domain tokens.
3. **Shared primitives** — `Button`, `Input`, `Select`, `Dialog`, `Tooltip`, `Tabs`, `Tooltip`, `Separator`, `ScrollArea` stay from shadcn. New primitives per domain above.
4. **Dark mode works in every domain** — tokens defined for both themes.
5. **Mobile-first** — each primitive has a mobile variant (stacked, drawers, bottom sheets).
6. **One font per role per domain** — no mixing.
7. **Reduce motion respected** — all animations off when `prefers-reduced-motion`.
8. **Keyboard accessible** — every control reachable and operable.

---

## Font Loading (next/font)

```ts
// Workbench
const jetBrainsMono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

// Paper headings
const cormorant = Newsreader({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-serif', display: 'swap' });

// Paper UI
const dmSans = Public_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

// Studio / Stage headings
const spaceGrotesk = Familjen_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display', display: 'swap' });
```

CSS variables map to Tailwind via `@theme` in `globals.css`.

---

## Token Structure (CSS custom properties)

```css
:root {
  /* Workbench */
  --wb-surface: #030712;
  --wb-border: #1f2937;
  --wb-ink: #d1d5db;
  --wb-accent: #10b981;
  --wb-mono: var(--font-mono);

  /* Paper */
  --pp-surface: #fafaf9;
  --pp-border: #e7e5e4;
  --pp-ink: #1c1917;
  --pp-accent-office: #0ea5e9;
  --pp-accent-education: #14b8a6;
  --pp-serif: var(--font-serif);
  --pp-sans: var(--font-sans);

  /* Studio */
  --st-surface: #f5f5f5;
  --st-border: #e5e5e5;
  --st-ink: #171717;
  --st-accent-image: #f43f5e;
  --st-accent-pdf: #f59e0b;
  --st-display: var(--font-display);
  --st-sans: var(--font-sans);

  /* Stage */
  --sg-canvas: #030712;
  --sg-panel: #09090b;
  --sg-border: #27272a;
  --sg-accent: #a855f7;
  --sg-display: var(--font-display);
  --sg-sans: var(--font-sans);

  /* Instrument (inherits Paper tokens) */
}
.dark {
  /* inverted values */
}
```

---

## Rollout Order

1. **Tokens + fonts + globals.css** — one commit.
2. **Shell & Home** — new sidebar, command palette, home page with recents/favorites/search-first.
3. **Primitives** — `Workbench`, `Paper`, `Studio`, `Stage`, `Instrument` layout components.
4. **Flagships** (one per domain):
   - Workbench: **JSON Formatter**
   - Paper: **Markdown Editor**
   - Studio: **PDF Tools**
   - Stage: **Mermaid Diagram**
   - Instrument: **Pomodoro**
5. **Sweep** — migrate remaining 66 tools onto primitives.
6. **Polish** — mobile, reduce-motion, keyboard audit, contrast audit.

---

## Acceptance Per Flagship

- Runs without console errors.
- Mobile layout works at 375px.
- Dark and light themes both pass WCAG AA.
- Keyboard: Tab through every control, Escape closes dialogs, shortcuts work.
- Domain feel is distinct: open JSON Formatter and Markdown Editor side by side — they should not feel like the same app.