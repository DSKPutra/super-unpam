import type { Tenggat } from '../pengingat'
import type { SesiUjian } from './types'

// Sesi ujian → Tenggat (penjadwal pengingat, src/lib/pengingat.ts) dan berkas .ics (RFC 5545)
// dengan alarm H-1 dan 2 jam sebelumnya (T02 langkah 8).

export const sesiKeTenggat = (s: SesiUjian, namaJenis: string): Tenggat => ({
  id: `ujian:${s.id}`,
  jenis: 'ujian',
  judul: `${namaJenis}: ${s.nama}`,
  waktu: s.mulai,
})

const tglIcs = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
/** Escape teks RFC 5545: \ ; , dan baris baru. */
export const escIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** Lipat baris > 75 karakter (CRLF + spasi). */
const lipat = (baris: string) => baris.match(/.{1,74}/gu)?.join('\r\n ') ?? baris

export function buatIcs(sesi: SesiUjian[], namaJenis: (s: SesiUjian) => string, sekarang = new Date()): string {
  const stamp = tglIcs(sekarang.toISOString())
  const ev = sesi.flatMap((s) => [
    'BEGIN:VEVENT',
    `UID:${s.id}@super-unpam`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${tglIcs(s.mulai)}`,
    `DTEND:${tglIcs(s.selesai)}`,
    `SUMMARY:${escIcs(`${namaJenis(s)}: ${s.nama}`)}`,
    `LOCATION:${escIcs(`${s.ruang}${s.kursi ? ` · kursi ${s.kursi}` : ''}`)}`,
    ...[['P1D', '1 hari'], ['PT2H', '2 jam']].flatMap(([dur, teks]) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(`${s.nama} ${teks} lagi`)}`, `TRIGGER:-${dur}`, 'END:VALARM']),
    'END:VEVENT',
  ])
  return [...['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Super UNPAM//Ujian//ID', 'CALSCALE:GREGORIAN'], ...ev, 'END:VCALENDAR'].map(lipat).join('\r\n') + '\r\n'
}
