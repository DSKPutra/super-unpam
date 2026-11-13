import type { AturanUjian, DefinisiSyarat } from '../../data/aturan-akademik'
import { masihContoh } from './aturan'
import type { HasilKelayakan, HasilSyarat, ProfilKelayakan } from './types'

// evaluasiKelayakan: syarat dibaca dari aturan (data), alasan dalam kalimat yang bisa ditindaklanjuti.
// Hasil ini hanya tampilan/pengajuan; keputusan resmi tetap dari server (T-ATURAN 3).

const fmtIpk = (n: number) => n.toFixed(2)

function cek(s: DefinisiSyarat, m: ProfilKelayakan, kodeMK: string | undefined, contoh: boolean): HasilSyarat {
  switch (s.id) {
    case 'kehadiran': {
      const v = kodeMK ? m.kehadiran[kodeMK] : undefined
      if (v === undefined) return { id: s.id, label: 'Kehadiran', terpenuhi: false, alasan: 'Data kehadiran belum tersedia.', tautanPerbaikan: 'presensi', contoh }
      const ok = v >= s.minPersen
      return { id: s.id, label: 'Kehadiran', terpenuhi: ok, alasan: ok ? `Kehadiran ${Math.round(v)}%` : `Kehadiran ${Math.round(v)}%, minimal ${s.minPersen}%`, tautanPerbaikan: ok ? undefined : 'presensi', contoh }
    }
    case 'keuangan':
      return { id: s.id, label: 'Administrasi keuangan', terpenuhi: m.keuanganLunas, alasan: m.keuanganLunas ? 'Tidak ada tagihan yang menghalangi' : 'Masih ada tagihan yang harus dilunasi', tautanPerbaikan: m.keuanganLunas ? undefined : 'keuangan', contoh: false }
    case 'sks': {
      const ok = m.sks >= s.minimal
      return { id: s.id, label: 'SKS lulus', terpenuhi: ok, alasan: ok ? `${m.sks} SKS` : `${m.sks} SKS, minimal ${s.minimal} SKS`, tautanPerbaikan: ok ? undefined : 'akademik/nilai', contoh }
    }
    case 'ipk': {
      const ok = m.ipk >= s.minimal
      return { id: s.id, label: 'IPK', terpenuhi: ok, alasan: ok ? `IPK ${fmtIpk(m.ipk)}` : `IPK ${fmtIpk(m.ipk)}, minimal ${fmtIpk(s.minimal)}`, tautanPerbaikan: ok ? undefined : 'akademik/nilai', contoh }
    }
    case 'bimbingan': {
      const ok = m.bimbinganDisetujui >= s.minimal
      return { id: s.id, label: 'Bimbingan disetujui', terpenuhi: ok, alasan: `${m.bimbinganDisetujui} dari ${s.minimal} bimbingan disetujui`, tautanPerbaikan: ok ? undefined : 'ta', contoh }
    }
    case 'persetujuan-pembimbing':
      return { id: s.id, label: 'Persetujuan pembimbing', terpenuhi: m.persetujuanPembimbing, alasan: m.persetujuanPembimbing ? 'Sudah disetujui pembimbing' : 'Belum disetujui pembimbing', tautanPerbaikan: m.persetujuanPembimbing ? undefined : 'ta', contoh: false }
    case 'berkas': {
      const kurang = s.wajib.filter((b) => !m.berkas.includes(b.id))
      return { id: s.id, label: 'Berkas', terpenuhi: kurang.length === 0, alasan: kurang.length ? `Belum lengkap: ${kurang.map((b) => b.label).join(', ')}` : 'Semua berkas wajib terverifikasi', tautanPerbaikan: kurang.length ? 'ta' : undefined, contoh }
    }
    case 'mk-wajib': {
      const kurang = s.kode.filter((k) => !m.mkLulus.includes(k.kode))
      return { id: s.id, label: 'Mata kuliah wajib', terpenuhi: kurang.length === 0, alasan: kurang.length ? `Belum lulus: ${kurang.map((k) => k.nama).join(', ')}` : 'Semua mata kuliah wajib lulus', tautanPerbaikan: kurang.length ? 'akademik/krs' : undefined, contoh }
    }
  }
}

/**
 * Menilai kelayakan satu ujian. `kodeMK` wajib untuk syarat kehadiran (ujian semester).
 * Layak hanya bila SEMUA syarat terpenuhi; urutan syarat mengikuti konfigurasi.
 */
export function evaluasiKelayakan(m: ProfilKelayakan, aturan: AturanUjian, kodeMK?: string): HasilKelayakan {
  const contoh = masihContoh(aturan)
  const syarat = aturan.syarat.map((s) => cek(s, m, kodeMK, contoh))
  return { layak: syarat.every((s) => s.terpenuhi), syarat }
}

/** Ringkasan untuk pembaca layar, mis. "Belum memenuhi 2 dari 3 syarat: Kehadiran, Berkas". */
export function ringkasKelayakan(h: HasilKelayakan): string {
  const gagal = h.syarat.filter((s) => !s.terpenuhi)
  return gagal.length === 0 ? `Memenuhi semua ${h.syarat.length} syarat` : `Belum memenuhi ${gagal.length} dari ${h.syarat.length} syarat: ${gagal.map((s) => s.label).join(', ')}`
}
