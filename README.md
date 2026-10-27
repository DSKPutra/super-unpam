# Super UNPAM

**Super App Universitas Pamulang** — *Semua layanan kampus dalam satu aplikasi.*

PWA lintas platform (web, Windows, macOS, Android, iOS) yang menjadi launcher untuk seluruh layanan di portal SSO SATU UNPAM.

## Fitur (v0.4): satu aplikasi, semua fitur di dalam

Tampilan memakai tema futuristik dark-first dengan **logo resmi UNPAM**. Detail desainnya ada di [DESIGN.md](DESIGN.md).

- **Inti**: KTM digital (hologram, QR dinamis), presensi online (QR/GPS/kode), akademik (jadwal, KRS, nilai), kuliah online, keuangan, event, sertifikasi, TOEFL, prestasi, tracer study, kerjasama, notifikasi, SOS
- **Layanan tambahan**:
  - #41 Surat & administrasi
  - #42 EDOM & survei
  - #43 Exam center (kartu ujian ber-QR)
  - #44 Registrasi ulang & cuti
  - #45 Booking fasilitas
  - #46 Aspirasi & pengaduan (bisa anonim)
  - #47 Dompet sertifikat
  - #48 Layanan Islami (jadwal sholat dihitung lokal, kompas kiblat)
  - #49 Alumni & mentorship
  - #50 Onboarding + ajak teman
  - #51 E-voting Pemira (dimuat on-demand)
- **Ringan**: setiap halaman adalah chunk terpisah yang dimuat saat dibuka. JS awal ±67 KB gzip, jauh di bawah anggaran 200 KB.
- **Download cerdas**: tombol install menyesuaikan Android, iOS, Windows, atau macOS. Halaman `/#/download` dan QR untuk HP juga tersedia.
- **Distribusi**: installer desktop `.exe`/`.msi`/`.dmg` dibangun otomatis (Tauri). Config Android TWA dan iOS Capacitor juga sudah ada. Lihat [DISTRIBUSI.md](DISTRIBUSI.md).

## Deploy otomatis ke Vercel

Setiap **push ke `main`** otomatis ter-deploy ke production, dan setiap **pull request** mendapat link preview. Prosesnya berjalan lewat GitHub Actions (`.github/workflows/deploy-vercel.yml`). Project Vercel dibuat otomatis saat deploy pertama.

Pengaturan satu kali (±1 menit):
1. Buat token di https://vercel.com/account/tokens. Isi **Scope** dengan tim **Putra Talks**, lalu salin token-nya.
2. Di GitHub, buka repo ini → **Settings → Secrets and variables → Actions → New repository secret**. Isi Name `VERCEL_TOKEN` dan Secret dengan token tadi.
3. Buka tab **Actions → Deploy ke Vercel → Run workflow** (atau push apa saja ke `main`). Link production muncul di ringkasan job.

Opsional, lewat tab **Variables** di halaman yang sama:
- `VERCEL_SCOPE`: slug tim, default `putratalks`.
- `VERCEL_PROJECT`: nama project, default `super-unpam`.

> Jangan hubungkan repo ini juga lewat integrasi Git di dashboard Vercel, karena setiap push akan ter-deploy dua kali.

## Pengembangan
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # output ke dist/
```

## TODO backend (BFF)
Semua data saat ini adalah **data contoh** (`src/data/demo.ts`). Langkah berikutnya:
- `POST /api/auth/login`: verifikasi akun kampus, sesi via cookie HttpOnly (`src/lib/auth.ts`)
- Token QR KTM/presensi ditandatangani server (`src/pages/Ktm.tsx`)
- Validasi presensi (QR/kode/geofence) di server; koordinat kampus resmi (`src/pages/Presensi.tsx`)
- Endpoint jadwal, KRS, nilai, kelas, tugas, tagihan, event, sertifikasi, TOEFL, prestasi
- Nomor kontak darurat resmi (`SosSheet` di `src/App.tsx`)

## Instalasi per platform
| Platform | Cara |
|---|---|
| Android / Chrome / Edge | Banner "Pasang aplikasi" atau menu ⋮ → Install app |
| iOS / iPadOS (16.4+) | Safari → Bagikan → Tambah ke Layar Utama |
| Windows / macOS | Chrome/Edge → ikon install di address bar; Safari (Sonoma+) → Add to Dock |
