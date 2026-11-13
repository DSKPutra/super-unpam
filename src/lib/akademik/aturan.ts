import { ATURAN_PRODI, type AturanProdi, type AturanUjian, type Rubrik } from '../../data/aturan-akademik'
import type { JenisUjian } from './types'

// Pembaca konfigurasi aturan akademik dengan validasi. Konfigurasi tidak lengkap ditolak dengan pesan
// yang menyebut lokasi masalahnya, supaya kesalahan isi dari BAAK ketahuan saat build/tes, bukan di layar.

export class AturanTidakValid extends Error {
  constructor(public masalah: string[]) {
    super(`Konfigurasi aturan akademik tidak valid:\n- ${masalah.join('\n- ')}`)
  }
}

export function validasiAturan(daftar: AturanProdi[]): string[] {
  const m: string[] = []
  if (!daftar.some((a) => a.prodi === '*')) m.push("Tidak ada aturan bawaan (prodi '*').")
  const prodiDup = daftar.map((a) => a.prodi).filter((p, i, arr) => arr.indexOf(p) !== i)
  for (const p of new Set(prodiDup)) m.push(`Prodi "${p}" didefinisikan lebih dari sekali.`)

  for (const a of daftar) {
    const at = `prodi "${a.prodi}"`
    if (!Number.isInteger(a.desimal) || a.desimal < 0 || a.desimal > 4) m.push(`${at}: desimal harus bilangan bulat 0–4.`)
    for (const k of ['maksKarakterJudul', 'kuotaBimbingan', 'jedaBimbinganHari', 'perkiraanSksPerSemester', 'jumlahPilihanPembimbing'] as const) if (!(a[k] > 0)) m.push(`${at}: ${k} harus lebih dari 0.`)
    if (!(a.ambangKemiripanJudul > 0 && a.ambangKemiripanJudul <= 1)) m.push(`${at}: ambangKemiripanJudul harus 0–1.`)
    if (a.hurufMutu.length === 0) m.push(`${at}: hurufMutu kosong.`)
    if (!a.hurufMutu.some((h) => h.min === 0)) m.push(`${at}: hurufMutu harus punya batas min 0 agar setiap nilai mendapat huruf.`)

    const jenisDup = a.ujian.map((u) => u.jenis).filter((j, i, arr) => arr.indexOf(j) !== i)
    for (const j of new Set(jenisDup)) m.push(`${at}: ujian ${j} didefinisikan lebih dari sekali.`)
    for (const u of a.ujian) {
      if (!u.nama.trim()) m.push(`${at}, ujian ${u.jenis}: nama kosong.`)
      if (!(u.jedaMinimalMenit >= 0)) m.push(`${at}, ujian ${u.jenis}: jedaMinimalMenit tidak valid.`)
      for (const s of u.syarat) {
        if (s.id === 'kehadiran' && !(s.minPersen >= 0 && s.minPersen <= 100)) m.push(`${at}, ujian ${u.jenis}: minPersen kehadiran harus 0–100.`)
        if ((s.id === 'sks' || s.id === 'bimbingan') && !(Number.isInteger(s.minimal) && s.minimal >= 0)) m.push(`${at}, ujian ${u.jenis}: minimal ${s.id} harus bilangan bulat ≥ 0.`)
        if (s.id === 'ipk' && !(s.minimal >= 0 && s.minimal <= 4)) m.push(`${at}, ujian ${u.jenis}: minimal IPK harus 0–4.`)
        if (s.id === 'berkas' && s.wajib.length === 0) m.push(`${at}, ujian ${u.jenis}: syarat berkas tanpa daftar berkas.`)
      }
    }
    for (const r of a.rubrik) m.push(...validasiRubrik(r).map((x) => `${at}, rubrik ${r.jenis}: ${x}`))
  }
  return m
}

export function validasiRubrik(r: Rubrik): string[] {
  const m: string[] = []
  if (r.kriteria.length === 0) m.push('tanpa kriteria.')
  const total = r.kriteria.reduce((s, k) => s + k.bobot, 0)
  if (Math.abs(total - 100) > 1e-9) m.push(`jumlah bobot ${total}%, harus 100%.`)
  for (const k of r.kriteria) {
    if (!(k.bobot > 0)) m.push(`kriteria ${k.id}: bobot harus > 0.`)
    if (!(k.maks > k.min)) m.push(`kriteria ${k.id}: maks harus lebih besar dari min.`)
  }
  return m
}

/** Aturan efektif untuk sebuah prodi: aturan prodi (bila ada) menimpa bawaan per field. */
export function aturanUntuk(prodi: string, daftar: AturanProdi[] = ATURAN_PRODI): AturanProdi {
  const masalah = validasiAturan(daftar)
  if (masalah.length) throw new AturanTidakValid(masalah)
  const bawaan = daftar.find((a) => a.prodi === '*')!
  const khusus = daftar.find((a) => a.prodi === prodi)
  if (!khusus) return bawaan
  const gabung = <T extends { jenis: JenisUjian }>(b: T[], k: T[]) => [...k, ...b.filter((x) => !k.some((y) => y.jenis === x.jenis))]
  return { ...bawaan, ...khusus, ujian: gabung(bawaan.ujian, khusus.ujian), rubrik: gabung(bawaan.rubrik, khusus.rubrik) }
}

export function aturanUjian(aturan: AturanProdi, jenis: JenisUjian): AturanUjian {
  const u = aturan.ujian.find((x) => x.jenis === jenis)
  if (!u) throw new AturanTidakValid([`Tidak ada aturan untuk ujian ${jenis} (prodi "${aturan.prodi}").`])
  return u
}

export function rubrikUntuk(aturan: AturanProdi, jenis: JenisUjian): Rubrik | undefined {
  return aturan.rubrik.find((r) => r.jenis === jenis)
}

/** true bila nilai aturan belum diverifikasi manusia (tampilkan label "contoh"). */
export const masihContoh = (x: { sumber: string | null }) => x.sumber === null
