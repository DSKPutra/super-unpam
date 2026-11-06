# Master Prompt — Super UNPAM (Super App PWA Universitas Pamulang)

> Nama produk: **Super UNPAM**.
> Dokumen ini berisi: (1) nama produk & positioning, (2) master prompt siap-pakai untuk AI builder / tim engineering, (3) daftar modul & subdomain terkonfirmasi, (4) catatan teknis PWA lintas platform, (5) prompt perombakan UI/UX tema futuristik + ikon 3D (Section 6), (6) prompt fitur tambahan yang tetap ringan (Section 7), (7) prompt distribusi unduhan desktop & mobile (Section 8), (8) prompt tombol Download cerdas di homepage (Section 9). Serahkan ke tim LPTI / developer.

---

## 1. Konteks penting sebelum mulai

UNPAM **sudah punya** aplikasi mobile resmi: **"Univers by UNPAM"**
- iOS: App Store ID `6759666942` (pengembang: LPTI Universitas Pamulang)
- Android: `com.unpam.univers` (pengembang: Yayasan Sasmita Jaya, 50K+ unduhan)
- Status: rilis perdana v1.0 "Big Bang", **v2 sedang disiapkan** dengan fitur lebih lengkap.
- Tagline resmi: *"A comprehensive academic system where students can access everything they need in one place — no more switching sites."*

**Implikasi:** Proyek ini bukan membangun dari nol, melainkan mengangkat aplikasi Univers yang sudah ada menjadi **super app PWA lintas platform** dan me-rebrand-nya sebagai **Super UNPAM** (menggantikan/mendampingi app native, satu codebase untuk web + desktop + mobile). Teknis migrasi: lanjutkan package & listing store yang sudah ada (`com.unpam.univers` di Android + App Store ID `6759666942`) agar 50K+ pengguna ter-update mulus; nama tampil (display name) dan branding diganti ke "Super UNPAM" lewat update, bukan app baru — kecuali LPTI memutuskan listing store terpisah.

Portal SSO yang sudah ada: **SATU UNPAM** (`satu.unpam.ac.id`) — "SSO Integrated System". Super app ini pada dasarnya adalah **shell/launcher untuk seluruh aplikasi di SATU UNPAM** dengan single sign-on.

---

## 2. Nama produk & positioning

**Nama final: Super UNPAM.**

- Nama produk: **Super UNPAM** — *Super App Universitas Pamulang*.
- Tagline: *"Semua layanan kampus dalam satu aplikasi."*
- Positioning: satu aplikasi lintas platform (web, Windows, macOS, Android, iOS) yang menyatukan seluruh layanan di portal SSO SATU UNPAM; evolusi dari aplikasi Univers yang sudah ada.

Catatan penerapan merek untuk tim LPTI:
- Pakai "Super UNPAM" sebagai display name app, judul PWA (`name` di manifest), dan nama di store.
- `short_name` (manifest / ikon home screen): **Super UNPAM** atau **SuperUNPAM**.
- Karena "Super" relatif generik, kuatkan pembeda lewat **logo + warna khas UNPAM + kata UNPAM** yang selalu menyatu ("Super UNPAM", jangan "Super" saja) agar tetap mudah ditemukan di store dan tidak tertukar dengan aplikasi ber-nama "super" lain.
- Untuk SEO/store, isi deskripsi dengan kata kunci: "Universitas Pamulang", "UNPAM", "super app kampus", "akademik", nama-nama modul (MY UNPAM, MENTARI, dll).

Alternatif cadangan bila dibutuhkan kelak (tidak dipakai sekarang): **Univers** (lanjutkan brand lama), **SATU UNPAM** (angkat nama portal SSO).

---

## 3. MASTER PROMPT (siap tempel ke AI builder / brief engineering)

```
PERAN
Kamu adalah principal engineer + product designer. Bangun sebuah SUPER APP
Progressive Web App (PWA) untuk Universitas Pamulang (UNPAM) yang menyatukan
SELURUH layanan digital kampus yang saat ini tersebar di portal SSO
"SATU UNPAM" (satu.unpam.ac.id) ke dalam SATU aplikasi lintas platform.

Nama produk: "Super UNPAM" (Super App Universitas Pamulang). Ini adalah
evolusi & rebrand dari aplikasi mobile resmi yang sudah ada, "Univers by
UNPAM", menjadi PWA satu-codebase yang berjalan sebagai:
- Web app (browser desktop & mobile)
- Installable app di Windows & macOS (via PWA / TWA)
- Installable app di Android & iOS (Add to Home Screen, service worker, push)

TUJUAN UTAMA
Mahasiswa, dosen, dan staf cukup login SEKALI (SSO) lalu mengakses semua
sub-aplikasi tanpa berpindah situs. "One login, every service."

ARSITEKTUR
- Model: App Shell + micro-frontend / module registry. Shell menyediakan
  navigasi, auth, notifikasi, pencarian global, theming. Tiap layanan kampus
  tampil sebagai "module card" di launcher (meniru grid Aplikasi Digital di
  SATU UNPAM), dibuka sebagai:
    (a) native module (kalau sudah ada API/data), atau
    (b) embedded web view / deep-link ke sub-domain resmi (fallback).
- SSO: integrasikan dengan SSO SATU UNPAM (OAuth2 / OIDC / SAML — konfirmasi
  dengan tim LPTI). Satu sesi token dipakai lintas modul. Dukung refresh token,
  logout global, dan device session management (SATU UNPAM punya menu
  "Sesi Perangkat").
- Role-based UI: tampilkan modul sesuai peran (MAHASISWA / DOSEN / TENDIK /
  ALUMNI). Contoh user real: "DEA SAKA KURNIA PUTRA — MAHASISWA".
- Offline-first: service worker cache app shell + data read-only (jadwal,
  pengumuman, KHS). Aksi tulis butuh online.
- Backend-for-frontend (BFF) sebagai API gateway tunggal yang mem-proxy ke
  tiap sistem backend kampus, menyeragamkan auth & response.

MODUL / SUB-APLIKASI YANG HARUS DIDUKUNG
(dari dashboard SATU UNPAM — PRIORITAS 1)
1.  MY UNPAM     — Sistem Informasi Akademik mahasiswa (SIA): KRS, KHS,
                   jadwal, nilai, pembayaran. [tag: UNPAM, SIA, AKADEMIK]
2.  MENTARI      — Manajemen pembelajaran daring / e-learning (LMS).
                   [tag: MENTARI, ELEARNING, LEARNING]
3.  SISPEMA      — Sistem pemeringkatan mahasiswa / prestasi akademik.
                   [tag: SISPEMA, AKADEMIK, PEMERINGKATAN]
4.  SISKERMA     — Sistem kerjasama (MOU/MOA/IA). [tag: SISKERMA, KERJASAMA, IA]
5.  MY LSP       — Sistem sertifikasi profesi UNPAM. [tag: SAKURA, KURIKULUM, KKNI]
6.  MY LB        — Lembaga Bahasa / TOEFL. [tag: SAKURA, KURIKULUM, KKNI]
7.  TRACER STUDY — Pelacakan & survei alumni. [tag: ALUMNI, TRACER-STUDY]
8.  EMS          — Event Management System (seminar, PKKMB). [tag: EVENT, SEMINAR, PKKMB]

(ekosistem UNPAM lain — PRIORITAS 2, konfirmasi ketersediaan ke LPTI)
9.  SAKURA       — kurikulum / KKNI
10. ELEARNING / ELANOS
11. SINOVBIS     — inovasi bisnis
12. HRMS         — kepegawaian (dosen/tendik)
13. SISKEMU      — keuangan
14. PMB          — penerimaan mahasiswa baru (pmb.unpam.ac.id)
15. SPMB         — seleksi penerimaan (spmb.unpam.ac.id)
16. OJS          — open journal system (openjournal.unpam.ac.id)
17. EPRINTS      — repository
18. Kerjasama    — kerjasama.unpam.ac.id
CATATAN: Daftar final subdomain HARUS divalidasi lewat inventarisasi internal
LPTI (DNS zone / daftar aplikasi SSO), bukan ditebak. Sediakan "module config"
berbasis JSON agar modul bisa ditambah tanpa rebuild (lihat FITUR #10).

KATEGORI / FILTER (dari SATU UNPAM): Akademik, Prestasi, Kerjasama, Kurikulum,
Penelitian, Keuangan, SDM. Launcher harus bisa difilter per kategori + search.

FITUR INTI
1.  Launcher/home: grid "module card" dgn ikon, deskripsi, tag, kategori —
    mereplikasi UX "Aplikasi Digital" SATU UNPAM, tapi native & lebih cepat.
2.  Global search bar: "Halo [Nama], hari ini mau buka aplikasi apa?" —
    cari modul + konten (mata kuliah, pengumuman, dokumen).
3.  SSO single login + biometric unlock (WebAuthn) di perangkat yang mendukung.
4.  Unified notifications: push (FCM/APNs via web push), pusat notifikasi,
    badge per modul (mis. tagihan jatuh tempo, tugas baru, nilai keluar).
5.  Dashboard personal per-role: ringkasan jadwal hari ini, tagihan, tugas,
    IPK/IPS, event terdekat, progress sertifikasi.
6.  Dark/light mode (SATU UNPAM sudah punya toggle tema) + aksesibilitas WCAG.
7.  Multi-bahasa: Indonesia (default) + English.
8.  Device session management ("Sesi Perangkat"): lihat & cabut sesi.
9.  Profil terpadu + KTM digital (QR / barcode) untuk presensi & akses kampus.
10. MODULE REGISTRY: konfigurasi modul (nama, ikon, url/deeplink, scope role,
    kategori, tag, mode render native/webview) disimpan sebagai data —
    admin bisa menambah/menyembunyikan modul tanpa deploy ulang.
11. Audit & keamanan: HTTPS only, CSP ketat, token di secure storage, rate
    limiting di BFF, log akses. Jangan simpan kredensial di localStorage.

FITUR BARU — BENCHMARK SUPER APP KAMPUS KELAS DUNIA & TERBAIK INDONESIA
(fitur di bawah BELUM ada di SATU UNPAM / Univers v1 — tambahkan di v2.
Benchmark: SIMASTER UGM, MyUI/TemanKuliah UI, My USK, UNSOED Super App,
Law UII Super App, UCSI SuperApp (Malaysia), Victoria University App
(Good Design Award, Australia), Studo (app mahasiswa rating tertinggi
Jerman/Austria, 30+ fungsi), MyWLV/MyBedsLife (Platinum UK), Goethe Uni.)

=== A. KEHIDUPAN KAMPUS & MOBILITAS ===
12. Presensi pintar: Presensi QR (dosen buka sesi → mahasiswa scan) + Presensi
    GPS/geofence + anti-mock-GPS/anti-fake-location. (SIMASTER UGM vNEXT)
13. Checkpoint / gate access: scan QR atau input kode untuk masuk gedung,
    perpustakaan, lab, parkir. Registrasi kendaraan (plat) → "UGM Gate"-style
    akses kendaraan berbasis QR/kamera. (SIMASTER UGM UGM Gate + Checkpoint)
14. Peta kampus interaktif + navigasi indoor/outdoor: cari gedung/ruang,
    rute, titik drop-off. Integrasi dgn jadwal → "ruang kelasmu berikutnya di
    sini, begini cara ke sana". (Victoria University App — GPS-linked timetable)
15. Transportasi kampus: info shuttle/bus + bike-sharing (pinjam-kunci-kayuh
    sepeda via GPS). (PIT SIMASTER UGM — bike sharing)
16. Jadwal cerdas: kalender terpadu (kuliah + tugas + ujian + event), reminder
    otomatis, sinkron ke Google/Apple Calendar, deteksi bentrok.

=== B. KEUANGAN & DOMPET DIGITAL ===
17. Dompet kampus / e-wallet: saldo, top-up, riwayat transaksi, bayar di
    kantin/koperasi/perpustakaan via QRIS. (UGM: virtual account, ID billing,
    e-wallet kampus)
18. Pembayaran UKT/SPP terpadu: tagihan, virtual account, cicilan, status
    pembayaran real-time, e-receipt. Reminder jatuh tempo.
19. Beasiswa & bantuan keuangan: info, pendaftaran, status, pencairan.

=== C. KOMUNIKASI, KOMUNITAS & SOSIAL ===
20. Chat & forum: direct message + grup per-kelas/mata kuliah + forum tanya-
    jawab antar mahasiswa. (Studo course chat; UK apps discussion forums)
21. Direktori & kontak: cari dosen/staf/mahasiswa, klik-telepon/email/WA,
    booking jam konsultasi dosen (office hours). (MyBedsLife staff contacts)
22. Pusat Krisis / SOS: tombol darurat → telepon/WA ke keamanan kampus,
    konseling, kesehatan mental. Tampil menonjol. (SIMASTER UGM "Pusat Krisis")
23. Organisasi & UKM: direktori ormawa/UKM, pendaftaran, agenda, keanggotaan,
    sertifikat keaktifan (poin SKKM/SKPI).
24. Papan lowongan & karier: magang, lowongan kerja, job fair, integrasi
    Tracer Study & CDC. (Studo student jobs; UI TemanKuliah)

=== D. AKADEMIK LANJUTAN ===
25. KRS/registrasi dari HP: ambil mata kuliah, lihat kuota kelas real-time,
    simulasi jadwal. (fitur andalan app kampus terbaik: mobile registration)
26. Transkrip & SKPI digital: unduh KHS/transkrip ber-QR terverifikasi,
    e-ijazah/e-sertifikat dgn verifikasi publik (blockchain/hash — opsional).
27. Perpustakaan digital: pencarian katalog, pinjam/perpanjang, e-book,
    e-journal (sambung OJS/EPRINTS), checkpoint kunjungan. (SIMASTER lib)
28. Bimbingan & skripsi: pengajuan judul, bimbingan online, tracking revisi,
    jadwal sidang, dosen pembimbing.
29. Logbook MBKM/KKN/magang/PKL: pencatatan aktivitas, approval dosen,
    konversi SKS. (UNM KKN; relevan Merdeka Belajar)

=== E. PENGALAMAN & PERSONALISASI ===
30. Home tiles yang bisa dikustom: user menata/menyembunyikan tile & modul
    favorit. "Menu Favorit". (Univ. Stirling switch-off tiles; SIMASTER favorit)
31. Berita & pengumuman tertarget: feed per-prodi/fakultas/angkatan,
    kategori, bookmark. (MyUI UI — fitur Berita)
32. Widget layar & app shortcuts: quick action ke presensi, jadwal, saldo,
    KTM QR langsung dari home screen OS.
33. Gamifikasi & engagement: badge, progress akademik, streak presensi,
    leaderboard prestasi (sambung SISPEMA).
34. Pusat bantuan & feedback in-app: FAQ, live chat/chatbot, lapor bug,
    rating fitur. (Studo in-app support)
35. Asisten AI kampus (opsional, diferensiator): chatbot RAG yg jawab soal
    jadwal, tagihan, prosedur akademik, lokasi ruang — pakai data user +
    basis pengetahuan UNPAM. Guardrail & privasi ketat.

=== F. AKSESIBILITAS & INKLUSI (angkat jadi standar) ===
36. Aksesibilitas penuh: screen reader/VoiceOver, teks besar, kontras cukup,
    "differentiate without color", reduce motion. (Studo — standar aksesibilitas
    app mahasiswa rating tertinggi)
37. Mode hemat data & offline: akses jadwal/KHS/KTM/peta tanpa internet.

=== G. ADMIN & ANALITIK (sisi institusi) ===
38. Dashboard admin real-time: monitoring aktivitas, statistik pemakaian
    modul, kesehatan sistem. (UGM dashboard terpadu real-time)
39. Broadcast & notifikasi tersegmentasi: kirim pengumuman ke segmen tertentu
    (prodi, angkatan, status pembayaran).
40. White-label ready: arsitektur modular agar bisa di-rebrand/konfig untuk
    unit/fakultas. (Victoria University App — model white-label ke kampus lain)

CARA MEMPRIORITASKAN: v2 fokus A (presensi, peta, jadwal cerdas) + B (dompet,
UKT) + C22 (SOS) + E30/31 (personalisasi, berita) karena dampak harian tertinggi.
Sisanya masuk roadmap v2.x. Setiap fitur baru tetap tunduk pada aturan SSO,
role-based, keamanan, dan module-registry di atas.

PWA & LINTAS PLATFORM — WAJIB
- Web App Manifest lengkap: name "Super UNPAM", short_name "Super UNPAM"
  (atau "SuperUNPAM"), description menyebut "Universitas Pamulang" + modul,
  icons (maskable 192/512), theme_color, background_color,
  display: "standalone", start_url, shortcuts (quick action ke modul
  populer), categories: ["education"].
- Service Worker: precache app shell, runtime cache (stale-while-revalidate
  utk data, network-first utk API, cache-first utk aset). Update prompt
  "versi baru tersedia".
- Installability: tampilkan custom install prompt (beforeinstallprompt) di
  Android/Chrome/Edge; panduan "Add to Home Screen" utk iOS Safari.
- Desktop (Windows/macOS): installable via Chrome/Edge PWA. Sediakan juga
  opsi bungkus sbg app desktop (Tauri atau Electron) kalau butuh fitur OS
  (notifikasi native, auto-update, deep OS integration) — dokumentasikan
  trade-off-nya.
- Android store presence: bungkus PWA sbg TWA (Trusted Web Activity / Bubblewrap)
  agar bisa submit ke Play Store dgn satu codebase.
- iOS: PWA (standalone) + jika perlu store presence, bungkus dgn Capacitor/
  WKWebView wrapper. Dokumentasikan keterbatasan web push iOS (butuh iOS 16.4+
  & app ter-install ke home screen).
- Push notification: Web Push (VAPID) utk Android/desktop; APNs utk wrapper iOS.
- Responsiveness: mobile-first, breakpoint ke tablet & desktop. Launcher grid
  adaptif (2 kolom mobile → 5 kolom desktop seperti SATU UNPAM).

STACK YANG DISARANKAN (boleh diganti, beri alasan)
- Frontend: React + TypeScript + Vite PWA plugin (atau Next.js PWA),
  state: TanStack Query, UI: Tailwind + shadcn/ui, i18n: i18next.
- PWA: Workbox utk service worker. Capacitor utk wrapper iOS/Android bila perlu.
  Tauri utk desktop bila perlu.
- Auth: OpenID Connect client (oidc-client-ts) terhadap IdP SATU UNPAM.
- BFF: Node (NestJS) atau sesuai standar LPTI, sebagai API gateway.

DELIVERABLE
1. Arsitektur + diagram (app shell, module registry, SSO flow, BFF).
2. Desain UI: home launcher, search, dashboard per-role, detail modul,
   notifikasi, profil/KTM, pengaturan (tema, bahasa, sesi perangkat).
   Ikuti gaya SATU UNPAM: kartu putih rounded, aksen biru UNPAM, bersih.
3. Kode PWA installable (manifest + service worker lulus Lighthouse PWA).
4. module-config.json contoh berisi 8 modul Prioritas 1.
5. Panduan instalasi per platform (Windows, macOS, Android, iOS, web).
6. Catatan integrasi SSO + checklist keamanan.

BATASAN
- Jangan tebak endpoint internal — pakai placeholder + TODO yg jelas untuk
  tim LPTI isi. Gunakan subdomain resmi *.unpam.ac.id hanya sbg deep-link.
- Semua aset merek (logo, warna) tunggu brand kit resmi UNPAM.

MULAI DENGAN: usulan arsitektur + wireframe home launcher + manifest.json +
service worker skeleton + module-config.json untuk 8 modul Prioritas 1.
```

---

## 4. Subdomain / modul terkonfirmasi (sumber publik)

Yang pasti ada di dashboard SATU UNPAM: MY UNPAM, MENTARI, SISPEMA, SISKERMA, MY LSP, MY LB, TRACER STUDY, EMS.

Subdomain resmi yang muncul di sumber publik UNPAM:
- `satu.unpam.ac.id` — portal SSO
- `unpam.ac.id` — situs utama
- `pmb.unpam.ac.id` — penerimaan mahasiswa baru
- `spmb.unpam.ac.id` — seleksi penerimaan
- `openjournal.unpam.ac.id` — jurnal (OJS)
- `kerjasama.unpam.ac.id` — kerjasama

Modul ekosistem yang disebut dokumen resmi (LLDIKTI Wilayah IV): SAKURA, ELEARNING, ELANOS, SINOVBIS, HRMS, SISKEMU, OJS, EPRINTS, MYLSP, MYLB/TOEFL, SISPEMA, SISKERMA, PAK, SISTER/BKD, dll.

> **Cara benar melengkapi daftar:** minta ke tim **LPTI UNPAM** (pengelola Univers & SATU UNPAM) berupa (a) daftar aplikasi terdaftar di IdP SSO, dan (b) DNS zone file `unpam.ac.id`. Ini jauh lebih akurat dan sah dibanding scanning/crawling dari luar.

---

## 5. Catatan teknis singkat PWA lintas platform

| Platform | Cara jalan | Catatan |
|---|---|---|
| Web (desktop/mobile browser) | Langsung buka URL | Baseline |
| Windows | Install via Edge/Chrome PWA | Bisa juga Tauri/Electron utk fitur OS |
| macOS | Install via Chrome/Edge PWA / Safari (Sonoma+ "Add to Dock") | Tauri utk .app native |
| Android | PWA install prompt + TWA ke Play Store | Web Push jalan penuh |
| iOS/iPadOS | Add to Home Screen (standalone) | Web Push butuh iOS 16.4+ & ter-install; utk Play/App Store pakai Capacitor |

Satu codebase (React PWA) → web + Windows + macOS + Android + iOS. Wrapper (Tauri/Capacitor) hanya dipakai bila butuh distribusi via store atau fitur OS native.

---

## 6. PROMPT PEROMBAKAN UI/UX — TEMA FUTURISTIK (siap tempel)

> Tujuan: merombak tampilan **Super UNPAM** agar lebih enak dilihat, warna
> nyaman, ikon 3D futuristik, dan tema keseluruhan futuristik — tanpa mengubah
> arsitektur, modul, SSO, atau fitur di Section 3. Ini brief visual, bukan
> ganti fungsi.

```
PERAN
Kamu adalah senior product designer + design engineer. Rombak total tampilan
(UI/UX) super app "Super UNPAM" menjadi modern & FUTURISTIK, enak dipandang,
dengan palet warna nyaman dan ikon 3D futuristik — sambil MEMPERTAHANKAN
seluruh struktur, modul, SSO, role, dan fitur yang sudah didefinisikan.
Jangan mengubah alur fungsional; ubah kulit visual, hierarki, warna, ikon,
tipografi, gerak, dan micro-interaction.

ARAH DESAIN (DESIGN DIRECTION)
- Mood: "Futuristic campus OS" — bersih, lega, berteknologi tinggi, tapi tetap
  ramah mahasiswa Indonesia. Hindari kesan ramai/norak. Elegan > ramai.
- Gaya visual inti: GLASSMORPHISM + NEON GLOW LEMBUT + GRADIENT MESH.
  Kartu kaca semi-transparan (frosted) di atas latar gradient gelap bercahaya,
  aksen neon tipis, sudut membulat besar, kedalaman berlapis (depth).
- Dark-mode FIRST (default futuristik), sediakan juga light-mode terang yang
  tetap bersih. Toggle tema harus mulus (tanpa flicker).
- Layout: BENTO GRID — kartu berukuran beragam tersusun rapi (dashboard &
  launcher). Banyak ruang kosong (whitespace/negative space), grid 8pt.
- Bahasa visual konsisten: satu sistem untuk semua modul (jangan tiap modul
  beda gaya).

SISTEM WARNA (pakai sebagai design tokens — nilai HEX tepat)
Dark theme (utama / futuristik):
  --bg-space-900:    #070B14   (latar terdalam)
  --bg-space-800:    #0A0E1A   (latar utama)
  --surface-800:     #111726   (permukaan kartu solid)
  --surface-glass:   rgba(255,255,255,0.06)  (kartu kaca; backdrop-blur 18–24px)
  --border-hairline: rgba(255,255,255,0.08)
  --primary-500:     #2D6BFF   (biru elektrik — brand UNPAM dinaikkan)
  --primary-400:     #4D86FF
  --cyan-400:        #00D4FF   (aksen cyan)
  --violet-500:      #7A5CFF   (aksen sekunder)
  --mint-400:        #00E5C0   (sukses / positif)
  --amber-400:       #FFB020   (peringatan)
  --rose-500:        #FF4D6D   (bahaya / tagihan jatuh tempo)
  --text-hi:         #EAF0FF   (teks utama)
  --text-mid:        #9AA7C7   (teks sekunder)
  --text-low:        #64728F   (teks redup/caption)
Gradient tanda tangan (brand):
  --grad-primary: linear-gradient(135deg, #2D6BFF 0%, #00D4FF 100%)
  --grad-aurora:  radial mesh dari #2D6BFF, #7A5CFF, #00D4FF (latar dekoratif,
                  opacity rendah, blur tinggi — "aurora/orb" mengambang)
Glow: box-shadow neon tipis memakai warna aksen, mis.
  0 0 24px rgba(45,107,255,0.35) untuk elemen aktif/hover.
Light theme (terang, tetap futuristik):
  --bg:        #F4F7FE   --surface: #FFFFFF
  --primary:   #1B4BE0   --accent: #00A8E8
  --text-hi:   #0B1222   --text-mid: #4A5775
  Kartu: putih dgn shadow lembut + hairline halus; gradient aksen tetap dipakai.
Aturan kontras: semua teks WAJIB lulus WCAG AA (≥4.5:1 teks normal). Jangan
andalkan warna saja untuk makna (tambah ikon/label) — inklusif untuk buta warna.

IKON 3D FUTURISTIK (wajib)
- Setiap modul (MY UNPAM, MENTARI, SISPEMA, dll) & aksi utama punya ikon 3D:
  gaya isometrik/3D ter-render, glossy, material kaca+logam, rim-light neon,
  pencahayaan konsisten (sumber cahaya kiri-atas ~45°), bayangan lembut.
- Palet ikon selaras dgn token di atas (biru-cyan-violet), tiap modul boleh
  punya aksen warna sendiri untuk kemudahan dikenali, tapi tetap satu keluarga.
- Produksi (pilih yang paling praktis, dokumentasikan):
    (a) Render 3D siap pakai — mis. set "3D Fluency"/3dicons.co/Microsoft 3D
        atau render custom (Blender/Spline) diekspor PNG/WebP @1x–3x.
    (b) Spline/Three.js untuk 1–3 ikon "hero" yang beranimasi (hemat; jangan
        semua ikon animasi berat).
    (c) Fallback ringan: ikon duotone-gradient ber-depth (SVG) bila performa
        jadi isu di perangkat low-end.
- Ikon harus tajam di light & dark (beri varian/stroke rim agar tak "hilang").
- Ukuran: optimalkan berat aset (WebP/AVIF, lazy-load, sprite); jangan korbankan
  skor Lighthouse/PWA demi ikon berat.

TIPOGRAFI
- Heading: font geometric/techy — Space Grotesk / Sora / Clash Display.
- Body & UI: Inter / Plus Jakarta Sans (enak untuk Bahasa Indonesia, angka jelas).
- Skala tipe konsisten (mis. 12/14/16/20/24/32/40), line-height lega,
  tracking sedikit rapat untuk heading.

KOMPONEN & POLA
- Kartu kaca (glass card) dgn radius 20–28px, border hairline, glow saat hover.
- Navigasi: bottom-nav (mobile) + side-rail (desktop), gaya "floating glass".
- Launcher modul: bento grid kartu + ikon 3D + nama + tag; filter kategori jadi
  "pill" ber-glow aktif; search bar besar ber-glass di atas.
- Dashboard: kartu ringkas (jadwal hari ini, tagihan, tugas, event) ukuran
  beragam ala bento; angka penting besar + sparkline.
- State lengkap: loading (skeleton shimmer), empty, error, success — semua
  bertema futuristik.
- KTM digital & QR: tampil sebagai "kartu hologram" (gradient + shine) agar
  terasa premium.

GERAK & MICRO-INTERACTION (halus, tidak lebay)
- Animasi spring lembut; hover = lift + glow; tap = ripple/scale.
- Transisi antar halaman mulus; latar aurora/orb bergerak sangat pelan.
- Shimmer saat memuat. Hormati prefers-reduced-motion (matikan animasi berat).
- Target 60fps; animasi pakai transform/opacity (hindari layout thrash).

PRINSIP UX (jangan dikorbankan demi estetika)
- Hierarki jelas, tap target ≥44px, kontras cukup, teks terbaca di bawah sinar
  matahari (mode terang), navigasi konsisten, satu aksi utama per layar.
- Tetap cepat & ringan (ingat ini PWA lintas perangkat, termasuk HP kelas bawah):
  efek blur/glow dibatasi & di-GPU-accelerate; sediakan mode hemat efek.
- Aksesibilitas penuh (screen reader, teks besar, reduce motion) tetap jalan.

DELIVERABLE
1. Design tokens final (CSS variables / konfigurasi Tailwind) untuk dark & light.
2. Komponen kunci dalam gaya baru: app shell, bottom-nav/side-rail, glass card,
   launcher bento + ikon 3D, search, dashboard, detail modul, profil + KTM
   hologram, pengaturan (tema/bahasa/sesi).
3. Satu set ikon 3D untuk 8 modul Prioritas 1 + ikon aksi inti (presensi, QR,
   dompet, jadwal, notifikasi), beserta sumber/metode produksinya.
4. Spesifikasi gerak (durasi, easing) + aturan prefers-reduced-motion.
5. Bukti kontras WCAG AA untuk kombinasi warna utama.
6. Mockup hi-fi: Home/Launcher, Dashboard, Detail Modul, Profil/KTM — dark & light.

BATASAN
- Jangan ubah arsitektur, SSO, modul, atau fitur (lihat Section 3). Hanya kulit.
- Warna brand tetap berakar biru UNPAM; "futuristik" = eksekusi, bukan ganti
  identitas. Semua aset final (logo/warna pasti) menunggu brand kit resmi UNPAM.
- Jaga performa & skor Lighthouse PWA; efek berat harus punya fallback.

MULAI DENGAN: moodboard singkat + design tokens (dark & light) + redesain
layar Home/Launcher bento dengan ikon 3D, lalu Dashboard.
```

### Catatan singkat penerapan
- Simpan palet di atas sebagai **CSS custom properties** pada `:root` (dark) dan
  override di `:root[data-theme="light"]` / `@media (prefers-color-scheme)` agar
  toggle tema di Section 3 (FITUR #6) langsung berfungsi.
- Untuk ikon 3D, mulai dari set siap pakai (cepat), ganti bertahap ke render
  custom bila ingin identitas unik — jangan menahan rilis demi ikon sempurna.
- Uji di HP kelas bawah sejak awal: glassmorphism + glow itu indah tapi berat;
  sediakan "mode hemat efek" agar sejalan dengan FITUR #37 (hemat data/offline).

---

## 7. PROMPT FITUR TAMBAHAN (hasil cek gap — WAJIB tetap ringan)

> Hasil pengecekan fitur super app kampus global & Indonesia (SIMASTER UGM,
> MyUI, Studo, app UK, SIAKAD Cloud, TouchNet, dll). Fitur 41–53 di bawah BELUM
> ada di daftar 1–40. Prinsip utama: **tambah nilai, JANGAN tambah berat.**

```
PERAN
Kamu adalah product engineer. Tambahkan fitur 41–53 berikut ke super app
"Super UNPAM" TANPA membuat aplikasi menjadi berat. Mayoritas fitur ini
cukup berupa form + status + daftar (ringan). Patuhi "ANGGARAN PERFORMA" di
bawah secara ketat; fitur yang berpotensi berat WAJIB lazy-load / on-demand /
webview, bukan dibundel ke inti.

ANGGARAN PERFORMA (hard rules — utamakan di atas segalanya)
- Core app shell (yang dimuat saat buka) tetap kecil: target JS awal < 200KB
  gzip; setiap modul di-CODE-SPLIT & lazy-load saat diklik, bukan di-bundle.
- Tiap fitur baru = rute/chunk terpisah (dynamic import). Menambah fitur TIDAK
  boleh menaikkan ukuran bundel awal.
- Data via API ringan + cache (stale-while-revalidate); jangan preload data
  modul yang belum dibuka. Paginate daftar panjang (virtual list).
- Aset: ikon 3D sebagai WebP/AVIF lazy-load; tidak ada library berat untuk
  fitur yang bisa dikerjakan form sederhana.
- Fitur "berat opsional" (pemesanan kantin, peta berat) → muat on-demand atau
  embed webview ke sistem yang sudah ada; JANGAN jadi beban inti.
- Pertahankan skor Lighthouse PWA (Performance ≥ 90 di mobile mid-range).
- Target total: TTI < 3.5s di 4G HP kelas menengah; app shell cached → buka
  ulang < 1s.

FITUR 41–53 (semua tunduk SSO + role + module-registry Section 3)

— Ringan (prioritas; cukup form/daftar/status) —
41. Layanan surat & administrasi mandiri: ajukan surat keterangan aktif kuliah,
    legalisir, pengajuan transkrip/ijazah, surat izin — dengan tracking status
    & e-sign/e-stamp. (sangat dibutuhkan kampus ID; implementasi ringan: form +
    workflow approval + unduh PDF)
42. EDOM & survei: kuesioner evaluasi dosen/perkuliahan tiap semester + survei
    kepuasan layanan. (form dinamis, ringan)
43. Exam center: jadwal ujian, nomor kursi, kartu ujian ber-QR, tata tertib.
    (daftar + QR, ringan)
44. Registrasi ulang & cuti akademik: her-registrasi per semester, pengajuan
    cuti/aktif kembali, status pembayaran terkait. (form + status)
45. Booking fasilitas & ruang: ruang diskusi/perpus, lab, lapangan olahraga,
    slot bimbingan dosen — pilih slot + konfirmasi. (kalender slot, ringan)
46. Kotak aspirasi & pengaduan (lapor/whistleblowing): kirim aspirasi/laporan,
    anonim opsional, dengan tracking tindak lanjut. (form + status)
47. Dompet sertifikat & badge digital: kumpulan sertifikat seminar (EMS), LSP,
    SKPI, badge MBKM dalam satu tempat, ber-QR verifikasi publik. (daftar +
    QR; sinkron ke modul terkait — ringan)
48. Pusat layanan Islami (konteks Yayasan): jadwal sholat (hitung lokal via
    koordinat, tanpa aset berat), arah kiblat (kompas), reminder, info kegiatan
    keagamaan. (ringan; jangan bundel audio/aset besar — streaming bila perlu)
49. Alumni & mentorship: direktori alumni, mentoring, lowongan dari alumni —
    perluasan Tracer Study. (daftar + profil, ringan)
50. Onboarding tour + referral: panduan pengguna baru (new user journey) +
    ajak teman. (ringan; tur sekali jalan, bisa di-skip)

— Periodik / on-demand (muat hanya saat dipakai) —
51. E-voting Pemira: pemilihan BEM/HMJ online yang aman & auditable. Modul
    dimuat on-demand hanya saat periode pemilihan; sisanya tidak membebani app.

— Opsional / fase lanjut (berpotensi berat → JANGAN di inti) —
52. Pemesanan kantin/koperasi: menu + pre-order + bayar QRIS. Implementasi
    ringan: webview/partner atau modul lazy-load terpisah; aktifkan bila UNPAM
    siap. Jangan memaksakan ke rilis awal bila menambah berat.
53. Marketplace mahasiswa & info kos: barang bekas, info kos, part-time.
    Opsional, lazy-load/webview; nilai tambah tapi bukan inti.

CARA PRIORITAS: kerjakan 41–47 dulu (ringan, dampak harian tinggi, khas kampus
Indonesia). 48–50 menyusul. 51 on-demand. 52–53 hanya bila tidak mengorbankan
ringannya app.

DELIVERABLE
1. Tiap fitur sebagai modul code-split + entri di module-config.json.
2. Bukti ukuran bundel inti TIDAK bertambah (laporan bundle-analyzer sebelum/
   sesudah).
3. Skor Lighthouse PWA tetap ≥ 90 (mobile) setelah semua fitur ditambah.
```

---

## 8. PROMPT DISTRIBUSI — UNDUH DI DESKTOP (WINDOWS & macOS) + MOBILE (iOS & ANDROID)

> Satu codebase PWA → bisa diunduh/di-install di 4 platform. Tetap ringan:
> wrapper hanya membungkus PWA, bukan menduplikasi logika.

```
PERAN
Kamu adalah release/build engineer. Buat agar "Super UNPAM" (PWA di Section 3)
bisa DIUNDUH & DI-INSTALL sebagai aplikasi di:
- Windows (desktop)   - macOS (desktop)   - Android   - iOS/iPadOS
Pakai SATU codebase PWA yang sudah ada; wrapper hanya shell tipis. Jangan
menambah berat ke aplikasi web-nya.

PRASYARAT (dari PWA Section 3 — pastikan lulus)
- Manifest valid (name "Super UNPAM", short_name, icons maskable 192/512/1024,
  theme_color, display "standalone", shortcuts).
- Service worker (Workbox) + HTTPS + lulus Lighthouse "Installable".
Dengan ini, PWA sudah bisa di-install langsung dari browser di semua platform
sebagai baseline — langkah di bawah menambah "versi toko/installer" resmi.

ANDROID
- Install langsung: PWA install prompt (beforeinstallprompt) → "Install".
- Versi Play Store: bungkus PWA sebagai TWA (Trusted Web Activity) via
  Bubblewrap/PWABuilder → hasil .aab untuk Google Play. Set assetlinks.json
  (Digital Asset Links) agar TWA tampil tanpa bar browser.
- Output: link Play Store + APK/AAB. Ringan (TWA hanya shell ~beberapa ratus KB).

iOS / iPadOS
- Install langsung: "Add to Home Screen" (Safari) → jalan standalone. Sediakan
  panduan in-app (iOS tak punya install prompt otomatis).
- Versi App Store: bungkus PWA dengan Capacitor (WKWebView) → submit ke App
  Store. Siapkan APNs untuk push (web push iOS butuh iOS 16.4+ & ter-install).
- Output: link App Store + build TestFlight.

WINDOWS (desktop)
- Install langsung: via Edge/Chrome → "Install Super UNPAM" (PWA desktop).
- Versi installer/Store: PWABuilder → paket MSIX untuk Microsoft Store, ATAU
  bungkus dengan Tauri (ringan, pakai WebView2 bawaan Windows — jauh lebih kecil
  dari Electron) → installer .exe/.msi ber-tanda tangan (code signing).
- Output: .msix (Store) atau .exe/.msi (unduh langsung).

macOS (desktop)
- Install langsung: Safari (Sonoma+) "Add to Dock", atau Chrome/Edge "Install".
- Versi .app/installer: Tauri → .dmg/.app (notarized oleh Apple) untuk diunduh;
  opsional submit ke Mac App Store.
- Output: .dmg (notarized) untuk unduh langsung.

PRINSIP RINGAN
- Pakai Tauri (WebView2/WebKit sistem), BUKAN Electron, agar ukuran desktop app
  kecil (puluhan MB, bukan ratusan). Wrapper tidak menyalin logika — hanya
  memuat PWA yang sama.
- Satu sumber kebenaran: update konten lewat PWA (auto-update service worker);
  wrapper jarang perlu rilis ulang.
- Auto-update: desktop (Tauri updater), store handle update mobile.

DELIVERABLE
1. Konfigurasi TWA (Android), Capacitor (iOS), Tauri (Win/macOS) + skrip build.
2. assetlinks.json & apple-app-site-association (bila pakai universal links).
3. Checklist code signing: Windows (EV/OV cert), macOS (notarization), Play
   (keystore), App Store (provisioning).
4. Panduan rilis per toko + versi unduh-langsung (.exe/.dmg) dari situs.
5. Matriks ukuran artefak (bukti desktop app tetap ringan via Tauri).
```

---

## 9. PROMPT TOMBOL DOWNLOAD DI HOMEPAGE (install cerdas per platform)

> Tujuan: di homepage/landing Super UNPAM ada tombol **Download/Install** yang
> otomatis menyesuaikan perangkat pengunjung. Ringan: hanya deteksi + CTA.

```
PERAN
Kamu adalah frontend engineer. Tambahkan bagian "Download / Install" yang
menonjol di HOMEPAGE Super UNPAM dengan tombol unduh CERDAS (platform-aware).
Komponen ringan (deteksi platform + tombol); tanpa library berat.

PERILAKU TOMBOL (deteksi platform otomatis)
- Android (Chrome/Edge): tampilkan tombol "Install Aplikasi" yang memicu PWA
  install (tangkap event beforeinstallprompt → panggil prompt() saat diklik).
  Tampilkan juga badge "Google Play" (TWA) bila sudah rilis.
- iOS/iPadOS (Safari): tombol "Install di iPhone/iPad" → buka sheet panduan
  "Add to Home Screen" (ikon Share → Tambahkan ke Layar Utama), karena iOS tak
  punya prompt otomatis. Tampilkan badge "App Store" bila sudah rilis.
- Windows: tombol "Install untuk Windows" → picu PWA install bila tersedia;
  sediakan link Microsoft Store (.msix) / unduh .exe (Tauri).
- macOS: tombol "Install untuk Mac" → panduan "Add to Dock" (Safari) atau unduh
  .dmg (Tauri).
- Desktop browser lain / fallback: tampilkan QR code → scan untuk buka di HP,
  plus semua tautan toko.

TAMPILAN (ikuti tema futuristik Section 6)
- Satu section "hero" atau kartu glass berisi: judul singkat, 1 tombol utama
  yang sudah menyesuaikan platform (label & aksi berubah otomatis), dan baris
  badge toko (Play Store / App Store / Microsoft Store) + link "unduh desktop".
- Tombol utama bergaya gradient brand + glow; tampilkan ikon platform terdeteksi.
- Sertakan QR code (ringan, generate sekali) untuk pindah ke mobile.
- State: jika app SUDAH terpasang (display-mode: standalone / getInstalledRelated
  Apps), sembunyikan tombol install dan tampilkan "Buka Aplikasi".

TEKNIS (ringan)
- Deteksi via userAgent + matchMedia('(display-mode: standalone)') + event
  beforeinstallprompt (simpan, picu saat klik). Tidak perlu library UA berat.
- Komponen ini code-split; tidak menambah beban halaman lain.
- Aksesibilitas: tombol ber-label jelas, fokus keyboard, kontras AA.
- Sediakan halaman khusus /download berisi semua opsi + petunjuk tiap platform,
  dan tautkan dari homepage.

DELIVERABLE
1. Komponen <DownloadCTA /> platform-aware (homepage) + halaman /download.
2. Logika beforeinstallprompt + deteksi sudah-terpasang.
3. Sheet panduan iOS "Add to Home Screen" + panduan macOS "Add to Dock".
4. Badge toko + link unduh desktop (.exe/.dmg/.msix) + QR code.
5. Semua lulus kontras AA & tidak menambah bundel awal secara signifikan.
```
