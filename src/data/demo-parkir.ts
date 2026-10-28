// Data contoh parkir & pemakaian KTM. TODO(Sarpras): diganti data sistem parkir kampus lewat konektor `sarpras`.
// Plat nomor & kendaraan di bawah fiktif.
import type { AreaParkir, Kendaraan, LogAkses, SesiParkir } from '../lib/parkir.js'
import { ATURAN_PARKIR } from './aturan-parkir.js'

export const kendaraanContoh = (): Kendaraan[] => [
  { id: 'KND-7Q2M', plat: 'B 4821 PAM', jenis: 'motor', merek: 'Honda Vario 125', warna: 'Hitam', status: 'terverifikasi', stnk: { nama: 'stnk-vario.jpg', ukuran: 412_331 } },
]

const TERISI: Record<string, number> = { 'PML-M1': 612, 'PML-C1': 104, 'VKT-M1': 1388, 'VKT-C1': 200 }
export const areaContoh = (): AreaParkir[] => ATURAN_PARKIR.area.map((a) => ({ ...a, terisi: TERISI[a.id] ?? 0 }))

export const riwayatContoh = (): SesiParkir[] => [
  { id: 'PRK-0003', kendaraanId: 'KND-7Q2M', plat: 'B 4821 PAM', areaId: 'PML-M1', areaNama: 'Parkir Motor Gedung A', masuk: '2026-10-27T00:42:00.000Z', keluar: '2026-10-27T08:15:00.000Z', tarif: null, menginap: false },
  { id: 'PRK-0002', kendaraanId: 'KND-7Q2M', plat: 'B 4821 PAM', areaId: 'VKT-M1', areaNama: 'Parkir Motor Basement', masuk: '2026-10-26T05:58:00.000Z', keluar: '2026-10-26T10:31:00.000Z', tarif: null, menginap: false },
  { id: 'PRK-0001', kendaraanId: 'KND-7Q2M', plat: 'B 4821 PAM', areaId: 'PML-M1', areaNama: 'Parkir Motor Gedung A', masuk: '2026-10-23T00:51:00.000Z', keluar: '2026-10-23T06:02:00.000Z', tarif: null, menginap: false },
]

export const logContoh = (): LogAkses[] => [
  { id: 'LOG-6', waktu: '2026-10-27T08:15:00.000Z', jenis: 'parkir-keluar', lokasi: 'Parkir Motor Gedung A', ket: 'B 4821 PAM' },
  { id: 'LOG-5', waktu: '2026-10-27T04:10:00.000Z', jenis: 'perpustakaan', lokasi: 'Perpustakaan Pusat, Kampus Pamulang', ket: 'Kunjungan' },
  { id: 'LOG-4', waktu: '2026-10-27T01:02:00.000Z', jenis: 'presensi', lokasi: 'Gedung A · 402', ket: 'Pemrograman Web' },
  { id: 'LOG-3', waktu: '2026-10-27T00:55:00.000Z', jenis: 'gedung', lokasi: 'Gerbang Gedung A' },
  { id: 'LOG-2', waktu: '2026-10-27T00:42:00.000Z', jenis: 'parkir-masuk', lokasi: 'Parkir Motor Gedung A', ket: 'B 4821 PAM' },
  { id: 'LOG-1', waktu: '2026-10-26T10:31:00.000Z', jenis: 'parkir-keluar', lokasi: 'Parkir Motor Basement', ket: 'B 4821 PAM' },
]
