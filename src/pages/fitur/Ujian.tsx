import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { AlertTriangle, Armchair, CalendarClock, CheckCircle2, MapPin, Printer, ScrollText, Share2 } from 'lucide-react'
import type { User } from '../../lib/types'
import { Badge, DemoNote, LinkBtn, PageHeader, Section } from '../../components/ui'

// #43 Exam center — jadwal ujian, nomor kursi, kartu ujian ber-QR, tata tertib, cetak/simpan PDF.

interface Syarat {
  ok: boolean
  label: string
  /** Penjelasan bila belum terpenuhi + rute penyelesaiannya. */
  alasan?: string
  route?: string
}

interface UjianItem {
  code: string
  name: string
  date: string
  time: string
  room: string
  seat: string
  syarat: Syarat[]
}

// Data CONTOH. TODO(BFF): kartu ujian, kursi, dan status syarat dari MY UNPAM (kehadiran) dan SISKEMU (keuangan).
const KARTU = { id: 'KU-2026-GJ-7F3A9C21', jenis: 'UTS', periode: 'Ganjil 2026/2027' }
const EXAMS: UjianItem[] = [
  {
    code: 'TIF301', name: 'Pemrograman Web', date: 'Sen, 16 Nov 2026', time: '08:00–09:40', room: 'Gedung A · 402', seat: 'A-17',
    syarat: [{ ok: true, label: 'Kehadiran' }, { ok: true, label: 'Administrasi keuangan' }],
  },
  {
    code: 'TIF303', name: 'Basis Data Lanjut', date: 'Sel, 17 Nov 2026', time: '10:00–11:40', room: 'Gedung B · 305', seat: 'C-04',
    syarat: [{ ok: true, label: 'Kehadiran' }, { ok: true, label: 'Administrasi keuangan' }],
  },
  {
    code: 'TIF305', name: 'Kecerdasan Buatan', date: 'Rab, 18 Nov 2026', time: '13:00–14:40', room: 'Lab Komputer 3', seat: 'PC-22',
    syarat: [
      { ok: false, label: 'Kehadiran', alasan: 'Kehadiran belum memenuhi batas minimal (contoh).', route: 'presensi' },
      { ok: true, label: 'Administrasi keuangan' },
    ],
  },
]
const RULES = ['Hadir 15 menit sebelum ujian dimulai.', 'Tunjukkan kartu ujian (QR) kepada pengawas.', 'HP dimatikan dan disimpan di tas.', 'Wajib berpakaian rapi dan bersepatu.']

const memenuhi = (e: UjianItem) => e.syarat.every((s) => s.ok)
const waktu = (d: Date) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short' }).format(d)

export function Ujian({ user, back, go }: { user: User; back: () => void; go: (r: string) => void }) {
  const [qr, setQr] = useState('')
  const [printedAt, setPrintedAt] = useState(() => new Date())
  const [shareMsg, setShareMsg] = useState('')

  useEffect(() => {
    // QR hanya memuat ID kartu, tanpa NIM/nama. TODO(BFF): verifikasi ID kartu + tanda tangan di server.
    QRCode.toDataURL(`SUPERUNPAM:UJIAN:${KARTU.id}`, { margin: 1, width: 320, color: { dark: '#000000', light: '#ffffff' } }).then(setQr)
  }, [])

  // Waktu cetak diperbarui tepat sebelum dialog cetak (termasuk Ctrl+P dari menu browser).
  useEffect(() => {
    const on = () => setPrintedAt(new Date())
    window.addEventListener('beforeprint', on)
    document.documentElement.classList.add('has-print-doc')
    return () => {
      window.removeEventListener('beforeprint', on)
      document.documentElement.classList.remove('has-print-doc')
    }
  }, [])

  const print = () => {
    setPrintedAt(new Date())
    // Beri React satu frame untuk merender waktu cetak sebelum dialog dibuka.
    requestAnimationFrame(() => window.print())
  }

  const share = async () => {
    setShareMsg('')
    try {
      const blob = await renderCardImage({ user, exams: EXAMS, qr, printedAt: new Date() })
      const file = new File([blob], `kartu-${KARTU.jenis.toLowerCase()}-${KARTU.id}.png`, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Kartu ${KARTU.jenis}` })
      } else {
        const url = URL.createObjectURL(blob)
        const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        setShareMsg('Gambar kartu diunduh.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setShareMsg('Gagal membuat gambar kartu.')
    }
  }

  const blocked = EXAMS.filter((e) => !memenuhi(e))

  return (
    <div>
      <PageHeader title="Exam Center" subtitle={`${KARTU.jenis} ${KARTU.periode}`} onBack={back} />
      <DemoNote />
      <div className="glass flex flex-col items-center gap-4 p-5 sm:flex-row">
        {qr && <img src={qr} alt="QR kartu ujian" width={144} height={144} className="h-36 w-36 rounded-xl bg-white p-1.5" />}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="text-xs uppercase tracking-[0.16em] text-mid">Kartu ujian digital</div>
          <div className="font-display text-lg font-bold">{user.name}</div>
          <div className="font-mono text-sm text-mid">{user.nim}</div>
          <div className="mt-1 text-xs text-low">Tunjukkan QR ini ke pengawas ruang ujian. QR hanya berisi nomor kartu.</div>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <button onClick={print} className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold">
              <Printer className="h-4 w-4" aria-hidden /> Cetak / Simpan PDF
            </button>
            <button onClick={share} disabled={!qr} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-glass-strong px-4 text-sm font-semibold">
              <Share2 className="h-4 w-4" aria-hidden /> Bagikan sebagai gambar
            </button>
          </div>
          <p className="mt-2 text-xs text-low" role="status" aria-live="polite">{shareMsg}</p>
        </div>
      </div>

      {blocked.length > 0 && (
        <div className="glass mt-4 flex gap-3 p-4 text-sm" role="note">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber" aria-hidden />
          <p>{blocked.length} mata kuliah belum memenuhi syarat ujian. Lihat alasannya di bawah; kartu tetap mencantumkannya agar jelas bagi pengawas.</p>
        </div>
      )}

      <Section title="Jadwal ujian">
        <div className="space-y-3">
          {EXAMS.map((e) => (
            <article key={e.code} className="glass p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{e.name}</div>
                {memenuhi(e) ? <Badge tone="green">Memenuhi syarat</Badge> : <Badge tone="amber">Belum memenuhi syarat</Badge>}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-mid">
                <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4 text-cyan" /> {e.date}<br />{e.time}</span>
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-rose" /> {e.room}</span>
                <span className="flex items-center gap-1"><Armchair className="h-4 w-4 text-amber" /> Kursi {e.seat}</span>
              </div>
              {e.syarat.filter((s) => !s.ok).map((s) => (
                <div key={s.label} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-glass-strong px-3 py-2 text-xs">
                  <span><strong>{s.label}:</strong> {s.alasan}</span>
                  {s.route && <LinkBtn onClick={() => go(s.route!)}>Selesaikan</LinkBtn>}
                </div>
              ))}
            </article>
          ))}
        </div>
      </Section>
      <Section title="Tata tertib">
        <ul className="glass space-y-2 p-4 text-sm">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2"><ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-cyan" /> {r}</li>
          ))}
        </ul>
      </Section>

      {createPortal(<KartuCetak user={user} qr={qr} printedAt={printedAt} />, document.body)}
    </div>
  )
}

/** Versi cetak: hanya terlihat saat mencetak (lihat .print-doc di index.css). Terang, kontras tinggi, A5. */
function KartuCetak({ user, qr, printedAt }: { user: User; qr: string; printedAt: Date }) {
  return (
    <div className="print-doc" aria-hidden>
      {/* div, bukan <header>: aturan cetak global menyembunyikan header aplikasi */}
      <div className="pd-head">
        <img src="/brand/unpam-logo-256.webp" alt="" width={56} height={56} />
        <div>
          <div className="pd-title">Kartu Ujian {KARTU.jenis}</div>
          <div>Universitas Pamulang · Semester {KARTU.periode}</div>
        </div>
      </div>
      <section className="pd-id">
        <dl>
          <dt>Nama</dt><dd>{user.name}</dd>
          <dt>NIM</dt><dd>{user.nim}</dd>
          <dt>Program studi</dt><dd>{user.prodi}</dd>
          <dt>No. kartu</dt><dd>{KARTU.id}</dd>
        </dl>
        {qr && <img className="pd-qr" src={qr} alt="" width={112} height={112} />}
      </section>
      <table className="pd-table">
        <thead>
          <tr><th>Mata kuliah</th><th>Tanggal &amp; jam</th><th>Ruang</th><th>Kursi</th><th>Syarat</th></tr>
        </thead>
        <tbody>
          {EXAMS.map((e) => (
            <tr key={e.code}>
              <td>{e.name}<br /><small>{e.code}</small></td>
              <td>{e.date}<br />{e.time}</td>
              <td>{e.room}</td>
              <td>{e.seat}</td>
              <td>
                {memenuhi(e) ? (
                  <span><CheckCircle2 className="pd-ic" /> Memenuhi</span>
                ) : (
                  e.syarat.filter((s) => !s.ok).map((s) => <span key={s.label}>✗ {s.label}: {s.alasan}</span>)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pd-foot">
        <span>Dicetak {waktu(printedAt)} dari Super UNPAM · Data contoh</span>
        <span>Keaslian kartu diverifikasi pengawas dengan memindai QR.</span>
      </div>
    </div>
  )
}

/** Fallback untuk WebView tanpa dukungan cetak: gambar kartu PNG lewat canvas. */
async function renderCardImage({ user, exams, qr, printedAt }: { user: User; exams: UjianItem[]; qr: string; printedAt: Date }): Promise<Blob> {
  const W = 1080
  const rowH = 132
  const H = 520 + exams.length * rowH + 120
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#0b1222'
  g.font = 'bold 44px system-ui, sans-serif'
  g.fillText(`Kartu Ujian ${KARTU.jenis}`, 60, 90)
  g.font = '28px system-ui, sans-serif'
  g.fillText(`Universitas Pamulang · ${KARTU.periode}`, 60, 136)
  const lines = [`Nama: ${user.name}`, `NIM: ${user.nim}`, `Prodi: ${user.prodi}`, `No. kartu: ${KARTU.id}`]
  lines.forEach((l, i) => g.fillText(l, 60, 220 + i * 46))
  if (qr) {
    const img = new Image()
    img.src = qr
    await img.decode()
    g.drawImage(img, W - 340, 170, 280, 280)
  }
  exams.forEach((e, i) => {
    const y = 520 + i * rowH
    g.fillStyle = '#e5e7eb'
    g.fillRect(60, y - 44, W - 120, 2)
    g.fillStyle = '#0b1222'
    g.font = 'bold 30px system-ui, sans-serif'
    g.fillText(e.name, 60, y)
    g.font = '26px system-ui, sans-serif'
    g.fillText(`${e.date} ${e.time} · ${e.room} · Kursi ${e.seat}`, 60, y + 38)
    const ok = memenuhi(e)
    g.fillStyle = ok ? '#047857' : '#b91c1c'
    g.fillText(ok ? 'Memenuhi syarat' : `Belum memenuhi: ${e.syarat.filter((s) => !s.ok).map((s) => s.label).join(', ')}`, 60, y + 74)
  })
  g.fillStyle = '#4a5775'
  g.font = '22px system-ui, sans-serif'
  g.fillText(`Dibuat ${waktu(printedAt)} dari Super UNPAM · Data contoh`, 60, H - 50)
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gagal'))), 'image/png'))
}
