import type { AturanProdi } from '../../data/aturan-akademik.js'
import type { Finalisasi, HasilPlagiasi, NaskahFinal, Revisi, StatusAdmin } from './types.js'

// Revisi pasca ujian, lembar pengesahan, naskah final, plagiasi, checklist lulus (T07). Fungsi murni
// untuk klien demo dan BFF; tes di finalisasi.test.ts.

const HARI = 86_400_000

/* ---------------- Revisi ---------------- */

export interface StatusTampilRevisi {
  status: Revisi['status']
  terlambat: boolean
  /** Sisa hari ke tenggat (negatif = lewat); null bila tanpa tenggat. */
  sisaHari: number | null
  /** Urgensi untuk pengurutan/penanda: 0 aman, 1 dekat (≤ 3 hari), 2 terlambat. */
  urgensi: 0 | 1 | 2
}

export function tampilRevisi(r: Revisi, now: number): StatusTampilRevisi {
  const sisa = r.tenggat ? Math.ceil((Date.parse(r.tenggat) - now) / HARI) : null
  const selesai = r.status === 'DISETUJUI'
  const terlambat = !selesai && sisa !== null && Date.parse(r.tenggat!) < now
  return { status: r.status, terlambat, sisaHari: sisa, urgensi: terlambat ? 2 : !selesai && sisa !== null && sisa <= 3 ? 1 : 0 }
}

/** Mengisi tenggat bawaan (konfigurasi) untuk butir yang tidak diberi tenggat oleh penguji. */
export const lengkapiTenggat = (revisi: Revisi[], dirilis: string, aturan: Pick<AturanProdi, 'tenggatRevisiHari'>): Revisi[] =>
  revisi.map((r) => (r.tenggat ? r : { ...r, tenggat: new Date(Date.parse(dirilis) + aturan.tenggatRevisiHari * HARI).toISOString() }))

type HasilRevisi = { ok: true; revisi: Revisi[] } | { ok: false; galat: string }

function ubah(revisi: Revisi[], id: string, fn: (r: Revisi) => Revisi | string): HasilRevisi {
  const r = revisi.find((x) => x.id === id)
  if (!r) return { ok: false, galat: 'Butir revisi tidak ditemukan.' }
  const hasil = fn(r)
  return typeof hasil === 'string' ? { ok: false, galat: hasil } : { ok: true, revisi: revisi.map((x) => (x.id === id ? hasil : x)) }
}

export const tandaiDikerjakan = (revisi: Revisi[], id: string): HasilRevisi =>
  ubah(revisi, id, (r) => (r.status === 'BELUM' || r.status === 'DITOLAK' ? { ...r, status: 'DIKERJAKAN' } : `Butir berstatus ${r.status} tidak bisa ditandai dikerjakan.`))

/** Mahasiswa mengajukan perbaikan: wajib menunjuk versi draf yang memuat perbaikan. */
export const ajukanRevisi = (revisi: Revisi[], id: string, d: { versiDraf?: number; catatan: string }): HasilRevisi =>
  ubah(revisi, id, (r) => {
    if (!['BELUM', 'DIKERJAKAN', 'DITOLAK'].includes(r.status)) return `Butir berstatus ${r.status} tidak bisa diajukan.`
    if (!d.versiDraf) return 'Pilih versi draf yang memuat perbaikan.'
    if (!d.catatan.trim()) return 'Jelaskan perbaikan yang dilakukan.'
    return { ...r, status: 'DIAJUKAN', versiDraf: d.versiDraf, catatanMahasiswa: d.catatan.trim(), alasan: undefined }
  })

/** Penguji pemilik butir menyetujui/menolak (alasan wajib bila ditolak). */
export const putuskanRevisi = (revisi: Revisi[], id: string, pengujiId: string, keputusan: 'DISETUJUI' | 'DITOLAK', alasan: string | undefined, now: number): HasilRevisi =>
  ubah(revisi, id, (r) => {
    if (r.pengujiId !== pengujiId) return 'Hanya penguji yang meminta revisi ini yang dapat memutuskan.'
    if (r.status !== 'DIAJUKAN') return 'Butir belum diajukan mahasiswa.'
    if (keputusan === 'DITOLAK' && !alasan?.trim()) return 'Alasan penolakan wajib diisi.'
    return { ...r, status: keputusan, alasan: keputusan === 'DITOLAK' ? alasan!.trim() : undefined, diputuskan: new Date(now).toISOString() }
  })

export const semuaRevisiDisetujui = (revisi: Revisi[]) => revisi.every((r) => r.status === 'DISETUJUI')

/** Lembar pengesahan hanya bisa dibuat bila tidak ada revisi terbuka. */
export function bolehPengesahan(revisi: Revisi[]): { ok: boolean; alasan?: string } {
  const terbuka = revisi.filter((r) => r.status !== 'DISETUJUI').length
  return terbuka ? { ok: false, alasan: `Masih ada ${terbuka} butir revisi yang belum disetujui.` } : { ok: true }
}

/* ---------------- Naskah final & plagiasi ---------------- */

export function validasiNaskahFinal(f: { size: number; type: string }, centang: string[], akses: string, aturan: Pick<AturanProdi, 'naskahFinal'>): string[] {
  const n = aturan.naskahFinal
  const g: string[] = []
  if (f.type !== 'application/pdf') g.push('Naskah final harus PDF.')
  if (f.size === 0) g.push('Berkas kosong.')
  if (f.size > n.maksMB * 1024 * 1024) g.push(`Ukuran melebihi ${n.maksMB} MB.`)
  const kurang = n.daftarPeriksa.filter((x) => !centang.includes(x))
  if (kurang.length) g.push(`Daftar periksa belum lengkap: ${kurang.join(', ')}.`)
  if (!n.aksesPublikasi.some((a) => a.id === akses)) g.push('Pilih hak akses publikasi.')
  return g
}

export function simpanNaskahFinal(fin: Finalisasi, n: Omit<NaskahFinal, 'diunggah'>, now: number): Finalisasi {
  if (!/^[0-9a-f]{64}$/.test(n.sha256)) throw new Error('Hash SHA-256 tidak valid.')
  // Naskah baru membatalkan hasil plagiasi lama (hasil itu untuk berkas sebelumnya).
  return { ...fin, naskah: { ...n, diunggah: new Date(now).toISOString() }, plagiasi: undefined }
}

/** Antarmuka penyedia pemeriksaan kemiripan. Hasil & ambang dari penyedia/kebijakan, bukan dihitung aplikasi. */
export interface PenyediaPlagiasi {
  nama: string
  contoh: boolean
  periksa(sha256: string): Promise<{ persen: number }>
}

export function hasilPlagiasi(persen: number, penyedia: Pick<PenyediaPlagiasi, 'nama' | 'contoh'>, aturan: Pick<AturanProdi, 'plagiasi'>, now: number): HasilPlagiasi {
  return { penyedia: penyedia.nama, persen, ambang: aturan.plagiasi.ambangPersen, lolos: persen <= aturan.plagiasi.ambangPersen, waktu: new Date(now).toISOString(), contoh: penyedia.contoh }
}

/* ---------------- Administrasi lulus ---------------- */

export interface BarisAdmin {
  id: string
  label: string
  rute?: string
  status: StatusAdmin
  catatan?: string
}

export const checklistAdmin = (fin: Finalisasi, aturan: Pick<AturanProdi, 'adminLulus'>): BarisAdmin[] =>
  aturan.adminLulus.item.map((i) => ({ ...i, status: fin.admin[i.id]?.status ?? 'BELUM', catatan: fin.admin[i.id]?.catatan }))

export const ajukanAdmin = (fin: Finalisasi, id: string, aturan: Pick<AturanProdi, 'adminLulus'>): Finalisasi => {
  if (!aturan.adminLulus.item.some((i) => i.id === id)) throw new Error('Item administrasi tidak dikenal.')
  if (fin.admin[id]?.status === 'SELESAI') return fin
  return { ...fin, admin: { ...fin.admin, [id]: { status: 'DIAJUKAN' } } }
}

/** Ringkasan kesiapan lulus. Pendaftaran wisuda dan status SELESAI hanya bila semua terpenuhi. */
export function siapLulus(fin: Finalisasi, revisi: Revisi[], aturan: Pick<AturanProdi, 'adminLulus'>): { ok: boolean; kurang: string[] } {
  const kurang: string[] = []
  if (!semuaRevisiDisetujui(revisi)) kurang.push('Revisi belum semua disetujui')
  if (!fin.naskah) kurang.push('Naskah final belum diunggah')
  if (!fin.plagiasi) kurang.push('Pemeriksaan kemiripan belum dilakukan')
  else if (!fin.plagiasi.lolos) kurang.push(`Kemiripan ${fin.plagiasi.persen}% melebihi ambang ${fin.plagiasi.ambang}%`)
  for (const b of checklistAdmin(fin, aturan)) if (b.status !== 'SELESAI') kurang.push(`${b.label} belum selesai`)
  return { ok: kurang.length === 0, kurang }
}

export const finalisasiBaru = (tugasAkhirId: string): Finalisasi => ({ tugasAkhirId, admin: {} })
