import { useState } from 'react'
import { certifications, events, ranking, toefl } from '../data/demo'
import { Badge, DemoNote, PageHeader, Progress, Section } from '../components/ui'

type Back = { back: () => void }

export function Event({ back }: Back) {
  const [joined, setJoined] = useState<string[]>(['e1'])
  return (
    <div>
      <PageHeader title="Event Kampus" onBack={back} />
      <DemoNote />
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((e) => {
          const on = joined.includes(e.id)
          return (
            <article key={e.id} className="card p-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone="blue">📅 {e.date}</Badge>
                {e.sertifikat && <Badge tone="green">Bersertifikat</Badge>}
              </div>
              <h3 className="mt-2 font-semibold">{e.title}</h3>
              <p className="text-xs text-slate-500">📍 {e.place}</p>
              <div className="mt-3">
                <Progress value={(e.registered / e.quota) * 100} />
                <div className="mt-1 text-xs text-slate-500">{e.registered} / {e.quota} peserta</div>
              </div>
              <button
                onClick={() => setJoined((j) => (on ? j.filter((x) => x !== e.id) : [...j, e.id]))}
                className={`mt-3 w-full rounded-xl py-2 text-sm font-semibold ${on ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-unpam-600 text-white'}`}
              >
                {on ? '✓ Terdaftar (ketuk untuk batal)' : 'Daftar'}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function Sertifikasi({ back }: Back) {
  return (
    <div>
      <PageHeader title="Sertifikasi Profesi" onBack={back} />
      <DemoNote />
      <div className="space-y-3">
        {certifications.map((c) => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{c.scheme}</h3>
                <p className="text-xs text-slate-500">{c.date}</p>
              </div>
              <Badge tone={c.progress === 100 ? 'green' : c.progress > 0 ? 'blue' : 'amber'}>{c.status}</Badge>
            </div>
            <div className="mt-3">
              <Progress value={c.progress} color={c.progress === 100 ? '#16a34a' : '#0b4ea2'} />
            </div>
            {c.progress === 0 && <button className="mt-3 rounded-lg bg-unpam-600 px-4 py-2 text-sm font-semibold text-white">Daftar skema</button>}
            {c.progress === 100 && <button className="mt-3 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">⬇️ Unduh sertifikat</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Toefl({ back }: Back) {
  const [booked, setBooked] = useState(false)
  return (
    <div>
      <PageHeader title="TOEFL & Lembaga Bahasa" onBack={back} />
      <DemoNote />
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-unpam-600 dark:text-unpam-100">{toefl.best}</div>
          <div className="text-xs text-slate-500">Skor terbaik</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-emerald-600">{toefl.best >= toefl.target ? '✓' : toefl.target}</div>
          <div className="text-xs text-slate-500">Syarat lulus ({toefl.target})</div>
        </div>
      </div>
      <Section title="Jadwal tes berikutnya">
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <div className="flex-1">
            <div className="font-semibold">TOEFL Prediction · {toefl.next.date}</div>
            <div className="text-xs text-slate-500">{toefl.next.place} · sisa {toefl.next.seats} kursi</div>
          </div>
          <button disabled={booked} onClick={() => setBooked(true)} className="rounded-lg bg-unpam-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {booked ? '✓ Terdaftar' : 'Daftar tes'}
          </button>
        </div>
      </Section>
      <Section title="Riwayat skor">
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {toefl.history.map((h) => (
            <div key={h.date} className="flex items-center gap-4 p-4">
              <div className="text-2xl font-bold">{h.score}</div>
              <div className="flex-1 text-xs text-slate-500">
                {h.date}
                <br />
                Listening {h.listening} · Structure {h.structure} · Reading {h.reading}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

export function Prestasi({ back }: Back) {
  return (
    <div>
      <PageHeader title="Prestasi & Peringkat" onBack={back} />
      <DemoNote />
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow">
        <div className="text-sm opacity-90">Peringkat di program studi</div>
        <div className="mt-1 text-4xl font-bold">
          #{ranking.prodiRank} <span className="text-base font-medium opacity-90">dari {ranking.prodiTotal}</span>
        </div>
        <div className="mt-2 text-sm">🏅 {ranking.points} poin prestasi</div>
      </div>
      <Section title="Prestasi tercatat">
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {ranking.achievements.map((a) => (
            <div key={a.title} className="flex items-center gap-3 p-4">
              <span className="text-2xl" aria-hidden>🏆</span>
              <div className="flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-slate-500">Tingkat {a.level}</div>
              </div>
              <Badge tone="amber">+{a.points}</Badge>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
          + Ajukan prestasi baru
        </button>
      </Section>
    </div>
  )
}

export function Tracer({ back }: Back) {
  const [sent, setSent] = useState(false)
  return (
    <div>
      <PageHeader title="Tracer Study" onBack={back} />
      <DemoNote />
      {sent ? (
        <div className="card p-6 text-center">✓ Terima kasih, survei Anda sudah terkirim.</div>
      ) : (
        <form
          className="card space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            setSent(true)
          }}
        >
          <label className="block text-sm">
            <span className="font-medium">Status saat ini</span>
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2.5 dark:border-slate-700">
              <option>Bekerja</option>
              <option>Wirausaha</option>
              <option>Melanjutkan studi</option>
              <option>Sedang mencari kerja</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Nama instansi / perusahaan</span>
            <input className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2.5 dark:border-slate-700" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Waktu tunggu kerja pertama</span>
            <select className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2.5 dark:border-slate-700">
              <option>&lt; 3 bulan</option>
              <option>3–6 bulan</option>
              <option>6–12 bulan</option>
              <option>&gt; 12 bulan</option>
            </select>
          </label>
          <button className="w-full rounded-xl bg-unpam-600 py-3 font-semibold text-white">Kirim survei</button>
        </form>
      )}
    </div>
  )
}

export function Kerjasama({ back }: Back) {
  const items = [
    { name: 'PT Teknologi Nusantara', type: 'MoA', until: 'Des 2027', status: 'Aktif' },
    { name: 'Universitas Teknologi Malaysia', type: 'MoU', until: 'Mar 2028', status: 'Aktif' },
    { name: 'Dinas Kominfo Tangerang Selatan', type: 'IA', until: 'Nov 2026', status: 'Segera berakhir' },
  ]
  return (
    <div>
      <PageHeader title="Kerjasama" onBack={back} />
      <DemoNote />
      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {items.map((i) => (
          <div key={i.name} className="flex items-center gap-3 p-4">
            <Badge tone="blue">{i.type}</Badge>
            <div className="flex-1">
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-slate-500">Berlaku hingga {i.until}</div>
            </div>
            <Badge tone={i.status === 'Aktif' ? 'green' : 'amber'}>{i.status}</Badge>
          </div>
        ))}
      </div>
      <button className="mt-3 w-full rounded-xl bg-unpam-600 py-3 font-semibold text-white">+ Ajukan kerjasama baru</button>
    </div>
  )
}
