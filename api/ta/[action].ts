import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { transisi, type Peristiwa } from '../../src/lib/akademik/alur-skripsi.js'
import { aturanUjian, aturanUntuk, rubrikUntuk } from '../../src/lib/akademik/aturan.js'
import { bimbinganSah, tambahVersi, validasiEntri, VersiDitolak } from '../../src/lib/akademik/logbook.js'
import { ajukanAdmin, ajukanRevisi, finalisasiBaru, lengkapiTenggat, putuskanRevisi, semuaRevisiDisetujui, simpanNaskahFinal, siapLulus, tandaiDikerjakan } from '../../src/lib/akademik/finalisasi.js'
import { dataPenilaianBaru, tutupPendaftaran, hasilUntukMahasiswa, kirimLembar, lembarTerlihat, peristiwaHasil, rilisHasil } from '../../src/lib/akademik/penilaian.js'
import { jalankanAksi, pendaftaranBaru, unggahBerkas, verifikasiBerkas, type AksiPendaftaran } from '../../src/lib/akademik/pendaftaran.js'
import { JENIS_UJIAN_AKHIR } from '../../src/lib/akademik/types.js'
import type { PeranAlur, TugasAkhir } from '../../src/lib/akademik/types.js'
import type { DariSumber } from '../../src/lib/types.js'
import { connectorMode, connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/ta/ringkasan → tugas akhir pemegang sesi, dosen + kuota, judul terdaftar (MAHASISWA)
// GET  /api/ta/antrian   → pengajuan judul menunggu keputusan (DOSEN)
// POST /api/ta/peristiwa → jalankan transisi alur. Mesin status dijalankan DI SERVER dengan peran dari
//      sesi (bukan dari klien), sehingga transisi tidak sah ditolak walau klien dimodifikasi.
// GET  /api/ta/logbook?taId → logbook (entri + versi draf); POST /api/ta/{entri,versi,verifikasi}
// GET  /api/ta/bimbingan     → mahasiswa bimbingan + logbook (DOSEN)
// GET  /api/ta/ujian-akhir?taId, /api/ta/antrian-ujian; POST /api/ta/{pendaftaran,berkas-ujian,aksi-ujian,verifikasi-berkas}
//      Kelayakan, slot, dan bentrok dihitung SERVER dari data kampus (jalankanAksi), bukan dari klien.
// GET  /api/ta/ujian-saya?pengujiId (DOSEN), /api/ta/hasil?pendaftaranId (MAHASISWA; hanya setelah rilis)
// POST /api/ta/lembar (DOSEN, final, di jendela waktu), /api/ta/rilis (TENDIK/prodi)
// TODO(BFF-AUTHZ): pengujiId harus dipetakan dari sesi dosen, bukan dikirim klien.
// GET  /api/ta/revisi?taId, /api/ta/revisi-penguji?pengujiId, /api/ta/finalisasi?taId
// POST /api/ta/revisi (mahasiswa: dikerjakan/ajukan; dosen: putuskan), /api/ta/finalisasi (mahasiswa: naskah,
//      ajukan admin, daftar wisuda; TENDIK: admin selesai, selesaikan). Plagiasi: 503 sampai ada penyedia resmi.
// TODO(BFF-AUTHZ): dosen hanya boleh memutuskan/memverifikasi untuk mahasiswa yang ia bimbing.

const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myUnpam') === 'mock' ? 'contoh' : 'MY UNPAM' })
const PERAN: Record<string, PeranAlur> = { MAHASISWA: 'MAHASISWA', DOSEN: 'DOSEN', TENDIK: 'PRODI' }

export const GET = handle(async (req) => {
  switch (lastSegment(req)) {
    case 'ringkasan': {
      // Dosen juga butuh daftar dosen/kuota; TA hanya untuk mahasiswa pemiliknya.
      const s = requireSession(req, ['MAHASISWA', 'DOSEN'])
      const r = await connectors.myUnpam.getRingkasanTA(s.sub)
      return json(wrap(s.role === 'MAHASISWA' ? r : { ...r, tugasAkhir: null }))
    }
    case 'logbook': {
      const s = requireSession(req, ['MAHASISWA', 'DOSEN'])
      const taId = new URL(req.url).searchParams.get('taId') ?? ''
      if (s.role === 'MAHASISWA') await milikSendiri(s.sub, taId)
      return json(wrap(await connectors.myUnpam.getLogbook(taId)))
    }
    case 'bimbingan': {
      const s = requireSession(req, ['DOSEN'])
      const daftar = await connectors.myUnpam.getTABimbingan(s.sub)
      return json(wrap(await Promise.all(daftar.map(async (ta) => ({ ta, logbook: await connectors.myUnpam.getLogbook(ta.id) })))))
    }
    case 'ujian-akhir': {
      const s = requireSession(req, ['MAHASISWA'])
      const taId = new URL(req.url).searchParams.get('taId') ?? ''
      await milikSendiri(s.sub, taId)
      return json(wrap(await dataUjianAkhir(s.sub, taId)))
    }
    case 'antrian-ujian': {
      const s = requireSession(req, ['DOSEN'])
      const daftar = await connectors.myUnpam.getAntrianUjianAkhir(s.sub)
      return json(wrap((await Promise.all(daftar.map(async (pendaftaran) => ({ ta: await connectors.myUnpam.getTA(pendaftaran.tugasAkhirId), pendaftaran })))).filter((x) => x.ta)))
    }
    case 'ujian-saya': {
      requireSession(req, ['DOSEN'])
      const pengujiId = new URL(req.url).searchParams.get('pengujiId') ?? ''
      const daftar = (await connectors.myUnpam.getPendaftaranTerjadwal()).filter((p) => p.sesi?.petugas.includes(pengujiId))
      return json(wrap(await Promise.all(daftar.map(async (pendaftaran) => {
        const d = (await connectors.myUnpam.getPenilaian(pendaftaran.id)) ?? dataPenilaianBaru(pendaftaran.id)
        const terlihat = lembarTerlihat(d, pendaftaran.sesi!, pengujiId)
        const lb = await connectors.myUnpam.getLogbook(pendaftaran.tugasAkhirId)
        return { ta: await connectors.myUnpam.getTA(pendaftaran.tugasAkhirId), pendaftaran, penilaian: { ...d, lembar: terlihat }, lengkap: terlihat.length === pendaftaran.sesi!.petugas.length && terlihat.every((l) => l.dikirim), drafTerakhir: [...lb.versi].sort((a, b) => b.versi - a.versi)[0] }
      }))))
    }
    case 'hasil': {
      const s = requireSession(req, ['MAHASISWA'])
      const p = await connectors.myUnpam.getPendaftaranById(new URL(req.url).searchParams.get('pendaftaranId') ?? '')
      if (!p) throw new HttpError(404, 'Pendaftaran tidak ditemukan.')
      await milikSendiri(s.sub, p.tugasAkhirId)
      return json(wrap(hasilUntukMahasiswa(await connectors.myUnpam.getPenilaian(p.id))))
    }
    case 'revisi': {
      const s = requireSession(req, ['MAHASISWA'])
      const taId = new URL(req.url).searchParams.get('taId') ?? ''
      await milikSendiri(s.sub, taId)
      return json(wrap(await revisiAktif(taId)))
    }
    case 'revisi-penguji': {
      requireSession(req, ['DOSEN'])
      const pengujiId = new URL(req.url).searchParams.get('pengujiId') ?? ''
      const semua = await Promise.all((await connectors.myUnpam.getPendaftaranTerjadwal()).map((p) => revisiAktif(p.tugasAkhirId)))
      const unik = [...new Map(semua.filter((x) => x).map((x) => [x!.pendaftaran.id, x!])).values()]
      return json(wrap(unik.filter((x) => x.revisi.some((r) => r.pengujiId === pengujiId)).map((x) => ({ ...x, revisi: x.revisi.filter((r) => r.pengujiId === pengujiId) }))))
    }
    case 'finalisasi': {
      const s = requireSession(req, ['MAHASISWA'])
      const taId = new URL(req.url).searchParams.get('taId') ?? ''
      await milikSendiri(s.sub, taId)
      return json(wrap((await connectors.myUnpam.getFinalisasi(taId)) ?? finalisasiBaru(taId)))
    }
    case 'antrian': {
      const s = requireSession(req, ['DOSEN'])
      return json(wrap(await connectors.myUnpam.getAntrianTA(s.sub)))
    }
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})

const Body = z.object({
  taId: z.string().max(64).optional(),
  peristiwa: z.enum(['AJUKAN_JUDUL', 'SETUJUI_JUDUL', 'TOLAK_JUDUL', 'AJUKAN_ULANG', 'MULAI_BIMBINGAN']),
  catatan: z.string().trim().max(1000).optional(),
  pembimbing: z.array(z.string().max(64)).max(3).optional(),
  judul: z.object({ judul: z.string().trim().min(1).max(300), bidang: z.string().max(120), abstrak: z.string().max(3000), metode: z.string().max(3000), pilihanPembimbing: z.array(z.string().max(64)).max(5) }).optional(),
})

async function dataUjianAkhir(sub: string, taId: string) {
  const [pendaftaran, slot, jadwalPenguji, uts, uas] = await Promise.all([
    connectors.myUnpam.getPendaftaranUjian(taId),
    connectors.myUnpam.getSlotUjian(),
    connectors.myUnpam.getJadwalPenguji(),
    connectors.myUnpam.getUjian(sub, 'UTS'),
    connectors.myUnpam.getUjian(sub, 'UAS'),
  ])
  return { pendaftaran, slot, jadwalPenguji, sesiMahasiswa: [...uts.sesi, ...uas.sesi] }
}

const BerkasMeta = z.object({ pendaftaranId: z.string().max(64), id: z.string().max(64), nama: z.string().min(1).max(200), ukuran: z.number().int().positive(), tipe: z.string().max(120), sha256: z.string() })
const Aksi = z.object({ pendaftaranId: z.string().max(64), aksi: z.enum(['KIRIM', 'SETUJUI_PEMBIMBING', 'TOLAK_PEMBIMBING', 'PILIH_SLOT', 'JADWAL_ULANG', 'BATALKAN']), slotId: z.string().max(64).optional(), catatan: z.string().trim().max(1000).optional() })
const VerifBerkas = z.object({ pendaftaranId: z.string().max(64), berkasId: z.string().max(64), status: z.enum(['DIVERIFIKASI', 'DITOLAK']), alasan: z.string().trim().max(1000).optional() })

async function postUjianAkhir(req: Request, aksi: string) {
  assertSameOrigin(req)
  if (aksi === 'pendaftaran') {
    const s = requireSession(req, ['MAHASISWA'])
    const b = await readJson(req, z.object({ taId: z.string().max(64), jenis: z.enum(JENIS_UJIAN_AKHIR) }))
    const ta = await milikSendiri(s.sub, b.taId)
    const aktif = (await connectors.myUnpam.getPendaftaranUjian(ta.id)).find((p) => p.jenis === b.jenis && p.status !== 'DIBATALKAN')
    return json(wrap(aktif ?? (await connectors.myUnpam.simpanPendaftaranUjian(pendaftaranBaru(`pd-${randomUUID()}`, ta, b.jenis)))))
  }
  if (aksi === 'berkas-ujian') {
    const s = requireSession(req, ['MAHASISWA'])
    const { pendaftaranId, ...meta } = await readJson(req, BerkasMeta)
    const p = await connectors.myUnpam.getPendaftaranById(pendaftaranId)
    if (!p) throw new HttpError(404, 'Pendaftaran tidak ditemukan.')
    await milikSendiri(s.sub, p.tugasAkhirId)
    const profil = await connectors.myUnpam.getProfilKelayakan(s.sub)
    // TODO(DrivePAM): terima berkas, hitung ulang SHA-256 dan pindai malware di server.
    const r = unggahBerkas(p, meta, aturanUjian(aturanUntuk(profil.prodi), p.jenis), Date.now())
    if (!r.ok) throw new HttpError(409, r.galat)
    return json(wrap(await connectors.myUnpam.simpanPendaftaranUjian(r.p)))
  }
  if (aksi === 'verifikasi-berkas') {
    requireSession(req, ['DOSEN'])
    const b = await readJson(req, VerifBerkas)
    const p = await connectors.myUnpam.getPendaftaranById(b.pendaftaranId)
    if (!p) throw new HttpError(404, 'Pendaftaran tidak ditemukan.')
    const r = verifikasiBerkas(p, b.berkasId, b.status, b.alasan)
    if (!r.ok) throw new HttpError(409, r.galat)
    return json(wrap(await connectors.myUnpam.simpanPendaftaranUjian(r.p)))
  }
  // aksi-ujian
  const s = requireSession(req, ['MAHASISWA', 'DOSEN'])
  const b = await readJson(req, Aksi)
  const p = await connectors.myUnpam.getPendaftaranById(b.pendaftaranId)
  if (!p) throw new HttpError(404, 'Pendaftaran tidak ditemukan.')
  const ta = await connectors.myUnpam.getTA(p.tugasAkhirId)
  if (!ta) throw new HttpError(404, 'Tugas akhir tidak ditemukan.')
  const pemilik = s.role === 'MAHASISWA' ? s.sub : null
  if (pemilik) await milikSendiri(pemilik, ta.id)
  // Data kelayakan milik MAHASISWA pemilik TA. TODO(BFF): saat dosen bertindak, ambil profil mahasiswa pemilik.
  const profil = await connectors.myUnpam.getProfilKelayakan(pemilik ?? 'mahasiswa-contoh')
  const data = await dataUjianAkhir(pemilik ?? 'mahasiswa-contoh', ta.id)
  const slot = b.slotId ? data.slot.find((x) => x.id === b.slotId) : undefined
  if (b.slotId && !slot) throw new HttpError(404, 'Slot tidak ditemukan.')
  const r = jalankanAksi({
    p, ta, aksi: b.aksi as AksiPendaftaran, pelaku: PERAN[s.role], aturan: aturanUjian(aturanUntuk(profil.prodi), p.jenis), profil,
    bimbinganSah: bimbinganSah((await connectors.myUnpam.getLogbook(ta.id)).entri).length, slot, sesiMahasiswa: data.sesiMahasiswa, jadwalPenguji: data.jadwalPenguji, catatan: b.catatan, sekarang: Date.now(),
  })
  if (!r.ok) throw new HttpError(409, r.galat)
  const lepas = p.sesi && (b.aksi === 'JADWAL_ULANG' || b.aksi === 'BATALKAN') ? data.slot.find((x) => p.sesi!.id.endsWith(`:${x.id}`)) : undefined
  const pendaftaran = await connectors.myUnpam.simpanPendaftaranUjian(r.p, { ...(slot && b.aksi === 'PILIH_SLOT' ? { [slot.id]: 1 } : {}), ...(lepas ? { [lepas.id]: -1 } : {}) })
  const taBaru = r.ta === ta ? ta : await connectors.myUnpam.simpanTA(pemilik ?? 'mahasiswa-contoh', r.ta)
  return json(wrap({ pendaftaran, ta: taBaru }))
}

const Lembar = z.object({
  pendaftaranId: z.string().max(64),
  pengujiId: z.string().max(64),
  skor: z.array(z.object({ kriteriaId: z.string().max(64), nilai: z.number() })).max(20),
  catatan: z.record(z.string().max(64), z.string().max(2000)),
  rekomendasi: z.enum(['LULUS', 'LULUS_REVISI', 'TIDAK_LULUS']),
  revisi: z.array(z.object({ bagian: z.string().max(200), permintaan: z.string().max(2000), tenggat: z.string().datetime().optional() })).max(30),
})

async function postPenilaian(req: Request, aksi: string) {
  assertSameOrigin(req)
  if (aksi === 'lembar') {
    requireSession(req, ['DOSEN'])
    const { pendaftaranId, ...l } = await readJson(req, Lembar)
    const p = await connectors.myUnpam.getPendaftaranById(pendaftaranId)
    if (!p?.sesi) throw new HttpError(404, 'Ujian tidak ditemukan atau belum terjadwal.')
    const aturan = aturanUntuk((await connectors.myUnpam.getProfilKelayakan('mahasiswa-contoh')).prodi)
    const rubrik = rubrikUntuk(aturan, p.jenis)
    if (!rubrik) throw new HttpError(503, 'Rubrik belum tersedia.')
    const r = kirimLembar((await connectors.myUnpam.getPenilaian(p.id)) ?? dataPenilaianBaru(p.id), l, { sesi: p.sesi, rubrik, aturan: aturanUjian(aturan, p.jenis), now: Date.now() })
    if (!r.ok) throw new HttpError(409, r.galat)
    const simpan = await connectors.myUnpam.simpanPenilaian(r.data)
    return json(wrap({ ...simpan, lembar: lembarTerlihat(simpan, p.sesi, l.pengujiId) }))
  }
  // rilis — oleh prodi. Nilai resmi TODO: diambil dari MY UNPAM, bukan dihitung di sini.
  const s = requireSession(req, ['TENDIK'])
  const b = await readJson(req, z.object({ pendaftaranId: z.string().max(64), keputusan: z.enum(['LULUS', 'LULUS_REVISI', 'TIDAK_LULUS']) }))
  const p = await connectors.myUnpam.getPendaftaranById(b.pendaftaranId)
  if (!p?.sesi) throw new HttpError(404, 'Ujian tidak ditemukan atau belum terjadwal.')
  const r = rilisHasil((await connectors.myUnpam.getPenilaian(p.id)) ?? dataPenilaianBaru(p.id), p.sesi, b.keputusan, { oleh: s.sub, now: Date.now() })
  if (!r.ok) throw new HttpError(409, r.galat)
  const ta = await connectors.myUnpam.getTA(p.tugasAkhirId)
  const ev = ta && peristiwaHasil(b.keputusan, ta.status)
  if (ta && ev) {
    const t = transisi(ta, ev, { pelaku: 'PRODI', catatan: b.keputusan === 'TIDAK_LULUS' ? 'Hasil ujian: tidak lulus' : undefined })
    if (t.ok) await connectors.myUnpam.simpanTA(s.sub, t.ta)
  }
  await connectors.myUnpam.simpanPendaftaranUjian(tutupPendaftaran(p, Date.now()))
  // TODO(P02): notifikasi "hasil tersedia" ke mahasiswa tanpa menyebut nilai.
  return json(wrap(await connectors.myUnpam.simpanPenilaian(r.data)))
}

async function revisiAktif(taId: string) {
  const ta = await connectors.myUnpam.getTA(taId)
  if (!ta) return null
  const aturan = aturanUntuk((await connectors.myUnpam.getProfilKelayakan('mahasiswa-contoh')).prodi)
  for (const p of (await connectors.myUnpam.getPendaftaranUjian(taId)).filter((x) => x.status === 'SELESAI').reverse()) {
    const h = (await connectors.myUnpam.getPenilaian(p.id))?.hasil
    if (h?.keputusan === 'LULUS_REVISI') return { ta, pendaftaran: p, revisi: lengkapiTenggat(h.revisi, h.dirilis, aturan) }
  }
  return null
}

const AksiRevisi = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('DIKERJAKAN') }),
  z.object({ jenis: z.literal('AJUKAN'), versiDraf: z.number().int().positive().optional(), catatan: z.string().max(2000) }),
  z.object({ jenis: z.literal('PUTUSKAN'), pengujiId: z.string().max(64), keputusan: z.enum(['DISETUJUI', 'DITOLAK']), alasan: z.string().max(2000).optional() }),
])

async function postRevisi(req: Request) {
  assertSameOrigin(req)
  const s = requireSession(req, ['MAHASISWA', 'DOSEN'])
  const b = await readJson(req, z.object({ pendaftaranId: z.string().max(64), revisiId: z.string().max(200) }).and(AksiRevisi))
  const ids = { pendaftaranId: b.pendaftaranId, revisiId: b.revisiId }
  const aksi = b
  if ((aksi.jenis === 'PUTUSKAN') !== (s.role === 'DOSEN')) throw new HttpError(403, 'Aksi tidak sesuai peran.')
  const p = await connectors.myUnpam.getPendaftaranById(ids.pendaftaranId)
  if (!p) throw new HttpError(404, 'Pendaftaran tidak ditemukan.')
  if (s.role === 'MAHASISWA') await milikSendiri(s.sub, p.tugasAkhirId)
  const ra = await revisiAktif(p.tugasAkhirId)
  if (!ra || ra.pendaftaran.id !== p.id) throw new HttpError(404, 'Revisi tidak ditemukan.')
  const r = aksi.jenis === 'DIKERJAKAN' ? tandaiDikerjakan(ra.revisi, ids.revisiId) : aksi.jenis === 'AJUKAN' ? ajukanRevisi(ra.revisi, ids.revisiId, aksi) : putuskanRevisi(ra.revisi, ids.revisiId, aksi.pengujiId, aksi.keputusan, aksi.alasan, Date.now())
  if (!r.ok) throw new HttpError(409, r.galat)
  const nilai = (await connectors.myUnpam.getPenilaian(p.id))!
  await connectors.myUnpam.simpanPenilaian({ ...nilai, hasil: { ...nilai.hasil!, revisi: r.revisi }, audit: [...nilai.audit, { siapa: s.sub, kapan: new Date().toISOString(), apa: `Revisi ${ids.revisiId}: ${aksi.jenis === 'PUTUSKAN' ? aksi.keputusan : aksi.jenis}` }] })
  let ta = ra.ta
  if (semuaRevisiDisetujui(r.revisi) && (ta.status === 'REVISI_PROPOSAL' || ta.status === 'REVISI_AKHIR')) {
    const t = transisi(ta, 'REVISI_DISETUJUI', { pelaku: 'DOSEN' })
    if (t.ok) ta = await connectors.myUnpam.simpanTA(s.sub, t.ta)
  }
  return json(wrap({ ta, pendaftaran: p, revisi: r.revisi }))
}

const AksiFin = z.discriminatedUnion('jenis', [
  z.object({ jenis: z.literal('NASKAH'), naskah: z.object({ nama: z.string().min(1).max(200), ukuran: z.number().int().positive(), sha256: z.string(), akses: z.string().max(40), daftarPeriksa: z.array(z.string().max(200)).max(30) }) }),
  z.object({ jenis: z.literal('PLAGIASI') }),
  z.object({ jenis: z.literal('AJUKAN_ADMIN'), item: z.string().max(64) }),
  z.object({ jenis: z.literal('DAFTAR_WISUDA') }),
  z.object({ jenis: z.literal('ADMIN_SELESAI'), item: z.string().max(64) }),
  z.object({ jenis: z.literal('SELESAIKAN') }),
])

async function postFinalisasi(req: Request) {
  assertSameOrigin(req)
  const s = requireSession(req, ['MAHASISWA', 'TENDIK'])
  const aksi = await readJson(req, z.object({ taId: z.string().max(64) }).and(AksiFin))
  const { taId } = aksi
  const prodi = aksi.jenis === 'ADMIN_SELESAI' || aksi.jenis === 'SELESAIKAN'
  if (prodi !== (s.role === 'TENDIK')) throw new HttpError(403, 'Aksi tidak sesuai peran.')
  let ta = prodi ? await connectors.myUnpam.getTA(taId) : await milikSendiri(s.sub, taId)
  if (!ta) throw new HttpError(404, 'Tugas akhir tidak ditemukan.')
  const aturan = aturanUntuk((await connectors.myUnpam.getProfilKelayakan('mahasiswa-contoh')).prodi)
  let fin = (await connectors.myUnpam.getFinalisasi(taId)) ?? finalisasiBaru(taId)
  const now = Date.now()
  const revisi = (await revisiAktif(taId))?.revisi ?? []
  switch (aksi.jenis) {
    case 'NASKAH': {
      // TODO(DrivePAM): terima berkas, hitung ulang SHA-256, simpan ke repositori.
      try {
        fin = simpanNaskahFinal(fin, aksi.naskah, now)
      } catch (e) {
        throw new HttpError(400, (e as Error).message)
      }
      break
    }
    case 'PLAGIASI':
      // Tidak ada penyedia resmi yang tersambung: jangan mengarang hasil di server.
      throw new HttpError(503, 'Layanan pemeriksaan kemiripan resmi kampus belum tersambung.')
    case 'AJUKAN_ADMIN':
      fin = ajukanAdmin(fin, aksi.item, aturan)
      break
    case 'ADMIN_SELESAI':
      fin = { ...fin, admin: { ...fin.admin, [aksi.item]: { status: 'SELESAI' } } }
      break
    case 'DAFTAR_WISUDA':
    case 'SELESAIKAN': {
      const sl = siapLulus(fin, revisi, aturan)
      if (!sl.ok) throw new HttpError(409, sl.kurang.join('; '))
      if (aksi.jenis === 'DAFTAR_WISUDA') fin = { ...fin, wisuda: { terdaftar: new Date(now).toISOString() } }
      else {
        const t = transisi(ta, 'SELESAIKAN', { pelaku: 'PRODI' })
        if (!t.ok) throw new HttpError(409, t.galat)
        ta = await connectors.myUnpam.simpanTA(s.sub, t.ta)
      }
      break
    }
  }
  return json(wrap({ finalisasi: await connectors.myUnpam.simpanFinalisasi(fin), ta }))
}

async function milikSendiri(sub: string, taId: string) {
  const ta = (await connectors.myUnpam.getRingkasanTA(sub)).tugasAkhir
  if (!ta || ta.id !== taId) throw new HttpError(403, 'Bukan tugas akhir Anda.')
  return ta
}

const Entri = z.object({
  taId: z.string().max(64),
  tanggal: z.string().datetime(),
  bagian: z.string().trim().min(1).max(200),
  ringkasan: z.string().trim().max(3000),
  tugasBerikutnya: z.object({ teks: z.string().trim().min(1).max(500), tenggat: z.string().datetime().optional() }).optional(),
  versiDraf: z.number().int().positive().optional(),
})
const Versi = z.object({ taId: z.string().max(64), nama: z.string().min(1).max(200), ukuran: z.number().int().positive(), tipe: z.string().max(120), sha256: z.string(), catatan: z.string().max(1000) })
const Verifikasi = z.object({ taId: z.string().max(64), entriId: z.string().max(64), keputusan: z.enum(['DISETUJUI', 'DITOLAK']), catatan: z.string().trim().max(1000).optional() })

async function postLogbook(req: Request, aksi: string) {
  assertSameOrigin(req)
  if (aksi === 'verifikasi') {
    const s = requireSession(req, ['DOSEN'])
    const b = await readJson(req, Verifikasi)
    if (b.keputusan === 'DITOLAK' && !b.catatan) throw new HttpError(400, 'Alasan penolakan wajib diisi.')
    const lb = await connectors.myUnpam.getLogbook(b.taId)
    const e = lb.entri.find((x) => x.id === b.entriId)
    if (!e) throw new HttpError(404, 'Entri tidak ditemukan.')
    if (e.status !== 'MENUNGGU') throw new HttpError(409, 'Entri sudah diverifikasi.')
    const entri = lb.entri.map((x) => (x.id === b.entriId ? { ...x, status: b.keputusan, catatanDosen: b.catatan, diverifikasi: { oleh: s.sub, waktu: new Date().toISOString() } } : x))
    return json(wrap(await connectors.myUnpam.simpanLogbook({ ...lb, entri })))
  }
  const s = requireSession(req, ['MAHASISWA'])
  rateLimit(`ta-logbook:${s.sub}`, 60, 3600)
  if (aksi === 'entri') {
    const b = await readJson(req, Entri)
    const ta = await milikSendiri(s.sub, b.taId)
    if (!ta.pembimbing.length) throw new HttpError(409, 'Belum ada pembimbing.')
    const g = validasiEntri(b)
    if (Object.keys(g).length) throw new HttpError(400, Object.values(g).join(' '))
    const lb = await connectors.myUnpam.getLogbook(b.taId)
    const { taId, ...isi } = b
    return json(wrap(await connectors.myUnpam.simpanLogbook({ ...lb, entri: [...lb.entri, { ...isi, id: `bb-${randomUUID()}`, tugasAkhirId: taId, status: 'MENUNGGU' }] })))
  }
  // aksi === 'versi': metadata + hash dari klien. TODO(DrivePAM): unggah berkas ke penyimpanan dan hitung
  // ulang SHA-256 di server; sampai itu, hash belum bisa diverifikasi server.
  const b = await readJson(req, Versi)
  await milikSendiri(s.sub, b.taId)
  const lb = await connectors.myUnpam.getLogbook(b.taId)
  const { taId: _t, ...berkas } = b
  try {
    return json(wrap(await connectors.myUnpam.simpanLogbook({ ...lb, versi: tambahVersi(lb.versi, berkas) })))
  } catch (e) {
    if (e instanceof VersiDitolak) throw new HttpError(409, e.message)
    throw e
  }
}

export const POST = handle(async (req) => {
  const aksi = lastSegment(req)
  if (['entri', 'versi', 'verifikasi'].includes(aksi)) return postLogbook(req, aksi)
  if (['pendaftaran', 'berkas-ujian', 'aksi-ujian', 'verifikasi-berkas'].includes(aksi)) return postUjianAkhir(req, aksi)
  if (aksi === 'lembar' || aksi === 'rilis') return postPenilaian(req, aksi)
  if (aksi === 'revisi') return postRevisi(req)
  if (aksi === 'finalisasi') return postFinalisasi(req)
  if (aksi !== 'peristiwa') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ['MAHASISWA', 'DOSEN', 'TENDIK'])
  rateLimit(`ta:${s.sub}`, 30, 3600)
  const b = await readJson(req, Body)
  const pelaku = PERAN[s.role]

  let ta: TugasAkhir | null = b.taId ? await connectors.myUnpam.getTA(b.taId) : (await connectors.myUnpam.getRingkasanTA(s.sub)).tugasAkhir
  if (!ta && b.peristiwa === 'AJUKAN_JUDUL' && pelaku === 'MAHASISWA')
    ta = { id: `ta-${randomUUID()}`, judul: '', abstrak: '', bidang: '', metode: '', pilihanPembimbing: [], pembimbing: [], status: 'DRAF_JUDUL', riwayat: [], perubahan: [] }
  if (!ta) throw new HttpError(404, 'Tugas akhir tidak ditemukan.')
  if (b.judul && pelaku === 'MAHASISWA' && ta.status === 'DRAF_JUDUL') ta = { ...ta, ...b.judul }

  const r = transisi(ta, b.peristiwa as Peristiwa, { pelaku, catatan: b.catatan, pembimbing: b.pembimbing })
  if (!r.ok) throw new HttpError(409, r.galat)
  return json(wrap(await connectors.myUnpam.simpanTA(s.sub, r.ta)))
})
