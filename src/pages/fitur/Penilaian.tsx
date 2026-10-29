import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Clock, EyeOff, Lock, Plus, Printer, Trash2 } from 'lucide-react'
import type { AturanProdi, Rubrik } from '../../data/aturan-akademik'
import { aturanUjian, rubrikUntuk } from '../../lib/akademik/aturan'
import { hitungNilaiPratinjau } from '../../lib/akademik/nilai'
import { jendelaPenilaian, validasiLembar } from '../../lib/akademik/penilaian'
import type { Dosen, HasilUjian, LembarPenilaian } from '../../lib/akademik/types'
import { USE_DEMO } from '../../lib/api'
import { cetak } from '../../lib/cetak'
import { usePref } from '../../lib/prefs'
import { sumber } from '../../lib/sumber'
import type { UjianPenguji } from '../../lib/sumber/ta'
import { useResource } from '../../lib/useResource'
import { Badge, Section, Skeleton } from '../../components/ui'

// T06 Hari ujian (sisi penguji, DEMO sampai otorisasi server). TODO(BFF-AUTHZ): identitas penguji dari
// sesi dosen; kerahasiaan lembar antar penguji ditegakkan server (lembarTerlihat).

const zona = { timeZone: 'Asia/Jakarta' } as const
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', ...zona }).format(new Date(iso))
const jam = (iso: string) => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', ...zona }).format(new Date(iso))
const LABEL_REK: Record<LembarPenilaian['rekomendasi'], string> = { LULUS: 'Lulus', LULUS_REVISI: 'Lulus dengan revisi', TIDAK_LULUS: 'Tidak lulus' }

export function UjianSayaDosen({ aturan, dosen }: { aturan: AturanProdi; dosen: Dosen[] }) {
  // DEMO: dosen memilih identitas penguji untuk memperagakan beberapa penguji di satu perangkat.
  const [tersimpan, setPenguji] = usePref<string>('ta:penguji-demo', '')
  // Daftar dosen dimuat belakangan: pilihan kosong/tidak dikenal jatuh ke dosen pertama.
  const penguji = dosen.some((d) => d.id === tersimpan) ? tersimpan : (dosen[0]?.id ?? '')
  const muat = useCallback(() => sumber.ta.ujianSaya(penguji), [penguji])
  const res = useResource(muat)
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  return (
    <Section title="Ujian yang saya uji">
      <label className="mb-3 block text-sm font-semibold">
        Bertindak sebagai penguji (demo)
        <select value={penguji} onChange={(e) => setPenguji(e.target.value)} className="mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3">
          {dosen.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
        </select>
      </label>
      {!res.data ? (
        <Skeleton rows={1} />
      ) : res.data.data.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Tidak ada ujian terjadwal untuk {nama(penguji)}.</p>
      ) : (
        <ul className="space-y-3">
          {/* key memuat penguji: state kartu (simulasi, lembar terbuka) tidak boleh terbawa ke penguji lain */}
          {res.data.data.map((u) => <KartuUjian key={`${penguji}:${u.pendaftaran.id}`} u={u} aturan={aturan} penguji={penguji} nama={nama} onBerubah={res.reload} />)}
        </ul>
      )}
    </Section>
  )
}

function KartuUjian({ u, aturan, penguji, nama, onBerubah }: { u: UjianPenguji; aturan: AturanProdi; penguji: string; nama: (id: string) => string; onBerubah: () => void }) {
  const s = u.pendaftaran.sesi!
  const au = aturanUjian(aturan, u.pendaftaran.jenis)
  const rubrik = rubrikUntuk(aturan, u.pendaftaran.jenis)
  const [simulasi, setSimulasi] = useState(false)
  const [buka, setBuka] = useState(false)
  const [pesan, setPesan] = useState('')
  const now = simulasi ? Date.parse(s.mulai) + 30 * 60_000 : Date.now()
  const j = jendelaPenilaian(s, au, now)
  const milik = u.penilaian.lembar.find((l) => l.pengujiId === penguji && l.dikirim)
  const hasil = u.penilaian.hasil

  return (
    <li className="glass p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{u.ta.judul}</h3>
          <p className="text-xs text-mid">{au.nama} · {tgl(s.mulai)}, {jam(s.mulai)}–{jam(s.selesai)} · {s.ruang}</p>
          <p className="text-xs text-low">Penguji: {s.petugas.map(nama).join(', ')}</p>
        </div>
        {hasil ? <Badge tone="green">Hasil dirilis</Badge> : milik ? <Badge tone="blue">Lembar terkirim</Badge> : <Badge tone="amber">Belum dinilai</Badge>}
      </div>
      <p className="mt-2 text-xs text-mid">Draf terakhir: {u.drafTerakhir ? <>v{u.drafTerakhir.versi} · {u.drafTerakhir.nama} · <span className="font-mono">SHA-256 {u.drafTerakhir.sha256.slice(0, 16)}…</span></> : 'belum ada versi draf'}</p>

      {!milik && !hasil && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-xs text-low"><Clock className="h-3.5 w-3.5" aria-hidden /> Lembar dibuka {tgl(j.buka.toISOString())} {jam(j.buka.toISOString())} s.d. {tgl(j.tutup.toISOString())} {jam(j.tutup.toISOString())}{au.sumber === null && ' (ketentuan contoh)'}</p>
          {USE_DEMO && (
            <label className="mt-2 flex min-h-11 items-center gap-2 text-xs font-semibold">
              <input type="checkbox" checked={simulasi} onChange={(e) => setSimulasi(e.target.checked)} className="h-4 w-4" /> Simulasikan hari ujian (demo)
            </label>
          )}
          {!buka ? (
            <button disabled={!j.terbuka || !rubrik} onClick={() => setBuka(true)} className="btn-primary mt-2 min-h-11 rounded-xl px-4 font-semibold">Buka lembar penilaian</button>
          ) : (
            rubrik && <LembarForm u={u} rubrik={rubrik} penguji={penguji} simulasiWaktu={simulasi ? now : undefined} onTerkirim={() => (setBuka(false), setPesan('Lembar penilaian terkirim dan bersifat final.'), onBerubah())} />
          )}
          {!j.terbuka && <p className="mt-1 text-xs text-mid">{j.alasan}</p>}
        </div>
      )}
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-mid">{pesan}</p>

      {milik && !u.lengkap && (
        <p className="flex items-center gap-1.5 text-xs text-mid"><EyeOff className="h-3.5 w-3.5" aria-hidden /> Penilaian penguji lain disembunyikan sampai semua penguji mengirim.</p>
      )}
      {u.lengkap && rubrik && <RingkasanPenguji u={u} rubrik={rubrik} aturan={aturan} nama={nama} onBerubah={onBerubah} setPesan={setPesan} />}
      {hasil && <BeritaAcara u={u} aturan={aturan} nama={nama} hasil={hasil} />}
      <details className="mt-2 text-xs">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-cyan">Catatan audit ({u.penilaian.audit.length})</summary>
        <ul className="space-y-1 text-mid">{u.penilaian.audit.map((a, i) => <li key={i}>{tgl(a.kapan)} {jam(a.kapan)} · {nama(a.siapa)} · {a.apa}</li>)}</ul>
      </details>
    </li>
  )
}

const kosong = (rubrik: Rubrik, penguji: string): LembarPenilaian => ({ pengujiId: penguji, skor: rubrik.kriteria.map((k) => ({ kriteriaId: k.id, nilai: Number.NaN })), catatan: {}, rekomendasi: 'LULUS', revisi: [] })

function LembarForm({ u, rubrik, penguji, simulasiWaktu, onTerkirim }: { u: UjianPenguji; rubrik: Rubrik; penguji: string; simulasiWaktu?: number; onTerkirim: () => void }) {
  // Draf otomatis per ujian & penguji di perangkat ini (prefiks su:ta: dihapus saat keluar akun).
  const [l, setL] = usePref<LembarPenilaian>(`ta:lembar:${u.pendaftaran.id}:${penguji}`, kosong(rubrik, penguji))
  const [galat, setGalat] = useState<string[]>([])
  const [konfirmasi, setKonfirmasi] = useState(false)
  const [proses, setProses] = useState(false)
  useEffect(() => setGalat([]), [l])

  const setSkor = (id: string, v: string) => setL({ ...l, skor: l.skor.map((s) => (s.kriteriaId === id ? { ...s, nilai: v === '' ? Number.NaN : Number(v) } : s)) })
  const kirim = async () => {
    const g = validasiLembar(rubrik, l)
    if (g.length) return (setGalat(g), setKonfirmasi(false))
    setProses(true)
    try {
      await sumber.ta.kirimLembar(u.pendaftaran.id, { ...l, pengujiId: penguji }, simulasiWaktu)
      try {
        localStorage.removeItem(`su:ta:lembar:${u.pendaftaran.id}:${penguji}`)
      } catch {
        /* abaikan */
      }
      onTerkirim()
    } catch (e) {
      setGalat([(e as Error).message])
    } finally {
      setProses(false)
      setKonfirmasi(false)
    }
  }
  const input = 'mt-1 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'
  return (
    // noValidate: validasi bawaan browser (min/max) memblokir kiriman tanpa pesan yang jelas; validasiLembar yang menilai.
    <form noValidate className="mt-3 space-y-3" onSubmit={(e) => (e.preventDefault(), setKonfirmasi(true))} aria-label="Lembar penilaian">
      {rubrik.kriteria.map((k) => {
        const v = l.skor.find((s) => s.kriteriaId === k.id)?.nilai
        return (
          <fieldset key={k.id} className="rounded-xl bg-glass-strong p-3">
            <legend className="text-sm font-semibold">{k.label} <span className="text-xs font-normal text-low">· bobot {k.bobot}% · {k.min}–{k.maks}</span></legend>
            <label className="block text-xs font-semibold">Skor {k.label}<input type="number" min={k.min} max={k.maks} step="any" value={Number.isNaN(v) || v === undefined ? '' : v} onChange={(e) => setSkor(k.id, e.target.value)} className={input} /></label>
            <label className="mt-2 block text-xs font-semibold">Catatan {k.label}<textarea value={l.catatan[k.id] ?? ''} onChange={(e) => setL({ ...l, catatan: { ...l.catatan, [k.id]: e.target.value } })} className={`${input} min-h-16 py-2`} /></label>
          </fieldset>
        )
      })}
      <fieldset>
        <legend className="text-sm font-semibold">Rekomendasi</legend>
        <div className="mt-1 flex flex-wrap gap-2" role="radiogroup">
          {(Object.keys(LABEL_REK) as LembarPenilaian['rekomendasi'][]).map((r) => (
            <label key={r} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-glass-strong px-3 text-sm">
              <input type="radio" name={`rek-${u.pendaftaran.id}`} checked={l.rekomendasi === r} onChange={() => setL({ ...l, rekomendasi: r })} /> {LABEL_REK[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold">Butir revisi</legend>
        {l.revisi.map((r, i) => (
          <div key={i} className="mt-2 grid gap-2 rounded-xl bg-glass-strong p-3 sm:grid-cols-[1fr_2fr_auto_auto]">
            <input aria-label={`Bagian revisi ${i + 1}`} placeholder="Bagian" value={r.bagian} onChange={(e) => setL({ ...l, revisi: l.revisi.map((x, j) => (j === i ? { ...x, bagian: e.target.value } : x)) })} className={input} />
            <input aria-label={`Permintaan revisi ${i + 1}`} placeholder="Permintaan" value={r.permintaan} onChange={(e) => setL({ ...l, revisi: l.revisi.map((x, j) => (j === i ? { ...x, permintaan: e.target.value } : x)) })} className={input} />
            <input aria-label={`Tenggat revisi ${i + 1}`} type="date" value={r.tenggat?.slice(0, 10) ?? ''} onChange={(e) => setL({ ...l, revisi: l.revisi.map((x, j) => (j === i ? { ...x, tenggat: e.target.value ? new Date(`${e.target.value}T23:59:00+07:00`).toISOString() : undefined } : x)) })} className={input} />
            <button type="button" onClick={() => setL({ ...l, revisi: l.revisi.filter((_, j) => j !== i) })} aria-label={`Hapus revisi ${i + 1}`} className="min-h-11 rounded-xl px-3 text-rose"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setL({ ...l, revisi: [...l.revisi, { bagian: '', permintaan: '' }] })} className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-xl bg-glass-strong px-3 text-sm font-semibold"><Plus className="h-4 w-4" aria-hidden /> Tambah butir revisi</button>
      </fieldset>
      {galat.length > 0 && <ul role="alert" className="list-disc pl-5 text-xs font-semibold text-rose">{galat.map((g) => <li key={g}>{g}</li>)}</ul>}
      <p className="text-xs text-low">Draf tersimpan otomatis. Setelah dikirim, lembar bersifat final dan tercatat waktunya.</p>
      {konfirmasi ? (
        <div className="rounded-xl bg-glass-strong p-3" role="alertdialog" aria-label="Konfirmasi kirim">
          <p className="font-semibold">Kirim lembar penilaian secara final?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setKonfirmasi(false)} className="min-h-11 flex-1 rounded-xl bg-glass font-semibold">Periksa lagi</button>
            <button type="button" disabled={proses} onClick={kirim} className="btn-primary min-h-11 flex-1 rounded-xl font-semibold">Kirim final</button>
          </div>
        </div>
      ) : (
        <button className="btn-primary min-h-12 w-full rounded-2xl font-semibold"><Lock className="mr-1 inline h-4 w-4" aria-hidden /> Kirim penilaian</button>
      )}
    </form>
  )
}

function RingkasanPenguji({ u, rubrik, aturan, nama, onBerubah, setPesan }: { u: UjianPenguji; rubrik: Rubrik; aturan: AturanProdi; nama: (id: string) => string; onBerubah: () => void; setPesan: (m: string) => void }) {
  const lembar = u.penilaian.lembar.filter((l) => l.dikirim)
  const pr = hitungNilaiPratinjau(rubrik, lembar, aturan.hurufMutu, aturan.desimal)
  const [keputusan, setKeputusan] = useState<HasilUjian['keputusan']>('LULUS')
  const rilis = async () => {
    try {
      await sumber.ta.rilisHasil(u.pendaftaran.id, keputusan)
      setPesan('Hasil dirilis ke mahasiswa (simulasi prodi, demo).')
      onBerubah()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  return (
    <div className="mt-3 rounded-xl bg-glass-strong p-3">
      <h4 className="text-sm font-semibold">Semua penguji sudah mengirim</h4>
      <ul className="mt-1 space-y-0.5 text-xs text-mid">
        {lembar.map((l, i) => <li key={l.pengujiId}>{nama(l.pengujiId)}: {pr.perPenguji[i]} · {LABEL_REK[l.rekomendasi]} · dikirim {jam(l.dikirim!)}</li>)}
      </ul>
      <p className="mt-2 text-sm">Nilai <strong>perkiraan</strong>: {pr.nilai} ({pr.huruf}). Nilai resmi ditetapkan sistem akademik.</p>
      {pr.perluKesepakatan && <p className="mt-1 flex gap-1.5 text-xs font-semibold text-amber"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> Selisih nilai antar penguji melebihi {rubrik.ambangSelisih} poin. Perlu rapat kesepakatan.</p>}
      {!u.penilaian.hasil && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold">Keputusan (simulasi prodi, demo)
            <select value={keputusan} onChange={(e) => setKeputusan(e.target.value as HasilUjian['keputusan'])} className="mt-1 block min-h-11 rounded-xl border border-line bg-glass px-3 text-sm">
              {(Object.keys(LABEL_REK) as HasilUjian['keputusan'][]).map((k) => <option key={k} value={k}>{LABEL_REK[k]}</option>)}
            </select>
          </label>
          <button onClick={rilis} className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold">Rilis hasil</button>
        </div>
      )}
    </div>
  )
}

function BeritaAcara({ u, aturan, nama, hasil }: { u: UjianPenguji; aturan: AturanProdi; nama: (id: string) => string; hasil: HasilUjian }) {
  const s = u.pendaftaran.sesi!
  const au = aturanUjian(aturan, u.pendaftaran.jenis)
  useEffect(() => {
    document.documentElement.classList.add('has-print-doc')
    return () => document.documentElement.classList.remove('has-print-doc')
  }, [])
  return (
    <>
      <button onClick={() => cetak(`berita-acara:${u.pendaftaran.id}`)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold"><Printer className="h-4 w-4" aria-hidden /> Cetak berita acara</button>
      {createPortal(
        <div className="print-doc" data-doc={`berita-acara:${u.pendaftaran.id}`} aria-hidden>
          <div className="pd-head">
            <img src="/brand/unpam-logo-256.webp" alt="" width={56} height={56} />
            <div>
              <div className="pd-title">Berita Acara {au.nama}</div>
              <div>Universitas Pamulang</div>
            </div>
          </div>
          <section className="pd-id">
            <dl>
              <dt>Judul</dt><dd>{u.ta.judul}</dd>
              <dt>Waktu</dt><dd>{tgl(s.mulai)}, {jam(s.mulai)}–{jam(s.selesai)} WIB</dd>
              <dt>Ruang</dt><dd>{s.ruang}</dd>
              <dt>Hasil</dt><dd>{LABEL_REK[hasil.keputusan]}{hasil.nilaiAkhir !== undefined ? ` · nilai ${hasil.nilaiAkhir} (${hasil.huruf})` : ''}</dd>
            </dl>
          </section>
          {hasil.revisi.length > 0 && (
            <table className="pd-table">
              <thead><tr><th>No</th><th>Bagian</th><th>Permintaan revisi</th><th>Penguji</th><th>Tenggat</th></tr></thead>
              <tbody>{hasil.revisi.map((r, i) => <tr key={r.id}><td>{i + 1}</td><td>{r.bagian}</td><td>{r.permintaan}</td><td>{nama(r.pengujiId)}</td><td>{r.tenggat ? tgl(r.tenggat) : '—'}</td></tr>)}</tbody>
            </table>
          )}
          <table className="pd-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Penguji</th><th>Tanda tangan</th></tr></thead>
            <tbody>{s.petugas.map((p) => <tr key={p}><td>{nama(p)}</td><td style={{ height: 36 }} /></tr>)}</tbody>
          </table>
          <div className="pd-foot">
            <span>Dirilis {tgl(hasil.dirilis)} {jam(hasil.dirilis)} dari Super UNPAM · Data contoh</span>
            <span>Tanda tangan elektronik resmi belum tersedia; kolom diisi sesuai prosedur prodi.</span>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/* ================= Mahasiswa ================= */

export function HasilUjianMahasiswa({ pendaftaranId, dosen }: { pendaftaranId: string; dosen: Dosen[] }) {
  const muat = useCallback(() => sumber.ta.hasilUjian(pendaftaranId), [pendaftaranId])
  const res = useResource(muat)
  if (!res.data) return null
  const h = res.data.data
  if (h.status === 'MENUNGGU') return <p className="glass flex items-center gap-2 p-4 text-sm text-mid" role="status"><Clock className="h-4 w-4 text-cyan" aria-hidden /> Menunggu hasil. Hasil tampil setelah dirilis prodi.</p>
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? 'Penguji'
  const { hasil } = h
  return (
    <div className="glass p-4 text-sm" role="status">
      <p className="flex items-center gap-2 font-semibold">
        {hasil.keputusan === 'TIDAK_LULUS' ? <AlertTriangle className="h-5 w-5 text-rose" aria-hidden /> : <CheckCircle2 className="h-5 w-5 text-mint" aria-hidden />}
        Hasil: {LABEL_REK[hasil.keputusan]}
      </p>
      {hasil.nilaiAkhir !== undefined && <p className="mt-1 text-mid">Nilai: {hasil.nilaiAkhir} ({hasil.huruf}){res.data.asal === 'contoh' && ' · data contoh'}</p>}
      <p className="text-xs text-low">Dirilis {tgl(hasil.dirilis)} {jam(hasil.dirilis)}</p>
      {hasil.revisi.length > 0 && (
        <>
          <h4 className="mt-3 font-semibold">Butir revisi</h4>
          <ol className="mt-1 space-y-2" aria-label="Butir revisi">
            {hasil.revisi.map((r) => (
              <li key={r.id} className="rounded-xl bg-glass-strong p-3">
                <div className="font-semibold">{r.bagian}</div>
                <div>{r.permintaan}</div>
                <div className="text-xs text-low">{nama(r.pengujiId)}{r.tenggat ? ` · tenggat ${tgl(r.tenggat)}` : ''}</div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
