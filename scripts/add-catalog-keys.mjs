import { readFileSync, writeFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const toolsSource = read('src/config/tools.ts')
const categories = [...toolsSource.matchAll(/id: '([^']+)',\s*\n\s*label: '([^']+)'/g)].map((m) => [m[1], m[2]])
const tools = [...toolsSource.matchAll(/id: '([^']+)',\s*\n\s*name: '([^']+)',\s*\n\s*category: '([^']+)',\s*\n\s*description: '([^']+)'/g)].map((m) => [m[1], m[2], m[3], m[4]])

const categoryId = {
  encoding: ['Encoding & Pemformatan', 'Tempel teks atau data untuk dirapikan, dikonversi, atau dibersihkan.'],
  crypto: ['Kriptografi & Keamanan', 'Buat hash dan kelola token, kode, serta kata sandi. Semua diproses di browser.'],
  dev: ['Utilitas Developer', 'Utilitas praktis untuk pekerjaan teknis sehari-hari.'],
  image: ['Gambar & Dokumen', 'Pilih file, atur opsi, lalu unduh hasilnya.'],
  office: ['Produktivitas Kerja', 'Dokumen, timer, kalkulator, dan lembar kerja untuk aktivitas harian.'],
  visual: ['Visual & Desain', 'Alat kanvas untuk membuat diagram, mengolah warna, dan menyusun tata letak.'],
  education: ['Pendidikan & Belajar', 'Kalkulator dan pembahasan langkah demi langkah untuk belajar.'],
}

const descriptions = {
  'json-formatter': 'Format, validasi, dan jelajahi JSON dalam struktur yang bisa dibuka-tutup.',
  'json-converter': 'Konversi antara JSON, YAML, TOML, CSV, dan XML.',
  'base64': 'Encode dan decode teks, file, serta gambar ke atau dari Base64.',
  'url-html-encode': 'Encode dan decode URL serta entitas HTML.',
  'sql-formatter': 'Rapikan atau minify kueri SQL dengan pewarnaan kata kunci dan indentasi.',
  'schema-generator': 'Buat interface TypeScript, skema Zod, dan JSON Schema dari CSV atau JSON.',
  'csv-merger': 'Gabungkan beberapa file CSV dengan kolom yang sama menjadi satu file.',
  'code-beautifier': 'Rapikan atau minify SQL, JavaScript, CSS, dan HTML.',
  'case-converter': 'Ubah teks ke camelCase, snake_case, kebab-case, dan format lainnya.',
  'line-tools': 'Urutkan, hapus duplikat, balik urutan, dan rapikan baris teks.',
  'string-tools': 'Buat slug serta escape atau unescape string JSON, SQL, dan regex.',
  'hash-generator': 'Buat hash MD5, SHA-1, SHA-256, SHA-512, dan HMAC.',
  'password-generator': 'Buat kata sandi dengan pengukur entropi dan kekuatan.',
  'bcrypt': 'Hash dan verifikasi kata sandi dengan bcrypt.',
  'aes-encrypt': 'Enkripsi dan dekripsi teks dengan AES.',
  'jwt-decoder': 'Decode dan periksa header, payload, serta masa berlaku token JWT.',
  'uuid-ulid': 'Buat UUID versi 1, 4, 5, dan ULID.',
  'totp': 'Buat kode sekali pakai berbasis waktu untuk menguji aplikasi 2FA.',
  'qr-code': 'Buat kode QR atau baca melalui kamera dan unggahan gambar.',
  'regex-tester': 'Uji regular expression dengan sorotan dan penjelasan langsung.',
  'cron-builder': 'Buat dan baca ekspresi cron dengan penjelasan yang mudah dipahami.',
  'timestamp-converter': 'Konversi timestamp Unix ke tanggal dan waktu, atau sebaliknya.',
  'base-converter': 'Konversi angka antara biner, oktal, desimal, dan heksadesimal.',
  'color-converter': 'Konversi warna HEX, RGB, dan HSL serta periksa kontrasnya.',
  'fake-data-generator': 'Buat data contoh seperti nama, email, alamat, dan baris JSON.',
  'text-diff': 'Bandingkan dua teks atau file secara berdampingan.',
  'markdown-converter': 'Konversi Markdown ke HTML dan sebaliknya dengan pratinjau langsung.',
  'lorem-ipsum': 'Buat teks placeholder berdasarkan jumlah kata, kalimat, atau paragraf.',
  'http-reference': 'Referensi cepat kode status HTTP dan tipe MIME.',
  'markdown-editor': 'Editor Markdown offline untuk membuka, mengedit, dan menyimpan file .md.',
  'curl-to-code': 'Konversi perintah cURL ke kode JavaScript fetch, Axios, Python, Go, atau PHP.',
  'api-tester': 'Uji endpoint HTTP dan webhook secara lokal dengan method, header, body, dan respons.',
  'protobuf-inspector': 'Decode payload protobuf dari hex, Base64, atau file, dengan tampilan hex tersinkron.',
  'ktp-mock-generator': 'Buat data KTP contoh Indonesia dengan NIK valid secara struktur untuk pengujian.',
  'pdf-image-converter': 'Konversi halaman PDF ke gambar atau gabungkan gambar menjadi PDF.',
  'image-converter': 'Konversi gambar antara format PNG, JPG, WebP, dan AVIF.',
  'image-resize': 'Ubah ukuran, potong, dan kompres gambar di browser.',
  'svg-tools': 'Optimalkan SVG dan buat favicon dari SVG atau gambar.',
  'image-base64': 'Konversi gambar ke data URI Base64 untuk disematkan di CSS atau HTML.',
  'exif-remover': 'Hapus metadata EXIF seperti lokasi GPS, kamera, dan tanggal sebelum berbagi.',
  'pdf-tools': 'Pisahkan, gabungkan, putar, tanda tangani, dan kompres file PDF secara offline.',
  'pomodoro': 'Timer Pomodoro dan stopwatch untuk sesi fokus.',
  'timezone-clock': 'Konversi waktu antar zona waktu dan lihat jam dunia secara langsung.',
  'unit-converter': 'Konversi panjang, berat, suhu, dan ukuran data.',
  'date-calculator': 'Hitung selisih tanggal atau tambahkan dan kurangi hari kerja.',
  'calculator': 'Kalkulator ilmiah dan persentase.',
  'csv-editor': 'Lihat dan edit file CSV dalam lembar kerja sederhana.',
  'word-counter': 'Hitung kata, karakter, kalimat, dan perkiraan waktu baca.',
  'scratchpad': 'Catatan lokal dan daftar tugas singkat yang tersimpan di browser.',
  'meeting-cost': 'Hitung biaya rapat berdasarkan jumlah peserta dan gaji.',
  'pastebin': 'Simpan dan buka kembali potongan teks secara lokal.',
  'task-tracker': 'Papan Kanban offline dengan kolom, kartu, label, checklist, dan tenggat.',
  'session-timer': 'Beberapa stopwatch untuk mencatat jam kerja per proyek.',
  'text-cleaner': 'Rapikan teks dari PDF dan email, termasuk kapitalisasi, spasi, dan karakter asing.',
  'speech-timer': 'Perkirakan durasi pidato dari jumlah kata dan kecepatan bicara.',
  'hours-calculator': 'Hitung total jam kerja dari waktu mulai dan selesai, termasuk istirahat dan lembur.',
  'income-tax-calculator': 'Hitung PPh 21, BPJS Kesehatan, dan BPJS Ketenagakerjaan dari gaji kotor atau gaji bersih.',
  'ppn-calculator': 'Hitung PPN belanja, baik harga sebelum maupun sesudah pajak.',
  'css-generators': 'Buat nilai CSS box-shadow dan gradient dengan pratinjau langsung.',
  'whiteboard': 'Kanvas untuk menggambar bebas dan membuat diagram.',
  'mermaid': 'Tampilkan flowchart dan diagram Mermaid dari teks.',
  'image-annotator': 'Tambahkan anotasi pada screenshot dan gambar.',
  'color-palette': 'Roda warna, pembuat palet, dan penjelajah harmoni warna.',
  'quadratic-solver': 'Selesaikan ax² + bx + c = 0 dengan pembahasan langkah demi langkah.',
  'matrix-calculator': 'Tambah, kalikan, cari determinan, invers, dan transpose matriks.',
  'scientific-calculator': 'Kalkulator ilmiah lengkap dengan trigonometri, logaritma, dan konstanta.',
  'statistics-calculator': 'Hitung mean, median, modus, variansi, simpangan baku, dan lainnya.',
  'molar-mass': 'Hitung massa molar dari rumus kimia seperti H₂SO₄.',
  'physics-solver': 'Selesaikan rumus fisika untuk GLBB, momentum, hukum Ohm, dan lainnya.',
  'citation-generator': 'Buat sitasi APA, MLA, atau Chicago untuk buku, artikel, dan situs web.',
  'gpa-calculator': 'Hitung GPA atau IPK menggunakan sistem kredit SKS Indonesia.',
}

if (categories.length !== 7) throw new Error(`Expected 7 categories, got ${categories.length}`)
if (tools.length !== 71) throw new Error(`Expected 71 tools, got ${tools.length}`)
if (Object.keys(descriptions).length !== tools.length) throw new Error('Description count mismatch')
for (const [id] of categories) if (!categoryId[id]) throw new Error(`Missing category text: ${id}`)
for (const [id] of tools) if (!descriptions[id]) throw new Error(`Missing tool description: ${id}`)

for (const [file, locale] of [['src/lib/i18n/en.ts', 'en'], ['src/lib/i18n/id.ts', 'id']]) {
  const source = read(file)
  const close = source.lastIndexOf('} as const')
  if (close < 0) throw new Error(`Could not locate dictionary end: ${file}`)
  const rows = []
  for (const [id, name] of categories) {
    const [localizedName, localizedDescription] = locale === 'en'
      ? [name, ({ encoding: 'Paste text or data to format, convert, or clean up.', crypto: 'Generate hashes and work with tokens, codes, and passwords.', dev: 'Useful utilities for everyday technical work.', image: 'Choose a file, set options, and download the result.', office: 'Documents, timers, calculators, and sheets for daily work.', visual: 'Canvas tools for diagrams, color, and layout.', education: 'Calculators and step-by-step solutions for learning.' })[id]]
      : categoryId[id]
    rows.push([`category.${id}.name`, localizedName], [`category.${id}.description`, localizedDescription])
  }
  for (const [id, name, , description] of tools) {
    rows.push([`tool.${id}.name`, name], [`tool.${id}.description`, locale === 'en' ? description : descriptions[id]])
  }
  const block = rows.map(([key, value]) => `  '${key}': ${JSON.stringify(value)},`).join('\n')
  writeFileSync(file, `${source.slice(0, close).trimEnd()}\n\n  // Localized catalog: categories and tool metadata\n${block}\n${source.slice(close)}`, 'utf8')
}

console.log(`Added metadata for ${categories.length} categories and ${tools.length} tools.`)
