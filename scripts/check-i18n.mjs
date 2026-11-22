import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const enSource = readFileSync(new URL('../src/lib/i18n/en.ts', import.meta.url), 'utf8')
const idSource = readFileSync(new URL('../src/lib/i18n/id.ts', import.meta.url), 'utf8')
const toolSource = readFileSync(new URL('../src/config/tools.ts', import.meta.url), 'utf8')

const keys = (source) => new Set([...source.matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]))
const enKeys = keys(enSource)
const idKeys = keys(idSource)
const missing = [...enKeys].filter((key) => !idKeys.has(key))
const extra = [...idKeys].filter((key) => !enKeys.has(key))
assert.deepEqual(missing, [], `Missing Indonesian translation keys: ${missing.join(', ')}`)
assert.deepEqual(extra, [], `Indonesian keys without English source: ${extra.join(', ')}`)

const categoryIds = [...toolSource.matchAll(/^\s*id: '([^']+)',\s*\n\s*label:/gm)].map((match) => match[1])
const toolIds = [...toolSource.matchAll(/^\s*id: '([^']+)',\s*\n\s*name:/gm)].map((match) => match[1])
for (const id of categoryIds) {
  assert.ok(enKeys.has(`category.${id}.name`), `Missing English category name key: ${id}`)
  assert.ok(idKeys.has(`category.${id}.name`), `Missing Indonesian category name key: ${id}`)
  assert.ok(enKeys.has(`category.${id}.description`), `Missing English category description key: ${id}`)
  assert.ok(idKeys.has(`category.${id}.description`), `Missing Indonesian category description key: ${id}`)
}
for (const id of toolIds) {
  assert.ok(enKeys.has(`tool.${id}.name`), `Missing English tool name key: ${id}`)
  assert.ok(idKeys.has(`tool.${id}.name`), `Missing Indonesian tool name key: ${id}`)
  assert.ok(enKeys.has(`tool.${id}.description`), `Missing English tool description key: ${id}`)
  assert.ok(idKeys.has(`tool.${id}.description`), `Missing Indonesian tool description key: ${id}`)
}

console.log(`i18n OK: ${enKeys.size} matching keys, ${categoryIds.length} categories, ${toolIds.length} tools`)
