import type { AturanUjian, HurufMutu, Rubrik } from '../../data/aturan-akademik.js'
import type { Peristiwa } from './alur-skripsi.js'
import { hitungNilaiPratinjau, nilaiPenguji, type PratinjauNilai } from './nilai.js'
import type { DataPenilaian, HasilUjian, HasilUntukMahasiswa, LembarPenilaian, PendaftaranUjianAkhir, SesiUjian, StatusTugasAkhir } from './types.js'

// Penilaian ujian akhir (T06): jendela waktu, validasi lembar, pengiriman final, kerahasiaan antar
// penguji, rilis hasil, dan tampilan mahasiswa. Fungsi murni untuk klien demo dan BFF; tes di penilaian.test.ts.

type Hasil = { ok: true; data: DataPenilaian } | { ok: false; galat: string }

export function jendelaPenilaian(sesi: SesiUjian, aturan: Pick<AturanUjian, 'jendelaPenilaian'>, now: number): { terbuka: boolean; alasan?: string; buka: Date; tutup: Date } {
  const j = aturan.jendelaPenilaian ?? { bukaSebelumMenit: 0, tutupSesudahJam: 0 }
  const buka = new Date(Date.parse(sesi.mulai) - j.bukaSebelumMenit * 60_000)
  const tutup = new Date(Date.parse(sesi.selesai) + j.tutupSesudahJam * 3_600_000)
  if (now < buka.getTime()) return { terbuka: false, alasan: 'Lembar penilaian belum dibuka.', buka, tutup }
  if (now > tutup.getTime()) return { terbuka: false, alasan: 'Jendela penilaian sudah ditutup.', buka, tutup }
  return { terbuka: true, buka, tutup }
}

/** Pesan galat per bagian lembar (kosong = valid). Skor di luar rentang ditolak lewat nilaiPenguji. */
export function validasiLembar(r: Rubrik, l: Pick<LembarPenilaian, 'skor' | 'rekomendasi' | 'revisi'>): string[] {
  const g: string[] = []
  try {
    nilaiPenguji(r, l.skor)
  } catch (e) {
    g.push((e as Error).message)
  }
  if (!['LULUS', 'LULUS_REVISI', 'TIDAK_LULUS'].includes(l.rekomendasi)) g.push('Pilih rekomendasi.')
  if (l.rekomendasi === 'LULUS_REVISI' && l.revisi.length === 0) g.push('Isi minimal satu butir revisi untuk rekomendasi lulus dengan revisi.')
  for (const [i, v] of l.revisi.entries()) if (!v.bagian.trim() || !v.permintaan.trim()) g.push(`Revisi ${i + 1}: bagian dan permintaan wajib diisi.`)
  return g
}

/** Mengirim lembar secara final: hanya penguji sesi, di dalam jendela, sekali saja; tercatat di audit. */
export function kirimLembar(d: DataPenilaian, l: LembarPenilaian, ctx: { sesi: SesiUjian; rubrik: Rubrik; aturan: Pick<AturanUjian, 'jendelaPenilaian'>; now: number }): Hasil {
  if (!ctx.sesi.petugas.includes(l.pengujiId)) return { ok: false, galat: 'Anda bukan penguji ujian ini.' }
  if (d.hasil) return { ok: false, galat: 'Hasil sudah dirilis.' }
  const j = jendelaPenilaian(ctx.sesi, ctx.aturan, ctx.now)
  if (!j.terbuka) return { ok: false, galat: j.alasan! }
  if (d.lembar.some((x) => x.pengujiId === l.pengujiId && x.dikirim)) return { ok: false, galat: 'Lembar sudah dikirim dan bersifat final.' }
  const g = validasiLembar(ctx.rubrik, l)
  if (g.length) return { ok: false, galat: g.join(' ') }
  const waktu = new Date(ctx.now).toISOString()
  return {
    ok: true,
    data: { ...d, lembar: [...d.lembar.filter((x) => x.pengujiId !== l.pengujiId), { ...l, dikirim: waktu }], audit: [...d.audit, { siapa: l.pengujiId, kapan: waktu, apa: `Mengirim lembar penilaian (rekomendasi ${l.rekomendasi})` }] },
  }
}

export const semuaMengirim = (d: DataPenilaian, sesi: SesiUjian) => sesi.petugas.length > 0 && sesi.petugas.every((p) => d.lembar.some((l) => l.pengujiId === p && l.dikirim))

/**
 * Lembar yang boleh dilihat seorang penguji: miliknya sendiri; lembar penguji lain baru terlihat
 * setelah SEMUA penguji mengirim (mencegah saling memengaruhi). Ditegakkan server — TODO(BFF-AUTHZ).
 */
export function lembarTerlihat(d: DataPenilaian, sesi: SesiUjian, pengujiId: string): LembarPenilaian[] {
  return semuaMengirim(d, sesi) ? d.lembar.filter((l) => l.dikirim) : d.lembar.filter((l) => l.pengujiId === pengujiId)
}

/** Pratinjau nilai untuk dosen (berlabel perkiraan) — hanya bila semua penguji sudah mengirim. */
export function pratinjauUntukDosen(d: DataPenilaian, sesi: SesiUjian, rubrik: Rubrik, huruf: HurufMutu[], desimal: number): PratinjauNilai | null {
  if (!semuaMengirim(d, sesi)) return null
  return hitungNilaiPratinjau(rubrik, d.lembar.filter((l) => l.dikirim), huruf, desimal)
}

/** Rilis hasil oleh prodi: semua penguji harus sudah mengirim; revisi dihimpun dari lembar. */
export function rilisHasil(d: DataPenilaian, sesi: SesiUjian, keputusan: HasilUjian['keputusan'], ctx: { oleh: string; now: number; nilaiAkhir?: number; huruf?: string }): Hasil {
  if (d.hasil) return { ok: false, galat: 'Hasil sudah dirilis.' }
  if (!semuaMengirim(d, sesi)) return { ok: false, galat: 'Belum semua penguji mengirim lembar penilaian.' }
  const waktu = new Date(ctx.now).toISOString()
  const revisi =
    keputusan === 'LULUS_REVISI'
      ? d.lembar.flatMap((l) => l.revisi.map((r, i) => ({ id: `${d.pendaftaranId}:${l.pengujiId}:${i + 1}`, bagian: r.bagian, permintaan: r.permintaan, pengujiId: l.pengujiId, tenggat: r.tenggat, status: 'BELUM' as const })))
      : []
  return { ok: true, data: { ...d, hasil: { keputusan, dirilis: waktu, revisi, ...(ctx.nilaiAkhir !== undefined ? { nilaiAkhir: ctx.nilaiAkhir, huruf: ctx.huruf } : {}) }, audit: [...d.audit, { siapa: ctx.oleh, kapan: waktu, apa: `Merilis hasil: ${keputusan}` }] } }
}

/** Tampilan mahasiswa: "Menunggu hasil" sampai dirilis; tidak pernah memuat nilai per penguji. */
export const hasilUntukMahasiswa = (d: DataPenilaian | null): HasilUntukMahasiswa => (d?.hasil ? { status: 'DIRILIS', hasil: d.hasil } : { status: 'MENUNGGU' })

/** Peristiwa alur TA dari keputusan ujian (proposal atau ujian akhir). */
export function peristiwaHasil(keputusan: HasilUjian['keputusan'], statusTA: StatusTugasAkhir): Peristiwa | null {
  if (statusTA !== 'UJIAN_PROPOSAL' && statusTA !== 'UJIAN_AKHIR') return null
  return keputusan === 'LULUS' ? 'HASIL_LULUS' : keputusan === 'LULUS_REVISI' ? 'HASIL_REVISI' : 'HASIL_TIDAK_LULUS'
}

/** Pendaftaran ditutup setelah hasil dirilis, supaya ujian berikutnya bisa didaftarkan. */
export const tutupPendaftaran = (p: PendaftaranUjianAkhir, now: number): PendaftaranUjianAkhir =>
  p.status === 'TERJADWAL' ? { ...p, status: 'SELESAI', riwayat: [...p.riwayat, { dari: 'TERJADWAL', ke: 'SELESAI', aksi: 'RILIS_HASIL', pelaku: 'PRODI', waktu: new Date(now).toISOString() }] } : p

export const dataPenilaianBaru = (pendaftaranId: string): DataPenilaian => ({ pendaftaranId, lembar: [], audit: [] })
