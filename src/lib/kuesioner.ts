// Mesin kuesioner generik (EDOM dan survei lain): definisi, validasi, kemajuan, draf, dan pengiriman.
// Bagian murni (validasi, kemajuan, payload) diuji di kuesioner.test.ts.

export type TipePertanyaan = 'skala' | 'pilihan' | 'teks'

export interface Pertanyaan {
  id: string
  teks: string
  tipe: TipePertanyaan
  wajib: boolean
  /** 'pilihan': daftar opsi. 'skala': label ujung opsional [kiri, kanan]. */
  opsi?: string[]
  /** 'skala': rentang nilai (bawaan 1–5). */
  min?: number
  max?: number
  /** 'teks': batas karakter (bawaan 1000). */
  maxLength?: number
}

export interface Kuesioner {
  id: string
  judul: string
  subjudul?: string
  /** Kuesioner anonim tidak pernah mengirim NIM; identitas diganti token sekali pakai dari server. */
  anonim: boolean
  /** ISO 8601 */
  tenggat?: string
  pertanyaan: Pertanyaan[]
}

export type Nilai = number | string
export type Jawaban = Record<string, Nilai>

const TEKS_MAX = 1000
const isiKosong = (v: Nilai | undefined) => v === undefined || (typeof v === 'string' && v.trim() === '')

/** Pesan galat untuk satu jawaban, atau null bila valid. */
export function validasi(p: Pertanyaan, v: Nilai | undefined): string | null {
  if (isiKosong(v)) return p.wajib ? 'Pertanyaan ini wajib dijawab.' : null
  switch (p.tipe) {
    case 'skala': {
      const min = p.min ?? 1
      const max = p.max ?? 5
      return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? null : `Pilih nilai ${min}–${max}.`
    }
    case 'pilihan':
      return typeof v === 'string' && (p.opsi ?? []).includes(v) ? null : 'Pilih salah satu opsi.'
    case 'teks':
      return typeof v === 'string' && v.length <= (p.maxLength ?? TEKS_MAX) ? null : `Maksimal ${p.maxLength ?? TEKS_MAX} karakter.`
  }
}

export function validasiSemua(k: Kuesioner, j: Jawaban): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of k.pertanyaan) {
    const e = validasi(p, j[p.id])
    if (e) out[p.id] = e
  }
  return out
}

export function kemajuan(k: Kuesioner, j: Jawaban) {
  const total = k.pertanyaan.length
  const terjawab = k.pertanyaan.filter((p) => !isiKosong(j[p.id]) && !validasi(p, j[p.id])).length
  const wajibSisa = k.pertanyaan.filter((p) => p.wajib && validasi(p, j[p.id])).length
  return { terjawab, total, persen: total ? Math.round((terjawab / total) * 100) : 0, siapKirim: wajibSisa === 0 && Object.keys(validasiSemua(k, j)).length === 0 }
}

export interface Payload {
  kuesionerId: string
  jawaban: Jawaban
  /** Hanya untuk kuesioner bernama. */
  nim?: string
  /** Hanya untuk kuesioner anonim: token sekali pakai dari server. */
  token?: string
}

/**
 * Menyusun data kirim. Kuesioner anonim TIDAK memuat NIM; jawaban kosong dan id yang tidak ada
 * di definisi dibuang (tidak ada data tambahan yang ikut terkirim).
 */
export function susunPayload(k: Kuesioner, j: Jawaban, identitas: { nim: string; token?: string }): Payload {
  const jawaban: Jawaban = {}
  for (const p of k.pertanyaan) if (!isiKosong(j[p.id])) jawaban[p.id] = typeof j[p.id] === 'string' ? (j[p.id] as string).trim() : j[p.id]
  if (k.anonim) {
    if (!identitas.token) throw new Error('Token anonim belum tersedia.')
    return { kuesionerId: k.id, jawaban, token: identitas.token }
  }
  return { kuesionerId: k.id, jawaban, nim: identitas.nim }
}

/** Sisa hari sampai tenggat (dibulatkan ke atas); null bila tanpa tenggat. Negatif = lewat. */
export function sisaHari(tenggat: string | undefined, now = Date.now()) {
  if (!tenggat) return null
  return Math.ceil((Date.parse(tenggat) - now) / 86_400_000)
}

/* ---------- Draf ---------- */

export interface Draf {
  jawaban: Jawaban
  langkah: number
  disimpan: string
}

const PREFIX = 'su:kuesioner:draf:'
// Anonim → sessionStorage (hilang saat tab ditutup, bertahan saat muat ulang) karena bisa berisi teks bebas
// yang sensitif. Bernama → localStorage. Keduanya dihapus saat keluar akun (hapusSemuaDraf).
const store = (k: Pick<Kuesioner, 'anonim'>) => {
  try {
    return k.anonim ? sessionStorage : localStorage
  } catch {
    return null
  }
}

export function bacaDraf(k: Kuesioner): Draf | null {
  try {
    const raw = store(k)?.getItem(PREFIX + k.id)
    const d = raw ? (JSON.parse(raw) as Draf) : null
    return d && typeof d.jawaban === 'object' && d.jawaban ? d : null
  } catch {
    return null
  }
}

export function simpanDraf(k: Kuesioner, d: Omit<Draf, 'disimpan'>) {
  try {
    store(k)?.setItem(PREFIX + k.id, JSON.stringify({ ...d, disimpan: new Date().toISOString() }))
  } catch {
    /* penyimpanan penuh/tidak tersedia: tetap bisa mengisi, hanya tanpa draf */
  }
}

export function hapusDraf(k: Kuesioner) {
  try {
    store(k)?.removeItem(PREFIX + k.id)
  } catch {
    /* abaikan */
  }
}

export function hapusSemuaDraf() {
  for (const s of [localStorage, sessionStorage]) {
    try {
      for (const key of Object.keys(s)) if (key.startsWith(PREFIX)) s.removeItem(key)
    } catch {
      /* abaikan */
    }
  }
}

/* ---------- Pengiriman ---------- */

export interface Struk {
  id: string
  /** true = mode demo: tidak ada yang benar-benar terkirim. */
  demo: boolean
}

export type Transport = (p: Payload) => Promise<Struk>

/** Mode demo: tidak mengirim ke mana pun; struk berlabel DEMO. */
export const demoTransport: Transport = async () => {
  await new Promise((r) => setTimeout(r, 500))
  return { id: `DEMO-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, demo: true }
}

/** TODO(BFF): POST /api/kuesioner/submit belum ada; galat jaringan/server menjaga draf. */
export const httpTransport: Transport = async (p) => {
  const res = await fetch('/api/kuesioner/submit', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
  if (!res.ok) throw new Error(res.status === 404 || res.status === 503 ? 'Layanan kuesioner belum tersedia di server.' : `Gagal mengirim (${res.status}).`)
  const body = (await res.json()) as { receiptId: string }
  return { id: body.receiptId, demo: false }
}
