import { useState } from 'react'
import { AlertTriangle, Send } from 'lucide-react'
import { evaluasiKelayakan } from '../../../lib/akademik/kelayakan'
import { judulMirip } from '../../../lib/akademik/kemiripan'
import { dosenTersedia, sisaKuota } from '../../../lib/akademik/penguji'
import { usePref } from '../../../lib/prefs'
import { DaftarSyarat } from '../../../components/akademik'
import { Badge, Section } from '../../../components/ui'
import type { PropsTab } from './TugasAkhir'

interface Draf {
  judul: string
  bidang: string
  abstrak: string
  metode: string
  pilihan: string[]
}

export function Pengajuan({ s, terapkan, profil, aturan, dosen, judulTerdaftar, go }: PropsTab) {
  const k = aturan.skripsi
  const syaratMulai = evaluasiKelayakan(profil, { jenis: 'MULAI_TA' }, aturan)
  const bisaEdit = s.ta.status === 'DRAF_JUDUL'
  const tersedia = dosenTersedia(dosen, k.kuotaPembimbingDefault)
  const bidangList = [...new Set(dosen.flatMap((d) => d.bidang))].sort()

  // Draf tersimpan otomatis (teks saja, tanpa berkas) agar bisa dilanjutkan.
  const [draf, setDraf] = usePref<Draf>('ta.draf', { judul: s.ta.judul, bidang: s.ta.bidang, abstrak: s.ta.abstrak, metode: s.ta.metode, pilihan: s.ta.pilihanPembimbing })
  const [galat, setGalat] = useState('')
  const ubah = (patch: Partial<Draf>) => setDraf({ ...draf, ...patch })
  const mirip = draf.judul.trim().length > 10 ? judulMirip(draf.judul, judulTerdaftar.filter((j) => j !== s.ta.judul), k.ambangKemiripanJudul) : []
  const field = 'mt-1.5 w-full min-h-12 rounded-2xl border border-line bg-glass px-4 outline-none focus:border-cyan disabled:opacity-60'

  const kirim = () => {
    const pilihan = draf.pilihan.filter(Boolean)
    setGalat(
      terapkan('AJUKAN', 'Mahasiswa', { perubahan: { judul: draf.judul.trim(), bidang: draf.bidang, abstrak: draf.abstrak, metode: draf.metode, pilihanPembimbing: pilihan } }) ?? '',
    )
  }

  return (
    <div>
      <div className="glass p-5">
        <h2 className="mb-2 font-semibold">Syarat mulai skripsi/TA</h2>
        <DaftarSyarat hasil={syaratMulai} go={go} />
        {!syaratMulai.layak && (
          <p className="mt-3 text-xs text-mid">
            Lengkapi syarat di atas lebih dulu. Untuk SKS, kekurangan saat ini {Math.max(0, k.minSks - profil.sks)} SKS. Perkiraan semester pemenuhan bergantung pada rencana KRS Anda.
          </p>
        )}
      </div>

      {s.ta.status === 'DITOLAK' && (
        <div role="alert" className="glass mt-4 p-4">
          <p className="font-semibold text-rose">Pengajuan ditolak</p>
          <p className="text-sm text-mid">Alasan: {[...s.ta.riwayat].reverse().find((r) => r.ke === 'DITOLAK')?.peristiwa.alasan}</p>
          <button onClick={() => setGalat(terapkan('AJUKAN_ULANG', 'Mahasiswa') ?? '')} className="btn-primary mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold">
            Ajukan ulang
          </button>
          <p className="mt-1 text-xs text-low">Riwayat penolakan tetap tersimpan.</p>
        </div>
      )}

      <Section title={bisaEdit ? 'Formulir pengajuan judul' : 'Judul & pembimbing saat ini'}>
        <form
          className="glass space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            kirim()
          }}
        >
          <label className="block text-sm font-semibold">
            Judul
            <textarea value={draf.judul} disabled={!bisaEdit} maxLength={k.maksJudulKarakter} required onChange={(e) => ubah({ judul: e.target.value })} className={`${field} min-h-20 py-3`} />
            <span className="mt-1 block text-right text-[11px] font-normal text-low" aria-live="polite">
              {draf.judul.length}/{k.maksJudulKarakter} karakter
            </span>
          </label>
          {bisaEdit && mirip.length > 0 && (
            <div role="note" className="rounded-2xl bg-[color-mix(in_srgb,var(--amber)_12%,transparent)] p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-amber">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Judul mirip yang sudah terdaftar (peringatan, bukan penolakan)
              </p>
              <ul className="mt-1 list-disc pl-5 text-mid">
                {mirip.slice(0, 3).map((m) => (
                  <li key={m.judul}>
                    {m.judul} ({Math.round(m.skor * 100)}% kata sama)
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-low">Bukan pengganti cek plagiasi resmi kampus.</p>
            </div>
          )}
          <label className="block text-sm font-semibold">
            Bidang / kelompok keilmuan
            <select value={draf.bidang} disabled={!bisaEdit} required onChange={(e) => ubah({ bidang: e.target.value })} className={field}>
              <option value="">Pilih bidang</option>
              {bidangList.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Abstrak singkat
            <textarea value={draf.abstrak} disabled={!bisaEdit} required minLength={30} onChange={(e) => ubah({ abstrak: e.target.value })} className={`${field} min-h-24 py-3`} />
          </label>
          <label className="block text-sm font-semibold">
            Rencana metode
            <input value={draf.metode} disabled={!bisaEdit} required onChange={(e) => ubah({ metode: e.target.value })} className={field} />
          </label>

          <fieldset>
            <legend className="text-sm font-semibold">Pilihan pembimbing (urut prioritas)</legend>
            <p className="text-xs text-low">Hanya dosen yang kuotanya masih tersedia.</p>
            <div className="mt-2 space-y-2">
              {Array.from({ length: k.jumlahPilihanPembimbing }, (_, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-20 shrink-0 text-xs text-mid">Pilihan {i + 1}</span>
                  <select
                    value={draf.pilihan[i] ?? ''}
                    disabled={!bisaEdit}
                    required={i === 0}
                    onChange={(e) => {
                      const pilihan = [...draf.pilihan]
                      pilihan[i] = e.target.value
                      ubah({ pilihan })
                    }}
                    className={field}
                  >
                    <option value="">{i === 0 ? 'Pilih dosen' : 'Opsional'}</option>
                    {tersedia
                      .filter((d) => d.nidn === draf.pilihan[i] || !draf.pilihan.includes(d.nidn))
                      .map((d) => (
                        <option key={d.nidn} value={d.nidn}>
                          {d.nama} · {d.bidang.join(', ')} · sisa kuota {sisaKuota(d, k.kuotaPembimbingDefault)}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          {bisaEdit ? (
            <button disabled={!syaratMulai.layak} className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold">
              <Send className="h-4 w-4" aria-hidden /> {syaratMulai.layak ? 'Ajukan judul' : 'Syarat mulai belum terpenuhi'}
            </button>
          ) : (
            <p className="text-xs text-mid">
              <Badge tone="blue">Terkunci</Badge> Judul sudah diajukan/ditetapkan. Perubahan judul atau pembimbing harus lewat pengajuan baru di bawah.
            </p>
          )}
          {galat && (
            <p role="alert" className="text-sm text-rose">
              {galat}
            </p>
          )}
        </form>
      </Section>

      {!bisaEdit && s.ta.status !== 'DITOLAK' && <AjukanPerubahan />}
    </div>
  )
}

/** Perubahan judul/pembimbing = pengajuan baru yang butuh persetujuan; data TIDAK langsung berubah. */
function AjukanPerubahan() {
  const [jenis, setJenis] = useState<'judul' | 'pembimbing'>('judul')
  const [isi, setIsi] = useState('')
  const [list, setList] = useState<{ id: string; jenis: string; isi: string }[]>([])
  return (
    <Section title="Ajukan perubahan">
      <form
        className="glass space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault()
          setList((l) => [{ id: `PRB-${l.length + 1}`, jenis, isi }, ...l])
          setIsi('')
        }}
      >
        <div className="flex gap-2">
          {(['judul', 'pembimbing'] as const).map((j) => (
            <label key={j} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-glass-strong px-3 text-sm">
              <input type="radio" checked={jenis === j} onChange={() => setJenis(j)} className="accent-[var(--primary)]" /> Ubah {j}
            </label>
          ))}
        </div>
        <textarea value={isi} onChange={(e) => setIsi(e.target.value)} required minLength={10} placeholder="Usulan & alasan perubahan" className="min-h-20 w-full rounded-2xl border border-line bg-glass p-4 outline-none focus:border-cyan" />
        <button className="btn-primary min-h-11 w-full rounded-2xl text-sm font-semibold">Kirim pengajuan perubahan</button>
      </form>
      {list.map((x) => (
        <div key={x.id} className="glass mt-2 flex items-center gap-2 p-3 text-sm">
          <span className="flex-1">
            Ubah {x.jenis}: {x.isi}
          </span>
          <Badge tone="amber">Menunggu persetujuan</Badge>
        </div>
      ))}
    </Section>
  )
}
