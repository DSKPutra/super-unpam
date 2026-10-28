// Penjadwal pengingat (U07): fungsi murni dari daftar tenggat + preferensi → daftar notifikasi beserta
// waktunya. Dipakai nanti oleh cron server (Web Push) dan bisa diuji tanpa jaringan (pengingat.test.ts).
// Juga: hitungan lonceng dari data notifikasi yang sama.

import type { AppNotification } from './types'

export type JenisPengingat = 'tugas' | 'tagihan' | 'event' | 'nilai' | 'kuesioner'
export const JENIS_PENGINGAT: JenisPengingat[] = ['tugas', 'tagihan', 'event', 'nilai', 'kuesioner']

export interface Tenggat {
  id: string
  jenis: JenisPengingat
  judul: string
  /** ISO 8601 */
  waktu: string
}

export interface PreferensiPengingat {
  /** Jenis yang ingin diingatkan. */
  jenis: Record<JenisPengingat, boolean>
  /** Jam tenang waktu lokal "HH:MM"; null = tanpa jam tenang. Boleh melewati tengah malam. */
  jamTenang: { mulai: string; selesai: string } | null
  /** Pengingat dikirim sekian menit sebelum tenggat. */
  sebelumMenit: number[]
  /** Batas jumlah notifikasi per hari kalender lokal. */
  maksPerHari: number
}

export const PREFERENSI_BAWAAN: PreferensiPengingat = {
  jenis: { tugas: true, tagihan: true, event: true, nilai: true, kuesioner: true },
  jamTenang: { mulai: '22:00', selesai: '06:00' },
  sebelumMenit: [24 * 60, 60],
  maksPerHari: 5,
}

export interface NotifTerjadwal {
  /** Stabil: tenggatId + offset, sehingga penjadwalan ulang tidak menggandakan notifikasi. */
  id: string
  tenggatId: string
  jenis: JenisPengingat
  /** ISO 8601 */
  waktu: string
  judul: string
  isi: string
}

/** Zona waktu kampus: WIB (UTC+7). Jam tenang dihitung pada zona ini. */
export const WIB_MENIT = 7 * 60

const MENIT = 60_000
const HARI = 24 * 60

const keMenit = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m || +m[1] > 23 || +m[2] > 59) throw new Error(`Format jam tidak valid: ${hhmm}`)
  return +m[1] * 60 + +m[2]
}

/** Menit-dalam-hari dan nomor hari lokal untuk sebuah waktu UTC. */
const lokal = (t: number, tz: number) => {
  const menitTotal = Math.floor(t / MENIT) + tz
  return { hari: Math.floor(menitTotal / HARI), menit: ((menitTotal % HARI) + HARI) % HARI }
}

/**
 * Bila `t` jatuh di jam tenang, majukan ke saat jam tenang dimulai (malam itu) dikurangi 1 menit.
 * Dimajukan, bukan dimundurkan, supaya pengingat tidak lewat dari tenggatnya.
 */
export function hindariJamTenang(t: number, jam: PreferensiPengingat['jamTenang'], tz = WIB_MENIT): number {
  if (!jam) return t
  const mulai = keMenit(jam.mulai)
  const selesai = keMenit(jam.selesai)
  if (mulai === selesai) return t
  const { menit } = lokal(t, tz)
  const lewatMalam = mulai > selesai
  const tenang = lewatMalam ? menit >= mulai || menit < selesai : menit >= mulai && menit < selesai
  if (!tenang) return t
  // Jarak mundur ke awal jam tenang (bisa ke hari sebelumnya bila sudah lewat tengah malam).
  const mundur = (menit - mulai + HARI) % HARI
  return t - (mundur + 1) * MENIT
}

const fmt = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(iso))
const label = (menit: number) => (menit % HARI === 0 ? `${menit / HARI} hari` : menit % 60 === 0 ? `${menit / 60} jam` : `${menit} menit`)

export function jadwalkanPengingat(daftar: Tenggat[], pref: PreferensiPengingat, now: number, tz = WIB_MENIT): NotifTerjadwal[] {
  const unik = new Map<string, Tenggat>()
  for (const d of daftar) if (!unik.has(d.id)) unik.set(d.id, d)

  const kandidat: (NotifTerjadwal & { t: number; tenggatT: number })[] = []
  for (const d of unik.values()) {
    if (!pref.jenis[d.jenis]) continue
    const tenggatT = Date.parse(d.waktu)
    if (Number.isNaN(tenggatT) || tenggatT <= now) continue
    for (const off of [...new Set(pref.sebelumMenit)].filter((m) => m > 0)) {
      const t = hindariJamTenang(tenggatT - off * MENIT, pref.jamTenang, tz)
      if (t <= now) continue
      kandidat.push({ id: `${d.id}:${off}`, tenggatId: d.id, jenis: d.jenis, waktu: new Date(t).toISOString(), judul: d.judul, isi: `Tenggat ${label(off)} lagi · ${fmt(d.waktu)}`, t, tenggatT })
    }
  }

  // Dua pengingat untuk tenggat yang sama yang jatuh di menit yang sama (mis. keduanya terdorong jam tenang): simpan satu.
  const perMenit = new Map<string, (typeof kandidat)[number]>()
  for (const k of kandidat) {
    const key = `${k.tenggatId}@${Math.floor(k.t / MENIT)}`
    if (!perMenit.has(key)) perMenit.set(key, k)
  }

  // Batas per hari: tenggat paling dekat didahulukan.
  const perHari = new Map<number, (typeof kandidat)[number][]>()
  for (const k of perMenit.values()) {
    const h = lokal(k.t, tz).hari
    perHari.set(h, [...(perHari.get(h) ?? []), k])
  }
  const hasil: (typeof kandidat)[number][] = []
  for (const list of perHari.values()) hasil.push(...list.sort((a, b) => a.tenggatT - b.tenggatT || a.t - b.t).slice(0, Math.max(0, pref.maksPerHari)))

  return hasil.sort((a, b) => a.t - b.t || a.id.localeCompare(b.id)).map(({ t: _t, tenggatT: _tt, ...n }) => n)
}

/** Jumlah lonceng: dari data notifikasi yang sama dengan halaman Notifikasi, bukan angka tetap. */
export const jumlahBelumDibaca = (list: AppNotification[] | undefined, dibaca: readonly number[]) => (list ?? []).filter((n) => !n.read && !dibaca.includes(n.id)).length
