import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Armchair, CalendarClock, MapPin, ScrollText } from 'lucide-react'
import type { User } from '../../lib/types'
import { DemoNote, PageHeader, Section } from '../../components/ui'

// #43 Exam center — jadwal ujian, nomor kursi, kartu ujian ber-QR, tata tertib.
const EXAMS = [
  { code: 'TIF301', name: 'Pemrograman Web', date: 'Sen, 16 Nov 2026', time: '08:00–09:40', room: 'Gedung A · 402', seat: 'A-17' },
  { code: 'TIF303', name: 'Basis Data Lanjut', date: 'Sel, 17 Nov 2026', time: '10:00–11:40', room: 'Gedung B · 305', seat: 'C-04' },
  { code: 'TIF305', name: 'Kecerdasan Buatan', date: 'Rab, 18 Nov 2026', time: '13:00–14:40', room: 'Lab Komputer 3', seat: 'PC-22' },
]
const RULES = ['Hadir 15 menit sebelum ujian dimulai.', 'Tunjukkan kartu ujian (QR) kepada pengawas.', 'HP dimatikan dan disimpan di tas.', 'Wajib berpakaian rapi dan bersepatu.']

export function Ujian({ user, back }: { user: User; back: () => void }) {
  const [qr, setQr] = useState('')
  useEffect(() => {
    // TODO(BFF): payload kartu ujian ditandatangani server
    QRCode.toDataURL(`SUPERUNPAM:UJIAN:${user.nim}:UTS-GANJIL-2026`, { margin: 1, width: 220 }).then(setQr)
  }, [user.nim])
  return (
    <div>
      <PageHeader title="Exam Center" subtitle="UTS Ganjil 2026/2027" onBack={back} />
      <DemoNote />
      <div className="glass flex flex-col items-center gap-4 p-5 sm:flex-row">
        {qr && <img src={qr} alt="QR kartu ujian" width={144} height={144} className="h-36 w-36 rounded-xl bg-white p-1.5" />}
        <div className="text-center sm:text-left">
          <div className="text-xs uppercase tracking-[0.16em] text-mid">Kartu ujian digital</div>
          <div className="font-display text-lg font-bold">{user.name}</div>
          <div className="font-mono text-sm text-mid">{user.nim}</div>
          <div className="mt-1 text-xs text-low">Tunjukkan QR ini ke pengawas ruang ujian.</div>
        </div>
      </div>
      <Section title="Jadwal ujian">
        <div className="space-y-3">
          {EXAMS.map((e) => (
            <article key={e.code} className="glass p-4">
              <div className="font-semibold">{e.name}</div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-mid">
                <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4 text-cyan" /> {e.date}<br />{e.time}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-rose" /> {e.room}</span>
                <span className="flex items-center gap-1"><Armchair className="h-4 w-4 text-amber" /> Kursi {e.seat}</span>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section title="Tata tertib">
        <ul className="glass space-y-2 p-4 text-sm">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2"><ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-cyan" /> {r}</li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
