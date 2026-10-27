import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CalendarDays, CreditCard, ListChecks, MapPin, Mic2, QrCode, Search, Sparkles } from 'lucide-react'
import { FEATURES, featureById } from '../data/features'
import { getBills, getEvents, getNews, getSchedule, getTasks } from '../lib/api'
import { rupiah } from '../lib/format'
import { useResource } from '../lib/useResource'
import type { Dict } from '../lib/i18n'
import type { User } from '../lib/types'
import { Icon3D } from '../components/Icon3D'
import { DownloadCTA } from '../components/DownloadCTA'
import { Async, Badge, LinkBtn, Section, Skeleton, Sparkline } from '../components/ui'

export function Home({ t, user, go, favorites }: { t: Dict; user: User; go: (r: string) => void; favorites: string[] }) {
  const [q, setQ] = useState('')
  const scheduleRes = useResource(getSchedule)
  const eventsRes = useResource(getEvents)
  const newsRes = useResource(getNews)
  const billsRes = useResource(getBills)
  const tasksRes = useResource(getTasks)
  const schedule = scheduleRes.data ?? []
  const events = eventsRes.data ?? []
  const first = user.name.split(' ')[0]
  const nick = first.charAt(0) + first.slice(1).toLowerCase()

  const features = FEATURES.filter((f) => f.roles.includes(user.role))
  const ordered = [...features.filter((f) => favorites.includes(f.id)), ...features.filter((f) => !favorites.includes(f.id))]

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

  const today = schedule.slice(0, 2)
  // Ringkasan tetap tampil walau satu sumber gagal: angka diganti "—" tanpa memblokir Beranda.
  const unpaid = billsRes.data?.filter((b) => b.status === 'unpaid')
  const todo = tasksRes.data?.filter((x) => x.status === 'todo') ?? []
  const ktm = featureById('ktm')
  const presensi = featureById('presensi')

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

      {/* Bento */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {/* KTM — tile hero */}
        <button onClick={() => go('ktm')} className="holo group relative col-span-2 overflow-hidden rounded-3xl p-5 text-left text-white shadow-[var(--glow)] md:row-span-2" style={{ background: 'linear-gradient(135deg,#1B3FD1 0%,#2D6BFF 45%,#00B8E6 100%)' }}>
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <Icon3D icon={ktm.icon} from="#7FA6FF" to="#1B3FD1" size={48} />
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">Siap dipindai</span>
          </div>
          <div className="relative mt-6 md:mt-16">
            <div className="text-xs uppercase tracking-[0.18em] text-white/75">{t.ktm}</div>
            <div className="font-display text-xl font-bold">{user.name}</div>
            <div className="font-mono text-sm text-white/85">{user.nim}</div>
          </div>
          <div className="relative mt-4 flex items-center gap-2 text-sm font-semibold">
            <QrCode className="h-4 w-4" /> Tampilkan QR <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </button>

        {/* Presensi */}
        <button onClick={() => go('presensi')} className="glass glass-hover group col-span-2 flex items-center gap-4 p-4 text-left md:col-span-2">
          <Icon3D icon={presensi.icon} from={presensi.from} to={presensi.to} size={52} />
          {today[0] ? (
            <div className="min-w-0 flex-1">
              <div className="text-xs text-mid">Kelas sekarang · {today[0].time}</div>
              <div className="truncate font-display text-lg font-semibold">{today[0].name}</div>
              <div className="flex items-center gap-1 text-xs text-low"><MapPin className="h-3 w-3" /> {today[0].room}</div>
            </div>
          ) : (
            <div className="min-w-0 flex-1" aria-busy={scheduleRes.loading}>
              <div className="text-xs text-mid">Kelas sekarang</div>
              {scheduleRes.loading ? <div className="shimmer mt-1 h-6 w-3/4 rounded-xl" /> : <div className="font-display text-lg font-semibold">Tidak ada kelas</div>}
            </div>
          )}
          <span className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold">{t.checkIn}</span>
        </button>

        {/* Stat tiles */}
        <button onClick={() => go('akademik/nilai')} className="glass glass-hover p-4 text-left">
          <div className="text-xs text-mid">IPK</div>
          <div className="font-display text-3xl font-bold">3.67</div>
          <Sparkline data={[3.42, 3.5, 3.6, 3.72]} />
          <div className="text-[11px] font-semibold text-mint">▲ naik 0.12</div>
        </button>
        <button onClick={() => go('keuangan')} className="glass glass-hover p-4 text-left">
          <div className="flex items-center justify-between text-xs text-mid">
            {t.bills} <CreditCard className="h-4 w-4 text-rose" />
          </div>
          <div className="font-display text-3xl font-bold">{unpaid?.length ?? '—'}</div>
          <div className="mt-2 truncate text-xs text-mid">{unpaid ? rupiah(unpaid.reduce((a, b) => a + b.amount, 0)) : '\u00a0'}</div>
          <div className="text-[11px] font-semibold text-rose">● jatuh tempo 10 Nov</div>
        </button>
      </div>

      {/* Launcher layanan */}
      <Section title={t.features}>
        <div className="glass grid grid-cols-4 gap-x-2 gap-y-5 p-4 sm:grid-cols-6 md:p-5 lg:grid-cols-7">
          {ordered.map((f) => (
            <button key={f.id} onClick={() => go(f.route)} className="group flex flex-col items-center gap-2 rounded-2xl py-1">
              <Icon3D icon={f.icon} from={f.from} to={f.to} />
              <span className="text-center text-[11px] font-semibold leading-tight text-mid group-hover:text-hi">{f.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Aplikasi">
        <DownloadCTA go={go} />
      </Section>

      <div className="grid gap-x-4 lg:grid-cols-2">
        <Section title={t.today} action={<LinkBtn onClick={() => go('akademik/jadwal')}>{t.seeAll}</LinkBtn>}>
          <Async res={scheduleRes} skeleton={<Skeleton rows={2} />}>
            {() => (
              <div className="glass divide-y divide-line overflow-hidden">
                {today.map((s, i) => (
                  <div key={s.code} className="flex items-center gap-4 p-4">
                    <div className="flex w-14 flex-col items-center rounded-xl bg-glass-strong py-1.5">
                      <CalendarDays className={`h-4 w-4 ${i === 0 ? 'text-cyan' : 'text-mid'}`} />
                      <span className="mt-0.5 font-mono text-[11px] font-semibold">{s.time.slice(0, 5)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{s.name}</div>
                      <div className="text-xs text-low">{s.room} · {s.lecturer}</div>
                    </div>
                    {i === 0 && <Badge tone="blue">Berlangsung</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Async>
        </Section>

        <Section title={t.dueSoon} action={<LinkBtn onClick={() => go('kuliah/tugas')}>{t.seeAll}</LinkBtn>}>
          <div className="glass divide-y divide-line overflow-hidden">
            {todo.slice(0, 2).map((x) => (
              <button key={x.id} onClick={() => go('kuliah/tugas')} className="flex w-full items-center gap-3 p-4 text-left hover:bg-glass-strong">
                <ListChecks className="h-5 w-5 shrink-0 text-amber" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{x.title}</div>
                  <div className="text-xs text-low">{x.course} · {x.due}</div>
                </div>
              </button>
            ))}
            {unpaid?.slice(0, 1).map((b) => (
              <button key={b.id} onClick={() => go('keuangan')} className="flex w-full items-center gap-3 p-4 text-left hover:bg-glass-strong">
                <CreditCard className="h-5 w-5 shrink-0 text-rose" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{rupiah(b.amount)}</div>
                  <div className="text-xs text-low">Jatuh tempo {b.due}</div>
                </div>
                <Badge tone="red">Belum bayar</Badge>
              </button>
            ))}
          </div>
        </Section>
      </div>

      <Section title={t.news}>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {newsRes.loading && !newsRes.data && [0, 1, 2].map((i) => <div key={i} className="shimmer h-32 w-64 shrink-0 rounded-3xl" />)}
          {newsRes.data?.map((n) => (
            <article key={n.id} className="glass glass-hover w-64 shrink-0 snap-start p-4">
              <Badge tone="blue">{n.tag}</Badge>
              <h3 className="mt-3 text-[15px] font-semibold leading-snug">{n.title}</h3>
              <p className="mt-2 text-xs text-low">{n.date}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
