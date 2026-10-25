# Super UNPAM

**Super App Universitas Pamulang** — *Semua layanan kampus dalam satu aplikasi.*

PWA lintas platform (web, Windows, macOS, Android, iOS) yang menjadi launcher untuk seluruh layanan di portal SSO SATU UNPAM.

## Fitur (v0.2): satu aplikasi, semua fitur di dalam
Tidak ada lagi kartu yang membuka situs lain. Semua layanan dirender di dalam Super UNPAM:

- **KTM Digital**: kartu bisa dibalik, QR dinamis berganti tiap 30 detik (anti screenshot), kode verifikasi, simpan/bagikan, tersedia offline
- **Presensi Online**: scan QR dosen pakai kamera (BarcodeDetector), presensi lokasi dengan geofence kampus, input kode sesi, rekap kehadiran dengan peringatan < 75%. Mode dosen: buka sesi dengan QR + kode berganti dan hitung peserta live
- **Akademik**: jadwal mingguan, KRS (kuota real-time, batas SKS, pengajuan), nilai & KHS per semester
- **Kuliah Online**: kelas, progres, pertemuan, tugas & kuis
- **Keuangan**: tagihan UKT, virtual account, riwayat pembayaran
- **Layanan**: event (daftar/batal), sertifikasi profesi, TOEFL, prestasi & peringkat, tracer study, kerjasama
- Login di dalam aplikasi, pencarian global (fitur, mata kuliah, event), notifikasi, favorit, tema gelap/terang, ID/EN, sesi perangkat, tombol SOS
- PWA: installable, offline, shortcuts (KTM, Presensi, Jadwal, Bayar), update prompt

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
