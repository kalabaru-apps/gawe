# gawe-app Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make gawe-app deployable as a Docker container from a GitHub repo, auto-deployed via Coolify on push to main.

**Architecture:** Next.js standalone output mode produces a self-contained Node.js server in `.next/standalone/`. A multi-stage Dockerfile (deps → builder → runner) produces a ~150MB Alpine image. Coolify connects to the GitHub repo and rebuilds on every push to main.

**Tech Stack:** Node 20 Alpine, pnpm, @ducanh2912/next-pwa, Docker multi-stage build, GitHub CLI

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- pnpm only (never npm or yarn)
- Build command is `next build --webpack` (Turbopack incompatible with next-pwa)
- Port: 3000
- All git commits end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use `rtk git` prefix for all git commands

---

## File Map

```
[MODIFY] next.config.ts              : add output: 'standalone'
[CREATE] Dockerfile                  : multi-stage Alpine build
[CREATE] .dockerignore               : exclude node_modules, .next, build artifacts
```

---

## Task 1: Next.js Standalone Output + Dockerfile

**Files:**
- Modify: `next.config.ts`
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Produces: Docker image that serves gawe-app on port 3000

- [ ] **Step 1: Add standalone output to next.config.ts**

Open `next.config.ts`. The current content is:

```ts
import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  turbopack: {},
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

Change it to:

```ts
import type { NextConfig } from 'next'
import withPWA from '@ducanh2912/next-pwa'

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {},
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

- [ ] **Step 2: Verify standalone build works**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm run build 2>&1 | tail -10
```

Expected: build succeeds. `.next/standalone/` directory is created containing `server.js`.

```bash
ls .next/standalone/
```

Expected: `server.js` present.

- [ ] **Step 3: Create .dockerignore**

Create `.dockerignore` at the project root:

```
node_modules
.next
.git
.superpowers
docs
*.md
!README.md
public/sw.js
public/workbox-*.js
public/swe-worker-*.js
```

- [ ] **Step 4: Create Dockerfile**

Create `Dockerfile` at the project root:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build application
FROM node:20-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build with webpack (Turbopack incompatible with next-pwa service worker generation)
RUN pnpm run build

# Stage 3: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

- [ ] **Step 5: Commit**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
rtk git add next.config.ts Dockerfile .dockerignore
rtk git commit -m "feat: Docker deployment with Next.js standalone output

Multi-stage Alpine build (~150MB). Port 3000.
next build --webpack required for next-pwa service worker generation.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Push to GitHub

**Files:**
- No file changes : git remote setup only

**Interfaces:**
- Consumes: existing local git repo with all commits
- Produces: GitHub repo accessible for Coolify to connect

- [ ] **Step 1: Check GitHub CLI is authenticated**

```bash
gh auth status
```

Expected: shows authenticated user. If not authenticated, run `gh auth login`.

- [ ] **Step 2: Create GitHub repo and push**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
gh repo create gawe-app --private --source=. --remote=origin --push
```

Expected output: repo created at `https://github.com/<your-username>/gawe-app`, all commits pushed.

If you want it under an organization (e.g. ticketpal-technologies):

```bash
gh repo create ticketpal-technologies/gawe-app --private --source=. --remote=origin --push
```

- [ ] **Step 3: Verify push**

```bash
rtk git log --oneline | head -5
gh repo view --web
```

Expected: all local commits visible on GitHub.

---

## Task 3: Coolify Setup (Manual Steps : User Action Required)

**Files:**
- None : Coolify configuration is done via Coolify UI

**Note:** These steps cannot be automated. The implementer must walk the user through them or document them for the user to complete.

- [ ] **Step 1: Add GitHub source to Coolify**

In your Coolify instance:
1. Go to **Sources** → **Add new source**
2. Select **GitHub**
3. Install the Coolify GitHub App on your account/org
4. Grant access to the `gawe-app` repository

- [ ] **Step 2: Create new application in Coolify**

1. Go to your project → **Add new resource** → **Application**
2. Select **GitHub** as source
3. Select the `gawe-app` repository
4. Select branch: `main`
5. Build pack: **Dockerfile**
6. Dockerfile location: `/Dockerfile` (root)
7. Port: `3000`

- [ ] **Step 3: Configure and deploy**

1. Set **Auto Deploy** to ON (deploys on every push to main)
2. Click **Deploy** to trigger the first build
3. Watch build logs : expect ~3-5 minutes for first Docker build
4. Once deployed, visit the assigned domain to verify the app loads

- [ ] **Step 4: Verify PWA works on deployed instance**

1. Open the Coolify-assigned URL in Chrome
2. Open DevTools → Application → Service Workers
3. Confirm service worker is registered
4. Refresh page : should load from cache (offline-first confirmed)
5. Check Application → Manifest : should show gawe.app manifest

---

## Self-Review

**Spec coverage:**
- ✅ `output: 'standalone'` added to next.config.ts
- ✅ Multi-stage Dockerfile (deps → builder → runner)
- ✅ Non-root user (`nextjs`) for security
- ✅ `.dockerignore` excludes build artifacts and dev files
- ✅ `pnpm run build` (which runs `next build --webpack`)
- ✅ Port 3000, `HOSTNAME=0.0.0.0`
- ✅ GitHub repo creation via `gh` CLI
- ✅ Coolify manual steps documented

**Placeholder scan:** Clean : all steps contain actual commands or UI instructions.

**Type consistency:** N/A : no TypeScript in this plan.
