import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import type { Dict } from '../lib/i18n'
import type { User } from '../lib/types'
import { PageHeader } from '../components/ui'
import { moveWidget, normalizeLayout, toggleWidget, type HomeLayout } from './widgets/layout'
import { DEFAULT_LAYOUT, HIDDEN_BY_DEFAULT, WIDGET_IDS, widgetById } from './widgets/registry'
import type { WidgetDef } from './widgets/types'

// Galeri widget Beranda: tampil/sembunyi dan urutan. Sengaja tanpa drag-and-drop:
// tombol Naik/Turun bisa dipakai dengan keyboard dan pembaca layar, dan perubahan diumumkan lewat aria-live.
export function AturBeranda({ t, user, back, layout: stored, setLayout }: { t: Dict; user: User; back: () => void; layout: unknown; setLayout: (l: HomeLayout) => void }) {
  const layout = useMemo(() => normalizeLayout(stored, WIDGET_IDS, HIDDEN_BY_DEFAULT), [stored])
  const [announce, setAnnounce] = useState('')
  // Hanya widget yang berlaku untuk peran ini yang bisa diatur; posisi dihitung di antara widget itu saja.
  const mine = layout.order.map(widgetById).filter((w): w is WidgetDef => !!w && w.roles.includes(user.role))

  const move = (w: WidgetDef, delta: -1 | 1) => {
    const i = mine.indexOf(w)
    const neighbour = mine[i + delta]
    if (!neighbour) return
    // Tukar dengan tetangga yang terlihat di daftar ini, walau di antaranya ada widget peran lain.
    let next = layout
    const steps = layout.order.indexOf(neighbour.id) - layout.order.indexOf(w.id)
    for (let s = 0; s < Math.abs(steps); s++) next = moveWidget(next, w.id, delta)
    setLayout(next)
    setAnnounce(t.movedTo(w.title(t), i + delta + 1))
  }
  const toggle = (w: WidgetDef) => {
    const hidden = !layout.hidden.includes(w.id)
    setLayout(toggleWidget(layout, w.id))
    setAnnounce(hidden ? t.hiddenMsg(w.title(t)) : t.shownMsg(w.title(t)))
  }
  const reset = () => {
    setLayout(DEFAULT_LAYOUT)
    setAnnounce(t.resetDone)
  }

  const iconBtn = 'flex h-11 w-11 items-center justify-center rounded-xl bg-glass-strong text-mid hover:text-hi disabled:opacity-30'
  return (
    <div className="page-enter">
      <PageHeader title={t.customizeHome} subtitle={t.customizeHomeNote} onBack={back} />
      <p className="sr-only" aria-live="polite" role="status">{announce}</p>

      <ol className="glass divide-y divide-line overflow-hidden">
        {mine.map((w, i) => {
          const shown = !layout.hidden.includes(w.id)
          const name = w.title(t)
          return (
            <li key={w.id} className={`flex items-center gap-2 p-3 md:gap-3 md:p-4 ${shown ? '' : 'opacity-60'}`}>
              {/* Pratinjau kecil: bentuk dan ukuran widget di Beranda (lebar = tile lebih panjang) */}
              <div aria-hidden className={`flex h-10 shrink-0 items-center justify-center rounded-xl border border-line bg-glass-strong md:h-12 ${w.size === 'lebar' ? 'w-14 md:w-20' : 'w-10 md:w-12'}`}>
                <w.icon className="h-5 w-5 text-cyan" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-tight md:text-base">{name}</div>
                <div className="text-xs text-low">
                  {w.size === 'lebar' ? t.widgetWide : t.widgetSmall} · {shown ? t.widgetShown : t.widgetHidden}
                </div>
              </div>
              <button className={iconBtn} onClick={() => move(w, -1)} disabled={i === 0} aria-label={t.moveUp(name)}>
                <ChevronUp className="h-5 w-5" />
              </button>
              <button className={iconBtn} onClick={() => move(w, 1)} disabled={i === mine.length - 1} aria-label={t.moveDown(name)}>
                <ChevronDown className="h-5 w-5" />
              </button>
              <label className="relative inline-flex min-h-11 cursor-pointer items-center">
                <input type="checkbox" checked={shown} onChange={() => toggle(w)} className="peer sr-only" aria-label={t.showWidget(name)} />
                <span className="h-7 w-12 rounded-full bg-glass-strong transition peer-checked:bg-[var(--primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--cyan)]" />
                <span className="absolute left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </li>
          )
        })}
      </ol>

      <button onClick={reset} className="glass glass-hover mt-4 flex min-h-12 w-full items-center justify-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4" /> {t.resetLayout}
      </button>
    </div>
  )
}
