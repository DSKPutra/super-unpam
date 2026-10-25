import { useMemo, useState } from 'react'
import { FEATURES } from '../data/features'
import { bills, events, news, rupiah, schedule, tasks } from '../data/demo'
import type { Dict } from '../lib/i18n'
import type { User } from '../lib/types'
import { Badge, LinkBtn, Section } from '../components/ui'

export function Home({ t, user, go, favorites, hidden }: { t: Dict; user: User; go: (r: string) => void; favorites: string[]; hidden: string[] }) {
  const [q, setQ] = useState('')
  const first = user.name.split(' ')[0]
  const nick = first.charAt(0) + first.slice(1).toLowerCase()

  const features = FEATURES.filter((f) => f.roles.includes(user.role) && !hidden.includes(f.id))
  const ordered = [...features.filter((f) => favorites.includes(f.id)), ...features.filter((f) => !favorites.includes(f.id))]

  const results = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    const feat = features
      .filter((f) => [f.name, f.source, ...f.keywords].join(' ').toLowerCase().includes(n))
      .map((f) => ({ key: f.id, label: f.name, sub: 'Fitur', icon: f.icon, route: f.route }))
    const courses = schedule
      .filter((s) => s.name.toLowerCase().includes(n))
      .map((s) => ({ key: s.code + s.day, label: s.name, sub: `${s.day} ${s.time}`, icon: '📚', route: 'akademik/jadwal' }))
    const evs = events.filter((e) => e.title.toLowerCase().includes(n)).map((e) => ({ key: e.id, label: e.title, sub: e.date, icon: '🎤', route: 'event' }))
    return [...feat, ...courses, ...evs].slice(0, 8)
  }, [q, features])

  const today = schedule.slice(0, 2)
  const unpaid = bills.filter((b) => b.status === 'unpaid')
  const todo = tasks.filter((x) => x.status === 'todo')

  return (
    <div>
      <div className="rounded-3xl bg-gradient-to-br from-unpam-600 to-unpam-700 p-5 text-white shadow-lg md:p-7 dark:to-slate-900">
        <p className="text-sm opacity-80">{user.role} · {user.prodi}</p>
        <h1 className="mt-1 text-xl font-semibold md:text-2xl">{t.greeting(nick)}</h1>
        <div className="relative mt-4">
          <label className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-900">
            <span aria-hidden>🔍</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="w-full bg-transparent outline-none placeholder:text-slate-400" />
          </label>
          {q && (
            <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800">
              {results.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">{t.noResult}</li>}
              {results.map((r) => (
                <li key={r.key}>
                  <button onClick={() => go(r.route)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span aria-hidden>{r.icon}</span>
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-auto text-xs text-slate-500">{r.sub}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <button onClick={() => go('akademik/nilai')} className="rounded-xl bg-white/10 py-2.5 hover:bg-white/20">
            <div className="text-lg font-bold">3.67</div>
            <div className="text-[11px] opacity-80">IPK</div>
          </button>
          <button onClick={() => go('keuangan')} className="rounded-xl bg-white/10 py-2.5 hover:bg-white/20">
            <div className="text-lg font-bold">{unpaid.length}</div>
            <div className="text-[11px] opacity-80">{t.bills}</div>
          </button>
          <button onClick={() => go('kuliah/tugas')} className="rounded-xl bg-white/10 py-2.5 hover:bg-white/20">
            <div className="text-lg font-bold">{todo.length}</div>
            <div className="text-[11px] opacity-80">{t.tasks}</div>
          </button>
        </div>
      </div>

      <Section title={t.features}>
        <div className="card grid grid-cols-4 gap-y-4 p-4 sm:grid-cols-6 lg:grid-cols-7">
          {ordered.map((f) => (
            <button key={f.id} onClick={() => go(f.route)} className="group flex flex-col items-center gap-1.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition group-hover:scale-105" style={{ background: `${f.color}1f` }} aria-hidden>
                {f.icon}
              </span>
              <span className="text-center text-[11px] font-medium leading-tight">{f.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t.today} action={<LinkBtn onClick={() => go('akademik/jadwal')}>{t.seeAll}</LinkBtn>}>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {today.map((s) => (
              <div key={s.code} className="flex items-center gap-4 p-4">
                <div className="w-20 font-mono text-xs font-semibold text-unpam-600 dark:text-unpam-100">{s.time}</div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.room}</div>
                </div>
                <button onClick={() => go('presensi')} className="ml-auto shrink-0 rounded-lg bg-unpam-600 px-3 py-1.5 text-xs font-semibold text-white">
                  {t.checkIn}
                </button>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t.dueSoon} action={<LinkBtn onClick={() => go('kuliah/tugas')}>{t.seeAll}</LinkBtn>}>
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {todo.slice(0, 2).map((x) => (
              <button key={x.id} onClick={() => go('kuliah/tugas')} className="flex w-full items-center gap-3 p-4 text-left">
                <span aria-hidden>✅</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{x.title}</div>
                  <div className="text-xs text-slate-500">{x.course} · {x.due}</div>
                </div>
              </button>
            ))}
            {unpaid.slice(0, 1).map((b) => (
              <button key={b.id} onClick={() => go('keuangan')} className="flex w-full items-center gap-3 p-4 text-left">
                <span aria-hidden>💳</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{rupiah(b.amount)}</div>
                  <div className="text-xs text-slate-500">Jatuh tempo {b.due}</div>
                </div>
                <Badge tone="red">Belum bayar</Badge>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section title={t.news}>
        <div className="flex snap-x gap-3 overflow-x-auto pb-2">
          {news.map((n) => (
            <article key={n.id} className="card w-64 shrink-0 snap-start p-4">
              <Badge tone="blue">{n.tag}</Badge>
              <h3 className="mt-2 text-sm font-semibold leading-snug">{n.title}</h3>
              <p className="mt-2 text-xs text-slate-500">{n.date}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
