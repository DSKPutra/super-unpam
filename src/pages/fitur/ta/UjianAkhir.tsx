import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CheckCircle2, Clock, FileCheck2, MapPin, Users, XCircle } from 'lucide-react'
import { jenisAkhirAktif } from '../../../lib/akademik/aturan'
import { deteksiBentrok } from '../../../lib/akademik/bentrok'
import { sesiKeTenggat } from '../../../lib/akademik/ics-ujian'
import { evaluasiKelayakan } from '../../../lib/akademik/kelayakan'
import type { BerkasPendaftaran, JenisUjianAkhir, PendaftaranUjianAkhir, SesiUjian } from '../../../lib/akademik/types'
import { getUjianSemester } from '../../../lib/api'
import { pancarkan } from '../../../lib/peristiwa'
import { rupiah } from '../../../lib/format'
import { formatTanggalWib } from '../../../lib/tenggat'
import { useResource } from '../../../lib/useResource'
import { DaftarSyarat, metaBerkas, ringkasHash, TombolIcs, UnggahBerkas, waktuSesi } from '../../../components/akademik'
import { Badge, Section } from '../../../components/ui'
import type { PropsTab } from './TugasAkhir'

const LABEL_STATUS: Record<PendaftaranUjianAkhir['status'], string> = {
  DRAF: 'Draf',
  MENUNGGU_PEMBIMBING: 'Menunggu persetujuan pembimbing',
  MENUNGGU_PRODI: 'Menunggu penjadwalan prodi',
  TERJADWAL: 'Terjadwal',
  DIBATALKAN: 'Dibatalkan',
  SELESAI: 'Selesai',
}

/** Slot dari prodi (contoh, relatif terhadap hari ini). TODO(BFF): slot & ketersediaan penguji dari server. */
function slotContoh(jenis: JenisUjianAkhir, durasiMenit: number, nim: string): SesiUjian[] {
  const base = new Date()
  const at = (hari: number, jam: number) => {
    const d = new Date(base.getTime() + hari * 86400_000)
    const ymd = new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10)
    return `${ymd}T${String(jam).padStart(2, '0')}:00:00+07:00`
  }
  const sesi = (id: string, hari: number, jam: number, ruang: string, penguji: string[]): SesiUjian => {
    const mulai = at(hari, jam)
    return { id, jenis, judul: `${jenis} ${nim}`, mulai, selesai: new Date(new Date(mulai).getTime() + durasiMenit * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z'), ruang, penguji, peserta: [nim] }
  }
  return [sesi('slot-1', 9, 9, 'Ruang Sidang 1', ['Budi Santoso, M.Kom', 'Hendra Gunawan, M.T.']), sesi('slot-2', 12, 13, 'Ruang Sidang 2', ['Rina Kartika, M.T.', 'Budi Santoso, M.Kom']), sesi('slot-3', 15, 10, 'Ruang Sidang 1', ['Hendra Gunawan, M.T.', 'Rina Kartika, M.T.'])]
}

export function UjianAkhir({ s, terapkan, profil, aturan, pendaftaran, setPendaftaran, go }: PropsTab) {
  const aktif = jenisAkhirAktif(aturan)
  const awal: JenisUjianAkhir = ['PENELITIAN', 'LAYAK_UJIAN_AKHIR', 'UJIAN_AKHIR', 'REVISI_AKHIR'].includes(s.ta.status) ? aktif[aktif.length - 1] : aktif[0]
  const [jenis, setJenis] = useState<JenisUjianAkhir>(awal)
  const u = aturan.ujianAkhir[jenis]
  const p = pendaftaran.find((x) => x.jenis === jenis && x.status !== 'DIBATALKAN')
  const hasil = evaluasiKelayakan(profil, { jenis }, aturan)
  const ujianSemester = useResource(getUjianSemester)
  const jadwalSaya = ujianSemester.data?.map((x) => x.sesi) ?? []

  const ubahP = (f: (x: PendaftaranUjianAkhir) => PendaftaranUjianAkhir) => setPendaftaran((list) => list.map((x) => (x.id === p?.id ? f(x) : x)))
  const setBerkas = (id: string, patch: Partial<BerkasPendaftaran>) => ubahP((x) => ({ ...x, berkas: x.berkas.map((b) => (b.idAturan === id ? { ...b, ...patch } : b)) }))
  const mulai = () =>
    setPendaftaran((list) => [...list, { id: `UA-${Date.now().toString(36).toUpperCase()}`, jenis, status: 'DRAF', berkas: u.berkas.map((b) => ({ idAturan: b.id, status: 'BELUM' })) }])

  return (
    <div>
      <div className="glass p-4">
        <label className="block text-sm font-semibold">
          Jenis ujian
          <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisUjianAkhir)} className="mt-1.5 min-h-12 w-full rounded-2xl border border-line bg-glass px-4">
            {aktif.map((j) => (
              <option key={j} value={j}>
                {aturan.ujianAkhir[j].nama}
              </option>
            ))}
          </select>
        </label>
        {u.keterangan && <p className="mt-2 text-xs text-amber">{u.keterangan}</p>}
        <p className="mt-2 text-xs text-mid">
          {u.jumlahPenguji} penguji · {u.durasiMenit} menit · biaya: {u.biaya === null ? 'tidak ada / belum ditetapkan' : rupiah(u.biaya)}
        </p>
      </div>

      <Section title="Syarat pendaftaran">
        <div className="glass p-4">
          <DaftarSyarat hasil={hasil} go={go} />
        </div>
      </Section>

      {!p ? (
        <button onClick={mulai} className="btn-primary mt-4 min-h-12 w-full rounded-2xl font-semibold">
          Mulai pendaftaran {u.nama}
        </button>
      ) : (
        <>
          <Section title={`Pendaftaran ${p.id}`} action={<Badge tone={p.status === 'TERJADWAL' ? 'green' : 'amber'}>{LABEL_STATUS[p.status]}</Badge>}>
            <ul className="space-y-2">
              {u.berkas.map((a) => {
                const b = p.berkas.find((x) => x.idAturan === a.id)!
                return (
                  <li key={a.id} className="glass p-4">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">
                          {a.nama} {a.wajib ? <span className="text-xs text-rose">wajib</span> : <span className="text-xs text-low">opsional</span>}
                        </div>
                        {a.contoh && <div className="text-xs text-low">{a.contoh}</div>}
                        {b.nama && <div className="break-all text-xs text-mid">{b.nama} · SHA-256 {ringkasHash(b.sha256!)}</div>}
                        {b.status === 'DITOLAK' && <p className="mt-1 text-xs text-rose">Ditolak: {b.alasanTolak}</p>}
                      </div>
                      <Badge tone={b.status === 'DIVERIFIKASI' ? 'green' : b.status === 'DITOLAK' ? 'red' : b.status === 'DIUNGGAH' ? 'blue' : 'slate'}>
                        {b.status === 'DIVERIFIKASI' ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : b.status === 'DITOLAK' ? <XCircle className="h-3 w-3" aria-hidden /> : null}
                        {b.status.toLowerCase()}
                      </Badge>
                    </div>
                    {p.status === 'DRAF' && (b.status === 'BELUM' || b.status === 'DITOLAK') && (
                      <div className="mt-2">
                        <UnggahBerkas aturan={a} kecil label={b.status === 'DITOLAK' ? 'Unggah ulang' : 'Unggah'} onSelesai={(m) => setBerkas(a.id, { status: 'DIUNGGAH', nama: m.nama, sha256: m.sha256, alasanTolak: undefined })} />
                      </div>
                    )}
                    {b.status === 'DIUNGGAH' && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="self-center text-low">Verifikasi prodi (demo):</span>
                        <button onClick={() => setBerkas(a.id, { status: 'DIVERIFIKASI' })} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-mint">
                          Verifikasi
                        </button>
                        <button onClick={() => setBerkas(a.id, { status: 'DITOLAK', alasanTolak: 'Format halaman tidak sesuai panduan (demo)' })} className="min-h-11 rounded-xl bg-glass-strong px-3 font-semibold text-rose">
                          Tolak
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {p.status === 'DRAF' && (
              <>
                <button
                  disabled={!hasil.layak}
                  onClick={() => {
                    ubahP((x) => ({ ...x, status: 'MENUNGGU_PEMBIMBING' }))
                    pancarkan({ judul: `Pendaftaran ${u.nama} dikirim`, isi: 'Menunggu persetujuan pembimbing', rute: 'ta/ujian' })
                  }}
                  className="btn-primary mt-4 min-h-12 w-full rounded-2xl font-semibold"
                >
                  {hasil.layak ? 'Daftar' : 'Lengkapi syarat dulu'}
                </button>
                {!hasil.layak && <p className="mt-1 text-xs text-mid">Tombol aktif setelah semua syarat di atas terpenuhi.</p>}
              </>
            )}
            {p.status === 'MENUNGGU_PEMBIMBING' && (
              <button onClick={() => ubahP((x) => ({ ...x, status: 'MENUNGGU_PRODI' }))} className="mt-4 min-h-11 rounded-xl bg-glass-strong px-4 text-xs font-semibold">
                Simulasikan persetujuan pembimbing (demo)
              </button>
            )}
          </Section>

          {p.status === 'MENUNGGU_PRODI' && (
            <PilihSlot
              slot={slotContoh(jenis, u.durasiMenit, profil.nim)}
              jadwalSaya={jadwalSaya}
              onPilih={(sesi) => {
                const galat = terapkan('JADWALKAN_UJIAN', 'Prodi (demo)', { catatan: `${u.nama}: ${waktuSesi(sesi)}` })
                ubahP((x) => ({ ...x, status: 'TERJADWAL', sesi }))
                pancarkan({ judul: `${u.nama} terjadwal`, isi: waktuSesi(sesi), rute: 'ta/ujian', tenggat: sesiKeTenggat(sesi, 'ta/ujian') })
                return galat
              }}
            />
          )}
          {p.status === 'TERJADWAL' && p.sesi && <Persiapan p={p} nama={u.nama} batasBatalHari={u.batasBatalHari} tataTertib={u.tataTertib} versi={s.versi[s.versi.length - 1]} onBatal={() => ubahP((x) => ({ ...x, status: 'MENUNGGU_PRODI', sesi: undefined }))} />}
        </>
      )}
    </div>
  )
}

function PilihSlot({ slot, jadwalSaya, onPilih }: { slot: SesiUjian[]; jadwalSaya: SesiUjian[]; onPilih: (s: SesiUjian) => string | null }) {
  const [info, setInfo] = useState('')
  return (
    <Section title="Pilih jadwal ujian">
      <div className="space-y-2">
        {slot.map((s) => {
          const bentrok = deteksiBentrok([s, ...jadwalSaya], s.peserta[0]).some((b) => b.a.id === s.id || b.b.id === s.id)
          return (
            <div key={s.id} className="glass flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{waktuSesi(s)}</div>
                <div className="text-xs text-mid">
                  {s.ruang} · Penguji: {s.penguji?.join(', ')}
                </div>
                {bentrok && <p className="text-xs text-rose">Bentrok dengan jadwal Anda yang lain.</p>}
              </div>
              <button disabled={bentrok} onClick={() => setInfo(onPilih(s) ?? '')} className="btn-primary min-h-11 rounded-xl px-4 text-xs font-semibold">
                Pilih
              </button>
            </div>
          )
        })}
      </div>
      {info && <p className="mt-2 text-xs text-amber">Catatan alur: {info} (status TA tidak berubah; jadwal tetap disimpan untuk demo).</p>}
    </Section>
  )
}

function Persiapan({ p, nama, batasBatalHari, tataTertib, versi, onBatal }: { p: PendaftaranUjianAkhir; nama: string; batasBatalHari: number; tataTertib: string[]; versi?: { versi: number; nama: string; ukuran: number; sha256: string }; onBatal: () => void }) {
  const sesi = p.sesi!
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const sisa = new Date(sesi.mulai).getTime() - now
  const batasBatal = new Date(new Date(sesi.mulai).getTime() - batasBatalHari * 86400_000)
  const bolehBatal = now < batasBatal.getTime()
  const hitung = useMemo(() => {
    if (sisa <= 0) return 'Sedang/selesai berlangsung'
    const h = Math.floor(sisa / 86400_000)
    const j = Math.floor((sisa % 86400_000) / 3600_000)
    return `${h} hari ${j} jam lagi`
  }, [sisa])
  return (
    <Section title={`Persiapan ${nama}`}>
      <div className="glass p-5">
        <div className="flex items-center gap-2 font-display text-2xl font-bold">
          <Clock className="h-6 w-6 text-cyan" aria-hidden /> {hitung}
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          <li className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-cyan" aria-hidden /> {waktuSesi(sesi)}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-rose" aria-hidden /> {sesi.ruang}
          </li>
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber" aria-hidden /> Penguji: {sesi.penguji?.join(', ')}
          </li>
          {versi && (
            <li className="flex items-start gap-2 break-all">
              <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden /> Draf diserahkan: v{versi.versi} · {metaBerkas(versi)}
            </li>
          )}
        </ul>
        <p className="mt-3 text-sm font-semibold">Yang perlu dibawa/disiapkan</p>
        <ul className="mt-1 list-disc pl-5 text-sm text-mid">
          {tataTertib.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <TombolIcs tenggat={[sesiKeTenggat(sesi, 'ta/ujian')]} nama="ujian-akhir.ics" />
          <button disabled={!bolehBatal} onClick={() => confirm(`Batalkan jadwal ${nama}? Anda harus memilih slot lagi dan penguji bisa berubah.`) && onBatal()} className="min-h-11 rounded-xl bg-glass-strong px-3 text-xs font-semibold text-rose disabled:opacity-50">
            Batalkan / jadwal ulang
          </button>
        </div>
        <p className="mt-1 text-xs text-low">
          {bolehBatal ? `Bisa dibatalkan atau dijadwalkan ulang sampai ${formatTanggalWib(batasBatal.toISOString())} (H-${batasBatalHari}).` : `Batas pembatalan (H-${batasBatalHari}) sudah lewat. Hubungi prodi.`}
        </p>
      </div>
    </Section>
  )
}
