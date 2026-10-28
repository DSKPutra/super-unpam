import { lazy, Suspense, useEffect, useState, type ComponentType, type FormEvent } from 'react'
import { Bell, GraduationCap, Home as HomeIcon, IdCard, Laptop, LifeBuoy, MapPin, Phone, ShieldAlert, Stethoscope, MessageCircleHeart, User as UserIcon, Wallet } from 'lucide-react'
import { ApiError, currentUser, login, logout, UNAUTHORIZED_EVENT, USE_DEMO } from './lib/api'
import { getDict, type Dict, type Lang } from './lib/i18n'
import { usePref } from './lib/prefs'
import type { Role, User } from './lib/types'
import { PwaBanners } from './components/PwaBanners'
import { Home } from './pages/Home'
import { DEFAULT_LAYOUT } from './pages/widgets/registry'
import type { Theme } from './pages/Profil'

// Anggaran performa (Section 7): Beranda dimuat langsung; semua halaman lain = chunk terpisah
// yang baru diunduh saat dibuka, sehingga menambah fitur tidak menaikkan bundel awal.
const page = <K extends string>(load: () => Promise<Record<K, ComponentType<any>>>, name: K) => // eslint-disable-line @typescript-eslint/no-explicit-any
  lazy(() => load().then((m) => ({ default: m[name] })))
const Akademik = page(() => import('./pages/Akademik'), 'Akademik')
const Kuliah = page(() => import('./pages/Kuliah'), 'Kuliah')
const Keuangan = page(() => import('./pages/Keuangan'), 'Keuangan')
const KtmPage = page(() => import('./pages/Ktm'), 'KtmPage')
const Presensi = page(() => import('./pages/Presensi'), 'Presensi')
const Parkir = page(() => import('./pages/fitur/Parkir'), 'Parkir')
const Event = page(() => import('./pages/Layanan'), 'Event')
const Kerjasama = page(() => import('./pages/Layanan'), 'Kerjasama')
const Prestasi = page(() => import('./pages/Layanan'), 'Prestasi')
const Sertifikasi = page(() => import('./pages/Layanan'), 'Sertifikasi')
const Toefl = page(() => import('./pages/Layanan'), 'Toefl')
const Tracer = page(() => import('./pages/Layanan'), 'Tracer')
const Notifikasi = page(() => import('./pages/Profil'), 'Notifikasi')
const Profil = page(() => import('./pages/Profil'), 'Profil')
const DownloadPage = page(() => import('./pages/Download'), 'DownloadPage')
const Surat = page(() => import('./pages/fitur/Surat'), 'Surat')
const Edom = page(() => import('./pages/fitur/Edom'), 'Edom')
const Ujian = page(() => import('./pages/fitur/Ujian'), 'Ujian')
const Herreg = page(() => import('./pages/fitur/Herreg'), 'Herreg')
const Booking = page(() => import('./pages/fitur/Booking'), 'Booking')
const Aspirasi = page(() => import('./pages/fitur/Aspirasi'), 'Aspirasi')
const DompetSertifikat = page(() => import('./pages/fitur/DompetSertifikat'), 'DompetSertifikat')
const Islami = page(() => import('./pages/fitur/Islami'), 'Islami')
const Alumni = page(() => import('./pages/fitur/Alumni'), 'Alumni')
const Pemira = page(() => import('./pages/fitur/Pemira'), 'Pemira')
const AturBeranda = page(() => import('./pages/AturBeranda'), 'AturBeranda')
const Onboarding = page(() => import('./components/Onboarding'), 'Onboarding')

// Default "Mode hemat efek" untuk pengguna baru: aktif di HP RAM ≤ 4 GB / ≤ 4 core / Data Saver.
// Pengguna tetap bisa mengubahnya di Profil.
function isLowEndDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  return (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4 || nav.connection?.saveData === true
}

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
  const [theme, setTheme] = usePref<Theme>('theme', 'dark')
  const [lite, setLite] = usePref<boolean>('lite', isLowEndDevice())
  const [favorites, setFavorites] = usePref<string[]>('favorites', ['ktm', 'presensi'])
  // Bentuk dirapikan saat dibaca (normalizeLayout), jadi nilai rusak/usang di penyimpanan aman.
  const [homeLayout, setHomeLayout] = usePref<unknown>('home.widgets', DEFAULT_LAYOUT)
  // Hanya penanda UI; sesi asli dipegang cookie HttpOnly dari BFF dan dicek lewat /api/auth/me.
  const [signedIn, setSignedIn] = usePref<boolean>('signedIn', false)
  const [me, setMe] = useState<User | null>(null)
  const [meError, setMeError] = useState('')
  const [meAttempt, setMeAttempt] = useState(0)
  const [role, setRole] = usePref<Role>('role', 'MAHASISWA')
  const [onboarded, setOnboarded] = usePref<boolean>('onboarded', false)
  const [sos, setSos] = useState(false)
  const { route, go, back } = useRoute()
  const t = getDict(lang)

  useEffect(() => {
    const root = document.documentElement
    const mq = matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const light = theme === 'light' || (theme === 'system' && mq.matches)
      root.dataset.theme = light ? 'light' : 'dark'
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', light ? '#F4F7FE' : '#0A0E1A')
    }
    apply()
    root.classList.toggle('lite', lite)
    root.lang = lang
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme, lite, lang])

  useEffect(() => {
    if (!signedIn) return setMe(null)
    if (me) return
    let alive = true
    setMeError('')
    currentUser().then(
      (u) => alive && setMe(u),
      (e: Error) => {
        if (!alive) return
        if (e instanceof ApiError && e.status === 401) setSignedIn(false)
        else setMeError(e.message)
      },
    )
    return () => {
      alive = false
    }
  }, [signedIn, me, meAttempt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const expired = () => {
      setMe(null)
      setSignedIn(false)
    }
    window.addEventListener(UNAUTHORIZED_EVENT, expired)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, expired)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!signedIn)
    return (
      <>
        <Aurora />
        <Login
          t={t}
          lang={lang}
          setLang={setLang}
          onSignedIn={(u) => {
            setMe(u)
            setSignedIn(true)
          }}
        />
      </>
    )

  if (!me)
    return (
      <>
        <Aurora />
        <div className="mx-auto max-w-md p-4 pt-16">
          {meError ? (
            <div role="alert" className="glass p-6 text-center">
              <p className="text-sm text-mid">{meError}</p>
              <button onClick={() => setMeAttempt((n) => n + 1)} className="btn-primary mt-4 min-h-11 rounded-2xl px-5 font-semibold">
                Coba lagi
              </button>
            </div>
          ) : (
            <PageSkeleton />
          )}
        </div>
      </>
    )

  // Mode demo: peran bisa diganti dari Profil. Mode BFF: peran berasal dari sesi server.
  const user: User = USE_DEMO ? { ...me, role } : me
  const [section, sub = ''] = route.split('/')

  const view = (() => {
    switch (section) {
      case 'akademik':
        return <Akademik tab={sub} go={go} />
      case 'kuliah':
        return <Kuliah tab={sub} go={go} />
      case 'keuangan':
        return <Keuangan />
      case 'ktm':
        return <KtmPage user={user} back={back} go={go} />
      case 'parkir':
        return <Parkir user={user} back={back} go={go} />
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
      case 'download':
        return <DownloadPage go={go} back={back} />
      case 'surat':
        return <Surat back={back} />
      case 'edom':
        return <Edom back={back} />
      case 'ujian':
        return <Ujian user={user} back={back} />
      case 'herreg':
        return <Herreg back={back} go={go} />
      case 'booking':
        return <Booking back={back} />
      case 'aspirasi':
        return <Aspirasi back={back} />
      case 'sertifikat':
        return <DompetSertifikat back={back} />
      case 'islami':
        return <Islami back={back} />
      case 'alumni':
        return <Alumni back={back} />
      case 'pemira':
        return <Pemira back={back} />
      case 'atur-beranda':
        return <AturBeranda t={t} user={user} back={back} layout={homeLayout} setLayout={setHomeLayout} />
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
            lite={lite}
            setLite={setLite}
            role={role}
            setRole={setRole}
            favorites={favorites}
            setFavorites={setFavorites}
            onLogout={() => {
              void logout()
              setMe(null)
              setSignedIn(false)
              go('home')
            }}
          />
        )
      default:
        return <Home t={t} user={user} go={go} favorites={favorites} layout={homeLayout} />
    }
  })()

  return (
    <>
      <Aurora />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <PwaBanners t={t} />
        <SideRail t={t} section={section} go={go} />
        <main className="min-w-0 flex-1 px-4 pb-32 pt-4 md:px-8 md:pb-12 md:pt-6">
          <TopBar t={t} go={go} onSos={() => setSos(true)} />
          <div key={route} className="page-enter">
            <Suspense fallback={<PageSkeleton />}>{view}</Suspense>
          </div>
        </main>
        <BottomNav t={t} section={section} go={go} />
        {sos && <SosSheet t={t} onClose={() => setSos(false)} />}
        {!onboarded && (
          <Suspense fallback={null}>
            <Onboarding onDone={() => setOnboarded(true)} />
          </Suspense>
        )}
      </div>
    </>
  )
}

function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat" className="space-y-4">
      <div className="shimmer h-10 w-1/2 rounded-2xl" />
      <div className="shimmer h-40 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="shimmer h-28 rounded-3xl" />
        <div className="shimmer h-28 rounded-3xl" />
      </div>
    </div>
  )
}

function Aurora() {
  return (
    <div className="aurora" aria-hidden>
      <span />
    </div>
  )
}

/* ---------------- Login (di dalam aplikasi) ---------------- */

function Login({ t, lang, setLang, onSignedIn }: { t: Dict; lang: Lang; setLang: (l: Lang) => void; onSignedIn: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      onSignedIn(await login(username, password))
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const input = 'mt-1.5 w-full min-h-12 rounded-2xl border border-line bg-glass px-4 outline-none transition focus:border-cyan focus:shadow-[var(--glow)]'
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PwaBanners t={t} />
      <form onSubmit={submit} className="glass page-enter w-full max-w-sm !rounded-[28px] p-8">
        <img src="/brand/unpam-logo-256.webp" alt="Logo Universitas Pamulang" width="96" height="96" className="mx-auto h-24 w-24 rounded-full shadow-[var(--glow)]" />
        <h1 className="mt-5 text-center text-3xl font-bold">
          Super <span className="text-gradient">UNPAM</span>
        </h1>
        <p className="mt-1 text-center text-sm text-mid">{t.tagline}</p>
        <label className="mt-8 block text-sm font-semibold">
          {t.username}
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className={input} />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          {t.password}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className={input} />
        </label>
        {err && <p className="mt-3 text-sm text-rose">{err}</p>}
        <button disabled={busy} className="btn-primary mt-6 min-h-12 w-full rounded-2xl font-semibold">
          {busy ? t.signingIn : t.signIn}
        </button>
        <p className="mt-4 text-center text-xs text-mid">{t.loginNote}</p>
        <div className="mt-6 flex justify-center gap-2 text-xs">
          {(['id', 'en'] as Lang[]).map((l) => (
            <button type="button" key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`min-h-9 rounded-full px-4 font-semibold ${lang === l ? 'btn-primary' : 'bg-glass-strong text-mid'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}

/* ---------------- Shell ---------------- */

const NAV = [
  { section: 'home', route: 'home', Icon: HomeIcon, key: 'home' as const },
  { section: 'akademik', route: 'akademik/jadwal', Icon: GraduationCap, key: 'akademik' as const },
  { section: 'kuliah', route: 'kuliah', Icon: Laptop, key: 'kuliah' as const },
  { section: 'keuangan', route: 'keuangan', Icon: Wallet, key: 'keuangan' as const },
  { section: 'profil', route: 'profil', Icon: UserIcon, key: 'profile' as const },
]

function SideRail({ t, section, go }: { t: Dict; section: string; go: (r: string) => void }) {
  const item = (active: boolean) =>
    `flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-left text-sm font-semibold transition ${active ? 'btn-primary' : 'text-mid hover:bg-glass-strong hover:text-hi'}`
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 p-4 md:block">
      <div className="glass flex h-full flex-col gap-1 !rounded-[28px] p-4">
        <button onClick={() => go('home')} className="mb-5 flex items-center gap-3 px-1 text-left">
          <img src="/brand/unpam-logo-256.webp" alt="Logo UNPAM" width="44" height="44" className="h-11 w-11 rounded-full shadow-[var(--glow)]" />
          <div>
            <div className="font-display text-lg font-bold">
              Super <span className="text-gradient">UNPAM</span>
            </div>
            <div className="text-xs text-low">Universitas Pamulang</div>
          </div>
        </button>
        {NAV.map((n) => (
          <button key={n.section} onClick={() => go(n.route)} aria-current={section === n.section ? 'page' : undefined} className={item(section === n.section)}>
            <n.Icon className="h-5 w-5" />
            {t[n.key] as string}
          </button>
        ))}
        <div className="my-3 h-px bg-line" />
        <button onClick={() => go('ktm')} aria-current={section === 'ktm' ? 'page' : undefined} className={item(section === 'ktm')}>
          <IdCard className="h-5 w-5" /> {t.ktm}
        </button>
        <button onClick={() => go('presensi')} aria-current={section === 'presensi' ? 'page' : undefined} className={item(section === 'presensi')}>
          <MapPin className="h-5 w-5" /> {t.checkIn}
        </button>
        <div className="mt-auto rounded-2xl bg-glass-strong p-3 text-xs text-mid">
          <span className="font-semibold text-hi">Super UNPAM</span> v0.3 · PWA
        </div>
      </div>
    </aside>
  )
}

function BottomNav({ t, section, go }: { t: Dict; section: string; go: (r: string) => void }) {
  const items = [NAV[0], NAV[1], null, NAV[2], NAV[4]]
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 px-3 md:hidden">
      <div className="glass mx-auto grid max-w-md grid-cols-5 items-end !rounded-[26px] !bg-[color-mix(in_srgb,var(--surface)_97%,transparent)] px-1 py-1.5">
        {items.map((n) =>
          n === null ? (
            <button key="ktm" onClick={() => go('ktm')} aria-label={t.ktm} className="flex flex-col items-center">
              <span className="btn-primary -mt-8 flex h-16 w-16 items-center justify-center rounded-[22px] ring-4 ring-[var(--bg-800)]">
                <IdCard className="h-7 w-7" />
              </span>
              <span className={`mt-1 text-[11px] font-semibold ${section === 'ktm' ? 'text-cyan' : 'text-mid'}`}>KTM</span>
            </button>
          ) : (
            <button
              key={n.section}
              onClick={() => go(n.route)}
              aria-current={section === n.section ? 'page' : undefined}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${section === n.section ? 'text-cyan' : 'text-mid'}`}
            >
              <n.Icon className="h-[22px] w-[22px]" />
              {t[n.key] as string}
              {section === n.section && <span className="absolute -bottom-1 h-1 w-5 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]" />}
            </button>
          ),
        )}
      </div>
    </nav>
  )
}

function TopBar({ t, go, onSos }: { t: Dict; go: (r: string) => void; onSos: () => void }) {
  return (
    <header className="mb-5 flex items-center justify-end gap-2">
      <button onClick={() => go('home')} className="mr-auto flex items-center gap-2 md:hidden">
        <img src="/brand/unpam-logo-256.webp" alt="Logo UNPAM" width="36" height="36" className="h-9 w-9 rounded-full shadow-[var(--glow)]" />
        <span className="font-display text-lg font-bold">
          Super <span className="text-gradient">UNPAM</span>
        </span>
      </button>
      <button onClick={() => go('notifikasi')} aria-label={`${t.notifications} (3 baru)`} className="glass glass-hover relative flex h-11 w-11 items-center justify-center !rounded-2xl">
        <Bell className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white shadow-[0_0_10px_var(--rose)]">3</span>
      </button>
      <button onClick={onSos} className="flex h-11 items-center gap-1.5 rounded-2xl bg-rose px-4 text-sm font-bold text-white shadow-[0_0_20px_color-mix(in_srgb,var(--rose)_50%,transparent)]">
        <LifeBuoy className="h-4 w-4" /> {t.sos}
      </button>
    </header>
  )
}

function SosSheet({ t, onClose }: { t: Dict; onClose: () => void }) {
  // TODO: nomor resmi keamanan, klinik & konseling kampus
  const contacts = [
    { label: 'Keamanan Kampus', Icon: ShieldAlert, href: '' },
    { label: 'Layanan Konseling', Icon: MessageCircleHeart, href: '' },
    { label: 'Klinik / Kesehatan', Icon: Stethoscope, href: '' },
    { label: 'Darurat Nasional 112', Icon: Phone, href: 'tel:112' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm md:items-center" role="dialog" aria-modal="true" aria-label={t.sosTitle} onClick={onClose}>
      <div className="glass page-enter w-full max-w-sm !rounded-[28px] !bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="flex items-center gap-2 text-xl font-bold text-rose">
          <LifeBuoy className="h-6 w-6" /> {t.sosTitle}
        </h2>
        <div className="mt-4 grid gap-2">
          {contacts.map(({ label, Icon, href }) => {
            const cls = 'flex min-h-12 items-center gap-3 rounded-2xl px-4 font-semibold bg-[color-mix(in_srgb,var(--rose)_14%,transparent)] text-rose'
            return href ? (
              <a key={label} href={href} className={cls}>
                <Icon className="h-5 w-5" /> {label}
              </a>
            ) : (
              <div key={label} className={`${cls} opacity-60`}>
                <Icon className="h-5 w-5" /> {label}
                <span className="ml-auto text-[10px] font-medium">nomor menyusul</span>
              </div>
            )
          })}
        </div>
        <button className="mt-4 min-h-12 w-full rounded-2xl bg-glass-strong font-semibold" onClick={onClose}>
          Tutup
        </button>
      </div>
    </div>
  )
}
