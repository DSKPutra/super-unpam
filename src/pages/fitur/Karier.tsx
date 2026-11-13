import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, BadgeCheck, Briefcase, Flag, Search, ShieldCheck } from 'lucide-react'
import {
  LABEL_LEVEL, LABEL_MODE, LABEL_TIPE, periksaFraud, rekomendasi, ATURAN_KARIER,
  type InputLowongan, type Lamaran, type Level, type Lowongan, type ModeKerja, type Orang, type ProfilKerja, type StatusLamaran, type TipeKerja,
} from '../../lib/karier/cocok'
import { sumber } from '../../lib/sumber'
import { USE_DEMO } from '../../lib/api'
import type { User } from '../../lib/types'
import { Badge, PageHeader, Section, Skeleton, Tabs } from '../../components/ui'

// Karier & Lowongan: job matching untuk seluruh civitas. Siapa pun yang masuk SSO UNPAM boleh mencari dan memasang.
// Anti-penipuan tanpa KYB: identitas terverifikasi SSO ditampilkan, isi lowongan diperiksa, komunitas bisa melapor,
// lowongan berisiko tinggi ditahan untuk ditinjau moderator.

const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
const LABEL_ROLE: Record<Orang['role'], string> = { MAHASISWA: 'Mahasiswa', ALUMNI: 'Alumni', DOSEN: 'Dosen', TENDIK: 'Staf/Tendik' }
const LABEL_STATUS: Record<StatusLamaran, string> = { TERKIRIM: 'Terkirim', DILIHAT: 'Dilihat', DIPROSES: 'Diproses', DITOLAK: 'Tidak lanjut', DITERIMA: 'Diterima' }
const pisah = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
const rp = (n?: number) => (n ? `Rp${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : '')
const gaji = (l: Lowongan) => (l.gajiMin || l.gajiMax ? [rp(l.gajiMin), rp(l.gajiMax)].filter(Boolean).join('–') + '/bln' : 'Gaji tidak dicantumkan')
const KOSONG: ProfilKerja = { keahlian: [], level: 'MAGANG', tipe: [], mode: [], lokasi: [], ringkasan: '' }

type Tab = 'cari' | 'profil' | 'pasang' | 'saya' | 'moderasi'

export function Karier({ user, back }: { user: User; back: () => void }) {
  const aku: Orang = { sub: user.nim, nama: user.name, role: user.role, prodi: user.prodi }
  sumber.karier.masuk(aku)
  const [tab, setTab] = useState<Tab>('cari')
  const [data, setData] = useState<{ lowongan: Lowongan[]; profil: ProfilKerja | null; lamaran: Lamaran[] } | null>(null)
  const [galat, setGalat] = useState('')

  const muat = useCallback(async () => {
    try {
      const [l, p, m] = await Promise.all([sumber.karier.lowongan(), sumber.karier.profil(), sumber.karier.lamaranSaya()])
      setData({ lowongan: l.data, profil: p.data, lamaran: m.data })
      setGalat('')
    } catch (e) {
      setGalat((e as Error).message)
    }
  }, [])
  useEffect(() => void muat(), [muat, user.nim, user.role])

  const opsi: [Tab, ReactNode][] = [['cari', 'Cari'], ['profil', 'Profil'], ['pasang', 'Pasang'], ['saya', 'Aktivitas']]
  if (user.role === 'TENDIK') opsi.push(['moderasi', 'Moderasi'])

  return (
    <div>
      <PageHeader title="Karier & Lowongan" subtitle="Dari dan untuk civitas UNPAM" onBack={back} />
      <Tabs value={tab} onChange={setTab} options={opsi} />
      {USE_DEMO && <p className="mb-3 text-xs text-low">Mode demo: data lowongan dan lamaran disimpan di perangkat ini saja.</p>}
      {galat && <p role="alert" className="mb-3 text-sm text-rose">{galat}</p>}
      {!data ? (
        <Skeleton rows={4} />
      ) : tab === 'cari' ? (
        <Cari aku={aku} data={data} segarkan={muat} keProfil={() => setTab('profil')} />
      ) : tab === 'profil' ? (
        <ProfilForm awal={data.profil} simpan={async (p) => (await sumber.karier.simpanProfil(p), await muat(), setTab('cari'))} />
      ) : tab === 'pasang' ? (
        <PasangForm selesai={async () => (await muat(), setTab('saya'))} />
      ) : tab === 'saya' ? (
        <Aktivitas aku={aku} data={data} segarkan={muat} />
      ) : (
        <Moderasi lowongan={data.lowongan.filter((l) => l.status === 'DITINJAU' || l.status === 'DISEMBUNYIKAN')} segarkan={muat} />
      )}
    </div>
  )
}

function TipsAman() {
  return (
    <div className="glass mb-4 flex gap-3 p-4 text-sm">
      <ShieldCheck className="h-5 w-5 shrink-0 text-mint" aria-hidden />
      <p>Lowongan resmi <b>tidak pernah</b> meminta biaya, transfer, PIN/OTP, atau foto KTP. Melamar lewat tombol di aplikasi; laporkan lowongan yang mencurigakan.</p>
    </div>
  )
}

function Pemasang({ o }: { o: Orang }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-mid">
      <BadgeCheck className="h-3.5 w-3.5 text-cyan" aria-hidden />
      <span>Dipasang {o.nama} · {LABEL_ROLE[o.role]}{o.prodi ? ` · ${o.prodi}` : ''} · terverifikasi SSO UNPAM</span>
    </span>
  )
}

function Cari({ aku, data, segarkan, keProfil }: { aku: Orang; data: { lowongan: Lowongan[]; profil: ProfilKerja | null; lamaran: Lamaran[] }; segarkan: () => Promise<void>; keProfil: () => void }) {
  const [q, setQ] = useState('')
  const [buka, setBuka] = useState<string | null>(null)
  const [pesan, setPesan] = useState('')
  const [info, setInfo] = useState<Record<string, string>>({})
  const daftar = rekomendasi(data.lowongan, data.profil ?? KOSONG, aku.sub, new Date(), q)
  const sudah = new Set(data.lamaran.map((x) => x.lowonganId))

  const aksi = async (id: string, fn: () => Promise<string>) => {
    try {
      setInfo((x) => ({ ...x, [id]: '' }))
      const teks = await fn()
      await segarkan()
      setInfo((x) => ({ ...x, [id]: teks }))
    } catch (e) {
      setInfo((x) => ({ ...x, [id]: (e as Error).message }))
    }
  }

  return (
    <>
      <TipsAman />
      {!data.profil && (
        <button onClick={keProfil} className="glass mb-4 w-full p-4 text-left text-sm">
          <b>Lengkapi profil kerja</b> agar lowongan diurutkan sesuai keahlian dan minat Anda →
        </button>
      )}
      <label className="glass flex min-h-12 items-center gap-2 !rounded-2xl px-4">
        <Search className="h-4 w-4 text-mid" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari posisi, perusahaan, lokasi, keahlian" aria-label="Cari lowongan" className="w-full bg-transparent outline-none placeholder:text-low" />
      </label>
      <ul className="mt-3 grid gap-3">
        {daftar.length === 0 && <li className="glass p-4 text-sm text-mid">Belum ada lowongan yang cocok.</li>}
        {daftar.map((l) => (
          <li key={l.id} className="glass p-4">
            <div className="flex items-start gap-3">
              <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.judul}</div>
                <div className="text-sm text-mid">{l.perusahaan} · {l.lokasi}</div>
                <div className="mt-1 text-xs text-low">{LABEL_TIPE[l.tipe]} · {LABEL_MODE[l.mode]} · {LABEL_LEVEL[l.level]} · {gaji(l)}</div>
              </div>
              {data.profil && <Badge tone={l.skor >= 70 ? 'green' : l.skor >= 45 ? 'blue' : 'slate'}>{l.skor}% cocok</Badge>}
            </div>
            <div className="mt-2"><Pemasang o={l.pemasang} /></div>
            {l.risiko === 'SEDANG' && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber"><AlertTriangle className="h-3.5 w-3.5" aria-hidden />Perhatikan: {l.temuan.join(' ')}</p>}
            {data.profil && (l.alasan.length > 0 || l.kurang.length > 0) && (
              <p className="mt-2 text-xs text-mid">
                {l.alasan.join(' · ')}
                {l.kurang.length > 0 && <span className="text-low"> · Perlu: {l.kurang.join(', ')}</span>}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => (setBuka(buka === l.id ? null : l.id), setPesan(''))} aria-expanded={buka === l.id} className="min-h-10 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                {buka === l.id ? 'Tutup detail' : 'Detail & lamar'}
              </button>
              <button onClick={() => aksi(l.id, async () => (await sumber.karier.lapor(l.id), 'Terima kasih, laporan dicatat. Lowongan disembunyikan otomatis bila banyak laporan.'))} className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-rose">
                <Flag className="h-3.5 w-3.5" aria-hidden /> Laporkan
              </button>
            </div>
            {buka === l.id && (
              <div className="mt-3 border-t border-line pt-3 text-sm">
                <p className="whitespace-pre-line text-mid">{l.deskripsi}</p>
                <p className="mt-2 text-xs text-low">Keahlian: {l.keahlian.join(', ')} · Tayang sampai {new Date(l.kedaluwarsa).toLocaleDateString('id-ID')}</p>
                {sudah.has(l.id) ? (
                  <p className="mt-3 font-semibold text-mint">Anda sudah melamar lowongan ini.</p>
                ) : l.tautan ? (
                  <a href={l.tautan} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary mt-3 inline-flex min-h-11 items-center rounded-xl px-4 font-semibold">Lamar di situs perusahaan ({new URL(l.tautan).hostname})</a>
                ) : (
                  <>
                    <label className="mt-3 block text-xs font-semibold">Pesan untuk pemasang (opsional)
                      <textarea value={pesan} onChange={(e) => setPesan(e.target.value)} maxLength={1000} rows={3} className={`${input} py-2`} />
                    </label>
                    <button onClick={() => aksi(l.id, async () => ((await sumber.karier.lamar(l.id, pesan)).data.baru ? 'Lamaran terkirim beserta profil kerja Anda.' : 'Anda sudah melamar lowongan ini.'))} className="btn-primary mt-2 min-h-11 rounded-xl px-4 font-semibold">
                      Kirim lamaran
                    </button>
                  </>
                )}
              </div>
            )}
            {info[l.id] && <p role="status" className="mt-2 text-xs text-mid">{info[l.id]}</p>}
          </li>
        ))}
      </ul>
    </>
  )
}

function Pilih<T extends string>({ label, nilai, opsi, ubah }: { label: string; nilai: T[]; opsi: Record<T, string>; ubah: (v: T[]) => void }) {
  return (
    <fieldset className="mt-4">
      <legend className="text-xs font-semibold">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {(Object.keys(opsi) as T[]).map((k) => (
          <label key={k} className={`flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${nilai.includes(k) ? 'btn-primary' : 'bg-glass-strong'}`}>
            <input type="checkbox" className="sr-only" checked={nilai.includes(k)} onChange={(e) => ubah(e.target.checked ? [...nilai, k] : nilai.filter((x) => x !== k))} />
            {opsi[k]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function ProfilForm({ awal, simpan }: { awal: ProfilKerja | null; simpan: (p: ProfilKerja) => Promise<unknown> }) {
  const p0 = awal ?? KOSONG
  const [keahlian, setKeahlian] = useState(p0.keahlian.join(', '))
  const [level, setLevel] = useState<Level>(p0.level)
  const [tipe, setTipe] = useState<TipeKerja[]>(p0.tipe)
  const [mode, setMode] = useState<ModeKerja[]>(p0.mode)
  const [lokasi, setLokasi] = useState(p0.lokasi.join(', '))
  const [gajiHarapan, setGaji] = useState(p0.gajiHarapan ? String(p0.gajiHarapan) : '')
  const [ringkasan, setRingkasan] = useState(p0.ringkasan)
  const [galat, setGalat] = useState('')
  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    if (!pisah(keahlian).length) return setGalat('Isi minimal satu keahlian.')
    try {
      await simpan({ keahlian: pisah(keahlian), level, tipe, mode, lokasi: pisah(lokasi), gajiHarapan: Number(gajiHarapan.replace(/\D/g, '')) || undefined, ringkasan })
    } catch (er) {
      setGalat((er as Error).message)
    }
  }
  return (
    <form onSubmit={kirim} className="glass p-4">
      <p className="text-sm text-mid">Profil ini dipakai untuk mengurutkan lowongan dan dikirim bersama lamaran Anda. Siapa pun boleh mencari kerja, apa pun perannya.</p>
      <label className="mt-4 block text-xs font-semibold">Keahlian (pisahkan dengan koma)<input value={keahlian} onChange={(e) => setKeahlian(e.target.value)} placeholder="React, Excel, Akuntansi" className={input} /></label>
      <label className="mt-4 block text-xs font-semibold">Level
        <select value={level} onChange={(e) => setLevel(e.target.value as Level)} className={input}>
          {(Object.keys(LABEL_LEVEL) as Level[]).map((k) => <option key={k} value={k}>{LABEL_LEVEL[k]}</option>)}
        </select>
      </label>
      <Pilih label="Jenis pekerjaan yang dicari" nilai={tipe} opsi={LABEL_TIPE} ubah={setTipe} />
      <Pilih label="Mode kerja" nilai={mode} opsi={LABEL_MODE} ubah={setMode} />
      <label className="mt-4 block text-xs font-semibold">Lokasi yang diminati (koma)<input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Tangerang, Jakarta" className={input} /></label>
      <label className="mt-4 block text-xs font-semibold">Gaji harapan per bulan (Rp, opsional)<input inputMode="numeric" value={gajiHarapan} onChange={(e) => setGaji(e.target.value)} className={input} /></label>
      <label className="mt-4 block text-xs font-semibold">Ringkasan diri<textarea value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} maxLength={1000} rows={3} className={`${input} py-2`} /></label>
      {galat && <p role="alert" className="mt-3 text-sm text-rose">{galat}</p>}
      <button className="btn-primary mt-4 min-h-11 rounded-xl px-4 font-semibold">Simpan profil</button>
    </form>
  )
}

function PasangForm({ selesai }: { selesai: () => Promise<void> }) {
  const [f, setF] = useState({ judul: '', perusahaan: '', lokasi: '', mode: 'HIBRIDA' as ModeKerja, tipe: 'PENUH_WAKTU' as TipeKerja, level: 'JUNIOR' as Level, keahlian: '', gajiMin: '', gajiMax: '', deskripsi: '', tautan: '', hariAktif: '30' })
  const [galat, setGalat] = useState('')
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const angka = (s: string) => Number(s.replace(/\D/g, '')) || undefined
  const isi: InputLowongan = { ...f, keahlian: pisah(f.keahlian), gajiMin: angka(f.gajiMin), gajiMax: angka(f.gajiMax), tautan: f.tautan.trim() || undefined, hariAktif: Number(f.hariAktif) || 0 }
  const cek = periksaFraud(isi)
  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await sumber.karier.pasang(isi)
      await selesai()
    } catch (er) {
      setGalat((er as Error).message)
    }
  }
  const teks = (k: keyof typeof f, label: string, extra = {}) => <label className="mt-4 block text-xs font-semibold">{label}<input value={f[k]} onChange={set(k)} className={input} {...extra} /></label>
  return (
    <form onSubmit={kirim} className="glass p-4">
      <p className="text-sm text-mid">Mahasiswa, alumni, dosen, dan staf boleh memasang lowongan. Nama dan peran Anda (terverifikasi SSO) tampil di lowongan. Maksimal {ATURAN_KARIER.maksLowonganAktif} lowongan aktif.</p>
      {teks('judul', 'Posisi')}
      {teks('perusahaan', 'Perusahaan / unit')}
      {teks('lokasi', 'Lokasi')}
      <div className="grid gap-x-3 sm:grid-cols-3">
        <label className="mt-4 block text-xs font-semibold">Jenis<select value={f.tipe} onChange={set('tipe')} className={input}>{(Object.keys(LABEL_TIPE) as TipeKerja[]).map((k) => <option key={k} value={k}>{LABEL_TIPE[k]}</option>)}</select></label>
        <label className="mt-4 block text-xs font-semibold">Mode<select value={f.mode} onChange={set('mode')} className={input}>{(Object.keys(LABEL_MODE) as ModeKerja[]).map((k) => <option key={k} value={k}>{LABEL_MODE[k]}</option>)}</select></label>
        <label className="mt-4 block text-xs font-semibold">Level<select value={f.level} onChange={set('level')} className={input}>{(Object.keys(LABEL_LEVEL) as Level[]).map((k) => <option key={k} value={k}>{LABEL_LEVEL[k]}</option>)}</select></label>
      </div>
      {teks('keahlian', 'Keahlian dibutuhkan (koma)')}
      <div className="grid gap-x-3 sm:grid-cols-2">
        {teks('gajiMin', 'Gaji min/bulan (Rp)', { inputMode: 'numeric' })}
        {teks('gajiMax', 'Gaji maks/bulan (Rp)', { inputMode: 'numeric' })}
      </div>
      <label className="mt-4 block text-xs font-semibold">Deskripsi: tanggung jawab, kualifikasi, proses seleksi<textarea value={f.deskripsi} onChange={set('deskripsi')} rows={5} maxLength={5000} className={`${input} py-2`} /></label>
      {teks('tautan', 'Tautan melamar eksternal (opsional, https)')}
      {teks('hariAktif', `Masa tayang (hari, maks ${ATURAN_KARIER.maksHariAktif})`, { inputMode: 'numeric' })}
      {cek.temuan.length > 0 && (
        <div role="status" className={`mt-4 rounded-xl p-3 text-xs ${cek.risiko === 'TINGGI' ? 'bg-[color-mix(in_srgb,var(--rose)_14%,transparent)] text-rose' : 'bg-[color-mix(in_srgb,var(--amber)_14%,transparent)] text-amber'}`}>
          <b>{cek.risiko === 'TINGGI' ? 'Lowongan ini akan ditahan untuk ditinjau moderator:' : 'Perhatian:'}</b>
          <ul className="mt-1 list-disc pl-4">{cek.temuan.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {galat && <p role="alert" className="mt-3 text-sm text-rose">{galat}</p>}
      <button className="btn-primary mt-4 min-h-11 rounded-xl px-4 font-semibold">Pasang lowongan</button>
    </form>
  )
}

const LABEL_LOWONGAN: Record<Lowongan['status'], [string, 'green' | 'amber' | 'red' | 'slate']> = {
  AKTIF: ['Tayang', 'green'], DITINJAU: ['Ditinjau moderator', 'amber'], DISEMBUNYIKAN: ['Disembunyikan (laporan)', 'red'], DITUTUP: ['Ditutup', 'slate'], DITOLAK: ['Ditolak moderator', 'red'],
}

function Aktivitas({ aku, data, segarkan }: { aku: Orang; data: { lowongan: Lowongan[]; lamaran: Lamaran[] }; segarkan: () => Promise<void> }) {
  const milik = data.lowongan.filter((l) => l.pemasang.sub === aku.sub)
  const judul = new Map(data.lowongan.map((l) => [l.id, l.judul]))
  return (
    <>
      <Section title="Lamaran saya">
        <ul className="glass divide-y divide-line">
          {data.lamaran.length === 0 && <li className="px-4 py-3.5 text-sm text-mid">Belum ada lamaran.</li>}
          {data.lamaran.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm">
              <span>{judul.get(x.lowonganId) ?? 'Lowongan tidak tayang lagi'}</span>
              <Badge tone={x.status === 'DITERIMA' ? 'green' : x.status === 'DITOLAK' ? 'slate' : 'blue'}>{LABEL_STATUS[x.status]}</Badge>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Lowongan yang saya pasang">
        {milik.length === 0 && <p className="glass p-4 text-sm text-mid">Belum ada lowongan.</p>}
        <ul className="grid gap-3">{milik.map((l) => <LowonganSaya key={l.id} l={l} segarkan={segarkan} />)}</ul>
      </Section>
    </>
  )
}

function LowonganSaya({ l, segarkan }: { l: Lowongan; segarkan: () => Promise<void> }) {
  const [pelamar, setPelamar] = useState<Lamaran[] | null>(null)
  const [lbl, tone] = LABEL_LOWONGAN[l.status]
  const lihat = async () => setPelamar((await sumber.karier.pelamar(l.id)).data)
  const ubah = async (id: string, s: StatusLamaran) => (await sumber.karier.ubahStatus(id, s), await lihat())
  return (
    <li className="glass p-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="font-semibold">{l.judul}</div><div className="text-xs text-low">{l.perusahaan} · {l.pelapor.length} laporan</div></div>
        <Badge tone={tone}>{lbl}</Badge>
      </div>
      {l.temuan.length > 0 && <p className="mt-2 text-xs text-amber">{l.temuan.join(' ')}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={lihat} className="min-h-10 rounded-xl bg-glass-strong px-3 text-xs font-semibold">Lihat pelamar</button>
        {l.status !== 'DITUTUP' && <button onClick={async () => (await sumber.karier.tutup(l.id), await segarkan())} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-rose">Tutup lowongan</button>}
      </div>
      {pelamar && (
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {pelamar.length === 0 && <li className="py-3 text-sm text-mid">Belum ada pelamar.</li>}
          {pelamar.map((x) => (
            <li key={x.id} className="py-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{x.pelamar.nama} <span className="font-normal text-low">· {LABEL_ROLE[x.pelamar.role]}{x.pelamar.prodi ? ` · ${x.pelamar.prodi}` : ''}</span></span>
                <Badge tone={x.skor >= 70 ? 'green' : 'blue'}>{x.skor}% cocok</Badge>
              </div>
              <p className="mt-1 text-xs text-mid">Keahlian: {x.profil.keahlian.join(', ')}{x.pesan ? ` · “${x.pesan}”` : ''}</p>
              <label className="mt-2 block text-xs">Status
                <select aria-label={`Status lamaran ${x.pelamar.nama}`} value={x.status} onChange={(e) => ubah(x.id, e.target.value as StatusLamaran)} className={input}>
                  {(Object.keys(LABEL_STATUS) as StatusLamaran[]).map((k) => <option key={k} value={k}>{LABEL_STATUS[k]}</option>)}
                </select>
              </label>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function Moderasi({ lowongan, segarkan }: { lowongan: Lowongan[]; segarkan: () => Promise<void> }) {
  const putus = async (id: string, setuju: boolean) => (await sumber.karier.moderasi(id, setuju), await segarkan())
  return (
    <Section title="Antrean tinjau">
      {lowongan.length === 0 && <p className="glass p-4 text-sm text-mid">Tidak ada lowongan yang perlu ditinjau.</p>}
      <ul className="grid gap-3">
        {lowongan.map((l) => (
          <li key={l.id} className="glass p-4 text-sm">
            <div className="flex items-start justify-between gap-3"><b>{l.judul}</b><Badge tone={LABEL_LOWONGAN[l.status][1]}>{LABEL_LOWONGAN[l.status][0]}</Badge></div>
            <div className="mt-1"><Pemasang o={l.pemasang} /></div>
            <p className="mt-2 text-mid">{l.deskripsi}</p>
            <ul className="mt-2 list-disc pl-4 text-xs text-rose">{l.temuan.map((t) => <li key={t}>{t}</li>)}{l.pelapor.length > 0 && <li>{l.pelapor.length} laporan pengguna</li>}</ul>
            <div className="mt-3 flex gap-2">
              <button onClick={() => putus(l.id, true)} className="btn-primary min-h-10 rounded-xl px-3 text-xs font-semibold">Setujui tayang</button>
              <button onClick={() => putus(l.id, false)} className="min-h-10 rounded-xl bg-glass-strong px-3 text-xs font-semibold text-rose">Tolak</button>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
