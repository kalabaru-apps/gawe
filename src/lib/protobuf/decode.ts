export type WireType = 0 | 1 | 2 | 5

export interface DecodedField {
  fieldNumber: number
  wireType: WireType
  wireTypeName: 'varint' | 'fixed64' | 'bytes' | 'fixed32'
  startOffset: number
  endOffset: number
  varintValue?: bigint
  fixedBytes?: Uint8Array
  bytesValue?: Uint8Array
  subMessage?: DecodedField[]
  subMessageError?: string
  utf8Value?: string
}

export interface DecodeResult {
  fields: DecodedField[]
  error: string | null
}

const MAX_DEPTH = 32
const BIG_ZERO = BigInt(0)
const BIG_ONE = BigInt(1)
const BIG_SEVEN = BigInt(7)
const BIG_SIXTY_THREE = BigInt(63)
const BIG_SIXTY_FOUR = BigInt(64)

export function decodeProtobuf(bytes: Uint8Array): DecodeResult {
  return decodeMessage(bytes, 0, bytes.length, 0)
}

function decodeMessage(bytes: Uint8Array, start: number, end: number, depth: number): DecodeResult {
  const fields: DecodedField[] = []
  if (depth > MAX_DEPTH) {
    return { fields, error: 'Maximum nesting depth exceeded' }
  }
  let pos = start
  while (pos < end) {
    const tagStart = pos
    let tag: { value: bigint; next: number }
    try {
      tag = readVarint(bytes, pos, end)
    } catch (e) {
      return { fields, error: (e as Error).message }
    }
    const fieldNumber = Number(tag.value >> BigInt(3))
    const wireType = Number(tag.value & BIG_SEVEN) as WireType
    pos = tag.next
    if (fieldNumber === 0) {
      return { fields, error: `Invalid field number 0 at offset ${tagStart}` }
    }
    try {
      switch (wireType) {
        case 0: {
          const v = readVarint(bytes, pos, end)
          fields.push({
            fieldNumber, wireType, wireTypeName: 'varint',
            startOffset: tagStart, endOffset: v.next, varintValue: v.value,
          })
          pos = v.next
          break
        }
        case 1: {
          if (pos + 8 > end) throw new Error(`Truncated fixed64 field at offset ${pos}`)
          const fixedBytes = bytes.slice(pos, pos + 8)
          pos += 8
          fields.push({
            fieldNumber, wireType, wireTypeName: 'fixed64',
            startOffset: tagStart, endOffset: pos, fixedBytes,
          })
          break
        }
        case 2: {
          const lenVarint = readVarint(bytes, pos, end)
          if (lenVarint.value > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error(`Length-delimited field length too large at offset ${pos}`)
          }
          const len = Number(lenVarint.value)
          const dataStart = lenVarint.next
          if (dataStart + len > end) throw new Error(`Truncated length-delimited field at offset ${pos}`)
          const bytesValue = bytes.slice(dataStart, dataStart + len)
          pos = dataStart + len
          const field: DecodedField = {
            fieldNumber, wireType, wireTypeName: 'bytes',
            startOffset: tagStart, endOffset: pos, bytesValue,
          }
          if (bytesValue.length > 0) {
            const sub = decodeMessage(bytes, dataStart, dataStart + len, depth + 1)
            if (!sub.error && sub.fields.length > 0) {
              field.subMessage = sub.fields
            } else if (sub.error) {
              field.subMessageError = sub.error
            }
          }
          const utf8 = tryDecodeUtf8(bytesValue)
          if (utf8 !== null) field.utf8Value = utf8
          fields.push(field)
          break
        }
        case 5: {
          if (pos + 4 > end) throw new Error(`Truncated fixed32 field at offset ${pos}`)
          const fixedBytes = bytes.slice(pos, pos + 4)
          pos += 4
          fields.push({
            fieldNumber, wireType, wireTypeName: 'fixed32',
            startOffset: tagStart, endOffset: pos, fixedBytes,
          })
          break
        }
        default:
          throw new Error(`Unsupported wire type ${wireType} at offset ${tagStart} (groups are deprecated, not valid proto3)`)
      }
    } catch (e) {
      return { fields, error: (e as Error).message }
    }
  }
  return { fields, error: null }
}

function readVarint(bytes: Uint8Array, offset: number, end: number): { value: bigint; next: number } {
  let result = BIG_ZERO
  let shift = BIG_ZERO
  let pos = offset
  for (;;) {
    if (pos >= end) throw new Error(`Unexpected end of buffer while reading varint at offset ${offset}`)
    const byte = bytes[pos]
    result |= BigInt(byte & 0x7f) << shift
    pos++
    if ((byte & 0x80) === 0) break
    shift += BIG_SEVEN
    if (shift > BIG_SIXTY_THREE) throw new Error(`Varint exceeds 64 bits at offset ${offset}`)
  }
  return { value: result, next: pos }
}

function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (!text) return null
    const chars = [...text]
    const printable = chars.filter((c) => {
      const code = c.codePointAt(0) ?? 0
      return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d
    }).length
    return printable / chars.length >= 0.85 ? text : null
  } catch {
    return null
  }
}

export function interpretVarint(value: bigint): { uint: bigint; int64: bigint; zigzag: bigint; bool: boolean } {
  const int64 = value >= BIG_ONE << BIG_SIXTY_THREE ? value - (BIG_ONE << BIG_SIXTY_FOUR) : value
  const zigzag = (value >> BIG_ONE) ^ -(value & BIG_ONE)
  return { uint: value, int64, zigzag, bool: value !== BIG_ZERO }
}

export function interpretFixed32(bytes: Uint8Array): { uint32: number; int32: number; float32: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { uint32: view.getUint32(0, true), int32: view.getInt32(0, true), float32: view.getFloat32(0, true) }
}

export function interpretFixed64(bytes: Uint8Array): { uint64: bigint; int64: bigint; double: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { uint64: view.getBigUint64(0, true), int64: view.getBigInt64(0, true), double: view.getFloat64(0, true) }
}
