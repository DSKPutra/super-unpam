import { useState } from 'react'
import { Award, CheckCircle2, Clock, ExternalLink, FileCheck2, PartyPopper, Printer, Search, XCircle } from 'lucide-react'
import { bolehBuatPengesahan, revisiTerlambat, ringkasChecklist, type ItemChecklist } from '../../../lib/akademik/kelulusan'
import type { Revisi } from '../../../lib/akademik/types'
import { formatTanggalWib } from '../../../lib/tenggat'
import { metaBerkas, TombolIcs, UnggahBerkas } from '../../../components/akademik'
import { Badge, Progress, Section } from '../../../components/ui'
import type { PropsTab } from './TugasAkhir'

/**
 * Antarmuka penyedia cek kemiripan/plagiasi. Aplikasi menampilkan hasil & ambang DARI PENYEDIA,
 * tidak menghitung sendiri. TODO(BFF): sambungkan ke layanan resmi kampus.
 */
interface PenyediaKemiripan {
  nama: string
  periksa(sha256: string): Promise<{ persen: number; ambang: number | null; laporanUrl: string | null }>
}
const penyediaDemo: PenyediaKemiripan = {
  nama: 'Penyedia contoh (demo)',
  periksa: async () => {
    await new Promise((r) => setTimeout(r, 600))
    return { persen: 12, ambang: null, laporanUrl: null }
  },
}

const PASCA_REVISI = ['REVISI_PROPOSAL', 'REVISI_AKHIR', 'YUDISIUM', 'SELESAI']

export function Kelulusan({ s, set, terapkan, aturan, go }: PropsTab) {
  const [tampilkanContoh, setTampilkanContoh] = useState(false)
  const adaRevisi = PASCA_REVISI.includes(s.ta.status) || tampilkanContoh
  const sekarang = new Date()
  const pengesahan = bolehBuatPengesahan(s.revisi)
  const [cetakPengesahan, setCetakPengesahan] = useState(false)
  const ubahRevisi = (id: string, status: Revisi['status']) => set((st) => ({ ...st, revisi: st.revisi.map((r) => (r.id === id ? { ...r, status } : r)) }))

  if (s.ta.status === 'SELESAI')
    return (
      <div className="glass p-8 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-amber" aria-hidden />
        <h2 className="mt-3 font-display text-2xl font-bold">Selamat, skripsi/TA Anda selesai</h2>
        <p className="mt-1 text-sm text-mid">Terima kasih atas kerja kerasnya. Tetap terhubung dengan kampus:</p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={() => go('alumni')} className="btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold">
            Alumni & mentorship
          </button>
          <button onClick={() => go('tracer')} className="min-h-11 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
            Isi Tracer Study
          </button>
        </div>
      </div>
    )

  return (
    <div>
      <Section title="Revisi pasca ujian">
        {!adaRevisi ? (
          <div className="glass p-4 text-sm text-mid">
            Daftar revisi muncul setelah ujian dengan hasil "lulus dengan revisi".
            <button onClick={() => setTampilkanContoh(true)} className="ml-1 min-h-11 font-semibold text-cyan">
              Lihat contoh (demo)
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex justify-end">
              <TombolIcs tenggat={s.revisi.map((r) => ({ id: `revisi-${r.id}`, judul: `Revisi ${r.bagian}`, waktu: r.tenggat, sumber: 'revisi' as const, rute: 'ta/lulus', alarmMenit: [3 * 24 * 60, 24 * 60], selesaiDikerjakan: r.status === 'DISETUJUI' }))} nama="tenggat-revisi.ics">
                Tenggat revisi ke kalender
              </TombolIcs>
            </div>
            <ul className="space-y-2">
              {s.revisi.map((r) => {
                const telat = revisiTerlambat(r, sekarang)
                return (
                  <li key={r.id} className="glass p-4">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {r.bagian} · {r.penguji}
                        </div>
                        <p className="text-sm text-mid">{r.permintaan}</p>
                        <p className={`mt-1 flex items-center gap-1 text-xs ${telat ? 'text-rose' : 'text-low'}`}>
                          <Clock className="h-3.5 w-3.5" aria-hidden /> Tenggat {formatTanggalWib(r.tenggat)}
                          {telat && ' · TERLAMBAT'}
                        </p>
                      </div>
                      <Badge tone={r.status === 'DISETUJUI' ? 'green' : r.status === 'DITOLAK' ? 'red' : r.status === 'DIAJUKAN' ? 'blue' : 'amber'}>{r.status.toLowerCase()}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {(r.status === 'BELUM' || r.status === 'DIKERJAKAN' || r.status === 'DITOLAK') && (
                        <UnggahBerkas
                          aturan={{ tipe: ['application/pdf'], maksMB: aturan.skripsi.maksDrafMB }}
                          kecil
                          label="Unggah dokumen revisi & ajukan"
                          onSelesai={(m) => {
                            set((st) => {
                              const versi = st.versi.length && st.versi[st.versi.length - 1].sha256 === m.sha256 ? st.versi : [...st.versi, { versi: (st.versi[st.versi.length - 1]?.versi ?? 0) + 1, nama: m.nama, ukuran: m.ukuran, sha256: m.sha256, diunggah: m.diunggah, catatan: `Revisi ${r.bagian}` }]
                              return { ...st, versi, revisi: st.revisi.map((x) => (x.id === r.id ? { ...x, status: 'DIAJUKAN' } : x)) }
                            })
                          }}
                        />
                      )}
                      {r.status === 'DIAJUKAN' && (
                        <>
                          <span className="self-center text-low">Penguji (demo):</span>
                          <button onClick={() => ubahRevisi(r.id, 'DISETUJUI')} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-mint">
                            Setujui
                          </button>
                          <button onClick={() => ubahRevisi(r.id, 'DITOLAK')} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-rose">
                            Tolak
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="glass mt-3 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {pengesahan.boleh ? <CheckCircle2 className="h-4 w-4 text-mint" aria-hidden /> : <XCircle className="h-4 w-4 text-rose" aria-hidden />} Lembar pengesahan: {pengesahan.alasan}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={!pengesahan.boleh} onClick={() => setCetakPengesahan(true)} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold">
                  <Printer className="h-4 w-4" aria-hidden /> Buat lembar pengesahan
                </button>
                {pengesahan.boleh && (s.ta.status === 'REVISI_AKHIR' || s.ta.status === 'REVISI_PROPOSAL') && (
                  <button onClick={() => terapkan('REVISI_DISETUJUI', 'Penguji (demo)')} className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                    Tutup revisi (demo)
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Section>

      <NaskahFinal aturan={aturan} />
      <ChecklistLulus items={aturan.kelulusan.checklist} go={go} />
      {cetakPengesahan && <LembarPengesahan judul={s.ta.judul} pembimbing={s.ta.pembimbing.map((p) => p.nama)} onTutup={() => setCetakPengesahan(false)} />}
    </div>
  )
}

function NaskahFinal({ aturan }: { aturan: PropsTab['aturan'] }) {
  const DAFTAR_PERIKSA = ['Halaman judul & pengesahan', 'Abstrak (ID & EN)', 'Daftar isi, tabel, gambar', 'Bab I–V lengkap', 'Daftar pustaka', 'Lampiran']
  const [cek, setCek] = useState<string[]>([])
  const [naskah, setNaskah] = useState<{ nama: string; ukuran: number; sha256: string; diunggah: string } | null>(null)
  const [publikasi, setPublikasi] = useState('')
  const [hasil, setHasil] = useState<{ persen: number; ambang: number | null } | 'memeriksa' | null>(null)
  const lengkap = cek.length === DAFTAR_PERIKSA.length
  return (
    <Section title="Naskah final">
      <div className="glass space-y-4 p-5">
        <fieldset>
          <legend className="text-sm font-semibold">Daftar periksa isi naskah</legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {DAFTAR_PERIKSA.map((d) => (
              <label key={d} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={cek.includes(d)} onChange={(e) => setCek((c) => (e.target.checked ? [...c, d] : c.filter((x) => x !== d)))} className="h-5 w-5 accent-[var(--primary)]" /> {d}
              </label>
            ))}
          </div>
        </fieldset>
        {lengkap ? (
          <UnggahBerkas aturan={{ tipe: ['application/pdf'], maksMB: aturan.kelulusan.maksNaskahMB }} label="Unggah naskah final (PDF)" onSelesai={(m) => setNaskah(m)} />
        ) : (
          <p className="text-xs text-mid">Lengkapi daftar periksa sebelum mengunggah naskah final.</p>
        )}
        {naskah && (
          <div className="rounded-2xl bg-glass-strong p-3 text-xs" role="status">
            <p className="flex items-center gap-1.5 font-semibold text-mint">
              <FileCheck2 className="h-4 w-4" aria-hidden /> Struk unggah
            </p>
            <p className="mt-1 break-all text-mid">{metaBerkas(naskah)}</p>
            <p className="break-all font-mono text-[11px] text-low">SHA-256: {naskah.sha256}</p>
          </div>
        )}
        <label className="block text-sm font-semibold">
          Hak akses publikasi di repositori
          <select value={publikasi} onChange={(e) => setPublikasi(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-glass px-4">
            <option value="">Pilih sesuai ketentuan kampus</option>
            {aturan.kelulusan.opsiPublikasi.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button
            disabled={!naskah || hasil === 'memeriksa'}
            onClick={async () => {
              setHasil('memeriksa')
              setHasil(await penyediaDemo.periksa(naskah!.sha256))
            }}
            className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold disabled:opacity-50"
          >
            <Search className="h-4 w-4" aria-hidden /> {hasil === 'memeriksa' ? 'Memeriksa…' : 'Cek kemiripan'}
          </button>
          {hasil && hasil !== 'memeriksa' && (
            <p className="mt-2 text-xs text-mid">
              {penyediaDemo.nama}: kemiripan {hasil.persen}% · ambang: {hasil.ambang === null ? 'ditentukan kampus (TODO)' : `${hasil.ambang}%`}. Keputusan lolos/tidak ada di kampus.
            </p>
          )}
        </div>
      </div>
    </Section>
  )
}

function ChecklistLulus({ items, go }: { items: { id: string; nama: string; rute: string }[]; go: (r: string) => void }) {
  // Status dari server (demo: sebagian sudah selesai).
  const [list] = useState<ItemChecklist[]>(() => items.map((it, i) => ({ ...it, status: i < 2 ? 'SELESAI' : i === 2 ? 'DIPROSES' : 'BELUM' })))
  const r = ringkasChecklist(list)
  return (
    <Section title="Administrasi lulus">
      <div className="glass p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span>
            {r.selesai} dari {r.total} selesai
          </span>
          <Badge tone={r.lengkap ? 'green' : 'amber'}>{r.lengkap ? 'Lengkap' : 'Belum lengkap'}</Badge>
        </div>
        <Progress value={(r.selesai / Math.max(r.total, 1)) * 100} color={r.lengkap ? 'var(--mint)' : 'var(--primary)'} />
        <ul className="mt-3 divide-y divide-line">
          {list.map((i) => (
            <li key={i.id} className="flex min-h-12 items-center gap-2 text-sm">
              {i.status === 'SELESAI' ? <CheckCircle2 className="h-4 w-4 text-mint" aria-label="selesai" /> : <Clock className="h-4 w-4 text-amber" aria-label={i.status === 'DIPROSES' ? 'diproses' : 'belum'} />}
              <span className="flex-1">
                {i.nama} <span className="text-xs text-low">({i.status.toLowerCase()})</span>
              </span>
              {i.status !== 'SELESAI' && (
                <button onClick={() => go(i.rute)} className="flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-cyan">
                  Urus <ExternalLink className="h-3 w-3" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-2xl bg-glass-strong p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold">
            <Award className="h-4 w-4 text-amber" aria-hidden /> Yudisium & wisuda
          </p>
          <p className="text-xs text-mid">Jadwal & syarat diumumkan fakultas (dari server). Pendaftaran wisuda terbuka setelah semua administrasi lengkap.</p>
          <button disabled={!r.lengkap} className="btn-primary mt-2 min-h-11 rounded-xl px-4 text-xs font-semibold">
            {r.lengkap ? 'Daftar wisuda' : 'Lengkapi administrasi dulu'}
          </button>
        </div>
      </div>
    </Section>
  )
}

function LembarPengesahan({ judul, pembimbing, onTutup }: { judul: string; pembimbing: string[]; onTutup: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:static print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Lembar pengesahan">
      <div className="glass w-full max-w-xl !rounded-[28px] !bg-surface p-6 print:!bg-white print:text-black print:shadow-none">
        <div className="flex justify-end gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold">
            <Printer className="h-4 w-4" aria-hidden /> Cetak / PDF
          </button>
          <button onClick={onTutup} className="min-h-11 rounded-xl bg-glass-strong px-3 text-sm font-semibold">
            Tutup
          </button>
        </div>
        <h2 className="mt-2 text-center font-display text-xl font-bold">LEMBAR PENGESAHAN</h2>
        <p className="mt-1 text-center text-xs font-semibold text-amber">MENUNGGU TANDA TANGAN RESMI</p>
        <p className="mt-4 text-center font-semibold">{judul}</p>
        <div className="mt-8 grid grid-cols-2 gap-6 text-center text-sm">
          {pembimbing.map((p) => (
            <div key={p}>
              <div className="h-20 border-b border-dashed border-line" aria-label="Kolom tanda tangan kosong" />
              <div className="mt-1">{p}</div>
              <div className="text-xs text-mid">Pembimbing</div>
            </div>
          ))}
          <div>
            <div className="h-20 border-b border-dashed border-line" aria-label="Kolom tanda tangan kosong" />
            <div className="mt-1">Ketua Program Studi</div>
          </div>
        </div>
        <p className="mt-6 text-xs text-mid">Tanda tangan elektronik resmi belum tersedia (TODO). Kolom dibiarkan kosong dan tidak berisi tanda tangan buatan.</p>
      </div>
    </div>
  )
}
