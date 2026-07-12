import type { Root, NamespaceBase, ReflectionObject } from 'protobufjs'

export interface SchemaDecodeResult {
  typeName: string
  messageTypes: string[]
  value: Record<string, unknown>
}

export async function decodeWithSchema(
  bytes: Uint8Array,
  protoSource: string,
  preferredTypeName?: string
): Promise<SchemaDecodeResult> {
  const protobuf = await import('protobufjs')
  const parsed = protobuf.parse(protoSource, { keepCase: true })
  const root = parsed.root
  const messageTypes = collectMessageTypeNames(root)
  if (messageTypes.length === 0) {
    throw new Error('No message types found in the .proto schema')
  }
  const typeName = preferredTypeName && messageTypes.includes(preferredTypeName)
    ? preferredTypeName
    : messageTypes[0]
  const MessageType = root.lookupType(typeName)
  const message = MessageType.decode(bytes)
  const value = MessageType.toObject(message, { longs: String, enums: String, bytes: String, defaults: false }) as Record<string, unknown>
  return { typeName, messageTypes, value }
}

function collectMessageTypeNames(root: Root): string[] {
  const names: string[] = []
  function walk(ns: NamespaceBase, prefix: string) {
    for (const item of ns.nestedArray) {
      const fq = prefix ? `${prefix}.${item.name}` : item.name
      if (isType(item)) names.push(fq)
      if (isNamespace(item)) walk(item, fq)
    }
  }
  walk(root, '')
  return names
}

function isType(obj: ReflectionObject): obj is ReflectionObject & { fieldsArray: unknown[] } {
  return 'fieldsArray' in obj
}

function isNamespace(obj: ReflectionObject): obj is NamespaceBase {
  return 'nestedArray' in obj
}
