import { request } from '../api'
import { transisi, type Peristiwa } from '../akademik/alur-skripsi'
import type { DataPengajuanJudul } from '../akademik/judul'
import type { PeranAlur, PermintaanPerubahan, RingkasanTA, TugasAkhir } from '../akademik/types'
import type { DariSumber } from '../types'

/** Sumber data Skripsi/TA. Komponen hanya mengenal antarmuka ini. */
export interface SumberTA {
  ringkasan(): Promise<DariSumber<RingkasanTA>>
  /** Pengajuan judul yang menunggu keputusan dosen. */
  antrian(): Promise<DariSumber<TugasAkhir[]>>
  /**
   * Jalankan peristiwa alur. Mode http: server menentukan pelaku dari sesi dan menjalankan mesin alur;
   * `pelaku` hanya dipakai mode demo (peran demo bisa diganti dari Profil — TIDAK aman, label demo).
   */
  peristiwa(p: { taId?: string; peristiwa: Peristiwa; catatan?: string; pembimbing?: string[]; judul?: DataPengajuanJudul }, pelaku: PeranAlur): Promise<DariSumber<TugasAkhir>>
  ajukanPerubahan(taId: string, data: Pick<PermintaanPerubahan, 'jenis' | 'usulan' | 'alasan'>): Promise<DariSumber<TugasAkhir>>
}

/* ---------- Demo: disimpan di localStorage perangkat ini (data contoh), dihapus saat keluar akun ---------- */

export const TA_DEMO_KEY = 'su:ta:demo'
interface StoreDemo {
  milikSaya: TugasAkhir | null
  antrian: TugasAkhir[] | null
}
const demo = () => import('../../data/demo')
const baca = (): StoreDemo => {
  try {
    return JSON.parse(localStorage.getItem(TA_DEMO_KEY) ?? '') as StoreDemo
  } catch {
    return { milikSaya: null, antrian: null }
  }
}
const tulis = (s: StoreDemo) => {
  try {
    localStorage.setItem(TA_DEMO_KEY, JSON.stringify(s))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}
const contoh = <T>(data: T): DariSumber<T> => ({ data, asal: 'contoh' })

export const taDemo: SumberTA = {
  async ringkasan() {
    const d = await demo()
    return contoh({ tugasAkhir: baca().milikSaya, dosen: d.dosenPembimbing, judulTerdaftar: d.judulTerdaftar })
  },
  async antrian() {
    const s = baca()
    const awal = s.antrian ?? (await demo()).antrianJudul
    const milik = s.milikSaya?.status === 'DIAJUKAN' ? [s.milikSaya] : []
    return contoh([...milik, ...awal.filter((t) => t.status === 'DIAJUKAN')])
  },
  async peristiwa(p, pelaku) {
    const s = baca()
    const antrian = s.antrian ?? (await demo()).antrianJudul
    let ta = p.taId ? (s.milikSaya?.id === p.taId ? s.milikSaya : antrian.find((t) => t.id === p.taId) ?? null) : s.milikSaya
    if (!ta && p.peristiwa === 'AJUKAN_JUDUL') ta = { id: `ta-demo-${Date.now().toString(36)}`, judul: '', abstrak: '', bidang: '', metode: '', pilihanPembimbing: [], pembimbing: [], status: 'DRAF_JUDUL', riwayat: [], perubahan: [] }
    if (!ta) throw new Error('Tugas akhir tidak ditemukan.')
    if (p.judul && ta.status === 'DRAF_JUDUL') ta = { ...ta, ...p.judul }
    const r = transisi(ta, p.peristiwa, { pelaku, catatan: p.catatan, pembimbing: p.pembimbing })
    if (!r.ok) throw new Error(r.galat)
    // TA milik pengguna: yang sudah tersimpan sebagai miliknya, atau yang baru ia ajukan sebagai mahasiswa.
    const milikku = s.milikSaya?.id === r.ta.id || (!s.milikSaya && pelaku === 'MAHASISWA')
    tulis({ milikSaya: milikku ? r.ta : s.milikSaya, antrian: antrian.map((t) => (t.id === r.ta.id ? r.ta : t)) })
    return contoh(r.ta)
  },
  async ajukanPerubahan(taId, data) {
    const s = baca()
    if (!s.milikSaya || s.milikSaya.id !== taId) throw new Error('Tugas akhir tidak ditemukan.')
    const ta: TugasAkhir = { ...s.milikSaya, perubahan: [{ ...data, id: `pr-${Date.now().toString(36)}`, status: 'DIAJUKAN', diajukan: new Date().toISOString() }, ...s.milikSaya.perubahan] }
    tulis({ ...s, milikSaya: ta })
    return contoh(ta)
  },
}

/* ---------- BFF ---------- */

export const taHttp: SumberTA = {
  ringkasan: () => request('ta/ringkasan'),
  antrian: () => request('ta/antrian'),
  peristiwa: (p) => request('ta/peristiwa', { method: 'POST', body: JSON.stringify(p) }),
  // TODO(BFF): endpoint permintaan perubahan judul/pembimbing.
  ajukanPerubahan: () => Promise.reject(new Error('Pengajuan perubahan belum tersedia di server.')),
}
