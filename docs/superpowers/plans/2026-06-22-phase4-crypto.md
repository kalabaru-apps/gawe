# Phase 4: Crypto & Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 8 Crypto & Security tools as real React components replacing ToolPlaceholder stubs.

**Architecture:** Each tool is a `'use client'` React component exporting a default function implementing `ToolProps`. Tools use shared components (`ToolPanel`, `CopyButton`, `CodeEditor`, `ErrorAlert`). The `crypto` category entry is added to `toolMap` in `ToolPageClient.tsx` in Task 1. Heavy crypto operations (bcrypt) run asynchronously.

**Tech Stack:** Next.js 16, React 19, TypeScript, crypto-js, bcryptjs, jose, uuid, ulid, otpauth, qrcode, jsqr, Tailwind v4

## Global Constraints

- Working directory: `D:\Kalabaru\source-codes\gawe-app`
- pnpm only (never npm or yarn)
- All tool components: `'use client'` directive at top
- All tool components: `export default function ComponentName({ onOutput, initialState }: ToolProps)`
- ToolProps: `{ onOutput: (inputs, outputs) => void; initialState?: Record<string, unknown> }`
- UI: use `ToolPanel` (left/right), `CopyButton`, `CodeEditor`, `ErrorAlert` from `@/components/tools/shared/`
- Tailwind v4: complete literal class strings only — no dynamic assembly
- Git commits end with: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use `rtk git` prefix for all git commands
- Reference Phase 2/3 tools for established patterns

---

## File Map

```
[MODIFY] src/app/tools/[category]/[tool]/ToolPageClient.tsx  — add crypto entries to toolMap
[CREATE] src/components/tools/crypto/HashGenerator.tsx
[CREATE] src/components/tools/crypto/PasswordGenerator.tsx
[CREATE] src/components/tools/crypto/Bcrypt.tsx
[CREATE] src/components/tools/crypto/AesEncrypt.tsx
[CREATE] src/components/tools/crypto/JwtDecoder.tsx
[CREATE] src/components/tools/crypto/UuidUlid.tsx
[CREATE] src/components/tools/crypto/Totp.tsx
[CREATE] src/components/tools/crypto/QrCode.tsx
```

---

## Task 1: Install Phase 4 Dependencies + Update ToolPageClient

**Files:**
- Modify: `src/app/tools/[category]/[tool]/ToolPageClient.tsx`

- [ ] **Step 1: Install dependencies**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
pnpm add crypto-js bcryptjs jose uuid ulid otpauth qrcode jsqr
pnpm add -D @types/crypto-js @types/bcryptjs @types/qrcode @types/uuid
```

- [ ] **Step 2: Add crypto entry to toolMap in ToolPageClient.tsx**

After the `dev` block (or `encoding` block if Phase 3 not yet merged), add:

```ts
  crypto: {
    'hash-generator': () => import('@/components/tools/crypto/HashGenerator'),
    'password-generator': () => import('@/components/tools/crypto/PasswordGenerator'),
    'bcrypt': () => import('@/components/tools/crypto/Bcrypt'),
    'aes-encrypt': () => import('@/components/tools/crypto/AesEncrypt'),
    'jwt-decoder': () => import('@/components/tools/crypto/JwtDecoder'),
    'uuid-ulid': () => import('@/components/tools/crypto/UuidUlid'),
    'totp': () => import('@/components/tools/crypto/Totp'),
    'qr-code': () => import('@/components/tools/crypto/QrCode'),
  },
```

- [ ] **Step 3: Commit**

```bash
rtk git add package.json pnpm-lock.yaml src/app/tools/\[category\]/\[tool\]/ToolPageClient.tsx
rtk git commit -m "chore(phase4): install crypto dependencies and register tool loaders

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Hash Generator

**Files:**
- Create: `src/components/tools/crypto/HashGenerator.tsx`

**Interfaces:**
- Consumes: `crypto-js` — `MD5`, `SHA1`, `SHA256`, `SHA512`, `HmacSHA256`
- Produces: all hash variants simultaneously

- [ ] **Step 1: Create HashGenerator.tsx**

Key logic:
- Input: text textarea + optional HMAC key input
- Live output (no button): recompute on every input change
- `import CryptoJS from 'crypto-js'`
- Hashes: `CryptoJS.MD5(input).toString()`, `CryptoJS.SHA1(input).toString()`, `CryptoJS.SHA256(input).toString()`, `CryptoJS.SHA512(input).toString()`
- HMAC: `CryptoJS.HmacSHA256(input, hmacKey).toString()`
- Show uppercase/lowercase toggle for hex output
- Each hash row has its own CopyButton

```tsx
'use client'

import { useState, useEffect } from 'react'
import CryptoJS from 'crypto-js'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'

interface HashRow {
  label: string
  value: string
}

export default function HashGenerator({ onOutput, initialState }: ToolProps) {
  const [input, setInput] = useState((initialState?.input as string) ?? '')
  const [hmacKey, setHmacKey] = useState((initialState?.hmacKey as string) ?? '')
  const [uppercase, setUppercase] = useState(false)
  const [hashes, setHashes] = useState<HashRow[]>([])

  useEffect(() => {
    if (!input) { setHashes([]); return }
    const fmt = (h: string) => uppercase ? h.toUpperCase() : h
    const rows: HashRow[] = [
      { label: 'MD5', value: fmt(CryptoJS.MD5(input).toString()) },
      { label: 'SHA-1', value: fmt(CryptoJS.SHA1(input).toString()) },
      { label: 'SHA-256', value: fmt(CryptoJS.SHA256(input).toString()) },
      { label: 'SHA-512', value: fmt(CryptoJS.SHA512(input).toString()) },
    ]
    if (hmacKey) {
      rows.push({ label: 'HMAC-SHA256', value: fmt(CryptoJS.HmacSHA256(input, hmacKey).toString()) })
      rows.push({ label: 'HMAC-SHA512', value: fmt(CryptoJS.HmacSHA512(input, hmacKey).toString()) })
    }
    setHashes(rows)
    onOutput({ input, hmacKey }, { sha256: rows.find((r) => r.label === 'SHA-256')?.value ?? '' })
  }, [input, hmacKey, uppercase])

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Input Text</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full min-h-[120px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter text to hash..."
              spellCheck={false}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">HMAC Key (optional)</label>
            <input
              value={hmacKey}
              onChange={(e) => setHmacKey(e.target.value)}
              className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="Secret key for HMAC..."
              spellCheck={false}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="rounded" />
            Uppercase output
          </label>
        </div>
      }
      right={
        <div className="space-y-2">
          {hashes.length > 0 ? (
            hashes.map((h) => (
              <div key={h.label} className="rounded-md border border-input p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">{h.label}</span>
                  <CopyButton value={h.value} />
                </div>
                <p className="font-mono text-xs break-all">{h.value}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Enter text to compute hashes</p>
          )}
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Type check**

```bash
cd "D:\Kalabaru\source-codes\gawe-app"
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/HashGenerator.tsx
rtk git commit -m "feat(crypto): hash generator — MD5/SHA-1/SHA-256/SHA-512/HMAC

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Password Generator

**Files:**
- Create: `src/components/tools/crypto/PasswordGenerator.tsx`

**Interfaces:**
- Produces: secure password with entropy calculation and strength rating

- [ ] **Step 1: Create PasswordGenerator.tsx**

Key logic:
- No external deps — use `crypto.getRandomValues()` (Web Crypto API) for security
- Charset options: uppercase (A-Z), lowercase (a-z), numbers (0-9), symbols (!@#$%^&*...)
- Length slider: 8-128, default 24
- Live: generate on every config change + "Regenerate" button
- Entropy = `log2(charsetSize^length)` = `length * log2(charsetSize)`
- Strength labels: < 40 bits = Weak, 40-80 = Fair, 80-120 = Strong, > 120 = Very Strong
- Strength bar (colored)

```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

function generatePassword(length: number, charset: string): string {
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, (n) => charset[n % charset.length]).join('')
}

function getStrength(entropy: number): { label: string; color: string; width: string } {
  if (entropy < 40) return { label: 'Weak', color: 'bg-rose-500', width: 'w-1/4' }
  if (entropy < 80) return { label: 'Fair', color: 'bg-amber-500', width: 'w-2/4' }
  if (entropy < 120) return { label: 'Strong', color: 'bg-emerald-500', width: 'w-3/4' }
  return { label: 'Very Strong', color: 'bg-emerald-400', width: 'w-full' }
}

export default function PasswordGenerator({ onOutput, initialState }: ToolProps) {
  const [length, setLength] = useState((initialState?.length as number) ?? 24)
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useNumbers, setUseNumbers] = useState(true)
  const [useSymbols, setUseSymbols] = useState(false)
  const [password, setPassword] = useState('')
  const [count, setCount] = useState(1)

  const charset = [
    useUpper ? UPPER : '',
    useLower ? LOWER : '',
    useNumbers ? NUMBERS : '',
    useSymbols ? SYMBOLS : '',
  ].join('')

  const generate = useCallback(() => {
    if (!charset) return
    const pwd = generatePassword(length, charset)
    setPassword(pwd)
    onOutput({ length, charset: charset.length }, { password: pwd })
  }, [length, charset, onOutput])

  useEffect(() => { generate() }, [length, useUpper, useLower, useNumbers, useSymbols, count])

  const entropy = charset ? length * Math.log2(charset.length) : 0
  const strength = getStrength(entropy)
  const passwords = count > 1 && charset
    ? Array.from({ length: count }, () => generatePassword(length, charset))
    : [password]

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground">Length</label>
              <span className="text-xs font-mono text-muted-foreground">{length}</span>
            </div>
            <input
              type="range" min={8} max={128} value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            {[
              { label: 'Uppercase (A-Z)', state: useUpper, set: setUseUpper },
              { label: 'Lowercase (a-z)', state: useLower, set: setUseLower },
              { label: 'Numbers (0-9)', state: useNumbers, set: setUseNumbers },
              { label: `Symbols (${SYMBOLS.slice(0, 8)}...)`, state: useSymbols, set: setUseSymbols },
            ].map(({ label, state, set }) => (
              <label key={label} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={state} onChange={(e) => set(e.target.checked)} className="rounded" />
                {label}
              </label>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Count</label>
            <input
              type="number" min={1} max={20} value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setCount((c) => c)} // trigger re-render
            className="w-full py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors"
          >
            Regenerate
          </button>
        </div>
      }
      right={
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${strength.color} text-white`}>{strength.label}</span>
                <span className="text-xs text-muted-foreground">{Math.round(entropy)} bits entropy</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
            </div>
          </div>
          <div className="space-y-2">
            {passwords.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-input p-3">
                <p className="font-mono text-sm flex-1 break-all">{p}</p>
                <CopyButton value={p} />
              </div>
            ))}
          </div>
          {!charset && <p className="text-sm text-amber-400">Select at least one character type</p>}
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/PasswordGenerator.tsx
rtk git commit -m "feat(crypto): password generator with entropy and strength meter

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Bcrypt

**Files:**
- Create: `src/components/tools/crypto/Bcrypt.tsx`

**Interfaces:**
- Consumes: `bcryptjs` — `bcrypt.hash(password, rounds)` and `bcrypt.compare(password, hash)`
- Note: bcryptjs operations are async; use `useState` + async handlers

- [ ] **Step 1: Create Bcrypt.tsx**

```tsx
'use client'

import { useState } from 'react'
import bcrypt from 'bcryptjs'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Mode = 'hash' | 'verify'

export default function Bcrypt({ onOutput, initialState }: ToolProps) {
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'hash')
  const [password, setPassword] = useState('')
  const [rounds, setRounds] = useState(12)
  const [hashInput, setHashInput] = useState('')
  const [result, setResult] = useState('')
  const [match, setMatch] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleHash() {
    if (!password) return
    setLoading(true)
    setError(null)
    try {
      const hash = await bcrypt.hash(password, rounds)
      setResult(hash)
      onOutput({ password: '[redacted]', rounds }, { hash })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!password || !hashInput) return
    setLoading(true)
    setError(null)
    try {
      const isMatch = await bcrypt.compare(password, hashInput)
      setMatch(isMatch)
      onOutput({ hashInput }, { match: isMatch })
    } catch (e) {
      setError('Invalid hash format')
      setMatch(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['hash', 'verify'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setResult(''); setMatch(null); setError(null) }}
                className={`flex-1 py-2 rounded-md text-sm border capitalize transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                {m === 'hash' ? 'Hash Password' : 'Verify Password'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="Enter password..." />
          </div>
          {mode === 'hash' ? (
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Cost Rounds</label>
                <span className="text-xs font-mono text-muted-foreground">{rounds} (~{Math.round(2 ** rounds / 1000)}ms)</span>
              </div>
              <input type="range" min={8} max={14} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="w-full" />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Bcrypt Hash</label>
              <input value={hashInput} onChange={(e) => setHashInput(e.target.value)}
                className="w-full font-mono text-xs border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="$2b$12$..." spellCheck={false} />
            </div>
          )}
          <button onClick={mode === 'hash' ? handleHash : handleVerify} disabled={loading || !password}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {loading ? 'Computing…' : mode === 'hash' ? 'Generate Hash' : 'Verify'}
          </button>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-4">
          {mode === 'hash' && result && (
            <div className="rounded-md border border-input p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Bcrypt Hash</span>
                <CopyButton value={result} />
              </div>
              <p className="font-mono text-xs break-all">{result}</p>
            </div>
          )}
          {mode === 'verify' && match !== null && (
            <div className={`rounded-md border p-6 text-center ${match ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'}`}>
              <p className={`text-2xl font-bold mb-1 ${match ? 'text-emerald-400' : 'text-rose-400'}`}>
                {match ? '✓ Match' : '✗ No Match'}
              </p>
              <p className="text-sm text-muted-foreground">
                {match ? 'The password matches the hash' : 'The password does not match the hash'}
              </p>
            </div>
          )}
          {!result && match === null && !loading && (
            <p className="text-sm text-muted-foreground">
              {mode === 'hash' ? 'Enter a password and click Generate Hash' : 'Enter a password and hash to verify'}
            </p>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Computing bcrypt hash (this takes a moment)…
            </div>
          )}
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/Bcrypt.tsx
rtk git commit -m "feat(crypto): bcrypt hash and verify

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: AES Encrypt/Decrypt

**Files:**
- Create: `src/components/tools/crypto/AesEncrypt.tsx`

**Interfaces:**
- Consumes: `crypto-js` — `CryptoJS.AES.encrypt(text, key).toString()` and `CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8)`

- [ ] **Step 1: Create AesEncrypt.tsx**

```tsx
'use client'

import { useState } from 'react'
import CryptoJS from 'crypto-js'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Mode = 'encrypt' | 'decrypt'

export default function AesEncrypt({ onOutput, initialState }: ToolProps) {
  const [mode, setMode] = useState<Mode>((initialState?.mode as Mode) ?? 'encrypt')
  const [text, setText] = useState((initialState?.text as string) ?? '')
  const [key, setKey] = useState((initialState?.key as string) ?? '')
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)

  function process() {
    if (!text || !key) return
    setError(null)
    try {
      if (mode === 'encrypt') {
        const encrypted = CryptoJS.AES.encrypt(text, key).toString()
        setResult(encrypted)
        onOutput({ mode, key: '[redacted]' }, { encrypted })
      } else {
        const bytes = CryptoJS.AES.decrypt(text, key)
        const decrypted = bytes.toString(CryptoJS.enc.Utf8)
        if (!decrypted) throw new Error('Decryption failed — wrong key or invalid ciphertext')
        setResult(decrypted)
        onOutput({ mode, key: '[redacted]' }, { decrypted })
      }
    } catch (e) {
      setError((e as Error).message)
      setResult('')
    }
  }

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['encrypt', 'decrypt'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setResult(''); setError(null) }}
                className={`flex-1 py-2 rounded-md text-sm border capitalize transition-colors ${mode === m ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                {m}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext (Base64)'}
            </label>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              className="w-full min-h-[120px] font-mono text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder={mode === 'encrypt' ? 'Enter text to encrypt...' : 'Paste ciphertext to decrypt...'} spellCheck={false} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Secret Key</label>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
              placeholder="Encryption key..." />
          </div>
          <button onClick={process} disabled={!text || !key}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}
          </button>
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-2">
          <div className="flex justify-end"><CopyButton value={result} /></div>
          <div className="min-h-[200px] font-mono text-sm border border-input rounded-md p-3 bg-muted/30 break-all whitespace-pre-wrap">
            {result || <span className="text-muted-foreground">Result will appear here</span>}
          </div>
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/AesEncrypt.tsx
rtk git commit -m "feat(crypto): AES encrypt/decrypt

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: JWT Decoder

**Files:**
- Create: `src/components/tools/crypto/JwtDecoder.tsx`

**Interfaces:**
- Consumes: `jose` — `decodeJwt(token)` for payload, manual base64 decode for header
- Produces: header, payload, expiry status (expired/valid/no exp)

- [ ] **Step 1: Create JwtDecoder.tsx**

Key logic:
- Input: JWT string textarea (paste in)
- `import { decodeJwt } from 'jose'` — decodes payload without verification
- Header: manually decode `token.split('.')[0]` → base64url decode → JSON.parse
- Payload: `decodeJwt(token)` returns the claims object
- Check expiry: if `payload.exp` exists, compare with `Date.now() / 1000`
- Display header and payload as formatted JSON in CodeEditor (readOnly)
- Show signature part truncated (first 20 chars + "...") with note "signature not verified"
- Color-code the three parts of the JWT visually

```tsx
'use client'

import { useState, useEffect } from 'react'
import { decodeJwt } from 'jose'
import type { ToolProps } from '@/types'
import { ToolPanel } from '../shared/ToolPanel'
import { CopyButton } from '../shared/CopyButton'
import { CodeEditor } from '../shared/CodeEditor'
import { ErrorAlert } from '../shared/ErrorAlert'

function decodeBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=')
  return atob(padded)
}

export default function JwtDecoder({ onOutput, initialState }: ToolProps) {
  const [token, setToken] = useState((initialState?.token as string) ?? '')
  const [header, setHeader] = useState('')
  const [payload, setPayload] = useState('')
  const [expStatus, setExpStatus] = useState<'valid' | 'expired' | 'no-exp' | null>(null)
  const [expDate, setExpDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = token.trim()
    if (!raw) { setHeader(''); setPayload(''); setExpStatus(null); setError(null); return }
    try {
      const parts = raw.split('.')
      if (parts.length !== 3) throw new Error('Not a valid JWT (expected 3 dot-separated parts)')
      const headerObj = JSON.parse(decodeBase64Url(parts[0]))
      const claims = decodeJwt(raw)
      setHeader(JSON.stringify(headerObj, null, 2))
      setPayload(JSON.stringify(claims, null, 2))
      if (claims.exp) {
        const exp = claims.exp as number
        const expired = Date.now() / 1000 > exp
        setExpStatus(expired ? 'expired' : 'valid')
        setExpDate(new Date(exp * 1000).toLocaleString())
      } else {
        setExpStatus('no-exp')
        setExpDate(null)
      }
      setError(null)
      onOutput({ token: '[redacted]' }, { alg: headerObj.alg, expired: expStatus === 'expired' })
    } catch (e) {
      setError((e as Error).message)
      setHeader('')
      setPayload('')
      setExpStatus(null)
    }
  }, [token])

  const parts = token.trim().split('.')

  return (
    <ToolPanel
      left={
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">JWT Token</label>
            <textarea value={token} onChange={(e) => setToken(e.target.value)}
              className="w-full min-h-[120px] font-mono text-xs border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
              placeholder="Paste your JWT here..." spellCheck={false} />
          </div>
          {token.trim() && parts.length === 3 && (
            <div className="font-mono text-xs p-3 rounded-md border border-input bg-muted/30 break-all leading-relaxed">
              <span className="text-rose-400">{parts[0]}</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-emerald-400">{parts[1]}</span>
              <span className="text-muted-foreground">.</span>
              <span className="text-sky-400">{parts[2].slice(0, 20)}…</span>
            </div>
          )}
          {expStatus && (
            <div className={`rounded-md border p-3 ${expStatus === 'expired' ? 'border-rose-500 bg-rose-500/10' : expStatus === 'valid' ? 'border-emerald-500 bg-emerald-500/10' : 'border-muted bg-muted/30'}`}>
              <p className={`text-sm font-medium ${expStatus === 'expired' ? 'text-rose-400' : expStatus === 'valid' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {expStatus === 'expired' ? '✗ Expired' : expStatus === 'valid' ? '✓ Valid' : 'No Expiry'}
              </p>
              {expDate && <p className="text-xs text-muted-foreground mt-0.5">Expires: {expDate}</p>}
            </div>
          )}
          {error && <ErrorAlert message={error} />}
        </div>
      }
      right={
        <div className="space-y-4">
          {header && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-rose-400">Header</span>
                <CopyButton value={header} />
              </div>
              <CodeEditor value={header} language="json" readOnly />
            </div>
          )}
          {payload && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-emerald-400">Payload</span>
                <CopyButton value={payload} />
              </div>
              <CodeEditor value={payload} language="json" readOnly />
            </div>
          )}
          {!header && !error && (
            <p className="text-sm text-muted-foreground">Paste a JWT to decode its header and payload</p>
          )}
          <p className="text-xs text-muted-foreground">Signature is not verified — this tool only decodes.</p>
        </div>
      }
    />
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/JwtDecoder.tsx
rtk git commit -m "feat(crypto): JWT decoder — header, payload, expiry status

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: UUID / ULID Generator

**Files:**
- Create: `src/components/tools/crypto/UuidUlid.tsx`

**Interfaces:**
- Consumes: `uuid` — `v1()`, `v4()`, `v5(name, namespace)`, `NIL`, `validate(str)`, `version(str)`; `ulid` — `ulid()`

- [ ] **Step 1: Create UuidUlid.tsx**

```tsx
'use client'

import { useState } from 'react'
import { v1, v4, v5, NIL, validate, version } from 'uuid'
import { ulid } from 'ulid'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type UuidVersion = 'v1' | 'v4' | 'v5' | 'ulid'

const DNS_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const URL_NS = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

export default function UuidUlid({ onOutput, initialState }: ToolProps) {
  const [uuidVersion, setUuidVersion] = useState<UuidVersion>((initialState?.uuidVersion as UuidVersion) ?? 'v4')
  const [count, setCount] = useState<number>((initialState?.count as number) ?? 5)
  const [v5Name, setV5Name] = useState((initialState?.v5Name as string) ?? 'example.com')
  const [v5Ns, setV5Ns] = useState<'dns' | 'url'>('dns')
  const [generated, setGenerated] = useState<string[]>([])
  const [validateInput, setValidateInput] = useState('')
  const [validateResult, setValidateResult] = useState<{ valid: boolean; version?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function generate() {
    setError(null)
    try {
      const ids = Array.from({ length: count }, () => {
        switch (uuidVersion) {
          case 'v1': return v1()
          case 'v4': return v4()
          case 'v5': return v5(v5Name, v5Ns === 'dns' ? DNS_NS : URL_NS)
          case 'ulid': return ulid()
        }
      })
      setGenerated(ids)
      onOutput({ type: uuidVersion, count }, { ids })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function checkValidate() {
    const raw = validateInput.trim()
    if (!raw) return
    const isValid = validate(raw)
    setValidateResult({ valid: isValid, version: isValid ? version(raw) : undefined })
  }

  const TYPE_OPTIONS: { value: UuidVersion; label: string; desc: string }[] = [
    { value: 'v1', label: 'UUID v1', desc: 'Time-based' },
    { value: 'v4', label: 'UUID v4', desc: 'Random' },
    { value: 'v5', label: 'UUID v5', desc: 'Name-based (SHA-1)' },
    { value: 'ulid', label: 'ULID', desc: 'Sortable' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {TYPE_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setUuidVersion(o.value)}
                className={`rounded-md border p-2.5 text-left transition-colors ${uuidVersion === o.value ? 'bg-primary/10 border-primary' : 'border-input hover:bg-muted/50'}`}>
                <div className="text-sm font-medium">{o.label}</div>
                <div className="text-xs text-muted-foreground">{o.desc}</div>
              </button>
            ))}
          </div>
          {uuidVersion === 'v5' && (
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <input value={v5Name} onChange={(e) => setV5Name(e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div className="flex gap-2">
                {(['dns', 'url'] as const).map((ns) => (
                  <button key={ns} onClick={() => setV5Ns(ns)}
                    className={`flex-1 py-1.5 rounded text-xs border uppercase transition-colors ${v5Ns === ns ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-muted/50'}`}>
                    {ns} namespace
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Count (1-50)</label>
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value))))}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <button onClick={generate}
            className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Generate
          </button>
          {error && <ErrorAlert message={error} />}
          <div className="border-t border-border pt-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Validate UUID</label>
            <div className="flex gap-2">
              <input value={validateInput} onChange={(e) => setValidateInput(e.target.value)}
                className="flex-1 font-mono text-xs border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring"
                placeholder="Paste UUID to validate..." spellCheck={false} />
              <button onClick={checkValidate} className="px-3 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">
                Check
              </button>
            </div>
            {validateResult && (
              <p className={`text-xs mt-1 ${validateResult.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                {validateResult.valid ? `✓ Valid UUID v${validateResult.version}` : '✗ Invalid UUID'}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">{generated.length} generated</span>
            <CopyButton value={generated.join('\n')} />
          </div>
          <div className="space-y-1 font-mono text-sm">
            {generated.length > 0 ? (
              generated.map((id, i) => (
                <div key={i} className="flex items-center gap-2 rounded border border-input px-3 py-2 hover:bg-muted/30">
                  <span className="flex-1 text-xs break-all">{id}</span>
                  <CopyButton value={id} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Click Generate to produce IDs</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/UuidUlid.tsx
rtk git commit -m "feat(crypto): UUID v1/v4/v5 and ULID generator with validation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: TOTP Generator

**Files:**
- Create: `src/components/tools/crypto/Totp.tsx`

**Interfaces:**
- Consumes: `otpauth` — `TOTP` class
- Produces: live 6-digit code with countdown, refreshes every second

- [ ] **Step 1: Create Totp.tsx**

Key logic:
- `import * as OTPAuth from 'otpauth'`
- `const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 })`
- `totp.generate()` returns current code
- `Math.floor(Date.now() / 1000) % 30` gives seconds elapsed in current period
- `30 - (Math.floor(Date.now() / 1000) % 30)` gives seconds remaining
- `setInterval` every 1s to update code and countdown
- Clear interval on unmount
- Show circular progress (or simple bar)
- Default secret for demo: `JBSWY3DPEHPK3PXP` (well-known test secret)

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import * as OTPAuth from 'otpauth'
import type { ToolProps } from '@/types'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

export default function Totp({ onOutput, initialState }: ToolProps) {
  const [secret, setSecret] = useState((initialState?.secret as string) ?? 'JBSWY3DPEHPK3PXP')
  const [code, setCode] = useState('')
  const [remaining, setRemaining] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  function updateCode(sec: string) {
    try {
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(sec.replace(/\s/g, '').toUpperCase()),
        digits: 6,
        period: 30,
        algorithm: 'SHA1',
      })
      const current = totp.generate()
      const secs = 30 - (Math.floor(Date.now() / 1000) % 30)
      setCode(current)
      setRemaining(secs)
      setError(null)
      onOutput({ secret: '[redacted]' }, { code: current })
    } catch {
      setCode('')
      setError('Invalid Base32 secret. Example: JBSWY3DPEHPK3PXP')
    }
  }

  useEffect(() => {
    updateCode(secret)
    intervalRef.current = setInterval(() => updateCode(secret), 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [secret])

  const progress = ((30 - remaining) / 30) * 100
  const urgentColor = remaining <= 5 ? 'text-rose-400' : remaining <= 10 ? 'text-amber-400' : 'text-foreground'

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Base32 Secret</label>
        <input value={secret} onChange={(e) => setSecret(e.target.value)}
          className="w-full font-mono text-sm border border-input rounded-md px-3 py-2 bg-background outline-none focus:ring-1 focus:ring-ring uppercase"
          placeholder="JBSWY3DPEHPK3PXP" spellCheck={false} />
        <p className="text-xs text-muted-foreground mt-1">The Base32 secret from your 2FA setup (from authenticator app or QR code)</p>
      </div>
      {error && <ErrorAlert message={error} />}
      {code && (
        <div className="rounded-xl border border-input bg-muted/30 p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className={`font-mono text-5xl font-bold tracking-widest tabular-nums ${urgentColor}`}>
              {code.slice(0, 3)} {code.slice(3)}
            </span>
            <CopyButton value={code} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Refreshes in</span>
              <span className={`font-mono font-medium ${urgentColor}`}>{remaining}s</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${remaining <= 5 ? 'bg-rose-500' : remaining <= 10 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${100 - progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/Totp.tsx
rtk git commit -m "feat(crypto): TOTP/2FA generator with live countdown

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: QR Code Generator / Reader

**Files:**
- Create: `src/components/tools/crypto/QrCode.tsx`

**Interfaces:**
- Consumes: `qrcode` — `QRCode.toCanvas(canvas, text, options)` for generation; `jsqr` — `jsQR(imageData, width, height)` for reading from uploaded image

- [ ] **Step 1: Create QrCode.tsx**

Key logic:
- Tab 1 (Generate): text/URL input → QR on canvas element → download button
- Tab 2 (Read): FileDropzone → read as ImageData via offscreen canvas → jsQR to decode
- `import QRCode from 'qrcode'`
- `import jsQR from 'jsqr'`
- Generation: `QRCode.toCanvas(canvasRef.current, input, { width: 256, margin: 2, color: { dark: '#000000', light: '#ffffff' } })`
- Reading: create Image → drawImage on canvas → getImageData → jsQR

```tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import type { ToolProps } from '@/types'
import { FileDropzone } from '../shared/FileDropzone'
import { CopyButton } from '../shared/CopyButton'
import { ErrorAlert } from '../shared/ErrorAlert'

type Tab = 'generate' | 'read'

export default function QrCode({ onOutput, initialState }: ToolProps) {
  const [tab, setTab] = useState<Tab>('generate')
  const [input, setInput] = useState((initialState?.input as string) ?? 'https://example.com')
  const [decoded, setDecoded] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (tab !== 'generate' || !input.trim() || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, input.trim(), {
      width: 256, margin: 2,
      color: { dark: '#000000ff', light: '#ffffffff' },
    }).catch(() => {})
  }, [input, tab])

  function downloadQr() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = 'qrcode.png'
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  const handleFile = useCallback((file: File) => {
    setReadError(null)
    setDecoded('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height)
        if (result) {
          setDecoded(result.data)
          onOutput({ action: 'read' }, { decoded: result.data })
        } else {
          setReadError('No QR code found in image')
        }
      }
      img.onerror = () => setReadError('Failed to load image')
      img.src = e.target?.result as string
    }
    reader.onerror = () => setReadError('Failed to read file')
    reader.readAsDataURL(file)
  }, [onOutput])

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border border-input rounded-md p-0.5 w-fit">
        {(['generate', 'read'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); setDecoded(''); setReadError(null) }}
            className={`px-4 py-1.5 rounded text-sm capitalize transition-colors ${tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}>
            {t === 'generate' ? 'Generate QR' : 'Read QR'}
          </button>
        ))}
      </div>
      {tab === 'generate' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Text or URL</label>
              <textarea value={input} onChange={(e) => { setInput(e.target.value); onOutput({ text: e.target.value }, {}) }}
                className="w-full min-h-[100px] text-sm border border-input rounded-md p-3 bg-background resize-y outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://example.com" spellCheck={false} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            <canvas ref={canvasRef} className="rounded-lg border border-input" style={{ imageRendering: 'pixelated' }} />
            <button onClick={downloadQr}
              className="px-4 py-2 rounded-md border border-input text-sm hover:bg-muted/50 transition-colors">
              Download PNG
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <FileDropzone accept="image/*" onFile={handleFile} label="Drop an image containing a QR code" />
          {readError && <ErrorAlert message={readError} />}
          {decoded && (
            <div className="rounded-md border border-input p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-400">✓ QR Code Decoded</span>
                <CopyButton value={decoded} />
              </div>
              <p className="font-mono text-sm break-all">{decoded}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
rtk tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
rtk git add src/components/tools/crypto/QrCode.tsx
rtk git commit -m "feat(crypto): QR code generator and image reader

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ hash-generator: MD5/SHA-1/SHA-256/SHA-512/HMAC-SHA256/HMAC-SHA512, uppercase toggle
- ✅ password-generator: Web Crypto API, entropy bits, strength bar, multiple passwords, charset options
- ✅ bcrypt: async hash + async verify, cost rounds slider, loading state
- ✅ aes-encrypt: CryptoJS AES encrypt/decrypt, key hidden, error on bad key/cipher
- ✅ jwt-decoder: header + payload decoded, expiry status, color-coded token parts
- ✅ uuid-ulid: v1/v4/v5/ULID, count, v5 namespace, validate tool
- ✅ totp: live countdown, 1s interval, cleanup on unmount, urgency colors
- ✅ qr-code: generate tab (canvas + download) + read tab (jsQR from image)
- ✅ All 8 tools follow ToolProps interface with 'use client'

**Placeholder scan:** Clean.

**Type consistency:** All components use ToolProps. bcrypt uses async handlers. TOTP uses setInterval with cleanup.
