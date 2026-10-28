import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, CheckCircle2, ClipboardList, Download, FileText, Lock, Printer, Unlock, Users } from 'lucide-react'
import { LABEL_STATUS } from '../../../lib/akademik/alur-skripsi'
import { deteksiBentrok } from '../../../lib/akademik/bentrok'
import { sesiKeTenggat } from '../../../lib/akademik/ics-ujian'
import { gabungPenguji, hitungNilaiPratinjau, lembarTerbuka, validasiSkor } from '../../../lib/akademik/nilai'
import { sisaKuota, validasiKomposisiPenguji } from '../../../lib/akademik/penguji'
import type { AturanAkademik, JenisUjianAkhir, Penilaian, SesiUjian, SkorKriteria, StatusTA } from '../../../lib/akademik/types'
import { getDosen, getMahasiswaBimbingan, getRekapAngkatan, getUjianPenguji } from '../../../lib/api'
import { pancarkan } from '../../../lib/peristiwa'
import { formatTanggalWib, keIsoWib } from '../../../lib/tenggat'
import { useResource } from '../../../lib/useResource'
import type { User } from '../../../lib/types'
import { AturanContoh, BannerDemoPeran, ringkasHash, TombolIcs, waktuSesi } from '../../../components/akademik'
import { Async, Badge, PageHeader, Section, Skeleton, Tabs } from '../../../components/ui'

// Sisi DOSEN & PRODI (T06, T08). SELURUH layar ini DEMO: peran bisa diganti dari Profil, jadi
// setiap akses data wajib ditegakkan server berdasarkan sesi. TODO(BFF-AUTHZ) di setiap pemuatan.

type Tab = 'bimbingan' | 'ujian' | 'kalender' | 'prodi'
type UjianPenguji = Awaited<ReturnType<typeof getUjianPenguji>>[number]

export function DosenTA({ user, aturan, back }: { user: User; aturan: AturanAkademik; back: () => void }) {
  const [tab, setTab] = useState<Tab>(user.role === 'TENDIK' ? 'prodi' : 'bimbingan')
  const opsi: [Tab, string][] = user.role === 'TENDIK' ? [['prodi', 'Prodi'], ['kalender', 'Kalender']] : [['bimbingan', 'Bimbingan'], ['ujian', 'Menguji'], ['kalender', 'Kalender'], ['prodi', 'Prodi']]
  return (
    <div>
      <PageHeader title="Skripsi/TA: Dosen & Prodi" subtitle={user.role === 'TENDIK' ? 'Pengelolaan prodi' : 'Bimbingan, menguji, jadwal'} onBack={back} />
      <BannerDemoPeran />
      <AturanContoh aturan={aturan} />
      <Tabs value={tab} onChange={setTab} options={opsi} />
      {tab === 'bimbingan' && <DaftarBimbingan aturan={aturan} />}
      {tab === 'ujian' && <UjianSaya aturan={aturan} />}
      {tab === 'kalender' && <Kalender />}
      {tab === 'prodi' && <Prodi aturan={aturan} />}
    </div>
  )
}

// — T08 #1–2: daftar mahasiswa bimbingan, aksi cepat, kuota —
function DaftarBimbingan({ aturan }: { aturan: AturanAkademik }) {
  const res = useResource(getMahasiswaBimbingan) // TODO(BFF-AUTHZ): hanya mahasiswa yang dibimbing dosen ini
  const [kuotaBuka, setKuotaBuka] = useState(true)
  const [aksi, setAksi] = useState<Record<string, string>>({})
  const kuota = aturan.skripsi.kuotaPembimbingDefault
  const sekarang = Date.now()
  return (
    <Async res={res}>
      {(list) => (
        <>
          <div className="glass flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1">
              <div className="text-sm font-semibold">Kuota bimbingan saya</div>
              <div className="text-xs text-mid">
                {list.length} dari {kuota} terisi · sisa {sisaKuota({ nidn: '', nama: '', email: '', bidang: [], beban: list.length, kuota: null, kuotaDibuka: kuotaBuka }, kuota)}
              </div>
            </div>
            <button onClick={() => setKuotaBuka((b) => !b)} aria-pressed={kuotaBuka} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
              {kuotaBuka ? <Unlock className="h-4 w-4 text-mint" aria-hidden /> : <Lock className="h-4 w-4 text-rose" aria-hidden />} Kuota {kuotaBuka ? 'dibuka' : 'ditutup'}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {list.map((m) => {
              const jeda = Math.floor((sekarang - new Date(m.terakhir).getTime()) / 86400_000)
              const perhatian = jeda > aturan.skripsi.jedaPengingatHari || m.menunggu > 0
              return (
                <article key={m.nim} className="glass p-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{m.nama}</div>
                      <div className="text-xs text-low">{m.nim}</div>
                      <p className="mt-1 text-sm text-mid">{m.judul}</p>
                      <p className="mt-1 text-xs text-low">
                        {m.bimbinganSah} bimbingan sah · terakhir {formatTanggalWib(m.terakhir)} ({jeda} hari)
                        {m.menunggu > 0 && ` · ${m.menunggu} menunggu verifikasi`}
                      </p>
                    </div>
                    <Badge tone="blue">{LABEL_STATUS[m.status as StatusTA]}</Badge>
                    {perhatian && (
                      <Badge tone="amber">
                        <AlertTriangle className="h-3 w-3" aria-hidden /> Perlu perhatian
                      </Badge>
                    )}
                  </div>
                  {aksi[m.nim] ? (
                    <p className="mt-2 text-xs text-mint">✓ {aksi[m.nim]} (demo)</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {m.status === 'DIAJUKAN' && (
                        <>
                          <button onClick={() => setAksi((a) => ({ ...a, [m.nim]: 'Judul disetujui' }))} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-mint">
                            Setujui judul
                          </button>
                          <button onClick={() => setAksi((a) => ({ ...a, [m.nim]: 'Judul ditolak dengan alasan' }))} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-rose">
                            Tolak
                          </button>
                        </>
                      )}
                      {m.menunggu > 0 && m.status !== 'DIAJUKAN' && (
                        <button onClick={() => setAksi((a) => ({ ...a, [m.nim]: `${m.menunggu} entri/revisi disetujui` }))} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold">
                          Tinjau {m.menunggu} entri menunggu
                        </button>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </>
      )}
    </Async>
  )
}

// — T06: ujian yang saya uji + lembar penilaian —
function UjianSaya({ aturan }: { aturan: AturanAkademik }) {
  const res = useResource(getUjianPenguji) // TODO(BFF-AUTHZ): hanya ujian di mana dosen ini penguji/pembimbing
  const [buka, setBuka] = useState<string | null>(null)
  return (
    <Async res={res}>
      {(list) => {
        const aktif = list.find((u) => u.id === buka)
        if (aktif) return <LembarPenilaian u={aktif} aturan={aturan} onTutup={() => setBuka(null)} />
        return (
          <div className="space-y-2">
            {list.map((u) => {
              const terbuka = lembarTerbuka(u.sesi, aturan.ujianAkhir[u.jenis].jendelaPenilaian, new Date())
              return (
                <article key={u.id} className="glass p-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-low">
                        {aturan.ujianAkhir[u.jenis].nama} · {u.peran}
                      </div>
                      <div className="font-semibold">{u.mahasiswa}</div>
                      <p className="text-sm text-mid">{u.judul}</p>
                      <p className="mt-1 text-xs text-low">
                        {waktuSesi(u.sesi)} · {u.sesi.ruang}
                      </p>
                      <p className="mt-1 flex items-center gap-1 break-all text-xs text-low">
                        <FileText className="h-3.5 w-3.5" aria-hidden /> Draf v{u.drafVersi} · SHA-256 {ringkasHash(u.drafHash)}
                      </p>
                    </div>
                    <Badge tone={terbuka ? 'green' : 'slate'}>{terbuka ? 'Jendela penilaian terbuka' : 'Lembar tertutup'}</Badge>
                  </div>
                  <button disabled={!terbuka} onClick={() => setBuka(u.id)} className="btn-primary mt-3 min-h-11 rounded-xl px-4 text-xs font-semibold">
                    Buka lembar penilaian
                  </button>
                  {!terbuka && <p className="mt-1 text-xs text-low">Lembar hanya bisa dibuka di sekitar waktu ujian (mulai {aturan.ujianAkhir[u.jenis].jendelaPenilaian.sebelumMenit} menit sebelum sampai {aturan.ujianAkhir[u.jenis].jendelaPenilaian.sesudahMenit} menit sesudah).</p>}
                </article>
              )
            })}
          </div>
        )
      }}
    </Async>
  )
}

interface CatatanRevisi {
  bagian: string
  permintaan: string
}

function LembarPenilaian({ u, aturan, onTutup }: { u: UjianPenguji; aturan: AturanAkademik; onTutup: () => void }) {
  const rubrik = aturan.penilaian.rubrik
  // Draf disimpan di memori sesi ini saja (nilai = data sensitif). TODO(BFF): autosave ke server.
  const [skor, setSkor] = useState<SkorKriteria[]>(rubrik.map((k) => ({ kriteria: k.id, nilai: Number.NaN, catatan: '' })))
  const [rek, setRek] = useState<Penilaian['rekomendasi']>('LULUS_DENGAN_REVISI')
  const [revisi, setRevisi] = useState<CatatanRevisi[]>([])
  const [dikirim, setDikirim] = useState<string | null>(null)
  const [semuaKirim, setSemuaKirim] = useState(false)
  const [beritaAcara, setBeritaAcara] = useState(false)
  const galat = validasiSkor(rubrik, skor)
  const pratinjau = hitungNilaiPratinjau(aturan, skor)
  // Nilai penguji lain disembunyikan sampai semua mengirim (ditegakkan server). Demo: satu penguji lain.
  const gabungan = semuaKirim && pratinjau.ok ? gabungPenguji([pratinjau.nilai, u.nilaiPengujiLain], aturan) : null
  const setNilai = (id: string, patch: Partial<SkorKriteria>) => setSkor((s) => s.map((x) => (x.kriteria === id ? { ...x, ...patch } : x)))
  const audit = [
    { pada: u.sesi.mulai, oleh: 'Sistem', apa: 'Lembar penilaian dibuka (contoh)' },
    ...(dikirim ? [{ pada: dikirim, oleh: 'Anda', apa: `Penilaian dikirim (final), rekomendasi ${rek.replace(/_/g, ' ').toLowerCase()}` }] : []),
  ]

  return (
    <div>
      <button onClick={onTutup} className="mb-3 min-h-11 text-sm font-semibold text-cyan">
        ← Kembali ke daftar
      </button>
      <div className="glass p-4">
        <div className="text-xs text-low">
          {aturan.ujianAkhir[u.jenis].nama} · {u.peran}
        </div>
        <div className="font-semibold">
          {u.mahasiswa} · {u.nim}
        </div>
        <p className="text-sm text-mid">{u.judul}</p>
      </div>

      <Section title="Rubrik">
        <div className="space-y-2">
          {rubrik.map((k) => {
            const s = skor.find((x) => x.kriteria === k.id)!
            const salah = Number.isFinite(s.nilai) && (s.nilai < k.min || s.nilai > k.max)
            return (
              <div key={k.id} className="glass p-4">
                <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                  <span className="flex-1">
                    {k.nama} <span className="font-normal text-low">· bobot {k.bobot}%</span>
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={k.min}
                    max={k.max}
                    step="0.5"
                    disabled={!!dikirim}
                    value={Number.isFinite(s.nilai) ? s.nilai : ''}
                    onChange={(e) => setNilai(k.id, { nilai: e.target.value === '' ? Number.NaN : Number(e.target.value) })}
                    aria-invalid={salah}
                    aria-describedby={`r-${k.id}`}
                    className={`min-h-11 w-24 rounded-xl border bg-glass px-3 text-right ${salah ? 'border-rose' : 'border-line'}`}
                  />
                </label>
                <span id={`r-${k.id}`} className={`text-xs ${salah ? 'text-rose' : 'text-low'}`}>
                  Rentang {k.min}–{k.max}
                  {salah && ' · di luar rentang'}
                </span>
                <input disabled={!!dikirim} value={s.catatan} onChange={(e) => setNilai(k.id, { catatan: e.target.value })} placeholder="Catatan kriteria (opsional)" className="mt-2 min-h-11 w-full rounded-xl border border-line bg-glass px-3 text-sm" />
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Catatan revisi untuk mahasiswa">
        <div className="space-y-2">
          {revisi.map((r, i) => (
            <div key={i} className="glass grid gap-2 p-3 sm:grid-cols-[1fr_2fr]">
              <input disabled={!!dikirim} value={r.bagian} onChange={(e) => setRevisi((l) => l.map((x, j) => (j === i ? { ...x, bagian: e.target.value } : x)))} placeholder="Bagian (mis. Bab 4.2)" className="min-h-11 rounded-xl border border-line bg-glass px-3 text-sm" />
              <input disabled={!!dikirim} value={r.permintaan} onChange={(e) => setRevisi((l) => l.map((x, j) => (j === i ? { ...x, permintaan: e.target.value } : x)))} placeholder="Permintaan revisi" className="min-h-11 rounded-xl border border-line bg-glass px-3 text-sm" />
            </div>
          ))}
          {!dikirim && (
            <button onClick={() => setRevisi((l) => [...l, { bagian: '', permintaan: '' }])} className="min-h-11 w-full rounded-2xl border border-dashed border-line text-sm font-semibold text-mid">
              + Tambah butir revisi
            </button>
          )}
          <p className="text-xs text-low">Tenggat revisi otomatis {aturan.revisi.batasHari} hari setelah hasil dirilis (aturan contoh).</p>
        </div>
      </Section>

      <Section title="Rekomendasi">
        <div className="glass flex flex-wrap gap-2 p-4" role="radiogroup" aria-label="Rekomendasi">
          {(['LULUS', 'LULUS_DENGAN_REVISI', 'TIDAK_LULUS'] as const).map((r) => (
            <label key={r} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-glass-strong px-3 text-sm">
              <input type="radio" disabled={!!dikirim} checked={rek === r} onChange={() => setRek(r)} className="accent-[var(--primary)]" /> {r.replace(/_/g, ' ').toLowerCase()}
            </label>
          ))}
        </div>
      </Section>

      <div className="glass mt-4 p-4">
        {pratinjau.ok ? (
          <p className="text-sm">
            Nilai Anda: <strong>{pratinjau.nilai}</strong> ({pratinjau.huruf}) <Badge tone="amber">perkiraan</Badge>
          </p>
        ) : (
          <p className="text-xs text-mid">Lengkapi semua kriteria dengan nilai dalam rentang untuk melihat pratinjau.</p>
        )}
        <p className="mt-1 text-xs text-low">Nilai resmi dihitung dan dirilis server, bukan dari layar ini.</p>
        {!dikirim ? (
          <button
            disabled={galat.length > 0}
            onClick={() => {
              if (!confirm('Kirim penilaian? Setelah dikirim bersifat final dan tercatat waktunya.')) return
              setDikirim(keIsoWib(new Date()))
            }}
            className="btn-primary mt-3 min-h-12 w-full rounded-2xl font-semibold"
          >
            {galat.length ? `Belum bisa dikirim: ${galat[0]}` : 'Kirim penilaian (final)'}
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="flex items-center gap-1.5 text-sm text-mint">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Dikirim {formatTanggalWib(dikirim)} {new Date(dikirim).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })} WIB
            </p>
            {!semuaKirim ? (
              <>
                <p className="text-xs text-mid">Nilai penguji lain disembunyikan sampai semua penguji mengirim.</p>
                <button onClick={() => setSemuaKirim(true)} className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                  Simulasikan semua penguji sudah mengirim (demo)
                </button>
              </>
            ) : (
              gabungan && (
                <div className="rounded-2xl bg-glass-strong p-3 text-sm">
                  Rata-rata penguji: <strong>{gabungan.rata}</strong> ({gabungan.huruf}) <Badge tone="amber">perkiraan</Badge>
                  {gabungan.perluRapat && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-amber">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Selisih {gabungan.selisihMaks} poin melebihi ambang {aturan.penilaian.ambangSelisihPenguji}. Perlu rapat kesepakatan.
                    </p>
                  )}
                </div>
              )
            )}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBeritaAcara(true)} className="flex min-h-11 items-center gap-1.5 rounded-xl bg-glass-strong px-3 text-xs font-semibold">
                <Printer className="h-4 w-4" aria-hidden /> Berita acara
              </button>
              <button
                onClick={() => pancarkan({ judul: 'Hasil ujian tersedia', isi: 'Buka menu Skripsi/TA untuk melihat hasil.', rute: 'ta/lulus' })}
                className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold"
              >
                Simulasikan rilis hasil ke mahasiswa (demo)
              </button>
            </div>
          </div>
        )}
      </div>

      <Section title="Riwayat audit (contoh)">
        <ul className="glass divide-y divide-line text-xs">
          {audit.map((a, i) => (
            <li key={i} className="px-4 py-2">
              {formatTanggalWib(a.pada)} · {a.oleh} · {a.apa}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-low">Audit resmi (siapa, kapan, apa) dicatat server. TODO(BFF).</p>
      </Section>

      {beritaAcara && <BeritaAcara u={u} aturan={aturan} rek={rek} revisi={revisi} onTutup={() => setBeritaAcara(false)} />}
    </div>
  )
}

function BeritaAcara({ u, aturan, rek, revisi, onTutup }: { u: UjianPenguji; aturan: AturanAkademik; rek: Penilaian['rekomendasi']; revisi: CatatanRevisi[]; onTutup: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:static print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Berita acara">
      <div className="glass max-h-[90vh] w-full max-w-2xl overflow-auto !rounded-[28px] !bg-surface p-6 print:max-h-none print:!bg-white print:text-black print:shadow-none">
        <div className="flex justify-end gap-2 print:hidden">
          <button onClick={() => window.print()} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold">
            <Printer className="h-4 w-4" aria-hidden /> Cetak / PDF
          </button>
          <button onClick={onTutup} className="min-h-11 rounded-xl bg-glass-strong px-3 text-sm font-semibold">
            Tutup
          </button>
        </div>
        <h2 className="mt-2 text-center font-display text-xl font-bold">BERITA ACARA {aturan.ujianAkhir[u.jenis].nama.toUpperCase()}</h2>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {[
              ['Mahasiswa', `${u.mahasiswa} (${u.nim})`],
              ['Judul', u.judul],
              ['Waktu', waktuSesi(u.sesi)],
              ['Ruang', u.sesi.ruang],
              ['Hasil', `${rek.replace(/_/g, ' ').toLowerCase()} (menunggu keputusan resmi)`],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-line align-top">
                <td className="w-28 py-2 font-semibold">{k}</td>
                <td className="py-2">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {revisi.filter((r) => r.permintaan).length > 0 && (
          <>
            <h3 className="mt-4 font-semibold">Catatan revisi</h3>
            <ol className="mt-1 list-decimal pl-5 text-sm">
              {revisi
                .filter((r) => r.permintaan)
                .map((r, i) => (
                  <li key={i}>
                    {r.bagian}: {r.permintaan}
                  </li>
                ))}
            </ol>
          </>
        )}
        <div className="mt-8 grid grid-cols-2 gap-6 text-center text-sm">
          {['Penguji 1', 'Penguji 2'].map((p) => (
            <div key={p}>
              <div className="h-20 border-b border-dashed border-line" aria-label="Kolom tanda tangan kosong" />
              <div className="mt-1">{p}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-mid">Tanda tangan elektronik resmi: TODO. Kolom sengaja kosong, tanpa gambar tanda tangan.</p>
      </div>
    </div>
  )
}

// — T08 #3: kalender dosen dengan deteksi bentrok —
function Kalender() {
  const res = useResource(getUjianPenguji)
  const SAYA = 'DOSEN-SAYA'
  return (
    <Async res={res}>
      {(ujian) => {
        const sesi: SesiUjian[] = [
          ...ujian.map((u) => ({ id: u.id, jenis: u.jenis as JenisUjianAkhir, judul: `Menguji: ${u.mahasiswa}`, mulai: u.sesi.mulai, selesai: u.sesi.selesai, ruang: u.sesi.ruang, peserta: [SAYA] })),
          { id: 'bim-1', jenis: 'PROPOSAL' as const, judul: 'Bimbingan: Rizky Maulana', mulai: '2026-12-03T10:00:00+07:00', selesai: '2026-12-03T11:00:00+07:00', ruang: 'Ruang Dosen', peserta: [SAYA] },
          { id: 'uts-awas', jenis: 'UTS' as const, judul: 'Mengawasi UTS Basis Data', mulai: '2026-11-16T10:00:00+07:00', selesai: '2026-11-16T11:40:00+07:00', ruang: 'Gedung B · 305', peserta: [SAYA] },
        ].sort((a, b) => a.mulai.localeCompare(b.mulai))
        const bentrok = deteksiBentrok(sesi, SAYA)
        return (
          <>
            <div className="mb-3 flex justify-end">
              <TombolIcs tenggat={sesi.map((s) => sesiKeTenggat(s, 'ta'))} nama="kalender-dosen.ics">
                Ekspor .ics
              </TombolIcs>
            </div>
            {bentrok.length > 0 && (
              <p role="alert" className="glass mb-3 flex items-center gap-2 p-3 text-sm text-rose">
                <AlertTriangle className="h-4 w-4" aria-hidden /> {bentrok.length} bentrok: {bentrok.map((b) => `${b.a.judul} × ${b.b.judul}`).join('; ')}
              </p>
            )}
            <ol className="glass divide-y divide-line">
              {sesi.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <CalendarDays className="h-5 w-5 shrink-0 text-cyan" aria-hidden />
                  <div className="flex-1">
                    <div className="font-semibold">{s.judul}</div>
                    <div className="text-xs text-low">
                      {waktuSesi(s)} · {s.ruang}
                    </div>
                  </div>
                  {bentrok.some((b) => b.a.id === s.id || b.b.id === s.id) && <Badge tone="red">Bentrok</Badge>}
                </li>
              ))}
            </ol>
          </>
        )
      }}
    </Async>
  )
}

// — T08 #4–6: prodi —
function Prodi({ aturan }: { aturan: AturanAkademik }) {
  const rekap = useResource(getRekapAngkatan) // TODO(BFF-AUTHZ): hanya TENDIK/Kaprodi
  const dosen = useResource(getDosen)
  return (
    <>
      <Async res={rekap} skeleton={<Skeleton rows={2} />}>
        {(r) => <RekapAngkatan rekap={r} />}
      </Async>
      <Async res={dosen} skeleton={<Skeleton rows={2} />}>
        {(d) => <PenugasanPenguji dosen={d} aturan={aturan} />}
      </Async>
    </>
  )
}

function RekapAngkatan({ rekap }: { rekap: Record<string, number> }) {
  const total = Object.values(rekap).reduce((a, b) => a + b, 0)
  const max = Math.max(...Object.values(rekap))
  const csv = () => {
    // Agregat saja, tanpa NIM/nama/nilai individu.
    const isi = ['status,jumlah', ...Object.entries(rekap).map(([k, v]) => `${LABEL_STATUS[k as StatusTA] ?? k},${v}`)].join('\n')
    const url = URL.createObjectURL(new Blob([isi], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: 'rekap-ta-angkatan.csv' }).click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <Section title={`Kemajuan angkatan · ${total} mahasiswa`} action={<button onClick={csv} className="flex min-h-11 items-center gap-1 px-1 text-xs font-semibold text-cyan"><Download className="h-3.5 w-3.5" aria-hidden /> CSV</button>}>
      <ul className="glass space-y-2 p-4">
        {Object.entries(rekap).map(([k, v]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between">
              <span>{LABEL_STATUS[k as StatusTA] ?? k}</span>
              <span className="font-semibold">{v}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-glass-strong" aria-hidden>
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-low">Statistik agregat. Tidak menampilkan nilai atau data individu.</p>
    </Section>
  )
}

function PenugasanPenguji({ dosen, aturan }: { dosen: Awaited<ReturnType<typeof getDosen>>; aturan: AturanAkademik }) {
  const [jenis, setJenis] = useState<JenisUjianAkhir>('SIDANG')
  const u = aturan.ujianAkhir[jenis]
  const pembimbing = [dosen[0]?.nidn].filter(Boolean)
  const [pilih, setPilih] = useState<string[]>([])
  const galat = useMemo(() => validasiKomposisiPenguji(pilih, pembimbing, u), [pilih, pembimbing, u])
  const [tersimpan, setTersimpan] = useState(false)
  return (
    <Section title="Penugasan penguji">
      <div className="glass space-y-3 p-4">
        <p className="flex items-center gap-1.5 text-sm">
          <Users className="h-4 w-4 text-cyan" aria-hidden /> Contoh: Fajar Nugroho · pembimbing {dosen[0]?.nama}
        </p>
        <label className="block text-sm font-semibold">
          Jenis ujian
          <select value={jenis} onChange={(e) => (setJenis(e.target.value as JenisUjianAkhir), setPilih([]), setTersimpan(false))} className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-glass px-4">
            {(['PROPOSAL', 'SEMINAR_HASIL', 'UAPS', 'SIDANG'] as const).filter((j) => aturan.ujianAkhir[j].aktif).map((j) => (
              <option key={j} value={j}>
                {aturan.ujianAkhir[j].nama} ({aturan.ujianAkhir[j].jumlahPenguji} penguji)
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Pilih penguji</legend>
          <div className="mt-1 space-y-1">
            {dosen.map((d) => (
              <label key={d.nidn} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={pilih.includes(d.nidn)} onChange={(e) => (setTersimpan(false), setPilih((p) => (e.target.checked ? [...p, d.nidn] : p.filter((x) => x !== d.nidn))))} className="h-5 w-5 accent-[var(--primary)]" />
                {d.nama} {pembimbing.includes(d.nidn) && <Badge tone="amber">pembimbing</Badge>}
              </label>
            ))}
          </div>
        </fieldset>
        {galat.length > 0 && (
          <ul role="alert" className="list-disc pl-5 text-xs text-rose">
            {galat.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
        <button disabled={galat.length > 0 || tersimpan} onClick={() => setTersimpan(true)} className="btn-primary flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold">
          <ClipboardList className="h-4 w-4" aria-hidden /> {tersimpan ? 'Penugasan disimpan (demo)' : 'Simpan penugasan'}
        </button>
      </div>
    </Section>
  )
}
