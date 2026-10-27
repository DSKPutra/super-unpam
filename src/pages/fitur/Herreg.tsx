import { useState } from 'react'
import { CheckCircle2, PauseCircle, XCircle } from 'lucide-react'
import { bills } from '../../data/demo'
import { Badge, DemoNote, PageHeader, Section, Tabs } from '../../components/ui'

// #44 Registrasi ulang & cuti akademik — form + status, terkait status pembayaran.
export function Herreg({ back, go }: { back: () => void; go: (r: string) => void }) {
  const [tab, setTab] = useState<'herreg' | 'cuti'>('herreg')
  const [registered, setRegistered] = useState(false)
  const [cuti, setCuti] = useState<'none' | 'diajukan'>('none')
  const unpaid = bills.filter((b) => b.status === 'unpaid')
  const lunas = unpaid.length === 0
  const checks = [
    { ok: true, label: 'Status mahasiswa aktif' },
    { ok: lunas, label: lunas ? 'Tagihan semester lunas' : `${unpaid.length} tagihan belum dibayar` },
    { ok: true, label: 'Biodata terverifikasi' },
  ]
  return (
    <div>
      <PageHeader title="Registrasi & Cuti" subtitle="Semester Genap 2026/2027" onBack={back} />
      <Tabs value={tab} onChange={setTab} options={[['herreg', 'Registrasi ulang'], ['cuti', 'Cuti akademik']]} />
      <DemoNote />
      {tab === 'herreg' ? (
        <>
          <ul className="glass divide-y divide-line">
            {checks.map((c) => (
              <li key={c.label} className="flex min-h-14 items-center gap-3 px-4 text-sm">
                {c.ok ? <CheckCircle2 className="h-5 w-5 text-mint" /> : <XCircle className="h-5 w-5 text-rose" />}
                <span className="flex-1">{c.label}</span>
                {!c.ok && (
                  <button onClick={() => go('keuangan')} className="text-xs font-semibold text-cyan">Bayar</button>
                )}
              </li>
            ))}
          </ul>
          <button disabled={registered} onClick={() => setRegistered(true)} className="btn-primary mt-4 min-h-12 w-full rounded-2xl font-semibold">
            {registered ? '✓ Registrasi ulang tercatat (menunggu verifikasi pembayaran)' : 'Registrasi ulang sekarang'}
          </button>
          {!lunas && <p className="mt-2 text-xs text-mid">Registrasi tetap bisa diajukan; statusnya aktif setelah tagihan lunas.</p>}
        </>
      ) : (
        <Section title="Pengajuan cuti">
          {cuti === 'diajukan' ? (
            <div className="glass flex items-center gap-3 p-4">
              <PauseCircle className="h-6 w-6 text-amber" />
              <div className="flex-1 text-sm">Pengajuan cuti 1 semester sedang ditinjau Kaprodi.</div>
              <Badge tone="amber">Ditinjau</Badge>
            </div>
          ) : (
            <form className="glass space-y-4 p-5" onSubmit={(e) => (e.preventDefault(), setCuti('diajukan'))}>
              <label className="block text-sm font-semibold">
                Lama cuti
                <select className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-glass px-4">
                  <option>1 semester</option>
                  <option>2 semester</option>
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Alasan
                <textarea required className="mt-1.5 min-h-24 w-full rounded-2xl border border-line bg-glass p-4 outline-none" />
              </label>
              <button className="btn-primary min-h-12 w-full rounded-2xl font-semibold">Ajukan cuti</button>
            </form>
          )}
        </Section>
      )}
    </div>
  )
}
