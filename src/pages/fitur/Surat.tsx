import { useState } from 'react'
import { CheckCircle2, Circle, Download, FileText } from 'lucide-react'
import { Badge, DemoNote, PageHeader, Section } from '../../components/ui'

// #41 Layanan surat & administrasi mandiri — form + workflow approval + unduh PDF.
const JENIS = ['Surat keterangan aktif kuliah', 'Legalisir ijazah/transkrip', 'Pengajuan transkrip nilai', 'Surat izin tidak mengikuti kuliah', 'Surat pengantar magang/PKL']
const ALUR = ['Diajukan', 'Diverifikasi BAAK', 'Ditandatangani (e-sign)', 'Selesai']

type Req = { id: string; jenis: string; tanggal: string; step: number; ket: string }

export function Surat({ back }: { back: () => void }) {
  const [list, setList] = useState<Req[]>([
    { id: 'SRT-2026-0412', jenis: JENIS[0], tanggal: '20 Okt 2026', step: 3, ket: 'Untuk beasiswa' },
    { id: 'SRT-2026-0455', jenis: JENIS[1], tanggal: '25 Okt 2026', step: 1, ket: '3 lembar' },
  ])
  const [jenis, setJenis] = useState(JENIS[0])
  const [ket, setKet] = useState('')
  const field = 'mt-1.5 w-full min-h-12 rounded-2xl border border-line bg-glass px-4 outline-none focus:border-cyan'
  return (
    <div>
      <PageHeader title="Surat & Administrasi" subtitle="Ajukan tanpa antre, pantau statusnya" onBack={back} />
      <DemoNote />
      <form
        className="glass space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          setList((l) => [{ id: `SRT-2026-0${500 + l.length}`, jenis, tanggal: 'Hari ini', step: 0, ket }, ...l])
          setKet('')
        }}
      >
        <label className="block text-sm font-semibold">
          Jenis surat
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} className={field}>
            {JENIS.map((j) => (
              <option key={j}>{j}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Keperluan
          <input value={ket} onChange={(e) => setKet(e.target.value)} required placeholder="mis. syarat beasiswa" className={field} />
        </label>
        <button className="btn-primary min-h-12 w-full rounded-2xl font-semibold">Ajukan surat</button>
      </form>
      <Section title="Pengajuan saya">
        <div className="space-y-3">
          {list.map((r) => (
            <article key={r.id} className="glass p-4">
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 text-cyan" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.jenis}</div>
                  <div className="text-xs text-low">{r.id} · {r.tanggal} · {r.ket}</div>
                </div>
                <Badge tone={r.step === 3 ? 'green' : 'amber'}>{ALUR[r.step]}</Badge>
              </div>
              <ol className="mt-3 grid grid-cols-4 gap-1 text-[10px] text-mid">
                {ALUR.map((a, i) => (
                  <li key={a} className="flex flex-col items-center gap-1 text-center">
                    {i <= r.step ? <CheckCircle2 className="h-4 w-4 text-mint" /> : <Circle className="h-4 w-4 text-low" />}
                    {a}
                  </li>
                ))}
              </ol>
              {r.step === 3 && (
                <button onClick={() => window.print()} className="mt-3 flex min-h-10 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                  <Download className="h-4 w-4" /> Unduh PDF ber-QR
                </button>
              )}
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
