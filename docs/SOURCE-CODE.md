# Dokumentasi source code

Penjelasan setiap file sumber, satu per satu. Dibuat otomatis oleh `scripts/dokumentasi.mjs` (`npm run docs`) dari komentar kepala dan ekspor tiap file. Tes (`*.test.ts(x)`) berada di samping file yang diuji dan tidak dicantumkan.

## Gambaran arsitektur

- **Klien**: React 18 + TypeScript + Vite, PWA. Router hash; halaman dimuat malas (`src/App.tsx`).
- **Data**: komponen hanya mengenal antarmuka di `src/lib/sumber/`. Mode demo menyimpan data contoh di localStorage (dihapus saat keluar); mode BFF memanggil `/api`.
- **Server**: Vercel Functions di `api/`. Setiap sistem kampus punya konektor `mock` (data contoh) dan `http` (sistem asli; kini 503 sampai tersambung).
- **Aturan akademik**: data bertipe di `src/data/aturan-akademik.ts`, semua masih contoh (`TODO(BAAK)`).
- **Logika murni**: `src/lib/akademik/` tanpa React/DOM, dipakai klien demo dan server agar aturan sama di keduanya.
- **Peran dosen/prodi**: masih demo; hak akses server ditandai `TODO(BFF-AUTHZ)`.

## Server (Vercel Functions / BFF)

### [api/_connectors/http.ts](../api/_connectors/http.ts)
Implementasi http untuk sistem asli kampus. SENGAJA belum diisi: URL, metode autentikasi, format respons, dan batas laju tiap sistem belum diketahui dan tidak boleh ditebak. Daftar pertanyaan untuk tim LPTI ada di docs/KONEKTOR.md. Kredensial sistem sumber nanti

Ekspor: `http`

### [api/_connectors/index.ts](../api/_connectors/index.ts)
Pemilihan implementasi per sistem lewat env: CONNECTOR_MODE=mock|http        → bawaan untuk semua sistem (default: mock) CONNECTOR_<SISTEM>=mock|http    → per sistem, mis. CONNECTOR_SSO=http, CONNECTOR_MY_UNPAM=http

Ekspor: `connectorMode`, `connectors`

### [api/_connectors/mock.ts](../api/_connectors/mock.ts)
Implementasi mock: memakai data contoh yang sama dengan mode demo klien (src/data/demo.ts). Akun demo per peran untuk menguji BFF: username berawalan "dosen", "tendik", atau "alumni" masuk sebagai peran tersebut; selainnya mahasiswa. Sandi apa pun ≥ 6 karakter diterima.

Ekspor: `mock`

### [api/_connectors/types.ts](../api/_connectors/types.ts)
Satu antarmuka per sistem sumber kampus (kolom `source` di src/data/features.ts). Setiap sistem punya implementasi `mock` (data contoh) dan `http` (sistem asli), dengan bentuk yang sama. `sub` = NIM/NIDN pemegang sesi; konektor hanya mengembalikan data milik `sub`.

Ekspor: `SsoConnector`, `MyUnpamConnector`, `MentariConnector`, `SiskemuConnector`, `EmsConnector`, `MyLspConnector`, `MyLbConnector`, `SispemaConnector`, `PortalConnector`, `Connectors`

### [api/_lib/berita.ts](../api/_lib/berita.ts)
Normalisasi berita dari situs resmi (WordPress REST atau RSS/Atom) menjadi NewsArticle. Fungsi murni tanpa jaringan supaya bisa diuji dengan masukan jahat (berita.test.ts).

Ekspor: `MAX_ITEMS`, `htmlToText`, `safeUrl`, `isoDate`, `parseWordPress`, `parseFeed`

### [api/_lib/config.ts](../api/_lib/config.ts)
Konfigurasi server. Semua rahasia hanya dari environment variable; tidak pernah dikirim ke klien.

Ekspor: `SecretName`, `secret`, `SESSION_TTL`, `isProduction`, `Geofence`, `geofences`

### [api/_lib/crypto.ts](../api/_lib/crypto.ts)
Tanda tangan HMAC dan perbandingan waktu-konstan untuk token sesi.

Ekspor: `hmac`, `b64url`, `safeEqual`

### [api/_lib/endpoint.ts](../api/_lib/endpoint.ts)
Pembuat endpoint GET /api/<domain>/<resource>: verifikasi sesi dan peran, lalu ambil data dari konektor.

Ekspor: `ReadRoute`, `readEndpoint`

### [api/_lib/http.ts](../api/_lib/http.ts)
Utilitas HTTP bersama untuk semua Vercel Functions di /api (Web Request/Response API). Folder berawalan "_" tidak dijadikan endpoint oleh Vercel.

Ekspor: `HttpError`, `ServiceUnavailableError`, `json`, `lastSegment`, `cookies`, `clientIp`, `assertSameOrigin`, `readJson`, `handle`

### [api/_lib/qr.ts](../api/_lib/qr.ts)
Kode QR dinamis ditandatangani server: code = HMAC(QR_SECRET, kind|subject|slot), slot = 30 detik. Format payload QR tetap: SUPERUNPAM:<KIND>:<subject>:<slot>:<code>. Hanya server yang bisa membuat kode yang valid, dan kode hanya diterima pada slot berjalan atau satu slot sebelumnya (±30–60 dtk).

Ekspor: `QR_PERIOD`, `qrCode`, `issueQr`, `verifyCode`, `parseQrPayload`

### [api/_lib/ratelimit.ts](../api/_lib/ratelimit.ts)
Pembatas laju dasar (fixed window) di memori instance function. TODO(BFF): pindahkan ke penyimpanan bersama (mis. Redis/KV) — di serverless tiap instance punya hitungannya sendiri, jadi ini hanya menahan serangan beruntun dari satu instance.

Ekspor: `rateLimit`

### [api/_lib/session.ts](../api/_lib/session.ts)
Sesi = cookie HttpOnly berisi token bertanda tangan HMAC (tanpa penyimpanan server). __Host- memaksa Secure + Path=/ + tanpa Domain, sehingga cookie tidak bisa disetel subdomain lain. TODO(BFF): simpan sid di penyimpanan server (mis. Redis/KV) agar "keluar dari semua perangkat"

Ekspor: `Session`, `createSessionCookie`, `clearSessionCookie`, `readSession`, `requireSession`

### [api/academic/[resource].ts](../api/academic/[resource].ts)
GET /api/academic/{schedule,grades,krs,attendance} — sumber: MY UNPAM

Ekspor: `GET`

### [api/auth/[action].ts](../api/auth/[action].ts)
POST /api/auth/login · POST /api/auth/logout · GET /api/auth/me

Ekspor: `POST`, `GET`

### [api/berita.ts](../api/berita.ts)
GET /api/berita — berita terbaru dari situs resmi UNPAM, diambil di server (browser tidak memanggil unpam.ac.id langsung: CSP connect-src 'self'). Data publik, jadi boleh di-cache CDN 15 menit. Sumber diatur lewat env (pertanyaan terbuka untuk LPTI, lihat README):

Ekspor: `GET`

### [api/campus/[resource].ts](../api/campus/[resource].ts)
GET /api/campus/{events,ranking,notifications} sumber: EMS, MY LSP, MY LB, SISPEMA, portal pengumuman

Ekspor: `GET`

### [api/finance/[resource].ts](../api/finance/[resource].ts)
GET /api/finance/bills — sumber: SISKEMU

Ekspor: `GET`

### [api/kuliah/[resource].ts](../api/kuliah/[resource].ts)
GET /api/kuliah/{classes,tasks} — sumber: MENTARI

Ekspor: `GET`

### [api/presensi/[action].ts](../api/presensi/[action].ts)
GET  /api/presensi/campuses → nama & radius area presensi (tanpa koordinat) POST /api/presensi/checkin  → validasi QR / kode sesi / geofence di server, lalu catat ke MY UNPAM

Ekspor: `GET`, `POST`

### [api/qr/[action].ts](../api/qr/[action].ts)
GET  /api/qr/issue?kind=KTM                       → QR KTM milik pemegang sesi GET  /api/qr/issue?kind=PRESENSI&subject=SESI-<MK> → QR sesi kelas (hanya dosen pengampu) POST /api/qr/verify { payload }                    → validasi QR KTM oleh petugas (dosen/tendik)

Ekspor: `GET`, `POST`

### [api/sertifikasi/[action].ts](../api/sertifikasi/[action].ts)
GET  /api/sertifikasi/ringkasan → skema, uji kompetensi, sertifikat terbit (MY LSP) POST /api/sertifikasi/daftar    { skemaId } → daftar uji kompetensi

Ekspor: `GET`, `POST`

### [api/ta/[action].ts](../api/ta/[action].ts)
GET  /api/ta/ringkasan → tugas akhir pemegang sesi, dosen + kuota, judul terdaftar (MAHASISWA) GET  /api/ta/antrian   → pengajuan judul menunggu keputusan (DOSEN) POST /api/ta/peristiwa → jalankan transisi alur. Mesin status dijalankan DI SERVER dengan peran dari

Ekspor: `GET`, `POST`

### [api/toefl/[action].ts](../api/toefl/[action].ts)
GET  /api/toefl/jadwal      → jadwal tes MY LB GET  /api/toefl/ringkasan   → hasil, pendaftaran, target skor pemegang sesi POST /api/toefl/daftar      { jadwalId } → daftar tes (tagihan dibuat MY LB/SISKEMU)

Ekspor: `GET`, `POST`

### [api/ujian/[action].ts](../api/ujian/[action].ts)
GET  /api/ujian/jadwal?jenis=UTS|UAS|SUSULAN|REMEDIAL → jadwal + ID kartu pemegang sesi GET  /api/ujian/kelayakan                          → data kelayakan (kehadiran, keuangan, …) GET  /api/ujian/pengajuan                          → pengajuan susulan/remedial

Ekspor: `GET`, `POST`

## Logika murni ujian & skripsi (dipakai klien dan server)

### [src/lib/akademik/alur-skripsi.ts](../src/lib/akademik/alur-skripsi.ts)
Mesin status tugas akhir yang tegas: hanya transisi di tabel yang sah, dengan pelaku yang boleh, dan penjaga (guard) yang memeriksa konteks. Transisi lain ditolak dan tidak mengubah apa pun. Tabel dapat diganti per prodi lewat parameter `tabel`.

Ekspor: `Peristiwa`, `KonteksTransisi`, `AturanTransisi`, `TABEL_ALUR`, `HasilTransisi`, `transisi`, `peristiwaTersedia`, `URUTAN_UTAMA`

### [src/lib/akademik/aturan.ts](../src/lib/akademik/aturan.ts)
Pembaca konfigurasi aturan akademik dengan validasi. Konfigurasi tidak lengkap ditolak dengan pesan yang menyebut lokasi masalahnya, supaya kesalahan isi dari BAAK ketahuan saat build/tes, bukan di layar.

Ekspor: `AturanTidakValid`, `validasiAturan`, `validasiRubrik`, `aturanUntuk`, `aturanUjian`, `rubrikUntuk`, `masihContoh`

### [src/lib/akademik/bentrok.ts](../src/lib/akademik/bentrok.ts)
Deteksi bentrok jadwal untuk mahasiswa (semua sesinya) dan dosen (sesi yang ia awasi/uji). Semua waktu WIB; tidak ada perbedaan zona waktu. Sesi yang bersinggungan tepat di batas (selesai 10:00, mulai 10:00) TIDAK bentrok.

Ekspor: `Rentang`, `Bentrok`, `Beruntun`, `deteksiBentrok`, `deteksiBeruntun`, `sesiPetugas`

### [src/lib/akademik/dosen-prodi.ts](../src/lib/akademik/dosen-prodi.ts)
Sisi dosen dan prodi (T08): kuota, komposisi penguji, penanda "perlu perhatian", kalender dosen, papan kemajuan, rekap CSV, dan statistik agregat. Fungsi murni untuk klien demo dan BFF.

Ekspor: `ubahKuota`, `KonteksPenguji`, `validasiPenguji`, `pengujiTersedia`, `RingkasanMahasiswaBimbingan`, `ringkasBimbingan`, `urutPerhatian`, `PeranAgenda`, `AgendaDosen`, `kalenderDosen`, `sesiKeAgenda`, `URUTAN_STATUS`, …

### [src/lib/akademik/finalisasi.ts](../src/lib/akademik/finalisasi.ts)
Revisi pasca ujian, lembar pengesahan, naskah final, plagiasi, checklist lulus (T07). Fungsi murni untuk klien demo dan BFF; tes di finalisasi.test.ts.

Ekspor: `StatusTampilRevisi`, `tampilRevisi`, `lengkapiTenggat`, `tandaiDikerjakan`, `ajukanRevisi`, `putuskanRevisi`, `semuaRevisiDisetujui`, `bolehPengesahan`, `validasiNaskahFinal`, `simpanNaskahFinal`, `PenyediaPlagiasi`, `hasilPlagiasi`, …

### [src/lib/akademik/ics-ujian.ts](../src/lib/akademik/ics-ujian.ts)
Sesi ujian → Tenggat (penjadwal pengingat, src/lib/pengingat.ts) dan berkas .ics (RFC 5545) dengan alarm H-1 dan 2 jam sebelumnya (T02 langkah 8).

Ekspor: `sesiKeTenggat`, `escIcs`, `buatIcs`, `buatIcsAgenda`, `buatIcsTenggat`

### [src/lib/akademik/judul.ts](../src/lib/akademik/judul.ts)
Utilitas pengajuan tugas akhir (T03): kemiripan judul sederhana, estimasi waktu syarat SKS, dan pembimbing yang masih punya kuota. Fungsi murni; tes di judul.test.ts.

Ekspor: `tokenJudul`, `kemiripan`, `JudulMirip`, `judulMirip`, `estimasiSemester`, `sisaKuota`, `pembimbingTersedia`, `DataPengajuanJudul`, `validasiPengajuanJudul`

### [src/lib/akademik/kelayakan.ts](../src/lib/akademik/kelayakan.ts)
evaluasiKelayakan: syarat dibaca dari aturan (data), alasan dalam kalimat yang bisa ditindaklanjuti. Hasil ini hanya tampilan/pengajuan; keputusan resmi tetap dari server (T-ATURAN 3).

Ekspor: `evaluasiKelayakan`, `ringkasKelayakan`

### [src/lib/akademik/logbook.ts](../src/lib/akademik/logbook.ts)
Logbook bimbingan dan versi draf (T04). Fungsi murni; tes di logbook.test.ts.

Ekspor: `bimbinganSah`, `ujianBerikutnya`, `TargetBimbingan`, `targetBimbingan`, `cekJedaBimbingan`, `mulaiBimbingan`, `validasiEntri`, `VersiDitolak`, `tambahVersi`, `validasiBerkasDraf`, `sha256Hex`

### [src/lib/akademik/nilai.ts](../src/lib/akademik/nilai.ts)
Pratinjau nilai ujian akhir dari rubrik konfigurasi. Selalu berlabel "perkiraan": nilai resmi dari server.

Ekspor: `PratinjauNilai`, `hurufDari`, `nilaiPenguji`, `hitungNilaiPratinjau`

### [src/lib/akademik/pendaftaran.ts](../src/lib/akademik/pendaftaran.ts)
Pendaftaran ujian akhir (T05): mesin status, checklist berkas, validasi slot, dan profil kelayakan. Fungsi murni; dijalankan di klien (pratinjau) DAN di BFF (penegakan). Tes di pendaftaran.test.ts.

Ekspor: `AksiPendaftaran`, `KonteksPendaftaran`, `TABEL_PENDAFTARAN`, `transisiPendaftaran`, `aksiTersedia`, `jenisTersedia`, `BarisBerkas`, `checklistBerkas`, `validasiBerkasUjian`, `verifikasiBerkas`, `unggahBerkas`, `siapKirim`, …

### [src/lib/akademik/penilaian.ts](../src/lib/akademik/penilaian.ts)
Penilaian ujian akhir (T06): jendela waktu, validasi lembar, pengiriman final, kerahasiaan antar penguji, rilis hasil, dan tampilan mahasiswa. Fungsi murni untuk klien demo dan BFF; tes di penilaian.test.ts.

Ekspor: `jendelaPenilaian`, `validasiLembar`, `kirimLembar`, `semuaMengirim`, `lembarTerlihat`, `pratinjauUntukDosen`, `rilisHasil`, `hasilUntukMahasiswa`, `peristiwaHasil`, `tutupPendaftaran`, `dataPenilaianBaru`

### [src/lib/akademik/tampilan-ujian.ts](../src/lib/akademik/tampilan-ujian.ts)
Model tampilan Exam Center (T02): fungsi murni dari jadwal + data kelayakan + aturan. Komponen hanya merender hasil ini, sehingga keadaan layak/tidak layak/bentrok/kosong bisa diuji.

Ekspor: `BarisUjian`, `TampilanUjian`, `susunTampilanUjian`, `batasPengajuan`, `GalatLampiran`, `validasiLampiran`

### [src/lib/akademik/types.ts](../src/lib/akademik/types.ts)
Tipe domain ujian dan skripsi/tugas akhir (T01). Murni TypeScript, tanpa React/DOM. Semua tanggal ISO 8601; tampilan memakai WIB.

Ekspor: `JenisUjian`, `JENIS_UJIAN_SEMESTER`, `JENIS_UJIAN_AKHIR`, `SesiUjian`, `Ujian`, `ProfilKelayakan`, `HasilSyarat`, `HasilKelayakan`, `StatusTugasAkhir`, `PeranAlur`, `RiwayatAlur`, `PermintaanPerubahan`, …

## Lapisan sumber data klien (demo localStorage atau BFF)

### [src/lib/sumber/index.ts](../src/lib/sumber/index.ts)
Satu tempat memilih implementasi sumber data. Saat API resmi tersedia, BFF yang berganti (CONNECTOR_MY_LB=http); klien tetap memakai implementasi http yang sama.

Ekspor: `sumber`, `StatusSumber`, `statusSumber`

### [src/lib/sumber/sertifikasi.ts](../src/lib/sumber/sertifikasi.ts)
Sumber data sertifikasi kompetensi (MY LSP).

Ekspor: `SumberSertifikasi`, `sertifikasiDemo`, `sertifikasiHttp`

### [src/lib/sumber/ta.ts](../src/lib/sumber/ta.ts)
Sumber data Skripsi/TA. Komponen hanya mengenal antarmuka ini.

Ekspor: `SumberTA`, `RevisiAktif`, `AksiRevisi`, `AksiFinalisasi`, `UjianPenguji`, `DataUjianAkhir`, `EntriBaru`, `TA_DEMO_KEY`, `LOGBOOK_DEMO_KEY`, `UJIAN_AKHIR_DEMO_KEY`, `PENILAIAN_DEMO_KEY`, `FINALISASI_DEMO_KEY`, …

### [src/lib/sumber/toefl.ts](../src/lib/sumber/toefl.ts)
Sumber data TOEFL (MY LB). Komponen hanya mengenal antarmuka ini, bukan implementasinya.

Ekspor: `SumberToefl`, `toeflDemo`, `toeflHttp`

### [src/lib/sumber/ujian.ts](../src/lib/sumber/ujian.ts)
Sumber data Exam Center (MY UNPAM). Komponen hanya mengenal antarmuka ini.

Ekspor: `SumberUjian`, `ujianDemo`, `ujianHttp`

## Pustaka klien

### [src/lib/academic.ts](../src/lib/academic.ts)
Hitungan akademik klien: IPK (2 desimal) dan IPS per semester untuk sparkline.

Ekspor: `IpkSummary`, `summarizeIpk`

### [src/lib/api.ts](../src/lib/api.ts)
Adapter data Super UNPAM: SATU-SATUNYA pintu halaman ke data. - VITE_USE_DEMO tidak di-set / 'true' → data contoh (src/data/demo.ts, dimuat sebagai chunk terpisah). - VITE_USE_DEMO='false' → memanggil BFF di /api/... (Vercel Functions, sesi cookie HttpOnly).

Ekspor: `USE_DEMO`, `ApiError`, `UNAUTHORIZED_EVENT`, `request`, `getSchedule`, `getGrades`, `getKrsOffer`, `getAttendanceRecap`, `getClasses`, `getTasks`, `getBills`, `getEvents`, …

### [src/lib/cetak.ts](../src/lib/cetak.ts)
Mencetak satu dokumen .print-doc tertentu. Beberapa dokumen cetak bisa terpasang sekaligus (kartu bimbingan, lembar pengesahan, berita acara); tanpa ini semuanya ikut tercetak. CSS: html[data-cetak] .print-doc:not([data-aktif]) disembunyikan (src/index.css).

Ekspor: `cetak`

### [src/lib/draf.ts](../src/lib/draf.ts)
Prefiks penyimpanan draf kuesioner. Modul kecil terpisah supaya api.ts (bundel awal) bisa menghapus draf saat keluar akun tanpa ikut memuat seluruh mesin kuesioner.

Ekspor: `DRAF_PREFIX`, `hapusSemuaDraf`

### [src/lib/format.ts](../src/lib/format.ts)
Format rupiah dari bilangan bulat (tanpa pecahan).

Ekspor: `rupiah`

### [src/lib/geo.ts](../src/lib/geo.ts)
Jarak haversine (meter) untuk geofence presensi; dipakai demo dan BFF.

Ekspor: `LatLng`, `distanceMeters`

### [src/lib/i18n.ts](../src/lib/i18n.ts)
Kamus teks antarmuka (Indonesia/Inggris) dan getDict untuk memilih bahasa.

Ekspor: `Lang`, `Dict`, `getDict`

### [src/lib/install.ts](../src/lib/install.ts)
Satu penampung event `beforeinstallprompt` untuk seluruh aplikasi (banner + tombol Download). Didaftarkan saat modul dimuat agar event yang terpicu sebelum React render tidak hilang.

Ekspor: `BeforeInstallPromptEvent`, `isStandalone`, `promptInstall`, `dismissInstall`, `useInstall`, `Platform`, `detectPlatform`

### [src/lib/kuesioner.ts](../src/lib/kuesioner.ts)
Mesin kuesioner generik (EDOM dan survei lain): definisi, validasi, kemajuan, draf, dan pengiriman. Bagian murni (validasi, kemajuan, payload) diuji di kuesioner.test.ts.

Ekspor: `TipePertanyaan`, `Pertanyaan`, `Kuesioner`, `Nilai`, `Jawaban`, `validasi`, `validasiSemua`, `kemajuan`, `Payload`, `susunPayload`, `sisaHari`, `Draf`, …

### [src/lib/pengingat.ts](../src/lib/pengingat.ts)
Penjadwal pengingat (U07): fungsi murni dari daftar tenggat + preferensi → daftar notifikasi beserta waktunya. Dipakai nanti oleh cron server (Web Push) dan bisa diuji tanpa jaringan (pengingat.test.ts). Juga: hitungan lonceng dari data notifikasi yang sama.

Ekspor: `JenisPengingat`, `JENIS_PENGINGAT`, `Tenggat`, `PreferensiPengingat`, `PREFERENSI_BAWAAN`, `NotifTerjadwal`, `WIB_MENIT`, `hindariJamTenang`, `jadwalkanPengingat`, `jumlahBelumDibaca`

### [src/lib/prayer.ts](../src/lib/prayer.ts)
Perhitungan jadwal sholat lokal (tanpa API/aset) — parameter Kemenag RI: Subuh -20°, Isya -18°, Asar mazhab Syafi'i (bayangan = 1×), ihtiyath +2 menit. Titik acuan jadwal sholat bila lokasi pengguna tidak dipakai. TODO: koordinat resmi kampus.

Ekspor: `CAMPUS_LOCATION`, `PrayerTimes`, `prayerTimes`, `qibla`

### [src/lib/prefs.ts](../src/lib/prefs.ts)
Hanya preferensi UI (tema, bahasa, favorit). Token/kredensial TIDAK disimpan di sini.

Ekspor: `usePref`

### [src/lib/types.ts](../src/lib/types.ts)
Tipe domain bersama klien dan BFF, supaya bentuk respons selalu sama.

Ekspor: `Role`, `User`, `ScheduleItem`, `CourseGrade`, `SemesterGrades`, `KrsClass`, `OnlineClass`, `Task`, `Bill`, `CampusEvent`, `JadwalTes`, `PendaftaranTes`, …

### [src/lib/useResource.ts](../src/lib/useResource.ts)
Hook pemuat data: loading, error, data, dan reload untuk fungsi sumber.

Ekspor: `Resource`, `useResource`

## Data contoh dan konfigurasi aturan

### [src/data/aturan-akademik.ts](../src/data/aturan-akademik.ts)
Aturan akademik ujian dan skripsi sebagai DATA (T-ATURAN 1). Kode di src/lib/akademik membaca berkas ini; tidak ada ambang atau bobot yang ditulis di komponen. PENTING: dokumen resmi UNPAM (pedoman akademik, pedoman skripsi, SK UTS/UAS, rubrik, arti UAPS) belum

Ekspor: `Sumber`, `DefinisiSyarat`, `AturanUjian`, `AturanBerkas`, `KriteriaRubrik`, `Rubrik`, `HurufMutu`, `AturanProdi`, `ATURAN_BAWAAN`, `ATURAN_PRODI`

### [src/data/demo.ts](../src/data/demo.ts)
Data contoh. TODO(LPTI): ganti dengan panggilan BFF (/api/...) — struktur dibuat mirip respons API. Halaman TIDAK mengimpor file ini langsung: aksesnya lewat src/lib/api.ts (mode demo) atau konektor mock di /api/_connectors (mode BFF), sehingga UI tidak berubah saat sumber data diganti.

Ekspor: `DEMO_USER`, `schedule`, `grades`, `krsOffer`, `classes`, `tasks`, `bills`, `events`, `jadwalTes`, `toefl`, `sertifikasi`, `ranking`, …

### [src/data/features.ts](../src/data/features.ts)
Semua fitur dirender DI DALAM Super UNPAM (satu aplikasi), bukan membuka situs lain. `source` = sistem backend kampus yang nanti dipanggil lewat BFF (bukan ditampilkan ke user).

Ekspor: `Feature`, `FEATURES`, `featureById`

### [src/data/kampus.ts](../src/data/kampus.ts)
Informasi kampus untuk onboarding dan halaman "Kenali Kampus" (U06). ATURAN: setiap butir wajib punya `sumber` (URL resmi) dan `dicek` (tanggal dibaca). Field `terverifikasi` hanya boleh `true` setelah MANUSIA (humas/LPTI) memastikan isinya. Jangan mengarang

Ekspor: `Bersumber`, `LokasiKampus`, `Fakultas`, `LayananKampus`, `KontakResmi`, `MOTO`, `SEJARAH`, `LOKASI`, `FAKULTAS`, `LAYANAN`, `KONTAK`, `tautanPeta`

## Komponen bersama

### [src/components/DownloadCTA.tsx](../src/components/DownloadCTA.tsx)
Tautan unduhan resmi. Desktop (.exe/.msi/.dmg) dibangun otomatis oleh GitHub Actions (.github/workflows/release-desktop.yml) dan dipublikasikan di GitHub Releases.

Ekspor: `LINKS`, `DownloadCTA`, `StoreBadges`, `InstallGuide`

### [src/components/Icon3D.tsx](../src/components/Icon3D.tsx)
Ikon 3D ringan (opsi "c" di brief): tile glossy berlapis dari CSS + glyph SVG. Cahaya dari kiri-atas ~45°, rim-light neon, bayangan lembut (gradient, bukan filter blur — ikon ini muncul puluhan kali per layar). Tanpa aset raster →

Ekspor: `Icon3D`

### [src/components/Onboarding.tsx](../src/components/Onboarding.tsx)
#50 + U06 Onboarding: mengenalkan KAMPUS (bukan hanya aplikasi). Maksimal 5 layar, bisa dilewati (tombol atau Esc), dan bisa dibuka ulang dari Profil > Kenali Kampus. Data dari src/data/kampus.ts.

Ekspor: `Onboarding`

### [src/components/PwaBanners.tsx](../src/components/PwaBanners.tsx)
Banner global: versi baru tersedia & status offline. Ajakan install ada di <DownloadCTA /> (Beranda) dan halaman /download.

Ekspor: `PwaBanners`

### [src/components/ui.tsx](../src/components/ui.tsx)
Komponen UI bersama: kepala halaman, Section, tombol tautan, Badge, Tabs, Progress, Sparkline, catatan demo, Skeleton.

Ekspor: `PageHeader`, `Section`, `LinkBtn`, `Badge`, `Tabs`, `Progress`, `Sparkline`, `DemoNote`, `Row`, `List`, `Skeleton`, `LoadError`, …

## Halaman fitur

### [src/pages/fitur/Alumni.tsx](../src/pages/fitur/Alumni.tsx)
#49 Alumni & mentorship — direktori alumni, mentoring, lowongan dari alumni.

Ekspor: `Alumni`

### [src/pages/fitur/Aspirasi.tsx](../src/pages/fitur/Aspirasi.tsx)
#46 Kotak aspirasi & pengaduan — anonim opsional + tracking tindak lanjut.

Ekspor: `Aspirasi`

### [src/pages/fitur/Booking.tsx](../src/pages/fitur/Booking.tsx)
#45 Booking fasilitas & ruang — pilih fasilitas, hari, slot → konfirmasi.

Ekspor: `Booking`

### [src/pages/fitur/DompetSertifikat.tsx](../src/pages/fitur/DompetSertifikat.tsx)
#47 Dompet sertifikat & badge digital — satu tempat, QR verifikasi publik.

Ekspor: `DompetSertifikat`

### [src/pages/fitur/DosenProdi.tsx](../src/pages/fitur/DosenProdi.tsx)
T08 Sisi dosen dan prodi. SELURUH layar ini DEMO: peran bisa diganti dari Profil dan hak akses belum ditegakkan server. TODO(BFF-AUTHZ) pada setiap akses data: identitas dosen dan cakupan prodi dari sesi.

Ekspor: `PeringatanDemo`, `IkhtisarBimbingan`, `KuotaDosen`, `KalenderDosen`, `PapanProdiView`

### [src/pages/fitur/Edom.tsx](../src/pages/fitur/Edom.tsx)
#42 EDOM & survei — satu pertanyaan per layar, draf otomatis, ringkasan sebelum kirim. Definisi kuesioner CONTOH; TODO(BFF): daftar kuesioner, tenggat, dan token anonim dari server.

Ekspor: `Edom`

### [src/pages/fitur/Finalisasi.tsx](../src/pages/fitur/Finalisasi.tsx)
T07 Revisi pasca ujian, lembar pengesahan, naskah final, pemeriksaan kemiripan, administrasi lulus, yudisium & wisuda. Keputusan resmi dari server; aksi prodi di layar dosen hanya simulasi DEMO (T08).

Ekspor: `RevisiMahasiswa`, `FinalisasiMahasiswa`, `RevisiDosen`, `SimulasiProdi`

### [src/pages/fitur/Herreg.tsx](../src/pages/fitur/Herreg.tsx)
#44 Registrasi ulang & cuti akademik — form + status, terkait status pembayaran.

Ekspor: `Herreg`

### [src/pages/fitur/Islami.tsx](../src/pages/fitur/Islami.tsx)
#48 Pusat layanan Islami — jadwal sholat (hitung lokal), arah kiblat (kompas), kegiatan.

Ekspor: `Islami`

### [src/pages/fitur/Logbook.tsx](../src/pages/fitur/Logbook.tsx)
T04 Logbook bimbingan dan versi draf. Catatan bimbingan hanya untuk mahasiswa, pembimbing, dan prodi yang berwenang — TODO(BFF-AUTHZ): ditegakkan server. Berkas draf belum diunggah (DrivePAM): yang disimpan adalah metadata + hash SHA-256 yang dihitung di perangkat.

Ekspor: `LogbookMahasiswa`, `BimbinganDosen`

### [src/pages/fitur/Pemira.tsx](../src/pages/fitur/Pemira.tsx)
#51 E-voting Pemira — modul on-demand (chunk terpisah, dimuat hanya saat dibuka). TODO(BFF): satu suara per NIM, token sekali pakai, suara terenkripsi & log audit terpisah dari identitas.

Ekspor: `Pemira`

### [src/pages/fitur/Penilaian.tsx](../src/pages/fitur/Penilaian.tsx)
T06 Hari ujian (sisi penguji, DEMO sampai otorisasi server). TODO(BFF-AUTHZ): identitas penguji dari sesi dosen; kerahasiaan lembar antar penguji ditegakkan server (lembarTerlihat).

Ekspor: `UjianSayaDosen`, `HasilUjianMahasiswa`

### [src/pages/fitur/Surat.tsx](../src/pages/fitur/Surat.tsx)
#41 Layanan surat & administrasi mandiri — form + workflow approval + unduh PDF.

Ekspor: `Surat`

### [src/pages/fitur/TugasAkhir.tsx](../src/pages/fitur/TugasAkhir.tsx)
T03 Skripsi/Tugas Akhir: syarat mulai, pengajuan judul + calon pembimbing, kemiripan judul, linimasa status dari mesin alur (src/lib/akademik/alur-skripsi.ts), dan sisi dosen (DEMO).

Ekspor: `TugasAkhir`

### [src/pages/fitur/Ujian.tsx](../src/pages/fitur/Ujian.tsx)
#43 Exam Center v2 (T02): UTS, UAS, susulan, remedial. Data lewat src/lib/sumber/ujian.ts, aturan dari src/data/aturan-akademik.ts, logika di src/lib/akademik. Kartu & QR hanya untuk mata kuliah yang layak.

Ekspor: `Ujian`

### [src/pages/fitur/UjianAkhir.tsx](../src/pages/fitur/UjianAkhir.tsx)
T05 Pendaftaran ujian akhir: kelayakan, checklist berkas, persetujuan pembimbing, pilih slot prodi, pembatalan/jadwal ulang, dan halaman persiapan. Kelayakan resmi dihitung server (jalankanAksi).

Ekspor: `UjianAkhirMahasiswa`, `AntrianUjianDosen`

### [src/pages/fitur/label-ta.ts](../src/pages/fitur/label-ta.ts)
Label tampilan status tugas akhir, dipakai halaman mahasiswa, dosen, dan prodi.

Ekspor: `LABEL_STATUS`

## Halaman utama

### [src/pages/Akademik.tsx](../src/pages/Akademik.tsx)
Tab Akademik: ringkasan nilai, IPK, dan pintasan layanan akademik.

Ekspor: `Akademik`

### [src/pages/AturBeranda.tsx](../src/pages/AturBeranda.tsx)
Galeri widget Beranda: tampil/sembunyi dan urutan. Sengaja tanpa drag-and-drop: tombol Naik/Turun bisa dipakai dengan keyboard dan pembaca layar, dan perubahan diumumkan lewat aria-live.

Ekspor: `AturBeranda`

### [src/pages/BahasaKompetensi.tsx](../src/pages/BahasaKompetensi.tsx)
TOEFL (MY LB) dan Sertifikasi (MY LSP). Data lewat src/lib/sumber: mengganti ke API resmi tidak mengubah komponen ini. Label sumber selalu dari statusSumber() — tidak pernah mengaku terhubung.

Ekspor: `Toefl`, `Sertifikasi`

### [src/pages/Download.tsx](../src/pages/Download.tsx)
Halaman unduh aplikasi (PWA dan paket desktop/seluler).

Ekspor: `DownloadPage`

### [src/pages/Home.tsx](../src/pages/Home.tsx)
Beranda: menyusun widget sesuai peran dan pilihan pengguna; data bersama dimuat sekali.

Ekspor: `Home`

### [src/pages/KenaliKampus.tsx](../src/pages/KenaliKampus.tsx)
U06: halaman permanen "Kenali Kampus" — data sama dengan onboarding (src/data/kampus.ts).

Ekspor: `KenaliKampus`

### [src/pages/Keuangan.tsx](../src/pages/Keuangan.tsx)
Tagihan dan pembayaran (SISKEMU); status "sudah bayar" di demo hanya simulasi lokal.

Ekspor: `Keuangan`

### [src/pages/Ktm.tsx](../src/pages/Ktm.tsx)
QR berganti tiap 30 detik agar tidak bisa di-screenshot & dipakai ulang. Di mode BFF kode ditandatangani server (HMAC) dan divalidasi server; klien hanya menampilkan.

Ekspor: `useDynamicQr`, `KtmPage`

### [src/pages/Kuliah.tsx](../src/pages/Kuliah.tsx)
Tab Kuliah: jadwal hari ini dan kelas daring.

Ekspor: `Kuliah`

### [src/pages/Layanan.tsx](../src/pages/Layanan.tsx)
Halaman layanan kampus: Event, Prestasi, Tracer Study, Kerja sama.

Ekspor: `Event`, `Prestasi`, `Tracer`, `Kerjasama`

### [src/pages/Pengingat.tsx](../src/pages/Pengingat.tsx)
U07: preferensi pengingat. Izin notifikasi HANYA diminta setelah pengguna menekan tombol. Pengiriman Web Push butuh server (kunci VAPID, penyimpanan langganan, cron) yang belum tersedia; halaman ini jujur menyatakannya. Penjadwal yang akan dipakai server: src/lib/pengingat.ts.

Ekspor: `Pengingat`

### [src/pages/Presensi.tsx](../src/pages/Presensi.tsx)
Validasi QR, kode sesi, dan geofence dilakukan BFF (api/presensi). Koordinat kampus resmi hanya ada di konfigurasi server; klien menerima nama & radius area saja.

Ekspor: `Presensi`

### [src/pages/Profil.tsx](../src/pages/Profil.tsx)
Profil pengguna, pengaturan tema/bahasa, ganti peran (demo), dan halaman Notifikasi.

Ekspor: `Theme`, `Profil`, `Notifikasi`

### [src/pages/widgets/Sections.tsx](../src/pages/widgets/Sections.tsx)
Widget berbentuk bagian berjudul di Beranda.

Ekspor: `LayananSection`, `AplikasiSection`, `JadwalHariIniSection`, `TugasTerdekatSection`, `BeritaSection`, `EventSection`

### [src/pages/widgets/Tiles.tsx](../src/pages/widgets/Tiles.tsx)
Widget berbentuk tile di kisi bento Beranda. Kelas col-span ditentukan di sini karena tiap tile tahu ukurannya; registry.ts mencatat ukuran yang sama untuk Galeri.

Ekspor: `KtmTile`, `KelasSekarangTile`, `IpkTile`, `TagihanTile`, `SholatTile`

### [src/pages/widgets/layout.ts](../src/pages/widgets/layout.ts)
Tata letak Beranda yang disimpan pengguna (usePref 'home.widgets'). Fungsi murni: tanpa React, supaya bisa diuji langsung (layout.test.ts).

Ekspor: `HomeLayout`, `normalizeLayout`, `moveWidget`, `toggleWidget`

### [src/pages/widgets/registry.ts](../src/pages/widgets/registry.ts)
Daftar widget Beranda: urutan bawaan dan peran yang boleh melihat.

Ekspor: `WIDGETS`, `WIDGET_IDS`, `HIDDEN_BY_DEFAULT`, `DEFAULT_LAYOUT`, `widgetById`

### [src/pages/widgets/types.ts](../src/pages/widgets/types.ts)
Data Beranda yang dipakai lebih dari satu widget: dimuat sekali di Home, lalu dibagikan.

Ekspor: `HomeData`, `WidgetProps`, `WidgetDef`

## Akar aplikasi

### [src/App.tsx](../src/App.tsx)
Anggaran performa (Section 7): Beranda dimuat langsung; semua halaman lain = chunk terpisah yang baru diunduh saat dibuka, sehingga menambah fitur tidak menaikkan bundel awal.

Ekspor: `App`

### [src/main.tsx](../src/main.tsx)
Titik masuk aplikasi: memasang <App /> ke #root dan memuat gaya global.

