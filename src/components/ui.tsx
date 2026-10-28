import type { ReactNode } from 'react'
import { ArrowLeft, Info, RefreshCw, WifiOff } from 'lucide-react'
import type { Resource } from '../lib/useResource'

export function PageHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} aria-label="Kembali" className="glass glass-hover flex h-11 w-11 shrink-0 items-center justify-center !rounded-2xl">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold md:text-3xl">{title}</h1>
        {subtitle && <p className="text-sm text-mid">{subtitle}</p>}
      </div>
      <div className="ml-auto">{right}</div>
    </div>
  )
}

export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mt-6 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-mid">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function LinkBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="min-h-11 px-1 text-sm font-semibold text-cyan hover:underline">
      {children}
    </button>
  )
}

const TONES = {
  slate: 'text-mid bg-glass-strong',
  green: 'text-mint bg-[color-mix(in_srgb,var(--mint)_14%,transparent)]',
  red: 'text-rose bg-[color-mix(in_srgb,var(--rose)_14%,transparent)]',
  amber: 'text-amber bg-[color-mix(in_srgb,var(--amber)_14%,transparent)]',
  blue: 'text-cyan bg-[color-mix(in_srgb,var(--cyan)_14%,transparent)]',
}

export function Badge({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]}`}>{children}</span>
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][] }) {
  return (
    <div className="glass mb-5 flex gap-1 !rounded-2xl p-1" role="tablist">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition ${value === v ? 'btn-primary' : 'text-mid hover:text-hi'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, color = 'var(--primary)' }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-glass-strong" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(value, 100)}%`, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 60%, var(--cyan)))`, boxShadow: `0 0 12px ${color}` }} />
    </div>
  )
}

export function Sparkline({ data, color = 'var(--cyan)', className = '' }: { data: number[]; color?: string; className?: string }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${30 - ((d - min) / (max - min || 1)) * 26 - 2}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={`h-8 w-full ${className}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function DemoNote() {
  return (
    <p className="mb-4 flex items-center gap-1.5 text-xs text-low">
      <Info className="h-3.5 w-3.5" /> Data contoh, nantinya tersambung ke sistem kampus.
    </p>
  )
}

export function Row({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const cls = `flex w-full items-center gap-3 px-4 py-3.5 text-left ${className}`
  return onClick ? (
    <button onClick={onClick} className={`${cls} transition hover:bg-glass-strong`}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  )
}

export function List({ children }: { children: ReactNode }) {
  return <div className="glass divide-y divide-line overflow-hidden">{children}</div>
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Memuat" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="shimmer h-16 rounded-3xl" />
      ))}
    </div>
  )
}

export function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="glass flex flex-col items-center gap-3 p-6 text-center">
      <WifiOff className="h-6 w-6 text-amber" aria-hidden />
      <p className="text-sm text-mid">{error.message || 'Data gagal dimuat.'}</p>
      <button onClick={onRetry} className="btn-primary flex min-h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold">
        <RefreshCw className="h-4 w-4" /> Coba lagi
      </button>
    </div>
  )
}

/** Pola tunggal untuk data async: skeleton saat memuat, pesan + "Coba lagi" saat gagal. */
export function Async<T>({ res, children, skeleton }: { res: Resource<T>; children: (data: T) => ReactNode; skeleton?: ReactNode }) {
  if (res.data !== undefined) return <>{children(res.data)}</>
  if (res.error) return <LoadError error={res.error} onRetry={res.reload} />
  return <>{skeleton ?? <Skeleton />}</>
}
