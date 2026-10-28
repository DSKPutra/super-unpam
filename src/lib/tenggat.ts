import type { Bill, Task } from './types'

// Pusat Tenggat (inti murni): satu model untuk semua tenggat/jadwal penting (ujian, bimbingan,
// revisi, pengajuan) agar tampil di radar tenggat dan bisa diekspor ke kalender (.ics).
// Semua waktu dalam WIB (Asia/Jakarta, UTC+7, tanpa DST).

export const WIB = 'Asia/Jakarta'
const OFFSET = '+07:00'

export type SumberTenggat = 'ujian' | 'bimbingan' | 'revisi' | 'pengajuan' | 'tugas' | 'keuangan'
export type Urgensi = 'terlambat' | 'hari-ini' | 'minggu-ini' | 'nanti'

export interface Tenggat {
  id: string
  judul: string
  /** ISO 8601 dengan offset +07:00. */
  waktu: string
  /** Akhir (opsional) untuk acara berdurasi, mis. sesi ujian. */
  selesai?: string
  lokasi?: string
  sumber: SumberTenggat
  /** Rute aplikasi tujuan saat diketuk. */
  rute?: string
  /** Alarm dalam menit SEBELUM waktu, mis. [1440, 120] = H-1 dan 2 jam. */
  alarmMenit?: number[]
  selesaiDikerjakan?: boolean
}

const BULAN = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des']

/**
 * Ubah tanggal gaya Indonesia ("16 Nov 2026", "Sen, 16 Nov 2026", "10 November 2026") + jam "08:00"
 * menjadi ISO WIB. Melempar galat bila format tidak dikenali (jangan menebak diam-diam).
 */
export function parseTanggalId(tanggal: string, jam = '00:00'): string {
  const m = tanggal.trim().match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) throw new Error(`Format tanggal tidak dikenali: "${tanggal}"`)
  const bulan = BULAN.indexOf(m[2].slice(0, 3).toLowerCase())
  if (bulan < 0) throw new Error(`Nama bulan tidak dikenali: "${m[2]}"`)
  const j = jam.match(/^(\d{1,2})[:.](\d{2})$/)
  if (!j) throw new Error(`Format jam tidak dikenali: "${jam}"`)
  const pad = (n: number | string) => String(n).padStart(2, '0')
  return `${m[3]}-${pad(bulan + 1)}-${pad(m[1])}T${pad(j[1])}:${j[2]}:00${OFFSET}`
}

/** ISO WIB dari objek Date (mis. untuk "sekarang"). */
export function keIsoWib(d: Date): string {
  const t = new Date(d.getTime() + 7 * 3600_000)
  return t.toISOString().replace(/\.\d{3}Z$/, OFFSET)
}

export const formatTanggalWib = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { timeZone: WIB, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
export const formatJamWib = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { timeZone: WIB, hour: '2-digit', minute: '2-digit' })

/** Kunci hari kalender WIB (YYYY-MM-DD) untuk perbandingan "hari yang sama". */
export const hariWib = (iso: string | Date) => keIsoWib(typeof iso === 'string' ? new Date(iso) : iso).slice(0, 10)

export function urgensi(t: Pick<Tenggat, 'waktu' | 'selesaiDikerjakan'>, sekarang: Date): Urgensi {
  const ms = new Date(t.waktu).getTime() - sekarang.getTime()
  if (ms < 0 && !t.selesaiDikerjakan) return 'terlambat'
  if (hariWib(t.waktu) === hariWib(sekarang)) return 'hari-ini'
  if (ms <= 7 * 86400_000) return 'minggu-ini'
  return 'nanti'
}

/** Urut naik menurut waktu; yang terlambat & belum selesai di depan. */
export function urutkanTenggat(list: Tenggat[], sekarang: Date): Tenggat[] {
  const rank: Record<Urgensi, number> = { terlambat: 0, 'hari-ini': 1, 'minggu-ini': 2, nanti: 3 }
  return [...list].sort((a, b) => rank[urgensi(a, sekarang)] - rank[urgensi(b, sekarang)] || a.waktu.localeCompare(b.waktu))
}

// — Ekspor iCalendar (RFC 5545) —
const icsWaktu = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsTeks = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

export function keIcs(list: Tenggat[], dibuat = new Date()): string {
  const baris = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Super UNPAM//Pusat Tenggat//ID', 'CALSCALE:GREGORIAN']
  for (const t of list) {
    baris.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@superunpam`,
      `DTSTAMP:${icsWaktu(dibuat.toISOString())}`,
      `DTSTART:${icsWaktu(t.waktu)}`,
      `DTEND:${icsWaktu(t.selesai ?? t.waktu)}`,
      `SUMMARY:${icsTeks(t.judul)}`,
    )
    if (t.lokasi) baris.push(`LOCATION:${icsTeks(t.lokasi)}`)
    for (const m of t.alarmMenit ?? []) baris.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsTeks(t.judul)}`, `TRIGGER:-PT${m}M`, 'END:VALARM')
    baris.push('END:VEVENT')
  }
  baris.push('END:VCALENDAR')
  return baris.join('\r\n') + '\r\n'
}

// — Konverter sumber lain → Tenggat —

/** "27 Okt 2026, 23:59" atau "20 Okt 2026" → ISO WIB (tanpa jam = akhir hari). */
export function parseTenggatTeks(teks: string): string {
  const [tgl, jam] = teks.split(',').map((x) => x.trim())
  return parseTanggalId(tgl, jam || '23:59')
}

export const tugasKeTenggat = (t: Task): Tenggat => ({
  id: `tugas-${t.id}`,
  judul: `${t.title} (${t.course})`,
  waktu: parseTenggatTeks(t.due),
  sumber: 'tugas',
  rute: 'kuliah/tugas',
  alarmMenit: [24 * 60],
  selesaiDikerjakan: t.status === 'done',
})

export const tagihanKeTenggat = (b: Bill): Tenggat => ({
  id: `tagihan-${b.id}`,
  judul: b.name,
  waktu: parseTenggatTeks(b.due),
  sumber: 'keuangan',
  rute: 'keuangan',
  alarmMenit: [3 * 24 * 60],
  selesaiDikerjakan: b.status === 'paid',
})
