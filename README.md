# Super UNPAM

**Super App Universitas Pamulang** — *Semua layanan kampus dalam satu aplikasi.*

PWA lintas platform (web, Windows, macOS, Android, iOS) yang menjadi launcher untuk seluruh layanan di portal SSO SATU UNPAM.

## Fitur (v0.1)
- Launcher modul dengan pencarian, filter kategori, dan favorit
- **Module registry** berbasis `public/module-config.json`, jadi modul bisa ditambah tanpa rebuild
- UI berbasis peran (MAHASISWA / DOSEN / TENDIK / ALUMNI)
- Dasbor, notifikasi, KTM digital (QR), pengaturan (tema, bahasa ID/EN, sesi perangkat), tombol SOS
- PWA: manifest + shortcuts, service worker (Workbox), offline app shell, prompt update, prompt install (Android/desktop) dan panduan iOS
- Header keamanan (CSP, HSTS, dll.) di `vercel.json`

## Pengembangan
```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # output ke dist/
```

## TODO untuk LPTI
- Konfigurasi OIDC IdP SATU UNPAM di `src/lib/auth.ts` (mode demo aktif sampai tersedia)
- URL/deeplink resmi tiap modul di `public/module-config.json` (lihat field `todo`)
- BFF / API gateway (`/api/*`) untuk dasbor, notifikasi, sesi perangkat, payload KTM bertanda tangan
- Nomor kontak darurat resmi di `SosSheet` (`src/App.tsx`)
- Brand kit resmi (logo & warna)

## Instalasi per platform
| Platform | Cara |
|---|---|
| Android / Chrome / Edge | Banner "Pasang aplikasi" atau menu ⋮ → Install app |
| iOS / iPadOS (16.4+) | Safari → Bagikan → Tambah ke Layar Utama |
| Windows / macOS | Chrome/Edge → ikon install di address bar; Safari (Sonoma+) → Add to Dock |
