import type { AturanAkademik, HasilKelayakan, JenisUjian, ProfilAkademik, Syarat } from './types'

/** Target evaluasi: ujian semester per MK, ujian akhir, atau syarat MULAI skripsi. */
export type TargetKelayakan = { jenis: JenisUjian; kodeMk?: string } | { jenis: 'MULAI_TA' }

const fmtIpk = (n: number) => n.toFixed(2).replace('.', ',')

/**
 * Evaluasi kelayakan. Mengembalikan setiap syarat (terpenuhi atau tidak) beserta alasan yang
 * bisa ditindaklanjuti dan rute perbaikannya. Keputusan resmi tetap dari server; ini untuk tampilan.
 */
export function evaluasiKelayakan(m: ProfilAkademik, target: TargetKelayakan, a: AturanAkademik): HasilKelayakan {
  const syarat: Syarat[] = []
  const add = (s: Syarat) => syarat.push(s)

  const keuangan = (wajib: boolean) =>
    wajib &&
    add({
      id: 'keuangan',
      label: 'Administrasi keuangan',
      terpenuhi: m.tagihanLunas,
      alasan: m.tagihanLunas ? 'Tagihan lunas' : 'Masih ada tagihan yang belum dibayar',
      tautanPerbaikan: 'keuangan',
    })

  if (target.jenis === 'MULAI_TA') {
    const s = a.skripsi
    add({ id: 'sks', label: 'SKS lulus', terpenuhi: m.sks >= s.minSks, alasan: `${m.sks} SKS, minimal ${s.minSks}`, tautanPerbaikan: 'akademik/nilai' })
    add({ id: 'ipk', label: 'IPK', terpenuhi: m.ipk >= s.minIpk, alasan: `IPK ${fmtIpk(m.ipk)}, minimal ${fmtIpk(s.minIpk)}`, tautanPerbaikan: 'akademik/nilai' })
    for (const mk of s.mkWajib) {
      const ok = m.mkLulus.includes(mk.kode)
      add({ id: `mk-${mk.kode}`, label: `Lulus ${mk.nama}`, terpenuhi: ok, alasan: ok ? `${mk.nama} sudah lulus` : `${mk.nama} (${mk.kode}) belum lulus`, tautanPerbaikan: 'akademik/krs' })
    }
  } else if (target.jenis === 'UTS' || target.jenis === 'UAS' || target.jenis === 'SUSULAN' || target.jenis === 'REMEDIAL') {
    const min = a.ujianSemester.minKehadiranPersen
    const hadir = target.kodeMk ? m.kehadiran[target.kodeMk] : undefined
    add({
      id: 'kehadiran',
      label: 'Kehadiran',
      terpenuhi: hadir !== undefined && hadir >= min,
      alasan: hadir === undefined ? `Data kehadiran ${target.kodeMk ?? ''} belum tersedia, minimal ${min}%` : `Kehadiran ${Math.round(hadir)}%, minimal ${min}%`,
      tautanPerbaikan: 'presensi',
    })
    keuangan(a.ujianSemester.wajibLunas)
  } else {
    const u = a.ujianAkhir[target.jenis]
    if (!u.aktif) add({ id: 'aktif', label: u.nama, terpenuhi: false, alasan: `${u.nama} tidak dipakai di prodi ini` })
    add({
      id: 'bimbingan',
      label: 'Bimbingan disetujui',
      terpenuhi: m.bimbinganDisetujui >= u.minBimbingan,
      alasan: `${m.bimbinganDisetujui} dari ${u.minBimbingan} bimbingan disetujui`,
      tautanPerbaikan: 'ta/bimbingan',
    })
    if (u.butuhPersetujuanPembimbing)
      add({
        id: 'persetujuan',
        label: 'Persetujuan pembimbing',
        terpenuhi: m.persetujuanPembimbing,
        alasan: m.persetujuanPembimbing ? 'Pembimbing sudah menyatakan layak' : 'Pembimbing belum menyatakan layak ujian',
        tautanPerbaikan: 'ta/bimbingan',
      })
    keuangan(u.butuhLunas)
    for (const b of u.berkas.filter((b) => b.wajib)) {
      const ok = m.berkasTerverifikasi.includes(b.id)
      add({ id: `berkas-${b.id}`, label: b.nama, terpenuhi: ok, alasan: ok ? 'Terverifikasi' : 'Belum diunggah atau belum diverifikasi', tautanPerbaikan: 'ta/ujian' })
    }
  }
  return { layak: syarat.every((s) => s.terpenuhi), syarat }
}

/** Ringkasan untuk pembaca layar, mis. "2 dari 3 syarat terpenuhi". */
export const ringkasKelayakan = (h: HasilKelayakan) => `${h.syarat.filter((s) => s.terpenuhi).length} dari ${h.syarat.length} syarat terpenuhi`
