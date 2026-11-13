# Komparasi Fitur & Kumpulan Prompt: Super UNPAM

Disusun 27 Okt 2026. Basis audit: repo `DSKPutra/super-unpam` (commit `02e3e7f`, v0.4.0) dibandingkan dengan aplikasi kampus Indonesia dan global.

## 1. Catatan sebelum membaca

- **Audit Super UNPAM dilakukan dari kode repo**, bukan dari situs live. `super-unpam.vercel.app` adalah SPA, jadi saat diambil hanya terbaca metadata (daftar 10 fitur di deskripsi). Isi aplikasi sebenarnya saya baca dari `src/`.
- **Semua data di Super UNPAM masih data contoh** (`src/data/demo.ts`). Login hanya simulasi (password ≥ 6 karakter lolos), belum ada BFF/backend. Ini temuan terbesar: sebelum menambah fitur baru, fondasi data harus nyata.
- **Pembanding hanya dinilai dari sumber publik yang berhasil saya baca.** Tanda "—" di tabel berarti *tidak ditemukan di sumber tersebut*, bukan *pasti tidak ada*. Beberapa sumber sudah lama (artikel ITS 2018/2019).
- **Celah sumber:** UI (hanya pengumuman SATU UI dan UI Mobile, tanpa daftar fitur aplikasi), ITB (hanya listing App Store MySIX dan satu artikel ITB Mobile), Stanford (halaman diblokir), Georgia Tech dan Purdue (tidak ada detail fitur yang bisa diverifikasi). Ketiganya tidak saya jadikan dasar klaim.

## 2. Yang sudah dimiliki Super UNPAM (jangan dibangun ulang)

KTM digital (QR dinamis), presensi (QR/GPS/kode, rekap), jadwal, KRS (kuota + batas SKS), nilai/KHS, kelas online dan tugas (MENTARI), pembayaran via Virtual Account dan riwayat, event (pendaftaran), sertifikasi LSP, TOEFL, prestasi/peringkat, tracer study, kerjasama, surat dan administrasi, exam center (kartu ujian ber-QR), EDOM, registrasi ulang dan cuti, booking fasilitas (termasuk slot bimbingan dosen), aspirasi anonim, dompet sertifikat, layanan Islami, alumni dan mentor, e-voting Pemira, SOS, notifikasi (daftar dalam aplikasi), pencarian global, favorit, 4 peran (mahasiswa, dosen, tendik, alumni), bahasa ID/EN, tema gelap/terang/sistem, mode hemat efek, PWA, installer desktop Tauri.

**Kekuatan yang jarang muncul di sumber pembanding:** exam center, e-voting, layanan Islami, EDOM, registrasi ulang/cuti, aspirasi anonim, mode hemat efek, dan distribusi lintas platform.

## 3. Matriks komparasi

✅ terdokumentasi di sumber · ◐ sebagian/direncanakan · — tidak ditemukan di sumber · ❌ terverifikasi belum ada di Super UNPAM

| Kapabilitas | Super UNPAM | UI | ITB | UGM | ITS | Global (contoh) |
|---|---|---|---|---|---|---|
| KTM/ID digital | ✅ | — | — | ✅ eKTM | — | — |
| Presensi | ✅ QR/GPS/kode | ✅ pantau kehadiran (SATU UI) | ✅ | ✅ QR pribadi + event | ◐ riwayat absensi untuk wali | — |
| Jadwal, KRS/IRS, nilai | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Monash, UCSD |
| Persetujuan dosen PA | ◐ status saja | ✅ | — | ◐ pintasan email DPA | — | — |
| Pembayaran | ✅ VA + riwayat | ✅ info biaya | ✅ + **ajukan cicilan** | — | ✅ status UKT (via wali) | ✅ UII (PPOB) |
| **Portal orang tua/wali** | ❌ | ◐ UI Mobile menyasar orang tua | — | ✅ Parent app | ✅ myITS Wali | ✅ Law UII |
| **Kalender terpadu** | ❌ (event saja) | — | ✅ kalender akademik | — | ✅ MyITS Calendar per unit | ✅ MIT, NUS aggregator |
| **Peta kampus / cari ruang** | ❌ | — | — | — | — | ✅ NTU indoor, Monash, MIT |
| **Angkutan kampus real-time** | ❌ | — | — | ✅ TransGama | — | ✅ NTU, MIT, ASU |
| **Push notification** | ❌ | — | — | — | — | ✅ NTU, ASU, Monash |
| **Inbox + feed yang bisa di-follow** | ❌ | — | — | — | — | ✅ NUS, ASU |
| **Asisten AI/chatbot** | ❌ | — | — | — | — | ✅ Michigan Go Blue, Monash MoVA, NTU |
| **Beasiswa** | ❌ (hanya berita) | ✅ | — | — | ✅ | — |
| **Konsultasi/bimbingan dosen** | ◐ booking slot | — | ✅ | — | ◐ direncanakan | — |
| **Panic/krisis** | ◐ SOS, nomor belum diisi | — | — | ✅ Pusat Krisis (WA/telp) | ✅ panic button ke posko SKK | ✅ MIT info darurat |
| **Peer support/konseling** | ❌ | — | — | — | — | ✅ NUS peer supporter chat |
| **Klub/ormawa** | ❌ | — | — | — | — | ✅ ASU, NUS |
| **Karier/magang** | ◐ lowongan alumni | — | — | ✅ modul PKL | — | ✅ ASU career milestones |
| **Poin/reward** | ◐ poin prestasi | — | — | — | — | ✅ ASU Sun Devil Rewards |
| **Direktori civitas** | ❌ (alumni saja) | — | — | — | — | ✅ MIT, Michigan |
| **Parkir/kendaraan** | ❌ | — | — | ✅ UGM Gate | — | — |
| **Lapor kerusakan fasilitas** | ◐ aspirasi umum | — | — | — | — | ✅ MIT, NTU |
| **Mini-app / API terbuka** | ◐ registry fitur internal | ✅ API resmi SATU UI | — | ◐ akses aplikasi Simaster lain | — | ✅ NUS mini-app |
| **Passkey/biometrik** | ❌ | — | — | — | — | — |
| Offline | ◐ aset saja | — | — | — | — | ✅ NTU |
| Menu favorit/personalisasi | ✅ | — | — | ✅ | — | ✅ ASU widget |
| Mode gelap/aksesibilitas | ✅ | — | — | ✅ | — | ✅ Monash |

Sumber utama: ITS News (myITS, myITS Wali, MyITS Calendar), App Store (Simaster UGM Student vNEXT, MySIX ITB, myITHB, Monash Study), DTI UGM, Antara (SATU UI), JPNN (UI Mobile), Warta Ekonomi (ITB Mobile), Information & Technology Services U-Michigan (Go Blue), NUSIT (uNivUS), OutSystems (NTU Omnibus), ASU (aplikasi dan EdScoop), IST MIT (MIT Mobile), Law UII.

## 4. Fitur terbaik yang layak diambil, berurutan

**Fase 0, fondasi (kerjakan dulu)**
1. Lapisan data dan BFF nyata (semua fitur lain bergantung padanya)
2. Push notification dan inbox terpusat (NUS, ASU, NTU)
3. Passkey/biometrik dan kunci aplikasi (belum ada di pembanding, tapi KTM dan keuangan membutuhkannya)

**Fase 1, dampak tinggi untuk mahasiswa UNPAM**
4. Portal wali (ITS, UGM, UII)
5. Kalender terpadu (ITS, ITB, NUS)
6. Peta kampus dan cari ruang (NTU, Monash, MIT)
7. Beasiswa (ITS, SATU UI)
8. KRS cerdas (SATU UI, UCSD)
9. Bimbingan dan logbook tugas akhir (ITB, ITS)
10. Keuangan lanjutan: cicilan/keringanan (ITB)
11. Peringatan dini akademik dan dashboard dosen PA (ITS Wali, SATU UI)

**Fase 2, perluasan**
12. Asisten AI (Go Blue, MoVA)
13. SOS 2.0 dan Pusat Krisis (ITS, UGM)
14. Konseling dan peer support (NUS)
15. Ormawa dan komunitas (ASU, NUS)
16. Karier, magang, dan MBKM (ASU, UGM)
17. Direktori civitas (MIT, Michigan)
18. Layanan harian: parkir, kantin, angkutan (UGM Gate, MIT, NTU)
19. Mini-app framework (NUS)
20. Poin dan reward (ASU)
21. Mode offline (NTU)
22. Lapor fasilitas (MIT, NTU)

**Fase 3, opsional dan berisiko**
23. Dompet kampus dan pembayaran tagihan (ITB Mobile, UII PPOB): berdampak regulasi, lihat peringatan di prompt P23.

---

## 5. Cara memakai prompt

1. Tempel **P00 (konteks master)** di awal sesi coding agent, sekali per sesi. Semua prompt lain mengandalkannya.
2. Kerjakan **satu prompt per sesi/branch**. Jangan gabung beberapa fitur.
3. Setiap prompt sudah memuat kriteria selesai. Minta agent menjalankan `npm run build` dan melaporkan ukuran bundle awal.
4. Prompt P01 harus selesai sebelum fitur yang butuh data nyata. Sebelum itu, fitur boleh jalan dengan data contoh berlabel `DemoNote`.

---

## P00: Konteks master (tempel pertama)

```text
Kamu bekerja di repo Super UNPAM (super app Universitas Pamulang). Pelajari dulu, jangan ubah apa pun sebelum selesai membaca: README.md, DESIGN.md, src/App.tsx, src/data/features.ts, src/components/ui.tsx, src/lib/i18n.ts, vercel.json.

STACK: React 18 + TypeScript 5.8 + Vite 6 + Tailwind 4, vite-plugin-pwa (registerType 'prompt'), lucide-react, qrcode, desktop via Tauri. Deploy otomatis ke Vercel lewat GitHub Actions saat push ke main.

KONVENSI YANG WAJIB DIIKUTI:
1. Router berbasis hash di App.tsx (#/rute). Halaman baru = chunk terpisah lewat helper page(() => import(...), 'Nama') dan ditambahkan ke switch(section).
2. Setiap fitur didaftarkan di src/data/features.ts (id, name, icon Lucide, from/to warna, route, roles, keywords, source). Peran yang ada: MAHASISWA, DOSEN, TENDIK, ALUMNI. Tentukan peran yang tepat untuk tiap fitur baru.
3. Pakai komponen di src/components/ui.tsx (PageHeader, Section, Tabs, Badge, Progress, Row/List, DemoNote, Sparkline). Pakai Icon3D untuk ikon fitur. Jangan membuat sistem desain baru.
4. Teks UI baru wajib masuk i18n (id dan en) bila muncul di navigasi/umum; teks khusus halaman boleh Bahasa Indonesia seperti halaman fitur yang ada.
5. Desain: ikuti token di src/index.css dan DESIGN.md. Tap target minimal 44px, kontras WCAG AA, status tidak boleh hanya warna (selalu ikon/label), aria-label pada tombol ikon, dan hormati prefers-reduced-motion serta "mode hemat efek" (kelas .lite).
6. Performa: JS awal saat ini ±67 KB gzip (angka dari README, ukur ulang dengan `npm run build`) dengan anggaran 200 KB. Fitur baru TIDAK boleh menaikkan bundel awal; semuanya lazy chunk. Jangan menambah dependency besar tanpa alasan tertulis (sebutkan ukurannya).
7. Keamanan: CSP di vercel.json ketat (default-src 'self', connect-src 'self', img-src 'self' data: blob:, frame-src 'none'). Jangan melonggarkan CSP tanpa menyebut persis direktif, domain, dan alasannya, dan jangan memakai wildcard. Jangan simpan token/kredensial/data pribadi di localStorage (sesi asli = cookie HttpOnly dari BFF). Jangan pernah menaruh rahasia di kode klien.
8. Data: sampai BFF nyata ada (lihat prompt P01), data fitur baru boleh memakai data contoh di src/data/demo.ts, tetapi halamannya wajib menampilkan <DemoNote />, dan akses data harus lewat fungsi/adapter yang nanti bisa diganti ke API tanpa mengubah UI. Jangan menulis data contoh yang meniru data resmi (nomor telepon, rekening, koordinat) seolah-olah asli; beri penanda TODO.
9. Jangan mengubah fitur yang sudah ada kecuali diminta. Jangan commit ke main; kerja di branch fitur.

CARA KERJA: (a) tulis rencana singkat berisi file yang akan dibuat/diubah, (b) implementasikan, (c) jalankan `npm run build` dan pastikan lolos tanpa error TypeScript, (d) laporkan ukuran chunk awal dan chunk fitur baru, (e) daftar hal yang masih berupa data contoh/TODO. Jika instruksi di prompt fitur bertentangan dengan konteks ini, berhenti dan tanyakan.
```

---

## FASE 0: FONDASI

## P01: Lapisan data dan BFF

*Pembanding: SATU UI (API resmi untuk integrasi unit), uNivUS (satu pintu data).*

```text
Tujuan: ganti data contoh bertahap dengan API nyata tanpa mengubah UI, dan siapkan BFF (Backend-for-Frontend) sebagai satu-satunya pintu ke sistem kampus.

LANGKAH 1, adapter data di klien:
- Buat src/lib/api.ts dengan fungsi bertipe untuk tiap domain (getSchedule, getGrades, getKrsOffer, getBills, getEvents, dst.) yang saat ini mengembalikan data dari src/data/demo.ts. Semua halaman memanggil fungsi ini, bukan mengimpor demo.ts langsung.
- Tambahkan hook useResource(fn) dengan state loading/error/data, skeleton (pakai kelas .shimmer yang ada), dan tombol "Coba lagi". Satu pola error yang konsisten.
- Flag lingkungan VITE_USE_DEMO=true/false. Jika false, fungsi memanggil `/api/...`; jika true tetap data contoh dan <DemoNote /> muncul.

LANGKAH 2, BFF sebagai Vercel Functions di folder /api (TypeScript):
- POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me. Sesi = cookie HttpOnly + Secure + SameSite=Lax. Ganti src/lib/auth.ts agar memakai endpoint ini dan hapus penanda signedIn di localStorage sebagai sumber kebenaran (boleh tetap sebagai hint UI, tapi status asli dari /api/auth/me).
- Satu file per domain di /api, semuanya memverifikasi sesi dan peran sebelum menjawab. Gunakan validasi input (mis. zod) dan rate limit dasar pada login.
- Konektor ke sistem sumber (SSO, MY UNPAM, MENTARI, SISKEMU, EMS, MY LSP, MY LB, SISPEMA, SISKERMA seperti kolom `source` di features.ts) ditulis sebagai modul terpisah di /api/_connectors, masing-masing dengan antarmuka yang sama dan implementasi `mock` + `http`. Kredensial sistem sumber hanya di environment variable server.
- Token QR KTM dan presensi harus ditandatangani server (HMAC/JWT berumur pendek, ±30 detik) dan divalidasi server. Ganti pembuatan kode di src/pages/Ktm.tsx (useDynamicQr) dan validasi presensi (QR/kode/geofence) di Presensi.tsx. Koordinat dan radius kampus resmi disimpan di konfigurasi server, bukan di klien.

JANGAN: menebak endpoint atau skema sistem kampus yang sebenarnya. Jika spesifikasi sumber belum diberikan, implementasikan konektor `mock` dan tulis file docs/KONEKTOR.md berisi daftar pertanyaan untuk tim LPTI (URL, metode autentikasi, format respons, batas laju) per sistem.

KRITERIA SELESAI: build lolos; dengan VITE_USE_DEMO=true aplikasi berperilaku sama seperti sekarang; login lewat /api/auth/login berjalan dengan konektor mock; tidak ada import langsung dari demo.ts di folder pages/; README bagian "TODO backend" diperbarui sesuai kemajuan.
```

## P02: Push notification dan inbox terpusat

*Pembanding: NUS uNivUS Inbox (feed yang bisa di-follow), ASU (pusat notifikasi lintas unit), NTU Omnibus (push + offline).*

```text
Tujuan: ubah halaman Notifikasi (src/pages/Profil.tsx) menjadi inbox terpusat dengan kategori, preferensi, dan web push.

FITUR:
1. Kategori notifikasi: Akademik, Keuangan, Event, Tugas/Ujian, Pengumuman Kampus, Darurat. Filter chip di atas daftar, tanda baca/belum baca, "tandai semua dibaca", dan lencana jumlah di ikon lonceng TopBar (App.tsx) yang kini masih angka tetap 3.
2. Feed yang bisa di-follow: pengumuman dari unit (fakultas, prodi, ormawa, UPT). Pengguna dapat follow/unfollow di layar "Atur notifikasi". Notifikasi Darurat dan Akademik wajib tidak bisa dimatikan.
3. Web Push lewat service worker (vite-plugin-pwa, ganti ke strategi injectManifest bila perlu) dengan VAPID. Izin notifikasi diminta SETELAH pengguna menekan tombol di layar pengaturan, bukan saat pertama membuka aplikasi. Jelaskan manfaatnya sebelum memunculkan dialog browser. Tangani semua status izin (default/granted/denied) dengan pesan yang jelas, termasuk catatan iOS: push hanya jalan setelah aplikasi dipasang ke Layar Utama (iOS 16.4+).
4. Jam tenang (quiet hours) dan ringkasan harian opsional.
5. Pengingat otomatis dari data yang sudah ada: kelas 30 menit lagi (dengan tombol presensi), tenggat tugas H-1, tagihan jatuh tempo H-3, jadwal ujian H-1. Logika jadwal pengingat dihitung di server (BFF) agar tetap jalan saat aplikasi ditutup.
6. Deep link: ketuk notifikasi membuka rute hash yang tepat (mis. #/kuliah/tugas).

BFF: /api/push/subscribe, /api/push/unsubscribe, /api/notifications (daftar + tandai baca), /api/notifications/prefs. Simpan langganan per perangkat. Hapus langganan yang kedaluwarsa (410/404 dari push service).

CSP: service worker dan push tidak butuh pelonggaran; jangan ubah vercel.json kecuali benar-benar perlu dan sebutkan alasannya.

KRITERIA SELESAI: pengguna dapat memilih kategori, memberi izin push, dan menerima notifikasi uji dari endpoint admin; ketuk notifikasi membuka halaman tujuan; semua teks i18n id/en; aksesibel (daftar notifikasi bisa dioperasikan keyboard, status baca tidak hanya warna).
```

## P03: Passkey/biometrik dan kunci aplikasi

*Pembanding: tidak ditemukan di sumber; ini kebutuhan keamanan karena KTM dan keuangan memuat data sensitif.*

```text
Tujuan: tambah login passkey (WebAuthn) dan kunci aplikasi berbasis biometrik perangkat, tanpa menyimpan rahasia di klien.

FITUR:
1. Setelah login sukses, tawarkan "Aktifkan masuk dengan sidik jari/wajah" (WebAuthn, resident key). Login berikutnya bisa dengan passkey; kata sandi tetap sebagai cadangan.
2. Kunci aplikasi: bila diaktifkan, aplikasi meminta verifikasi biometrik (WebAuthn user verification) setelah idle N menit dan saat membuka layar sensitif (KTM, Keuangan, Nilai). Pilihan waktu: langsung, 1, 5, 15 menit.
3. Layar "Perangkat & sesi" di Profil: daftar perangkat yang login (nama perangkat, terakhir aktif), tombol "Keluarkan perangkat ini" dan "Keluar dari semua perangkat".
4. Layar KTM menyembunyikan QR sampai verifikasi lulus bila kunci aplikasi aktif.

BFF: /api/auth/webauthn/register/options|verify, /api/auth/webauthn/login/options|verify, /api/auth/sessions (GET, DELETE). Tantangan (challenge) dibuat dan diverifikasi di server, sekali pakai, kedaluwarsa pendek. Gunakan library WebAuthn server yang terawat (mis. @simplewebauthn/server) dan sebutkan ukurannya; library klien harus lazy-loaded di halaman Profil saja.

Perhatikan: Permissions-Policy di vercel.json saat ini tidak menyebut publickey-credentials; periksa apakah perlu ditambahkan dan jelaskan. Sediakan jalur pemulihan jika perangkat hilang (kembali ke kata sandi + verifikasi lewat email kampus), dan jangan pernah mengunci pengguna sepenuhnya.

KRITERIA SELESAI: daftar passkey, login passkey, kunci aplikasi, dan manajemen sesi berjalan dengan BFF mock; fallback untuk perangkat tanpa dukungan WebAuthn (sembunyikan opsi, jangan error); tidak ada rahasia di localStorage.
```

---

## FASE 1: DAMPAK TINGGI

## P04: Portal orang tua/wali

*Pembanding: myITS Wali (perkembangan studi, jadwal, status UKT, berita), Simaster UGM Parent, Law UII (progres studi dan tagihan).*

```text
Tujuan: tambahkan peran WALI (orang tua/wali mahasiswa) dengan tampilan baca-saja yang terbatas.

DATA MODEL & PRIVASI (penting, kerjakan dulu):
- Tambah 'WALI' ke tipe Role di src/lib/types.ts dan perbarui semua tempat yang memakai Role (features.ts, Profil, App.tsx).
- Wali hanya boleh melihat data mahasiswa yang menautkannya. Tautan dibuat atas PERSETUJUAN mahasiswa: mahasiswa membuat kode undangan sekali pakai (berlaku 24 jam) di Profil > "Akses orang tua"; wali memasukkan kode tersebut. Mahasiswa dapat mencabut akses kapan saja dan memilih kategori yang dibagikan (Akademik, Kehadiran, Keuangan) secara terpisah. Catat setiap akses wali (log yang bisa dilihat mahasiswa).
- Wali tidak pernah melihat password, KTM QR, jawaban EDOM, aspirasi, atau data prestasi non-akademik.

LAYAR WALI (rute baru wali/..., fitur 'wali' dengan roles ['WALI']):
1. Ringkasan: IPK, IPS terakhir, SKS lulus, status registrasi semester ini.
2. Jadwal kuliah minggu ini (baca-saja).
3. Kehadiran: persentase per mata kuliah dan peringatan jika di bawah ambang kelayakan ujian (konfigurasi server, jangan dikodekan keras).
4. Keuangan: status tagihan/UKT, jatuh tempo, tombol "Bayar" yang membuka instruksi VA (tanpa menyimpan metode bayar).
5. Pengumuman kampus.
Navigasi untuk peran WALI: Beranda, Akademik ringkas, Keuangan, Profil. Sembunyikan fitur lain.

PERSETUJUAN ORANG TUA SEBAGAI FORMULIR: sediakan komponen persetujuan wali yang bisa dipakai fitur lain nantinya (mis. izin kegiatan), dengan status Menunggu/Disetujui/Ditolak. Jangan dihubungkan ke fitur lain dulu.

Pembanding juga merencanakan konsultasi wali-dosen wali; JANGAN dibangun di tahap ini.

KRITERIA SELESAI: alur undang-cabut berfungsi dengan BFF mock; wali tidak dapat membuka rute di luar izinnya (uji dengan mengetik hash manual); log akses tampil bagi mahasiswa; semua teks i18n; DemoNote ditampilkan selama data contoh.
```

## P05: Kalender terpadu

*Pembanding: MyITS Calendar (kalender per unit, direncanakan pengingat), ITB MySIX (kalender akademik), MIT Mobile (kalender acara/libur/akademik), NUS Event Aggregator.*

```text
Tujuan: satu kalender yang menggabungkan kalender akademik, jadwal kuliah, tenggat tugas, jadwal ujian, event, dan jatuh tempo pembayaran.

FITUR:
1. Fitur baru 'kalender' (rute 'kalender', semua peran, ikon CalendarRange) dengan tampilan Bulan, Minggu, dan Agenda. Pada layar kecil default ke Agenda.
2. Sumber (lapisan, bisa dinyalakan/dimatikan): Akademik (periode KRS, UTS/UAS, libur, wisuda), Kuliah, Tugas, Ujian, Event yang diikuti, Tagihan. Beri warna + ikon + label agar tidak bergantung warna.
3. Kalender per unit: pengguna dapat memilih tampilan kalender fakultas/prodi/ormawa (mengikuti konsep kalender per unit di ITS). Admin unit menambah entri lewat BFF; pengguna hanya membaca.
4. Ekspor dan langganan: tombol "Tambahkan ke kalender saya" per entri (unduh .ics) dan tautan langganan .ics pribadi (feed bertoken, bisa direset) agar muncul di Google/Apple Calendar. Ini endpoint BFF: GET /api/calendar/feed/:token.ics. Token acak panjang, dapat dicabut.
5. Widget "Hari ini / Berikutnya" di Beranda memakai data kalender yang sama (ganti blok jadwal statis yang ada hanya bila hasilnya setara).
6. Deteksi bentrok: tandai dua entri kuliah/ujian yang tumpang tindih.

Tulis pembuat .ics sendiri (RFC 5545, zona waktu Asia/Jakarta, UID stabil); jangan menambah dependency kalender besar. Jangan memuat kalender pihak ketiga lewat iframe (CSP frame-src 'none').

KRITERIA SELESAI: tiga tampilan berfungsi dan responsif; lapisan bisa difilter; unduh .ics valid saat dibuka di aplikasi kalender; feed langganan berjalan dengan BFF mock; pencarian global di Home ikut menemukan entri kalender.
```

## P06: Peta kampus dan cari ruang

*Pembanding: NTU Omnibus (peta dalam gedung untuk kelas/ruang rapat), Monash Study (peta dengan arah ke ruang kelas), MIT Mobile (peta kampus yang bisa dicari).*

```text
Tujuan: bantu mahasiswa menemukan gedung dan ruang di kampus UNPAM (minimal Kampus Pusat Pamulang dan Kampus Viktor yang sudah ada di Presensi.tsx), termasuk mahasiswa baru.

KEPUTUSAN TEKNIS WAJIB (karena CSP): JANGAN memakai tile peta pihak ketiga atau SDK peta (Google/Mapbox/Leaflet dengan tile eksternal); CSP melarangnya dan menambah beban. Gunakan denah SVG milik sendiri yang disajikan dari origin yang sama.

FITUR:
1. Fitur baru 'peta' (semua peran). Layar: denah kampus (SVG) dengan gedung yang bisa diketuk, pencarian "cari gedung/ruang/fasilitas", dan daftar hasil.
2. Detail gedung: nama, lantai, fasilitas (toilet, musala, kantin, ATM, parkir, lab), jam operasional bila tersedia. Pemilih lantai untuk denah per lantai.
3. "Ruang saya": dari jadwal kuliah, tombol "Tunjukkan ruang" yang menyorot ruang kelas berikutnya (kode ruang di jadwal sudah ada, mis. di Akademik/Jadwal).
4. Posisi pengguna (opsional): pakai navigator.geolocation (geolocation=(self) sudah diizinkan) untuk menandai titik pengguna di denah luar ruangan dan jarak ke gedung. Minta izin hanya saat tombol ditekan. Jangan simpan lokasi.
5. Rute sederhana: untuk tahap ini cukup jalur antar gedung yang sudah didefinisikan di data (graf node-edge sederhana + algoritma jalur terpendek); tanpa rute dalam gedung bertingkat.
6. Mode gelap/terang mengikuti token tema; denah aksesibel: setiap gedung punya label teks dan daftar alternatif non-visual, tombol kontrol zoom dan geser dengan keyboard.

DATA: buat struktur data denah (src/data/campus.ts) dengan koordinat SVG, bukan koordinat GPS tebakan. Aset denah resmi belum ada: buat denah placeholder yang jelas bertanda "DENAH SEMENTARA", dan tulis docs/DENAH.md berisi format yang dibutuhkan agar tim Sarpras dapat menyuplai denah asli. Jangan mengarang nama gedung/ruang; ambil dari data jadwal yang sudah ada dan beri TODO untuk sisanya.

KRITERIA SELESAI: pencarian menemukan gedung dan ruang dari data contoh; "Tunjukkan ruang" bekerja dari jadwal; build lolos dan chunk fitur ini di bawah 40 KB gzip tanpa aset denah.
```

## P07: Beasiswa

*Pembanding: myITS (informasi beasiswa), SATU UI (beasiswa sebagai layanan pendukung).*

```text
Tujuan: modul Beasiswa lengkap. Saat ini hanya ada berita beasiswa di data contoh dan surat keterangan untuk persyaratan beasiswa.

FITUR (rute 'beasiswa', roles MAHASISWA, ikon GraduationCap):
1. Katalog beasiswa: nama, penyelenggara (internal UNPAM/pemerintah/swasta), nilai bantuan, kuota, tenggat, status (Buka/Segera/Tutup), ipk minimal, semester minimal. Filter dan pencarian.
2. Cek kelayakan otomatis: bandingkan syarat beasiswa dengan data mahasiswa (IPK, semester, status registrasi) dan tampilkan "Memenuhi / Belum memenuhi" disertai alasan per syarat. Syarat yang tidak bisa dicek otomatis ditandai "Perlu verifikasi manual".
3. Pendaftaran: formulir bertahap (data diri terisi otomatis, unggah berkas persyaratan, pernyataan). Unggah berkas memakai input file dengan batas ukuran dan tipe (PDF/JPG/PNG) yang divalidasi di klien dan server; pratinjau nama berkas; simpan draf.
4. Pelacakan status: timeline Diajukan → Verifikasi berkas → Seleksi → Pengumuman, dengan notifikasi di tiap perubahan (hubungkan ke inbox bila P02 sudah ada).
5. Tombol "Minta surat keterangan" yang membuka fitur Surat dengan jenis terisi.
6. Pengingat tenggat masuk kalender (bila P05 sudah ada).

PRIVASI: berkas dan data keuangan keluarga sensitif; jangan simpan di localStorage dan jangan tampilkan di notifikasi. Jangan mengarang daftar beasiswa resmi; data contoh diberi DemoNote dan TODO sumber.

KRITERIA SELESAI: alur katalog → cek kelayakan → daftar → lacak berjalan dengan data contoh; validasi berkas bekerja; aksesibel; i18n.
```

## P08: KRS cerdas

*Pembanding: SATU UI (IRS, persetujuan dosen PA, dirancang tahan lonjakan akses), UCSD via TopUniversities (daftar dan pilih kelas dari ponsel, mengurangi kecemasan saat jendela buka).*

```text
Tujuan: tingkatkan tab KRS di src/pages/Akademik.tsx. Saat ini hanya ada kuota dan batas SKS tetap 24.

FITUR:
1. Batas SKS dinamis berdasarkan IPS semester lalu (aturan dari server, jangan dikodekan keras); tampilkan alasan batasnya.
2. Deteksi bentrok jadwal antar kelas yang dipilih, dengan penanda dan penjelasan kelas mana yang bentrok.
3. Pengecekan prasyarat: mata kuliah yang prasyaratnya belum lulus ditandai dan tidak bisa dipilih, dengan penjelasan "butuh: <mata kuliah>".
4. Daftar tunggu (waitlist) untuk kelas penuh: pengguna masuk antrean, ditampilkan posisi, dan mendapat notifikasi bila kursi terbuka.
5. Ringkasan jadwal minggu ini dari pilihan KRS (pratinjau grid hari x jam) sebelum diajukan.
6. Alur persetujuan: Draf → Diajukan → Disetujui dosen PA / Perlu revisi (dengan catatan dosen). Mahasiswa dapat mengubah selama belum disetujui.
7. Pengamanan lonjakan: tombol Ajukan memakai idempotency key dan penanganan error ulang; tampilkan antrean/progres bila server sibuk, bukan layar kosong.
8. Untuk peran DOSEN (PA): daftar KRS mahasiswa bimbingan dengan aksi Setujui/Minta revisi dan catatan.

Pertahankan struktur Tabs yang ada. Aturan akademik (SKS, prasyarat, bentrok) dievaluasi oleh BFF; klien hanya menampilkan hasil dan melakukan pengecekan awal agar cepat.

KRITERIA SELESAI: bentrok dan prasyarat terdeteksi dari data contoh yang diperluas; waitlist dan alur persetujuan berjalan dengan BFF mock; uji manual untuk kasus SKS melebihi batas, bentrok, kelas penuh.
```

## P09: Bimbingan dan logbook tugas akhir

*Pembanding: ITB MySIX (konsultasi dosen lewat aplikasi), ITS (konsultasi wali-dosen direncanakan). Booking.tsx saat ini hanya punya slot "Bimbingan dosen".*

```text
Tujuan: pindahkan bimbingan dari sekadar booking slot menjadi alur bimbingan yang tercatat, termasuk logbook skripsi/tugas akhir/PKL.

FITUR (rute 'bimbingan', roles MAHASISWA, DOSEN):
1. Daftar pembimbing (dosen PA, pembimbing skripsi 1 dan 2, pembimbing PKL) dengan tombol "Ajukan bimbingan" yang memakai slot dari Booking.
2. Logbook: setiap sesi bimbingan menghasilkan catatan (tanggal, topik, ringkasan, tindak lanjut, lampiran). Mahasiswa mengisi, dosen memberi verifikasi/tanda tangan digital (persetujuan dalam aplikasi) dan komentar. Status: Menunggu verifikasi / Terverifikasi / Perlu perbaikan.
3. Rekap: jumlah bimbingan terverifikasi vs minimum syarat sidang (nilai minimum dari konfigurasi server), progress bar, dan tanda "memenuhi syarat sidang" bila terpenuhi.
4. Utas pesan per pembimbing (teks + lampiran PDF kecil). Bukan chat real-time penuh: cukup utas berurutan dengan polling ringan atau SSE bila BFF mendukung. Jam tenang dosen dihormati (pesan tidak memicu push di luar jam yang dipilih).
5. Dosen: tampilan daftar mahasiswa bimbingan dengan indikator "belum bimbingan > N hari".
6. Ekspor logbook ke PDF cetak (pakai window.print dengan stylesheet cetak seperti tombol KHS di Akademik, tanpa dependency PDF baru).

PRIVASI: pesan dan lampiran hanya terlihat oleh mahasiswa dan pembimbingnya; terapkan di BFF, bukan hanya di UI.

KRITERIA SELESAI: mahasiswa membuat catatan, dosen memverifikasi, rekap tersinkron, cetak PDF rapi; semua dengan BFF mock dan DemoNote.
```

## P10: Keuangan lanjutan (cicilan dan keringanan)

*Pembanding: ITB MySIX (lihat info pembayaran dan ajukan cicilan), myITS Wali (status UKT).*

```text
Tujuan: lengkapi src/pages/Keuangan.tsx yang kini berisi tagihan, VA, dan riwayat.

FITUR:
1. Pengajuan cicilan: pilih tagihan → pilih skema (jumlah termin dan tanggal dari konfigurasi server) → alasan + berkas pendukung → kirim. Status: Diajukan / Disetujui / Ditolak (dengan alasan). Setelah disetujui, tagihan terpecah menjadi termin dengan VA masing-masing.
2. Pengajuan keringanan/penundaan: formulir terpisah dengan syarat dan berkas; status dilacak seperti beasiswa.
3. Bukti pembayaran: tiap pembayaran lunas punya kwitansi digital yang dapat dicetak/disimpan sebagai PDF (window.print + stylesheet cetak) berisi nomor transaksi, nama, NIM, rincian, tanggal, dan QR verifikasi (pakai paket qrcode yang sudah ada).
4. Pengingat pembayaran otomatis H-7, H-3, H-1 (hubungkan ke P02 bila sudah ada).
5. Ringkasan: total dibayar semester ini, sisa, dan jadwal termin.
6. Salin VA dengan satu ketukan dan petunjuk bayar per bank (konten statis, i18n).

PENTING:
- Jangan menyimpan atau meminta nomor kartu/rekening di aplikasi. Pembayaran tetap lewat VA/kanal resmi; aplikasi hanya menampilkan instruksi dan status dari sistem keuangan (SISKEMU).
- Semua perhitungan nominal (cicilan, denda, diskon) dilakukan di server; klien hanya menampilkan. Jangan menghitung uang di klien dengan angka floating point; pakai bilangan bulat rupiah.
- Jangan mengarang kebijakan cicilan UNPAM. Gunakan konfigurasi dengan nilai contoh bertanda TODO dan DemoNote.

KRITERIA SELESAI: alur ajukan → lacak → termin berjalan dengan data contoh; kwitansi tercetak rapi dan QR terbaca; tidak ada data rekening yang disimpan.
```

## P11: Peringatan dini akademik dan dashboard dosen PA

*Pembanding: myITS Wali (monitoring akademik), SATU UI (pemantauan nilai dan kehadiran, persetujuan PA).*

```text
Tujuan: bantu mahasiswa dan dosen PA mendeteksi masalah lebih awal. Data presensi, nilai, dan tugas sudah ada di aplikasi tetapi belum dipakai untuk peringatan.

UNTUK MAHASISWA (kartu di Beranda dan halaman Akademik):
1. Kartu "Perlu perhatian" bila: kehadiran suatu mata kuliah mendekati/di bawah ambang kelayakan ujian, tugas melewati tenggat, IPS turun dibanding semester lalu, atau tagihan jatuh tempo. Ambang dan aturan dari konfigurasi server.
2. Tiap peringatan berisi penjelasan "kenapa" (angka sumbernya) dan tindakan yang disarankan (mis. "Ajukan bimbingan", "Lihat tugas"). Bahasa suportif, bukan menghakimi.
3. Proyeksi sederhana: "Jika kamu hadir di 3 pertemuan berikutnya, kehadiranmu menjadi X%". Hitungan transparan.

UNTUK DOSEN (peran DOSEN; fitur 'dosen-pa'):
1. Dashboard mahasiswa bimbingan dengan indikator risiko (hijau/kuning/merah + ikon + label) berdasarkan aturan yang sama dan dapat disaring.
2. Detail mahasiswa: IPK/IPS tren, kehadiran per mata kuliah, status KRS, riwayat bimbingan.
3. Aksi cepat: kirim pesan dukungan (template yang bisa diedit), jadwalkan bimbingan, tandai tindak lanjut.
4. Mahasiswa dapat melihat siapa yang mengakses datanya (hanya dosen PA resmi).

ETIKA: ini sistem peringatan, bukan penilaian karakter. Jangan membuat skor "risiko" tertutup dari model; gunakan aturan yang bisa dijelaskan. Tidak ada label seperti "mahasiswa bermasalah". Akses dosen dibatasi hanya ke mahasiswa bimbingannya di BFF.

KRITERIA SELESAI: aturan peringatan terpusat di satu modul yang mudah diuji, dengan tes unit untuk aturan (tambahkan Vitest bila belum ada dan sebutkan ukurannya sebagai devDependency); tampilan mahasiswa dan dosen berjalan dengan data contoh.
```

---

## FASE 2: PERLUASAN

## P12: Asisten AI

*Pembanding: Go Blue Michigan (asisten AI untuk info kampus, bus, kantin, direktori), Monash MoVA, NTU Omnibus (chatbot mahasiswa baru).*

```text
Tujuan: asisten percakapan di dalam Super UNPAM yang menjawab pertanyaan layanan kampus dan membantu menavigasi fitur.

BATASAN DESAIN (wajib):
1. Asisten HANYA menjawab dari sumber yang diberikan: dokumen panduan akademik/FAQ yang diunggah admin (RAG) dan data pengguna yang diizinkan lewat alat (tool) terbatas. Untuk pertanyaan di luar sumber, jawab "saya tidak menemukan informasinya" dan arahkan ke fitur/kanal resmi. Jangan mengarang kebijakan, tanggal, nominal, atau nomor kontak.
2. Setiap jawaban berbasis dokumen menampilkan rujukan sumber (judul + tanggal berlaku).
3. Alat (tool) yang boleh dipanggil dan hanya untuk pengguna yang sedang login: jadwal hari ini, tagihan aktif, tenggat tugas terdekat, cari fitur. Asisten tidak melakukan aksi yang mengubah data (bayar, KRS, hapus) sendiri; ia memberi tautan ke halaman terkait. Untuk aksi, selalu butuh konfirmasi pengguna di halaman fitur.
4. Privasi: data pribadi tidak dikirim ke penyedia model kecuali yang dibutuhkan untuk pertanyaan itu; jangan log isi percakapan lebih lama dari yang ditetapkan kebijakan; sediakan tombol "hapus riwayat". Beri tahu pengguna dengan jelas bahwa ini AI dan bisa keliru.
5. Topik sensitif (krisis, kesehatan mental, pelecehan): jangan dijawab sendiri; tampilkan kartu bantuan dengan kontak resmi dari SOS/Konseling dan tawarkan menghubungkan ke manusia.
6. Pembatasan laju per pengguna dan batas panjang input; semua panggilan model lewat BFF (/api/assistant), TIDAK PERNAH dari klien. Kunci API hanya di server.

UI: panel bawah/penuh dengan input teks (suara dan gambar ditunda), chip saran ("Jadwal hari ini?", "Cara ajukan cuti?"), tombol umpan balik 👍/👎 pada tiap jawaban, dan akses cepat dari ikon di TopBar. Streaming jawaban bila BFF mendukung.

Pilih penyedia model dan arsitektur RAG secara terpisah: tulis docs/ASISTEN.md berisi opsi, perkiraan biaya per 1.000 percakapan, dan risiko. Implementasikan antarmuka klien dan stub BFF dengan jawaban contoh dulu; JANGAN menanamkan kunci atau memilih vendor tanpa persetujuan.

KRITERIA SELESAI: UI chat aksesibel (fokus, pembaca layar, daftar pesan role=log), stub BFF, aturan di atas tertulis sebagai prompt sistem di server, dan daftar uji perilaku (pertanyaan di luar cakupan, upaya prompt injection dari dokumen, topik krisis).
```

## P13: SOS 2.0 dan Pusat Krisis

*Pembanding: myITS panic button yang terhubung ke posko keamanan kampus, Simaster UGM Pusat Krisis (tombol WhatsApp/telepon), MIT Mobile (info darurat).*

```text
Tujuan: perbaiki SosSheet di src/App.tsx. Saat ini tiga dari empat kontak kosong ("nomor menyusul") dan tidak ada pengiriman lokasi.

FITUR:
1. Daftar kontak darurat dari konfigurasi server (bukan dikodekan keras): Keamanan Kampus, Klinik, Konseling, Layanan 112, serta kontak per kampus. Tiap kontak punya tombol Telepon dan, bila ada, WhatsApp (tautan wa.me). Jika nomor belum dikonfigurasi, tampilkan "belum tersedia" dengan jelas, tetap tampilkan 112.
2. Tombol "Kirim lokasi ke Keamanan": setelah konfirmasi dua langkah (tahan 2 detik atau geser untuk mencegah salah tekan), kirim lokasi + nama + NIM + nomor kontak ke BFF yang meneruskan ke posko. Tampilkan status terkirim/diterima/ditangani. Pengguna bisa membatalkan dalam 5 detik.
3. Kategori cepat: Keamanan, Medis, Kebakaran, Pelecehan/Kekerasan, Lainnya. Pelaporan kekerasan seksual mengarah juga ke jalur satgas PPKS kampus, dengan opsi pelaporan rahasia.
4. Bagikan lokasi sementara (live) selama 15 menit ke kontak tepercaya yang dipilih pengguna.
5. Layar SOS bisa dibuka tanpa login dari layar masuk bila memungkinkan (kontak statis saja).
6. Akses cepat: shortcut PWA "SOS" (tambahkan ke manifest di vite.config.ts).

PENTING: JANGAN mengarang nomor darurat kampus; biarkan kosong dengan TODO bila belum ada data resmi, dan tulis daftar yang harus dilengkapi tim Keamanan/Humas di docs/KONTAK-DARURAT.md. Lokasi hanya dikirim atas tindakan eksplisit pengguna; jangan dilacak di latar belakang. Pastikan fitur tetap berguna saat offline (telepon tetap bisa; pengiriman lokasi antre dan mencoba lagi dengan penanda yang jujur "belum terkirim").

KRITERIA SELESAI: alur kirim lokasi dengan BFF mock; pencegahan salah tekan; teks aman untuk dibaca dalam kondisi panik (singkat, kontras tinggi, tap target ≥ 56px untuk aksi utama).
```

## P14: Konseling dan peer support

*Pembanding: NUS Student Peer Supporter Chat; Go Blue (dukungan konseling), Simaster UGM Pusat Krisis.*

```text
Tujuan: layanan kesejahteraan mahasiswa yang menghubungkan ke konselor/peer supporter manusia. Ini BUKAN fitur diagnosis.

FITUR (rute 'konseling', roles MAHASISWA, ikon HeartHandshake):
1. Pesan jadwal konseling: pilih konselor/jenis layanan (akademik, pribadi, karier), tanggal, dan slot; opsi tatap muka atau daring; konfirmasi dan pengingat. Gunakan pola slot dari Booking.tsx.
2. Chat peer supporter terlatih pada jam operasional (mengikuti konsep NUS): ruang obrolan terjadwal, pseudonim yang aman, aturan komunitas jelas, tombol "Akhiri dan blokir", dan pelaporan. Tampilkan jam layanan dan kapan tersedia.
3. Bila pengguna menyebut kata/situasi krisis dalam chat atau formulir, tampilkan kartu bantuan segera (SOS 2.0) tanpa menghakimi. Daftar kata kunci dikelola server dan diuji; jangan mengandalkan klien saja.
4. Kerahasiaan: jelaskan di awal apa yang dirahasiakan dan batasnya. Catatan konseling TIDAK pernah tampil di notifikasi, kalender umum, atau dibagikan ke wali/dosen PA.
5. Sumber daya mandiri: artikel singkat (konten statis, i18n) tentang stres ujian, manajemen waktu, tidur, dan tempat mencari bantuan.
6. Anonimitas: boleh memakai nama samaran untuk chat peer; identitas asli hanya dilihat konselor pada kasus krisis sesuai kebijakan yang tertulis.

JANGAN: membuat kuesioner skrining/diagnosis atau memberi saran medis otomatis; menyimpan isi chat di perangkat; menampilkan "streak" atau gamifikasi pada fitur ini.

Isi kebijakan, jam layanan, dan nama konselor tidak boleh dikarang: gunakan data contoh bertanda DemoNote dan TODO, dan tulis docs/KONSELING.md berisi hal yang harus diputuskan unit layanan (kebijakan kerahasiaan, pelatihan peer, SLA, rujukan).

KRITERIA SELESAI: alur booking dan chat berjalan dengan BFF mock; kartu krisis muncul pada kasus uji; tidak ada data konseling di localStorage.
```

## P15: Ormawa dan komunitas

*Pembanding: ASU Sun Devil Central (cari dan gabung klub, lihat acara), NUS (event aggregator dan feed).*

```text
Tujuan: direktori organisasi kemahasiswaan (BEM, HMJ, UKM, komunitas) yang terhubung dengan Event, Pemira, dan Prestasi.

FITUR (rute 'ormawa', semua peran, ikon Users2):
1. Direktori: nama, kategori (minat/bakat, olahraga, keagamaan, akademik, sosial), deskripsi, jumlah anggota, kontak resmi, status rekrutmen. Pencarian dan filter.
2. Gabung: ajukan keanggotaan (dengan motivasi singkat), status Menunggu/Diterima/Ditolak. Keluar organisasi kapan saja.
3. Halaman organisasi: pengumuman, event yang diadakan (tautkan ke fitur Event), pengurus, dokumen publik.
4. Pengurus: peran 'pengurus ormawa' (bukan peran akun baru; atribut keanggotaan) dapat menerbitkan pengumuman dan membuat event untuk persetujuan admin kemahasiswaan, serta melihat daftar pendaftar.
5. Feed: pengguna follow organisasi tanpa harus anggota; pengumuman masuk ke inbox (P02) bila sudah ada.
6. Keterlibatan tercatat: keanggotaan aktif dan jabatan dapat diajukan sebagai prestasi non-akademik ke SISPEMA dan muncul di Dompet Sertifikat/SKPI setelah diverifikasi pembina.

MODERASI: konten pengumuman melewati antrean persetujuan bila diatur; sediakan tombol laporkan. Jangan menampilkan daftar anggota ke publik tanpa persetujuan anggota.

KRITERIA SELESAI: alur cari → gabung → terima pengumuman berjalan dengan data contoh; peran pengurus hanya terlihat untuk keanggotaan yang sesuai (uji di BFF mock).
```

## P16: Karier, magang, dan MBKM

*Pembanding: ASU Career Milestones (aktivasi layanan karier, jejaring, magang, tips CV), Simaster UGM (modul PKL).*

```text
Tujuan: pusat karier yang menyatukan lowongan (termasuk dari alumni, sudah ada di Alumni.tsx), magang/PKL, dan program MBKM.

FITUR (rute 'karier', roles MAHASISWA, ALUMNI, ikon Briefcase):
1. Lowongan dan magang: daftar dengan filter (tipe, lokasi/remote, bidang, prodi relevan) dan simpan/bookmark. Pindahkan lowongan alumni ke sini dan biarkan tab Alumni menautkannya.
2. Proses PKL/magang: Pengajuan tempat → surat pengantar (hubungkan fitur Surat) → persetujuan prodi → logbook harian/mingguan (pakai pola logbook P09 bila sudah ada) → penilaian pembimbing lapangan → laporan akhir. Timeline status yang jelas.
3. MBKM: katalog program, syarat, dan pelacakan konversi SKS (hanya tampilan status dari sistem akademik).
4. Perjalanan karier (milestone, terinspirasi ASU): daftar langkah bertahap per tahun studi (lengkapi profil, buat CV, ikut sertifikasi, ikut event karier, magang), dengan tanda selesai dan tautan ke fitur terkait (Sertifikasi, TOEFL, Event).
5. Pembuat CV sederhana dari data aplikasi (identitas, pendidikan, prestasi, sertifikat) dengan keluaran cetak (window.print) tanpa dependency PDF baru; semua data diedit pengguna sebelum dicetak.
6. Mentor: tautan ke mentor alumni yang sudah ada.

DATA: lowongan nyata datang dari BFF/admin; jangan membuat lowongan palsu yang tampak resmi. Perusahaan dan nama pada data contoh bertanda DemoNote.

KRITERIA SELESAI: alur pengajuan PKL dan logbook berjalan; CV dapat dicetak rapi; fitur Alumni tidak rusak.
```

## P17: Direktori civitas

*Pembanding: MIT Mobile (direktori dosen/staf/mahasiswa), Go Blue (kontak lewat MCommunity), University of Alabama via TopUniversities (direktori lengkap).*

```text
Tujuan: pencarian orang di kampus: dosen, tendik, dan unit.

FITUR (rute 'direktori', semua peran, ikon BookUser):
1. Cari dosen/tendik/unit berdasarkan nama, prodi, bidang keahlian, atau unit. Hasil menampilkan nama, jabatan, unit, ruang, jam konsultasi, dan kanal kontak yang DIIZINKAN oleh pemilik profil.
2. Profil dosen: bidang riset, mata kuliah yang diampu semester ini, tautan ke slot bimbingan (Booking/Bimbingan) bila dosen membuka.
3. Kontak: tombol email kampus dan, bila diizinkan, WhatsApp. Jangan menampilkan nomor pribadi tanpa persetujuan eksplisit pemilik.
4. Direktori unit: BAAK, Keuangan, Perpustakaan, LPTI, Kemahasiswaan, dst., berisi fungsi, jam layanan, lokasi (tautan ke Peta bila P06 sudah ada), dan kanal bantuan.
5. Mahasiswa TIDAK muncul di direktori publik. Pengguna dapat mengatur visibilitas profilnya sendiri (Profil > Privasi: tampil di direktori alumni/mentor atau tidak).

PRIVASI: data pribadi dosen dan tendik diatur oleh kebijakan kampus. Tampilkan hanya bidang yang ditandai publik di sumber data; batasi laju pencarian untuk mencegah pengumpulan massal (scraping) lewat BFF.

KRITERIA SELESAI: pencarian cepat (debounce) dengan data contoh; visibilitas profil bekerja; chunk fitur kecil.
```

## P18: Layanan harian: parkir, kantin, angkutan

*Pembanding: Simaster UGM (kapasitas parkir, registrasi kendaraan UGM Gate, bus TransGama), MIT Mobile (menu dan jam MIT Dining), NTU Omnibus (bus real-time).*

```text
Tujuan: tiga layanan harian yang sering ditanyakan. Kerjakan sebagai satu fitur 'layanan-harian' dengan tiga tab, dan tampilkan hanya tab yang datanya dikonfigurasi.

TAB PARKIR/KENDARAAN:
1. Registrasi kendaraan (jenis, plat, foto STNK opsional) dengan status verifikasi dan stiker/QR kendaraan digital.
2. Informasi kapasitas parkir per area bila sumber data tersedia (angka dari BFF; tampilkan "diperbarui X menit lalu" dan jangan menampilkan angka kedaluwarsa tanpa penanda).
3. Plat nomor adalah data pribadi: simpan di server, jangan tampilkan penuh di notifikasi.

TAB KANTIN & LAYANAN:
1. Daftar kantin/layanan makan dengan jam buka, lokasi, dan menu harian jika pengelola mengisinya. Tanda "Halal" hanya bila disediakan pengelola; jangan menebak.
2. Pengelola kantin dapat memperbarui menu lewat panel sederhana (peran terbatas).

TAB ANGKUTAN KAMPUS:
1. Hanya aktif bila UNPAM mengoperasikan angkutan/shuttle (tanyakan dulu ke pihak kampus; jangan membuat rute fiktif). Jika ada: jadwal, rute, dan posisi bus real-time dari feed GPS, termasuk estimasi tiba dan tingkat keterisian bila tersedia.
2. Notifikasi "bus tiba di halte X dalam 5 menit" untuk halte favorit (hubungkan P02).
3. Posisi real-time lewat polling ringan atau SSE, bukan WebSocket pihak ketiga; tampilkan di denah SVG (P06), BUKAN tile peta eksternal (CSP).

Tulis docs/LAYANAN-HARIAN.md berisi pertanyaan yang harus dijawab Sarpras/Kemahasiswaan (apakah ada shuttle, sumber data parkir, sistem kantin) sebelum data nyata dihubungkan.

KRITERIA SELESAI: tab yang datanya kosong tersembunyi dengan rapi; registrasi kendaraan dan tampilan kantin berjalan dengan BFF mock.
```

## P19: Mini-app framework

*Pembanding: NUS uNivUS (mini-app buatan komunitas di menu Explore), SATU UI (API resmi untuk fakultas/unit), registry fitur Super UNPAM yang sudah ada.*

```text
Tujuan: biarkan fakultas, UPT, dan ormawa menerbitkan layanan kecil tanpa harus mengubah kode inti, dengan keamanan yang kuat. Ini perubahan arsitektur: tulis docs/MINIAPP.md berisi rancangan dan minta persetujuan sebelum implementasi penuh.

RANCANGAN YANG DIMINTA:
1. Manifest mini-app (JSON bertanda tangan): id, nama, ikon, peran yang boleh, izin yang diminta (mis. profil-dasar, jadwal, lokasi), URL entri, dan penerbit. Ubah features.ts agar bisa menggabungkan fitur bawaan + mini-app dari GET /api/miniapps (hanya yang disetujui admin).
2. Isolasi: mini-app berjalan di iframe sandbox pada origin terpisah (subdomain khusus), BUKAN di origin utama. Ini bertentangan dengan CSP saat ini (frame-src 'none'): usulkan perubahan CSP seminimal mungkin (frame-src hanya ke origin mini-app) dan jelaskan risikonya, jangan ubah vercel.json sebelum disetujui.
3. Jembatan komunikasi: postMessage dengan skema pesan terdefinisi dan verifikasi origin. Mini-app tidak pernah menerima token sesi; ia meminta data lewat jembatan, dan host memutuskan berdasarkan izin yang sudah disetujui pengguna (dialog izin per mini-app, bisa dicabut di Profil).
4. Jalur peninjauan: pengajuan → tinjauan keamanan → disetujui → terbit; versi dan kemampuan menarik (kill switch) dari server.
5. SDK kecil (satu file) dan contoh mini-app "Pengumuman Fakultas" sebagai bukti konsep.

JANGAN: mengizinkan mini-app memuat skrip ke origin utama; membagikan cookie sesi; menjalankan kode pihak ketiga tanpa tinjauan.

KRITERIA SELESAI TAHAP 1: dokumen rancangan lengkap dengan model ancaman dan daftar perubahan CSP yang diusulkan, serta prototipe tampilan Explore yang membaca manifest contoh tanpa menjalankan iframe.
```

## P20: Poin dan reward

*Pembanding: ASU Sun Devil Rewards (poin dari aktivitas, ditukar merchandise). Super UNPAM sudah punya poin prestasi (SISPEMA).*

```text
Tujuan: sistem keterlibatan ringan yang TIDAK menggeser poin prestasi resmi (SISPEMA). Pisahkan dengan jelas dua hal: "Poin Prestasi" (resmi, diverifikasi) dan "Poin Aktif" (keterlibatan, tidak berpengaruh akademik).

FITUR (bagian dalam halaman Prestasi, bukan fitur baru di launcher):
1. Poin Aktif dari aksi yang sudah ada: presensi tepat waktu, mengisi EDOM, hadir di event, menyelesaikan profil, memakai fitur tertentu pertama kali. Aturan dan jumlah poin dari konfigurasi server.
2. Katalog penukaran: merchandise, voucher kantin, tiket event; stok terbatas. Penukaran menghasilkan kode QR yang dipindai petugas.
3. Papan peringkat HANYA opt-in dan memakai tampilan "peringkat kelompok" (mis. persentil), bukan daftar nama lengkap, untuk menghindari tekanan sosial. Jangan ada papan peringkat untuk presensi kuliah.
4. Anti-penyalahgunaan: batas harian per aksi, validasi server atas setiap peristiwa (jangan percaya klien), dan jejak audit.
5. Aksesibel dan tidak manipulatif: tanpa streak yang menghukum, tanpa notifikasi yang menekan.

JANGAN: menggunakan poin untuk keputusan akademik; menampilkan poin siswa lain tanpa persetujuan.

KRITERIA SELESAI: poin bertambah dari peristiwa contoh, penukaran menghasilkan QR, batas harian bekerja (uji unit untuk aturan poin).
```

## P21: Mode offline

*Pembanding: NTU Omnibus (dukungan offline). Saat ini PWA hanya men-cache aset; respons /api memakai NetworkFirst berumur 24 jam.*

```text
Tujuan: bagian terpenting aplikasi tetap berguna tanpa sinyal (kampus dan jalan menuju kampus sering tidak stabil).

FITUR:
1. Cache data baca-saja yang aman: jadwal, kartu ujian, daftar tugas, ringkasan nilai, kalender, dan KTM statis (nama, NIM, foto). Simpan di IndexedDB terenkripsi dengan kunci turunan dari sesi/biometrik bila P03 ada; jika tidak, jangan cache data keuangan dan nilai lengkap. Hapus seluruh cache saat keluar akun.
2. Penanda jelas: spanduk "Mode offline, data per <waktu>" di halaman yang memakai data tersimpan. Jangan menampilkan data lama seolah terbaru.
3. KTM offline: QR dinamis butuh server untuk penandatanganan. Sediakan QR berbasis kode TOTP yang diatur di BFF dengan jendela waktu pendek yang bisa divalidasi petugas offline, ATAU tampilkan KTM statis dengan label "tidak dapat dipindai tanpa sinyal". Pilih satu dan jelaskan alasannya di PR; jangan membuat QR statis yang bisa disalin dan dipakai ulang.
4. Antrean aksi: aksi yang aman ditunda (kumpul tugas dengan lampiran kecil, isi EDOM, buat catatan bimbingan) disimpan di antrean lokal dan dikirim saat online, dengan status "Menunggu kirim" yang terlihat dan idempotency key. Aksi yang tidak boleh ditunda (presensi, pembayaran, KRS saat jendela terbatas) harus ditolak offline dengan pesan jelas.
5. Pengaturan: "Gunakan data seluler untuk sinkronisasi", dan ukuran/penghapusan cache di Profil.

Ubah konfigurasi workbox di vite.config.ts seminimal mungkin (jangan men-cache endpoint sensitif secara luas). Uji dengan mode pesawat dan throttling jaringan.

KRITERIA SELESAI: jadwal dan kartu ujian terbuka offline dengan penanda; antrean berjalan dan terkirim saat online; cache terhapus saat keluar.
```

## P22: Lapor fasilitas

*Pembanding: MIT Mobile (laporan kerusakan/pemeliharaan dari perangkat), NTU Omnibus (formulir laporan insiden keamanan). Aspirasi.tsx saat ini bersifat umum.*

```text
Tujuan: perluas fitur Aspirasi dengan jalur "Lapor fasilitas" yang bisa diteruskan ke unit pemeliharaan.

FITUR (tab baru di fitur Aspirasi yang sudah ada):
1. Formulir laporan: kategori (AC/listrik, air/toilet, kebersihan, jaringan/Wi-Fi, perabot, keamanan), lokasi (pilih gedung/ruang dari data denah P06 atau teks bebas), deskripsi, dan foto dari kamera/galeri (kompres di klien, batas ukuran, hapus metadata EXIF lokasi sebelum unggah kecuali pengguna memilih menyertakannya).
2. Pelacakan: nomor tiket, status Diterima → Ditugaskan → Dikerjakan → Selesai, dengan komentar petugas dan foto hasil. Notifikasi tiap perubahan (hubungkan P02).
3. Konfirmasi penutupan: pelapor dapat menyatakan "sudah beres" atau "belum", yang membuka kembali tiket.
4. Pelaporan anonim tetap tersedia (mengikuti Aspirasi), dengan batasan: tidak bisa menerima pembaruan pribadi.
5. Duplikat: tampilkan laporan terbuka di lokasi yang sama sebelum mengirim, dengan opsi "saya juga mengalami" (mendukung tiket yang ada).
6. Panel unit pemeliharaan (peran TENDIK tertentu): antrean, penugasan, ubah status.

KRITERIA SELESAI: alur lapor → lacak → tutup berjalan dengan BFF mock; unggahan foto tervalidasi; Aspirasi lama tidak rusak.
```

---

## FASE 3: OPSIONAL DAN BERISIKO

## P23: Dompet kampus dan pembayaran tagihan

*Pembanding: ITB Mobile (transaksi keuangan terintegrasi, e-commerce), Law UII (PPOB: pulsa, listrik, e-money, BPJS).*

```text
PERINGATAN SEBELUM MENULIS KODE: menyimpan saldo uang, menerbitkan uang elektronik, atau menerima dana dari pengguna berpotensi menjadi kegiatan yang diatur (Bank Indonesia/OJK) dan memerlukan izin. JANGAN membangun dompet berisi saldo sendiri. Tugas pertama kamu: tulis docs/DOMPET-KAMPUS.md yang menjelaskan opsi dan risikonya, lalu berhenti dan minta keputusan.

ISI DOKUMEN:
1. Opsi A (disarankan): agregasi pembayaran lewat payment gateway/penyedia berizin (pembayaran QRIS, VA, e-wallet). Super UNPAM hanya membuat tagihan dan menampilkan status; dana tidak pernah singgah di rekening aplikasi. Sebutkan syarat teknis umum (webhook bertanda tangan, idempotency, rekonsiliasi harian).
2. Opsi B: kerja sama dengan bank mitra/e-money berizin (kartu/QR terintegrasi KTM). Sebutkan dampak kontrak dan kepatuhan.
3. Opsi C: tunda, dan hanya lengkapi pembayaran VA yang ada (lihat P10).
4. Untuk setiap opsi: kebutuhan izin, tanggung jawab perlindungan data, biaya per transaksi (tanpa mengarang angka; tulis "perlu penawaran vendor"), kebutuhan dukungan pelanggan, penanganan sengketa/refund, dan risiko penipuan.
5. Fitur yang BOLEH dijelaskan sebagai tahap lanjut: bayar kantin dengan QRIS, pembelian pulsa/listrik (PPOB) lewat agregator berizin, e-commerce kampus.

JANGAN: menyimpan nomor kartu/rekening, menerima top-up ke saldo internal, atau memilih vendor tanpa persetujuan. Setelah keputusan resmi dari pimpinan dan bagian hukum/keuangan, pembuatan prompt implementasi dilakukan terpisah.
```

---

## 6. Risiko dan hal yang perlu diputuskan manusia

1. **Data resmi belum ada.** Nomor darurat, koordinat/denah kampus, kebijakan cicilan dan beasiswa, jam layanan konseling, dan spesifikasi API sistem sumber (SSO, MY UNPAM, MENTARI, SISKEMU, dst.) harus datang dari unit terkait. Prompt di atas sengaja melarang agent mengarangnya.
2. **Privasi data mahasiswa.** Portal wali, dashboard PA, konseling, dan asisten AI memproses data pribadi. Libatkan bagian hukum/DPO soal persetujuan, retensi, dan kebijakan pelindungan data pribadi sebelum rilis.
3. **CSP yang ketat adalah aset.** Peta, mini-app, dan push adalah tempat tekanan untuk melonggarkannya. Prompt sudah mengarahkan alternatif (denah SVG sendiri, iframe sandbox di origin terpisah), tetapi tetap tinjau setiap perubahan `vercel.json`.
4. **Kapasitas tim.** Fase 0 dan 1 berisi sekitar 11 pekerjaan besar. Jangan jalankan paralel di satu branch; urutkan sesuai bagian 4.
5. **Skala pembanding berbeda.** UGM, ITS, dan NUS memiliki tim dan anggaran yang besar. Ambil pola dan prioritasnya, bukan jumlah fiturnya.
