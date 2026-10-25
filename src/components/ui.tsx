import type { ReactNode } from 'react'

export function PageHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} aria-label="Kembali" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          ←
        </button>
      )}
      <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
      <div className="ml-auto">{right}</div>
    </div>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function LinkBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="text-sm font-semibold text-unpam-600 hover:underline dark:text-unpam-100">
      {children}
    </button>
  )
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue'; children: ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    blue: 'bg-unpam-100 text-unpam-700 dark:bg-slate-800 dark:text-unpam-100',
  }
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800" role="tablist">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium ${value === v ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, color = '#0b4ea2' }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

export function DemoNote() {
  return <p className="mb-3 text-xs text-slate-500">ℹ️ Data contoh, nantinya tersambung ke sistem kampus.</p>
}
