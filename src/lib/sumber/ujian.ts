import { request } from '../api'
import { aturanUntuk } from '../akademik/aturan'
import { sesiUntukKlien, terimaKiriman, type BerkasJawaban, type KirimanJawaban, type SesiDaring } from '../akademik/ujian-daring'
import type { JadwalUjianSemester, JenisUjianSemester, PengajuanUjian, ProfilKelayakan } from '../akademik/types'
import type { DariSumber } from '../types'

/** Sumber data Exam Center (MY UNPAM). Komponen hanya mengenal antarmuka ini. */
export interface SumberUjian {
  jadwal(jenis: JenisUjianSemester): Promise<DariSumber<JadwalUjianSemester>>
  kelayakan(): Promise<DariSumber<ProfilKelayakan>>
  pengajuan(): Promise<DariSumber<PengajuanUjian[]>>
  ajukan(input: Omit<PengajuanUjian, 'id' | 'status' | 'diajukan'>): Promise<DariSumber<PengajuanUjian>>
  /** Ujian daring (T09): sesi + kiriman + jam server. Soal hanya ada setelah mulai menurut jam server. */
  daring(): Promise<DariSumber<DataDaring>>
  /** Kirim jawaban; kunci idempotensi membuat kirim ulang aman. Isi berkas belum diunggah (TODO DrivePAM). */
  kirimJawaban(sesiId: string, b: BerkasJawaban): Promise<DariSumber<{ kiriman: KirimanJawaban; baru: boolean; serverNow: string }>>
}

export interface DataDaring {
  /** Jam resmi server saat respons dibuat. */
  serverNow: string
  /** false bila kampus tidak menyelenggarakan ujian daring. Mode demo selalu memperagakan. */
  aktif: boolean
  sesi: (SesiDaring & { kiriman: KirimanJawaban[] })[]
}

export const DARING_DEMO_KEY = 'su:ujian-daring:demo'
interface StoreDaring { sesi: SesiDaring[]; kiriman: Record<string, KirimanJawaban[]> }
const MENIT = 60_000
function bacaDaring(): StoreDaring {
  try {
    const s = JSON.parse(localStorage.getItem(DARING_DEMO_KEY) ?? '') as StoreDaring
    if (s.sesi?.length) return s
  } catch {
    /* buat baru */
  }
  // Jadwal peragaan dibuat relatif terhadap waktu pertama dibuka, lalu disimpan agar tetap.
  const t = Date.now()
  const iso = (m: number) => new Date(t + m * MENIT).toISOString()
  const s: StoreDaring = {
    sesi: [
      { id: 'dr-if301', kodeMK: 'IF301', namaMK: 'Basis Data Lanjut', jenis: 'UTS', mulai: iso(-30), selesai: iso(90), perpanjanganMenit: 0, soal: { nama: 'Soal UTS Basis Data Lanjut (contoh).pdf', url: '#' } },
      { id: 'dr-if305', kodeMK: 'IF305', namaMK: 'Kecerdasan Buatan', jenis: 'UTS', mulai: iso(24 * 60), selesai: iso(24 * 60 + 100), perpanjanganMenit: 0, soal: { nama: 'Soal UTS Kecerdasan Buatan (contoh).pdf', url: '#' } },
      { id: 'dr-if210', kodeMK: 'IF210', namaMK: 'Grafika Komputer', jenis: 'UTS', mulai: iso(-24 * 60), selesai: iso(-22 * 60), perpanjanganMenit: 0, soal: { nama: 'Soal UTS Grafika (contoh).pdf', url: '#' } },
    ],
    kiriman: {},
  }
  tulisDaring(s)
  return s
}
const tulisDaring = (s: StoreDaring) => {
  try {
    localStorage.setItem(DARING_DEMO_KEY, JSON.stringify(s))
  } catch {
    /* penyimpanan tidak tersedia */
  }
}
const aturanDemo = async () => aturanUntuk((await demo()).profilKelayakan.prodi)

const demo = () => import('../../data/demo')
const contoh = <T>(data: T): DariSumber<T> => ({ data, asal: 'contoh' })

/** Data contoh di klien (mode demo). Pengajuan tidak dikirim ke mana pun. */
export const ujianDemo: SumberUjian = {
  jadwal: async (jenis) => contoh((await demo()).ujianSemester[jenis]),
  kelayakan: async () => contoh((await demo()).profilKelayakan),
  pengajuan: async () => contoh((await demo()).pengajuanUjian),
  ajukan: async (input) => contoh({ ...input, id: `pj-${Date.now().toString(36)}`, status: 'DIAJUKAN', diajukan: new Date().toISOString() }),
  async daring() {
    const s = bacaDaring()
    const now = Date.now()
    const aturan = await aturanDemo()
    return contoh({ serverNow: new Date(now).toISOString(), aktif: true, sesi: s.sesi.map((x) => ({ ...sesiUntukKlien(x, now, aturan), kiriman: s.kiriman[x.id] ?? [] })) })
  },
  async kirimJawaban(sesiId, b) {
    const s = bacaDaring()
    const sesi = s.sesi.find((x) => x.id === sesiId)
    if (!sesi) throw new Error('Sesi ujian tidak ditemukan.')
    const now = Date.now()
    const r = terimaKiriman(s.kiriman[sesiId] ?? [], b, sesi, now, await aturanDemo())
    if (!r.ok) throw new Error(r.galat)
    tulisDaring({ ...s, kiriman: { ...s.kiriman, [sesiId]: r.daftar } })
    return contoh({ kiriman: r.kiriman, baru: r.baru, serverNow: new Date(now).toISOString() })
  },
}

/** BFF: /api/ujian/* (api/ujian/[action].ts). */
export const ujianHttp: SumberUjian = {
  jadwal: (jenis) => request(`ujian/jadwal?jenis=${jenis}`),
  kelayakan: () => request('ujian/kelayakan'),
  pengajuan: () => request('ujian/pengajuan'),
  ajukan: (input) => request('ujian/pengajuan', { method: 'POST', body: JSON.stringify(input) }),
  daring: () => request('ujian/daring'),
  kirimJawaban: (sesiId, b) => request('ujian/daring-kirim', { method: 'POST', headers: { 'Idempotency-Key': b.kunci }, body: JSON.stringify({ sesiId, ...b }) }),
}
