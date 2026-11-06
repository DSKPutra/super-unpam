import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, EyeOff, Pencil, RefreshCw, Send, Star, UserRound } from 'lucide-react'
import { getSchedule, USE_DEMO } from '../../lib/api'
import { bacaDraf, demoTransport, hapusDraf, httpTransport, kemajuan, simpanDraf, sisaHari, susunPayload, validasi, type Jawaban, type Kuesioner, type Nilai, type Pertanyaan } from '../../lib/kuesioner'
import { usePref } from '../../lib/prefs'
import { useResource } from '../../lib/useResource'
import type { ScheduleItem, User } from '../../lib/types'
import { Async, Badge, DemoNote, PageHeader, Progress, Skeleton } from '../../components/ui'

// #42 EDOM & survei — satu pertanyaan per layar, draf otomatis, ringkasan sebelum kirim.
// Definisi kuesioner CONTOH; TODO(BFF): daftar kuesioner, tenggat, dan token anonim dari server.

const EDOM_PERTANYAAN: Pertanyaan[] = [
  { id: 'jelas', teks: 'Dosen menjelaskan materi dengan jelas', tipe: 'skala', wajib: true, opsi: ['Sangat kurang', 'Sangat baik'] },
  { id: 'hadir', teks: 'Dosen hadir dan tepat waktu', tipe: 'skala', wajib: true, opsi: ['Sangat kurang', 'Sangat baik'] },
  { id: 'rps', teks: 'Materi sesuai RPS', tipe: 'skala', wajib: true, opsi: ['Sangat kurang', 'Sangat baik'] },
  { id: 'nilai', teks: 'Penilaian adil dan transparan', tipe: 'skala', wajib: true, opsi: ['Sangat kurang', 'Sangat baik'] },
  { id: 'metode', teks: 'Metode belajar yang paling membantu di kelas ini', tipe: 'pilihan', wajib: true, opsi: ['Ceramah dan diskusi', 'Praktik/latihan', 'Studi kasus/proyek', 'Materi daring (MENTARI)'] },
  { id: 'saran', teks: 'Saran untuk dosen (opsional)', tipe: 'teks', wajib: false, maxLength: 500 },
]

const SURVEI_LAYANAN: Kuesioner = {
  id: 'survei-layanan-2026-ganjil',
  judul: 'Survei Kepuasan Layanan Akademik',
  subjudul: 'BAAK · Semester Ganjil 2026/2027',
  anonim: false,
  tenggat: '2026-11-30T16:59:59Z',
  pertanyaan: [
    { id: 'cepat', teks: 'Layanan administrasi diproses dengan cepat', tipe: 'skala', wajib: true, opsi: ['Sangat tidak setuju', 'Sangat setuju'] },
    { id: 'kanal', teks: 'Kanal layanan yang paling sering Anda gunakan', tipe: 'pilihan', wajib: true, opsi: ['Loket BAAK', 'Super UNPAM', 'Email', 'Media sosial'] },
    { id: 'masukan', teks: 'Masukan untuk perbaikan layanan (opsional)', tipe: 'teks', wajib: false, maxLength: 500 },
  ],
}

const edomFor = (c: ScheduleItem): Kuesioner => ({
  id: `edom-2026-ganjil-${c.code}`,
  judul: `Evaluasi Dosen: ${c.name}`,
  subjudul: c.lecturer,
  anonim: true,
  tenggat: '2026-11-14T16:59:59Z',
  pertanyaan: EDOM_PERTANYAAN,
})

interface Terkirim {
  struk: string
  demo: boolean
  waktu: string
}

export function Edom({ user, back }: { user: User; back: () => void }) {
  const res = useResource(getSchedule)
  return (
    <Async res={res} skeleton={<><PageHeader title="EDOM & Survei" onBack={back} /><Skeleton /></>}>
      {(schedule) => <EdomView schedule={schedule} user={user} back={back} />}
    </Async>
  )
}

function EdomView({ schedule, user, back }: { schedule: ScheduleItem[]; user: User; back: () => void }) {
  const daftar = useMemo(() => [...schedule.slice(0, 4).map(edomFor), SURVEI_LAYANAN], [schedule])
  const [aktif, setAktif] = useState<string | null>(null)
  const [terkirim, setTerkirim] = usePref<Record<string, Terkirim>>('kuesioner.terkirim', {})
  const k = daftar.find((x) => x.id === aktif)

  if (k)
    return (
      <IsiKuesioner
        k={k}
        user={user}
        onBack={() => setAktif(null)}
        onSent={(s) => {
          setTerkirim({ ...terkirim, [k.id]: s })
          setAktif(null)
        }}
      />
    )

  return (
    <div>
      <PageHeader title="EDOM & Survei" subtitle="Isi sebelum melihat nilai semester" onBack={back} />
      <DemoNote />
      <ul className="glass divide-y divide-line overflow-hidden">
        {daftar.map((x) => {
          const sent = terkirim[x.id]
          const draf = sent ? null : bacaDraf(x)
          const sisa = sisaHari(x.tenggat)
          return (
            <li key={x.id}>
              <button disabled={!!sent} onClick={() => setAktif(x.id)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-glass-strong disabled:hover:bg-transparent">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{x.judul}</div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-low">
                    <span>{x.subjudul}</span>
                    <span className="inline-flex items-center gap-1">{x.anonim ? <EyeOff className="h-3 w-3" aria-hidden /> : <UserRound className="h-3 w-3" aria-hidden />}{x.anonim ? 'Anonim' : 'Bernama'}</span>
                    {sisa !== null && !sent && <span className={sisa <= 3 ? 'font-semibold text-rose' : ''}>{sisa < 0 ? 'Tenggat lewat' : sisa === 0 ? 'Tenggat hari ini' : `Tenggat ${sisa} hari lagi`}</span>}
                  </div>
                </div>
                {sent ? (
                  <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Terkirim{sent.demo ? ' (demo)' : ''}</Badge>
                ) : draf ? (
                  <Badge tone="blue">Draf {kemajuan(x, draf.jawaban).persen}%</Badge>
                ) : (
                  <Badge tone="amber">Belum diisi</Badge>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function IsiKuesioner({ k, user, onBack, onSent }: { k: Kuesioner; user: User; onBack: () => void; onSent: (s: Terkirim) => void }) {
  const awal = useMemo(() => bacaDraf(k), [k])
  const [jawaban, setJawaban] = useState<Jawaban>(awal?.jawaban ?? {})
  // 0 = pengantar, 1..n = pertanyaan, n+1 = ringkasan
  const [langkah, setLangkah] = useState(awal?.langkah ?? 0)
  const [galat, setGalat] = useState('')
  const [kirim, setKirim] = useState<'idle' | 'proses' | 'gagal'>('idle')
  const [pesanKirim, setPesanKirim] = useState('')
  const judulRef = useRef<HTMLHeadingElement>(null)
  const n = k.pertanyaan.length
  const prog = kemajuan(k, jawaban)

  useEffect(() => simpanDraf(k, { jawaban, langkah }), [k, jawaban, langkah])
  // Fokus ke judul tiap langkah agar pembaca layar membaca pertanyaan baru.
  useEffect(() => judulRef.current?.focus(), [langkah])

  const set = (id: string, v: Nilai) => {
    setJawaban((j) => ({ ...j, [id]: v }))
    setGalat('')
  }
  const lanjut = () => {
    const p = k.pertanyaan[langkah - 1]
    const e = p ? validasi(p, jawaban[p.id]) : null
    if (e) return setGalat(e)
    setLangkah((s) => Math.min(s + 1, n + 1))
  }
  const kembali = () => (langkah === 0 ? onBack() : (setGalat(''), setLangkah((s) => s - 1)))

  const submit = async () => {
    setKirim('proses')
    setPesanKirim('')
    try {
      // TODO(BFF): token sekali pakai dari server untuk kuesioner anonim; mode demo membuat token lokal.
      const payload = susunPayload(k, jawaban, { nim: user.nim, token: k.anonim ? crypto.randomUUID() : undefined })
      const struk = await (USE_DEMO ? demoTransport : httpTransport)(payload)
      hapusDraf(k)
      onSent({ struk: struk.id, demo: struk.demo, waktu: new Date().toISOString() })
    } catch (e) {
      setKirim('gagal')
      setPesanKirim(`${(e as Error).message} Jawaban Anda tetap tersimpan sebagai draf.`)
    }
  }

  const p = langkah >= 1 && langkah <= n ? k.pertanyaan[langkah - 1] : null
  return (
    <div>
      <PageHeader title={k.judul} subtitle={k.subjudul} onBack={kembali} />
      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-xs text-mid">
          <span>{p ? `Pertanyaan ${langkah} dari ${n}` : langkah === 0 ? 'Pengantar' : 'Ringkasan'}</span>
          <span>{prog.terjawab}/{prog.total} terjawab</span>
        </div>
        <Progress value={prog.persen} />
      </div>

      {langkah === 0 && (
        <div className="glass space-y-3 p-5">
          <h2 ref={judulRef} tabIndex={-1} className="text-lg font-bold outline-none">{k.anonim ? 'Kuesioner anonim' : 'Kuesioner bernama'}</h2>
          {k.anonim ? (
            <p className="text-sm text-mid">
              Jawaban Anda dikirim <strong className="text-hi">tanpa NIM dan nama</strong>. Server hanya menerima token sekali pakai untuk mencegah pengisian ganda, sehingga dosen tidak dapat mengetahui siapa yang mengisi.
            </p>
          ) : (
            <p className="text-sm text-mid">Jawaban dikirim bersama NIM Anda agar dapat ditindaklanjuti.</p>
          )}
          <p className="text-sm text-mid">{n} pertanyaan. Jawaban tersimpan otomatis di perangkat ini sampai terkirim{k.anonim ? ' (hilang bila tab ditutup)' : ''}.</p>
          <button onClick={() => setLangkah(1)} className="btn-primary min-h-12 w-full rounded-2xl font-semibold">{awal ? 'Lanjutkan mengisi' : 'Mulai'}</button>
        </div>
      )}

      {p && (
        <fieldset className="glass p-5" aria-describedby={galat ? 'q-galat' : undefined}>
          <legend className="sr-only">{p.teks}</legend>
          <h2 ref={judulRef} tabIndex={-1} className="text-lg font-semibold outline-none">
            {p.teks} {p.wajib && <span className="text-rose" aria-label="wajib">*</span>}
          </h2>
          <div className="mt-4">
            <InputPertanyaan p={p} value={jawaban[p.id]} onChange={(v) => set(p.id, v)} />
          </div>
          <p id="q-galat" role="alert" className="mt-3 min-h-5 text-sm font-semibold text-rose">{galat}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={kembali} className="inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-glass-strong font-semibold"><ArrowLeft className="h-4 w-4" aria-hidden /> Kembali</button>
            <button onClick={lanjut} className="btn-primary inline-flex min-h-12 flex-1 items-center justify-center gap-1 rounded-2xl font-semibold">{langkah === n ? 'Ringkasan' : 'Lanjut'} <ArrowRight className="h-4 w-4" aria-hidden /></button>
          </div>
        </fieldset>
      )}

      {langkah === n + 1 && (
        <div>
          <h2 ref={judulRef} tabIndex={-1} className="mb-3 text-lg font-bold outline-none">Periksa jawaban Anda</h2>
          <ol className="glass divide-y divide-line overflow-hidden">
            {k.pertanyaan.map((q, i) => {
              const v = jawaban[q.id]
              const e = validasi(q, v)
              return (
                <li key={q.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{i + 1}. {q.teks}</div>
                    <div className={`mt-1 text-sm ${e ? 'text-rose' : 'text-mid'}`}>{e ?? (v === undefined || v === '' ? '— (dilewati)' : q.tipe === 'skala' ? `${v} dari ${q.max ?? 5}` : String(v))}</div>
                  </div>
                  <button onClick={() => setLangkah(i + 1)} className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-cyan" aria-label={`Ubah jawaban pertanyaan ${i + 1}`}>
                    <Pencil className="h-4 w-4" aria-hidden /> Ubah
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="mt-3 text-xs text-low">{k.anonim ? 'Dikirim tanpa NIM dan nama.' : `Dikirim atas nama ${user.nim}.`}{USE_DEMO && ' Mode demo: tidak ada yang benar-benar terkirim.'}</p>
          <p role="status" aria-live="polite" className="mt-2 text-sm font-semibold text-rose">{pesanKirim}</p>
          <button onClick={submit} disabled={!prog.siapKirim || kirim === 'proses'} className="btn-primary mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl font-semibold">
            {kirim === 'gagal' ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            {kirim === 'proses' ? 'Mengirim…' : kirim === 'gagal' ? 'Coba lagi' : 'Kirim jawaban'}
          </button>
        </div>
      )}
    </div>
  )
}

function InputPertanyaan({ p, value, onChange }: { p: Pertanyaan; value: Nilai | undefined; onChange: (v: Nilai) => void }) {
  if (p.tipe === 'skala') {
    const min = p.min ?? 1
    const max = p.max ?? 5
    return (
      <div>
        <div className="flex gap-2" role="radiogroup" aria-label={p.teks}>
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
            <label key={n} className="flex-1">
              <input type="radio" name={p.id} value={n} className="peer sr-only" checked={value === n} onChange={() => onChange(n)} />
              <span className="flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl bg-glass-strong text-sm font-semibold text-mid peer-checked:bg-[var(--primary)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cyan">
                <Star className="h-4 w-4" aria-hidden /> {n}
              </span>
            </label>
          ))}
        </div>
        {p.opsi && (
          <div className="mt-1.5 flex justify-between text-xs text-low">
            <span>{p.opsi[0]}</span>
            <span>{p.opsi[1]}</span>
          </div>
        )}
      </div>
    )
  }
  if (p.tipe === 'pilihan')
    return (
      <div className="space-y-2" role="radiogroup" aria-label={p.teks}>
        {(p.opsi ?? []).map((o) => (
          <label key={o} className="block">
            <input type="radio" name={p.id} value={o} className="peer sr-only" checked={value === o} onChange={() => onChange(o)} />
            <span className="flex min-h-12 cursor-pointer items-center rounded-xl bg-glass-strong px-4 text-sm font-semibold text-mid peer-checked:bg-[var(--primary)] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cyan">{o}</span>
          </label>
        ))}
      </div>
    )
  const max = p.maxLength ?? 1000
  const text = typeof value === 'string' ? value : ''
  return (
    <div>
      <textarea value={text} maxLength={max} onChange={(e) => onChange(e.target.value)} aria-label={p.teks} className="min-h-32 w-full rounded-xl border border-line bg-glass-strong p-3 outline-none focus:border-cyan" />
      <div className="mt-1 text-right text-xs text-low" aria-live="polite">{text.length}/{max}</div>
    </div>
  )
}
