import { useState } from 'react'
import { BookOpen, Dumbbell, FlaskConical, UserRound } from 'lucide-react'
import { DemoNote, PageHeader, Section } from '../../components/ui'

// #45 Booking fasilitas & ruang — pilih fasilitas, hari, slot → konfirmasi.
const FAC = [
  { id: 'diskusi', name: 'Ruang diskusi perpustakaan', Icon: BookOpen },
  { id: 'lab', name: 'Lab komputer', Icon: FlaskConical },
  { id: 'lapangan', name: 'Lapangan olahraga', Icon: Dumbbell },
  { id: 'dosen', name: 'Bimbingan dosen', Icon: UserRound },
]
const DAYS = ['Sen 2', 'Sel 3', 'Rab 4', 'Kam 5', 'Jum 6']
const SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']
// slot terisi (contoh) — deterministik per fasilitas+hari
const taken = (f: string, d: number, s: number) => (f.length * 7 + d * 3 + s * 5) % 4 === 0

export function Booking({ back, tab }: { back: () => void; tab?: string }) {
  // #/booking/dosen membuka langsung bimbingan dosen (dari halaman Skripsi/TA).
  const [fac, setFac] = useState(FAC.some((x) => x.id === tab) ? tab! : FAC[0].id)
  const [day, setDay] = useState(0)
  const [slot, setSlot] = useState<number | null>(null)
  const [booked, setBooked] = useState<string[]>([])
  const f = FAC.find((x) => x.id === fac)!
  return (
    <div>
      <PageHeader title="Booking Fasilitas" onBack={back} />
      <DemoNote />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {FAC.map((x) => (
          <button key={x.id} onClick={() => (setFac(x.id), setSlot(null))} aria-pressed={fac === x.id} className={`glass flex min-h-20 flex-col items-center justify-center gap-1.5 p-3 text-center text-xs font-semibold ${fac === x.id ? 'ring-2 ring-[var(--primary)]' : ''}`}>
            <x.Icon className="h-5 w-5 text-cyan" /> {x.name}
          </button>
        ))}
      </div>
      <Section title="November 2026">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => (setDay(i), setSlot(null))} aria-pressed={day === i} className={`min-h-12 shrink-0 rounded-2xl px-4 text-sm font-semibold ${day === i ? 'btn-primary' : 'bg-glass-strong text-mid'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {SLOTS.map((s, i) => {
            const t = taken(fac, day, i)
            return (
              <button key={s} disabled={t} onClick={() => setSlot(i)} aria-pressed={slot === i} className={`min-h-11 rounded-xl text-sm font-semibold ${t ? 'cursor-not-allowed bg-glass text-low line-through' : slot === i ? 'btn-primary' : 'bg-glass-strong'}`}>
                {s}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-low">Slot dicoret = sudah dipesan.</p>
      </Section>
      <button
        disabled={slot === null}
        onClick={() => {
          setBooked((b) => [`${f.name} · ${DAYS[day]} Nov · ${SLOTS[slot!]}`, ...b])
          setSlot(null)
        }}
        className="btn-primary mt-5 min-h-12 w-full rounded-2xl font-semibold"
      >
        {slot === null ? 'Pilih slot' : `Booking ${SLOTS[slot]}`}
      </button>
      {booked.length > 0 && (
        <Section title="Booking saya">
          <ul className="glass divide-y divide-line text-sm">
            {booked.map((b) => (
              <li key={b} className="px-4 py-3">✓ {b}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
