import { useEffect, useState } from 'react'
import { BookOpen, Copy, FileLock2, FileText, GraduationCap, Search } from 'lucide-react'
import { cariKarya, cariKoleksi, hakBerkas, LABEL_JENIS, sitasiAPA, sitasiBibtex, statistik, tersedia, type JenisKarya, type KaryaAkhir, type Koleksi } from '../../lib/perpustakaan/repositori'
import { sumber } from '../../lib/sumber'
import { USE_DEMO } from '../../lib/api'
import type { User } from '../../lib/types'
import { Badge, PageHeader, Skeleton, Tabs } from '../../components/ui'

// Digital Library: repositori karya akhir lulusan (skripsi, tesis, disertasi) + katalog koleksi perpustakaan.
// Metadata dan abstrak terbuka; teks lengkap mengikuti pilihan akses penulis (terbuka / civitas / embargo).

const input = 'w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
const LABEL_AKSES = { TERBUKA: ['Akses terbuka', 'green'], CIVITAS: ['Khusus civitas', 'blue'], EMBARGO: ['Embargo', 'amber'] } as const

export function Perpustakaan({ user, back }: { user: User; back: () => void }) {
  const [tab, setTab] = useState<'repo' | 'katalog'>('repo')
  const [data, setData] = useState<{ karya: KaryaAkhir[]; koleksi: Koleksi[] } | null>(null)
  const [galat, setGalat] = useState('')
  useEffect(() => {
    Promise.all([sumber.perpustakaan.repositori(), sumber.perpustakaan.katalog()])
      .then(([r, k]) => setData({ karya: r.data, koleksi: k.data }))
      .catch((e: Error) => setGalat(e.message))
  }, [])
  return (
    <div>
      <PageHeader title="Digital Library" subtitle="Repositori karya akhir & katalog perpustakaan" onBack={back} />
      <Tabs value={tab} onChange={setTab} options={[['repo', 'Skripsi · Tesis · Disertasi'], ['katalog', 'Katalog']]} />
      {USE_DEMO && <p className="mb-3 text-xs text-low">Mode demo: judul, penulis, dan isi adalah data contoh fiktif.</p>}
      {galat ? <p role="alert" className="text-sm text-rose">{galat}</p> : !data ? <Skeleton rows={4} /> : tab === 'repo' ? <Repositori karya={data.karya} user={user} /> : <Katalog koleksi={data.koleksi} />}
    </div>
  )
}

function Repositori({ karya, user }: { karya: KaryaAkhir[]; user: User }) {
  const [q, setQ] = useState('')
  const [jenis, setJenis] = useState<JenisKarya | ''>('')
  const [prodi, setProdi] = useState('')
  const [buka, setBuka] = useState<string | null>(null)
  const [info, setInfo] = useState('')
  const st = statistik(karya)
  const hasil = cariKarya(karya, { q, jenis, prodi })
  const salin = (teks: string, label: string) => navigator.clipboard?.writeText(teks).then(() => setInfo(`${label} disalin.`), () => setInfo('Gagal menyalin.'))

  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(Object.keys(LABEL_JENIS) as JenisKarya[]).map((j) => (
          <button key={j} onClick={() => setJenis(jenis === j ? '' : j)} aria-pressed={jenis === j} className={`glass p-3 text-left ${jenis === j ? 'ring-2 ring-cyan' : ''}`}>
            <div className="text-xl font-bold">{st.perJenis[j]}</div>
            <div className="text-xs text-mid">{LABEL_JENIS[j]}</div>
          </button>
        ))}
      </div>
      <label className="glass flex min-h-12 items-center gap-2 !rounded-2xl px-4">
        <Search className="h-4 w-4 text-mid" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, penulis, NIM, pembimbing, kata kunci" aria-label="Cari karya akhir" className="w-full bg-transparent outline-none placeholder:text-low" />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select aria-label="Jenis karya" value={jenis} onChange={(e) => setJenis(e.target.value as JenisKarya | '')} className={input}>
          <option value="">Semua jenis</option>
          {(Object.keys(LABEL_JENIS) as JenisKarya[]).map((j) => <option key={j} value={j}>{LABEL_JENIS[j]}</option>)}
        </select>
        <select aria-label="Program studi" value={prodi} onChange={(e) => setProdi(e.target.value)} className={input}>
          <option value="">Semua prodi</option>
          {st.prodi.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <p className="mt-3 text-xs text-low" role="status">{hasil.length} karya ditemukan</p>
      <ul className="mt-2 grid gap-3">
        {hasil.map((k) => {
          const hak = hakBerkas(k, user, new Date())
          const [lbl, tone] = LABEL_AKSES[k.akses]
          return (
            <li key={k.id} className="glass p-4">
              <div className="flex items-start gap-3">
                <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{k.judul}</div>
                  <div className="text-sm text-mid">{k.penulis} · {k.prodi} · {k.tahunLulus}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="slate">{LABEL_JENIS[k.jenis]}</Badge><Badge tone={tone}>{lbl}</Badge></div>
                </div>
              </div>
              <button onClick={() => (setBuka(buka === k.id ? null : k.id), setInfo(''))} aria-expanded={buka === k.id} className="mt-3 min-h-10 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                {buka === k.id ? 'Tutup' : 'Abstrak & sitasi'}
              </button>
              {buka === k.id && (
                <div className="mt-3 border-t border-line pt-3 text-sm">
                  <p className="text-mid">{k.abstrak}</p>
                  <dl className="mt-2 grid gap-1 text-xs text-low">
                    <div><dt className="inline font-semibold">Pembimbing/promotor: </dt><dd className="inline">{k.pembimbing.join('; ')}</dd></div>
                    <div><dt className="inline font-semibold">Kata kunci: </dt><dd className="inline">{k.kataKunci.join(', ')}</dd></div>
                    <div><dt className="inline font-semibold">NIM · halaman: </dt><dd className="inline">{k.nim} · {k.halaman} hlm.</dd></div>
                  </dl>
                  <p className="mt-3 rounded-xl bg-glass-strong p-3 font-mono text-xs">{sitasiAPA(k)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => salin(sitasiAPA(k), 'Sitasi APA')} className="flex min-h-10 items-center gap-1 rounded-xl bg-glass-strong px-3 text-xs font-semibold"><Copy className="h-3.5 w-3.5" aria-hidden />Salin APA</button>
                    <button onClick={() => salin(sitasiBibtex(k), 'BibTeX')} className="flex min-h-10 items-center gap-1 rounded-xl bg-glass-strong px-3 text-xs font-semibold"><Copy className="h-3.5 w-3.5" aria-hidden />Salin BibTeX</button>
                    {hak.boleh ? (
                      <button onClick={() => setInfo(USE_DEMO ? 'Mode demo: teks lengkap tersedia setelah tersambung ke repositori perpustakaan.' : 'Membuka teks lengkap…')} className="btn-primary flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-semibold"><FileText className="h-3.5 w-3.5" aria-hidden />Baca teks lengkap</button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber"><FileLock2 className="h-3.5 w-3.5" aria-hidden />{hak.alasan}</span>
                    )}
                  </div>
                  {info && <p role="status" className="mt-2 text-xs text-mid">{info}</p>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Katalog({ koleksi }: { koleksi: Koleksi[] }) {
  const [q, setQ] = useState('')
  const [pesan, setPesan] = useState<string[]>([])
  return (
    <>
      <label className="glass flex min-h-12 items-center gap-2 !rounded-2xl px-4">
        <Search className="h-4 w-4 text-mid" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul, pengarang, ISBN, subjek" aria-label="Cari katalog" className="w-full bg-transparent outline-none placeholder:text-low" />
      </label>
      <ul className="mt-3 glass divide-y divide-line">
        {cariKoleksi(koleksi, q).map((k) => {
          const sisa = tersedia(k)
          return (
            <li key={k.id} className="flex items-start gap-3 px-4 py-3.5">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{k.judul}</div>
                <div className="text-xs text-low">{k.pengarang} · {k.penerbit} · {k.tahun}{k.isbn ? ` · ISBN ${k.isbn}` : ''}</div>
                <div className="text-xs text-mid">{k.lokasi}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge tone={sisa ? 'green' : 'slate'}>{sisa ? `${sisa} tersedia` : 'Semua dipinjam'}</Badge>
                <button disabled={pesan.includes(k.id)} onClick={() => setPesan((x) => [...x, k.id])} className="min-h-9 rounded-xl bg-glass-strong px-3 text-xs font-semibold disabled:text-mint">
                  {pesan.includes(k.id) ? (sisa ? 'Dipesan' : 'Masuk antrean') : sisa ? 'Pesan' : 'Antre'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
