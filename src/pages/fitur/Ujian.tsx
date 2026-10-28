import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { AlertTriangle, Armchair, CalendarClock, CalendarPlus, CheckCircle2, Clock, MapPin, Paperclip, Printer, ScrollText, Share2, UserRound, XCircle } from 'lucide-react'
import { aturanUjian, aturanUntuk } from '../../lib/akademik/aturan'
import { buatIcs } from '../../lib/akademik/ics-ujian'
import { ringkasKelayakan } from '../../lib/akademik/kelayakan'
import { batasPengajuan, susunTampilanUjian, validasiLampiran, type BarisUjian, type TampilanUjian } from '../../lib/akademik/tampilan-ujian'
import { JENIS_UJIAN_SEMESTER, type JadwalUjianSemester, type JenisUjianSemester, type PengajuanUjian, type SesiUjian } from '../../lib/akademik/types'
import { statusSumber, sumber } from '../../lib/sumber'
import { useResource } from '../../lib/useResource'
import type { User } from '../../lib/types'
import { Badge, LinkBtn, PageHeader, Section, Skeleton, Tabs } from '../../components/ui'

// #43 Exam Center v2 (T02): UTS, UAS, susulan, remedial. Data lewat src/lib/sumber/ujian.ts, aturan dari
// src/data/aturan-akademik.ts, logika di src/lib/akademik. Kartu & QR hanya untuk mata kuliah yang layak.

const zona = { timeZone: 'Asia/Jakarta' } as const
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...zona }).format(new Date(iso))
const jam = (iso: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', ...zona }).format(new Date(iso))
const rentang = (s: { mulai: string; selesai: string }) => `${jam(s.mulai)}–${jam(s.selesai)}`
const waktu = (d: Date) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', ...zona }).format(d)
const LABEL_TAB: Record<JenisUjianSemester, string> = { UTS: 'UTS', UAS: 'UAS', SUSULAN: 'Susulan', REMEDIAL: 'Remedial' }

export function Ujian({ user, back, go }: { user: User; back: () => void; go: (r: string) => void }) {
  const [jenis, setJenis] = useState<JenisUjianSemester>('UTS')
  const muatJadwal = useCallback(() => sumber.ujian.jadwal(jenis), [jenis])
  const jadwal = useResource(muatJadwal)
  const kelayakan = useResource(sumber.ujian.kelayakan)
  const aturan = useMemo(() => aturanUjian(aturanUntuk(user.prodi), jenis), [user.prodi, jenis])
  const st = statusSumber(jadwal, 'MY UNPAM')
  const data = jadwal.data?.data.jenis === jenis ? jadwal.data.data : undefined
  const view = useMemo(() => (data && kelayakan.data ? susunTampilanUjian(data, kelayakan.data.data, aturan) : null), [data, kelayakan.data, aturan])

  return (
    <div>
      <PageHeader title="Exam Center" subtitle={data ? `${aturan.nama} · ${data.semester}` : aturan.nama} onBack={back} />
      <div className="mb-3 flex flex-wrap items-center gap-2" role="status">
        <Badge tone={st.tone}>{st.teks}</Badge>
        {aturan.sumber === null && <Badge tone="amber">Aturan ujian: contoh</Badge>}
      </div>
      <Tabs value={jenis} onChange={setJenis} options={JENIS_UJIAN_SEMESTER.map((j) => [j, LABEL_TAB[j]])} />

      {(jadwal.error || kelayakan.error) && (
        <div className="glass flex items-center justify-between gap-3 p-4 text-sm">
          <span className="text-mid">{(jadwal.error ?? kelayakan.error)!.message}</span>
          <LinkBtn onClick={() => (jadwal.reload(), kelayakan.reload())}>Coba lagi</LinkBtn>
        </div>
      )}
      {!view && !jadwal.error && !kelayakan.error && <Skeleton rows={3} />}
      {view && data && <JadwalView view={view} jadwal={data} user={user} go={go} namaJenis={aturan.nama} />}

      {(jenis === 'SUSULAN' || jenis === 'REMEDIAL') && <Pengajuan jenis={jenis} prodi={user.prodi} />}

      {aturan.tataTertib.length > 0 && (
        <Section title="Tata tertib">
          <ul className="glass space-y-2 p-4 text-sm">
            {aturan.tataTertib.map((r) => (
              <li key={r} className="flex gap-2"><ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden /> {r}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

/* ---------------- Jadwal + kartu ---------------- */

function JadwalView({ view, jadwal, user, go, namaJenis }: { view: TampilanUjian; jadwal: JadwalUjianSemester; user: User; go: (r: string) => void; namaJenis: string }) {
  if (view.kosong) return <p className="glass p-4 text-sm text-mid">Belum ada jadwal {namaJenis} untuk Anda pada semester {jadwal.semester}.</p>
  return (
    <>
      {view.adaKartu ? (
        <Kartu view={view} jadwal={jadwal} user={user} namaJenis={namaJenis} />
      ) : (
        <div className="glass flex gap-3 p-4 text-sm" role="note">
          <XCircle className="h-5 w-5 shrink-0 text-rose" aria-hidden />
          <p>Kartu ujian belum dapat dibuat karena belum ada mata kuliah yang memenuhi syarat. Lihat alasannya di bawah.</p>
        </div>
      )}

      {view.bentrok.length > 0 && (
        <div className="glass mt-4 flex gap-3 p-4 text-sm" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose" aria-hidden />
          <div>
            <p className="font-semibold">Jadwal bentrok</p>
            <ul className="mt-1 space-y-0.5 text-mid">
              {view.bentrok.map((b) => (
                <li key={`${b.a.id}-${b.b.id}`}>{b.a.nama} ({tgl(b.a.mulai)}, {rentang(b.a)}) dan {b.b.nama} ({rentang(b.b)}). Hubungi BAAK/prodi untuk penjadwalan ulang.</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {view.beruntun.length > 0 && (
        <div className="glass mt-3 flex gap-3 p-4 text-sm" role="note">
          <Clock className="h-5 w-5 shrink-0 text-amber" aria-hidden />
          <ul className="space-y-0.5 text-mid">
            {view.beruntun.map((b) => (
              <li key={`${b.sebelum.id}-${b.sesudah.id}`}>Jeda hanya {Math.round(b.jedaMenit)} menit antara {b.sebelum.nama} dan {b.sesudah.nama}. Siapkan diri lebih awal.</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Jadwal ujian">
        <ul className="space-y-3">
          {view.baris.map((b) => <BarisView key={b.sesi.id} b={b} go={go} />)}
        </ul>
      </Section>
    </>
  )
}

function BarisView({ b, go }: { b: BarisUjian; go: (r: string) => void }) {
  const { sesi: s, kelayakan: k } = b
  return (
    <li className="glass p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{s.nama}</div>
          <div className="text-xs text-low">{s.kode}</div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {b.berubah && <Badge tone="blue">Berubah</Badge>}
          {k.layak ? (
            <Badge tone="green"><CheckCircle2 className="h-3 w-3" aria-hidden /> Boleh ikut</Badge>
          ) : (
            <Badge tone="amber"><AlertTriangle className="h-3 w-3" aria-hidden /> Belum memenuhi syarat</Badge>
          )}
        </div>
      </div>
      <p className="sr-only">{ringkasKelayakan(k)}</p>
      <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-mid sm:grid-cols-3">
        <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4 shrink-0 text-cyan" aria-hidden /> {tgl(s.mulai)}, {rentang(s)}</span>
        <span className="flex items-center gap-1"><MapPin className="h-4 w-4 shrink-0 text-rose" aria-hidden /> {s.ruang}</span>
        {s.kursi && <span className="flex items-center gap-1"><Armchair className="h-4 w-4 shrink-0 text-amber" aria-hidden /> Kursi {s.kursi}</span>}
      </div>
      {s.petugas.length > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-low"><UserRound className="h-3.5 w-3.5" aria-hidden /> Pengawas: {s.petugas.join(', ')}</div>}
      {b.berubah && s.sebelumnya && (
        <p className="mt-2 rounded-xl bg-glass-strong px-3 py-2 text-xs">
          Jadwal berubah. Sebelumnya: <s>{tgl(s.sebelumnya.mulai)}, {rentang(s.sebelumnya)}, {s.sebelumnya.ruang}</s>
        </p>
      )}
      {k.syarat.filter((x) => !x.terpenuhi).map((x) => (
        <div key={x.id} className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-glass-strong px-3 py-2 text-xs">
          <span><strong>{x.label}:</strong> {x.alasan}{x.contoh && ' (ambang contoh)'}</span>
          {x.tautanPerbaikan && <LinkBtn onClick={() => go(x.tautanPerbaikan!)}>Selesaikan</LinkBtn>}
        </div>
      ))}
    </li>
  )
}

function Kartu({ view, jadwal, user, namaJenis }: { view: TampilanUjian; jadwal: JadwalUjianSemester; user: User; namaJenis: string }) {
  const [qr, setQr] = useState('')
  const [printedAt, setPrintedAt] = useState(() => new Date())
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    // QR hanya memuat ID kartu, tanpa NIM/nama. TODO(BFF): verifikasi ID kartu + tanda tangan di server.
    QRCode.toDataURL(`SUPERUNPAM:UJIAN:${jadwal.kartuId}`, { margin: 1, width: 320, color: { dark: '#000000', light: '#ffffff' } }).then(setQr)
  }, [jadwal.kartuId])

  // Waktu cetak diperbarui tepat sebelum dialog cetak (termasuk Ctrl+P dari menu browser).
  useEffect(() => {
    const on = () => setPrintedAt(new Date())
    window.addEventListener('beforeprint', on)
    document.documentElement.classList.add('has-print-doc')
    return () => {
      window.removeEventListener('beforeprint', on)
      document.documentElement.classList.remove('has-print-doc')
    }
  }, [])

  const unduh = (blob: Blob, nama: string) => {
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: nama }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const print = () => {
    setPrintedAt(new Date())
    requestAnimationFrame(() => window.print())
  }
  const share = async () => {
    setPesan('')
    try {
      const blob = await renderCardImage({ user, view, jadwal, qr, namaJenis, printedAt: new Date() })
      const file = new File([blob], `kartu-${jadwal.jenis.toLowerCase()}-${jadwal.kartuId}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Kartu ${namaJenis}` })
      else (unduh(blob, file.name), setPesan('Gambar kartu diunduh.'))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setPesan('Gagal membuat gambar kartu.')
    }
  }
  const kalender = () => {
    unduh(new Blob([buatIcs(view.layak, () => namaJenis)], { type: 'text/calendar' }), `ujian-${jadwal.jenis.toLowerCase()}.ics`)
    setPesan('Jadwal ujian diunduh sebagai .ics (pengingat H-1 dan 2 jam sebelumnya).')
  }

  return (
    <>
      <div className="glass flex flex-col items-center gap-4 p-5 sm:flex-row">
        {qr && <img src={qr} alt="QR kartu ujian" width={144} height={144} className="h-36 w-36 rounded-xl bg-white p-1.5" />}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="text-xs uppercase tracking-[0.16em] text-mid">Kartu {namaJenis}</div>
          <div className="font-display text-lg font-bold">{user.name}</div>
          <div className="font-mono text-sm text-mid">{user.nim}</div>
          <div className="mt-1 text-xs text-low">Berlaku untuk {view.layak.length} dari {view.baris.length} mata kuliah. QR hanya berisi nomor kartu.</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button onClick={print} className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold">
              <Printer className="h-4 w-4" aria-hidden /> Cetak / Simpan PDF
            </button>
            <button onClick={share} disabled={!qr} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
              <Share2 className="h-4 w-4" aria-hidden /> Bagikan sebagai gambar
            </button>
            <button onClick={kalender} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
              <CalendarPlus className="h-4 w-4" aria-hidden /> Tambah ke kalender
            </button>
          </div>
          <p className="mt-2 text-xs text-low" role="status" aria-live="polite">{pesan}</p>
        </div>
      </div>
      {createPortal(<KartuCetak user={user} view={view} jadwal={jadwal} qr={qr} printedAt={printedAt} namaJenis={namaJenis} />, document.body)}
    </>
  )
}

/** Versi cetak (lihat .print-doc di index.css): terang, kontras tinggi, A5. */
function KartuCetak({ user, view, jadwal, qr, printedAt, namaJenis }: { user: User; view: TampilanUjian; jadwal: JadwalUjianSemester; qr: string; printedAt: Date; namaJenis: string }) {
  return (
    <div className="print-doc" aria-hidden>
      {/* div, bukan <header>: aturan cetak global menyembunyikan header aplikasi */}
      <div className="pd-head">
        <img src="/brand/unpam-logo-256.webp" alt="" width={56} height={56} />
        <div>
          <div className="pd-title">Kartu Ujian {namaJenis}</div>
          <div>Universitas Pamulang · Semester {jadwal.semester}</div>
        </div>
      </div>
      <section className="pd-id">
        <dl>
          <dt>Nama</dt><dd>{user.name}</dd>
          <dt>NIM</dt><dd>{user.nim}</dd>
          <dt>Program studi</dt><dd>{user.prodi}</dd>
          <dt>No. kartu</dt><dd>{jadwal.kartuId}</dd>
        </dl>
        {qr && <img className="pd-qr" src={qr} alt="" width={112} height={112} />}
      </section>
      <table className="pd-table">
        <thead>
          <tr><th>Mata kuliah</th><th>Tanggal &amp; jam</th><th>Ruang</th><th>Kursi</th><th>Syarat</th></tr>
        </thead>
        <tbody>
          {view.baris.map(({ sesi: s, kelayakan: k }) => (
            <tr key={s.id}>
              <td>{s.nama}<br /><small>{s.kode}</small></td>
              <td>{tgl(s.mulai)}<br />{rentang(s)}</td>
              <td>{s.ruang}</td>
              <td>{s.kursi ?? '—'}</td>
              <td>{k.layak ? <span><CheckCircle2 className="pd-ic" /> Memenuhi</span> : k.syarat.filter((x) => !x.terpenuhi).map((x) => <span key={x.id}>✗ {x.label}: {x.alasan}<br /></span>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pd-foot">
        <span>Dicetak {waktu(printedAt)} dari Super UNPAM · Data contoh</span>
        <span>Kartu hanya berlaku untuk mata kuliah bertanda "Memenuhi". Keaslian diverifikasi pengawas dengan memindai QR.</span>
      </div>
    </div>
  )
}

/** Fallback untuk WebView tanpa dukungan cetak: gambar kartu PNG lewat canvas. */
async function renderCardImage({ user, view, jadwal, qr, namaJenis, printedAt }: { user: User; view: TampilanUjian; jadwal: JadwalUjianSemester; qr: string; namaJenis: string; printedAt: Date }): Promise<Blob> {
  const W = 1080
  const rowH = 132
  const H = 520 + view.baris.length * rowH + 120
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#0b1222'
  g.font = 'bold 44px system-ui, sans-serif'
  g.fillText(`Kartu Ujian ${namaJenis}`, 60, 90)
  g.font = '28px system-ui, sans-serif'
  g.fillText(`Universitas Pamulang · ${jadwal.semester}`, 60, 136)
  ;[`Nama: ${user.name}`, `NIM: ${user.nim}`, `Prodi: ${user.prodi}`, `No. kartu: ${jadwal.kartuId}`].forEach((l, i) => g.fillText(l, 60, 220 + i * 46))
  if (qr) {
    const img = new Image()
    img.src = qr
    await img.decode()
    g.drawImage(img, W - 340, 170, 280, 280)
  }
  view.baris.forEach(({ sesi: s, kelayakan: k }, i) => {
    const y = 520 + i * rowH
    g.fillStyle = '#e5e7eb'
    g.fillRect(60, y - 44, W - 120, 2)
    g.fillStyle = '#0b1222'
    g.font = 'bold 30px system-ui, sans-serif'
    g.fillText(s.nama, 60, y)
    g.font = '26px system-ui, sans-serif'
    g.fillText(`${tgl(s.mulai)} ${rentang(s)} · ${s.ruang}${s.kursi ? ` · Kursi ${s.kursi}` : ''}`, 60, y + 38)
    g.fillStyle = k.layak ? '#047857' : '#b91c1c'
    g.fillText(k.layak ? 'Memenuhi syarat' : `Belum memenuhi: ${k.syarat.filter((x) => !x.terpenuhi).map((x) => x.label).join(', ')}`, 60, y + 74)
  })
  g.fillStyle = '#4a5775'
  g.font = '22px system-ui, sans-serif'
  g.fillText(`Dibuat ${waktu(printedAt)} dari Super UNPAM · Data contoh`, 60, H - 50)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png'))
}

/* ---------------- Pengajuan susulan / remedial ---------------- */

const STATUS_AJU: PengajuanUjian['status'][] = ['DIAJUKAN', 'DIVERIFIKASI', 'DISETUJUI']
const LABEL_AJU: Record<PengajuanUjian['status'], string> = { DIAJUKAN: 'Diajukan', DIVERIFIKASI: 'Diverifikasi', DISETUJUI: 'Disetujui', DITOLAK: 'Ditolak' }

function Pengajuan({ jenis, prodi }: { jenis: 'SUSULAN' | 'REMEDIAL'; prodi: string }) {
  const daftar = useResource(sumber.ujian.pengajuan)
  const uts = useResource(useCallback(() => sumber.ujian.jadwal('UTS'), []))
  const uas = useResource(useCallback(() => sumber.ujian.jadwal('UAS'), []))
  const aturan = useMemo(() => aturanUjian(aturanUntuk(prodi), jenis), [prodi, jenis])
  const [baru, setBaru] = useState<PengajuanUjian[]>([])
  const semua = [...baru, ...(daftar.data?.data ?? [])].filter((p) => p.jenis === jenis)
  const sesiAsal: SesiUjian[] = [...(uts.data?.data.sesi ?? []), ...(uas.data?.data.sesi ?? [])]

  return (
    <>
      <Section title={`Pengajuan ${aturan.nama.toLowerCase()}`}>
        {semua.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">Belum ada pengajuan.</p>
        ) : (
          <ul className="space-y-3">
            {semua.map((p) => (
              <li key={p.id} className="glass p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{p.namaMK}</div>
                    <div className="text-xs text-low">Diajukan {tgl(p.diajukan)} · {p.lampiran.length} lampiran</div>
                  </div>
                  <Badge tone={p.status === 'DITOLAK' ? 'red' : p.status === 'DISETUJUI' ? 'green' : 'blue'}>{LABEL_AJU[p.status]}</Badge>
                </div>
                <ol className="mt-3 flex gap-1" aria-label={`Status: ${LABEL_AJU[p.status]}`}>
                  {STATUS_AJU.map((s, i) => {
                    const capai = p.status !== 'DITOLAK' ? STATUS_AJU.indexOf(p.status) >= i : i === 0
                    return (
                      <li key={s} className="flex-1">
                        <div className={`h-1.5 rounded-full ${capai ? 'bg-cyan' : 'bg-glass-strong'}`} />
                        <div className={`mt-1 text-[11px] ${capai ? 'font-semibold text-hi' : 'text-low'}`}>{LABEL_AJU[s]}</div>
                      </li>
                    )
                  })}
                </ol>
                {p.catatan && <p className="mt-2 text-xs text-mid">Catatan: {p.catatan}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <FormPengajuan jenis={jenis} sesi={sesiAsal} aturan={aturan} onSent={(p) => setBaru((b) => [p, ...b])} />
    </>
  )
}

function FormPengajuan({ jenis, sesi, aturan, onSent }: { jenis: 'SUSULAN' | 'REMEDIAL'; sesi: SesiUjian[]; aturan: ReturnType<typeof aturanUjian>; onSent: (p: PengajuanUjian) => void }) {
  const [sesiId, setSesiId] = useState('')
  const [alasan, setAlasan] = useState('')
  const [berkas, setBerkas] = useState<File[]>([])
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState(false)
  const pilih = sesi.find((s) => s.id === sesiId)
  const batas = pilih ? batasPengajuan(pilih, aturan) : null
  const lewat = batas ? batas.getTime() < Date.now() : false
  const galat = validasiLampiran(berkas, aturan)
  const bisa = !!pilih && !lewat && alasan.trim().length >= 10 && galat.length === 0 && !proses

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    if (!pilih || !bisa) return
    setProses(true)
    setPesan('')
    try {
      const r = await sumber.ujian.ajukan({ jenis, kodeMK: pilih.kode, namaMK: pilih.nama, alasan: alasan.trim(), lampiran: berkas.map((f) => ({ nama: f.name, ukuran: f.size, tipe: f.type })) })
      onSent(r.data)
      setSesiId('')
      setAlasan('')
      setBerkas([])
      setPesan(r.asal === 'contoh' ? 'Pengajuan contoh tersimpan di layar ini saja; tidak ada yang dikirim.' : 'Pengajuan terkirim.')
    } catch (x) {
      setPesan((x as Error).message)
    } finally {
      setProses(false)
    }
  }

  const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
  return (
    <Section title={`Ajukan ${aturan.nama.toLowerCase()}`}>
      <form onSubmit={kirim} className="glass space-y-4 p-4">
        <label className="block text-sm font-semibold">
          Mata kuliah
          <select value={sesiId} onChange={(e) => setSesiId(e.target.value)} required className={input}>
            <option value="">Pilih ujian…</option>
            {sesi.map((s) => <option key={s.id} value={s.id}>{s.jenis} · {s.nama} ({tgl(s.mulai)})</option>)}
          </select>
        </label>
        {batas && <p className={`text-xs ${lewat ? 'font-semibold text-rose' : 'text-mid'}`}>Batas pengajuan: {waktu(batas)}{lewat && ' (sudah lewat)'}{aturan.sumber === null && ' · ketentuan contoh'}</p>}
        <label className="block text-sm font-semibold">
          Alasan
          <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} minLength={10} maxLength={1000} required className={`${input} min-h-24 py-2`} />
        </label>
        {aturan.lampiran && (
          <div className="text-sm">
            <label className="font-semibold">
              Lampiran bukti (opsional)
              <input type="file" multiple accept={aturan.lampiran.tipe.join(',')} onChange={(e) => setBerkas([...(e.target.files ?? [])])} className="mt-1.5 block w-full text-xs file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-glass-strong file:px-3 file:font-semibold" />
            </label>
            <p className="mt-1 text-xs text-low">PDF/JPG/PNG, maks {aturan.lampiran.maksMB} MB per berkas.</p>
            {berkas.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {berkas.map((f) => {
                  const g = galat.find((x) => x.nama === f.name)
                  return <li key={f.name} className={g ? 'text-rose' : 'text-mid'}><Paperclip className="mr-1 inline h-3.5 w-3.5" aria-hidden />{f.name}{g && ` — ${g.alasan}`}</li>
                })}
              </ul>
            )}
            <p className="mt-2 text-xs text-amber" role="note">Berkas bukti belum diunggah ke server: layanan penyimpanan kampus (DrivePAM) belum tersedia. Siapkan berkas aslinya bila diminta BAAK.</p>
          </div>
        )}
        <p role="status" aria-live="polite" className="min-h-5 text-sm text-mid">{pesan}</p>
        <button disabled={!bisa} className="btn-primary min-h-12 w-full rounded-2xl font-semibold">{proses ? 'Mengirim…' : 'Kirim pengajuan'}</button>
      </form>
    </Section>
  )
}
