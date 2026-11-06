import { z } from 'zod'
import { aturanUntuk } from '../../src/lib/akademik/aturan.js'
import { sesiUntukKlien, terimaKiriman } from '../../src/lib/akademik/ujian-daring.js'
import { JENIS_UJIAN_SEMESTER } from '../../src/lib/akademik/types.js'
import type { DariSumber } from '../../src/lib/types.js'
import { connectorMode, connectors } from '../_connectors/index.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession } from '../_lib/session.js'

// GET  /api/ujian/jadwal?jenis=UTS|UAS|SUSULAN|REMEDIAL → jadwal + ID kartu pemegang sesi
// GET  /api/ujian/kelayakan                          → data kelayakan (kehadiran, keuangan, …)
// GET  /api/ujian/pengajuan                          → pengajuan susulan/remedial
// POST /api/ujian/pengajuan                          → ajukan susulan/remedial (metadata lampiran saja;
//      berkas bukti menunggu layanan penyimpanan/DrivePAM)
// GET  /api/ujian/daring       → sesi ujian daring + kiriman + jam server (soal hanya setelah mulai)
// POST /api/ujian/daring-kirim → kirim jawaban; header Idempotency-Key = kunci (kirim ulang aman).
//      Waktu dari jam server. Isi berkas belum disimpan (TODO DrivePAM); hanya metadata + SHA-256.
//      Tidak ada perekaman perangkat (docs/KEBIJAKAN-UJIAN-DARING.md). 404 bila ujianDaring.aktif = false.
// Keputusan kelayakan resmi tetap di server/MY UNPAM; klien hanya menampilkan.

const ROLES = ['MAHASISWA'] as const
const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: connectorMode('myUnpam') === 'mock' ? 'contoh' : 'MY UNPAM' })

export const GET = handle(async (req) => {
  const s = requireSession(req, ROLES)
  switch (lastSegment(req)) {
    case 'jadwal': {
      const jenis = z.enum(JENIS_UJIAN_SEMESTER).safeParse(new URL(req.url).searchParams.get('jenis'))
      if (!jenis.success) throw new HttpError(400, 'Jenis ujian tidak dikenal.')
      return json(wrap(await connectors.myUnpam.getUjian(s.sub, jenis.data)))
    }
    case 'kelayakan':
      return json(wrap(await connectors.myUnpam.getProfilKelayakan(s.sub)))
    case 'pengajuan':
      return json(wrap(await connectors.myUnpam.getPengajuanUjian(s.sub)))
    case 'daring': {
      const aturan = daringAktif()
      const now = Date.now()
      const sesi = await connectors.myUnpam.getUjianDaring(s.sub)
      return json(wrap({ serverNow: new Date(now).toISOString(), aktif: true, sesi: await Promise.all(sesi.map(async (x) => ({ ...sesiUntukKlien(x, now, aturan), kiriman: await connectors.myUnpam.getKirimanDaring(s.sub, x.id) }))) }))
    }
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})

const Pengajuan = z.object({
  jenis: z.enum(['SUSULAN', 'REMEDIAL']),
  kodeMK: z.string().regex(/^[A-Z0-9]{2,12}$/),
  namaMK: z.string().min(1).max(120),
  alasan: z.string().trim().min(10).max(1000),
  lampiran: z.array(z.object({ nama: z.string().min(1).max(200), ukuran: z.number().int().nonnegative(), tipe: z.string().max(100) })).max(5),
})

function daringAktif() {
  const aturan = aturanUntuk('*') // TODO(BFF): prodi dari sesi
  if (!aturan.ujianDaring.aktif) throw new HttpError(404, 'Ujian daring tidak diselenggarakan.')
  return aturan
}

const Kiriman = z.object({ sesiId: z.string().max(64), kunci: z.string().max(64), nama: z.string().min(1).max(200), ukuran: z.number().int().positive(), tipe: z.string().max(100), sha256: z.string().max(64) })

async function postDaring(req: Request) {
  assertSameOrigin(req)
  const s = requireSession(req, ROLES)
  const aturan = daringAktif()
  rateLimit(`ujian-daring:${s.sub}`, 60, 3600)
  const b = await readJson(req, Kiriman)
  if (req.headers.get('idempotency-key') !== b.kunci) throw new HttpError(400, 'Idempotency-Key harus sama dengan kunci.')
  const sesi = (await connectors.myUnpam.getUjianDaring(s.sub)).find((x) => x.id === b.sesiId)
  if (!sesi) throw new HttpError(404, 'Sesi ujian tidak ditemukan.')
  const now = Date.now()
  // TODO(BFF): kunci baca-ubah-tulis per (sub, sesi) di penyimpanan bersama agar dua permintaan serentak tidak saling timpa.
  const r = terimaKiriman(await connectors.myUnpam.getKirimanDaring(s.sub, sesi.id), b, sesi, now, aturan)
  if (!r.ok) throw new HttpError(409, r.galat)
  if (r.baru) await connectors.myUnpam.simpanKirimanDaring(s.sub, sesi.id, r.daftar)
  return json(wrap({ kiriman: r.kiriman, baru: r.baru, serverNow: new Date(now).toISOString() }))
}

export const POST = handle(async (req) => {
  if (lastSegment(req) === 'daring-kirim') return postDaring(req)
  if (lastSegment(req) !== 'pengajuan') throw new HttpError(404, 'Tidak ditemukan.')
  assertSameOrigin(req)
  const s = requireSession(req, ROLES)
  rateLimit(`ujian-pengajuan:${s.sub}`, 10, 3600)
  const input = await readJson(req, Pengajuan)
  return json(wrap(await connectors.myUnpam.ajukanUjian(s.sub, input)))
})
