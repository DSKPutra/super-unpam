import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AlertTriangle, CalendarPlus, Check, CheckCircle2, Circle, FilePenLine, ShieldAlert, UserRound, X } from 'lucide-react'
import { URUTAN_UTAMA, type Peristiwa } from '../../lib/akademik/alur-skripsi'
import { aturanUntuk } from '../../lib/akademik/aturan'
import { estimasiSemester, judulMirip, pembimbingTersedia, sisaKuota, validasiPengajuanJudul, type DataPengajuanJudul } from '../../lib/akademik/judul'
import { evaluasiKelayakan } from '../../lib/akademik/kelayakan'
import type { Dosen, PeranAlur, PermintaanPerubahan, ProfilKelayakan, StatusTugasAkhir, TugasAkhir } from '../../lib/akademik/types'
import { usePref } from '../../lib/prefs'
import { statusSumber, sumber } from '../../lib/sumber'
import { useResource } from '../../lib/useResource'
import type { Role, User } from '../../lib/types'
import { Badge, LinkBtn, PageHeader, Section, Skeleton } from '../../components/ui'
import { BimbinganDosen, LogbookMahasiswa } from './Logbook'

// T03 Skripsi/Tugas Akhir: syarat mulai, pengajuan judul + calon pembimbing, kemiripan judul, linimasa
// status dari mesin alur (src/lib/akademik/alur-skripsi.ts), dan sisi dosen (DEMO).

const PELAKU: Record<Role, PeranAlur> = { MAHASISWA: 'MAHASISWA', DOSEN: 'DOSEN', TENDIK: 'PRODI', ALUMNI: 'MAHASISWA' }
const LABEL_STATUS: Record<StatusTugasAkhir, string> = {
  DRAF_JUDUL: 'Draf judul',
  DIAJUKAN: 'Diajukan',
  DITOLAK: 'Ditolak',
  DISETUJUI_PEMBIMBING: 'Pembimbing ditetapkan',
  BIMBINGAN: 'Bimbingan',
  LAYAK_PROPOSAL: 'Layak proposal',
  UJIAN_PROPOSAL: 'Seminar proposal',
  REVISI_PROPOSAL: 'Revisi proposal',
  PENELITIAN: 'Penelitian',
  LAYAK_UJIAN_AKHIR: 'Layak ujian akhir',
  UJIAN_AKHIR: 'Ujian akhir',
  REVISI_AKHIR: 'Revisi akhir',
  YUDISIUM: 'Yudisium',
  SELESAI: 'Selesai',
}
const LABEL_PELAKU: Record<PeranAlur, string> = { MAHASISWA: 'Mahasiswa', DOSEN: 'Dosen', PRODI: 'Prodi' }
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(iso))
const KOSONG: DataPengajuanJudul = { judul: '', bidang: '', abstrak: '', metode: '', pilihanPembimbing: [] }

export function TugasAkhir({ user, back, go }: { user: User; back: () => void; go: (r: string) => void }) {
  return (
    <div>
      <PageHeader title="Skripsi / Tugas Akhir" subtitle={user.prodi} onBack={back} />
      {user.role === 'MAHASISWA' ? <SisiMahasiswa user={user} go={go} /> : <SisiDosen user={user} />}
    </div>
  )
}

/* ================= Mahasiswa ================= */

function SisiMahasiswa({ user, go }: { user: User; go: (r: string) => void }) {
  const ringkasan = useResource(sumber.ta.ringkasan)
  const kelayakan = useResource(sumber.ujian.kelayakan)
  const aturan = useMemo(() => aturanUntuk(user.prodi), [user.prodi])
  const st = statusSumber(ringkasan, 'MY UNPAM')
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState(false)

  const jalankan = async (p: Parameters<typeof sumber.ta.peristiwa>[0], sukses: string) => {
    setProses(true)
    setPesan('')
    try {
      const r = await sumber.ta.peristiwa(p, 'MAHASISWA')
      setPesan(r.asal === 'contoh' ? `${sukses} (data contoh, tidak dikirim ke kampus).` : sukses)
      ringkasan.reload()
      return true
    } catch (e) {
      setPesan((e as Error).message)
      return false
    } finally {
      setProses(false)
    }
  }

  if (ringkasan.error || kelayakan.error)
    return (
      <div className="glass flex items-center justify-between gap-3 p-4 text-sm">
        <span className="text-mid">{(ringkasan.error ?? kelayakan.error)!.message}</span>
        <LinkBtn onClick={() => (ringkasan.reload(), kelayakan.reload())}>Coba lagi</LinkBtn>
      </div>
    )
  if (!ringkasan.data || !kelayakan.data) return <Skeleton rows={4} />

  const { tugasAkhir: ta, dosen, judulTerdaftar } = ringkasan.data.data
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2" role="status">
        <Badge tone={st.tone}>{st.teks}</Badge>
        {aturan.mulaiTA.sumber === null && <Badge tone="amber">Aturan skripsi: contoh</Badge>}
      </div>
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>

      {!ta || ta.status === 'DRAF_JUDUL' ? (
        <SyaratDanForm
          profil={kelayakan.data.data}
          aturan={aturan}
          dosen={dosen}
          judulTerdaftar={judulTerdaftar}
          awal={ta ? { judul: ta.judul, bidang: ta.bidang, abstrak: ta.abstrak, metode: ta.metode, pilihanPembimbing: ta.pilihanPembimbing } : undefined}
          proses={proses}
          go={go}
          onKirim={(judul) => jalankan({ taId: ta?.id, peristiwa: 'AJUKAN_JUDUL', judul }, 'Judul diajukan')}
        />
      ) : (
        <StatusTA ta={ta} user={user} aturan={aturan} dosen={dosen} proses={proses} go={go} onPeristiwa={(p) => jalankan({ taId: ta.id, peristiwa: p }, p === 'AJUKAN_ULANG' ? 'Silakan perbaiki dan ajukan ulang' : 'Status diperbarui')} onPerubahan={async (d) => {
          try {
            await sumber.ta.ajukanPerubahan(ta.id, d)
            setPesan('Permintaan perubahan diajukan dan menunggu persetujuan. Data belum berubah.')
            ringkasan.reload()
          } catch (e) {
            setPesan((e as Error).message)
          }
        }} />
      )}
    </>
  )
}

function SyaratDanForm({ profil, aturan, dosen, judulTerdaftar, awal, proses, go, onKirim }: {
  profil: ProfilKelayakan
  aturan: ReturnType<typeof aturanUntuk>
  dosen: Dosen[]
  judulTerdaftar: string[]
  awal?: DataPengajuanJudul
  proses: boolean
  go: (r: string) => void
  onKirim: (d: DataPengajuanJudul) => Promise<boolean>
}) {
  const syarat = evaluasiKelayakan(profil, aturan.mulaiTA)
  const sks = aturan.mulaiTA.syarat.find((s) => s.id === 'sks')
  const kurangSks = sks?.id === 'sks' ? sks.minimal - profil.sks : 0

  return (
    <>
      <Section title="Syarat mulai skripsi">
        <ul className="glass divide-y divide-line overflow-hidden" aria-label={syarat.layak ? 'Semua syarat terpenuhi' : 'Ada syarat yang belum terpenuhi'}>
          {syarat.syarat.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-4 text-sm">
              {s.terpenuhi ? <CheckCircle2 className="h-5 w-5 shrink-0 text-mint" aria-label="terpenuhi" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber" aria-label="belum terpenuhi" />}
              <span className="flex-1"><strong>{s.label}:</strong> {s.alasan}{s.contoh && ' (ambang contoh)'}</span>
              {!s.terpenuhi && s.tautanPerbaikan && <LinkBtn onClick={() => go(s.tautanPerbaikan!)}>Lihat</LinkBtn>}
            </li>
          ))}
        </ul>
        {kurangSks > 0 && <p className="mt-2 text-xs text-mid">Perkiraan: syarat SKS terpenuhi ±{estimasiSemester(kurangSks, aturan.perkiraanSksPerSemester)} semester lagi bila mengambil sekitar {aturan.perkiraanSksPerSemester} SKS per semester.</p>}
      </Section>
      {syarat.layak && <FormPengajuan aturan={aturan} dosen={dosen} judulTerdaftar={judulTerdaftar} awal={awal} proses={proses} onKirim={onKirim} />}
    </>
  )
}

function FormPengajuan({ aturan, dosen, judulTerdaftar, awal, proses, onKirim }: {
  aturan: ReturnType<typeof aturanUntuk>
  dosen: Dosen[]
  judulTerdaftar: string[]
  awal?: DataPengajuanJudul
  proses: boolean
  onKirim: (d: DataPengajuanJudul) => Promise<boolean>
}) {
  // Draf otomatis di perangkat ini; dihapus setelah terkirim dan saat keluar akun (prefiks su:ta:).
  const [tersimpan, setDraf] = usePref<DataPengajuanJudul>('ta:draf', awal ?? KOSONG)
  // Draf kosong (mis. setelah pengiriman sebelumnya) tidak boleh menimpa isian pengajuan yang diajukan ulang.
  const kosong = !tersimpan.judul && !tersimpan.bidang && !tersimpan.abstrak && !tersimpan.metode && !tersimpan.pilihanPembimbing.some(Boolean)
  const draf = kosong && awal ? awal : tersimpan
  const [tampilGalat, setTampilGalat] = useState(false)
  const n = aturan.jumlahPilihanPembimbing
  const pilihan = Array.from({ length: n }, (_, i) => draf.pilihanPembimbing[i] ?? '')
  const galat = validasiPengajuanJudul({ ...draf, pilihanPembimbing: pilihan }, { maksKarakterJudul: aturan.maksKarakterJudul, jumlahPilihan: n, dosen, kuotaBawaan: aturan.kuotaBimbingan })
  const mirip = draf.judul.trim().length >= 10 ? judulMirip(draf.judul, judulTerdaftar, aturan.ambangKemiripanJudul) : []
  const tersedia = pembimbingTersedia(dosen, aturan.kuotaBimbingan, draf.bidang)
  const set = <K extends keyof DataPengajuanJudul>(k: K, v: DataPengajuanJudul[K]) => setDraf({ ...draf, [k]: v })

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    setTampilGalat(true)
    if (Object.keys(galat).length) return
    if (await onKirim({ ...draf, pilihanPembimbing: pilihan })) setDraf(KOSONG)
  }

  const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
  const err = (k: keyof DataPengajuanJudul) => tampilGalat && galat[k] ? <p id={`e-${k}`} className="mt-1 text-xs font-semibold text-rose">{galat[k]}</p> : null
  return (
    <Section title="Ajukan judul">
      <form onSubmit={kirim} noValidate className="glass space-y-4 p-4">
        <label className="block text-sm font-semibold">
          Judul
          <textarea value={draf.judul} onChange={(e) => set('judul', e.target.value)} maxLength={aturan.maksKarakterJudul + 50} aria-invalid={tampilGalat && !!galat.judul} aria-describedby="e-judul" className={`${input} min-h-20 py-2`} />
          <span className={`mt-1 block text-right text-xs ${draf.judul.length > aturan.maksKarakterJudul ? 'text-rose' : 'text-low'}`}>{draf.judul.length}/{aturan.maksKarakterJudul}</span>
        </label>
        {err('judul')}
        {mirip.length > 0 && (
          <div className="rounded-xl bg-glass-strong p-3 text-xs" role="note">
            <p className="font-semibold text-amber">Judul mirip dengan yang sudah terdaftar (peringatan, bukan penolakan):</p>
            <ul className="mt-1 list-disc pl-4 text-mid">
              {mirip.slice(0, 3).map((m) => <li key={m.judul}>{m.judul} ({Math.round(m.skor * 100)}%)</li>)}
            </ul>
            <p className="mt-1 text-low">Pemeriksaan sederhana atas kata kunci; bukan pengganti cek plagiasi resmi.</p>
          </div>
        )}
        <label className="block text-sm font-semibold">
          Bidang / kelompok keilmuan
          {aturan.bidangTA.length ? (
            <select value={draf.bidang} onChange={(e) => set('bidang', e.target.value)} className={input} aria-describedby="e-bidang">
              <option value="">Pilih…</option>
              {aturan.bidangTA.map((b) => <option key={b}>{b}</option>)}
            </select>
          ) : (
            <input value={draf.bidang} onChange={(e) => set('bidang', e.target.value)} className={input} aria-describedby="e-bidang" />
          )}
        </label>
        {err('bidang')}
        <label className="block text-sm font-semibold">
          Abstrak singkat
          <textarea value={draf.abstrak} onChange={(e) => set('abstrak', e.target.value)} maxLength={3000} className={`${input} min-h-28 py-2`} aria-describedby="e-abstrak" />
        </label>
        {err('abstrak')}
        <label className="block text-sm font-semibold">
          Rencana metode
          <textarea value={draf.metode} onChange={(e) => set('metode', e.target.value)} maxLength={3000} className={`${input} min-h-20 py-2`} aria-describedby="e-metode" />
        </label>
        {err('metode')}
        <fieldset>
          <legend className="text-sm font-semibold">Calon pembimbing (urut prioritas)</legend>
          <p className="text-xs text-low">Hanya dosen yang kuotanya masih tersedia. Dosen sebidang ditampilkan lebih dulu.</p>
          {pilihan.map((v, i) => (
            <label key={i} className="mt-2 block text-sm">
              Pilihan {i + 1}
              <select
                value={v}
                onChange={(e) => set('pilihanPembimbing', pilihan.map((x, j) => (j === i ? e.target.value : x)))}
                className={input}
                aria-describedby="e-pilihanPembimbing"
              >
                <option value="">Pilih dosen…</option>
                {tersedia.map((d) => (
                  <option key={d.id} value={d.id} disabled={pilihan.includes(d.id) && v !== d.id}>
                    {d.nama} · sisa kuota {sisaKuota(d, aturan.kuotaBimbingan)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </fieldset>
        {err('pilihanPembimbing')}
        <p className="text-xs text-low">Draf tersimpan otomatis di perangkat ini.</p>
        <button disabled={proses} className="btn-primary min-h-12 w-full rounded-2xl font-semibold">{proses ? 'Mengirim…' : 'Ajukan judul'}</button>
      </form>
    </Section>
  )
}

/** Tahap yang belum punya pembimbing aktif: logbook dan perubahan belum relevan. */
const SEBELUM_BIMBINGAN: StatusTugasAkhir[] = ['DRAF_JUDUL', 'DIAJUKAN', 'DITOLAK', 'DISETUJUI_PEMBIMBING']

function StatusTA({ ta, user, aturan, dosen, proses, go, onPeristiwa, onPerubahan }: {
  ta: TugasAkhir
  user: User
  aturan: ReturnType<typeof aturanUntuk>
  dosen: Dosen[]
  proses: boolean
  go: (r: string) => void
  onPeristiwa: (p: Peristiwa) => void
  onPerubahan: (d: Pick<PermintaanPerubahan, 'jenis' | 'usulan' | 'alasan'>) => void
}) {
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  const ditolak = ta.status === 'DITOLAK'
  const idx = URUTAN_UTAMA.indexOf(ta.status)
  const alasanTolak = [...ta.riwayat].reverse().find((r) => r.ke === 'DITOLAK')?.catatan

  return (
    <>
      <div className="glass p-5">
        <div className="text-xs uppercase tracking-[0.14em] text-mid">{ta.bidang}</div>
        <h2 className="mt-1 text-lg font-bold">{ta.judul}</h2>
        <p className="mt-1 text-sm text-mid">Status: <strong className="text-hi">{LABEL_STATUS[ta.status]}</strong></p>
        {ditolak && (
          <div className="mt-3 rounded-xl bg-glass-strong p-3 text-sm" role="alert">
            <p><strong>Pengajuan ditolak.</strong> Alasan: {alasanTolak ?? '—'}</p>
            <button disabled={proses} onClick={() => onPeristiwa('AJUKAN_ULANG')} className="btn-primary mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold">Ajukan ulang</button>
            <p className="mt-2 text-xs text-low">Riwayat penolakan tetap tersimpan.</p>
          </div>
        )}
      </div>

      <Section title="Linimasa">
        <ol className="glass space-y-0 p-4" aria-label={`Tahap saat ini: ${LABEL_STATUS[ta.status]}`}>
          {URUTAN_UTAMA.map((s, i) => {
            const selesai = !ditolak && idx > i
            const kini = s === ta.status || (ditolak && s === 'DIAJUKAN')
            const entri = [...ta.riwayat].reverse().find((r) => r.ke === s)
            return (
              <li key={s} className="flex gap-3 pb-3 last:pb-0">
                <span aria-hidden className="mt-0.5">
                  {selesai ? <CheckCircle2 className="h-5 w-5 text-mint" /> : kini ? (ditolak ? <X className="h-5 w-5 text-rose" /> : <Circle className="h-5 w-5 fill-cyan text-cyan" />) : <Circle className="h-5 w-5 text-low" />}
                </span>
                <div className="min-w-0 text-sm">
                  <div className={kini ? 'font-semibold text-hi' : selesai ? 'text-hi' : 'text-low'}>
                    {LABEL_STATUS[s]}
                    <span className="sr-only">{selesai ? ' (selesai)' : kini ? ' (tahap sekarang)' : ' (belum)'}</span>
                  </div>
                  {entri && <div className="text-xs text-low">{tgl(entri.waktu)} · {LABEL_PELAKU[entri.pelaku]}{entri.catatan ? ` · ${entri.catatan}` : ''}</div>}
                </div>
              </li>
            )
          })}
        </ol>
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold text-cyan">Riwayat lengkap ({ta.riwayat.length})</summary>
          <ul className="glass divide-y divide-line overflow-hidden">
            {ta.riwayat.map((r, i) => (
              <li key={i} className="p-3 text-xs">
                <strong>{LABEL_STATUS[r.dari]} → {LABEL_STATUS[r.ke]}</strong> · {tgl(r.waktu)} · {LABEL_PELAKU[r.pelaku]}
                {r.catatan && <div className="text-mid">Catatan: {r.catatan}</div>}
              </li>
            ))}
          </ul>
        </details>
      </Section>

      <Section title="Pembimbing">
        {ta.pembimbing.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">
            Belum ditetapkan. Pilihan Anda: {ta.pilihanPembimbing.map(nama).join(', ') || '—'}. Bimbingan baru bisa dimulai setelah pembimbing ditetapkan.
          </p>
        ) : (
          <div className="glass p-4">
            <ul className="space-y-2">
              {ta.pembimbing.map((id, i) => {
                const d = dosen.find((x) => x.id === id)
                return (
                  <li key={id} className="flex items-center gap-3 text-sm">
                    <UserRound className="h-5 w-5 shrink-0 text-cyan" aria-hidden />
                    <span className="flex-1"><strong>{d?.nama ?? id}</strong> · Pembimbing {i + 1}<br /><span className="text-xs text-low">Kontak: {d?.kontak ?? 'via MY UNPAM'}</span></span>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => go('booking/dosen')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
                <CalendarPlus className="h-4 w-4" aria-hidden /> Jadwalkan bimbingan
              </button>
              {ta.status === 'DISETUJUI_PEMBIMBING' && (
                <button disabled={proses} onClick={() => onPeristiwa('MULAI_BIMBINGAN')} className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold">Mulai bimbingan</button>
              )}
            </div>
          </div>
        )}
      </Section>

      {!SEBELUM_BIMBINGAN.includes(ta.status) && <LogbookMahasiswa ta={ta} user={user} aturan={aturan} dosen={dosen} go={go} />}
      {ta.pembimbing.length > 0 && <Perubahan ta={ta} dosen={dosen} onAjukan={onPerubahan} />}
    </>
  )
}

function Perubahan({ ta, dosen, onAjukan }: { ta: TugasAkhir; dosen: Dosen[]; onAjukan: (d: Pick<PermintaanPerubahan, 'jenis' | 'usulan' | 'alasan'>) => void }) {
  const [buka, setBuka] = useState(false)
  const [jenis, setJenis] = useState<PermintaanPerubahan['jenis']>('JUDUL')
  const [usulan, setUsulan] = useState('')
  const [alasan, setAlasan] = useState('')
  const bisa = usulan.trim().length > 0 && alasan.trim().length >= 10
  const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
  return (
    <Section title="Perubahan judul / pembimbing">
      <p className="mb-2 text-xs text-low">Perubahan adalah pengajuan baru yang perlu disetujui; data tidak langsung berubah.</p>
      {ta.perubahan.length > 0 && (
        <ul className="glass mb-3 divide-y divide-line overflow-hidden">
          {ta.perubahan.map((p) => (
            <li key={p.id} className="flex items-center gap-3 p-3 text-sm">
              <FilePenLine className="h-4 w-4 shrink-0 text-cyan" aria-hidden />
              <span className="flex-1">{p.jenis === 'JUDUL' ? 'Judul' : 'Pembimbing'}: {p.jenis === 'PEMBIMBING' ? dosen.find((d) => d.id === p.usulan)?.nama ?? p.usulan : p.usulan}</span>
              <Badge tone={p.status === 'DISETUJUI' ? 'green' : p.status === 'DITOLAK' ? 'red' : 'blue'}>{p.status === 'DIAJUKAN' ? 'Menunggu' : p.status === 'DISETUJUI' ? 'Disetujui' : 'Ditolak'}</Badge>
            </li>
          ))}
        </ul>
      )}
      {buka ? (
        <form
          className="glass space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!bisa) return
            onAjukan({ jenis, usulan: usulan.trim(), alasan: alasan.trim() })
            setBuka(false)
            setUsulan('')
            setAlasan('')
          }}
        >
          <label className="block text-sm font-semibold">
            Yang diubah
            <select value={jenis} onChange={(e) => (setJenis(e.target.value as PermintaanPerubahan['jenis']), setUsulan(''))} className={input}>
              <option value="JUDUL">Judul</option>
              <option value="PEMBIMBING">Pembimbing</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Usulan
            {jenis === 'JUDUL' ? (
              <input value={usulan} onChange={(e) => setUsulan(e.target.value)} className={input} />
            ) : (
              <select value={usulan} onChange={(e) => setUsulan(e.target.value)} className={input}>
                <option value="">Pilih dosen…</option>
                {dosen.filter((d) => !ta.pembimbing.includes(d.id)).map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            )}
          </label>
          <label className="block text-sm font-semibold">
            Alasan
            <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} minLength={10} className={`${input} min-h-20 py-2`} />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setBuka(false)} className="min-h-11 flex-1 rounded-xl bg-glass-strong text-sm font-semibold">Batal</button>
            <button disabled={!bisa} className="btn-primary min-h-11 flex-1 rounded-xl text-sm font-semibold">Ajukan perubahan</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setBuka(true)} className="glass glass-hover min-h-12 w-full text-sm font-semibold">Ajukan perubahan</button>
      )}
    </Section>
  )
}

/* ================= Dosen (DEMO) ================= */

// TODO(BFF-AUTHZ): hak akses dosen harus ditegakkan server (dosen hanya melihat pengajuan yang memilihnya).
// Di mode demo peran bisa diganti dari Profil, jadi layar ini TIDAK aman dan selalu berlabel demo.
function SisiDosen({ user }: { user: User }) {
  const antrian = useResource(sumber.ta.antrian)
  const dosen = useResource(sumber.ta.ringkasan)
  const [pesan, setPesan] = useState('')
  const nama = (id: string) => dosen.data?.data.dosen.find((d) => d.id === id)?.nama ?? id

  const putuskan = async (ta: TugasAkhir, p: Peristiwa, extra: { pembimbing?: string[]; catatan?: string }) => {
    setPesan('')
    try {
      await sumber.ta.peristiwa({ taId: ta.id, peristiwa: p, ...extra }, PELAKU[user.role])
      setPesan(p === 'SETUJUI_JUDUL' ? 'Judul disetujui dan pembimbing ditetapkan (demo).' : 'Pengajuan ditolak dengan alasan (demo).')
      antrian.reload()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }

  return (
    <>
      <div className="glass mb-4 flex gap-3 p-4 text-sm" role="note">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber" aria-hidden />
        <p><strong>Tampilan dosen (demo).</strong> Peran bisa diganti dari Profil dan hak akses belum ditegakkan server, jadi layar ini belum boleh dianggap aman.</p>
      </div>
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      <Section title="Pengajuan judul menunggu keputusan">
        {antrian.loading && !antrian.data ? (
          <Skeleton rows={2} />
        ) : !antrian.data?.data.length ? (
          <p className="glass p-4 text-sm text-mid">Tidak ada pengajuan yang menunggu.</p>
        ) : (
          <ul className="space-y-3">
            {antrian.data.data.map((ta) => <KartuPengajuan key={ta.id} ta={ta} nama={nama} onPutus={putuskan} />)}
          </ul>
        )}
      </Section>
      <BimbinganDosen aturan={aturanUntuk(user.prodi)} />
    </>
  )
}

function KartuPengajuan({ ta, nama, onPutus }: { ta: TugasAkhir; nama: (id: string) => string; onPutus: (ta: TugasAkhir, p: Peristiwa, extra: { pembimbing?: string[]; catatan?: string }) => void }) {
  const [pembimbing, setPembimbing] = useState(ta.pilihanPembimbing[0] ?? '')
  const [tolak, setTolak] = useState(false)
  const [alasan, setAlasan] = useState('')
  const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
  const baris = (label: string, isi: ReactNode) => <p className="mt-1 text-sm"><span className="text-mid">{label}:</span> {isi}</p>
  return (
    <li className="glass p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{ta.judul}</h3>
        <Badge tone="blue">Diajukan</Badge>
      </div>
      {baris('Bidang', ta.bidang)}
      {baris('Abstrak', ta.abstrak)}
      {baris('Metode', ta.metode)}
      {baris('Pilihan pembimbing', ta.pilihanPembimbing.map((id, i) => `${i + 1}. ${nama(id)}`).join(' · '))}
      {tolak ? (
        <div className="mt-3">
          <label className="block text-sm font-semibold">
            Alasan penolakan
            <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} className={`${input} min-h-20 py-2`} />
          </label>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setTolak(false)} className="min-h-11 flex-1 rounded-xl bg-glass-strong text-sm font-semibold">Batal</button>
            <button disabled={!alasan.trim()} onClick={() => onPutus(ta, 'TOLAK_JUDUL', { catatan: alasan })} className="min-h-11 flex-1 rounded-xl bg-rose text-sm font-semibold text-white disabled:opacity-50">Tolak</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-48 flex-1 text-sm font-semibold">
            Tetapkan pembimbing
            <select value={pembimbing} onChange={(e) => setPembimbing(e.target.value)} className={input}>
              {ta.pilihanPembimbing.map((id) => <option key={id} value={id}>{nama(id)}</option>)}
            </select>
          </label>
          <button disabled={!pembimbing} onClick={() => onPutus(ta, 'SETUJUI_JUDUL', { pembimbing: [pembimbing] })} className="btn-primary inline-flex min-h-11 items-center gap-1 rounded-xl px-4 text-sm font-semibold"><Check className="h-4 w-4" aria-hidden /> Setujui</button>
          <button onClick={() => setTolak(true)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-glass-strong px-4 text-sm font-semibold"><X className="h-4 w-4" aria-hidden /> Tolak…</button>
        </div>
      )}
    </li>
  )
}
