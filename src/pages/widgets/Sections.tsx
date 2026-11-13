import { CalendarDays, CreditCard, ExternalLink, ListChecks, Mic2 } from 'lucide-react'
import { FEATURES } from '../../data/features'
import { rupiah } from '../../lib/format'
import { Icon3D } from '../../components/Icon3D'
import { DownloadCTA } from '../../components/DownloadCTA'
import { Async, Badge, LinkBtn, Section, Skeleton } from '../../components/ui'
import type { WidgetProps } from './types'

// Widget berbentuk bagian berjudul di Beranda.

export function LayananSection({ t, user, go, favorites }: WidgetProps) {
  const features = FEATURES.filter((f) => f.roles.includes(user.role))
  const ordered = [...features.filter((f) => favorites.includes(f.id)), ...features.filter((f) => !favorites.includes(f.id))]
  return (
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
  )
}

export function AplikasiSection({ t, go }: WidgetProps) {
  return (
    <Section title={t.appsSection}>
      <DownloadCTA go={go} />
    </Section>
  )
}

export function JadwalHariIniSection({ t, go, data }: WidgetProps) {
  return (
    <Section title={t.today} action={<LinkBtn onClick={() => go('akademik/jadwal')}>{t.seeAll}</LinkBtn>}>
      <Async res={data.schedule} skeleton={<Skeleton rows={2} />}>
        {(schedule) => (
          <div className="glass divide-y divide-line overflow-hidden">
            {schedule.slice(0, 2).map((s, i) => (
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
  )
}

export function TugasTerdekatSection({ t, go, data }: WidgetProps) {
  const todo = data.tasks.data?.filter((x) => x.status === 'todo') ?? []
  const unpaid = data.bills.data?.filter((b) => b.status === 'unpaid')
  return (
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
  )
}

const STALE_MS = 30 * 60 * 1000
const tanggal = (iso: string, withTime = false) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(iso))

export function BeritaSection({ t, data }: WidgetProps) {
  const news = data.news
  const feed = news.data
  const contoh = feed?.source === 'contoh'
  // Respons lama bisa datang dari cache Service Worker saat offline: tampilkan umurnya, jangan berpura-pura baru.
  const stale = feed && !contoh && Date.now() - Date.parse(feed.fetchedAt) > STALE_MS
  const unavailable = news.error && 'status' in news.error && news.error.status === 503
  return (
    <Section title={t.news} action={contoh ? <Badge>{t.sampleData}</Badge> : feed ? <span className="text-xs text-low">{feed.source}</span> : undefined}>
      {stale && <p className="mb-2 text-xs text-amber">{t.lastUpdated(tanggal(feed.fetchedAt, true))}</p>}
      {!feed && news.error && (
        <div className="glass flex items-center justify-between gap-3 p-4 text-sm">
          <span className="text-mid">{unavailable ? t.newsUnavailable : t.newsError}</span>
          {!unavailable && <LinkBtn onClick={news.reload}>{t.retry}</LinkBtn>}
        </div>
      )}
      {feed && feed.items.length === 0 && <div className="glass p-4 text-sm text-mid">{t.newsEmpty}</div>}
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {news.loading && !feed && [0, 1, 2].map((i) => <div key={i} className="shimmer h-32 w-64 shrink-0 rounded-3xl" />)}
        {feed?.items.map((n) => (
          <article key={n.id} className="glass flex w-64 shrink-0 snap-start flex-col p-4">
            {n.tag && (
              <div>
                <Badge tone="blue">{n.tag}</Badge>
              </div>
            )}
            <h3 className="mt-3 line-clamp-3 text-[15px] font-semibold leading-snug">{n.title}</h3>
            {n.summary && <p className="mt-1.5 line-clamp-2 text-xs text-mid">{n.summary}</p>}
            <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs">
              <time dateTime={n.date} className="text-low">{tanggal(n.date)}</time>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-cyan hover:underline">
                {t.openSource} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">: {n.title}</span>
              </a>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

export function EventSection({ t, go, data }: WidgetProps) {
  return (
    <Section title={t.events} action={<LinkBtn onClick={() => go('event')}>{t.seeAll}</LinkBtn>}>
      <Async res={data.events} skeleton={<Skeleton rows={2} />}>
        {(events) => (
          <div className="glass divide-y divide-line overflow-hidden">
            {events.slice(0, 3).map((e) => (
              <button key={e.id} onClick={() => go('event')} className="flex w-full items-center gap-3 p-4 text-left hover:bg-glass-strong">
                <Mic2 className="h-5 w-5 shrink-0 text-cyan" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{e.title}</div>
                  <div className="truncate text-xs text-low">{e.date} · {e.place}</div>
                </div>
                {e.sertifikat && <Badge tone="green">Sertifikat</Badge>}
              </button>
            ))}
          </div>
        )}
      </Async>
    </Section>
  )
}
