import { useEffect, useMemo, useState } from 'react'
import { DEMO_USER, SSO_CONFIGURED, startSsoLogin } from './lib/auth'
import { getDict, type Dict, type Lang } from './lib/i18n'
import { usePref } from './lib/prefs'
import type { ModuleConfig, ModuleDef, Role, User, View } from './lib/types'
import { PwaBanners } from './components/PwaBanners'
import { KtmQr } from './components/Ktm'

type Theme = 'light' | 'dark' | 'system'

export default function App() {
  const [lang, setLang] = usePref<Lang>('lang', 'id')
  const [theme, setTheme] = usePref<Theme>('theme', 'system')
  const [favorites, setFavorites] = usePref<string[]>('favorites', ['my-unpam', 'mentari'])
  const [demo, setDemo] = usePref<boolean>('demo', false)
  const [role, setRole] = usePref<Role>('role', 'MAHASISWA')
  const [view, setView] = useState<View>(() => (new URLSearchParams(location.search).get('view') as View) || 'home')
  const [config, setConfig] = useState<ModuleConfig | null>(null)
  const [sos, setSos] = useState(false)
  const t = getDict(lang)

  const user: User | null = demo ? { ...DEMO_USER, role } : null

  useEffect(() => {
    fetch('/module-config.json')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig({ version: 0, updatedAt: '', categories: [], modules: [] }))
  }, [])

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.lang = lang
  }, [theme, lang])

  // Shortcut manifest: /?open=<moduleId>
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('open')
    const mod = config?.modules.find((m) => m.id === id)
    if (mod && user) openModule(mod)
  }, [config]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.delete('open')
    if (view === 'home') url.searchParams.delete('view')
    else url.searchParams.set('view', view)
    history.replaceState(null, '', url)
  }, [view])

  if (!user) return <Login t={t} lang={lang} setLang={setLang} onDemo={() => setDemo(true)} />

  const toggleFav = (id: string) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <PwaBanners t={t} />
      <SideNav t={t} view={view} setView={setView} />
      <main className="flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
        <Header user={user} onSos={() => setSos(true)} t={t} />
        {view === 'home' && <Launcher t={t} user={user} config={config} favorites={favorites} toggleFav={toggleFav} />}
        {view === 'dashboard' && <Dashboard t={t} user={user} />}
        {view === 'notifications' && <Notifications t={t} />}
        {view === 'profile' && <Profile t={t} user={user} />}
        {view === 'settings' && (
          <Settings
            t={t}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            role={role}
            setRole={setRole}
            onLogout={() => {
              setDemo(false)
              setView('home')
            }}
          />
        )}
      </main>
      <BottomNav t={t} view={view} setView={setView} />
      {sos && <SosSheet t={t} onClose={() => setSos(false)} />}
    </div>
  )
}

function openModule(m: ModuleDef) {
  // render 'native' → modul internal (belum ada API); 'webview'/'deeplink' → buka subdomain resmi
  window.open(m.url, '_blank', 'noopener,noreferrer')
}

/* ---------------- Login ---------------- */

function Login({ t, lang, setLang, onDemo }: { t: Dict; lang: Lang; setLang: (l: Lang) => void; onDemo: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-unpam-600 via-unpam-700 to-slate-900 p-4">
      <PwaBanners t={t} />
      <div className="card w-full max-w-sm p-8 text-center">
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-bold text-unpam-700 dark:text-unpam-100">Super UNPAM</h1>
        <p className="mt-1 text-sm text-slate-500">{t.tagline}</p>
        <button
          className="mt-8 w-full rounded-xl bg-unpam-600 py-3 font-semibold text-white hover:bg-unpam-700 disabled:opacity-50"
          onClick={startSsoLogin}
          disabled={!SSO_CONFIGURED}
          title={SSO_CONFIGURED ? '' : t.loginNote}
        >
          🔐 {t.login}
        </button>
        <button className="mt-3 w-full rounded-xl border border-unpam-600 py-3 font-semibold text-unpam-600 hover:bg-unpam-50 dark:text-unpam-100 dark:hover:bg-slate-800" onClick={onDemo}>
          {t.loginDemo}
        </button>
        <p className="mt-4 text-xs text-slate-500">{t.loginNote}</p>
        <div className="mt-6 flex justify-center gap-2 text-xs">
          {(['id', 'en'] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? 'bg-unpam-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- Shell ---------------- */

const NAV: { view: View; icon: string; key: keyof Dict }[] = [
  { view: 'home', icon: '🏠', key: 'home' },
  { view: 'dashboard', icon: '📊', key: 'dashboard' },
  { view: 'notifications', icon: '🔔', key: 'notifications' },
  { view: 'profile', icon: '🪪', key: 'profile' },
  { view: 'settings', icon: '⚙️', key: 'settings' },
]

function SideNav({ t, view, setView }: { t: Dict; view: View; setView: (v: View) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 p-6 md:flex">
      <div className="mb-6 flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <div className="font-bold text-unpam-700 dark:text-unpam-100">Super UNPAM</div>
          <div className="text-xs text-slate-500">Universitas Pamulang</div>
        </div>
      </div>
      {NAV.map((n) => (
        <button
          key={n.view}
          onClick={() => setView(n.view)}
          aria-current={view === n.view ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
            view === n.view ? 'bg-unpam-600 text-white' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
          }`}
        >
          <span aria-hidden>{n.icon}</span>
          {t[n.key] as string}
          {n.view === 'notifications' && <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs text-white">3</span>}
        </button>
      ))}
    </aside>
  )
}

function BottomNav({ t, view, setView }: { t: Dict; view: View; setView: (v: View) => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
      <div className="grid grid-cols-5">
        {NAV.map((n) => (
          <button
            key={n.view}
            onClick={() => setView(n.view)}
            aria-current={view === n.view ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${view === n.view ? 'text-unpam-600 dark:text-unpam-100' : 'text-slate-500'}`}
          >
            <span className="text-lg" aria-hidden>{n.icon}</span>
            {t[n.key] as string}
          </button>
        ))}
      </div>
    </nav>
  )
}

function Header({ user, onSos, t }: { user: User; onSos: () => void; t: Dict }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 md:hidden">
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-xl" />
        <span className="font-bold text-unpam-700 dark:text-unpam-100">Super UNPAM</span>
      </div>
      <div className="hidden md:block">
        <div className="text-sm text-slate-500">{user.role}</div>
        <div className="text-lg font-semibold">{user.name}</div>
      </div>
      <button onClick={onSos} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700">
        🆘 {t.sos}
      </button>
    </header>
  )
}

/* ---------------- Launcher ---------------- */

function Launcher({
  t,
  user,
  config,
  favorites,
  toggleFav,
}: {
  t: Dict
  user: User
  config: ModuleConfig | null
  favorites: string[]
  toggleFav: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('__all')
  const firstName = user.name.split(' ')[0]

  const visible = useMemo(() => {
    const mods = (config?.modules ?? []).filter((m) => m.roles.includes(user.role))
    const needle = q.trim().toLowerCase()
    return mods
      .filter((m) => (cat === '__all' ? true : cat === '__fav' ? favorites.includes(m.id) : m.category === cat))
      .filter((m) => !needle || [m.name, m.description, m.category, ...m.tags].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => a.priority - b.priority)
  }, [config, user.role, q, cat, favorites])

  return (
    <section>
      <div className="card bg-gradient-to-br from-unpam-600 to-unpam-700 p-6 text-white ring-0 dark:from-unpam-700 dark:to-slate-900">
        <h1 className="text-xl font-semibold md:text-2xl">{t.greeting(firstName.charAt(0) + firstName.slice(1).toLowerCase())}</h1>
        <label className="mt-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-slate-900">
          <span aria-hidden>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist">
        {[
          ['__all', t.all],
          ['__fav', `⭐ ${t.favorites}`],
          ...(config?.categories ?? []).map((c) => [c, c]),
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={cat === key}
            onClick={() => setCat(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              cat === key ? 'bg-unpam-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className="mb-3 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-500">{t.apps}</h2>
      {visible.length === 0 ? (
        <p className="card p-6 text-center text-slate-500">{config ? t.noResult : '…'}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((m) => (
            <ModuleCard key={m.id} m={m} fav={favorites.includes(m.id)} toggleFav={() => toggleFav(m.id)} t={t} />
          ))}
        </div>
      )}
    </section>
  )
}

function ModuleCard({ m, fav, toggleFav, t }: { m: ModuleDef; fav: boolean; toggleFav: () => void; t: Dict }) {
  return (
    <article className="card group relative flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        onClick={toggleFav}
        aria-label={fav ? `Hapus ${m.name} dari favorit` : `Tambah ${m.name} ke favorit`}
        aria-pressed={fav}
        className="absolute right-3 top-3 text-lg"
      >
        {fav ? '⭐' : '☆'}
      </button>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl" style={{ background: `${m.color}1a` }} aria-hidden>
        {m.icon}
      </div>
      <h3 className="mt-3 font-bold" style={{ color: m.color }}>
        {m.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {m.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {tag}
          </span>
        ))}
      </div>
      <button onClick={() => openModule(m)} className="mt-auto pt-3 text-left text-sm font-semibold text-unpam-600 hover:underline dark:text-unpam-100">
        {t.open} →
      </button>
    </article>
  )
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ t, user }: { t: Dict; user: User }) {
  // TODO(LPTI): data dari BFF (/api/me/summary)
  const schedule = [
    { time: '08:00', name: 'Pemrograman Web', room: 'Gedung A · 402' },
    { time: '10:30', name: 'Basis Data Lanjut', room: 'Gedung B · 305' },
    { time: '13:00', name: 'Kecerdasan Buatan', room: 'Lab Komputer 3' },
  ]
  return (
    <section className="space-y-4">
      <p className="text-xs text-slate-500">ℹ️ {t.demo}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.ipk} value="3.67" tone="text-unpam-600" />
        <Stat label={t.bills} value="Rp 3.250.000" tone="text-red-600" sub="Jatuh tempo 10 Nov" />
        <Stat label={t.tasks} value="4" tone="text-amber-600" sub="MENTARI" />
        <Stat label={t.role} value={user.role} tone="text-emerald-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">📅 {t.today}</h2>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {schedule.map((s) => (
              <li key={s.time} className="flex items-center gap-4 py-3">
                <span className="w-14 font-mono text-sm font-semibold text-unpam-600 dark:text-unpam-100">{s.time}</span>
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.room}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">🎤 {t.events}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="rounded-xl bg-unpam-50 p-3 dark:bg-slate-800">Seminar Nasional Teknologi · 2 Nov · EMS</li>
            <li className="rounded-xl bg-unpam-50 p-3 dark:bg-slate-800">Ujian TOEFL Prediction · 8 Nov · MY LB</li>
            <li className="rounded-xl bg-unpam-50 p-3 dark:bg-slate-800">Uji Kompetensi LSP · 15 Nov · MY LSP</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

/* ---------------- Notifications ---------------- */

function Notifications({ t }: { t: Dict }) {
  const [items, setItems] = useState([
    { id: 1, mod: 'MY UNPAM', text: 'Tagihan semester ganjil jatuh tempo 10 November.', read: false },
    { id: 2, mod: 'MENTARI', text: 'Tugas baru: Laporan Praktikum Basis Data.', read: false },
    { id: 3, mod: 'SISPEMA', text: 'Peringkat prestasi semester ini telah diperbarui.', read: false },
    { id: 4, mod: 'EMS', text: 'Pendaftaran Seminar Nasional Teknologi dibuka.', read: true },
  ])
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">ℹ️ {t.demo}</p>
        <button className="text-sm font-medium text-unpam-600 dark:text-unpam-100" onClick={() => setItems((i) => i.map((x) => ({ ...x, read: true })))}>
          {t.markRead}
        </button>
      </div>
      {items.map((n) => (
        <div key={n.id} className={`card flex items-start gap-3 p-4 ${n.read ? 'opacity-60' : ''}`}>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-unpam-500" aria-label="belum dibaca" />}
          <div>
            <div className="text-xs font-bold text-unpam-600 dark:text-unpam-100">{n.mod}</div>
            <div className="text-sm">{n.text}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

/* ---------------- Profile / KTM ---------------- */

function Profile({ t, user }: { t: Dict; user: User }) {
  return (
    <section className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-unpam-600 to-unpam-700 text-white shadow-lg">
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-xs font-semibold uppercase tracking-widest">{t.ktm}</span>
          <span className="text-xs font-bold text-unpam-gold">UNIVERSITAS PAMULANG</span>
        </div>
        <div className="flex flex-col items-center gap-4 p-6">
          <KtmQr user={user} />
          <div className="text-center">
            <div className="text-lg font-bold">{user.name}</div>
            <div className="font-mono text-sm opacity-90">{user.nim}</div>
            <div className="mt-1 text-xs opacity-80">
              {user.prodi} · {user.fakultas} · {user.angkatan}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-slate-500">{t.ktmNote}</p>
    </section>
  )
}

/* ---------------- Settings ---------------- */

function Settings({
  t,
  lang,
  setLang,
  theme,
  setTheme,
  role,
  setRole,
  onLogout,
}: {
  t: Dict
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  setTheme: (t: Theme) => void
  role: Role
  setRole: (r: Role) => void
  onLogout: () => void
}) {
  const [sessions, setSessions] = useState([
    { id: 'current', name: `${t.thisDevice} · ${navigator.platform || 'Web'}`, last: 'Aktif sekarang' },
    { id: 's2', name: 'Android · Chrome', last: '2 hari lalu' },
    { id: 's3', name: 'Windows · Edge', last: '1 minggu lalu' },
  ])
  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) => (
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
  return (
    <section className="max-w-2xl space-y-4">
      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">{t.theme}</h2>
        <Seg value={theme} onChange={setTheme} options={[['light', `☀️ ${t.light}`], ['dark', `🌙 ${t.dark}`], ['system', `💻 ${t.system}`]]} />
      </div>
      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">{t.language}</h2>
        <Seg value={lang} onChange={setLang} options={[['id', 'Bahasa Indonesia'], ['en', 'English']]} />
      </div>
      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">{t.role} (demo)</h2>
        <Seg value={role} onChange={setRole} options={(['MAHASISWA', 'DOSEN', 'TENDIK', 'ALUMNI'] as Role[]).map((r) => [r, r])} />
      </div>
      <div className="card p-5">
        <h2 className="font-semibold">{t.sessions}</h2>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-slate-500">{s.last}</div>
              </div>
              {s.id !== 'current' && (
                <button className="rounded-lg px-3 py-1 text-red-600 ring-1 ring-red-200 hover:bg-red-50 dark:ring-red-900 dark:hover:bg-red-950" onClick={() => setSessions((x) => x.filter((y) => y.id !== s.id))}>
                  {t.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onLogout} className="rounded-xl bg-slate-200 px-5 py-2.5 font-semibold dark:bg-slate-800">
          {t.logout}
        </button>
        <button onClick={onLogout} className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white">
          {t.logoutAll}
        </button>
      </div>
      <p className="text-xs text-slate-400">Super UNPAM v0.1.0 · PWA</p>
    </section>
  )
}

/* ---------------- SOS ---------------- */

function SosSheet({ t, onClose }: { t: Dict; onClose: () => void }) {
  // TODO(LPTI): nomor resmi keamanan, klinik & konseling UNPAM
  const contacts = [
    { label: 'Keamanan Kampus', icon: '🛡️', href: 'tel:' },
    { label: 'Layanan Konseling', icon: '💬', href: 'tel:' },
    { label: 'Klinik / Kesehatan', icon: '🏥', href: 'tel:' },
    { label: 'Darurat Nasional 112', icon: '🚨', href: 'tel:112' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center" role="dialog" aria-modal="true" aria-label={t.sosTitle} onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-red-600">🆘 {t.sosTitle}</h2>
        <div className="mt-4 grid gap-2">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              aria-disabled={c.href === 'tel:'}
              className={`flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 dark:bg-red-950 dark:text-red-200 ${c.href === 'tel:' ? 'pointer-events-none opacity-60' : ''}`}
            >
              <span aria-hidden>{c.icon}</span>
              {c.label}
              {c.href === 'tel:' && <span className="ml-auto text-[10px]">TODO</span>}
            </a>
          ))}
        </div>
        <button className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 font-semibold dark:bg-slate-800" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  )
}
