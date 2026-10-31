import { useState } from 'react'
import { getGrades, getKrsOffer, getSchedule } from '../lib/api'
import { useResource } from '../lib/useResource'
import type { KrsClass, ScheduleItem, SemesterGrades } from '../lib/types'
import { Async, Badge, DemoNote, PageHeader, Progress, Tabs } from '../components/ui'
import { calculateRequiredIps, findScheduleConflicts, summarizeIpk } from '../lib/academic'

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
  const pickedClasses = krsOffer.filter((c) => picked.includes(c.code))
  const sks = pickedClasses.reduce((a, c) => a + c.sks, 0)
  const conflicts = findScheduleConflicts(pickedClasses)
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

      {conflicts.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/30 bg-[color-mix(in_srgb,var(--rose)_12%,transparent)] p-4 text-sm text-[var(--rose)]">
          <div className="font-bold">⚠️ Terdeteksi {conflicts.length} Bentrok Jadwal KRS:</div>
          <ul className="mt-1 list-disc pl-5 space-y-1 text-xs">
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs opacity-90">Harap batalkan salah satu mata kuliah yang bertabrakan sebelum mengajukan ke dosen PA.</p>
        </div>
      )}

      <div className="glass divide-y divide-line">
        {krsOffer.map((c) => {
          const full = c.filled >= c.quota
          const on = picked.includes(c.code)
          const isConflicted = conflicts.some((cf) => cf.courseA.code === c.code || cf.courseB.code === c.code)
          return (
            <label key={c.code} className={`flex items-center gap-3 p-4 ${full && !on ? 'opacity-50' : 'cursor-pointer'} ${isConflicted ? 'bg-[color-mix(in_srgb,var(--rose)_8%,transparent)]' : ''}`}>
              <input type="checkbox" checked={on} disabled={(full && !on) || submitted} onChange={() => toggle(c.code)} className="h-5 w-5 accent-[var(--primary)]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {isConflicted && <Badge tone="red">Bentrok</Badge>}
                </div>
                <div className="text-xs text-mid">
                  {c.code} · Kelas {c.class} · {c.sks} SKS
                  {c.day && c.time && ` · 🗓️ ${c.day}, ${c.time}`}
                </div>
              </div>
              <Badge tone={full ? 'red' : c.quota - c.filled < 5 ? 'amber' : 'green'}>
                {full ? 'Penuh' : `Sisa ${c.quota - c.filled}`}
              </Badge>
            </label>
          )
        })}
      </div>
      <button
        disabled={submitted || sks === 0 || sks > MAX || conflicts.length > 0}
        onClick={() => setSubmitted(true)}
        className="mt-4 w-full rounded-xl btn-primary py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitted ? '✓ KRS diajukan, menunggu persetujuan dosen PA' : conflicts.length > 0 ? 'Perbaiki bentrok jadwal sebelum mengajukan' : 'Ajukan KRS'}
      </button>
    </div>
  )
}

function Nilai({ grades }: { grades: SemesterGrades[] }) {
  const allCourses = grades.flatMap((g) => g.courses)
  const totalSks = allCourses.reduce((a, c) => a + c.sks, 0)
  const [showSim, setShowSim] = useState(false)
  const [targetIpk, setTargetIpk] = useState(3.5)
  const [sisaSks, setSisaSks] = useState(20)

  const targetSim = calculateRequiredIps(grades, targetIpk, sisaSks)

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-cyan">{summarizeIpk(grades).ipk?.toFixed(2) ?? '—'}</div>
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

      <div className="glass mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">🎯 Kalkulator & Simulasi Target IPK</div>
            <div className="text-xs text-mid">Hitung IPS yang harus diraih untuk mencapai target kelulusan</div>
          </div>
          <button
            onClick={() => setShowSim((v) => !v)}
            className="rounded-lg bg-glass-strong px-3 py-1.5 text-xs font-semibold text-cyan hover:opacity-80"
          >
            {showSim ? 'Sembunyikan' : 'Buka Simulator'}
          </button>
        </div>

        {showSim && (
          <div className="mt-4 border-t border-line pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-mid block mb-1">Target IPK Impian</label>
                <input
                  type="number"
                  step="0.05"
                  min="2.00"
                  max="4.00"
                  value={targetIpk}
                  onChange={(e) => setTargetIpk(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg bg-[rgba(255,255,255,0.05)] border border-line px-3 py-2 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="text-xs text-mid block mb-1">Sisa SKS yang Diambil</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="40"
                  value={sisaSks}
                  onChange={(e) => setSisaSks(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg bg-[rgba(255,255,255,0.05)] border border-line px-3 py-2 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="rounded-xl bg-glass-strong p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-mid">Rekomendasi IPS Minimal:</span>
                <span className={`text-base font-bold ${targetSim.feasible ? 'text-teal-400' : 'text-rose'}`}>
                  {targetSim.feasible ? targetSim.requiredIps.toFixed(2) : '> 4.00 (Mustahil)'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-mid">Maksimum IPK Tercapai:</span>
                <span className="text-xs font-semibold">{targetSim.maxAchievableIpk.toFixed(2)}</span>
              </div>
              <div className="mt-2 text-xs">
                {targetSim.feasible ? (
                  <span className="text-teal-400">✓ Target realistis! Anda perlu mempertahankan rata-rata IPS minimal {targetSim.requiredIps.toFixed(2)}.</span>
                ) : (
                  <span className="text-rose">⚠️ Target melampaui batas matematis poin 4.00 untuk jumlah sisa SKS saat ini.</span>
                )}
              </div>
            </div>
          </div>
        )}
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
