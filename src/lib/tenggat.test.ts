import { describe, expect, it } from 'vitest'
import { hariWib, keIcs, keIsoWib, parseTanggalId, urgensi, urutkanTenggat, type Tenggat } from './tenggat'

describe('tenggat: tanggal WIB', () => {
  it('parseTanggalId menerima format Indonesia umum', () => {
    expect(parseTanggalId('16 Nov 2026', '08:00')).toBe('2026-11-16T08:00:00+07:00')
    expect(parseTanggalId('Sen, 16 Nov 2026', '8.30')).toBe('2026-11-16T08:30:00+07:00')
    expect(parseTanggalId('10 November 2026')).toBe('2026-11-10T00:00:00+07:00')
    expect(parseTanggalId('1 Agu 2026', '23:59')).toBe('2026-08-01T23:59:00+07:00')
  })

  it('menolak format tak dikenal alih-alih menebak', () => {
    expect(() => parseTanggalId('besok')).toThrow(/tidak dikenali/)
    expect(() => parseTanggalId('16 Foo 2026')).toThrow(/bulan/)
  })

  it('keIsoWib & hariWib memakai jam dinding WIB', () => {
    const d = new Date('2026-11-15T18:30:00Z') // = 16 Nov 01:30 WIB
    expect(keIsoWib(d)).toBe('2026-11-16T01:30:00+07:00')
    expect(hariWib(d)).toBe('2026-11-16')
  })
})

describe('tenggat: urgensi & ekspor', () => {
  const now = new Date('2026-11-16T07:00:00+07:00')
  const t = (id: string, waktu: string, selesaiDikerjakan = false): Tenggat => ({ id, judul: id, waktu, sumber: 'ujian', selesaiDikerjakan })

  it('urgensi: terlambat, hari ini, minggu ini, nanti', () => {
    expect(urgensi(t('a', '2026-11-15T10:00:00+07:00'), now)).toBe('terlambat')
    expect(urgensi(t('a', '2026-11-15T10:00:00+07:00', true), now)).not.toBe('terlambat')
    expect(urgensi(t('b', '2026-11-16T23:00:00+07:00'), now)).toBe('hari-ini')
    expect(urgensi(t('c', '2026-11-20T08:00:00+07:00'), now)).toBe('minggu-ini')
    expect(urgensi(t('d', '2026-12-20T08:00:00+07:00'), now)).toBe('nanti')
  })

  it('urutan: terlambat dulu lalu waktu naik', () => {
    const list = [t('nanti', '2026-12-20T08:00:00+07:00'), t('telat', '2026-11-01T08:00:00+07:00'), t('hari', '2026-11-16T09:00:00+07:00')]
    expect(urutkanTenggat(list, now).map((x) => x.id)).toEqual(['telat', 'hari', 'nanti'])
  })

  it('ekspor .ics dengan alarm dan escaping', () => {
    const ics = keIcs([{ ...t('u1', '2026-11-16T08:00:00+07:00'), selesai: '2026-11-16T09:40:00+07:00', judul: 'UTS; Web, Lanjut', lokasi: 'A-402', alarmMenit: [1440, 120] }], new Date('2026-10-28T00:00:00Z'))
    expect(ics).toContain('DTSTART:20261116T010000Z')
    expect(ics).toContain('DTEND:20261116T024000Z')
    expect(ics).toContain('SUMMARY:UTS\\; Web\\, Lanjut')
    expect(ics).toContain('TRIGGER:-PT1440M')
    expect(ics).toContain('TRIGGER:-PT120M')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })
})
