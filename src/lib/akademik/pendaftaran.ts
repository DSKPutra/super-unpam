import type { AturanBerkas, AturanProdi, AturanUjian } from '../../data/aturan-akademik.js'
import { transisi, type Peristiwa } from './alur-skripsi.js'
import { evaluasiKelayakan } from './kelayakan.js'
import { deteksiBentrok } from './bentrok.js'
import type { BerkasUjian, HasilKelayakan, JenisUjianAkhir, TugasAkhir, PendaftaranUjianAkhir, PeranAlur, ProfilKelayakan, SesiUjian, SlotUjian, StatusPendaftaran, StatusTugasAkhir } from './types.js'

// Pendaftaran ujian akhir (T05): mesin status, checklist berkas, validasi slot, dan profil kelayakan.
// Fungsi murni; dijalankan di klien (pratinjau) DAN di BFF (penegakan). Tes di pendaftaran.test.ts.

export type AksiPendaftaran = 'KIRIM' | 'SETUJUI_PEMBIMBING' | 'TOLAK_PEMBIMBING' | 'PILIH_SLOT' | 'JADWAL_ULANG' | 'BATALKAN'

export interface KonteksPendaftaran {
  pelaku: PeranAlur
  /**
   * KIRIM: siapKirim(...).ok (syarat selain persetujuan & verifikasi berkas, berkas wajib sudah diunggah).
   * PILIH_SLOT: evaluasiKelayakan penuh (semua syarat, termasuk persetujuan & berkas terverifikasi).
   */
  layak?: boolean
  slot?: SlotUjian
  catatan?: string
  sekarang: number
  aturan: Pick<AturanUjian, 'batasBatalJam' | 'berkas'>
}

type Hasil = { ok: true; p: PendaftaranUjianAkhir } | { ok: false; galat: string }

interface AturanAksi {
  dari: StatusPendaftaran[]
  ke: StatusPendaftaran
  pelaku: PeranAlur[]
  jaga?: (p: PendaftaranUjianAkhir, k: KonteksPendaftaran) => string | undefined
}

/** Jam tersisa sebelum ujian terjadwal dimulai; Infinity bila belum terjadwal. */
const jamSebelumUjian = (p: PendaftaranUjianAkhir, now: number) => (p.sesi ? (Date.parse(p.sesi.mulai) - now) / 3_600_000 : Infinity)
const dalamBatas = (p: PendaftaranUjianAkhir, k: KonteksPendaftaran) =>
  k.aturan.batasBatalJam !== undefined && jamSebelumUjian(p, k.sekarang) < k.aturan.batasBatalJam ? `Sudah melewati batas ${k.aturan.batasBatalJam} jam sebelum ujian.` : undefined

export const TABEL_PENDAFTARAN: Record<AksiPendaftaran, AturanAksi> = {
  KIRIM: { dari: ['DRAF'], ke: 'MENUNGGU_PEMBIMBING', pelaku: ['MAHASISWA'], jaga: (_, k) => (k.layak ? undefined : 'Syarat pendaftaran belum terpenuhi.') },
  SETUJUI_PEMBIMBING: {
    dari: ['MENUNGGU_PEMBIMBING'],
    ke: 'DIVERIFIKASI_PRODI',
    pelaku: ['DOSEN'],
    jaga: (p, k) => (checklistBerkas(k.aturan, p.berkas).some((b) => b.aturan.wajib && b.status !== 'DIVERIFIKASI') ? 'Semua berkas wajib harus diverifikasi lebih dulu.' : undefined),
  },
  TOLAK_PEMBIMBING: { dari: ['MENUNGGU_PEMBIMBING'], ke: 'DRAF', pelaku: ['DOSEN'], jaga: (_, k) => (k.catatan?.trim() ? undefined : 'Alasan wajib diisi.') },
  PILIH_SLOT: {
    dari: ['DIVERIFIKASI_PRODI'],
    ke: 'TERJADWAL',
    // Slot ditawarkan prodi; memilihnya = menerima jadwal. Kapasitas & bentrok divalidasi terpisah (validasiSlot).
    pelaku: ['MAHASISWA', 'PRODI'],
    jaga: (p, k) => (!k.slot ? 'Slot belum dipilih.' : k.slot.jenis !== p.jenis ? 'Slot bukan untuk jenis ujian ini.' : k.layak ? undefined : 'Syarat ujian belum terpenuhi.'),
  },
  JADWAL_ULANG: { dari: ['TERJADWAL'], ke: 'DIVERIFIKASI_PRODI', pelaku: ['MAHASISWA'], jaga: dalamBatas },
  BATALKAN: { dari: ['MENUNGGU_PEMBIMBING', 'DIVERIFIKASI_PRODI', 'TERJADWAL'], ke: 'DIBATALKAN', pelaku: ['MAHASISWA'], jaga: dalamBatas },
}

export function transisiPendaftaran(p: PendaftaranUjianAkhir, aksi: AksiPendaftaran, k: KonteksPendaftaran): Hasil {
  const a = TABEL_PENDAFTARAN[aksi]
  if (!a.dari.includes(p.status)) return { ok: false, galat: `Aksi ${aksi} tidak sah dari status ${p.status}.` }
  if (!a.pelaku.includes(k.pelaku)) return { ok: false, galat: `${k.pelaku} tidak berwenang melakukan ${aksi}.` }
  const g = a.jaga?.(p, k)
  if (g) return { ok: false, galat: g }
  const sesi: SesiUjian | undefined =
    aksi === 'PILIH_SLOT' && k.slot ? { id: `${p.id}:${k.slot.id}`, jenis: p.jenis, kode: p.tugasAkhirId, nama: p.jenis, mulai: k.slot.mulai, selesai: k.slot.selesai, ruang: k.slot.ruang, petugas: k.slot.penguji } : aksi === 'JADWAL_ULANG' || aksi === 'BATALKAN' ? undefined : p.sesi
  return {
    ok: true,
    p: { ...p, status: a.ke, sesi, riwayat: [...p.riwayat, { dari: p.status, ke: a.ke, aksi, pelaku: k.pelaku, waktu: new Date(k.sekarang).toISOString(), ...(k.catatan ? { catatan: k.catatan } : {}) }] },
  }
}

/** Aksi yang tersedia untuk sebuah peran dari status saat ini (untuk menampilkan tombol). */
export const aksiTersedia = (status: StatusPendaftaran, pelaku: PeranAlur) =>
  (Object.keys(TABEL_PENDAFTARAN) as AksiPendaftaran[]).filter((a) => TABEL_PENDAFTARAN[a].dari.includes(status) && TABEL_PENDAFTARAN[a].pelaku.includes(pelaku))

/* ---------------- Jenis ujian per tahap ---------------- */

/** Ujian akhir yang bisa didaftarkan pada tahap alur TA, sesuai yang ada di konfigurasi prodi. */
export function jenisTersedia(status: StatusTugasAkhir, aturan: AturanProdi): JenisUjianAkhir[] {
  const kandidat: JenisUjianAkhir[] = ['BIMBINGAN', 'LAYAK_PROPOSAL'].includes(status) ? ['PROPOSAL'] : ['PENELITIAN', 'LAYAK_UJIAN_AKHIR'].includes(status) ? ['SEMINAR_HASIL', 'UAPS', 'SIDANG'] : []
  return kandidat.filter((j) => aturan.ujian.some((u) => u.jenis === j))
}

/* ---------------- Checklist berkas ---------------- */

export interface BarisBerkas {
  aturan: AturanBerkas
  berkas?: BerkasUjian
  status: 'BELUM' | BerkasUjian['status']
}

/** Berkas terakhir per jenis berkas (unggah ulang menggantikan tampilan, riwayat tetap di server). */
export function checklistBerkas(aturan: Pick<AturanUjian, 'berkas'>, berkas: BerkasUjian[]): BarisBerkas[] {
  return (aturan.berkas ?? []).map((a) => {
    const b = berkas.filter((x) => x.id === a.id).sort((x, y) => x.diunggah.localeCompare(y.diunggah)).at(-1)
    return { aturan: a, berkas: b, status: b?.status ?? 'BELUM' }
  })
}

export function validasiBerkasUjian(f: { size: number; type: string }, a: AturanBerkas): string | null {
  if (!a.tipe.includes(f.type)) return `Tipe berkas tidak diterima untuk ${a.label}.`
  if (f.size === 0) return 'Berkas kosong.'
  if (f.size > a.maksMB * 1024 * 1024) return `Ukuran melebihi ${a.maksMB} MB.`
  return null
}

/** Pembimbing memverifikasi/menolak satu berkas (hanya saat menunggu pembimbing). */
export function verifikasiBerkas(p: PendaftaranUjianAkhir, berkasId: string, status: 'DIVERIFIKASI' | 'DITOLAK', alasan?: string): Hasil {
  if (p.status !== 'MENUNGGU_PEMBIMBING') return { ok: false, galat: 'Berkas hanya diverifikasi saat menunggu pembimbing.' }
  if (status === 'DITOLAK' && !alasan?.trim()) return { ok: false, galat: 'Alasan penolakan berkas wajib diisi.' }
  const terakhir = p.berkas.filter((b) => b.id === berkasId).sort((x, y) => x.diunggah.localeCompare(y.diunggah)).at(-1)
  if (!terakhir) return { ok: false, galat: 'Berkas belum diunggah.' }
  return { ok: true, p: { ...p, berkas: p.berkas.map((b) => (b === terakhir ? { ...b, status, ...(alasan ? { alasan } : {}) } : b)) } }
}

/** Mahasiswa mengunggah (ulang) berkas: hanya saat DRAF; unggahan lama tetap tersimpan sebagai riwayat. */
export function unggahBerkas(p: PendaftaranUjianAkhir, b: Omit<BerkasUjian, 'status' | 'diunggah'>, a: Pick<AturanUjian, 'berkas'>, sekarang: number): Hasil {
  if (p.status !== 'DRAF') return { ok: false, galat: 'Berkas hanya bisa diubah sebelum diajukan ke pembimbing.' }
  const aturanB = a.berkas?.find((x) => x.id === b.id)
  if (!aturanB) return { ok: false, galat: 'Jenis berkas tidak dikenal.' }
  const g = validasiBerkasUjian({ size: b.ukuran, type: b.tipe }, aturanB)
  if (g) return { ok: false, galat: g }
  if (!/^[0-9a-f]{64}$/.test(b.sha256)) return { ok: false, galat: 'Hash SHA-256 tidak valid.' }
  return { ok: true, p: { ...p, berkas: [...p.berkas, { ...b, status: 'DIUNGGAH', diunggah: new Date(sekarang).toISOString() }] } }
}

/* ---------------- Kelayakan ---------------- */

/**
 * Siap diajukan ke pembimbing: semua syarat SELAIN persetujuan pembimbing dan verifikasi berkas terpenuhi,
 * dan setiap berkas wajib sudah diunggah (terakhir tidak berstatus ditolak).
 */
export function siapKirim(h: HasilKelayakan, aturan: Pick<AturanUjian, 'berkas'>, p: PendaftaranUjianAkhir | null): { ok: boolean; kurang: string[] } {
  const kurang = h.syarat.filter((s) => !s.terpenuhi && s.id !== 'persetujuan-pembimbing' && s.id !== 'berkas').map((s) => `${s.label}: ${s.alasan}`)
  for (const b of checklistBerkas(aturan, p?.berkas ?? [])) if (b.aturan.wajib && (b.status === 'BELUM' || b.status === 'DITOLAK')) kurang.push(b.status === 'DITOLAK' ? `${b.aturan.label} ditolak, unggah ulang` : `${b.aturan.label} belum diunggah`)
  return { ok: kurang.length === 0, kurang }
}


/**
 * Profil kelayakan untuk ujian akhir: data akademik/keuangan dari server, jumlah bimbingan SAH dari
 * logbook, berkas yang SUDAH diverifikasi, dan persetujuan pembimbing dari status pendaftaran.
 */
export function profilUjianAkhir(dasar: ProfilKelayakan, bimbinganSah: number, p: PendaftaranUjianAkhir | null): ProfilKelayakan {
  const disetujui = !!p && ['DIVERIFIKASI_PRODI', 'TERJADWAL'].includes(p.status)
  return { ...dasar, bimbinganDisetujui: bimbinganSah, persetujuanPembimbing: disetujui, berkas: (p?.berkas ?? []).filter((b) => b.status === 'DIVERIFIKASI').map((b) => b.id) }
}

/* ---------------- Slot ---------------- */

/** Galat bila slot tidak bisa dipilih: penuh, sudah lewat, bentrok jadwal mahasiswa, atau penguji bentrok. */
export function validasiSlot(slot: SlotUjian, sesiMahasiswa: SesiUjian[], sesiPenguji: SesiUjian[], sekarang: number): string | null {
  if (Date.parse(slot.mulai) <= sekarang) return 'Slot sudah lewat.'
  if (slot.terisi >= slot.kapasitas) return 'Slot sudah penuh.'
  const sebagaiSesi: SesiUjian = { id: `slot:${slot.id}`, jenis: slot.jenis, kode: slot.id, nama: 'Slot', mulai: slot.mulai, selesai: slot.selesai, ruang: slot.ruang, petugas: slot.penguji }
  const m = deteksiBentrok([sebagaiSesi, ...sesiMahasiswa]).find((b) => b.a.id === sebagaiSesi.id || b.b.id === sebagaiSesi.id)
  if (m) return `Bentrok dengan jadwal Anda: ${(m.a.id === sebagaiSesi.id ? m.b : m.a).nama}.`
  const relevan = sesiPenguji.filter((s) => s.petugas.some((x) => slot.penguji.includes(x)))
  const d = deteksiBentrok([sebagaiSesi, ...relevan]).find((b) => b.a.id === sebagaiSesi.id || b.b.id === sebagaiSesi.id)
  if (d) return 'Penguji pada slot ini sudah memiliki jadwal lain di waktu yang sama.'
  return null
}

/* ---------------- Sinkron dengan alur tugas akhir ---------------- */

/**
 * Peristiwa alur TA yang menyertai aksi pendaftaran: persetujuan pembimbing → "layak ujian",
 * pemilihan slot prodi → "dijadwalkan". null bila TA tidak sedang di tahap yang sesuai.
 */
export function peristiwaAlurUntuk(aksi: AksiPendaftaran, jenis: JenisUjianAkhir, statusTA: StatusTugasAkhir): { peristiwa: Peristiwa; pelaku: PeranAlur } | null {
  const proposal = jenis === 'PROPOSAL'
  if (aksi === 'SETUJUI_PEMBIMBING') {
    if (proposal && statusTA === 'BIMBINGAN') return { peristiwa: 'NYATAKAN_LAYAK_PROPOSAL', pelaku: 'DOSEN' }
    if (!proposal && statusTA === 'PENELITIAN') return { peristiwa: 'NYATAKAN_LAYAK_AKHIR', pelaku: 'DOSEN' }
  }
  if (aksi === 'PILIH_SLOT') {
    if (proposal && statusTA === 'LAYAK_PROPOSAL') return { peristiwa: 'JADWALKAN_PROPOSAL', pelaku: 'PRODI' }
    if (!proposal && statusTA === 'LAYAK_UJIAN_AKHIR') return { peristiwa: 'JADWALKAN_AKHIR', pelaku: 'PRODI' }
  }
  return null
}

/* ---------------- Inti bersama klien demo & BFF ---------------- */

export interface MasukanAksi {
  p: PendaftaranUjianAkhir
  ta: TugasAkhir
  aksi: AksiPendaftaran
  pelaku: PeranAlur
  aturan: AturanUjian
  /** Data dasar kelayakan dari server (akademik/keuangan). */
  profil: ProfilKelayakan
  bimbinganSah: number
  slot?: SlotUjian
  sesiMahasiswa: SesiUjian[]
  jadwalPenguji: SesiUjian[]
  catatan?: string
  sekarang: number
}

/**
 * Menjalankan satu aksi pendaftaran lengkap: menghitung kelayakan sendiri (tidak percaya klien),
 * memvalidasi slot, menjalankan transisi, lalu menyinkronkan alur TA bila perlu.
 */
export function jalankanAksi(m: MasukanAksi): { ok: true; p: PendaftaranUjianAkhir; ta: TugasAkhir } | { ok: false; galat: string } {
  const h = evaluasiKelayakan(profilUjianAkhir(m.profil, m.bimbinganSah, m.p), m.aturan)
  const layak = m.aksi === 'KIRIM' ? siapKirim(h, m.aturan, m.p).ok : h.layak
  if (m.aksi === 'PILIH_SLOT' && m.slot) {
    const g = validasiSlot(m.slot, m.sesiMahasiswa, m.jadwalPenguji, m.sekarang)
    if (g) return { ok: false, galat: g }
  }
  const r = transisiPendaftaran(m.p, m.aksi, { pelaku: m.pelaku, layak, slot: m.slot, catatan: m.catatan, sekarang: m.sekarang, aturan: m.aturan })
  if (!r.ok) return r
  const sinkron = peristiwaAlurUntuk(m.aksi, m.p.jenis, m.ta.status)
  if (!sinkron) return { ok: true, p: r.p, ta: m.ta }
  const t = transisi(m.ta, sinkron.peristiwa, { pelaku: sinkron.pelaku, layak: true, waktu: new Date(m.sekarang).toISOString() })
  return t.ok ? { ok: true, p: r.p, ta: t.ta } : { ok: false, galat: t.galat }
}

export const pendaftaranBaru = (id: string, ta: TugasAkhir, jenis: JenisUjianAkhir): PendaftaranUjianAkhir => ({ id, tugasAkhirId: ta.id, jenis, status: 'DRAF', berkas: [], riwayat: [] })
