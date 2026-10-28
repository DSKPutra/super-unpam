import { useState } from 'react'
import { getGrades, getKrsOffer, getSchedule } from '../lib/api'
import { useResource } from '../lib/useResource'
import type { KrsClass, ScheduleItem, SemesterGrades } from '../lib/types'
import { Async, Badge, DemoNote, PageHeader, Progress, Tabs } from '../components/ui'

type Tab = 'jadwal' | 'krs' | 'nilai'

export function Akademik({ tab, go }: { tab: string; go: (r: string) => void }) {
  const active = (['jadwal', 'krs', 'nilai'].includes(tab) ? tab : 'jadwal') as Tab
  return (
    <div>
      <PageHeader title="Akademik" />
      <Tabs value={active} onChange={(v) => go(`akademik/${v}`)} options={[['jadwal', 'Jadwal'], ['krs', 'KRS'], ['nilai', 'Nilai & KHS']]} />
      <DemoNote />
      {active === 'jadwal' && <JadwalTab />}
      {active === 'krs' && <KrsTab />}
      {active === 'nilai' && <NilaiTab />}
    </div>
  )
}

function JadwalTab() {
  const res = useResource(getSchedule)
  return <Async res={res}>{(schedule) => <Jadwal schedule={schedule} />}</Async>
}

function KrsTab() {
  const res = useResource(getKrsOffer)
  return <Async res={res}>{(offer) => <Krs krsOffer={offer} />}</Async>
}

function NilaiTab() {
  const res = useResource(getGrades)
  return <Async res={res}>{(grades) => <Nilai grades={grades} />}</Async>
}

function Jadwal({ schedule }: { schedule: ScheduleItem[] }) {
  const days = [...new Set(schedule.map((s) => s.day))]
  return (
    <div className="space-y-4">
      {days.map((d) => (
        <div key={d}>
          <h3 className="mb-2 text-sm font-semibold text-mid">{d}</h3>
          <div className="glass divide-y divide-line">
            {schedule
              .filter((s) => s.day === d)
              .map((s) => (
                <div key={s.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                  <div className="w-24 font-mono text-xs font-semibold text-cyan">{s.time}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-mid">{s.code} · {s.lecturer}</div>
                  </div>
                  <Badge>📍 {s.room}</Badge>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Krs({ krsOffer }: { krsOffer: KrsClass[] }) {
  const MAX = 24
  const [picked, setPicked] = useState<string[]>(['TIF301', 'TIF305'])
  const [submitted, setSubmitted] = useState(false)
  const sks = krsOffer.filter((c) => picked.includes(c.code)).reduce((a, c) => a + c.sks, 0)
  const toggle = (code: string) => setPicked((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]))
  return (
    <div>
      <div className="glass mb-4 p-4">
        <div className="flex items-center justify-between text-sm">
          <span>Total SKS dipilih</span>
          <span className="font-bold">{sks} / {MAX}</span>
        </div>
        <div className="mt-2">
          <Progress value={(sks / MAX) * 100} color={sks > MAX ? 'var(--rose)' : 'var(--primary)'} />
        </div>
      </div>
      <div className="glass divide-y divide-line">
        {krsOffer.map((c) => {
          const full = c.filled >= c.quota
          const on = picked.includes(c.code)
          return (
            <label key={c.code} className={`flex items-center gap-3 p-4 ${full && !on ? 'opacity-50' : 'cursor-pointer'}`}>
              <input type="checkbox" checked={on} disabled={(full && !on) || submitted} onChange={() => toggle(c.code)} className="h-5 w-5 accent-[var(--primary)]" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-mid">{c.code} · Kelas {c.class} · {c.sks} SKS</div>
              </div>
              <Badge tone={full ? 'red' : c.quota - c.filled < 5 ? 'amber' : 'green'}>
                {full ? 'Penuh' : `Sisa ${c.quota - c.filled}`}
              </Badge>
            </label>
          )
        })}
      </div>
      <button
        disabled={submitted || sks === 0 || sks > MAX}
        onClick={() => setSubmitted(true)}
        className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitted ? '✓ KRS diajukan, menunggu persetujuan dosen PA' : 'Ajukan KRS'}
      </button>
    </div>
  )
}

function Nilai({ grades }: { grades: SemesterGrades[] }) {
  const allCourses = grades.flatMap((g) => g.courses)
  const totalSks = allCourses.reduce((a, c) => a + c.sks, 0)
  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-cyan">3.67</div>
          <div className="text-xs text-mid">IPK</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold">{totalSks}</div>
          <div className="text-xs text-mid">SKS lulus</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold">{grades[0]?.ips ?? '—'}</div>
          <div className="text-xs text-mid">IPS terakhir</div>
        </div>
      </div>
      {grades.map((g) => (
        <div key={g.semester} className="glass mb-4 overflow-hidden">
          <div className="flex items-center justify-between bg-glass-strong px-4 py-3 text-sm font-semibold">
            {g.semester}
            <Badge tone="blue">IPS {g.ips}</Badge>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {g.courses.map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-mid">{c.code}</div>
                  </td>
                  <td className="px-2 text-center text-mid">{c.sks} SKS</td>
                  <td className="px-4 text-right text-base font-bold">{c.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <button className="w-full rounded-xl border border-primary py-3 font-semibold text-cyan" onClick={() => window.print()}>
        ⬇️ Unduh / cetak KHS
      </button>
    </div>
  )
}
