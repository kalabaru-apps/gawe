import { readFileSync, writeFileSync } from 'node:fs'
const en = readFileSync('src/lib/i18n/en.ts','utf8')
const id = readFileSync('src/lib/i18n/id.ts','utf8')
const enRows = [
  "  'home.headline': 'What do you need to get done?',",
  "  'home.summary': '{count} tools that run in your browser. Your files and text never leave your device, and they keep working offline.',",
  "  'home.search_hint': 'Try: pdf, json, tax, timer, color',",
  "  'home.result_one': 'result',",
  "  'home.result_many': 'results',",
  "  'home.no_results': 'Nothing matches “{query}”. Try a file type or task such as “compress” or “timestamp”.',",
  "  'home.recent': 'Recent',",
]
const idRows = [
  "  'home.headline': 'Apa yang ingin kamu kerjakan?',",
  "  'home.summary': '{count} alat yang bisa digunakan langsung di browser. File dan teksmu tetap di perangkat, dan alat tetap bisa dipakai offline.',",
  "  'home.search_hint': 'Coba cari: pdf, json, pajak, timer, warna',",
  "  'home.result_one': 'hasil',",
  "  'home.result_many': 'hasil',",
  "  'home.no_results': 'Tidak ada yang cocok dengan “{query}”. Coba cari jenis file atau pekerjaan, seperti “compress” atau “timestamp”.',",
  "  'home.recent': 'Terakhir dibuka',",
]
for (const [file, source, rows] of [['src/lib/i18n/en.ts', en, enRows], ['src/lib/i18n/id.ts', id, idRows]]) {
  const close = source.lastIndexOf('} as const')
  if (close < 0) throw new Error(`Dictionary end missing: ${file}`)
  const additions = rows.join('\n') + '\n'
  writeFileSync(file, source.slice(0, close).trimEnd() + '\n' + additions + source.slice(close), 'utf8')
}
