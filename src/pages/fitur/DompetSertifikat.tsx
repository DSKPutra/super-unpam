import { useState } from 'react'
import QRCode from 'qrcode'
import { Award, BadgeCheck, Languages, Medal, Mic2, X } from 'lucide-react'
import { DemoNote, PageHeader } from '../../components/ui'

// #47 Dompet sertifikat & badge digital — satu tempat, QR verifikasi publik.
const ITEMS = [
  { id: 'EMS-26-0412', title: 'Seminar Nasional Teknologi & AI 2026', src: 'EMS', date: 'Nov 2026', Icon: Mic2 },
  { id: 'LSP-26-1188', title: 'Network Administrator Muda (Kompeten)', src: 'MY LSP', date: 'Jun 2026', Icon: Award },
  { id: 'LB-26-0520', title: 'TOEFL Prediction · Skor 520', src: 'MY LB', date: 'Sep 2026', Icon: Languages },
  { id: 'SKPI-26-0033', title: 'Juara 2 Hackathon Kampus 2026', src: 'SISPEMA', date: 'Mei 2026', Icon: Medal },
]

export function DompetSertifikat({ back }: { back: () => void }) {
  const [show, setShow] = useState<{ id: string; qr: string } | null>(null)
  const open = async (id: string) => {
    // TODO(BFF): URL verifikasi publik + hash dokumen
    const qr = await QRCode.toDataURL(`${location.origin}/#/verifikasi/${id}`, { margin: 1, width: 240 })
    setShow({ id, qr })
  }
  return (
    <div>
      <PageHeader title="Dompet Sertifikat" subtitle="Sertifikat & badge, siap diverifikasi" onBack={back} />
      <DemoNote />
      <div className="grid gap-3 md:grid-cols-2">
        {ITEMS.map((c) => (
          <button key={c.id} onClick={() => open(c.id)} className="glass glass-hover flex items-center gap-3 p-4 text-left">
            <span className="btn-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
              <c.Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <div className="font-semibold">{c.title}</div>
              <div className="text-xs text-low">{c.src} · {c.date} · {c.id}</div>
            </div>
          </button>
        ))}
      </div>
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="QR verifikasi" onClick={() => setShow(null)}>
          <div className="glass page-enter w-full max-w-xs !rounded-[28px] !bg-surface p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShow(null)} aria-label="Tutup" className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl bg-glass-strong">
              <X className="h-4 w-4" />
            </button>
            <img src={show.qr} alt={`QR verifikasi ${show.id}`} width={192} height={192} className="mx-auto h-48 w-48 rounded-xl bg-white p-1.5" />
            <p className="mt-3 flex items-center justify-center gap-1 text-sm font-semibold"><BadgeCheck className="h-4 w-4 text-mint" /> {show.id}</p>
            <p className="text-xs text-mid">Pindai untuk verifikasi keaslian.</p>
          </div>
        </div>
      )}
    </div>
  )
}
