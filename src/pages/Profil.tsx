import { useState } from 'react'
import { BellRing, Building2, ChevronRight } from 'lucide-react'
import { getNotifications, USE_DEMO } from '../lib/api'
import { useResource } from '../lib/useResource'
import { FEATURES } from '../data/features'
import type { Dict, Lang } from '../lib/i18n'
import type { AppNotification, Role, User } from '../lib/types'
import { Async, PageHeader, Section } from '../components/ui'

export type Theme = 'light' | 'dark' | 'system'

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${value === v ? 'btn-primary text-white' : 'bg-glass-strong'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Profil({
  t,
  user,
  lang,
  setLang,
  theme,
  setTheme,
  lite,
  setLite,
  role,
  setRole,
  favorites,
  setFavorites,
  onLogout,
  go,
}: {
  go: (r: string) => void
  t: Dict
  user: User
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  setTheme: (t: Theme) => void
  lite: boolean
  setLite: (v: boolean) => void
  role: Role
  setRole: (r: Role) => void
  favorites: string[]
  setFavorites: (f: string[]) => void
  onLogout: () => void
}) {
  const [sessions, setSessions] = useState([
    { id: 'current', name: `${t.thisDevice} · ${navigator.platform || 'Web'}`, last: 'Aktif sekarang' },
    { id: 's2', name: 'Android · Chrome', last: '2 hari lalu' },
    { id: 's3', name: 'Windows · Edge', last: '1 minggu lalu' },
  ])
  const mine = FEATURES.filter((f) => f.roles.includes(role))
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.profile} />
      <button onClick={() => go('ktm')} className="flex w-full items-center gap-4 holo relative overflow-hidden rounded-3xl p-5 text-left text-white shadow-[var(--glow)]" style={{ background: 'linear-gradient(135deg,#1B3FD1 0%,#2D6BFF 45%,#00B8E6 100%)' }}>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
          {user.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{user.name}</div>
          <div className="font-mono text-sm opacity-90">{user.nim}</div>
          <div className="truncate text-xs opacity-80">{user.role} · {user.prodi}</div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold"><span className="hidden sm:inline">{t.ktm}</span> QR →</span>
      </button>

      <button onClick={() => go('kenali-kampus')} className="glass glass-hover mt-4 flex min-h-14 w-full items-center gap-3 px-4 text-left">
        <Building2 className="h-5 w-5 shrink-0 text-cyan" aria-hidden />
        <span className="flex-1">
          <span className="block font-semibold">{t.kenaliKampus}</span>
          <span className="block text-xs text-mid">{t.kenaliKampusNote}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-low" aria-hidden />
      </button>

      <Section title={t.favoritesPick}>
        <div className="glass flex flex-wrap gap-2 p-4">
          {mine.map((f) => {
            const on = favorites.includes(f.id)
            return (
              <button
                key={f.id}
                aria-pressed={on}
                onClick={() => setFavorites(on ? favorites.filter((x) => x !== f.id) : [...favorites, f.id])}
                className={`flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ${on ? 'btn-primary' : 'bg-glass-strong text-mid'}`}
              >
                <f.icon className="h-4 w-4" /> {f.name}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={t.theme}>
        <div className="glass p-4">
          <Seg value={theme} onChange={setTheme} options={[['dark', `🌙 ${t.dark}`], ['light', `☀️ ${t.light}`], ['system', `💻 ${t.system}`]]} />
          <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-between gap-4 border-t border-line pt-4">
            <span>
              <span className="block text-sm font-semibold">{t.lite}</span>
              <span className="block text-xs text-mid">{t.liteNote}</span>
            </span>
            <input type="checkbox" checked={lite} onChange={(e) => setLite(e.target.checked)} className="peer sr-only" />
            <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-glass-strong ring-1 ring-line transition peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-cyan after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
          </label>
        </div>
      </Section>
      <Section title={t.language}>
        <div className="glass p-4">
          <Seg value={lang} onChange={setLang} options={[['id', 'Bahasa Indonesia'], ['en', 'English']]} />
        </div>
      </Section>
      {/* Peran hanya bisa diganti di mode demo; di mode BFF peran berasal dari sesi server. */}
      {USE_DEMO && (
        <Section title={`${t.role} (demo)`}>
          <div className="glass p-4">
            <Seg value={role} onChange={setRole} options={(['MAHASISWA', 'DOSEN', 'TENDIK', 'ALUMNI'] as Role[]).map((r) => [r, r])} />
          </div>
        </Section>
      )}
      <Section title={t.sessions}>
        <ul className="glass divide-y divide-line">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-mid">{s.last}</div>
              </div>
              {s.id !== 'current' && (
                <button className="rounded-lg px-3 py-1 text-rose ring-1 ring-[color-mix(in_srgb,var(--rose)_40%,transparent)]" onClick={() => setSessions((x) => x.filter((y) => y.id !== s.id))}>
                  {t.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onLogout} className="glass glass-hover min-h-11 !rounded-xl px-5 font-semibold">{t.logout}</button>
        <button onClick={onLogout} className="min-h-11 rounded-xl bg-rose px-5 font-semibold text-white">{t.logoutAll}</button>
      </div>
      <p className="mt-4 text-xs text-low">Super UNPAM v0.2.0</p>
    </div>
  )
}

export function Notifikasi({ t, back, go, dibaca, setDibaca }: { t: Dict; back: () => void; go: (r: string) => void; dibaca: number[]; setDibaca: (ids: number[]) => void }) {
  const res = useResource(getNotifications)
  return <Async res={res}>{(items) => <NotificationList t={t} back={back} go={go} items={items} dibaca={dibaca} setDibaca={setDibaca} />}</Async>
}

function NotificationList({ t, back, go, items, dibaca, setDibaca }: { t: Dict; back: () => void; go: (r: string) => void; items: AppNotification[]; dibaca: number[]; setDibaca: (ids: number[]) => void }) {
  const route: Record<string, string> = { Keuangan: 'keuangan', Kuliah: 'kuliah/tugas', Prestasi: 'prestasi', Event: 'event' }
  const read = (n: AppNotification) => n.read || dibaca.includes(n.id)
  return (
    <div>
      <PageHeader
        title={t.notifications}
        onBack={back}
        right={
          <button className="min-h-11 px-1 text-sm font-medium text-cyan" onClick={() => setDibaca([...new Set([...dibaca, ...items.map((x) => x.id)])])}>
            {t.markRead}
          </button>
        }
      />
      <button onClick={() => go('pengingat')} className="glass glass-hover mb-3 flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-semibold">
        <BellRing className="h-4 w-4 text-cyan" aria-hidden /> Pengaturan pengingat
        <ChevronRight className="ml-auto h-4 w-4 text-low" aria-hidden />
      </button>
      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (!read(n)) setDibaca([...dibaca, n.id])
              go(route[n.src] ?? 'home')
            }}
            className={`glass flex w-full items-start gap-3 p-4 text-left ${read(n) ? 'opacity-60' : ''}`}
          >
            {!read(n) && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" aria-label="belum dibaca" />}
            <div className="flex-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-cyan">{n.src}</span>
                <span className="text-low">{n.time}</span>
              </div>
              <div className="text-sm">{n.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
