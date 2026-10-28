import type { Tenggat } from '../tenggat'
import type { SesiUjian } from './types'

/** Alarm default sesi ujian: H-1 dan 2 jam sebelumnya. */
export const ALARM_UJIAN_MENIT = [24 * 60, 2 * 60]

/** Sesi ujian → Tenggat agar muncul di radar Pusat Tenggat dan ekspor .ics. */
export function sesiKeTenggat(s: SesiUjian, rute = 'ujian'): Tenggat {
  return {
    id: `ujian-${s.id}`,
    judul: `${s.jenis.replace('_', ' ')} · ${s.judul}`,
    waktu: s.mulai,
    selesai: s.selesai,
    lokasi: [s.ruang, s.kursi && `kursi ${s.kursi}`].filter(Boolean).join(', '),
    sumber: 'ujian',
    rute,
    alarmMenit: ALARM_UJIAN_MENIT,
  }
}
