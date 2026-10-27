import { useState } from 'react'
import { Briefcase, Search, UserRoundCheck } from 'lucide-react'
import { Badge, DemoNote, PageHeader, Section, Tabs } from '../../components/ui'

// #49 Alumni & mentorship — direktori alumni, mentoring, lowongan dari alumni.
const ALUMNI = [
  { name: 'Rizky Pratama', angkatan: 2017, prodi: 'Teknik Informatika', kerja: 'Backend Engineer · Tokopedia', mentor: true },
  { name: 'Nadia Putri', angkatan: 2016, prodi: 'Akuntansi', kerja: 'Auditor · KAP Big 4', mentor: true },
  { name: 'Ahmad Fauzi', angkatan: 2018, prodi: 'Manajemen', kerja: 'Founder · UMKM digital', mentor: false },
  { name: 'Siti Aisyah', angkatan: 2015, prodi: 'Teknik Informatika', kerja: 'Data Scientist · Bank BUMN', mentor: true },
]
const JOBS = [
  { title: 'Magang Frontend Developer', company: 'Startup edutech (alumni 2017)', type: 'Magang · Remote' },
  { title: 'Staff Accounting', company: 'KAP mitra alumni', type: 'Full-time · Jakarta' },
]

export function Alumni({ back }: { back: () => void }) {
  const [tab, setTab] = useState<'dir' | 'loker'>('dir')
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState<string[]>([])
  const list = ALUMNI.filter((a) => [a.name, a.prodi, a.kerja].join(' ').toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <PageHeader title="Alumni & Mentorship" onBack={back} />
      <Tabs value={tab} onChange={setTab} options={[['dir', 'Direktori & mentor'], ['loker', 'Lowongan alumni']]} />
      <DemoNote />
      {tab === 'dir' ? (
        <>
          <label className="glass flex min-h-12 items-center gap-2 !rounded-2xl px-4">
            <Search className="h-4 w-4 text-mid" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, prodi, atau perusahaan" aria-label="Cari alumni" className="w-full bg-transparent outline-none placeholder:text-low" />
          </label>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {list.map((a) => (
              <article key={a.name} className="glass p-4">
                <div className="flex items-start gap-3">
                  <span className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold">{a.name.split(' ').map((w) => w[0]).join('')}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-low">{a.prodi} · {a.angkatan}</div>
                    <div className="mt-1 text-sm text-mid">{a.kerja}</div>
                  </div>
                  {a.mentor && <Badge tone="green">Mentor</Badge>}
                </div>
                {a.mentor && (
                  <button disabled={asked.includes(a.name)} onClick={() => setAsked((x) => [...x, a.name])} className="mt-3 flex min-h-10 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold disabled:text-mint">
                    <UserRoundCheck className="h-4 w-4" /> {asked.includes(a.name) ? 'Permintaan terkirim' : 'Minta mentoring'}
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <Section title="Dibagikan oleh alumni">
          <ul className="glass divide-y divide-line">
            {JOBS.map((j) => (
              <li key={j.title} className="flex items-center gap-3 px-4 py-3.5">
                <Briefcase className="h-5 w-5 text-cyan" />
                <div>
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-xs text-low">{j.company} · {j.type}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
