import type { Tenggat } from '../pengingat.js'
import type { SesiUjian } from './types.js'

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

interface AcaraIcs {
  uid: string
  mulai: string
  selesai?: string
  judul: string
  lokasi?: string
  /** Teks pengingat, mis. nama sesi/tugas. */
  pengingat: string
}

function vevent(e: AcaraIcs, stamp: string): string[] {
  return [
    'BEGIN:VEVENT',
    `UID:${e.uid}@super-unpam`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${tglIcs(e.mulai)}`,
    e.selesai ? `DTEND:${tglIcs(e.selesai)}` : 'DURATION:PT30M',
    `SUMMARY:${escIcs(e.judul)}`,
    ...(e.lokasi ? [`LOCATION:${escIcs(e.lokasi)}`] : []),
    ...[['P1D', '1 hari'], ['PT2H', '2 jam']].flatMap(([dur, teks]) => ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escIcs(`${e.pengingat} ${teks} lagi`)}`, `TRIGGER:-${dur}`, 'END:VALARM']),
    'END:VEVENT',
  ]
}

const kalender = (ev: string[]) => [...['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Super UNPAM//Akademik//ID', 'CALSCALE:GREGORIAN'], ...ev, 'END:VCALENDAR'].map(lipat).join('\r\n') + '\r\n'

export function buatIcs(sesi: SesiUjian[], namaJenis: (s: SesiUjian) => string, sekarang = new Date()): string {
  const stamp = tglIcs(sekarang.toISOString())
  return kalender(sesi.flatMap((s) => vevent({ uid: s.id, mulai: s.mulai, selesai: s.selesai, judul: `${namaJenis(s)}: ${s.nama}`, lokasi: `${s.ruang}${s.kursi ? ` · kursi ${s.kursi}` : ''}`, pengingat: s.nama }, stamp)))
}

/** Tenggat apa pun (tugas bimbingan, dsb.) → .ics dengan alarm H-1 dan 2 jam. */
export function buatIcsTenggat(daftar: Tenggat[], sekarang = new Date()): string {
  const stamp = tglIcs(sekarang.toISOString())
  return kalender(daftar.flatMap((t) => vevent({ uid: t.id.replace(/[^\w.-]/g, '-'), mulai: t.waktu, judul: t.judul, pengingat: t.judul }, stamp)))
}
