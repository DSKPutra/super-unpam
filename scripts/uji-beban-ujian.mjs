// Uji beban ujian daring (T09). Jalankan HANYA terhadap staging; lihat docs/KEBIJAKAN-UJIAN-DARING.md.
// Pakai: BASE=https://staging.example SESI="su_session=..." PESERTA=200 ULANG=0.2 node scripts/uji-beban-ujian.mjs
// Catatan: satu cookie sesi dipakai semua "peserta" virtual; untuk uji nyata gunakan akun uji berbeda per peserta.

const BASE = process.env.BASE
const SESI = process.env.SESI
const PESERTA = Number(process.env.PESERTA ?? 50)
const ULANG = Number(process.env.ULANG ?? 0.2)
if (!BASE || !SESI) {
  console.error('Set BASE dan SESI (cookie sesi akun uji).')
  process.exit(1)
}
if (/super-unpam\.vercel\.app|unpam\.ac\.id/.test(BASE)) {
  console.error('Tolak: jangan uji beban terhadap production.')
  process.exit(1)
}

const hdr = { Cookie: SESI, Origin: BASE, Accept: 'application/json' }
const waktu = []
let gagal = 0
async function ukur(fn) {
  const t = performance.now()
  try {
    const r = await fn()
    if (!r.ok) gagal++
    return r
  } catch {
    gagal++
  } finally {
    waktu.push(performance.now() - t)
  }
}
const p = (q) => waktu.slice().sort((a, b) => a - b)[Math.floor((waktu.length - 1) * q)]?.toFixed(0)

const muat = await fetch(`${BASE}/api/ujian/daring`, { headers: hdr }).then((r) => r.json())
const sesi = muat.data.sesi.find((s) => s.soal)
if (!sesi) throw new Error('Tidak ada sesi berlangsung di staging.')

const kunciUnik = new Set()
await Promise.all(Array.from({ length: PESERTA }, async (_, i) => {
  await ukur(() => fetch(`${BASE}/api/ujian/daring`, { headers: hdr }))
  const kunci = `beban-${Date.now().toString(36)}-${i}`
  const badan = JSON.stringify({ sesiId: sesi.id, kunci, nama: `jawaban-${i}.pdf`, ukuran: 1000 + i, tipe: 'application/pdf', sha256: i.toString(16).padStart(64, '0') })
  const kirim = () => fetch(`${BASE}/api/ujian/daring-kirim`, { method: 'POST', headers: { ...hdr, 'Content-Type': 'application/json', 'Idempotency-Key': kunci }, body: badan })
  kunciUnik.add(kunci)
  await ukur(kirim)
  if (Math.random() < ULANG) await ukur(kirim) // kirim ulang dengan kunci sama
}))

const akhir = await fetch(`${BASE}/api/ujian/daring`, { headers: hdr }).then((r) => r.json())
const tersimpan = akhir.data.sesi.find((s) => s.id === sesi.id).kiriman.filter((k) => k.kunci.startsWith('beban-')).length
console.log({ permintaan: waktu.length, gagal, p50: p(0.5), p95: p(0.95), kunciUnik: kunciUnik.size, kirimanTersimpan: tersimpan, lulusIdempotensi: tersimpan === kunciUnik.size })
