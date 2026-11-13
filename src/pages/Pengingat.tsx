import { useState } from 'react'
import { BellRing, Info, Smartphone } from 'lucide-react'
import { JENIS_PENGINGAT, PREFERENSI_BAWAAN, type JenisPengingat, type PreferensiPengingat } from '../lib/pengingat'
import { usePref } from '../lib/prefs'
import { PageHeader, Section } from '../components/ui'

// U07: preferensi pengingat. Izin notifikasi HANYA diminta setelah pengguna menekan tombol.
// Pengiriman Web Push butuh server (kunci VAPID, penyimpanan langganan, cron) yang belum tersedia;
// halaman ini jujur menyatakannya. Penjadwal yang akan dipakai server: src/lib/pengingat.ts.

const NAMA: Record<JenisPengingat, string> = { tugas: 'Tugas', tagihan: 'Tagihan', event: 'Event', nilai: 'Nilai terbit', kuesioner: 'Kuesioner' }

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

export function Pengingat({ back }: { back: () => void }) {
  const [pref, setPref] = usePref<PreferensiPengingat>('pengingat.pref', PREFERENSI_BAWAAN)
  const didukung = typeof Notification !== 'undefined' && 'serviceWorker' in navigator
  const [izin, setIzin] = useState<NotificationPermission | 'tidak-didukung'>(didukung ? Notification.permission : 'tidak-didukung')
  const iosPerluPasang = isIos() && !isStandalone()

  const aktifkan = async () => setIzin(await Notification.requestPermission())
  const setJenis = (j: JenisPengingat, v: boolean) => setPref({ ...pref, jenis: { ...pref.jenis, [j]: v } })

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Pengingat" subtitle="Tugas, tagihan, event, nilai, dan kuesioner" onBack={back} />

      <div className="glass p-5">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
          <div className="text-sm">
            {izin === 'granted' ? (
              <p>Izin notifikasi sudah diberikan di perangkat ini.</p>
            ) : izin === 'denied' ? (
              <p>Izin notifikasi ditolak. Aktifkan lagi dari pengaturan situs di browser bila ingin menerima pengingat.</p>
            ) : izin === 'tidak-didukung' ? (
              <p>Browser ini tidak mendukung notifikasi.</p>
            ) : (
              <p>Pengingat dikirim sebagai notifikasi. Izin hanya diminta setelah Anda menekan tombol di bawah.</p>
            )}
            <p className="mt-2 flex gap-1.5 text-xs text-amber" role="note">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Pengiriman pengingat dari server belum aktif. Preferensi di bawah sudah tersimpan dan akan dipakai begitu layanan notifikasi kampus tersedia.
            </p>
          </div>
        </div>
        {izin === 'default' && !iosPerluPasang && (
          <button onClick={aktifkan} className="btn-primary mt-4 min-h-12 w-full rounded-2xl font-semibold">Aktifkan pengingat</button>
        )}
        {iosPerluPasang && (
          <p className="mt-4 flex gap-2 rounded-xl bg-glass-strong p-3 text-xs text-mid">
            <Smartphone className="h-4 w-4 shrink-0" aria-hidden /> Di iPhone/iPad, notifikasi web hanya berfungsi setelah Super UNPAM dipasang ke Layar Utama (Bagikan → Tambahkan ke Layar Utama), lalu dibuka dari ikon tersebut.
          </p>
        )}
      </div>

      <Section title="Jenis pengingat">
        <ul className="glass divide-y divide-line overflow-hidden">
          {JENIS_PENGINGAT.map((j) => (
            <li key={j}>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4">
                <span className="text-sm font-semibold">{NAMA[j]}</span>
                <input type="checkbox" checked={pref.jenis[j]} onChange={(e) => setJenis(j, e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Jam tenang">
        <div className="glass space-y-3 p-4">
          <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold">
            Jangan kirim di malam hari
            <input type="checkbox" checked={!!pref.jamTenang} onChange={(e) => setPref({ ...pref, jamTenang: e.target.checked ? PREFERENSI_BAWAAN.jamTenang : null })} className="h-5 w-5 accent-[var(--primary)]" />
          </label>
          {pref.jamTenang && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>
                Mulai
                <input type="time" value={pref.jamTenang.mulai} onChange={(e) => e.target.value && setPref({ ...pref, jamTenang: { ...pref.jamTenang!, mulai: e.target.value } })} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-glass-strong px-3" />
              </label>
              <label>
                Selesai
                <input type="time" value={pref.jamTenang.selesai} onChange={(e) => e.target.value && setPref({ ...pref, jamTenang: { ...pref.jamTenang!, selesai: e.target.value } })} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-glass-strong px-3" />
              </label>
            </div>
          )}
          <p className="text-xs text-low">Pengingat yang jatuh di jam tenang dikirim lebih awal, sebelum jam tenang dimulai, supaya tidak terlewat dari tenggat. Waktu mengikuti WIB.</p>
        </div>
      </Section>

      <Section title="Frekuensi">
        <div className="glass space-y-3 p-4 text-sm">
          <fieldset>
            <legend className="font-semibold">Ingatkan sebelum tenggat</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[[24 * 60, '1 hari'], [3 * 60, '3 jam'], [60, '1 jam']].map(([m, l]) => {
                const on = pref.sebelumMenit.includes(m as number)
                return (
                  <label key={m} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-glass-strong px-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setPref({ ...pref, sebelumMenit: on ? pref.sebelumMenit.filter((x) => x !== m) : [...pref.sebelumMenit, m as number] })}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    {l}
                  </label>
                )
              })}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
            Maksimal per hari
            <select value={pref.maksPerHari} onChange={(e) => setPref({ ...pref, maksPerHari: Number(e.target.value) })} className="min-h-11 rounded-xl border border-line bg-glass-strong px-3">
              {[3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </Section>
    </div>
  )
}
