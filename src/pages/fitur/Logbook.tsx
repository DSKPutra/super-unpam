import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CalendarPlus, CheckCircle2, Clock, FileUp, Hourglass, Printer, XCircle } from 'lucide-react'
import type { AturanProdi } from '../../data/aturan-akademik'
import { buatIcsTenggat } from '../../lib/akademik/ics-ujian'
import { cekJedaBimbingan, mulaiBimbingan, sha256Hex, targetBimbingan, validasiBerkasDraf, validasiEntri } from '../../lib/akademik/logbook'
import type { Bimbingan, Dosen, Logbook, TugasAkhir } from '../../lib/akademik/types'
import { cetak } from '../../lib/cetak'
import { bacaBerkas } from '../../lib/berkas'
import { sumber } from '../../lib/sumber'
import { useResource } from '../../lib/useResource'
import type { User } from '../../lib/types'
import { Badge, LinkBtn, Progress, Section, Skeleton } from '../../components/ui'

// T04 Logbook bimbingan dan versi draf. Catatan bimbingan hanya untuk mahasiswa, pembimbing, dan prodi
// yang berwenang — TODO(BFF-AUTHZ): ditegakkan server. Berkas draf belum diunggah (DrivePAM): yang
// disimpan adalah metadata + hash SHA-256 yang dihitung di perangkat.

const zona = { timeZone: 'Asia/Jakarta' } as const
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...zona }).format(new Date(iso))
const ukuran = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
/** Tanggal dari input type=date dibaca sebagai pukul 09.00 WIB. */
const dariInputTanggal = (d: string) => (d ? new Date(`${d}T09:00:00+07:00`).toISOString() : '')
const hariIniWib = () => new Intl.DateTimeFormat('en-CA', zona).format(new Date())

const STATUS: Record<Bimbingan['status'], { teks: string; tone: 'blue' | 'green' | 'red'; Icon: typeof Clock }> = {
  MENUNGGU: { teks: 'Menunggu verifikasi', tone: 'blue', Icon: Hourglass },
  DISETUJUI: { teks: 'Disetujui', tone: 'green', Icon: CheckCircle2 },
  DITOLAK: { teks: 'Ditolak', tone: 'red', Icon: XCircle },
}


function unduh(isi: BlobPart, nama: string, tipe: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }))
  Object.assign(document.createElement('a'), { href: url, download: nama }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ================= Mahasiswa ================= */

export function LogbookMahasiswa({ ta, user, aturan, dosen, go }: { ta: TugasAkhir; user: User; aturan: AturanProdi; dosen: Dosen[]; go: (r: string) => void }) {
  const muat = useCallback(() => sumber.ta.logbook(ta.id), [ta.id])
  const res = useResource(muat)
  const [lb, setLb] = useState<Logbook | null>(null)
  const [pesan, setPesan] = useState('')
  useEffect(() => setLb(res.data?.data ?? null), [res.data])

  if (res.error) return <p className="glass p-4 text-sm text-mid">{res.error.message} <LinkBtn onClick={res.reload}>Coba lagi</LinkBtn></p>
  if (!lb) return <Skeleton rows={2} />

  const target = targetBimbingan(lb.entri, ta.status, aturan)
  const jeda = cekJedaBimbingan(lb.entri, mulaiBimbingan(ta), aturan.jedaBimbinganHari)
  const tenggat = lb.entri.filter((e) => e.tugasBerikutnya?.tenggat && Date.parse(e.tugasBerikutnya.tenggat) > Date.now())
  const simpan = (r: { data: Logbook; asal: string }, ok: string) => (setLb(r.data), setPesan(r.asal === 'contoh' ? `${ok} (data contoh, tersimpan di perangkat ini).` : ok))

  return (
    <>
      <Section title="Logbook bimbingan">
        {target && (
          <div className="glass p-4" role="status">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span><strong>{target.sah} dari {target.minimal}</strong> bimbingan disetujui untuk {target.namaUjian}</span>
              {target.terpenuhi ? <Badge tone="green">Cukup</Badge> : <Badge tone="amber">Belum cukup</Badge>}
            </div>
            <div className="mt-2"><Progress value={Math.min(100, (target.sah / target.minimal) * 100)} /></div>
            <p className="mt-1 text-xs text-low">Hanya entri yang disetujui pembimbing yang dihitung{target.contoh && '; jumlah minimal masih contoh'}.</p>
          </div>
        )}
        {jeda?.perlu && (
          <div className="glass mt-3 flex items-center gap-3 p-4 text-sm" role="note">
            <Clock className="h-5 w-5 shrink-0 text-amber" aria-hidden />
            <p className="flex-1">Sudah {jeda.hari} hari sejak bimbingan terakhir. Bila sedang ada kendala, tidak apa-apa; jadwalkan bimbingan saat siap.</p>
            <LinkBtn onClick={() => go('booking/dosen')}>Jadwalkan</LinkBtn>
          </div>
        )}
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-sm text-mid">{pesan}</p>
        <FormEntri ta={ta} lb={lb} onSimpan={(r) => simpan(r, 'Entri bimbingan dicatat dan menunggu verifikasi dosen')} />
        {lb.entri.length === 0 ? (
          <p className="glass mt-3 p-4 text-sm text-mid">Belum ada catatan bimbingan.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {[...lb.entri].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map((e) => <EntriView key={e.id} e={e} />)}
          </ol>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={tenggat.length === 0}
            onClick={() => (unduh(buatIcsTenggat(tenggat.map((e) => ({ id: `bimbingan:${e.id}`, jenis: 'tugas', judul: `Tugas bimbingan: ${e.tugasBerikutnya!.teks}`, waktu: e.tugasBerikutnya!.tenggat! }))), 'tenggat-bimbingan.ics', 'text/calendar'), setPesan('Tenggat tugas bimbingan diunduh sebagai .ics.'))}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden /> Tenggat ke kalender
          </button>
          <KartuBimbingan ta={ta} user={user} lb={lb} dosen={dosen} />
        </div>
      </Section>
      <VersiDrafView ta={ta} lb={lb} aturan={aturan} onSimpan={(r) => simpan(r, 'Versi draf baru dicatat')} onGalat={setPesan} />
    </>
  )
}

function EntriView({ e }: { e: Bimbingan }) {
  const st = STATUS[e.status]
  return (
    <li className="glass p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{e.bagian}</div>
          <div className="text-xs text-low">{tgl(e.tanggal)}{e.versiDraf ? ` · draf v${e.versiDraf}` : ''}</div>
        </div>
        <Badge tone={st.tone}><st.Icon className="h-3 w-3" aria-hidden /> {st.teks}</Badge>
      </div>
      <p className="mt-2 text-sm">{e.ringkasan}</p>
      {e.tugasBerikutnya && <p className="mt-1 text-xs text-mid">Tugas berikutnya: {e.tugasBerikutnya.teks}{e.tugasBerikutnya.tenggat ? ` · tenggat ${tgl(e.tugasBerikutnya.tenggat)}` : ''}</p>}
      {e.catatanDosen && <p className="mt-1 text-xs text-mid">Catatan dosen: {e.catatanDosen}</p>}
    </li>
  )
}

function FormEntri({ ta, lb, onSimpan }: { ta: TugasAkhir; lb: Logbook; onSimpan: (r: { data: Logbook; asal: string }) => void }) {
  const [buka, setBuka] = useState(false)
  const [tanggal, setTanggal] = useState('')
  const [bagian, setBagian] = useState('')
  const [ringkasan, setRingkasan] = useState('')
  const [tugas, setTugas] = useState('')
  const [tenggat, setTenggat] = useState('')
  const [versi, setVersi] = useState('')
  const [galat, setGalat] = useState<Record<string, string>>({})
  const [proses, setProses] = useState(false)

  const kirim = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = { tanggal: dariInputTanggal(tanggal), bagian, ringkasan, tugasBerikutnya: tugas.trim() ? { teks: tugas.trim(), tenggat: dariInputTanggal(tenggat) || undefined } : undefined, versiDraf: versi ? Number(versi) : undefined }
    const g = validasiEntri(e)
    setGalat(g)
    if (Object.keys(g).length) return
    setProses(true)
    try {
      onSimpan(await sumber.ta.tambahEntri(ta.id, e))
      setBuka(false)
      setTanggal('')
      setBagian('')
      setRingkasan('')
      setTugas('')
      setTenggat('')
      setVersi('')
    } catch (x) {
      setGalat({ ringkasan: (x as Error).message })
    } finally {
      setProses(false)
    }
  }

  if (!buka) return <button onClick={() => setBuka(true)} className="glass glass-hover min-h-12 w-full text-sm font-semibold">Catat bimbingan</button>
  const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
  const err = (k: string) => (galat[k] ? <p className="mt-1 text-xs font-semibold text-rose">{galat[k]}</p> : null)
  return (
    <form onSubmit={kirim} noValidate className="glass space-y-3 p-4">
      <label className="block text-sm font-semibold">Tanggal bimbingan<input type="date" max={hariIniWib()} value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={input} /></label>
      {err('tanggal')}
      <label className="block text-sm font-semibold">Bab/bagian yang dibahas<input value={bagian} onChange={(e) => setBagian(e.target.value)} className={input} /></label>
      {err('bagian')}
      <label className="block text-sm font-semibold">Ringkasan arahan dosen<textarea value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} className={`${input} min-h-24 py-2`} /></label>
      {err('ringkasan')}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Tugas berikutnya (opsional)<input value={tugas} onChange={(e) => setTugas(e.target.value)} className={input} /></label>
        <label className="block text-sm font-semibold">Tenggat tugas<input type="date" value={tenggat} onChange={(e) => setTenggat(e.target.value)} disabled={!tugas.trim()} className={input} /></label>
      </div>
      {err('tenggat')}
      {lb.versi.length > 0 && (
        <label className="block text-sm font-semibold">
          Draf yang dibahas
          <select value={versi} onChange={(e) => setVersi(e.target.value)} className={input}>
            <option value="">—</option>
            {[...lb.versi].reverse().map((v) => <option key={v.versi} value={v.versi}>v{v.versi} · {v.nama}</option>)}
          </select>
        </label>
      )}
      <p className="text-xs text-low">Entri baru sah setelah diverifikasi pembimbing.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setBuka(false)} className="min-h-11 flex-1 rounded-xl bg-glass-strong text-sm font-semibold">Batal</button>
        <button disabled={proses} className="btn-primary min-h-11 flex-1 rounded-xl text-sm font-semibold">{proses ? 'Menyimpan…' : 'Simpan entri'}</button>
      </div>
    </form>
  )
}

function VersiDrafView({ ta, lb, aturan, onSimpan, onGalat }: { ta: TugasAkhir; lb: Logbook; aturan: AturanProdi; onSimpan: (r: { data: Logbook; asal: string }) => void; onGalat: (m: string) => void }) {
  const [berkas, setBerkas] = useState<File | null>(null)
  const [catatan, setCatatan] = useState('')
  const [proses, setProses] = useState(false)
  const galat = berkas ? validasiBerkasDraf(berkas, aturan) : null

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    if (!berkas || galat) return
    setProses(true)
    try {
      const sha256 = await sha256Hex(await bacaBerkas(berkas))
      onSimpan(await sumber.ta.tambahVersi(ta.id, { nama: berkas.name, ukuran: berkas.size, tipe: berkas.type, sha256, catatan: catatan.trim() }))
      setBerkas(null)
      setCatatan('')
      ;(e.target as HTMLFormElement).reset()
    } catch (x) {
      onGalat((x as Error).message)
    } finally {
      setProses(false)
    }
  }

  return (
    <Section title="Versi draf">
      <form onSubmit={kirim} className="glass space-y-3 p-4">
        <label className="block text-sm font-semibold">
          Unggah versi baru
          <input type="file" accept={aturan.drafNaskah.tipe.join(',')} onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-glass-strong file:px-3 file:font-semibold" />
        </label>
        <p className="text-xs text-low">PDF atau DOCX, maks {aturan.drafNaskah.maksMB} MB. Versi lama tidak pernah ditimpa.</p>
        {galat && <p className="text-xs font-semibold text-rose">{galat}</p>}
        <label className="block text-sm font-semibold">
          Catatan perubahan
          <input value={catatan} onChange={(e) => setCatatan(e.target.value)} className="mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan" />
        </label>
        <p className="flex gap-1.5 text-xs text-amber" role="note"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Berkas belum dikirim ke server kampus (layanan penyimpanan/DrivePAM belum tersedia). Yang dicatat: nama, ukuran, dan hash SHA-256 untuk membuktikan versi.</p>
        <button disabled={!berkas || !!galat || !catatan.trim() || proses} className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"><FileUp className="h-4 w-4" aria-hidden /> {proses ? 'Menghitung hash…' : 'Simpan versi'}</button>
      </form>
      {lb.versi.length > 0 && (
        <ol className="glass mt-3 divide-y divide-line overflow-hidden" aria-label="Daftar versi draf">
          {[...lb.versi].reverse().map((v) => (
            <li key={v.versi} className="p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <strong>v{v.versi} · {v.nama}</strong>
                <span className="text-xs text-low">{tgl(v.diunggah)} · {ukuran(v.ukuran)}</span>
              </div>
              <p className="text-xs text-mid">{v.catatan}</p>
              <p className="mt-1 break-all font-mono text-[11px] text-low" title={v.sha256}>SHA-256 {v.sha256}</p>
            </li>
          ))}
        </ol>
      )}
    </Section>
  )
}

/** Kartu bimbingan (PDF lewat cetak) — hanya entri yang disetujui. */
function KartuBimbingan({ ta, user, lb, dosen }: { ta: TugasAkhir; user: User; lb: Logbook; dosen: Dosen[] }) {
  const sah = lb.entri.filter((e) => e.status === 'DISETUJUI').sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const [dicetak, setDicetak] = useState(() => new Date())
  useEffect(() => {
    const on = () => setDicetak(new Date())
    window.addEventListener('beforeprint', on)
    document.documentElement.classList.add('has-print-doc')
    return () => {
      window.removeEventListener('beforeprint', on)
      document.documentElement.classList.remove('has-print-doc')
    }
  }, [])
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  return (
    <>
      <button disabled={sah.length === 0} onClick={() => (setDicetak(new Date()), cetak(`kartu-bimbingan:${ta.id}`))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
        <Printer className="h-4 w-4" aria-hidden /> Cetak kartu bimbingan
      </button>
      {createPortal(
        <div className="print-doc" data-doc={`kartu-bimbingan:${ta.id}`} aria-hidden>
          <div className="pd-head">
            <img src="/brand/unpam-logo-256.webp" alt="" width={56} height={56} />
            <div>
              <div className="pd-title">Kartu Bimbingan Tugas Akhir</div>
              <div>Universitas Pamulang · {user.prodi}</div>
            </div>
          </div>
          <section className="pd-id">
            <dl>
              <dt>Nama</dt><dd>{user.name}</dd>
              <dt>NIM</dt><dd>{user.nim}</dd>
              <dt>Judul</dt><dd>{ta.judul}</dd>
              <dt>Pembimbing</dt><dd>{ta.pembimbing.map(nama).join(', ')}</dd>
            </dl>
          </section>
          <table className="pd-table">
            <thead><tr><th>No</th><th>Tanggal</th><th>Bagian</th><th>Arahan</th><th>Diverifikasi</th></tr></thead>
            <tbody>
              {sah.map((e, i) => (
                <tr key={e.id}><td>{i + 1}</td><td>{tgl(e.tanggal)}</td><td>{e.bagian}</td><td>{e.ringkasan}</td><td>{e.diverifikasi ? tgl(e.diverifikasi.waktu) : '—'}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="pd-foot">
            <span>Hanya memuat {sah.length} entri yang disetujui pembimbing. Dicetak {tgl(dicetak.toISOString())} dari Super UNPAM · Data contoh</span>
            <span>Tanda tangan elektronik belum tersedia; kolom pengesahan diisi sesuai prosedur prodi.</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/* ================= Dosen (DEMO) ================= */

// TODO(BFF-AUTHZ): dosen hanya melihat mahasiswa yang ia bimbing; ditegakkan server.
export function BimbinganDosen({ aturan }: { aturan: AturanProdi }) {
  const res = useResource(sumber.ta.bimbingan)
  const [pesan, setPesan] = useState('')
  const putuskan = async (taId: string, entriId: string, k: 'DISETUJUI' | 'DITOLAK', catatan?: string) => {
    try {
      await sumber.ta.verifikasiEntri(taId, entriId, k, catatan)
      setPesan(k === 'DISETUJUI' ? 'Entri bimbingan disetujui (demo).' : 'Entri bimbingan ditolak dengan alasan (demo).')
      res.reload()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  return (
    <Section title="Mahasiswa bimbingan">
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      {!res.data ? (
        <Skeleton rows={2} />
      ) : res.data.data.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Belum ada mahasiswa bimbingan.</p>
      ) : (
        <ul className="space-y-3">
          {res.data.data.map(({ ta, logbook }) => {
            const jeda = cekJedaBimbingan(logbook.entri, mulaiBimbingan(ta), aturan.jedaBimbinganHari)
            const menunggu = logbook.entri.filter((e) => e.status === 'MENUNGGU')
            const sah = logbook.entri.filter((e) => e.status === 'DISETUJUI').length
            return (
              <li key={ta.id} className="glass p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{ta.judul}</h3>
                  {jeda?.perlu && <Badge tone="amber">Perlu perhatian</Badge>}
                </div>
                <p className="mt-1 text-xs text-mid">{sah} bimbingan disetujui · {menunggu.length} menunggu verifikasi{jeda ? ` · ${jeda.hari} hari sejak pertemuan terakhir` : ''}</p>
                {menunggu.map((e) => <VerifikasiEntri key={e.id} e={e} onPutus={(k, c) => putuskan(ta.id, e.id, k, c)} />)}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function VerifikasiEntri({ e, onPutus }: { e: Bimbingan; onPutus: (k: 'DISETUJUI' | 'DITOLAK', catatan?: string) => void }) {
  const [tolak, setTolak] = useState(false)
  const [alasan, setAlasan] = useState('')
  return (
    <div className="mt-3 rounded-xl bg-glass-strong p-3 text-sm">
      <div className="font-semibold">{e.bagian} · {tgl(e.tanggal)}</div>
      <p className="text-mid">{e.ringkasan}</p>
      {tolak ? (
        <div className="mt-2">
          <label className="block text-xs font-semibold">Alasan penolakan<textarea value={alasan} onChange={(x) => setAlasan(x.target.value)} className="mt-1 w-full min-h-16 rounded-xl border border-line bg-glass px-3 py-2" /></label>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setTolak(false)} className="min-h-11 flex-1 rounded-xl bg-glass text-sm font-semibold">Batal</button>
            <button disabled={!alasan.trim()} onClick={() => onPutus('DITOLAK', alasan)} className="min-h-11 flex-1 rounded-xl bg-rose text-sm font-semibold text-white disabled:opacity-50">Tolak entri</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button onClick={() => onPutus('DISETUJUI')} className="btn-primary min-h-11 flex-1 rounded-xl text-sm font-semibold">Setujui entri</button>
          <button onClick={() => setTolak(true)} className="min-h-11 flex-1 rounded-xl bg-glass text-sm font-semibold">Tolak…</button>
        </div>
      )}
    </div>
  )
}
