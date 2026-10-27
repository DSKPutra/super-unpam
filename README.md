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

## Lapisan data & BFF

Halaman **tidak** mengimpor `src/data/demo.ts` langsung. Semua data lewat adapter `src/lib/api.ts` (hook `useResource` + komponen `Async` untuk skeleton, error, dan "Coba lagi").

| `VITE_USE_DEMO` | Perilaku |
|---|---|
| tidak di-set / `true` (bawaan) | Data contoh di klien, sama seperti sebelumnya. Aman untuk Netlify/static hosting. |
| `false` | Klien memanggil BFF `/api/...` (Vercel Functions). Sesi = cookie `HttpOnly; Secure; SameSite=Lax`. |

BFF ada di folder `api/`:
- `auth/[action].ts`: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` (validasi zod, rate limit dasar)
- `academic`, `kuliah`, `finance`, `campus`: data baca per domain; setiap endpoint memverifikasi sesi dan peran
- `qr/[action].ts`: QR KTM/presensi ditandatangani server (HMAC, berganti tiap 30 detik), plus `POST /api/qr/verify` untuk petugas
- `presensi/[action].ts`: validasi QR/kode/geofence di server; koordinat kampus hanya di konfigurasi server
- `_connectors/`: satu antarmuka per sistem sumber (SSO, MY UNPAM, MENTARI, SISKEMU, EMS, MY LSP, MY LB, SISPEMA, portal), masing-masing dengan implementasi `mock` dan `http`

Environment variable server (lihat `.env.example`):

| Nama | Wajib | Keterangan |
|---|---|---|
| `SESSION_SECRET` | ya | ≥ 32 karakter acak, untuk menandatangani cookie sesi |
| `QR_SECRET` | ya | ≥ 32 karakter acak, berbeda dari `SESSION_SECRET` |
| `CONNECTOR_MODE` | tidak | `mock` (bawaan) atau `http`; per sistem: `CONNECTOR_SSO`, `CONNECTOR_MY_UNPAM`, … |
| `CAMPUS_GEOFENCES` | tidak | JSON `[{name,lat,lng,radius}]` koordinat resmi; tanpa ini dipakai perkiraan data contoh |
| `ALLOW_MOCK_LOGIN_IN_PRODUCTION` | tidak | Login mock menolak di production kecuali di-set `true` |

Uji lokal mode BFF: `vercel dev` (dengan `VITE_USE_DEMO=false`, `SESSION_SECRET`, dan `QR_SECRET` di environment). Akun mock: username berawalan `dosen`, `tendik`, atau `alumni` masuk sebagai peran tersebut; selainnya mahasiswa.

## TODO backend (BFF)
Sudah: adapter data, BFF dengan konektor mock, sesi cookie HttpOnly, QR bertanda tangan server, validasi presensi di server.

Belum:
- Konektor `http` ke sistem kampus asli. Daftar pertanyaan untuk LPTI ada di [docs/KONEKTOR.md](docs/KONEKTOR.md).
- Koordinat & radius kampus resmi (`CAMPUS_GEOFENCES`).
- Penyimpanan sesi & rate limit bersama (Redis/KV), supaya "keluar dari semua perangkat" dan batas laju berlaku lintas instance.
- Aksi tulis (kumpul tugas, ajukan KRS, daftar event, bayar) masih simulasi lokal di klien.
- Nomor kontak darurat resmi (`SosSheet` di `src/App.tsx`).

## Instalasi per platform
| Platform | Cara |
|---|---|
| Android / Chrome / Edge | Banner "Pasang aplikasi" atau menu ⋮ → Install app |
| iOS / iPadOS (16.4+) | Safari → Bagikan → Tambah ke Layar Utama |
| Windows / macOS | Chrome/Edge → ikon install di address bar; Safari (Sonoma+) → Add to Dock |
