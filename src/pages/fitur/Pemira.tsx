import { useState } from 'react'
import { Lock, ShieldCheck, Vote } from 'lucide-react'
import { Badge, DemoNote, PageHeader } from '../../components/ui'

// #51 E-voting Pemira — modul on-demand (chunk terpisah, dimuat hanya saat dibuka).
// TODO(BFF): satu suara per NIM, token sekali pakai, suara terenkripsi & log audit terpisah dari identitas.
const PERIODE = { name: 'Pemira BEM Universitas 2026', open: true, until: '30 Nov 2026, 17:00' }
const PASLON = [
  { no: 1, ketua: 'Andi Saputra', wakil: 'Lia Kurnia', visi: 'Kampus inklusif & digital untuk semua mahasiswa.' },
  { no: 2, ketua: 'Bima Prakoso', wakil: 'Rina Wulandari', visi: 'Organisasi transparan dengan program berbasis data.' },
]

export function Pemira({ back }: { back: () => void }) {
  const [pick, setPick] = useState<number | null>(null)
  const [voted, setVoted] = useState(false)
  return (
    <div>
      <PageHeader title="E-Voting Pemira" subtitle={PERIODE.name} onBack={back} />
      <DemoNote />
      <div className="glass mb-4 flex items-center gap-3 p-4 text-sm">
        <Vote className="h-5 w-5 text-cyan" />
        <span className="flex-1">Pemungutan suara dibuka hingga {PERIODE.until}</span>
        <Badge tone={PERIODE.open ? 'green' : 'slate'}>{PERIODE.open ? 'Dibuka' : 'Ditutup'}</Badge>
      </div>
      {voted ? (
        <div className="glass p-6 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-mint" />
          <div className="mt-2 font-display text-xl font-bold">Suara Anda tercatat</div>
          <p className="mt-1 text-sm text-mid">Pilihan bersifat rahasia dan tidak bisa diubah. Terima kasih sudah berpartisipasi.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Pilih pasangan calon">
            {PASLON.map((p) => (
              <button key={p.no} role="radio" aria-checked={pick === p.no} onClick={() => setPick(p.no)} className={`glass glass-hover p-5 text-left ${pick === p.no ? 'ring-2 ring-[var(--primary)]' : ''}`}>
                <div className="font-display text-4xl font-bold text-gradient">0{p.no}</div>
                <div className="mt-2 font-semibold">{p.ketua} & {p.wakil}</div>
                <p className="mt-1 text-sm text-mid">{p.visi}</p>
              </button>
            ))}
          </div>
          <button disabled={pick === null} onClick={() => confirm(`Kirim suara untuk paslon 0${pick}? Pilihan tidak bisa diubah.`) && setVoted(true)} className="btn-primary mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold">
            <Lock className="h-4 w-4" /> Kirim suara rahasia
          </button>
        </>
      )}
    </div>
  )
}
