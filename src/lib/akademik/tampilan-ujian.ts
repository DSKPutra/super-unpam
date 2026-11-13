import type { AturanUjian } from '../../data/aturan-akademik.js'
import { deteksiBentrok, deteksiBeruntun, type Bentrok, type Beruntun } from './bentrok.js'
import { evaluasiKelayakan } from './kelayakan.js'
import type { HasilKelayakan, JadwalUjianSemester, ProfilKelayakan, SesiUjian } from './types.js'

// Model tampilan Exam Center (T02): fungsi murni dari jadwal + data kelayakan + aturan.
// Komponen hanya merender hasil ini, sehingga keadaan layak/tidak layak/bentrok/kosong bisa diuji.

export interface BarisUjian {
  sesi: SesiUjian
  kelayakan: HasilKelayakan
  berubah: boolean
}

export interface TampilanUjian {
  kosong: boolean
  baris: BarisUjian[]
  /** Hanya sesi yang layak yang masuk kartu ujian dan QR. */
  layak: SesiUjian[]
  tidakLayak: BarisUjian[]
  bentrok: Bentrok[]
  beruntun: Beruntun[]
  /** Kartu (QR) hanya dibuat bila ada minimal satu mata kuliah yang layak. */
  adaKartu: boolean
}

export function susunTampilanUjian(jadwal: JadwalUjianSemester, profil: ProfilKelayakan, aturan: AturanUjian): TampilanUjian {
  const sesi = [...jadwal.sesi].sort((a, b) => Date.parse(a.mulai) - Date.parse(b.mulai) || a.id.localeCompare(b.id))
  const baris = sesi.map((s) => ({
    sesi: s,
    kelayakan: evaluasiKelayakan(profil, aturan, s.kode),
    berubah: !!s.sebelumnya && (s.sebelumnya.mulai !== s.mulai || s.sebelumnya.selesai !== s.selesai || s.sebelumnya.ruang !== s.ruang),
  }))
  const layak = baris.filter((b) => b.kelayakan.layak).map((b) => b.sesi)
  return {
    kosong: sesi.length === 0,
    baris,
    layak,
    tidakLayak: baris.filter((b) => !b.kelayakan.layak),
    // Bentrok dan beruntun dihitung dari SEMUA sesi: mahasiswa tetap perlu tahu walau satu MK belum layak.
    bentrok: deteksiBentrok(sesi),
    beruntun: deteksiBeruntun(sesi, aturan.jedaMinimalMenit),
    adaKartu: layak.length > 0,
  }
}

/** Batas akhir pengajuan susulan/remedial untuk sebuah sesi; null bila aturan tidak menetapkan. */
export function batasPengajuan(s: SesiUjian, aturan: AturanUjian): Date | null {
  if (aturan.batasPengajuanHari === undefined) return null
  return new Date(Date.parse(s.selesai) + aturan.batasPengajuanHari * 86_400_000)
}

export type GalatLampiran = { nama: string; alasan: string }

/** Validasi lampiran bukti terhadap aturan (tipe dan ukuran). Berkas tidak dibaca isinya di klien. */
export function validasiLampiran(berkas: { name: string; size: number; type: string }[], aturan: AturanUjian): GalatLampiran[] {
  const l = aturan.lampiran
  if (!l) return berkas.map((b) => ({ nama: b.name, alasan: 'Lampiran tidak diterima untuk jenis ujian ini.' }))
  const out: GalatLampiran[] = []
  for (const b of berkas) {
    if (!l.tipe.includes(b.type)) out.push({ nama: b.name, alasan: 'Tipe berkas tidak diterima.' })
    else if (b.size > l.maksMB * 1024 * 1024) out.push({ nama: b.name, alasan: `Ukuran melebihi ${l.maksMB} MB.` })
    else if (b.size === 0) out.push({ nama: b.name, alasan: 'Berkas kosong.' })
  }
  return out
}
