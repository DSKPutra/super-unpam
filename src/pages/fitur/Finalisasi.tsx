import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Circle, Clock, FileCheck2, GraduationCap, Hourglass, Printer, ShieldAlert, XCircle } from 'lucide-react'
import type { AturanProdi } from '../../data/aturan-akademik'
import { bolehPengesahan, checklistAdmin, siapLulus, tampilRevisi, validasiNaskahFinal } from '../../lib/akademik/finalisasi'
import { sha256Hex } from '../../lib/akademik/logbook'
import type { Dosen, Finalisasi as DataFinalisasi, Revisi, TugasAkhir } from '../../lib/akademik/types'
import { cetak } from '../../lib/cetak'
import { usePref } from '../../lib/prefs'
import { bacaBerkas } from '../../lib/berkas'
import { sumber } from '../../lib/sumber'
import type { RevisiAktif } from '../../lib/sumber/ta'
import { useResource } from '../../lib/useResource'
import type { User } from '../../lib/types'
import { Badge, LinkBtn, Section, Skeleton } from '../../components/ui'

// T07 Revisi pasca ujian, lembar pengesahan, naskah final, pemeriksaan kemiripan, administrasi lulus,
// yudisium & wisuda. Keputusan resmi dari server; aksi prodi di layar dosen hanya simulasi DEMO (T08).

const zona = { timeZone: 'Asia/Jakarta' } as const
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', ...zona }).format(new Date(iso))
const STATUS_REV: Record<Revisi['status'], { teks: string; tone: 'slate' | 'blue' | 'amber' | 'green' | 'red'; Icon: typeof Circle }> = {
  BELUM: { teks: 'Belum dikerjakan', tone: 'slate', Icon: Circle },
  DIKERJAKAN: { teks: 'Sedang dikerjakan', tone: 'blue', Icon: Clock },
  DIAJUKAN: { teks: 'Menunggu penguji', tone: 'amber', Icon: Hourglass },
  DISETUJUI: { teks: 'Disetujui', tone: 'green', Icon: CheckCircle2 },
  DITOLAK: { teks: 'Ditolak', tone: 'red', Icon: XCircle },
}


/** Dokumen cetak di portal; html.has-print-doc menyembunyikan aplikasi saat mencetak. */
function DokumenCetak({ id, children }: { id: string; children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('has-print-doc')
    return () => document.documentElement.classList.remove('has-print-doc')
  }, [])
  return createPortal(<div className="print-doc" data-doc={id} aria-hidden>{children}</div>, document.body)
}

/* ================= Revisi (mahasiswa) ================= */

export function RevisiMahasiswa({ ta, user, dosen, onBerubah }: { ta: TugasAkhir; user: User; dosen: Dosen[]; onBerubah: () => void }) {
  const muat = useCallback(() => sumber.ta.revisiAktif(ta.id), [ta.id])
  const muatLb = useCallback(() => sumber.ta.logbook(ta.id), [ta.id])
  const res = useResource(muat)
  const lb = useResource(muatLb)
  const [pesan, setPesan] = useState('')
  const [ajukan, setAjukan] = useState<string | null>(null)
  if (!res.data?.data) return null
  const ra = res.data.data
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  const now = Date.now()
  const urut = [...ra.revisi].sort((a, b) => tampilRevisi(b, now).urgensi - tampilRevisi(a, now).urgensi || (a.tenggat ?? '').localeCompare(b.tenggat ?? ''))
  const peng = bolehPengesahan(ra.revisi)
  const jalan = async (revisiId: string, aksi: Parameters<typeof sumber.ta.aksiRevisi>[2], ok: string) => {
    try {
      await sumber.ta.aksiRevisi(ra.pendaftaran.id, revisiId, aksi)
      setPesan(ok)
      setAjukan(null)
      res.reload()
      onBerubah()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  const selesai = ra.revisi.filter((r) => r.status === 'DISETUJUI').length

  return (
    <Section title="Revisi pasca ujian">
      <p className="mb-2 text-sm" role="status">{selesai} dari {ra.revisi.length} butir disetujui</p>
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      <ol className="space-y-2" aria-label="Butir revisi pasca ujian">
        {urut.map((r) => {
          const t = tampilRevisi(r, now)
          const st = STATUS_REV[r.status]
          return (
            <li key={r.id} className="glass p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.bagian}</div>
                  <div>{r.permintaan}</div>
                  <div className="text-xs text-low">{nama(r.pengujiId)}{r.tenggat ? ` · tenggat ${tgl(r.tenggat)}` : ''}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={st.tone}><st.Icon className="h-3 w-3" aria-hidden /> {st.teks}</Badge>
                  {t.terlambat ? <Badge tone="red">Terlambat</Badge> : t.urgensi === 1 && <Badge tone="amber">{t.sisaHari} hari lagi</Badge>}
                </div>
              </div>
              {r.alasan && <p className="mt-1 text-xs text-rose">Alasan penguji: {r.alasan}</p>}
              {r.catatanMahasiswa && r.status !== 'DITOLAK' && <p className="mt-1 text-xs text-mid">Perbaikan Anda: {r.catatanMahasiswa} (draf v{r.versiDraf})</p>}
              {(r.status === 'BELUM' || r.status === 'DITOLAK') && <button onClick={() => jalan(r.id, { jenis: 'DIKERJAKAN' }, 'Butir ditandai sedang dikerjakan.')} className="mt-2 mr-2 min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold">Tandai dikerjakan</button>}
              {['BELUM', 'DIKERJAKAN', 'DITOLAK'].includes(r.status) && (ajukan === r.id ? (
                <FormAjukan versi={lb.data?.data.versi ?? []} onBatal={() => setAjukan(null)} onKirim={(v, c) => jalan(r.id, { jenis: 'AJUKAN', versiDraf: v, catatan: c }, 'Perbaikan diajukan ke penguji.')} />
              ) : (
                <button onClick={() => setAjukan(r.id)} className="btn-primary mt-2 min-h-11 rounded-xl px-3 text-xs font-semibold">Ajukan perbaikan</button>
              ))}
            </li>
          )
        })}
      </ol>
      <div className="mt-3">
        <button disabled={!peng.ok} onClick={() => cetak(`pengesahan:${ra.ta.id}`)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold"><Printer className="h-4 w-4" aria-hidden /> Cetak lembar pengesahan</button>
        {!peng.ok && <p className="mt-1 text-xs text-mid">{peng.alasan}</p>}
        {peng.ok && <LembarPengesahan ra={ra} user={user} nama={nama} />}
      </div>
    </Section>
  )
}

function FormAjukan({ versi, onBatal, onKirim }: { versi: { versi: number; nama: string }[]; onBatal: () => void; onKirim: (versi: number | undefined, catatan: string) => void }) {
  const [v, setV] = useState('')
  const [c, setC] = useState('')
  const input = 'mt-1 w-full min-h-11 rounded-xl border border-line bg-glass px-3'
  return (
    <form className="mt-2 space-y-2 rounded-xl bg-glass-strong p-3" onSubmit={(e) => (e.preventDefault(), onKirim(v ? Number(v) : undefined, c))}>
      <label className="block text-xs font-semibold">Versi draf yang memuat perbaikan
        <select value={v} onChange={(e) => setV(e.target.value)} className={input}>
          <option value="">Pilih versi…</option>
          {[...versi].reverse().map((x) => <option key={x.versi} value={x.versi}>v{x.versi} · {x.nama}</option>)}
        </select>
      </label>
      {versi.length === 0 && <p className="text-xs text-amber">Unggah versi draf baru di bagian Versi draf lebih dulu.</p>}
      <label className="block text-xs font-semibold">Penjelasan perbaikan<textarea value={c} onChange={(e) => setC(e.target.value)} className={`${input} min-h-16 py-2`} /></label>
      <div className="flex gap-2">
        <button type="button" onClick={onBatal} className="min-h-11 flex-1 rounded-xl bg-glass font-semibold">Batal</button>
        <button className="btn-primary min-h-11 flex-1 rounded-xl font-semibold">Kirim ke penguji</button>
      </div>
    </form>
  )
}

function LembarPengesahan({ ra, user, nama }: { ra: RevisiAktif; user: User; nama: (id: string) => string }) {
  return (
    <DokumenCetak id={`pengesahan:${ra.ta.id}`}>
      <div className="pd-head">
        <img src="/brand/unpam-logo-256.webp" alt="" width={56} height={56} />
        <div>
          <div className="pd-title">Lembar Pengesahan</div>
          <div>Universitas Pamulang · {user.prodi}</div>
        </div>
      </div>
      <section className="pd-id">
        <dl>
          <dt>Nama</dt><dd>{user.name}</dd>
          <dt>NIM</dt><dd>{user.nim}</dd>
          <dt>Judul</dt><dd>{ra.ta.judul}</dd>
        </dl>
      </section>
      <table className="pd-table">
        <thead><tr><th>Pembimbing/Penguji</th><th>Tanda tangan</th></tr></thead>
        <tbody>{[...new Set([...ra.ta.pembimbing, ...(ra.pendaftaran.sesi?.petugas ?? [])])].map((p) => <tr key={p}><td>{nama(p)}</td><td style={{ height: 36 }} /></tr>)}</tbody>
      </table>
      <div className="pd-foot">
        <span>Semua {ra.revisi.length} butir revisi telah disetujui penguji. MENUNGGU TANDA TANGAN RESMI.</span>
        <span>Dokumen dari Super UNPAM · Data contoh. Tanda tangan elektronik resmi belum tersedia.</span>
      </div>
    </DokumenCetak>
  )
}

/* ================= Finalisasi (mahasiswa) ================= */

export function FinalisasiMahasiswa({ ta, aturan, go, onBerubah }: { ta: TugasAkhir; aturan: AturanProdi; go: (r: string) => void; onBerubah: () => void }) {
  const muat = useCallback(() => sumber.ta.finalisasi(ta.id), [ta.id])
  const muatRev = useCallback(() => sumber.ta.revisiAktif(ta.id), [ta.id])
  const res = useResource(muat)
  const rev = useResource(muatRev)
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState(false)
  if (res.error) return <Section title="Finalisasi"><p className="glass p-4 text-sm text-mid">{res.error.message}</p></Section>
  if (!res.data || !rev.data) return <Section title="Finalisasi"><Skeleton rows={2} /></Section>
  const fin = res.data.data
  const contoh = res.data.asal === 'contoh'
  const sl = siapLulus(fin, rev.data.data?.revisi ?? [], aturan)
  const jalan = async (aksi: Parameters<typeof sumber.ta.aksiFinalisasi>[1], ok: string) => {
    setProses(true)
    setPesan('')
    try {
      await sumber.ta.aksiFinalisasi(ta.id, aksi)
      setPesan(contoh ? `${ok} (data contoh).` : ok)
      res.reload()
      onBerubah()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setProses(false)
    }
  }

  if (ta.status === 'SELESAI')
    return (
      <Section title="Selesai">
        <div className="glass p-5 text-sm" role="status">
          <p className="flex items-center gap-2 text-lg font-bold"><GraduationCap className="h-6 w-6 text-mint" aria-hidden /> Tugas akhir selesai. Selamat!</p>
          <p className="mt-1 text-mid">Langkah berikutnya: bergabung dengan jaringan alumni dan mengisi tracer study.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => go('alumni')} className="btn-primary min-h-11 rounded-xl px-4 font-semibold">Alumni</button>
            <button onClick={() => go('tracer')} className="min-h-11 rounded-xl bg-glass-strong px-4 font-semibold">Tracer Study</button>
          </div>
        </div>
      </Section>
    )

  return (
    <Section title="Finalisasi & administrasi lulus">
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      <NaskahFinalForm fin={fin} aturan={aturan} proses={proses} onKirim={(naskah) => jalan({ jenis: 'NASKAH', naskah }, 'Naskah final dicatat')} onGalat={setPesan} />

      <div className="glass mt-3 p-4 text-sm">
        <h3 className="font-semibold">Pemeriksaan kemiripan</h3>
        <p className="text-xs text-low">Ambang {aturan.plagiasi.ambangPersen}%{aturan.plagiasi.sumber === null && ' (ketentuan contoh)'}. Hasil dari penyedia, bukan dihitung aplikasi.</p>
        {fin.plagiasi ? (
          <p className={`mt-2 font-semibold ${fin.plagiasi.lolos ? 'text-mint' : 'text-rose'}`}>
            Kemiripan {fin.plagiasi.persen}% · {fin.plagiasi.lolos ? 'di bawah ambang' : 'melebihi ambang'} · {fin.plagiasi.penyedia}{fin.plagiasi.contoh && ' — hasil contoh, bukan pemeriksaan sungguhan'}
          </p>
        ) : (
          <button disabled={!fin.naskah || proses} onClick={() => jalan({ jenis: 'PLAGIASI' }, 'Pemeriksaan kemiripan selesai')} className="btn-primary mt-2 min-h-11 rounded-xl px-4 font-semibold">Periksa kemiripan</button>
        )}
      </div>

      <div className="mt-3">
        <h3 className="mb-2 text-sm font-semibold">Administrasi lulus{aturan.adminLulus.sumber === null && <span className="font-normal text-low"> · daftar contoh</span>}</h3>
        <ul className="glass divide-y divide-line overflow-hidden" aria-label="Checklist administrasi lulus">
          {checklistAdmin(fin, aturan).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
              {b.status === 'SELESAI' ? <CheckCircle2 className="h-5 w-5 text-mint" aria-label="selesai" /> : b.status === 'DIAJUKAN' ? <Hourglass className="h-5 w-5 text-amber" aria-label="diajukan" /> : <Circle className="h-5 w-5 text-low" aria-label="belum" />}
              <span className="flex-1">{b.label}</span>
              {b.rute && <LinkBtn onClick={() => go(b.rute!)}>Buka</LinkBtn>}
              {b.status === 'BELUM' && <button disabled={proses} onClick={() => jalan({ jenis: 'AJUKAN_ADMIN', item: b.id }, `${b.label} diajukan`)} className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold" aria-label={`Ajukan ${b.label}`}>Ajukan</button>}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass mt-3 p-4 text-sm">
        <h3 className="font-semibold">Yudisium & wisuda</h3>
        <p className="text-mid">{fin.yudisium ? `Yudisium: ${tgl(fin.yudisium.jadwal)} · ${fin.yudisium.tempat}` : 'Jadwal yudisium belum diumumkan.'}</p>
        {!sl.ok && (
          <ul className="mt-2 list-disc pl-5 text-xs text-mid" aria-label="Yang masih kurang untuk lulus">
            {sl.kurang.map((k) => <li key={k}>{k}</li>)}
          </ul>
        )}
        {fin.wisuda ? (
          <p className="mt-2 font-semibold text-mint">Terdaftar wisuda sejak {tgl(fin.wisuda.terdaftar)}.</p>
        ) : (
          <button disabled={!sl.ok || proses} onClick={() => jalan({ jenis: 'DAFTAR_WISUDA' }, 'Pendaftaran wisuda tercatat')} className="btn-primary mt-2 min-h-11 rounded-xl px-4 font-semibold">Daftar wisuda</button>
        )}
      </div>
    </Section>
  )
}

function NaskahFinalForm({ fin, aturan, proses, onKirim, onGalat }: { fin: DataFinalisasi; aturan: AturanProdi; proses: boolean; onKirim: (n: { nama: string; ukuran: number; sha256: string; akses: string; daftarPeriksa: string[] }) => void; onGalat: (m: string) => void }) {
  const [berkas, setBerkas] = useState<File | null>(null)
  const [centang, setCentang] = useState<string[]>([])
  const [akses, setAkses] = usePref<string>('ta:akses-publikasi', '')
  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    if (!berkas) return onGalat('Pilih berkas naskah final.')
    const g = validasiNaskahFinal(berkas, centang, akses, aturan)
    if (g.length) return onGalat(g.join(' '))
    onKirim({ nama: berkas.name, ukuran: berkas.size, sha256: await sha256Hex(await bacaBerkas(berkas)), akses, daftarPeriksa: centang })
    setBerkas(null)
    setCentang([])
    ;(e.target as HTMLFormElement).reset()
  }
  return (
    <form onSubmit={kirim} noValidate className="glass space-y-3 p-4 text-sm">
      <h3 className="font-semibold">Naskah final</h3>
      {fin.naskah && (
        <div className="rounded-xl bg-glass-strong p-3 text-xs" role="status">
          <p className="flex items-center gap-1.5 font-semibold"><FileCheck2 className="h-4 w-4 text-mint" aria-hidden /> Struk: {fin.naskah.nama} · {tgl(fin.naskah.diunggah)} · akses {aturan.naskahFinal.aksesPublikasi.find((a) => a.id === fin.naskah!.akses)?.label ?? fin.naskah.akses}</p>
          <p className="mt-1 break-all font-mono text-low">SHA-256 {fin.naskah.sha256}</p>
        </div>
      )}
      <label className="block font-semibold">{fin.naskah ? 'Ganti naskah final' : 'Unggah naskah final'} (PDF, maks {aturan.naskahFinal.maksMB} MB)
        <input type="file" accept="application/pdf" onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} className="mt-1.5 block w-full text-xs file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-glass-strong file:px-3 file:font-semibold" />
      </label>
      <fieldset>
        <legend className="font-semibold">Daftar periksa{aturan.naskahFinal.sumber === null && <span className="font-normal text-low"> (contoh)</span>}</legend>
        {aturan.naskahFinal.daftarPeriksa.map((d) => (
          <label key={d} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={centang.includes(d)} onChange={(e) => setCentang(e.target.checked ? [...centang, d] : centang.filter((x) => x !== d))} className="h-4 w-4" /> {d}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="font-semibold">Hak akses publikasi</legend>
        <p className="text-xs text-low">Kebijakan publikasi ditetapkan kampus; pilihan di bawah masih contoh.</p>
        {aturan.naskahFinal.aksesPublikasi.map((a) => (
          <label key={a.id} className="flex min-h-11 items-center gap-2">
            <input type="radio" name="akses" checked={akses === a.id} onChange={() => setAkses(a.id)} /> {a.label}{a.keterangan && <span className="text-xs text-low">· {a.keterangan}</span>}
          </label>
        ))}
      </fieldset>
      <p className="flex gap-1.5 text-xs text-amber" role="note"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> Berkas belum dikirim ke repositori kampus (DrivePAM belum tersedia); yang dicatat nama, ukuran, dan hash.</p>
      <button disabled={proses} className="btn-primary min-h-11 rounded-xl px-4 font-semibold">Simpan naskah final</button>
    </form>
  )
}

/* ================= Dosen & simulasi prodi (DEMO) ================= */

// TODO(BFF-AUTHZ): identitas penguji dari sesi; prodi = peran TENDIK di server (T08).
export function RevisiDosen({ penguji }: { penguji: string }) {
  const muat = useCallback(() => sumber.ta.revisiPenguji(penguji), [penguji])
  const res = useResource(muat)
  const [pesan, setPesan] = useState('')
  const [alasan, setAlasan] = useState<Record<string, string>>({})
  const putus = async (ra: RevisiAktif, r: Revisi, keputusan: 'DISETUJUI' | 'DITOLAK') => {
    try {
      await sumber.ta.aksiRevisi(ra.pendaftaran.id, r.id, { jenis: 'PUTUSKAN', pengujiId: penguji, keputusan, alasan: alasan[r.id] })
      setPesan(keputusan === 'DISETUJUI' ? 'Butir revisi disetujui (demo).' : 'Butir revisi ditolak (demo).')
      res.reload()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  const daftar = (res.data?.data ?? []).flatMap((ra) => ra.revisi.filter((r) => r.status === 'DIAJUKAN').map((r) => ({ ra, r })))
  return (
    <Section title="Revisi menunggu keputusan saya">
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      {daftar.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Tidak ada butir revisi yang menunggu.</p>
      ) : (
        <ul className="space-y-2">
          {daftar.map(({ ra, r }) => (
            <li key={r.id} className="glass p-3 text-sm">
              <div className="font-semibold">{ra.ta.judul} · {r.bagian}</div>
              <div className="text-mid">Permintaan: {r.permintaan}</div>
              <div className="text-mid">Perbaikan: {r.catatanMahasiswa} (draf v{r.versiDraf})</div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <button onClick={() => putus(ra, r, 'DISETUJUI')} className="btn-primary min-h-11 rounded-xl px-3 text-xs font-semibold">Setujui butir</button>
                <input value={alasan[r.id] ?? ''} onChange={(e) => setAlasan({ ...alasan, [r.id]: e.target.value })} aria-label={`Alasan menolak revisi ${r.bagian}`} placeholder="Alasan bila ditolak" className="min-h-11 flex-1 rounded-xl border border-line bg-glass-strong px-3 text-xs" />
                <button disabled={!alasan[r.id]?.trim()} onClick={() => putus(ra, r, 'DITOLAK')} className="min-h-11 rounded-xl bg-rose px-3 text-xs font-semibold text-white disabled:opacity-50">Tolak butir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export function SimulasiProdi({ ta, aturan }: { ta: TugasAkhir | null; aturan: AturanProdi }) {
  const muat = useCallback(() => (ta ? sumber.ta.finalisasi(ta.id) : Promise.resolve(null)), [ta])
  const res = useResource(muat)
  const [pesan, setPesan] = useState('')
  if (!ta || (ta.status !== 'YUDISIUM' && ta.status !== 'SELESAI') || !res.data) return null
  const fin = res.data.data
  const jalan = async (aksi: Parameters<typeof sumber.ta.aksiFinalisasi>[1], ok: string) => {
    try {
      await sumber.ta.aksiFinalisasi(ta.id, aksi)
      setPesan(ok)
      res.reload()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  return (
    <Section title="Simulasi prodi (demo)">
      <p className="mb-2 flex gap-1.5 text-xs text-amber"><ShieldAlert className="h-4 w-4 shrink-0" aria-hidden /> Aksi prodi untuk peragaan saja; di server hanya peran prodi (TENDIK) yang boleh.</p>
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      <ul className="glass divide-y divide-line overflow-hidden">
        {checklistAdmin(fin, aturan).map((b) => (
          <li key={b.id} className="flex items-center gap-2 p-3 text-sm">
            <span className="flex-1">{b.label} · {b.status === 'SELESAI' ? 'selesai' : b.status === 'DIAJUKAN' ? 'diajukan' : 'belum'}</span>
            {b.status !== 'SELESAI' && <button onClick={() => jalan({ jenis: 'ADMIN_SELESAI', item: b.id }, `${b.label} ditandai selesai (demo).`)} className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold" aria-label={`Tandai selesai ${b.label}`}>Tandai selesai</button>}
          </li>
        ))}
      </ul>
      {ta.status === 'YUDISIUM' && <button onClick={() => jalan({ jenis: 'SELESAIKAN' }, 'Tugas akhir dinyatakan selesai (demo).')} className="btn-primary mt-3 min-h-11 rounded-xl px-4 font-semibold">Nyatakan selesai</button>}
    </Section>
  )
}
