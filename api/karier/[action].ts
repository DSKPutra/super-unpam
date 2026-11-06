import { z } from 'zod'
import type { DariSumber } from '../../src/lib/types.js'
import type { Orang } from '../../src/lib/karier/cocok.js'
import * as toko from '../../src/lib/karier/toko.js'
import { assertSameOrigin, handle, HttpError, json, lastSegment, readJson } from '../_lib/http.js'
import { rateLimit } from '../_lib/ratelimit.js'
import { requireSession, type Session } from '../_lib/session.js'

// Karier & lowongan. Semua peran yang masuk lewat SSO boleh mencari DAN memasang (identitas = verifikasi; tanpa KYB).
// GET  /api/karier/lowongan | profil | lamaran | pelamar?id=
// POST /api/karier/profil | pasang | tutup | lapor | moderasi | lamar | status
// TODO(BFF): state masih di memori per instance → pindah ke basis data bersama; nama & prodi dari konektor SSO.

const state: toko.StateKarier = { lowongan: [], lamaran: [], profil: {} }
const wrap = <T>(data: T): DariSumber<T> => ({ data, asal: 'Super UNPAM' })
const orang = (s: Session): Orang => ({ sub: s.sub, role: s.role, nama: s.sub, prodi: '' })
const id = (p: string) => `${p}-${crypto.randomUUID()}`

function jalan<T>(fn: () => T) {
  try {
    return json(wrap(fn()))
  } catch (e) {
    if (e instanceof toko.GalatKarier) throw new HttpError(e.status, e.message)
    throw e
  }
}

const teks = (min: number, max: number) => z.string().trim().min(min).max(max)
const keahlian = z.array(teks(1, 40)).max(30)
const enumTipe = z.enum(['PENUH_WAKTU', 'PARUH_WAKTU', 'MAGANG', 'KONTRAK', 'FREELANCE'])
const enumMode = z.enum(['KANTOR', 'HIBRIDA', 'REMOTE'])
const enumLevel = z.enum(['MAGANG', 'JUNIOR', 'MENENGAH', 'SENIOR'])
const rupiah = z.number().int().min(0).max(1_000_000_000).optional()
const Input = z.object({
  judul: teks(5, 120), perusahaan: teks(2, 120), lokasi: teks(2, 80), mode: enumMode, tipe: enumTipe, level: enumLevel,
  keahlian, gajiMin: rupiah, gajiMax: rupiah, deskripsi: teks(40, 5000), tautan: z.string().trim().max(500).optional(), hariAktif: z.number().int().min(1).max(60),
})
const Profil = z.object({
  keahlian, level: enumLevel, tipe: z.array(enumTipe).max(5), mode: z.array(enumMode).max(3), lokasi: z.array(teks(1, 60)).max(10), gajiHarapan: rupiah, ringkasan: z.string().max(1000),
})
const Id = z.object({ id: z.string().regex(/^[\w-]{1,80}$/) })

export const GET = handle(async (req) => {
  const s = requireSession(req)
  const aku = orang(s)
  switch (lastSegment(req)) {
    case 'lowongan':
      return jalan(() => toko.lihatLowongan(state, aku, new Date()))
    case 'profil':
      return jalan(() => state.profil[s.sub] ?? null)
    case 'lamaran':
      return jalan(() => toko.lamaranSaya(state, aku))
    case 'pelamar': {
      const q = Id.safeParse({ id: new URL(req.url).searchParams.get('id') ?? '' })
      if (!q.success) throw new HttpError(400, 'Parameter id tidak valid.')
      return jalan(() => toko.pelamar(state, aku, q.data.id))
    }
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})

export const POST = handle(async (req) => {
  assertSameOrigin(req)
  const s = requireSession(req)
  const aku = orang(s)
  rateLimit(`karier:${s.sub}`, 30, 60)
  switch (lastSegment(req)) {
    case 'profil': {
      const p = await readJson(req, Profil)
      return jalan(() => (state.profil[s.sub] = p))
    }
    case 'pasang': {
      rateLimit(`karier-pasang:${s.sub}`, 5, 3600)
      const input = await readJson(req, Input)
      return jalan(() => toko.pasang(state, aku, input, id('lw'), new Date()))
    }
    case 'tutup': {
      const b = await readJson(req, Id)
      return jalan(() => toko.tutup(state, aku, b.id))
    }
    case 'lapor': {
      rateLimit(`karier-lapor:${s.sub}`, 10, 3600)
      const b = await readJson(req, Id)
      return jalan(() => toko.lapor(state, aku, b.id))
    }
    case 'moderasi': {
      const b = await readJson(req, Id.extend({ setuju: z.boolean() }))
      return jalan(() => toko.moderasi(state, aku, b.id, b.setuju))
    }
    case 'lamar': {
      rateLimit(`karier-lamar:${s.sub}`, 20, 3600)
      const b = await readJson(req, Id.extend({ pesan: z.string().max(1000) }))
      return jalan(() => toko.kirimLamaran(state, aku, b.id, b.pesan, id('lm'), new Date()))
    }
    case 'status': {
      const b = await readJson(req, z.object({ lamaranId: z.string().regex(/^[\w-]{1,80}$/), status: z.enum(['TERKIRIM', 'DILIHAT', 'DIPROSES', 'DITOLAK', 'DITERIMA']) }))
      return jalan(() => toko.ubahStatus(state, aku, b.lamaranId, b.status))
    }
    default:
      throw new HttpError(404, 'Tidak ditemukan.')
  }
})
