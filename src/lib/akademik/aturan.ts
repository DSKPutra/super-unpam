import type { AturanAkademik, JenisUjianAkhir } from './types'

export type HasilValidasi = { ok: true; aturan: AturanAkademik } | { ok: false; galat: string[] }

const JENIS_AKHIR: JenisUjianAkhir[] = ['PROPOSAL', 'SEMINAR_HASIL', 'UAPS', 'SIDANG']
const positif = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0

/**
 * Validasi konfigurasi aturan. Konfigurasi tak lengkap/tidak konsisten DITOLAK dengan pesan jelas,
 * bukan diperbaiki diam-diam, karena angka ini menentukan hak ujian mahasiswa.
 */
export function validasiAturan(a: AturanAkademik): HasilValidasi {
  const g: string[] = []
  const at = (path: string, ok: boolean, pesan: string) => !ok && g.push(`${a?.id ?? '?'} › ${path}: ${pesan}`)

  at('id', !!a?.id, 'wajib diisi')
  at('prodi', !!a?.prodi, "wajib diisi ('*' untuk umum)")
  at('sumber', !!a?.sumber && 'dokumen' in a.sumber && 'diverifikasi' in a.sumber, 'wajib punya kolom dokumen & diverifikasi (boleh null = TODO(BAAK))')

  const us = a?.ujianSemester
  at('ujianSemester.minKehadiranPersen', positif(us?.minKehadiranPersen) && us.minKehadiranPersen <= 100, 'harus 0–100')
  at('ujianSemester.jedaBeruntunMenit', positif(us?.jedaBeruntunMenit), 'harus angka ≥ 0')
  for (const j of ['UTS', 'UAS', 'SUSULAN', 'REMEDIAL'] as const) at(`ujianSemester.tataTertib.${j}`, Array.isArray(us?.tataTertib?.[j]), 'wajib berupa daftar')

  const s = a?.skripsi
  at('skripsi.minSks', positif(s?.minSks), 'harus angka ≥ 0')
  at('skripsi.minIpk', positif(s?.minIpk) && s.minIpk <= 4, 'harus 0–4')
  at('skripsi.maksJudulKarakter', positif(s?.maksJudulKarakter) && s.maksJudulKarakter > 0, 'harus > 0')
  at('skripsi.jumlahPilihanPembimbing', positif(s?.jumlahPilihanPembimbing) && s.jumlahPilihanPembimbing >= 1, 'minimal 1')
  at('skripsi.ambangKemiripanJudul', positif(s?.ambangKemiripanJudul) && s.ambangKemiripanJudul <= 1, 'harus 0–1')

  for (const j of JENIS_AKHIR) {
    const u = a?.ujianAkhir?.[j]
    if (!u) {
      at(`ujianAkhir.${j}`, false, 'wajib ada (pakai aktif:false bila tidak dipakai prodi)')
      continue
    }
    at(`ujianAkhir.${j}.nama`, !!u.nama, 'wajib diisi')
    at(`ujianAkhir.${j}.jumlahPenguji`, positif(u.jumlahPenguji) && u.jumlahPenguji >= 1, 'minimal 1')
    at(`ujianAkhir.${j}.minBimbingan`, positif(u.minBimbingan), 'harus angka ≥ 0')
    at(`ujianAkhir.${j}.berkas`, Array.isArray(u.berkas) && u.berkas.every((b) => b.id && b.tipe.length && b.maksMB > 0), 'tiap berkas wajib punya id, tipe, maksMB > 0')
  }

  const p = a?.penilaian
  const rubrik = p?.rubrik ?? []
  at('penilaian.rubrik', rubrik.length > 0, 'minimal satu kriteria')
  const total = rubrik.reduce((t, k) => t + k.bobot, 0)
  at('penilaian.rubrik', rubrik.length === 0 || Math.abs(total - 100) < 1e-9, `total bobot harus 100, sekarang ${total}`)
  for (const k of rubrik) at(`penilaian.rubrik.${k.id}`, k.min < k.max, `min (${k.min}) harus < max (${k.max})`)
  at('penilaian.desimal', Number.isInteger(p?.desimal) && p.desimal >= 0 && p.desimal <= 4, 'bilangan bulat 0–4')
  const hm = p?.hurufMutu ?? []
  at('penilaian.hurufMutu', hm.length > 0 && hm.some((h) => h.min === 0), 'wajib ada dan mencakup batas 0')
  at('penilaian.hurufMutu', hm.every((h, i) => i === 0 || hm[i - 1].min > h.min), 'harus urut menurun menurut min')

  at('revisi.batasHari', positif(a?.revisi?.batasHari), 'harus angka ≥ 0')
  at('kelulusan.opsiPublikasi', (a?.kelulusan?.opsiPublikasi?.length ?? 0) > 0, 'minimal satu opsi')

  return g.length ? { ok: false, galat: g } : { ok: true, aturan: a }
}

/** Pilih aturan prodi; jatuh ke aturan umum ('*'). Melempar bila tak ada atau tak valid. */
export function aturanUntukProdi(daftar: AturanAkademik[], prodi: string): AturanAkademik {
  const pilih = daftar.find((a) => a.prodi === prodi) ?? daftar.find((a) => a.prodi === '*')
  if (!pilih) throw new Error(`Tidak ada aturan akademik untuk prodi "${prodi}" maupun aturan umum ('*').`)
  const v = validasiAturan(pilih)
  if (!v.ok) throw new Error(`Aturan akademik tidak valid:\n- ${v.galat.join('\n- ')}`)
  return v.aturan
}

/** True selama aturan belum diverifikasi manusia → UI menampilkan label "Aturan contoh". */
export const aturanContoh = (a: AturanAkademik) => a.sumber.diverifikasi === null

/** Jenis ujian akhir yang aktif, urut sesuai alur. */
export const jenisAkhirAktif = (a: AturanAkademik) => JENIS_AKHIR.filter((j) => a.ujianAkhir[j].aktif)
