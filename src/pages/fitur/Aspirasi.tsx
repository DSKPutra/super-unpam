import { useState } from 'react'
import { EyeOff, MessageSquareWarning } from 'lucide-react'
import { Badge, DemoNote, PageHeader, Section } from '../../components/ui'

// #46 Kotak aspirasi & pengaduan — anonim opsional + tracking tindak lanjut.
const KAT = ['Fasilitas', 'Akademik', 'Layanan administrasi', 'Keuangan', 'Pelecehan / kekerasan', 'Lainnya']
type Item = { id: string; kat: string; isi: string; anon: boolean; status: 'Diterima' | 'Diproses' | 'Selesai' }

export function Aspirasi({ back }: { back: () => void }) {
  const [list, setList] = useState<Item[]>([{ id: 'ASP-0091', kat: 'Fasilitas', isi: 'AC ruang A-402 mati sejak minggu lalu.', anon: false, status: 'Diproses' }])
  const [kat, setKat] = useState(KAT[0])
  const [isi, setIsi] = useState('')
  const [anon, setAnon] = useState(false)
  return (
    <div>
      <PageHeader title="Aspirasi & Pengaduan" subtitle="Suaramu ditindaklanjuti" onBack={back} />
      <DemoNote />
      <form
        className="glass space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          setList((l) => [{ id: `ASP-0${92 + l.length}`, kat, isi, anon, status: 'Diterima' }, ...l])
          setIsi('')
        }}
      >
        <label className="block text-sm font-semibold">
          Kategori
          <select value={kat} onChange={(e) => setKat(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-glass px-4">
            {KAT.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Isi aspirasi / laporan
          <textarea value={isi} onChange={(e) => setIsi(e.target.value)} required minLength={10} className="mt-1.5 min-h-28 w-full rounded-2xl border border-line bg-glass p-4 outline-none focus:border-cyan" />
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-5 w-5 accent-[var(--primary)]" />
          <EyeOff className="h-4 w-4 text-mid" /> Kirim secara anonim (identitas tidak ditampilkan ke petugas)
        </label>
        <button className="btn-primary min-h-12 w-full rounded-2xl font-semibold">Kirim</button>
      </form>
      <Section title="Laporan saya">
        <div className="space-y-2">
          {list.map((x) => (
            <article key={x.id} className="glass flex items-start gap-3 p-4">
              <MessageSquareWarning className="mt-0.5 h-5 w-5 text-amber" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-low">{x.id} · {x.kat}{x.anon ? ' · anonim' : ''}</div>
                <div className="text-sm">{x.isi}</div>
              </div>
              <Badge tone={x.status === 'Selesai' ? 'green' : x.status === 'Diproses' ? 'blue' : 'amber'}>{x.status}</Badge>
            </article>
          ))}
        </div>
      </Section>
    </div>
  )
}
