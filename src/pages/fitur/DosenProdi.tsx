import { useCallback, useState } from 'react'
import { AlertTriangle, CalendarPlus, Download, Lock, LockOpen } from 'lucide-react'
import type { AturanProdi } from '../../data/aturan-akademik'
import { aturanUjian } from '../../lib/akademik/aturan'
import { csvRekap, kalenderDosen, pengujiTersedia, ringkasBimbingan, URUTAN_STATUS, urutPerhatian, validasiPenguji, type AgendaDosen, type PapanProdi, type PeranAgenda } from '../../lib/akademik/dosen-prodi'
import { buatIcsAgenda } from '../../lib/akademik/ics-ujian'
import { sisaKuota } from '../../lib/akademik/judul'
import type { Dosen, PendaftaranUjianAkhir, TugasAkhir } from '../../lib/akademik/types'
import { sumber } from '../../lib/sumber'
import { useResource } from '../../lib/useResource'
import { Badge, Section, Skeleton } from '../../components/ui'
import { LABEL_STATUS } from './label-ta'

// T08 Sisi dosen dan prodi. SELURUH layar ini DEMO: peran bisa diganti dari Profil dan hak akses belum
// ditegakkan server. TODO(BFF-AUTHZ) pada setiap akses data: identitas dosen dan cakupan prodi dari sesi.

const zona = { timeZone: 'Asia/Jakarta' } as const
const tgl = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', ...zona }).format(new Date(iso))
const jam = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...zona }).format(new Date(iso))
const input = 'mt-1.5 w-full min-h-11 rounded-xl border border-line bg-glass-strong px-3 outline-none focus:border-cyan'

function unduh(isi: BlobPart, nama: string, tipe: string) {
  const url = URL.createObjectURL(new Blob([isi], { type: tipe }))
  Object.assign(document.createElement('a'), { href: url, download: nama }).click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Peringatan wajib di setiap layar peran non-mahasiswa. */
export function PeringatanDemo({ peran }: { peran: 'dosen' | 'prodi' }) {
  return (
    <div className="glass mb-4 flex gap-3 p-4 text-sm" role="note">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber" aria-hidden />
      <p><strong>Tampilan {peran} (demo).</strong> Peran bisa diganti dari Profil dan hak akses belum ditegakkan server, jadi layar ini belum boleh dianggap aman. Semua data di sini contoh.</p>
    </div>
  )
}

/* ================= Dosen ================= */

export function IkhtisarBimbingan({ dosenId, aturan }: { dosenId: string; aturan: AturanProdi }) {
  const muatRev = useCallback(() => sumber.ta.revisiPenguji(dosenId), [dosenId])
  const bb = useResource(sumber.ta.bimbingan)
  const rev = useResource(muatRev)
  const [pesan, setPesan] = useState('')
  if (!bb.data || !rev.data) return <Section title="Ringkasan bimbingan"><Skeleton rows={2} /></Section>
  const now = Date.now()
  const daftar = urutPerhatian(bb.data.data.map(({ ta, logbook }) => ringkasBimbingan(ta, logbook, rev.data!.data.filter((r) => r.ta.id === ta.id).flatMap((r) => r.revisi), now, aturan)))
  const lbDari = (taId: string) => bb.data!.data.find((x) => x.ta.id === taId)!.logbook
  const setujui = async (ta: TugasAkhir) => {
    const e = lbDari(ta.id).entri.find((x) => x.status === 'MENUNGGU')
    if (!e) return
    try {
      await sumber.ta.verifikasiEntri(ta.id, e.id, 'DISETUJUI')
      setPesan(`Entri "${e.bagian}" disetujui (demo).`)
      bb.reload()
    } catch (err) {
      setPesan((err as Error).message)
    }
  }
  return (
    <Section title="Ringkasan bimbingan">
      <p role="status" aria-live="polite" className="mb-2 min-h-5 text-sm text-mid">{pesan}</p>
      {daftar.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Belum ada mahasiswa bimbingan.</p>
      ) : (
        <ul className="space-y-3" aria-label="Ringkasan bimbingan">
          {daftar.map((m) => (
            <li key={m.ta.id} className="glass p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{m.ta.judul}</h3>
                <Badge tone={m.perhatian.length ? 'red' : 'green'}>{m.perhatian.length ? 'Perlu perhatian' : 'Lancar'}</Badge>
              </div>
              <p className="mt-1 text-mid">
                {LABEL_STATUS[m.ta.status]} · {m.disetujui} bimbingan disetujui
                {m.terakhir && <> · terakhir {tgl(m.terakhir)}</>}
                {m.tenggatTerdekat && <> · tenggat {m.tenggatTerdekat.label} {tgl(m.tenggatTerdekat.waktu)}</>}
              </p>
              {m.perhatian.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-rose" aria-label={`Perhatian untuk ${m.ta.judul}`}>
                  {m.perhatian.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}
              {m.menunggu > 0 && (
                <button onClick={() => setujui(m.ta)} className="btn-primary mt-3 min-h-11 rounded-xl px-4 font-semibold">Setujui entri tertua</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-low">Pengajuan judul, entri lainnya, dan revisi dapat diputuskan di bagian masing-masing di bawah.</p>
    </Section>
  )
}

export function KuotaDosen({ dosen, dosenId, aturan, onBerubah }: { dosen: Dosen[]; dosenId: string; aturan: AturanProdi; onBerubah: () => void }) {
  const d = dosen.find((x) => x.id === dosenId)
  const [kuota, setKuota] = useState<string>('')
  const [pesan, setPesan] = useState('')
  if (!d) return null
  const sekarang = d.kuota ?? aturan.kuotaBimbingan
  const simpan = async (ubah: { kuota?: number; tutup?: boolean }) => {
    setPesan('')
    try {
      const r = await sumber.ta.ubahKuota(d.id, ubah)
      setPesan(`Kuota ${r.data.kuota}, ${r.data.tutup ? 'ditutup' : 'dibuka'} (demo).`)
      setKuota('')
      onBerubah()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  return (
    <Section title="Kuota bimbingan">
      <div className="glass p-4 text-sm">
        <p>
          {d.terisi} dari {sekarang} terisi · sisa {sisaKuota(d, aturan.kuotaBimbingan)} ·{' '}
          <Badge tone={d.tutup ? 'red' : 'green'}>{d.tutup ? 'Ditutup' : 'Dibuka'}</Badge>
        </p>
        <p className="mt-1 text-xs text-low">Batas aturan prodi {aturan.kuotaMaksBimbingan} (contoh). Kuota yang ditutup atau penuh tidak dapat dipilih di pengajuan judul.</p>
        <form noValidate onSubmit={(e) => (e.preventDefault(), simpan({ kuota: Number(kuota) }))} className="mt-3 flex items-end gap-2">
          <label className="flex-1 text-sm font-semibold">
            Kuota baru
            <input inputMode="numeric" value={kuota} onChange={(e) => setKuota(e.target.value)} placeholder={String(sekarang)} className={input} />
          </label>
          <button disabled={!kuota.trim()} className="btn-primary min-h-11 rounded-xl px-4 font-semibold">Simpan kuota</button>
        </form>
        <button onClick={() => simpan({ tutup: !d.tutup })} className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 font-semibold">
          {d.tutup ? <LockOpen className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {d.tutup ? 'Buka kuota' : 'Tutup kuota'}
        </button>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-mid">{pesan}</p>
      </div>
    </Section>
  )
}

const LABEL_PERAN: Record<PeranAgenda, string> = { BIMBINGAN: 'Bimbingan', PENGUJI: 'Penguji', PENGAWAS: 'Pengawas' }

export function KalenderDosen({ dosenId }: { dosenId: string }) {
  const muat = useCallback(() => sumber.ta.agendaDosen(dosenId), [dosenId])
  const res = useResource(muat)
  const [pesan, setPesan] = useState('')
  if (!res.data) return <Section title="Kalender saya"><Skeleton rows={2} /></Section>
  const { agenda, bentrok } = kalenderDosen(res.data.data)
  const bentrokDengan = (a: AgendaDosen) => bentrok.flatMap(([x, y]) => (x.id === a.id ? [y] : y.id === a.id ? [x] : []))
  return (
    <Section title="Kalender saya">
      {bentrok.length > 0 && (
        <p className="glass mb-3 flex gap-2 p-3 text-sm text-rose" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {bentrok.length} jadwal bentrok. Hubungi prodi untuk penjadwalan ulang.
        </p>
      )}
      {agenda.length === 0 ? (
        <p className="glass p-4 text-sm text-mid">Tidak ada agenda.</p>
      ) : (
        <ol className="space-y-2" aria-label="Agenda dosen">
          {agenda.map((a) => (
            <li key={a.id} className="glass p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{a.judul}</p>
                <Badge tone={a.peran === 'BIMBINGAN' ? 'slate' : a.peran === 'PENGUJI' ? 'blue' : 'amber'}>{LABEL_PERAN[a.peran]}</Badge>
              </div>
              <p className="text-mid">{jam(a.mulai)}–{jam(a.selesai).split(' ').at(-1)} · {a.ruang}</p>
              {bentrokDengan(a).map((b) => <p key={b.id} className="mt-1 text-rose">Bentrok dengan {b.judul}</p>)}
            </li>
          ))}
        </ol>
      )}
      <button
        disabled={agenda.length === 0}
        onClick={() => (unduh(buatIcsAgenda(agenda.map((a) => ({ id: a.id, mulai: a.mulai, selesai: a.selesai, judul: `${LABEL_PERAN[a.peran]}: ${a.judul}`, lokasi: a.ruang }))), 'agenda-dosen.ics', 'text/calendar'), setPesan('Agenda diunduh sebagai .ics.'))}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden /> Unduh .ics
      </button>
      <p role="status" aria-live="polite" className="mt-1 min-h-5 text-sm text-mid">{pesan}</p>
    </Section>
  )
}

/* ================= Prodi ================= */

export function PapanProdiView({ aturan, dosen }: { aturan: AturanProdi; dosen: Dosen[] }) {
  const res = useResource(sumber.ta.papanProdi)
  const [pesan, setPesan] = useState('')
  if (res.error) return <Section title="Papan kemajuan"><p className="glass p-4 text-sm text-mid">{res.error.message}</p></Section>
  if (!res.data) return <Section title="Papan kemajuan"><Skeleton rows={3} /></Section>
  const p = res.data.data
  const total = p.baris.length
  return (
    <>
      <Section title="Papan kemajuan">
        <p className="mb-2 text-sm text-mid">{total} tugas akhir (contoh). Hanya jumlah per tahap; tanpa nama atau NIM.</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Jumlah per tahap">
          {URUTAN_STATUS.filter((s) => p.rekap[s] > 0).map((s) => (
            <li key={s} className="glass p-3 text-sm">
              <p className="text-xl font-bold">{p.rekap[s]}</p>
              <p className="text-mid">{LABEL_STATUS[s]}</p>
            </li>
          ))}
        </ul>
        <button
          onClick={() => (unduh(csvRekap(p.baris), 'rekap-tugas-akhir.csv', 'text/csv;charset=utf-8'), setPesan('Rekap diunduh (CSV, tanpa data pribadi).'))}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold"
        >
          <Download className="h-4 w-4" aria-hidden /> Unduh rekap CSV
        </button>
        <p role="status" aria-live="polite" className="mt-1 min-h-5 text-sm text-mid">{pesan}</p>
      </Section>

      <Section title="Statistik nilai ujian">
        <ul className="space-y-2" aria-label="Statistik nilai ujian">
          {p.statistik.map(({ jenis, agregat }) => (
            <li key={jenis} className="glass flex justify-between gap-2 p-3 text-sm">
              <span>{aturanUjian(aturan, jenis)?.nama ?? jenis}</span>
              <span className="text-mid">{agregat.tampil ? `rerata ${agregat.rerata} (n=${agregat.n})` : `disembunyikan (n<${aturan.minimalAgregat})`}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-low">Hanya rerata, dan hanya bila datanya cukup banyak supaya nilai seseorang tidak bisa ditebak.</p>
      </Section>

      <Section title="Menunggu penetapan pembimbing">
        {p.menungguPembimbing.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">Tidak ada.</p>
        ) : (
          <ul className="space-y-2">
            {p.menungguPembimbing.map((t) => (
              <li key={t.id} className="glass p-3 text-sm">
                <p className="font-semibold">{t.judul}</p>
                <p className="text-mid">{t.bidang} · pilihan: {t.pilihanPembimbing.map((id) => dosen.find((d) => d.id === id)?.nama ?? id).join(', ')}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Penguji ujian terjadwal">
        {p.ujian.length === 0 ? (
          <p className="glass p-4 text-sm text-mid">Belum ada ujian terjadwal.</p>
        ) : (
          <ul className="space-y-3">
            {p.ujian.map((u) => <AturPenguji key={u.pendaftaran.id} ta={u.ta} pendaftaran={u.pendaftaran} papan={p} aturan={aturan} dosen={dosen} onBerubah={res.reload} />)}
          </ul>
        )}
      </Section>
    </>
  )
}

function AturPenguji({ ta, pendaftaran, papan, aturan, dosen, onBerubah }: { ta: TugasAkhir; pendaftaran: PendaftaranUjianAkhir; papan: PapanProdi; aturan: AturanProdi; dosen: Dosen[]; onBerubah: () => void }) {
  const s = pendaftaran.sesi!
  const [pilih, setPilih] = useState<string[]>(s.petugas)
  const [pesan, setPesan] = useState('')
  const namaJenis = aturanUjian(aturan, pendaftaran.jenis)?.nama ?? pendaftaran.jenis
  const konteks = { jenis: pendaftaran.jenis, namaJenis, ta, dosen, waktu: s, jadwal: papan.jadwal }
  const galat = validasiPenguji(pilih, konteks, aturan)
  const tersedia = new Set(pengujiTersedia(konteks, aturan).map((d) => d.id))
  const nama = (id: string) => dosen.find((d) => d.id === id)?.nama ?? id
  const simpan = async () => {
    setPesan('')
    try {
      await sumber.ta.aturPenguji(pendaftaran.id, pilih)
      setPesan('Penguji disimpan (demo).')
      onBerubah()
    } catch (e) {
      setPesan((e as Error).message)
    }
  }
  return (
    <li className="glass p-4 text-sm">
      <h3 className="font-semibold">{namaJenis} · {ta.judul}</h3>
      <p className="text-mid">{jam(s.mulai)} · {s.ruang} · pembimbing {ta.pembimbing.map(nama).join(', ')}</p>
      <fieldset className="mt-2">
        <legend className="font-semibold">Penguji (tepat {aturan.pengujiUjian.jumlah[pendaftaran.jenis]}{aturan.pengujiUjian.sumber === null && ', aturan contoh'})</legend>
        {dosen.map((d) => (
          <label key={d.id} className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={pilih.includes(d.id)} onChange={(e) => setPilih((x) => (e.target.checked ? [...x, d.id] : x.filter((y) => y !== d.id)))} />
            <span>{d.nama}</span>
            {!tersedia.has(d.id) && <span className="text-xs text-low">(tidak tersedia)</span>}
          </label>
        ))}
      </fieldset>
      {galat.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-rose" aria-label="Pelanggaran aturan penguji">
          {galat.map((g) => <li key={g}>{g}</li>)}
        </ul>
      )}
      <button disabled={galat.length > 0} onClick={simpan} className="btn-primary mt-3 min-h-11 rounded-xl px-4 font-semibold">Simpan penguji</button>
      <p role="status" aria-live="polite" className="mt-1 min-h-5 text-mid">{pesan}</p>
    </li>
  )
}
