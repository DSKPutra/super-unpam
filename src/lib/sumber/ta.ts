import { request } from '../api'
import { transisi, type Peristiwa } from '../akademik/alur-skripsi'
import type { DataPengajuanJudul } from '../akademik/judul'
import { tambahVersi, bimbinganSah } from '../akademik/logbook'
import { aturanUjian, aturanUntuk, rubrikUntuk } from '../akademik/aturan'
import { hitungNilaiPratinjau } from '../akademik/nilai'
import { dataPenilaianBaru, tutupPendaftaran, hasilUntukMahasiswa, kirimLembar as kirimLembarMurni, lembarTerlihat, peristiwaHasil, rilisHasil as rilisHasilMurni } from '../akademik/penilaian'
import { transisi as transisiAlur } from '../akademik/alur-skripsi'
import { ajukanAdmin as ajukanAdminMurni, ajukanRevisi as ajukanRevisiMurni, finalisasiBaru, hasilPlagiasi, lengkapiTenggat, putuskanRevisi as putuskanRevisiMurni, semuaRevisiDisetujui, simpanNaskahFinal, siapLulus, tandaiDikerjakan as tandaiDikerjakanMurni, type PenyediaPlagiasi } from '../akademik/finalisasi'
import { jalankanAksi, pendaftaranBaru, unggahBerkas, verifikasiBerkas as verifikasiBerkasMurni, type AksiPendaftaran } from '../akademik/pendaftaran'
import type { BerkasUjian, Bimbingan, DataPenilaian, Finalisasi, NaskahFinal, Revisi, HasilUjian, HasilUntukMahasiswa, JenisUjianAkhir, LembarPenilaian, Logbook, PendaftaranUjianAkhir, PeranAlur, PermintaanPerubahan, RingkasanTA, SesiUjian, SlotUjian, TugasAkhir, VersiDraf } from '../akademik/types'
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
  /** Ujian yang saya uji (DEMO: `pengujiId` dipilih; server memetakan dari sesi — TODO BFF-AUTHZ). */
  ujianSaya(pengujiId: string): Promise<DariSumber<UjianPenguji[]>>
  /** Kirim lembar final. `simulasiWaktu` hanya untuk mode demo (memperagakan hari ujian). */
  kirimLembar(pendaftaranId: string, l: LembarPenilaian, simulasiWaktu?: number): Promise<DariSumber<DataPenilaian>>
  /** Rilis hasil oleh prodi (DEMO dari layar dosen sampai T08). */
  rilisHasil(pendaftaranId: string, keputusan: HasilUjian['keputusan']): Promise<DariSumber<DataPenilaian>>
  hasilUjian(pendaftaranId: string): Promise<DariSumber<HasilUntukMahasiswa>>
  /** Revisi aktif (ujian terakhir yang hasilnya lulus dengan revisi); null bila tidak ada. */
  revisiAktif(taId: string): Promise<DariSumber<RevisiAktif | null>>
  aksiRevisi(pendaftaranId: string, revisiId: string, aksi: AksiRevisi): Promise<DariSumber<RevisiAktif>>
  /** Penguji (DEMO): butir revisi yang menunggu keputusannya. */
  revisiPenguji(pengujiId: string): Promise<DariSumber<RevisiAktif[]>>
  finalisasi(taId: string): Promise<DariSumber<Finalisasi>>
  aksiFinalisasi(taId: string, aksi: AksiFinalisasi): Promise<DariSumber<{ finalisasi: Finalisasi; ta: TugasAkhir }>>
}

export interface RevisiAktif {
  ta: TugasAkhir
  pendaftaran: PendaftaranUjianAkhir
  revisi: Revisi[]
}

export type AksiRevisi =
  | { jenis: 'DIKERJAKAN' }
  | { jenis: 'AJUKAN'; versiDraf?: number; catatan: string }
  | { jenis: 'PUTUSKAN'; pengujiId: string; keputusan: 'DISETUJUI' | 'DITOLAK'; alasan?: string }

export type AksiFinalisasi =
  | { jenis: 'NASKAH'; naskah: Omit<NaskahFinal, 'diunggah'> }
  | { jenis: 'PLAGIASI' }
  | { jenis: 'AJUKAN_ADMIN'; item: string }
  | { jenis: 'DAFTAR_WISUDA' }
  /** Simulasi prodi (DEMO sampai T08 + BFF-AUTHZ). */
  | { jenis: 'ADMIN_SELESAI'; item: string }
  | { jenis: 'SELESAIKAN' }

export interface UjianPenguji {
  ta: TugasAkhir
  pendaftaran: PendaftaranUjianAkhir
  /** Hanya lembar yang boleh dilihat penguji ini (lihat lembarTerlihat). */
  penilaian: DataPenilaian
  /** Semua penguji sudah mengirim (pratinjau & rilis boleh). */
  lengkap: boolean
  drafTerakhir?: VersiDraf
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

export const PENILAIAN_DEMO_KEY = 'su:ta:penilaian'
const bacaNilai = (): Record<string, DataPenilaian> => {
  try {
    return JSON.parse(localStorage.getItem(PENILAIAN_DEMO_KEY) ?? '{}') as Record<string, DataPenilaian>
  } catch {
    return {}
  }
}
const tulisNilai = (d: DataPenilaian) => {
  try {
    localStorage.setItem(PENILAIAN_DEMO_KEY, JSON.stringify({ ...bacaNilai(), [d.pendaftaranId]: d }))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}
const nilaiUntuk = (pid: string) => bacaNilai()[pid] ?? dataPenilaianBaru(pid)

export const FINALISASI_DEMO_KEY = 'su:ta:finalisasi'
const bacaFin = (): Record<string, Finalisasi> => {
  try {
    return JSON.parse(localStorage.getItem(FINALISASI_DEMO_KEY) ?? '{}') as Record<string, Finalisasi>
  } catch {
    return {}
  }
}
const tulisFin = (f: Finalisasi) => {
  try {
    localStorage.setItem(FINALISASI_DEMO_KEY, JSON.stringify({ ...bacaFin(), [f.tugasAkhirId]: f }))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

/** Penyedia pemeriksaan kemiripan CONTOH (mode demo): angka deterministik dari hash, bukan hasil sungguhan. */
export const penyediaPlagiasiContoh: PenyediaPlagiasi = {
  nama: 'Penyedia contoh (demo)',
  contoh: true,
  periksa: async (sha256) => ({ persen: parseInt(sha256.slice(0, 2), 16) % 30 }),
}

/** Revisi aktif: pendaftaran SELESAI terakhir dengan hasil lulus-dengan-revisi. */
async function revisiAktifDemo(taId: string): Promise<RevisiAktif | null> {
  const ta = baca().milikSaya
  if (!ta || ta.id !== taId) return null
  const d = await demo()
  const aturan = aturanUntuk(d.profilKelayakan.prodi)
  const kandidat = bacaUA().pendaftaran.filter((p) => p.tugasAkhirId === taId && p.status === 'SELESAI').reverse()
  for (const p of kandidat) {
    const h = bacaNilai()[p.id]?.hasil
    if (h?.keputusan === 'LULUS_REVISI') return { ta, pendaftaran: p, revisi: lengkapiTenggat(h.revisi, h.dirilis, aturan) }
  }
  return null
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
  async ujianSaya(pengujiId) {
    const ta = baca().milikSaya
    if (!ta) return contoh([])
    const lb = await lbDemo(ta.id)
    const drafTerakhir = [...lb.versi].sort((a, b) => b.versi - a.versi)[0]
    return contoh(
      bacaUA().pendaftaran
        .filter((p) => (p.status === 'TERJADWAL' || p.status === 'SELESAI') && p.sesi && p.sesi.petugas.includes(pengujiId))
        .map((pendaftaran) => {
          const d = nilaiUntuk(pendaftaran.id)
          const terlihat = lembarTerlihat(d, pendaftaran.sesi!, pengujiId)
          return { ta, pendaftaran, penilaian: { ...d, lembar: terlihat }, lengkap: terlihat.length === pendaftaran.sesi!.petugas.length && terlihat.every((l) => l.dikirim), drafTerakhir }
        }),
    )
  },
  async kirimLembar(pid, l, simulasiWaktu) {
    const d = await demo()
    const p = cariPendaftaran(pid)
    const rubrik = rubrikUntuk(aturanUntuk(d.profilKelayakan.prodi), p.jenis)
    if (!p.sesi || !rubrik) throw new Error('Ujian belum terjadwal atau rubrik belum tersedia.')
    const r = kirimLembarMurni(nilaiUntuk(pid), l, { sesi: p.sesi, rubrik, aturan: aturanUjian(aturanUntuk(d.profilKelayakan.prodi), p.jenis), now: simulasiWaktu ?? Date.now() })
    if (!r.ok) throw new Error(r.galat)
    tulisNilai(r.data)
    return contoh(r.data)
  },
  async rilisHasil(pid, keputusan) {
    const d = await demo()
    const p = cariPendaftaran(pid)
    const aturan = aturanUntuk(d.profilKelayakan.prodi)
    const rubrik = rubrikUntuk(aturan, p.jenis)
    const data = nilaiUntuk(pid)
    if (!p.sesi || !rubrik) throw new Error('Ujian belum terjadwal atau rubrik belum tersedia.')
    // Mode demo: "nilai resmi" = pratinjau rubrik (berlabel contoh). Di server, nilai resmi dari MY UNPAM.
    const pr = data.lembar.length ? hitungNilaiPratinjau(rubrik, data.lembar.filter((x) => x.dikirim), aturan.hurufMutu, aturan.desimal) : null
    const r = rilisHasilMurni(data, p.sesi, keputusan, { oleh: 'prodi-demo', now: Date.now(), nilaiAkhir: pr?.nilai, huruf: pr?.huruf })
    if (!r.ok) throw new Error(r.galat)
    tulisNilai(r.data)
    simpanPendaftaran(tutupPendaftaran(p, Date.now()))
    const s = baca()
    if (s.milikSaya?.id === p.tugasAkhirId) {
      const ev = peristiwaHasil(keputusan, s.milikSaya.status)
      const t = ev && transisiAlur(s.milikSaya, ev, { pelaku: 'PRODI', catatan: keputusan === 'TIDAK_LULUS' ? 'Hasil ujian: tidak lulus' : undefined })
      if (t && t.ok) tulis({ ...s, milikSaya: t.ta })
    }
    return contoh(r.data)
  },
  hasilUjian: async (pid) => contoh(hasilUntukMahasiswa(bacaNilai()[pid] ?? null)),
  revisiAktif: async (taId) => contoh(await revisiAktifDemo(taId)),
  async aksiRevisi(pid, revisiId, aksi) {
    const p = cariPendaftaran(pid)
    const ra = await revisiAktifDemo(p.tugasAkhirId)
    if (!ra || ra.pendaftaran.id !== pid) throw new Error('Revisi tidak ditemukan.')
    const r =
      aksi.jenis === 'DIKERJAKAN' ? tandaiDikerjakanMurni(ra.revisi, revisiId)
      : aksi.jenis === 'AJUKAN' ? ajukanRevisiMurni(ra.revisi, revisiId, aksi)
      : putuskanRevisiMurni(ra.revisi, revisiId, aksi.pengujiId, aksi.keputusan, aksi.alasan, Date.now())
    if (!r.ok) throw new Error(r.galat)
    const nilai = bacaNilai()[pid]!
    tulisNilai({ ...nilai, hasil: { ...nilai.hasil!, revisi: r.revisi }, audit: [...nilai.audit, { siapa: aksi.jenis === 'PUTUSKAN' ? aksi.pengujiId : 'mahasiswa', kapan: new Date().toISOString(), apa: `Revisi ${revisiId}: ${aksi.jenis === 'PUTUSKAN' ? aksi.keputusan : aksi.jenis}` }] })
    // Semua butir disetujui → alur TA lanjut (REVISI_DISETUJUI oleh dosen).
    let ta = ra.ta
    if (semuaRevisiDisetujui(r.revisi) && (ta.status === 'REVISI_PROPOSAL' || ta.status === 'REVISI_AKHIR')) {
      const t = transisiAlur(ta, 'REVISI_DISETUJUI', { pelaku: 'DOSEN' })
      if (t.ok) (ta = t.ta), tulis({ ...baca(), milikSaya: ta })
    }
    return contoh({ ta, pendaftaran: ra.pendaftaran, revisi: r.revisi })
  },
  async revisiPenguji(pengujiId) {
    const ta = baca().milikSaya
    const ra = ta ? await revisiAktifDemo(ta.id) : null
    return contoh(ra && ra.revisi.some((r) => r.pengujiId === pengujiId) ? [{ ...ra, revisi: ra.revisi.filter((r) => r.pengujiId === pengujiId) }] : [])
  },
  finalisasi: async (taId) => contoh(bacaFin()[taId] ?? finalisasiBaru(taId)),
  async aksiFinalisasi(taId, aksi) {
    const d = await demo()
    const aturan = aturanUntuk(d.profilKelayakan.prodi)
    const s = baca()
    let ta = s.milikSaya
    if (!ta || ta.id !== taId) throw new Error('Tugas akhir tidak ditemukan.')
    let fin = bacaFin()[taId] ?? finalisasiBaru(taId)
    const now = Date.now()
    switch (aksi.jenis) {
      case 'NASKAH':
        fin = simpanNaskahFinal(fin, aksi.naskah, now)
        break
      case 'PLAGIASI': {
        if (!fin.naskah) throw new Error('Unggah naskah final lebih dulu.')
        const { persen } = await penyediaPlagiasiContoh.periksa(fin.naskah.sha256)
        fin = { ...fin, plagiasi: hasilPlagiasi(persen, penyediaPlagiasiContoh, aturan, now) }
        break
      }
      case 'AJUKAN_ADMIN':
        fin = ajukanAdminMurni(fin, aksi.item, aturan)
        break
      case 'ADMIN_SELESAI':
        fin = { ...fin, admin: { ...fin.admin, [aksi.item]: { status: 'SELESAI' } } }
        break
      case 'DAFTAR_WISUDA': {
        const sl = siapLulus(fin, (await revisiAktifDemo(taId))?.revisi ?? [], aturan)
        if (!sl.ok) throw new Error(`Belum bisa mendaftar wisuda: ${sl.kurang.join('; ')}.`)
        fin = { ...fin, wisuda: { terdaftar: new Date(now).toISOString() } }
        break
      }
      case 'SELESAIKAN': {
        const sl = siapLulus(fin, (await revisiAktifDemo(taId))?.revisi ?? [], aturan)
        if (!sl.ok) throw new Error(`Belum bisa diselesaikan: ${sl.kurang.join('; ')}.`)
        const t = transisiAlur(ta, 'SELESAIKAN', { pelaku: 'PRODI' })
        if (!t.ok) throw new Error(t.galat)
        ta = t.ta
        tulis({ ...s, milikSaya: ta })
        break
      }
    }
    if (!fin.yudisium) fin = { ...fin, yudisium: d.jadwalYudisium }
    tulisFin(fin)
    return contoh({ finalisasi: fin, ta })
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
  ujianSaya: (pengujiId) => request(`ta/ujian-saya?pengujiId=${encodeURIComponent(pengujiId)}`),
  kirimLembar: (pendaftaranId, l) => request('ta/lembar', { method: 'POST', body: JSON.stringify({ pendaftaranId, ...l }) }),
  rilisHasil: (pendaftaranId, keputusan) => request('ta/rilis', { method: 'POST', body: JSON.stringify({ pendaftaranId, keputusan }) }),
  hasilUjian: (pendaftaranId) => request(`ta/hasil?pendaftaranId=${encodeURIComponent(pendaftaranId)}`),
  revisiAktif: (taId) => request(`ta/revisi?taId=${encodeURIComponent(taId)}`),
  aksiRevisi: (pendaftaranId, revisiId, aksi) => request('ta/revisi', { method: 'POST', body: JSON.stringify({ pendaftaranId, revisiId, ...aksi }) }),
  revisiPenguji: (pengujiId) => request(`ta/revisi-penguji?pengujiId=${encodeURIComponent(pengujiId)}`),
  finalisasi: (taId) => request(`ta/finalisasi?taId=${encodeURIComponent(taId)}`),
  aksiFinalisasi: (taId, aksi) => request('ta/finalisasi', { method: 'POST', body: JSON.stringify({ taId, ...aksi }) }),
}
