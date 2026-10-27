import { useState } from 'react'
import { getBills } from '../lib/api'
import { rupiah } from '../lib/format'
import { useResource } from '../lib/useResource'
import type { Bill } from '../lib/types'
import { Async, Badge, DemoNote, PageHeader, Section } from '../components/ui'

export function Keuangan() {
  const res = useResource(getBills)
  return (
    <div>
      <PageHeader title="Keuangan" />
      <DemoNote />
      <Async res={res}>{(bills) => <BillsView initial={bills} />}</Async>
    </div>
  )
}

// Status "sudah bayar" hanya simulasi lokal; status asli datang dari SISKEMU lewat BFF.
function BillsView({ initial }: { initial: Bill[] }) {
  const [bills, setBills] = useState(initial)
  const [payId, setPayId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const unpaid = bills.filter((b) => b.status === 'unpaid')
  const paid = bills.filter((b) => b.status === 'paid')
  const total = unpaid.reduce((a, b) => a + b.amount, 0)
  const paying = bills.find((b) => b.id === payId)

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-br from-[#00A88C] to-[#00D4FF] p-5 text-white shadow">
        <div className="text-sm opacity-80">Total tagihan aktif</div>
        <div className="mt-1 text-3xl font-bold">{rupiah(total)}</div>
        <div className="mt-1 text-sm opacity-80">{unpaid.length} tagihan belum dibayar</div>
      </div>

      <Section title="Tagihan">
        <div className="glass divide-y divide-line">
          {unpaid.length === 0 && <p className="p-4 text-sm text-mid">Semua tagihan sudah lunas 🎉</p>}
          {unpaid.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-mid">Jatuh tempo {b.due}</div>
              </div>
              <div className="font-bold">{rupiah(b.amount)}</div>
              <button onClick={() => setPayId(b.id)} className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-white">
                Bayar
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Riwayat pembayaran">
        <div className="glass divide-y divide-line">
          {paid.map((b) => (
            <div key={b.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-mid">{b.due}</div>
              </div>
              <div className="text-sm font-semibold">{rupiah(b.amount)}</div>
              <Badge tone="green">Lunas</Badge>
            </div>
          ))}
        </div>
      </Section>

      {paying && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 md:items-center" role="dialog" aria-modal="true" onClick={() => setPayId(null)}>
          <div className="glass w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Bayar via Virtual Account</h2>
            <p className="mt-1 text-sm text-mid">{paying.name}</p>
            <div className="mt-4 rounded-xl bg-glass-strong p-4 text-center">
              <div className="text-xs text-mid">Nomor VA (contoh)</div>
              <div className="mt-1 font-mono text-xl font-bold tracking-wider">{paying.va}</div>
              <button
                className="mt-2 text-sm font-semibold text-cyan"
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
              className="mt-5 w-full rounded-xl bg-mint py-3 font-semibold text-white"
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
    </>
  )
}
