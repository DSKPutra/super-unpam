import { useState } from 'react'
import { notifications as initial } from '../data/demo'
import { FEATURES } from '../data/features'
import type { Dict, Lang } from '../lib/i18n'
import type { Role, User } from '../lib/types'
import { PageHeader, Section } from '../components/ui'

export type Theme = 'light' | 'dark' | 'system'

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${value === v ? 'bg-unpam-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
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
      <button onClick={() => go('ktm')} className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-br from-unpam-600 to-unpam-700 p-5 text-left text-white shadow-lg">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold">
          {user.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold">{user.name}</div>
          <div className="font-mono text-sm opacity-90">{user.nim}</div>
          <div className="truncate text-xs opacity-80">{user.role} · {user.prodi}</div>
        </div>
        <span className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold">🪪 {t.ktm} →</span>
      </button>

      <Section title={t.favoritesPick}>
        <div className="card flex flex-wrap gap-2 p-4">
          {mine.map((f) => {
            const on = favorites.includes(f.id)
            return (
              <button
                key={f.id}
                aria-pressed={on}
                onClick={() => setFavorites(on ? favorites.filter((x) => x !== f.id) : [...favorites, f.id])}
                className={`rounded-full px-3 py-1.5 text-sm ${on ? 'bg-unpam-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                {f.icon} {f.name}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title={t.theme}>
        <div className="card p-4">
          <Seg value={theme} onChange={setTheme} options={[['light', `☀️ ${t.light}`], ['dark', `🌙 ${t.dark}`], ['system', `💻 ${t.system}`]]} />
        </div>
      </Section>
      <Section title={t.language}>
        <div className="card p-4">
          <Seg value={lang} onChange={setLang} options={[['id', 'Bahasa Indonesia'], ['en', 'English']]} />
        </div>
      </Section>
      <Section title={`${t.role} (demo)`}>
        <div className="card p-4">
          <Seg value={role} onChange={setRole} options={(['MAHASISWA', 'DOSEN', 'TENDIK', 'ALUMNI'] as Role[]).map((r) => [r, r])} />
        </div>
      </Section>
      <Section title={t.sessions}>
        <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-slate-500">{s.last}</div>
              </div>
              {s.id !== 'current' && (
                <button className="rounded-lg px-3 py-1 text-red-600 ring-1 ring-red-200 dark:ring-red-900" onClick={() => setSessions((x) => x.filter((y) => y.id !== s.id))}>
                  {t.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onLogout} className="rounded-xl bg-slate-200 px-5 py-2.5 font-semibold dark:bg-slate-800">{t.logout}</button>
        <button onClick={onLogout} className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white">{t.logoutAll}</button>
      </div>
      <p className="mt-4 text-xs text-slate-400">Super UNPAM v0.2.0</p>
    </div>
  )
}

export function Notifikasi({ t, back, go }: { t: Dict; back: () => void; go: (r: string) => void }) {
  const [items, setItems] = useState(initial)
  const route: Record<string, string> = { Keuangan: 'keuangan', Kuliah: 'kuliah/tugas', Prestasi: 'prestasi', Event: 'event' }
  return (
    <div>
      <PageHeader
        title={t.notifications}
        onBack={back}
        right={
          <button className="text-sm font-medium text-unpam-600 dark:text-unpam-100" onClick={() => setItems((i) => i.map((x) => ({ ...x, read: true })))}>
            {t.markRead}
          </button>
        }
      />
      <div className="space-y-2">
        {items.map((n) => (
          <button key={n.id} onClick={() => go(route[n.src] ?? 'home')} className={`card flex w-full items-start gap-3 p-4 text-left ${n.read ? 'opacity-60' : ''}`}>
            {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-unpam-500" aria-label="belum dibaca" />}
            <div className="flex-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-unpam-600 dark:text-unpam-100">{n.src}</span>
                <span className="text-slate-400">{n.time}</span>
              </div>
              <div className="text-sm">{n.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
