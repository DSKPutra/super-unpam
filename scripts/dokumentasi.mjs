// Menyusun docs/SOURCE-CODE.md: penjelasan setiap file sumber (src/, api/) satu per satu.
// Isi diambil dari komentar kepala tiap file + daftar ekspornya, jadi dokumen ikut benar selama
// komentar kepala dirawat. Jalankan: npm run docs

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

// Penjelasan untuk file yang belum punya komentar kepala.
const MANUAL = {
  'src/main.tsx': 'Titik masuk aplikasi: memasang <App /> ke #root dan memuat gaya global.',
  'src/components/ui.tsx': 'Komponen UI bersama: kepala halaman, Section, tombol tautan, Badge, Tabs, Progress, Sparkline, catatan demo, Skeleton.',
  'src/lib/i18n.ts': 'Kamus teks antarmuka (Indonesia/Inggris) dan getDict untuk memilih bahasa.',
  'src/pages/Akademik.tsx': 'Tab Akademik: ringkasan nilai, IPK, dan pintasan layanan akademik.',
  'src/pages/Download.tsx': 'Halaman unduh aplikasi (PWA dan paket desktop/seluler).',
  'src/pages/Kuliah.tsx': 'Tab Kuliah: jadwal hari ini dan kelas daring.',
  'src/pages/Layanan.tsx': 'Halaman layanan kampus: Event, Prestasi, Tracer Study, Kerja sama.',
  'src/pages/Profil.tsx': 'Profil pengguna, pengaturan tema/bahasa, ganti peran (demo), dan halaman Notifikasi.',
  'api/_lib/crypto.ts': 'Tanda tangan HMAC dan perbandingan waktu-konstan untuk token sesi.',
  'api/_lib/endpoint.ts': 'Pembuat endpoint GET /api/<domain>/<resource>: verifikasi sesi dan peran, lalu ambil data dari konektor.',
  'src/lib/academic.ts': 'Hitungan akademik klien: IPK (2 desimal) dan IPS per semester untuk sparkline.',
  'src/lib/geo.ts': 'Jarak haversine (meter) untuk geofence presensi; dipakai demo dan BFF.',
  'src/lib/types.ts': 'Tipe domain bersama klien dan BFF, supaya bentuk respons selalu sama.',
  'src/lib/useResource.ts': 'Hook pemuat data: loading, error, data, dan reload untuk fungsi sumber.',
  'src/pages/Home.tsx': 'Beranda: menyusun widget sesuai peran dan pilihan pengguna; data bersama dimuat sekali.',
  'src/pages/Keuangan.tsx': 'Tagihan dan pembayaran (SISKEMU); status "sudah bayar" di demo hanya simulasi lokal.',
  'src/pages/widgets/registry.ts': 'Daftar widget Beranda: urutan bawaan dan peran yang boleh melihat.',
  'src/pages/fitur/label-ta.ts': 'Label tampilan status tugas akhir, dipakai halaman mahasiswa, dosen, dan prodi.',
}

const BAGIAN = [
  ['api/', 'Server (Vercel Functions / BFF)'],
  ['src/lib/akademik/', 'Logika murni ujian & skripsi (dipakai klien dan server)'],
  ['src/lib/sumber/', 'Lapisan sumber data klien (demo localStorage atau BFF)'],
  ['src/lib/', 'Pustaka klien'],
  ['src/data/', 'Data contoh dan konfigurasi aturan'],
  ['src/components/', 'Komponen bersama'],
  ['src/pages/fitur/', 'Halaman fitur'],
  ['src/pages/', 'Halaman utama'],
  ['src/', 'Akar aplikasi'],
]

/** Komentar kepala: blok // atau /** di awal file (setelah import), maksimal 3 baris. */
function kepala(isi) {
  const baris = isi.split('\n')
  let i = 0
  while (i < baris.length && (/^\s*(import|export \{|\}|$)/.test(baris[i]) || /^\s+\S/.test(baris[i]) && !/^\s*(\/\/|\/?\*)/.test(baris[i]))) i++
  const out = []
  for (; i < baris.length && out.length < 3; i++) {
    const t = baris[i].trim()
    if (!/^(\/\/|\/\*\*|\*)/.test(t) || t === '*/') break
    const teks = t.replace(/^(\/\/+|\/\*\*|\*\/?)\s?/, '').replace(/\*\/$/, '').trim()
    if (teks) out.push(teks)
  }
  return out.join(' ')
}

const ekspor = (isi) => [...new Set([...isi.matchAll(/^export (?:default )?(?:async )?(?:function|const|interface|type|class) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]))]

const file = execFileSync('git', ['ls-files', 'src', 'api'], { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f) && !f.endsWith('.d.ts'))

const kelompok = new Map(BAGIAN.map(([p]) => [p, []]))
for (const f of file) kelompok.get(BAGIAN.find(([p]) => f.startsWith(p))[0]).push(f)

let md = `# Dokumentasi source code

Penjelasan setiap file sumber, satu per satu. Dibuat otomatis oleh \`scripts/dokumentasi.mjs\` (\`npm run docs\`) dari komentar kepala dan ekspor tiap file. Tes (\`*.test.ts(x)\`) berada di samping file yang diuji dan tidak dicantumkan.

## Gambaran arsitektur

- **Klien**: React 18 + TypeScript + Vite, PWA. Router hash; halaman dimuat malas (\`src/App.tsx\`).
- **Data**: komponen hanya mengenal antarmuka di \`src/lib/sumber/\`. Mode demo menyimpan data contoh di localStorage (dihapus saat keluar); mode BFF memanggil \`/api\`.
- **Server**: Vercel Functions di \`api/\`. Setiap sistem kampus punya konektor \`mock\` (data contoh) dan \`http\` (sistem asli; kini 503 sampai tersambung).
- **Aturan akademik**: data bertipe di \`src/data/aturan-akademik.ts\`, semua masih contoh (\`TODO(BAAK)\`).
- **Logika murni**: \`src/lib/akademik/\` tanpa React/DOM, dipakai klien demo dan server agar aturan sama di keduanya.
- **Peran dosen/prodi**: masih demo; hak akses server ditandai \`TODO(BFF-AUTHZ)\`.

`
for (const [p, judul] of BAGIAN) {
  const daftar = kelompok.get(p)
  if (!daftar.length) continue
  md += `## ${judul}\n\n`
  for (const f of daftar) {
    const isi = readFileSync(f, 'utf8')
    const ex = ekspor(isi)
    md += `### [${f}](../${f})\n${MANUAL[f] ?? (kepala(isi) || '—')}\n`
    if (ex.length) md += `\nEkspor: ${ex.slice(0, 12).map((e) => `\`${e}\``).join(', ')}${ex.length > 12 ? ', …' : ''}\n`
    md += `\n`
  }
}

writeFileSync('docs/SOURCE-CODE.md', md)
console.log(`docs/SOURCE-CODE.md: ${file.length} file`)
