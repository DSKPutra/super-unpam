import { useState } from 'react'
import { BellRing, CalendarPlus, CheckCircle2, Clock, FileText, Printer, X, XCircle } from 'lucide-react'
import { entriSah, hitungBimbinganSah, jedaBimbingan, tambahVersi } from '../../../lib/akademik/bimbingan'
import type { Bimbingan, JenisUjianAkhir } from '../../../lib/akademik/types'
import { jenisAkhirAktif } from '../../../lib/akademik/aturan'
import { formatTanggalWib, keIsoWib, type Tenggat } from '../../../lib/tenggat'
import { metaBerkas, TombolIcs, UnggahBerkas } from '../../../components/akademik'
import { Badge, Progress, Section } from '../../../components/ui'
import type { PropsTab } from './TugasAkhir'

const SEBELUM_PROPOSAL = ['DRAF_JUDUL', 'DIAJUKAN', 'DITOLAK', 'DISETUJUI_PEMBIMBING', 'BIMBINGAN', 'LAYAK_PROPOSAL', 'UJIAN_PROPOSAL', 'REVISI_PROPOSAL']

export function BimbinganTab({ s, set, aturan, go }: PropsTab) {
  const aktif = jenisAkhirAktif(aturan)
  // Ujian akhir berikutnya menentukan minimum bimbingan yang ditampilkan.
  const berikutnya: JenisUjianAkhir = SEBELUM_PROPOSAL.includes(s.ta.status) && aktif.includes('PROPOSAL') ? 'PROPOSAL' : aktif[aktif.length - 1]
  const min = aturan.ujianAkhir[berikutnya].minBimbingan
  const sah = hitungBimbinganSah(s.bimbingan)
  const jeda = jedaBimbingan(s.bimbingan, new Date(), aturan.skripsi.jedaPengingatHari)
  const [kartu, setKartu] = useState(false)

  const tenggatTugas: Tenggat[] = s.bimbingan
    .filter((b) => b.tenggatTugas && b.status !== 'DITOLAK')
    .map((b) => ({ id: `bimbingan-${b.id}`, judul: `Tugas bimbingan: ${b.tugasBerikutnya}`, waktu: b.tenggatTugas!, sumber: 'bimbingan', rute: 'ta/bimbingan', alarmMenit: [24 * 60] }))

  return (
    <div>
      <div className="glass p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs text-mid">Bimbingan disetujui menuju {aturan.ujianAkhir[berikutnya].nama}</div>
            <div className="font-display text-3xl font-bold">
              {sah} <span className="text-base font-medium text-mid">dari {min}</span>
            </div>
          </div>
          <Badge tone={sah >= min ? 'green' : 'amber'}>{sah >= min ? 'Memenuhi minimum' : `Kurang ${min - sah}`}</Badge>
        </div>
        <div className="mt-3">
          <Progress value={(sah / Math.max(min, 1)) * 100} color={sah >= min ? 'var(--mint)' : 'var(--primary)'} />
        </div>
        <p className="mt-2 text-xs text-low">Hanya entri yang disetujui pembimbing yang dihitung.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => go('booking')} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold">
            <CalendarPlus className="h-4 w-4" aria-hidden /> Jadwalkan bimbingan
          </button>
          <TombolIcs tenggat={tenggatTugas} nama="tenggat-bimbingan.ics">
            Tenggat tugas ke kalender
          </TombolIcs>
          <button onClick={() => setKartu(true)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
            <Printer className="h-4 w-4" aria-hidden /> Kartu bimbingan
          </button>
        </div>
      </div>

      {jeda !== null && (
        <div className="glass mt-3 flex items-start gap-3 p-4 text-sm" role="note">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
          <p>
            Sudah {jeda} hari sejak bimbingan terakhir. Kalau sedang sibuk penelitian, tidak apa-apa. Saat siap, kabari pembimbing atau jadwalkan sesi berikutnya.
          </p>
        </div>
      )}

      <FormEntri
        onTambah={(b, versiBaru) =>
          set((st) => {
            let versi = st.versi
            let lampiranVersi: number | undefined
            if (versiBaru) {
              const r = tambahVersi(st.versi, versiBaru)
              if (r.ok) {
                versi = r.daftar
                lampiranVersi = r.daftar[r.daftar.length - 1].versi
              }
            }
            return { ...st, versi, bimbingan: [...st.bimbingan, { ...b, lampiranVersi }] }
          })
        }
        maksMB={aturan.skripsi.maksDrafMB}
        versiTerakhir={s.versi[s.versi.length - 1]?.sha256}
      />

      <Section title="Catatan bimbingan">
        <div className="space-y-2">
          {[...s.bimbingan].reverse().map((b) => (
            <article key={b.id} className="glass p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    {b.bab} · {formatTanggalWib(b.tanggal)}
                  </div>
                  <p className="text-sm text-mid">{b.ringkasan}</p>
                  <p className="mt-1 text-xs text-low">
                    Tugas berikutnya: {b.tugasBerikutnya}
                    {b.tenggatTugas && ` · tenggat ${formatTanggalWib(b.tenggatTugas)}`}
                    {b.lampiranVersi && ` · lampiran draf v${b.lampiranVersi}`}
                  </p>
                  {b.catatanDosen && <p className="mt-1 text-xs text-rose">Catatan dosen: {b.catatanDosen}</p>}
                </div>
                <StatusEntri status={b.status} />
              </div>
              {b.status === 'MENUNGGU' && (
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="self-center text-low">Simulasi pembimbing (demo):</span>
                  <button onClick={() => set((st) => ({ ...st, bimbingan: st.bimbingan.map((x) => (x.id === b.id ? { ...x, status: 'DISETUJUI' } : x)) }))} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-mint">
                    Setujui
                  </button>
                  <button onClick={() => set((st) => ({ ...st, bimbingan: st.bimbingan.map((x) => (x.id === b.id ? { ...x, status: 'DITOLAK', catatanDosen: 'Ditolak (demo)' } : x)) }))} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-rose">
                    Tolak
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section title="Versi draf">
        <ul className="glass divide-y divide-line">
          {[...s.versi].reverse().map((v) => (
            <li key={v.versi} className="flex items-start gap-3 px-4 py-3 text-sm">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-cyan" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  v{v.versi} · {v.catatan || 'tanpa catatan'}
                </div>
                <div className="break-all text-xs text-low">
                  {metaBerkas(v)} · {formatTanggalWib(v.diunggah)}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-low">Setiap unggahan menjadi versi baru, tidak ada yang ditimpa. Bandingkan lewat tanggal, ukuran, dan hash.</p>
      </Section>

      {kartu && <KartuBimbingan entri={entriSah(s.bimbingan)} judul={s.ta.judul} pembimbing={s.ta.pembimbing.map((p) => p.nama).join(', ')} onTutup={() => setKartu(false)} />}
    </div>
  )
}

function StatusEntri({ status }: { status: Bimbingan['status'] }) {
  if (status === 'DISETUJUI')
    return (
      <Badge tone="green">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> Disetujui
      </Badge>
    )
  if (status === 'DITOLAK')
    return (
      <Badge tone="red">
        <XCircle className="h-3 w-3" aria-hidden /> Ditolak
      </Badge>
    )
  return (
    <Badge tone="amber">
      <Clock className="h-3 w-3" aria-hidden /> Menunggu verifikasi
    </Badge>
  )
}

function FormEntri({ onTambah, maksMB, versiTerakhir }: { onTambah: (b: Bimbingan, versi?: { nama: string; ukuran: number; sha256: string; diunggah: string; catatan: string }) => void; maksMB: number; versiTerakhir?: string }) {
  const hariIni = keIsoWib(new Date()).slice(0, 10)
  const [f, setF] = useState({ tanggal: hariIni, bab: '', ringkasan: '', tugas: '', tenggat: '', catatanVersi: '' })
  const [lampiran, setLampiran] = useState<{ nama: string; ukuran: number; sha256: string; diunggah: string } | null>(null)
  const [buka, setBuka] = useState(false)
  const field = 'mt-1.5 w-full min-h-12 rounded-2xl border border-line bg-glass px-4 outline-none focus:border-cyan'
  if (!buka)
    return (
      <button onClick={() => setBuka(true)} className="mt-4 min-h-12 w-full rounded-2xl border border-dashed border-line text-sm font-semibold text-mid hover:text-hi">
        + Catat bimbingan
      </button>
    )
  return (
    <form
      className="glass mt-4 space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        onTambah(
          { id: `b${Date.now()}`, tanggal: `${f.tanggal}T00:00:00+07:00`, bab: f.bab, ringkasan: f.ringkasan, tugasBerikutnya: f.tugas, tenggatTugas: f.tenggat ? `${f.tenggat}T23:59:00+07:00` : undefined, status: 'MENUNGGU' },
          lampiran ? { ...lampiran, catatan: f.catatanVersi } : undefined,
        )
        setF({ tanggal: hariIni, bab: '', ringkasan: '', tugas: '', tenggat: '', catatanVersi: '' })
        setLampiran(null)
        setBuka(false)
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Catat bimbingan</h3>
        <button type="button" onClick={() => setBuka(false)} aria-label="Tutup" className="flex h-11 w-11 items-center justify-center rounded-xl bg-glass-strong">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Tanggal
          <input type="date" value={f.tanggal} max={hariIni} required onChange={(e) => setF({ ...f, tanggal: e.target.value })} className={field} />
        </label>
        <label className="block text-sm font-semibold">
          Bab / bagian
          <input value={f.bab} required onChange={(e) => setF({ ...f, bab: e.target.value })} placeholder="mis. Bab III" className={field} />
        </label>
      </div>
      <label className="block text-sm font-semibold">
        Ringkasan arahan dosen
        <textarea value={f.ringkasan} required onChange={(e) => setF({ ...f, ringkasan: e.target.value })} className={`${field} min-h-20 py-3`} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Tugas berikutnya
          <input value={f.tugas} required onChange={(e) => setF({ ...f, tugas: e.target.value })} className={field} />
        </label>
        <label className="block text-sm font-semibold">
          Tenggat tugas (opsional)
          <input type="date" value={f.tenggat} min={hariIni} onChange={(e) => setF({ ...f, tenggat: e.target.value })} className={field} />
        </label>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold">Lampiran draf (opsional, jadi versi baru)</p>
        <UnggahBerkas aturan={{ tipe: ['application/pdf'], maksMB }} label="Pilih draf PDF" onSelesai={(m) => setLampiran(m)} kecil />
        {lampiran && (
          <p className={`mt-1 text-xs ${lampiran.sha256 === versiTerakhir ? 'text-amber' : 'text-mint'}`}>
            {lampiran.sha256 === versiTerakhir ? '⚠ Identik dengan versi terakhir, sehingga tidak akan disimpan sebagai versi baru.' : `✓ ${metaBerkas(lampiran)}`}
          </p>
        )}
        {lampiran && <input value={f.catatanVersi} onChange={(e) => setF({ ...f, catatanVersi: e.target.value })} placeholder="Catatan perubahan versi" className={`${field} mt-2`} />}
      </div>
      <button className="btn-primary min-h-12 w-full rounded-2xl font-semibold">Simpan (menunggu verifikasi dosen)</button>
    </form>
  )
}

function KartuBimbingan({ entri, judul, pembimbing, onTutup }: { entri: Bimbingan[]; judul: string; pembimbing: string; onTutup: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:static print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Kartu bimbingan">
      <div className="glass max-h-[90vh] w-full max-w-2xl overflow-auto !rounded-[28px] !bg-surface p-6 print:max-h-none print:!bg-white print:text-black print:shadow-none">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="text-lg font-bold">Kartu bimbingan</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold">
              <Printer className="h-4 w-4" aria-hidden /> Cetak / PDF
            </button>
            <button onClick={onTutup} aria-label="Tutup" className="flex h-11 w-11 items-center justify-center rounded-xl bg-glass-strong">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm">
          <strong>Judul:</strong> {judul}
          <br />
          <strong>Pembimbing:</strong> {pembimbing}
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 pr-2">No</th>
              <th className="py-2 pr-2">Tanggal</th>
              <th className="py-2 pr-2">Bab</th>
              <th className="py-2">Arahan</th>
            </tr>
          </thead>
          <tbody>
            {entri.map((b, i) => (
              <tr key={b.id} className="border-b border-line align-top">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="py-2 pr-2">{formatTanggalWib(b.tanggal)}</td>
                <td className="py-2 pr-2">{b.bab}</td>
                <td className="py-2">{b.ringkasan}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-mid">Hanya memuat {entri.length} entri yang disetujui pembimbing. Tanda tangan/pengesahan mengikuti prosedur prodi.</p>
      </div>
    </div>
  )
}
