# Contributing to Gawe

## Setup

```bash
git clone https://github.com/<you>/gawe.git
cd gawe
pnpm install
pnpm dev
```

Requirements: Node 20+, pnpm. No environment variables or external services are required for local dev.

## Fork & PR workflow

1. Fork the repo, branch off `main` (`feat/<short-name>`, `fix/<short-name>`).
2. Make your change. Keep PRs focused — one tool or one fix per PR is easier to review than a bundle.
3. Run before opening a PR:
   ```bash
   pnpm lint
   pnpm build
   ```
4. Open a PR against `main` with a short description of what changed and why.

## Commit messages

This repo follows a lightweight conventional-commit style: `type: description`, e.g.

```
feat: add cURL to Code tool
fix: correct reverse-solve algorithm for TER bracket cliffs
update: gitignore
remove: unused docs
```

Common types: `feat`, `fix`, `update`, `remove`, `docs`.

## Project structure

```
src/
  app/tools/[category]/[tool]/   # dynamic tool route + shell
  components/tools/<category>/   # one component per tool
  config/tools.ts                # tool + category registry (source of truth)
  types/index.ts                 # ToolDefinition, ToolProps, etc.
```

Categories are fixed: `encoding`, `crypto`, `dev`, `image`, `office`, `visual`, `education`.

## Adding a new tool

A tool needs three pieces wired together:

1. **Metadata** — add an entry to `TOOLS` in [`src/config/tools.ts`](./src/config/tools.ts):
   ```ts
   {
     id: 'my-tool',
     name: 'My Tool',
     category: 'dev',
     description: 'One line, what it does',
     icon: 'IconName',   // must exist in lucide-react
     slug: 'my-tool',    // becomes /tools/dev/my-tool
     keywords: ['search', 'terms'],
   }
   ```
2. **Component** — create `src/components/tools/<category>/MyTool.tsx` implementing `ToolProps` from `src/types/index.ts` (`onOutput` callback + optional `initialState` for restored sessions). Look at an existing tool in the same category for the shell conventions (history, local persistence, layout).
3. **Route registration** — add a lazy import to the `toolMap` in [`src/app/tools/[category]/[tool]/ToolPageClient.tsx`](./src/app/tools/[category]/[tool]/ToolPageClient.tsx):
   ```ts
   'my-tool': () => import('@/components/tools/dev/MyTool'),
   ```

All processing should stay client-side — the app is offline-first, don't add a required server round-trip for a tool to function.

## Code style

ESLint (`eslint-config-next`) is the source of truth — run `pnpm lint` before pushing. No separate Prettier config is enforced beyond what ESLint checks.

## AI-assisted contributions

AI-assisted code (Claude, Copilot, etc.) is welcome. You're expected to:
- Understand and be able to explain the change you're submitting.
- Test it yourself before opening the PR — don't submit unreviewed generated output.
- Mention in the PR description if it's substantially AI-generated, same as you'd note any other context useful for review.

## Reporting bugs / requesting tools

Open a GitHub issue. For bugs: steps to reproduce, expected vs actual. For new tool ideas: what it does and why it fits an existing category (or needs a new one).
