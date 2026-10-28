import { useMemo, useState, type ReactNode } from 'react'
import { BookOpen, Mic2, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { FEATURES } from '../data/features'
import { getBills, getEvents, getNews, getSchedule, getTasks } from '../lib/api'
import { useResource } from '../lib/useResource'
import type { Dict } from '../lib/i18n'
import type { User } from '../lib/types'
import { normalizeLayout, type HomeLayout } from './widgets/layout'
import { HIDDEN_BY_DEFAULT, WIDGET_IDS, widgetById } from './widgets/registry'
import type { HomeData, WidgetDef, WidgetProps } from './widgets/types'

export function Home({ t, user, go, favorites, layout: storedLayout }: { t: Dict; user: User; go: (r: string) => void; favorites: string[]; layout: unknown }) {
  const [q, setQ] = useState('')
  // Data yang dipakai beberapa widget sekaligus dimuat sekali di sini.
  const data: HomeData = {
    schedule: useResource(getSchedule),
    events: useResource(getEvents),
    news: useResource(getNews),
    bills: useResource(getBills),
    tasks: useResource(getTasks),
  }
  const schedule = data.schedule.data ?? []
  const events = data.events.data ?? []
  const first = user.name.split(' ')[0]
  const nick = first.charAt(0) + first.slice(1).toLowerCase()
  const layout = useMemo(() => normalizeLayout(storedLayout, WIDGET_IDS, HIDDEN_BY_DEFAULT), [storedLayout])

  const features = FEATURES.filter((f) => f.roles.includes(user.role))

  const results = useMemo(() => {
    const n = q.trim().toLowerCase()
    if (!n) return []
    const feat = features
      .filter((f) => [f.name, f.source, ...f.keywords].join(' ').toLowerCase().includes(n))
      .map((f) => ({ key: f.id, label: f.name, sub: 'Fitur', Icon: f.icon, route: f.route }))
    const courses = schedule
      .filter((s) => s.name.toLowerCase().includes(n))
      .map((s) => ({ key: s.code + s.day, label: s.name, sub: `${s.day} ${s.time}`, Icon: BookOpen, route: 'akademik/jadwal' }))
    const evs = events.filter((e) => e.title.toLowerCase().includes(n)).map((e) => ({ key: e.id, label: e.title, sub: e.date, Icon: Mic2, route: 'event' }))
    return [...feat, ...courses, ...evs].slice(0, 8)
  }, [q, features, schedule, events])

  return (
    <div className="page-enter">
      {/* Hero + search */}
      <div className="relative z-20">
        <p className="flex items-center gap-1.5 text-sm text-mid">
          <Sparkles className="h-4 w-4 text-cyan" /> {user.role} · {user.prodi}
        </p>
        <h1 className="mt-1 text-[28px] font-bold leading-tight md:text-4xl">
          Halo <span className="text-gradient">{nick}</span>,<br className="md:hidden" /> {t.greetingTail}
        </h1>
        <div className="relative mt-4">
          <label className="glass flex min-h-14 items-center gap-3 !rounded-2xl px-4 focus-within:shadow-[var(--glow)]">
            <Search className="h-5 w-5 text-mid" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} aria-label={t.search} className="w-full bg-transparent text-base outline-none placeholder:text-low" />
            <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-low md:inline">⌘K</kbd>
          </label>
          {q && (
            <ul className="glass absolute inset-x-0 top-full mt-2 overflow-hidden !rounded-2xl !bg-surface">
              {results.length === 0 && <li className="px-4 py-3 text-sm text-mid">{t.noResult}</li>}
              {results.map((r) => (
                <li key={r.key}>
                  <button onClick={() => go(r.route)} className="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-glass-strong">
                    <r.Icon className="h-4 w-4 text-cyan" />
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-auto text-xs text-low">{r.sub}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Widgets t={t} user={user} go={go} favorites={favorites} data={data} layout={layout} />

      <button onClick={() => go('atur-beranda')} className="glass glass-hover mt-6 flex min-h-12 w-full items-center justify-center gap-2 text-sm font-semibold text-mid hover:text-hi">
        <SlidersHorizontal className="h-4 w-4" /> {t.customizeHome}
      </button>
    </div>
  )
}

/**
 * Merender widget yang tampil sesuai urutan pengguna. Tile berurutan digabung ke satu kisi bento;
 * bagian 'kecil' berurutan berdampingan di layar lebar. Tiap widget menampilkan "—" bila datanya
 * gagal dimuat, tanpa memblokir widget lain.
 */
function Widgets({ layout, ...props }: WidgetProps & { layout: HomeLayout }) {
  const visible = layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map(widgetById)
    .filter((w): w is WidgetDef => !!w && w.roles.includes(props.user.role))

  const groups: { kind: 'tile' | 'pair' | 'wide'; items: WidgetDef[] }[] = []
  for (const w of visible) {
    const kind = w.kind === 'tile' ? 'tile' : w.size === 'kecil' ? 'pair' : 'wide'
    const last = groups[groups.length - 1]
    if (last && last.kind === kind && kind !== 'wide') last.items.push(w)
    else groups.push({ kind, items: [w] })
  }

  const render = (w: WidgetDef) => <w.component key={w.id} {...props} />
  const wrap = (kind: string, children: ReactNode, i: number) =>
    kind === 'tile' ? (
      <div key={i} className="mt-6 grid grid-flow-dense grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">{children}</div>
    ) : kind === 'pair' ? (
      <div key={i} className="grid gap-x-4 lg:grid-cols-2">{children}</div>
    ) : (
      <div key={i}>{children}</div>
    )
  return <>{groups.map((g, i) => wrap(g.kind, g.items.map(render), i))}</>
}
