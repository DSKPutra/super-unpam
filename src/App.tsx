import { useEffect, useState, type FormEvent } from 'react'
import { DEMO_USER, login } from './lib/auth'
import { getDict, type Dict, type Lang } from './lib/i18n'
import { usePref } from './lib/prefs'
import type { Role, User } from './lib/types'
import { PwaBanners } from './components/PwaBanners'
import { Home } from './pages/Home'
import { Akademik } from './pages/Akademik'
import { Kuliah } from './pages/Kuliah'
import { Keuangan } from './pages/Keuangan'
import { KtmPage } from './pages/Ktm'
import { Presensi } from './pages/Presensi'
import { Event, Kerjasama, Prestasi, Sertifikasi, Toefl, Tracer } from './pages/Layanan'
import { Notifikasi, Profil, type Theme } from './pages/Profil'

// Router berbasis hash: semua halaman ada di dalam satu aplikasi (#/akademik/krs, #/ktm, ...)
function useRoute() {
  const read = () => location.hash.replace(/^#\/?/, '') || 'home'
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (r: string) => {
    location.hash = `/${r}`
  }
  const back = () => (history.length > 1 ? history.back() : go('home'))
  return { route, go, back }
}

export default function App() {
  const [lang, setLang] = usePref<Lang>('lang', 'id')
  const [theme, setTheme] = usePref<Theme>('theme', 'system')
  const [favorites, setFavorites] = usePref<string[]>('favorites', ['ktm', 'presensi'])
  // Hanya penanda UI; sesi asli dipegang cookie HttpOnly dari BFF.
  const [signedIn, setSignedIn] = usePref<boolean>('signedIn', false)
  const [role, setRole] = usePref<Role>('role', 'MAHASISWA')
  const [sos, setSos] = useState(false)
  const { route, go, back } = useRoute()
  const t = getDict(lang)

  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    document.documentElement.lang = lang
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme, lang])

  if (!signedIn) return <Login t={t} lang={lang} setLang={setLang} onSignedIn={() => setSignedIn(true)} />

  const user: User = { ...DEMO_USER, role }
  const [section, sub = ''] = route.split('/')

  const page = (() => {
    switch (section) {
      case 'akademik':
        return <Akademik tab={sub} go={go} />
      case 'kuliah':
        return <Kuliah tab={sub} go={go} />
      case 'keuangan':
        return <Keuangan />
      case 'ktm':
        return <KtmPage user={user} back={back} />
      case 'presensi':
        return <Presensi user={user} back={back} />
      case 'event':
        return <Event back={back} />
      case 'sertifikasi':
        return <Sertifikasi back={back} />
      case 'toefl':
        return <Toefl back={back} />
      case 'prestasi':
        return <Prestasi back={back} />
      case 'tracer':
        return <Tracer back={back} />
      case 'kerjasama':
        return <Kerjasama back={back} />
      case 'notifikasi':
        return <Notifikasi t={t} back={back} go={go} />
      case 'profil':
        return (
          <Profil
            t={t}
            user={user}
            go={go}
            lang={lang}
            setLang={setLang}
            theme={theme}
            setTheme={setTheme}
            role={role}
            setRole={setRole}
            favorites={favorites}
            setFavorites={setFavorites}
            onLogout={() => {
              setSignedIn(false)
              go('home')
            }}
          />
        )
      default:
        return <Home t={t} user={user} go={go} favorites={favorites} hidden={[]} />
    }
  })()

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <PwaBanners t={t} />
      <SideNav t={t} section={section} go={go} />
      <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-6">
        <TopBar t={t} go={go} onSos={() => setSos(true)} />
        {page}
      </main>
      <BottomNav t={t} section={section} go={go} />
      {sos && <SosSheet t={t} onClose={() => setSos(false)} />}
    </div>
  )
}

/* ---------------- Login (di dalam aplikasi) ---------------- */

function Login({ t, lang, setLang, onSignedIn }: { t: Dict; lang: Lang; setLang: (l: Lang) => void; onSignedIn: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await login(username, password)
      onSignedIn()
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-unpam-600 via-unpam-700 to-slate-900 p-4">
      <PwaBanners t={t} />
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-4 text-center text-2xl font-bold text-unpam-700 dark:text-unpam-100">Super UNPAM</h1>
        <p className="mt-1 text-center text-sm text-slate-500">{t.tagline}</p>
        <label className="mt-8 block text-sm font-medium">
          {t.username}
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 outline-none focus:border-unpam-500 dark:border-slate-700" />
        </label>
        <label className="mt-4 block text-sm font-medium">
          {t.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 outline-none focus:border-unpam-500 dark:border-slate-700" />
        </label>
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        <button disabled={busy} className="mt-6 w-full rounded-xl bg-unpam-600 py-3 font-semibold text-white hover:bg-unpam-700 disabled:opacity-60">
          {busy ? t.signingIn : t.signIn}
        </button>
        <p className="mt-4 text-center text-xs text-slate-500">{t.loginNote}</p>
        <div className="mt-6 flex justify-center gap-2 text-xs">
          {(['id', 'en'] as Lang[]).map((l) => (
            <button type="button" key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? 'bg-unpam-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}

/* ---------------- Shell ---------------- */

const NAV: { section: string; route: string; icon: string; key: keyof Dict }[] = [
  { section: 'home', route: 'home', icon: '🏠', key: 'home' },
  { section: 'akademik', route: 'akademik/jadwal', icon: '🎓', key: 'akademik' },
  { section: 'kuliah', route: 'kuliah', icon: '💻', key: 'kuliah' },
  { section: 'keuangan', route: 'keuangan', icon: '💳', key: 'keuangan' },
  { section: 'profil', route: 'profil', icon: '👤', key: 'profile' },
]

function SideNav({ t, section, go }: { t: Dict; section: string; go: (r: string) => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 p-6 md:flex">
      <button onClick={() => go('home')} className="mb-6 flex items-center gap-3 text-left">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <div className="font-bold text-unpam-700 dark:text-unpam-100">Super UNPAM</div>
          <div className="text-xs text-slate-500">Universitas Pamulang</div>
        </div>
      </button>
      {NAV.map((n) => (
        <button
          key={n.section}
          onClick={() => go(n.route)}
          aria-current={section === n.section ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
            section === n.section ? 'bg-unpam-600 text-white' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'
          }`}
        >
          <span aria-hidden>{n.icon}</span>
          {t[n.key] as string}
        </button>
      ))}
      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        {[['ktm', '🪪', t.ktm], ['presensi', '📍', t.checkIn]].map(([r, i, l]) => (
          <button key={r} onClick={() => go(r)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${section === r ? 'bg-unpam-600 text-white' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900'}`}>
            <span aria-hidden>{i}</span>
            {l}
          </button>
        ))}
      </div>
    </aside>
  )
}

function BottomNav({ t, section, go }: { t: Dict; section: string; go: (r: string) => void }) {
  const items = [NAV[0], NAV[1], { section: 'ktm', route: 'ktm', icon: '🪪', key: 'ktm' as keyof Dict }, NAV[2], NAV[4]]
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
      <div className="grid grid-cols-5">
        {items.map((n) =>
          n.section === 'ktm' ? (
            <button key="ktm" onClick={() => go('ktm')} aria-label={t.ktm} className="flex flex-col items-center">
              <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-unpam-600 text-2xl text-white shadow-lg ring-4 ring-white dark:ring-slate-900">🪪</span>
              <span className="text-[11px] font-medium text-unpam-600 dark:text-unpam-100">KTM</span>
            </button>
          ) : (
            <button
              key={n.section}
              onClick={() => go(n.route)}
              aria-current={section === n.section ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${section === n.section ? 'text-unpam-600 dark:text-unpam-100' : 'text-slate-500'}`}
            >
              <span className="text-lg" aria-hidden>{n.icon}</span>
              {t[n.key] as string}
            </button>
          ),
        )}
      </div>
    </nav>
  )
}

function TopBar({ t, go, onSos }: { t: Dict; go: (r: string) => void; onSos: () => void }) {
  return (
    <header className="mb-4 flex items-center justify-end gap-2">
      <button onClick={() => go('home')} className="mr-auto flex items-center gap-2 md:hidden">
        <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
        <span className="font-bold text-unpam-700 dark:text-unpam-100">Super UNPAM</span>
      </button>
      <button onClick={() => go('notifikasi')} aria-label={t.notifications} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        🔔
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">3</span>
      </button>
      <button onClick={onSos} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700">🆘 {t.sos}</button>
    </header>
  )
}

function SosSheet({ t, onClose }: { t: Dict; onClose: () => void }) {
  // TODO(LPTI): nomor resmi keamanan, klinik & konseling UNPAM
  const contacts = [
    { label: 'Keamanan Kampus', icon: '🛡️', href: '' },
    { label: 'Layanan Konseling', icon: '💬', href: '' },
    { label: 'Klinik / Kesehatan', icon: '🏥', href: '' },
    { label: 'Darurat Nasional 112', icon: '🚨', href: 'tel:112' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center" role="dialog" aria-modal="true" aria-label={t.sosTitle} onClick={onClose}>
      <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-red-600">🆘 {t.sosTitle}</h2>
        <div className="mt-4 grid gap-2">
          {contacts.map((c) =>
            c.href ? (
              <a key={c.label} href={c.href} className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 dark:bg-red-950 dark:text-red-200">
                <span aria-hidden>{c.icon}</span>
                {c.label}
              </a>
            ) : (
              <div key={c.label} className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-700 opacity-60 dark:bg-red-950 dark:text-red-200">
                <span aria-hidden>{c.icon}</span>
                {c.label}
                <span className="ml-auto text-[10px]">nomor menyusul</span>
              </div>
            ),
          )}
        </div>
        <button className="mt-4 w-full rounded-xl bg-slate-100 py-2.5 font-semibold dark:bg-slate-800" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}
