import { useSyncExternalStore } from 'react'
import type { Tenggat } from './tenggat'

// Peristiwa status penting (jadwal berubah, ujian disetujui, hasil terbit, revisi diminta) →
// notifikasi dalam aplikasi + Pusat Tenggat. Mode BFF: server yang memancarkan (push/SSE), TODO.
// Isi notifikasi TIDAK memuat nilai (hanya "hasil tersedia").

export interface PeristiwaApp {
  id: string
  judul: string
  isi: string
  rute?: string
  waktu: string
  tenggat?: Tenggat
}

let daftar: PeristiwaApp[] = []
const pendengar = new Set<() => void>()

export function pancarkan(p: Omit<PeristiwaApp, 'id' | 'waktu'>) {
  // Hindari duplikat beruntun dengan isi sama (mis. render ulang).
  if (daftar[0]?.judul === p.judul && daftar[0]?.isi === p.isi) return
  daftar = [{ ...p, id: `${Date.now()}-${daftar.length}`, waktu: new Date().toISOString() }, ...daftar].slice(0, 50)
  pendengar.forEach((l) => l())
}

export function usePeristiwa() {
  return useSyncExternalStore(
    (l) => (pendengar.add(l), () => pendengar.delete(l)),
    () => daftar,
  )
}
