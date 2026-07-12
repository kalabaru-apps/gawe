export type InputFormat = 'hex' | 'base64' | 'unknown'

export function detectInputFormat(raw: string): InputFormat {
  const stripped = raw.trim().replace(/\s+/g, '')
  if (!stripped) return 'unknown'
  if (/^[0-9a-fA-F]+$/.test(stripped) && stripped.length % 2 === 0) return 'hex'
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(stripped) && stripped.length % 4 === 0) return 'base64'
  return 'unknown'
}

export function hexToBytes(hex: string): Uint8Array {
  const stripped = hex.trim().replace(/\s+/g, '').replace(/^0x/i, '')
  if (stripped.length === 0) return new Uint8Array(0)
  if (!/^[0-9a-fA-F]+$/.test(stripped)) throw new Error('Invalid hex string: contains non-hex characters')
  if (stripped.length % 2 !== 0) throw new Error('Invalid hex string: odd number of hex digits')
  const bytes = new Uint8Array(stripped.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(stripped.substr(i * 2, 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array, spaced = false): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
  return spaced ? hex.join(' ') : hex.join('')
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64.trim())
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function parseBytesInput(raw: string): Uint8Array {
  const format = detectInputFormat(raw)
  if (format === 'hex') return hexToBytes(raw)
  if (format === 'base64') return base64ToBytes(raw)
  throw new Error('Input does not look like valid hex or Base64')
}

export interface HexDumpByte {
  value: number
  index: number
}

export interface HexDumpRow {
  offset: number
  bytes: HexDumpByte[]
}

export function formatHexDump(bytes: Uint8Array, bytesPerRow = 16): HexDumpRow[] {
  const rows: HexDumpRow[] = []
  for (let start = 0; start < bytes.length; start += bytesPerRow) {
    const rowBytes: HexDumpByte[] = []
    for (let i = start; i < Math.min(start + bytesPerRow, bytes.length); i++) {
      rowBytes.push({ value: bytes[i], index: i })
    }
    rows.push({ offset: start, bytes: rowBytes })
  }
  return rows
}

export function byteToAscii(value: number): string {
  return value >= 0x20 && value < 0x7f ? String.fromCharCode(value) : '.'
}
