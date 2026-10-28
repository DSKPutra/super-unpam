import { request } from '../api'
import { transisi, type Peristiwa } from '../akademik/alur-skripsi'
import type { DataPengajuanJudul } from '../akademik/judul'
import { tambahVersi, bimbinganSah } from '../akademik/logbook'
import { aturanUjian, aturanUntuk } from '../akademik/aturan'
import { jalankanAksi, pendaftaranBaru, unggahBerkas, verifikasiBerkas as verifikasiBerkasMurni, type AksiPendaftaran } from '../akademik/pendaftaran'
import type { BerkasUjian, Bimbingan, JenisUjianAkhir, Logbook, PendaftaranUjianAkhir, PeranAlur, PermintaanPerubahan, RingkasanTA, SesiUjian, SlotUjian, TugasAkhir, VersiDraf } from '../akademik/types'
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
  logbook(taId: string): Promise<DariSumber<Logbook>>
  tambahEntri(taId: string, e: EntriBaru): Promise<DariSumber<Logbook>>
  tambahVersi(taId: string, v: Omit<VersiDraf, 'versi' | 'diunggah'>): Promise<DariSumber<Logbook>>
  /** Dosen (DEMO sampai BFF-AUTHZ): mahasiswa bimbingan beserta logbooknya. */
  bimbingan(): Promise<DariSumber<{ ta: TugasAkhir; logbook: Logbook }[]>>
  verifikasiEntri(taId: string, entriId: string, keputusan: 'DISETUJUI' | 'DITOLAK', catatan?: string): Promise<DariSumber<Logbook>>
  /** Pendaftaran ujian akhir milik TA ini + slot prodi + jadwal penguji (untuk cek bentrok). */
  ujianAkhir(taId: string): Promise<DariSumber<DataUjianAkhir>>
  buatPendaftaran(taId: string, jenis: JenisUjianAkhir): Promise<DariSumber<PendaftaranUjianAkhir>>
  unggahBerkasUjian(pendaftaranId: string, b: Omit<BerkasUjian, 'status' | 'diunggah'>): Promise<DariSumber<PendaftaranUjianAkhir>>
  /** Server menghitung kelayakan sendiri; `pelaku` hanya untuk mode demo. */
  aksiPendaftaran(pendaftaranId: string, aksi: AksiPendaftaran, opsi: { slotId?: string; catatan?: string }, pelaku: PeranAlur): Promise<DariSumber<{ pendaftaran: PendaftaranUjianAkhir; ta: TugasAkhir }>>
  verifikasiBerkasUjian(pendaftaranId: string, berkasId: string, status: 'DIVERIFIKASI' | 'DITOLAK', alasan?: string): Promise<DariSumber<PendaftaranUjianAkhir>>
  /** Dosen (DEMO): pendaftaran yang menunggu persetujuannya. */
  antrianUjianAkhir(): Promise<DariSumber<{ ta: TugasAkhir; pendaftaran: PendaftaranUjianAkhir }[]>>
}

export interface DataUjianAkhir {
  pendaftaran: PendaftaranUjianAkhir[]
  slot: SlotUjian[]
  jadwalPenguji: SesiUjian[]
  /** Jadwal ujian semester mahasiswa (UTS/UAS) untuk deteksi bentrok. */
  sesiMahasiswa: SesiUjian[]
}

export type EntriBaru = Pick<Bimbingan, 'tanggal' | 'bagian' | 'ringkasan' | 'tugasBerikutnya' | 'versiDraf'>

/* ---------- Demo: disimpan di localStorage perangkat ini (data contoh), dihapus saat keluar akun ---------- */

export const TA_DEMO_KEY = 'su:ta:demo'
export const LOGBOOK_DEMO_KEY = 'su:ta:logbook'
const bacaLb = (): Record<string, Logbook> => {
  try {
    return JSON.parse(localStorage.getItem(LOGBOOK_DEMO_KEY) ?? '{}') as Record<string, Logbook>
  } catch {
    return {}
  }
}
const tulisLb = (lb: Logbook) => {
  try {
    localStorage.setItem(LOGBOOK_DEMO_KEY, JSON.stringify({ ...bacaLb(), [lb.tugasAkhirId]: lb }))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}
export const UJIAN_AKHIR_DEMO_KEY = 'su:ta:ujian-akhir'
interface StoreUA {
  pendaftaran: PendaftaranUjianAkhir[]
  /** Tambahan kursi terisi per slot karena pilihan di perangkat ini. */
  terisi: Record<string, number>
}
const bacaUA = (): StoreUA => {
  try {
    return { pendaftaran: [], terisi: {}, ...(JSON.parse(localStorage.getItem(UJIAN_AKHIR_DEMO_KEY) ?? '{}') as Partial<StoreUA>) }
  } catch {
    return { pendaftaran: [], terisi: {} }
  }
}
const tulisUA = (s: StoreUA) => {
  try {
    localStorage.setItem(UJIAN_AKHIR_DEMO_KEY, JSON.stringify(s))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}
async function dataUA(taId: string): Promise<DataUjianAkhir> {
  const d = await demo()
  const s = bacaUA()
  return {
    pendaftaran: s.pendaftaran.filter((p) => p.tugasAkhirId === taId),
    slot: d.slotUjianAkhir.map((x) => ({ ...x, terisi: x.terisi + (s.terisi[x.id] ?? 0) })),
    jadwalPenguji: d.jadwalPenguji,
    sesiMahasiswa: [...d.ujianSemester.UTS.sesi, ...d.ujianSemester.UAS.sesi],
  }
}
const simpanPendaftaran = (p: PendaftaranUjianAkhir, ubahTerisi?: Record<string, number>) => {
  const s = bacaUA()
  const terisi = { ...s.terisi }
  for (const [k, v] of Object.entries(ubahTerisi ?? {})) terisi[k] = (terisi[k] ?? 0) + v
  tulisUA({ pendaftaran: [...s.pendaftaran.filter((x) => x.id !== p.id), p], terisi })
}
const cariPendaftaran = (id: string) => {
  const p = bacaUA().pendaftaran.find((x) => x.id === id)
  if (!p) throw new Error('Pendaftaran tidak ditemukan.')
  return p
}

async function lbDemo(taId: string): Promise<Logbook> {
  const d = await demo()
  return bacaLb()[taId] ?? (taId === d.logbookContoh.tugasAkhirId ? d.logbookContoh : { tugasAkhirId: taId, entri: [], versi: [] })
}
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
  logbook: async (taId) => contoh(await lbDemo(taId)),
  async tambahEntri(taId, e) {
    const lb = await lbDemo(taId)
    const baru: Logbook = { ...lb, entri: [...lb.entri, { ...e, id: `bb-${Date.now().toString(36)}`, tugasAkhirId: taId, status: 'MENUNGGU' }] }
    tulisLb(baru)
    return contoh(baru)
  },
  async tambahVersi(taId, v) {
    const lb = await lbDemo(taId)
    const baru: Logbook = { ...lb, versi: tambahVersi(lb.versi, v) }
    tulisLb(baru)
    return contoh(baru)
  },
  async bimbingan() {
    const d = await demo()
    const milik = baca().milikSaya
    const daftar = [d.taBimbinganContoh, ...(milik && milik.pembimbing.length ? [milik] : [])]
    return contoh(await Promise.all(daftar.map(async (ta) => ({ ta, logbook: await lbDemo(ta.id) }))))
  },
  async verifikasiEntri(taId, entriId, keputusan, catatan) {
    const lb = await lbDemo(taId)
    const e = lb.entri.find((x) => x.id === entriId)
    if (!e) throw new Error('Entri tidak ditemukan.')
    if (e.status !== 'MENUNGGU') throw new Error('Entri sudah diverifikasi.')
    if (keputusan === 'DITOLAK' && !catatan?.trim()) throw new Error('Alasan penolakan wajib diisi.')
    const baru: Logbook = { ...lb, entri: lb.entri.map((x) => (x.id === entriId ? { ...x, status: keputusan, catatanDosen: catatan, diverifikasi: { oleh: 'dosen-demo', waktu: new Date().toISOString() } } : x)) }
    tulisLb(baru)
    return contoh(baru)
  },
  ujianAkhir: async (taId) => contoh(await dataUA(taId)),
  async buatPendaftaran(taId, jenis) {
    const ta = baca().milikSaya
    if (!ta || ta.id !== taId) throw new Error('Tugas akhir tidak ditemukan.')
    const aktif = bacaUA().pendaftaran.find((p) => p.tugasAkhirId === taId && p.jenis === jenis && p.status !== 'DIBATALKAN')
    if (aktif) return contoh(aktif)
    const p = pendaftaranBaru(`pd-${Date.now().toString(36)}`, ta, jenis)
    simpanPendaftaran(p)
    return contoh(p)
  },
  async unggahBerkasUjian(pid, b) {
    const p = cariPendaftaran(pid)
    const r = unggahBerkas(p, b, aturanUjian(aturanUntuk((await demo()).profilKelayakan.prodi), p.jenis), Date.now())
    if (!r.ok) throw new Error(r.galat)
    simpanPendaftaran(r.p)
    return contoh(r.p)
  },
  async aksiPendaftaran(pid, aksi, opsi, pelaku) {
    const d = await demo()
    const p = cariPendaftaran(pid)
    const s = baca()
    const ta = s.milikSaya?.id === p.tugasAkhirId ? s.milikSaya : null
    if (!ta) throw new Error('Tugas akhir tidak ditemukan.')
    const data = await dataUA(ta.id)
    const slot = opsi.slotId ? data.slot.find((x) => x.id === opsi.slotId) : undefined
    if (opsi.slotId && !slot) throw new Error('Slot tidak ditemukan.')
    const r = jalankanAksi({
      p, ta, aksi, pelaku, aturan: aturanUjian(aturanUntuk(d.profilKelayakan.prodi), p.jenis), profil: d.profilKelayakan,
      bimbinganSah: bimbinganSah((await lbDemo(ta.id)).entri).length, slot, sesiMahasiswa: data.sesiMahasiswa, jadwalPenguji: data.jadwalPenguji, catatan: opsi.catatan, sekarang: Date.now(),
    })
    if (!r.ok) throw new Error(r.galat)
    // Kursi slot: bertambah saat dipilih, berkurang saat jadwal dilepas.
    const lepas = p.sesi && (aksi === 'JADWAL_ULANG' || aksi === 'BATALKAN') ? data.slot.find((x) => p.sesi!.id.endsWith(`:${x.id}`)) : undefined
    simpanPendaftaran(r.p, { ...(slot && aksi === 'PILIH_SLOT' ? { [slot.id]: 1 } : {}), ...(lepas ? { [lepas.id]: -1 } : {}) })
    tulis({ ...s, milikSaya: r.ta })
    return contoh({ pendaftaran: r.p, ta: r.ta })
  },
  async verifikasiBerkasUjian(pid, berkasId, status, alasan) {
    const r = verifikasiBerkasMurni(cariPendaftaran(pid), berkasId, status, alasan)
    if (!r.ok) throw new Error(r.galat)
    simpanPendaftaran(r.p)
    return contoh(r.p)
  },
  async antrianUjianAkhir() {
    const ta = baca().milikSaya
    return contoh(ta ? bacaUA().pendaftaran.filter((p) => p.tugasAkhirId === ta.id && p.status === 'MENUNGGU_PEMBIMBING').map((pendaftaran) => ({ ta, pendaftaran })) : [])
  },
}

/* ---------- BFF ---------- */

export const taHttp: SumberTA = {
  ringkasan: () => request('ta/ringkasan'),
  antrian: () => request('ta/antrian'),
  peristiwa: (p) => request('ta/peristiwa', { method: 'POST', body: JSON.stringify(p) }),
  // TODO(BFF): endpoint permintaan perubahan judul/pembimbing.
  ajukanPerubahan: () => Promise.reject(new Error('Pengajuan perubahan belum tersedia di server.')),
  logbook: (taId) => request(`ta/logbook?taId=${encodeURIComponent(taId)}`),
  tambahEntri: (taId, e) => request('ta/entri', { method: 'POST', body: JSON.stringify({ taId, ...e }) }),
  tambahVersi: (taId, v) => request('ta/versi', { method: 'POST', body: JSON.stringify({ taId, ...v }) }),
  bimbingan: () => request('ta/bimbingan'),
  verifikasiEntri: (taId, entriId, keputusan, catatan) => request('ta/verifikasi', { method: 'POST', body: JSON.stringify({ taId, entriId, keputusan, catatan }) }),
  ujianAkhir: (taId) => request(`ta/ujian-akhir?taId=${encodeURIComponent(taId)}`),
  buatPendaftaran: (taId, jenis) => request('ta/pendaftaran', { method: 'POST', body: JSON.stringify({ taId, jenis }) }),
  unggahBerkasUjian: (pendaftaranId, b) => request('ta/berkas-ujian', { method: 'POST', body: JSON.stringify({ pendaftaranId, ...b }) }),
  aksiPendaftaran: (pendaftaranId, aksi, opsi) => request('ta/aksi-ujian', { method: 'POST', body: JSON.stringify({ pendaftaranId, aksi, ...opsi }) }),
  verifikasiBerkasUjian: (pendaftaranId, berkasId, status, alasan) => request('ta/verifikasi-berkas', { method: 'POST', body: JSON.stringify({ pendaftaranId, berkasId, status, alasan }) }),
  antrianUjianAkhir: () => request('ta/antrian-ujian'),
}
