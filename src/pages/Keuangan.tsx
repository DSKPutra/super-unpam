import { useState } from 'react'
import { bills as initialBills, rupiah } from '../data/demo'
import { Badge, DemoNote, PageHeader, Section } from '../components/ui'

export function Keuangan() {
  const [bills, setBills] = useState(initialBills)
  const [payId, setPayId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const unpaid = bills.filter((b) => b.status === 'unpaid')
  const paid = bills.filter((b) => b.status === 'paid')
  const total = unpaid.reduce((a, b) => a + b.amount, 0)
  const paying = bills.find((b) => b.id === payId)

  return (
    <div>
      <PageHeader title="Keuangan" />
      <DemoNote />
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-white shadow">
        <div className="text-sm opacity-80">Total tagihan aktif</div>
        <div className="mt-1 text-3xl font-bold">{rupiah(total)}</div>
        <div className="mt-1 text-sm opacity-80">{unpaid.length} tagihan belum dibayar</div>
      </div>

      <Section title="Tagihan">
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {unpaid.length === 0 && <p className="p-4 text-sm text-slate-500">Semua tagihan sudah lunas 🎉</p>}
          {unpaid.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-slate-500">Jatuh tempo {b.due}</div>
              </div>
              <div className="font-bold">{rupiah(b.amount)}</div>
              <button onClick={() => setPayId(b.id)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Bayar
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Riwayat pembayaran">
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {paid.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-slate-500">{b.due}</div>
              </div>
              <div className="text-sm font-semibold">{rupiah(b.amount)}</div>
              <Badge tone="green">Lunas</Badge>
            </div>
          ))}
        </div>
      </Section>

      {paying && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center" role="dialog" aria-modal="true" onClick={() => setPayId(null)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Bayar via Virtual Account</h2>
            <p className="mt-1 text-sm text-slate-500">{paying.name}</p>
            <div className="mt-4 rounded-xl bg-slate-100 p-4 text-center dark:bg-slate-800">
              <div className="text-xs text-slate-500">Nomor VA (contoh)</div>
              <div className="mt-1 font-mono text-xl font-bold tracking-wider">{paying.va}</div>
              <button
                className="mt-2 text-sm font-semibold text-unpam-600 dark:text-unpam-100"
                onClick={() => {
                  navigator.clipboard?.writeText(paying.va.replace(/\s/g, ''))
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? '✓ Tersalin' : 'Salin nomor'}
              </button>
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <span>Jumlah</span>
              <span className="font-bold">{rupiah(paying.amount)}</span>
            </div>
            <button
              className="mt-5 w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white"
              onClick={() => {
                setBills((bs) => bs.map((b) => (b.id === paying.id ? { ...b, status: 'paid' } : b)))
                setPayId(null)
              }}
            >
              Saya sudah bayar (simulasi)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
