import type { CategoryId } from '@/types'

export type Domain = 'workbench' | 'paper' | 'studio' | 'stage' | 'instrument'

const BY_CATEGORY: Record<CategoryId, Domain> = {
  dev: 'workbench',
  encoding: 'workbench',
  crypto: 'workbench',
  office: 'paper',
  education: 'paper',
  image: 'studio',
  visual: 'stage',
}

/** Tools whose job differs from their category's. Hybrids nest <Region domain=...> inside this base. */
const OVERRIDES: Record<string, Domain> = {
  // devices
  'pomodoro': 'instrument',
  'session-timer': 'instrument',
  'speech-timer': 'instrument',
  'timezone-clock': 'instrument',
  'calculator': 'instrument',
  'scientific-calculator': 'instrument',
  'password-generator': 'instrument',
  'totp': 'instrument',
  // documents
  'markdown-editor': 'paper',
  'http-reference': 'paper',
  'lorem-ipsum': 'paper',
  // drop-a-file flows
  'qr-code': 'studio',
  'csv-merger': 'studio',
}

export function domainOf(category: CategoryId, toolId: string): Domain {
  return OVERRIDES[toolId] ?? BY_CATEGORY[category]
}
