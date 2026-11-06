import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarPlus, CheckCircle2, Circle, Clock, FileUp, Hourglass, MapPin, ShieldAlert, UserRound, XCircle } from 'lucide-react'
import type { AturanProdi, AturanUjian } from '../../data/aturan-akademik'
import { aturanUjian } from '../../lib/akademik/aturan'
import { buatIcs } from '../../lib/akademik/ics-ujian'
import { evaluasiKelayakan } from '../../lib/akademik/kelayakan'
import { bimbinganSah, sha256Hex } from '../../lib/akademik/logbook'
import { checklistBerkas, jenisTersedia, profilUjianAkhir, siapKirim, validasiBerkasUjian, validasiSlot, type AksiPendaftaran } from '../../lib/akademik/pendaftaran'
import type { Dosen, JenisUjianAkhir, Logbook, PendaftaranUjianAkhir, StatusPendaftaran, TugasAkhir } from '../../lib/akademik/types'
import { bacaBerkas } from '../../lib/berkas'
import { sumber } from '../../lib/sumber'
import { useResource } from '../../lib/useResource'
import { Badge, LinkBtn, Section, Skeleton } from '../../components/ui'
import { HasilUjianMahasiswa } from './Penilaian'

// T05 Pendaftaran ujian akhir: kelayakan, checklist berkas, persetujuan pembimbing, pilih slot prodi,
// pembatalan/jadwal ulang, dan halaman persiapan. Kelayakan resmi dihitung server (jalankanAksi).

const zona = { timeZone: 'Asia/Jakarta' } as const
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...zona }).format(new Date(iso))
const jam = (iso: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', ...zona }).format(new Date(iso))
const LANGKAH: StatusPendaftaran[] = ['DRAF', 'MENUNGGU_PEMBIMBING', 'DIVERIFIKASI_PRODI', 'TERJADWAL']
const LABEL: Record<StatusPendaftaran, string> = { DRAF: 'Persiapan berkas', MENUNGGU_PEMBIMBING: 'Menunggu pembimbing', DIVERIFIKASI_PRODI: 'Pilih jadwal', TERJADWAL: 'Terjadwal', DIBATALKAN: 'Dibatalkan', SELESAI: 'Selesai' }
const STATUS_BERKAS = {
  BELUM: { teks: 'Belum diunggah', tone: 'slate', Icon: Circle },
  DIUNGGAH: { teks: 'Menunggu verifikasi', tone: 'blue', Icon: Hourglass },
  DIVERIFIKASI: { teks: 'Terverifikasi', tone: 'green', Icon: CheckCircle2 },
  DITOLAK: { teks: 'Ditolak', tone: 'red', Icon: XCircle },
} as const


/* ================= Mahasiswa ================= */

export function UjianAkhirMahasiswa({ ta, aturan, dosen, go, onBerubah }: { ta: TugasAkhir; aturan: AturanProdi; dosen: Dosen[]; go: (r: string) => void; onBerubah: () => void }) {
  const muat = useCallback(() => sumber.ta.ujianAkhir(ta.id), [ta.id])
  const muatLb = useCallback(() => sumber.ta.logbook(ta.id), [ta.id])
  const data = useResource(muat)
  const lb = useResource(muatLb)
  const profil = useResource(sumber.ujian.kelayakan)
  const tersedia = jenisTersedia(ta.status, aturan)
  const terjadwal = data.data?.data.pendaftaran.find((p) => p.status === 'TERJADWAL')
  const [jenis, setJenis] = useState<JenisUjianAkhir | null>(null)
  const [pesan, setPesan] = useState('')
  const [proses, setProses] = useState(false)

  const aktifUntuk = (j: JenisUjianAkhir) => data.data?.data.pendaftaran.filter((p) => p.jenis === j && p.status !== 'DIBATALKAN').at(-1)
  // Urutan: pilihan pengguna → yang terjadwal → yang sedang berjalan → satu-satunya jenis yang tersedia.
  const pilihan = jenis ?? terjadwal?.jenis ?? tersedia.find((j) => aktifUntuk(j)) ?? (tersedia.length === 1 ? tersedia[0] : null)
  // Tetap tampil bila ada ujian yang sudah selesai: hasil & butir revisi dibutuhkan saat tahap revisi.
  const adaSelesai = !!data.data?.data.pendaftaran.some((p) => p.status === 'SELESAI')
  if (!terjadwal && tersedia.length === 0 && !adaSelesai) return null
  if (data.error || lb.error || profil.error) return <Section title="Ujian akhir"><p className="glass p-4 text-sm text-mid">{(data.error ?? lb.error ?? profil.error)!.message}</p></Section>
  if (!data.data || !lb.data || !profil.data) return <Section title="Ujian akhir"><Skeleton rows={2} /></Section>

  const jalan = async (fn: () => Promise<{ asal: string }>, ok: string) => {
    setProses(true)
    setPesan('')
    try {
      const r = await fn()
      setPesan(r.asal === 'contoh' ? `${ok} (data contoh, tersimpan di perangkat ini).` : ok)
      data.reload()
      onBerubah()
    } catch (e) {
      setPesan((e as Error).message)
    } finally {
      setProses(false)
    }
  }
  const p = pilihan ? aktifUntuk(pilihan) : undefined

  return (
    <Section title="Ujian akhir">
      {data.data.data.pendaftaran.filter((x) => x.status === 'SELESAI' && x.jenis !== pilihan).map((x) => (
        <div key={x.id} className="mb-3">
          <h3 className="mb-1 text-sm font-semibold">{aturanUjian(aturan, x.jenis).nama} (selesai)</h3>
          <HasilUjianMahasiswa pendaftaranId={x.id} dosen={dosen} />
        </div>
      ))}
      {!terjadwal && tersedia.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Jenis ujian akhir">
          {tersedia.map((j) => (
            <button key={j} onClick={() => setJenis(j)} aria-pressed={pilihan === j} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${pilihan === j ? 'btn-primary' : 'bg-glass-strong'}`}>
              {aturanUjian(aturan, j).nama}
            </button>
          ))}
        </div>
      )}
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      {!pilihan ? (
        tersedia.length > 0 && <p className="glass p-4 text-sm text-mid">Pilih jenis ujian akhir.</p>
      ) : !p ? (
        <div className="glass p-4 text-sm">
          <p>Belum ada pendaftaran {aturanUjian(aturan, pilihan).nama}.</p>
          <button disabled={proses} onClick={() => jalan(() => sumber.ta.buatPendaftaran(ta.id, pilihan), 'Pendaftaran dibuat')} className="btn-primary mt-3 min-h-11 rounded-xl px-4 font-semibold">Mulai pendaftaran {aturanUjian(aturan, pilihan).nama}</button>
        </div>
      ) : (
        <Pendaftaran
          p={p}
          ta={ta}
          aturan={aturanUjian(aturan, p.jenis)}
          dosen={dosen}
          lb={lb.data.data}
          profil={profil.data.data}
          slot={data.data.data.slot}
          sesiMahasiswa={data.data.data.sesiMahasiswa}
          jadwalPenguji={data.data.data.jadwalPenguji}
          proses={proses}
          go={go}
          onAksi={(aksi, opsi = {}, ok = 'Status pendaftaran diperbarui') => jalan(() => sumber.ta.aksiPendaftaran(p.id, aksi, opsi, 'MAHASISWA'), ok)}
          onUnggah={(meta) => jalan(() => sumber.ta.unggahBerkasUjian(p.id, meta), 'Berkas dicatat dan menunggu verifikasi')}
          onGalat={setPesan}
        />
      )}
    </Section>
  )
}

function Pendaftaran(props: {
  p: PendaftaranUjianAkhir
  ta: TugasAkhir
  aturan: AturanUjian
  dosen: Dosen[]
  lb: Logbook
  profil: Parameters<typeof profilUjianAkhir>[0]
  slot: Parameters<typeof validasiSlot>[0][]
  sesiMahasiswa: Parameters<typeof validasiSlot>[1]
  jadwalPenguji: Parameters<typeof validasiSlot>[2]
  proses: boolean
  go: (r: string) => void
  onAksi: (aksi: AksiPendaftaran, opsi?: { slotId?: string; catatan?: string }, ok?: string) => void
  onUnggah: (meta: { id: string; nama: string; ukuran: number; tipe: string; sha256: string }) => void
  onGalat: (m: string) => void
}) {
  const { p, aturan, lb, proses, onAksi } = props
  const h = useMemo(() => evaluasiKelayakan(profilUjianAkhir(props.profil, bimbinganSah(lb.entri).length, p), aturan), [props.profil, lb, p, aturan])
  const kirim = siapKirim(h, aturan, p)
  const idx = LANGKAH.indexOf(p.status)

  return (
    <div className="space-y-4">
      <ol className="glass flex gap-1 p-4" aria-label={`Tahap pendaftaran: ${LABEL[p.status]}`}>
        {LANGKAH.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-cyan' : 'bg-glass-strong'}`} />
            <div className={`mt-1 text-[11px] ${i === idx ? 'font-semibold text-hi' : 'text-low'}`}>{LABEL[s]}</div>
          </li>
        ))}
      </ol>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Syarat {aturan.nama}{aturan.sumber === null && <span className="font-normal text-low"> · ketentuan contoh</span>}</h3>
        <ul className="glass divide-y divide-line overflow-hidden" aria-label={h.layak ? 'Semua syarat terpenuhi' : 'Ada syarat yang belum terpenuhi'}>
          {h.syarat.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3 text-sm">
              {s.terpenuhi ? <CheckCircle2 className="h-5 w-5 shrink-0 text-mint" aria-label="terpenuhi" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber" aria-label="belum terpenuhi" />}
              <span className="flex-1"><strong>{s.label}:</strong> {s.alasan}</span>
              {!s.terpenuhi && s.tautanPerbaikan && s.tautanPerbaikan !== 'ta' && <LinkBtn onClick={() => props.go(s.tautanPerbaikan!)}>Lihat</LinkBtn>}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-low">Biaya ujian (bila ada) muncul sebagai tagihan di <button className="font-semibold text-cyan underline" onClick={() => props.go('keuangan')}>Keuangan</button>; status lunas dicek server.</p>
      </div>

      <Checklist {...props} />

      {p.status === 'DRAF' && (
        <div className="glass p-4 text-sm">
          {!kirim.ok && (
            <ul className="mb-3 list-disc space-y-0.5 pl-5 text-mid" aria-label="Yang masih kurang">
              {kirim.kurang.map((k) => <li key={k}>{k}</li>)}
            </ul>
          )}
          <button disabled={!kirim.ok || proses} onClick={() => onAksi('KIRIM', {}, 'Diajukan ke pembimbing')} className="btn-primary min-h-12 w-full rounded-2xl font-semibold">Ajukan ke pembimbing</button>
          {p.riwayat.at(-1)?.aksi === 'TOLAK_PEMBIMBING' && <p className="mt-2 text-xs text-rose">Dikembalikan pembimbing: {p.riwayat.at(-1)?.catatan}</p>}
        </div>
      )}
      {p.status === 'MENUNGGU_PEMBIMBING' && <p className="glass p-4 text-sm text-mid">Menunggu pembimbing memeriksa berkas dan menyetujui pendaftaran.</p>}
      {p.status === 'DIVERIFIKASI_PRODI' && <PilihSlot {...props} layak={h.layak} />}
      {p.status === 'TERJADWAL' && <Persiapan {...props} />}
      {(p.status === 'TERJADWAL' || p.status === 'SELESAI') && <HasilUjianMahasiswa pendaftaranId={p.id} dosen={props.dosen} />}
      {['MENUNGGU_PEMBIMBING', 'DIVERIFIKASI_PRODI', 'TERJADWAL'].includes(p.status) && <Batal {...props} />}

      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-cyan">Riwayat pendaftaran ({p.riwayat.length})</summary>
        <ul className="glass divide-y divide-line overflow-hidden text-xs">
          {p.riwayat.map((r, i) => <li key={i} className="p-3">{LABEL[r.dari]} → {LABEL[r.ke]} · {tgl(r.waktu)} {jam(r.waktu)}{r.catatan ? ` · ${r.catatan}` : ''}</li>)}
        </ul>
      </details>
    </div>
  )
}

function Checklist({ p, aturan, proses, onUnggah, onGalat }: Parameters<typeof Pendaftaran>[0]) {
  const baris = checklistBerkas(aturan, p.berkas)
  if (baris.length === 0) return null
  const pilih = async (id: string, f: File | undefined, input: HTMLInputElement) => {
    if (!f) return
    const a = aturan.berkas!.find((x) => x.id === id)!
    const g = validasiBerkasUjian(f, a)
    if (g) return (onGalat(g), (input.value = ''))
    onUnggah({ id, nama: f.name, ukuran: f.size, tipe: f.type, sha256: await sha256Hex(await bacaBerkas(f)) })
    input.value = ''
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Berkas</h3>
      <ul className="space-y-2">
        {baris.map((b) => {
          const st = STATUS_BERKAS[b.status]
          return (
            <li key={b.aturan.id} className="glass p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{b.aturan.label} {b.aturan.wajib ? <span className="text-xs font-normal text-rose">(wajib)</span> : <span className="text-xs font-normal text-low">(opsional)</span>}</div>
                  <div className="text-xs text-low">{b.aturan.tipe.map((t) => t.split('/')[1].toUpperCase().replace('JPEG', 'JPG')).join('/')} · maks {b.aturan.maksMB} MB{b.aturan.keterangan ? ` · ${b.aturan.keterangan}` : ''}</div>
                </div>
                <Badge tone={st.tone}><st.Icon className="h-3 w-3" aria-hidden /> {st.teks}</Badge>
              </div>
              {b.berkas && <div className="mt-1 text-xs text-mid">{b.berkas.nama} · SHA-256 {b.berkas.sha256.slice(0, 12)}…</div>}
              {b.status === 'DITOLAK' && b.berkas?.alasan && <div className="mt-1 text-xs text-rose">Alasan: {b.berkas.alasan}</div>}
              {p.status === 'DRAF' && (
                <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                  <FileUp className="h-4 w-4" aria-hidden /> {b.status === 'BELUM' ? 'Unggah' : 'Unggah ulang'}
                  <input type="file" disabled={proses} accept={b.aturan.tipe.join(',')} className="sr-only" aria-label={`Unggah ${b.aturan.label}`} onChange={(e) => pilih(b.aturan.id, e.target.files?.[0], e.target)} />
                </label>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-2 text-xs text-amber" role="note">Berkas belum dikirim ke server kampus (layanan penyimpanan/DrivePAM belum tersedia). Yang dicatat: nama, ukuran, dan hash SHA-256.</p>
    </div>
  )
}

function PilihSlot({ p, slot, sesiMahasiswa, jadwalPenguji, dosen, proses, onAksi, layak }: Parameters<typeof Pendaftaran>[0] & { layak: boolean }) {
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  const daftar = slot.filter((s) => s.jenis === p.jenis).sort((a, b) => a.mulai.localeCompare(b.mulai))
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Pilih jadwal dari prodi</h3>
      {!layak && <p className="mb-2 text-xs text-rose">Belum semua syarat terpenuhi; slot belum bisa dipilih.</p>}
      {daftar.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Prodi belum membuka slot untuk ujian ini.</p>
      ) : (
        <ul className="space-y-2">
          {daftar.map((s) => {
            const g = validasiSlot(s, sesiMahasiswa, jadwalPenguji, Date.now())
            return (
              <li key={s.id} className="glass p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{tgl(s.mulai)}, {jam(s.mulai)}–{jam(s.selesai)}</div>
                    <div className="text-xs text-mid">{s.ruang} · sisa {Math.max(0, s.kapasitas - s.terisi)} dari {s.kapasitas} · penguji: {s.penguji.map(nama).join(', ')}</div>
                    {g && <div className="mt-1 text-xs font-semibold text-rose">{g}</div>}
                  </div>
                  <button disabled={!!g || !layak || proses} onClick={() => onAksi('PILIH_SLOT', { slotId: s.id }, 'Ujian terjadwal')} className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold" aria-label={`Pilih slot ${tgl(s.mulai)} ${jam(s.mulai)}`}>Pilih</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Persiapan({ p, aturan, lb, dosen }: Parameters<typeof Pendaftaran>[0]) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  if (!p.sesi) return null
  const s = p.sesi
  const sisa = Date.parse(s.mulai) - now
  const hari = Math.floor(sisa / 86_400_000)
  const jamSisa = Math.floor((sisa % 86_400_000) / 3_600_000)
  const draf = [...lb.versi].sort((a, b) => b.versi - a.versi)[0]
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  const ics = () => {
    const url = URL.createObjectURL(new Blob([buatIcs([{ ...s, nama: aturan.nama }], () => aturan.nama)], { type: 'text/calendar' }))
    Object.assign(document.createElement('a'), { href: url, download: `${p.jenis.toLowerCase()}.ics` }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <div className="glass p-4">
      <h3 className="text-base font-bold">Persiapan {aturan.nama}</h3>
      <p className="mt-1 text-2xl font-bold text-cyan" aria-live="polite">{sisa > 0 ? `${hari} hari ${jamSisa} jam lagi` : 'Sedang/sudah berlangsung'}</p>
      <div className="mt-3 space-y-1 text-sm">
        <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-cyan" aria-hidden /> {tgl(s.mulai)}, {jam(s.mulai)}–{jam(s.selesai)} WIB</p>
        <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose" aria-hidden /> {s.ruang}</p>
        <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-amber" aria-hidden /> Penguji: {s.petugas.map(nama).join(', ')}</p>
      </div>
      {aturan.bawaan && aturan.bawaan.length > 0 && (
        <>
          <h4 className="mt-3 text-sm font-semibold">Yang perlu dibawa</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-mid">{aturan.bawaan.map((b) => <li key={b}>{b}</li>)}</ul>
        </>
      )}
      <h4 className="mt-3 text-sm font-semibold">Draf terakhir yang diserahkan</h4>
      <p className="text-xs text-mid">{draf ? <>v{draf.versi} · {draf.nama}<br /><span className="break-all font-mono">SHA-256 {draf.sha256}</span></> : 'Belum ada versi draf di logbook.'}</p>
      <button onClick={ics} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold"><CalendarPlus className="h-4 w-4" aria-hidden /> Tambah ke kalender</button>
    </div>
  )
}

function Batal({ p, aturan, proses, onAksi }: Parameters<typeof Pendaftaran>[0]) {
  const [konfirmasi, setKonfirmasi] = useState<AksiPendaftaran | null>(null)
  const jamLagi = p.sesi ? (Date.parse(p.sesi.mulai) - Date.now()) / 3_600_000 : Infinity
  const lewat = aturan.batasBatalJam !== undefined && jamLagi < aturan.batasBatalJam
  return (
    <div className="text-sm">
      {aturan.batasBatalJam !== undefined && <p className="text-xs text-low">Pembatalan/penjadwalan ulang paling lambat {aturan.batasBatalJam} jam sebelum ujian{lewat && ' — batas sudah lewat'}.</p>}
      {konfirmasi ? (
        <div className="glass mt-2 p-3" role="alertdialog" aria-label="Konfirmasi">
          <p className="font-semibold">{konfirmasi === 'BATALKAN' ? 'Batalkan pendaftaran?' : 'Lepas jadwal dan pilih slot lain?'}</p>
          {aturan.konsekuensiBatal && <p className="mt-1 text-xs text-mid">{aturan.konsekuensiBatal}</p>}
          <div className="mt-2 flex gap-2">
            <button onClick={() => setKonfirmasi(null)} className="min-h-11 flex-1 rounded-xl bg-glass-strong font-semibold">Tidak</button>
            <button disabled={proses} onClick={() => (onAksi(konfirmasi, {}, konfirmasi === 'BATALKAN' ? 'Pendaftaran dibatalkan' : 'Jadwal dilepas, silakan pilih slot lain'), setKonfirmasi(null))} className="min-h-11 flex-1 rounded-xl bg-rose font-semibold text-white">Ya, lanjutkan</button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {p.status === 'TERJADWAL' && <button disabled={lewat} onClick={() => setKonfirmasi('JADWAL_ULANG')} className="min-h-11 rounded-xl bg-glass-strong px-4 font-semibold">Jadwal ulang</button>}
          <button disabled={lewat} onClick={() => setKonfirmasi('BATALKAN')} className="min-h-11 rounded-xl bg-glass-strong px-4 font-semibold text-rose">Batalkan pendaftaran</button>
        </div>
      )}
    </div>
  )
}

/* ================= Dosen (DEMO) ================= */

// TODO(BFF-AUTHZ): hanya pembimbing mahasiswa yang bersangkutan yang boleh memeriksa dan menyetujui.
export function AntrianUjianDosen({ aturan }: { aturan: AturanProdi }) {
  const res = useResource(sumber.ta.antrianUjianAkhir)
  const [pesan, setPesan] = useState('')
  const jalan = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      setPesan(ok)
      res.reload()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  return (
    <Section title="Pendaftaran ujian akhir menunggu persetujuan">
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      {!res.data ? (
        <Skeleton rows={1} />
      ) : res.data.data.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Tidak ada pendaftaran yang menunggu.</p>
      ) : (
        <ul className="space-y-3">
          {res.data.data.map(({ ta, pendaftaran: p }) => (
            <KartuPendaftaranDosen
              key={p.id}
              ta={ta}
              p={p}
              aturan={aturanUjian(aturan, p.jenis)}
              onVerifikasi={(id, st, alasan) => jalan(() => sumber.ta.verifikasiBerkasUjian(p.id, id, st, alasan), st === 'DIVERIFIKASI' ? 'Berkas diverifikasi (demo).' : 'Berkas ditolak (demo).')}
              onPutus={(aksi, catatan) => jalan(() => sumber.ta.aksiPendaftaran(p.id, aksi, { catatan }, 'DOSEN'), aksi === 'SETUJUI_PEMBIMBING' ? 'Pendaftaran disetujui dan diteruskan ke prodi (demo).' : 'Pendaftaran dikembalikan ke mahasiswa (demo).')}
            />
          ))}
        </ul>
      )}
    </Section>
  )
}

function KartuPendaftaranDosen({ ta, p, aturan, onVerifikasi, onPutus }: { ta: TugasAkhir; p: PendaftaranUjianAkhir; aturan: AturanUjian; onVerifikasi: (id: string, st: 'DIVERIFIKASI' | 'DITOLAK', alasan?: string) => void; onPutus: (aksi: 'SETUJUI_PEMBIMBING' | 'TOLAK_PEMBIMBING', catatan?: string) => void }) {
  const [alasan, setAlasan] = useState<Record<string, string>>({})
  const [kembali, setKembali] = useState('')
  const baris = checklistBerkas(aturan, p.berkas)
  const semuaOk = baris.every((b) => !b.aturan.wajib || b.status === 'DIVERIFIKASI')
  return (
    <li className="glass p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{ta.judul}</h3>
        <Badge tone="blue">{aturan.nama}</Badge>
      </div>
      <ul className="mt-2 space-y-2">
        {baris.filter((b) => b.berkas).map((b) => (
          <li key={b.aturan.id} className="rounded-xl bg-glass-strong p-3">
            <div className="flex items-center justify-between gap-2">
              <span><strong>{b.aturan.label}</strong> · {b.berkas!.nama}</span>
              <Badge tone={STATUS_BERKAS[b.status].tone}>{STATUS_BERKAS[b.status].teks}</Badge>
            </div>
            {b.status === 'DIUNGGAH' && (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <button onClick={() => onVerifikasi(b.aturan.id, 'DIVERIFIKASI')} className="btn-primary min-h-11 rounded-xl px-3 text-xs font-semibold">Verifikasi</button>
                <input value={alasan[b.aturan.id] ?? ''} onChange={(e) => setAlasan({ ...alasan, [b.aturan.id]: e.target.value })} aria-label={`Alasan menolak ${b.aturan.label}`} placeholder="Alasan bila ditolak" className="min-h-11 flex-1 rounded-xl border border-line bg-glass px-3 text-xs" />
                <button disabled={!alasan[b.aturan.id]?.trim()} onClick={() => onVerifikasi(b.aturan.id, 'DITOLAK', alasan[b.aturan.id])} className="min-h-11 rounded-xl bg-rose px-3 text-xs font-semibold text-white disabled:opacity-50">Tolak berkas</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <button disabled={!semuaOk} onClick={() => onPutus('SETUJUI_PEMBIMBING')} className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold">Setujui pendaftaran</button>
        <input value={kembali} onChange={(e) => setKembali(e.target.value)} aria-label="Alasan mengembalikan pendaftaran" placeholder="Alasan bila dikembalikan" className="min-h-11 flex-1 rounded-xl border border-line bg-glass-strong px-3 text-sm" />
        <button disabled={!kembali.trim()} onClick={() => onPutus('TOLAK_PEMBIMBING', kembali)} className="min-h-11 rounded-xl bg-glass-strong px-4 text-sm font-semibold">Kembalikan</button>
      </div>
      {!semuaOk && <p className="mt-1 flex items-center gap-1 text-xs text-low"><ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Persetujuan aktif setelah semua berkas wajib diverifikasi.</p>}
    </li>
  )
}
