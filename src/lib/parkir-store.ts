import { ATURAN_PARKIR, type AturanParkir } from '../data/aturan-parkir.js'
import { areaContoh, kendaraanContoh, logContoh, riwayatContoh } from '../data/demo-parkir.js'
import { prosesGerbang, validasiKendaraan, bolehHapus, normalisasiPlat, type AreaParkir, type Arah, type HasilGerbang, type InputKendaraan, type KeadaanParkir, type Kendaraan, type LogAkses, type SesiParkir, type StatusKendaraan } from './parkir.js'

// Penyimpanan parkir di memori, dipakai mode demo klien DAN konektor mock BFF (data contoh).
// Sistem asli (konektor http `sarpras`) menyimpan di server kampus; jangan pakai ini di production.

export interface RingkasanParkir extends KeadaanParkir {
  area: AreaParkir[]
  riwayat: SesiParkir[]
}

interface Milik extends KeadaanParkir {
  riwayat: SesiParkir[]
  log: LogAkses[]
}

const idAcak = (awal: string) => `${awal}-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString(36).slice(-2).toUpperCase()}`

export class GalatParkir extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message)
  }
}

export function buatPenyimpananParkir(aturan: AturanParkir = ATURAN_PARKIR) {
  const area = areaContoh()
  const data = new Map<string, Milik>()

  const milik = (sub: string): Milik => {
    let m = data.get(sub)
    if (!m) {
      m = { ktmBeku: false, kendaraan: kendaraanContoh(), sesiAktif: null, riwayat: riwayatContoh(), log: logContoh() }
      // ID kendaraan contoh dibuat unik per akun agar kepemilikan bisa dicek.
      if (data.size) m.kendaraan = m.kendaraan.map((k) => ({ ...k, id: idAcak('KND') }))
      data.set(sub, m)
    }
    return m
  }
  const catat = (m: Milik, l: Omit<LogAkses, 'id'>) => m.log.unshift({ id: idAcak('LOG'), ...l })
  const salin = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

  return {
    ringkasan(sub: string): RingkasanParkir {
      const m = milik(sub)
      return salin({ ktmBeku: m.ktmBeku, kendaraan: m.kendaraan, sesiAktif: m.sesiAktif, area, riwayat: m.riwayat })
    },

    log: (sub: string): LogAkses[] => salin(milik(sub).log),

    daftar(sub: string, input: InputKendaraan): Kendaraan {
      const m = milik(sub)
      const galat = validasiKendaraan(input, m.kendaraan, aturan)
      if (galat.length) throw new GalatParkir(galat.join(' '))
      const k: Kendaraan = {
        id: idAcak('KND'),
        plat: normalisasiPlat(input.plat)!,
        jenis: input.jenis,
        merek: input.merek.trim().slice(0, 40),
        warna: input.warna.trim().slice(0, 20),
        status: 'menunggu',
        stnk: input.stnk && { nama: input.stnk.nama.slice(0, 80), ukuran: input.stnk.ukuran },
      }
      m.kendaraan.push(k)
      return salin(k)
    },

    hapus(sub: string, id: string) {
      const m = milik(sub)
      if (!m.kendaraan.some((k) => k.id === id)) throw new GalatParkir('Kendaraan tidak ditemukan.', 404)
      if (!bolehHapus(m, id)) throw new GalatParkir('Kendaraan sedang parkir. Keluar dulu sebelum menghapus.')
      m.kendaraan = m.kendaraan.filter((k) => k.id !== id)
    },

    /** Keputusan verifikasi Sarpras (di demo disimulasikan pengguna). */
    verifikasi(sub: string, id: string, status: Exclude<StatusKendaraan, 'menunggu'>, catatan?: string) {
      const k = milik(sub).kendaraan.find((x) => x.id === id)
      if (!k) throw new GalatParkir('Kendaraan tidak ditemukan.', 404)
      k.status = status
      k.catatan = catatan
    },

    setBeku(sub: string, beku: boolean) {
      const m = milik(sub)
      if (m.ktmBeku === beku) return
      m.ktmBeku = beku
      catat(m, { waktu: new Date().toISOString(), jenis: 'keamanan', lokasi: 'Aplikasi Super UNPAM', ket: beku ? 'KTM dibekukan' : 'KTM diaktifkan kembali' })
    },

    beku: (sub: string) => milik(sub).ktmBeku,

    /** Pemilik kendaraan (untuk menerbitkan & memverifikasi QR parkir), atau null. */
    pemilik(kendaraanId: string): string | null {
      for (const [sub, m] of data) if (m.kendaraan.some((k) => k.id === kendaraanId)) return sub
      return null
    },

    kendaraan: (sub: string, id: string) => salin(milik(sub).kendaraan.find((k) => k.id === id) ?? null),

    gerbang(sub: string, kendaraanId: string, arah: Arah, areaId: string, waktu = new Date()): HasilGerbang {
      const m = milik(sub)
      const r = prosesGerbang(m, area, { arah, kendaraanId, areaId, waktu, idBaru: idAcak('PRK') }, aturan)
      if (!r.ok) return salin(r)
      const a = area.find((x) => x.id === r.sesi.areaId)!
      if (arah === 'masuk') {
        m.sesiAktif = r.sesi
        a.terisi += 1
      } else {
        m.sesiAktif = null
        m.riwayat.unshift(r.sesi)
        a.terisi = Math.max(0, a.terisi - 1)
      }
      catat(m, { waktu: waktu.toISOString(), jenis: arah === 'masuk' ? 'parkir-masuk' : 'parkir-keluar', lokasi: a.nama, ket: r.kendaraan.plat })
      return salin(r)
    },
  }
}

export type PenyimpananParkir = ReturnType<typeof buatPenyimpananParkir>
