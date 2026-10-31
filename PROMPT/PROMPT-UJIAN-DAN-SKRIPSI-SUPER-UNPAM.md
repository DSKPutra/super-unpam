# Prompt: Ujian (UTS, UAS, ujian akhir) dan Skripsi/Tugas Akhir untuk Super UNPAM

Disusun 28 Okt 2026. Pelengkap lima dokumen sebelumnya di Project ini. Dasar: kode repo `DSKPutra/super-unpam` (commit `02e3e7f`) dibaca langsung.

## 1. Temuan dan batas

**Temuan di kode (terverifikasi):**
- `src/pages/fitur/Ujian.tsx` (Exam Center, 57 baris) **hanya UTS Ganjil 2026/2027**: tiga jadwal ujian ditulis langsung di file, satu QR kartu (`SUPERUNPAM:UJIAN:NIM:UTS-GANJIL-2026`, tanpa tanda tangan server), dan empat tata tertib. Tidak ada UAS, ujian susulan/remedial, syarat kelayakan, deteksi bentrok, cetak kartu, atau notifikasi perubahan jadwal.
- Pencarian `skripsi`, `thesis`, `tugas akhir`, `UAPS`, `sidang` di seluruh `src/` **tidak menemukan apa pun**. Fitur skripsi/tugas akhir belum ada sama sekali.
- Yang bisa dipakai ulang: Booking (slot bimbingan dosen), Surat (alur status), Pusat Tenggat (patch), DrivePAM (rencana penyimpanan berkas), peran DOSEN, Dompet Sertifikat, Herreg, Keuangan.

**Yang tidak saya ketahui, dan tidak saya karang:**
- **Arti "UAPS".** Saya tidak menemukan istilah ini di sumber publik UNPAM. Jadi di dokumen ini UAPS diperlakukan sebagai **satu jenis ujian akhir yang namanya dan aturannya dapat dikonfigurasi**, bukan sebagai fitur dengan aturan yang saya tebak. Prompt T00 meminta Anda mengisi arti dan aturannya.
- **Aturan akademik UNPAM** (syarat ujian, jumlah bimbingan minimum, komposisi penguji, rubrik, bobot nilai, alur yudisium). Itu keputusan BAAK/fakultas dan berbeda tiap prodi. Prompt di sini membuat **mesin yang aturannya berupa data**, supaya angka dan syarat diisi dari dokumen resmi, bukan ditulis di kode.
- Isi situs live: `super-unpam.vercel.app` adalah SPA, jadi yang bisa saya baca hanya kodenya. Kodenya yang saya jadikan dasar.

Sebagai pola (bukan untuk ditiru persis): beberapa kampus lain menjalankan pembimbingan, ujian, dan penilaian akhir skripsi lewat satu sistem, misalnya [skripsi.ums.ac.id](https://eprints.ums.ac.id/114443/) di UMS. Saya hanya membaca judul dan ringkasan hasil pencarian, bukan isi lengkapnya.

## 2. Peta fitur yang akan dibangun

| # | Fitur | Pengguna | Prompt |
|---|---|---|---|
| 0 | Keputusan aturan ujian dan skripsi (dokumen, bukan kode) | Anda + BAAK | T00 |
| 1 | Model data dan mesin alur (pure TS + tes) | semua | T01 |
| 2 | Exam Center v2: UTS, UAS, susulan, kelayakan, bentrok | mahasiswa | T02 |
| 3 | Pengajuan skripsi/TA dan pemilihan pembimbing | mahasiswa, dosen | T03 |
| 4 | Logbook bimbingan dan versi draf | mahasiswa, dosen | T04 |
| 5 | Pendaftaran ujian akhir (proposal, seminar hasil, UAPS, sidang) | mahasiswa, prodi | T05 |
| 6 | Hari ujian, penilaian penguji, berita acara | dosen | T06 |
| 7 | Revisi pasca ujian, yudisium, unggah final, administrasi lulus | mahasiswa | T07 |
| 8 | Sisi dosen/prodi: kuota, daftar bimbingan, jadwal penguji | dosen, tendik | T08 |
| 9 | Ujian daring (opsional, dengan batas privasi) | mahasiswa, dosen | T09 |

## 3. Cara memakai
1. Tempel **P00** (`PROMPT-FITUR-SUPER-UNPAM.md`) dan **U-ATURAN** (`PROMPT-FITUR-UNIVERS-KE-SUPER-UNPAM.md`) di awal sesi, lalu **T-ATURAN** di bawah.
2. Urutan: **T00 (manusia) → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09**. T01 wajib sebelum T02-T08.
3. Satu prompt per sesi/branch. Setiap fitur memakai adaptor data contoh sampai ada API resmi.

## T-ATURAN (tempel bersama setiap prompt di dokumen ini)
```text
ATURAN UJIAN DAN SKRIPSI:
1. Aturan akademik (syarat kelayakan, ambang kehadiran, jumlah bimbingan minimum, komposisi penguji, rubrik, bobot, batas waktu revisi) TIDAK ditulis di kode. Semuanya masuk ke berkas konfigurasi bertipe (src/data/aturan-akademik.ts) dengan kolom sumber dan tanggal verifikasi. Nilai yang belum diverifikasi manusia diberi `TODO(BAAK)` dan fitur harus tetap berjalan dengan nilai contoh yang dilabeli.
2. Nilai, penilaian penguji, dan data bimbingan SENSITIF. Hak akses ditegakkan SERVER (TODO BFF) berdasarkan peran dari sesi, bukan dari localStorage. Saat ini peran bisa diganti dari layar Profil; jangan membangun tampilan dosen/penguji seolah aman. Beri komentar `TODO(BFF-AUTHZ)` dan label "demo" pada setiap layar peran non-mahasiswa.
3. Semua keputusan akademik (lulus/tidak, nilai akhir, jadwal resmi) berasal dari server. Klien hanya menampilkan dan mengajukan. Jangan menghitung nilai akhir resmi di klien kecuali sebagai pratinjau berlabel "perkiraan".
4. Setiap perubahan status penting (jadwal berubah, ujian disetujui, nilai terbit, revisi diminta) menghasilkan peristiwa yang masuk ke notifikasi dan Pusat Tenggat (src/lib/tenggat.ts).
5. Tanggal selalu WIB dan memakai parseTanggalId / format yang sama. Hindari angka literal di komponen.
6. Berkas mahasiswa (draf, revisi, bukti) tidak masuk repo atau localStorage; gunakan antarmuka penyimpanan (DrivePAM) dengan transport yang dapat diganti (src/lib/upload.ts).
7. Aksesibilitas: WCAG AA, target sentuh 44px, status tidak hanya dengan warna, ringkasan status dibaca pembaca layar.
```

---

## T00: Dokumen aturan ujian dan skripsi (dikerjakan manusia + AI, tanpa kode)

```text
Tujuan: hasilkan docs/ATURAN-UJIAN-DAN-SKRIPSI.md dan src/data/aturan-akademik.template.ts. BUKAN fitur.

LANGKAH MANUSIA (pemilik repo): kumpulkan dokumen resmi dan taruh di docs/referensi-akademik/ (jangan di-commit jika bukan publik): pedoman akademik UNPAM, pedoman skripsi/tugas akhir fakultas atau prodi Anda, SK atau panduan UTS/UAS, panduan sidang, formulir bimbingan, rubrik penilaian, dan penjelasan resmi istilah UAPS.

LANGKAH AI: baca semuanya, lalu tulis:
1. Glosarium: arti UAPS menurut dokumen resmi (kutip nomor halaman). Jika dokumen tidak ada, tulis "belum diketahui" dan jangan menebak.
2. Daftar jenis ujian dan syarat tiap jenis: UTS, UAS, ujian susulan, remedial, proposal, seminar hasil, UAPS, sidang akhir. Untuk tiap jenis: syarat kehadiran, syarat keuangan, syarat berkas, jumlah bimbingan minimum, penguji, durasi, bentuk nilai.
3. Alur skripsi/tugas akhir dari pengajuan judul sampai lulus, dengan pelaku dan keputusan di tiap langkah serta batas waktunya.
4. Rubrik dan bobot nilai, rumus nilai akhir, ambang kelulusan.
5. Perbedaan antar prodi/fakultas (jika ada) dan cara menanganinya sebagai konfigurasi.
6. Berkas konfigurasi templat src/data/aturan-akademik.template.ts dengan tipe yang akan dipakai T01; isi hanya yang tertulis di dokumen, sisanya `TODO(BAAK)`.
7. Pertanyaan terbuka dengan kolom jawaban kosong untuk BAAK.

JANGAN: mengarang aturan, ambang, atau nama pejabat; menyalin dokumen panjang; memasukkan data pribadi.
KRITERIA SELESAI: setiap aturan punya sumber atau tanda TODO; pertanyaan terbuka jelas.
```

## T01: Model data dan mesin alur (logika murni + tes)

```text
Tujuan: fondasi bersama untuk T02-T08. Hanya TypeScript murni di src/lib/akademik/, tanpa React/DOM, supaya dapat diuji dengan tsx --test (pola src/lib/tenggat.ts dan tests/tenggat.test.ts).

Baca dulu: src/lib/tenggat.ts, src/lib/types.ts, src/data/demo.ts, docs/ATURAN-UJIAN-DAN-SKRIPSI.md (jika ada).

BUAT:
1. types.ts: JenisUjian ('UTS'|'UAS'|'SUSULAN'|'REMEDIAL'|'PROPOSAL'|'SEMINAR_HASIL'|'UAPS'|'SIDANG'), Ujian, SesiUjian (tanggal, jam, ruang, kursi, pengawas/penguji), SyaratKelayakan, TugasAkhir (judul, abstrak, bidang, pembimbing[], status), Bimbingan, PendaftaranUjianAkhir, Penilaian, Revisi.
2. aturan.ts: pembaca konfigurasi aturan-akademik dengan validasi (tolak konfigurasi tak lengkap dengan pesan jelas) dan fungsi pencari aturan per prodi.
3. kelayakan.ts: evaluasiKelayakan(mahasiswa, ujian, aturan) mengembalikan {layak: boolean, syarat: [{id, terpenuhi, alasan, tautanPerbaikan}]}. Alasan memakai bahasa Indonesia yang bisa ditindaklanjuti ("Kehadiran 68%, minimal 75%").
4. bentrok.ts: deteksiBentrok(sesi[]) untuk mahasiswa dan untuk dosen; beda zona waktu tidak ada (WIB).
5. alur-skripsi.ts: mesin status (state machine) tegas: DRAF_JUDUL → DIAJUKAN → DISETUJUI_PEMBIMBING | DITOLAK → BIMBINGAN → LAYAK_PROPOSAL → UJIAN_PROPOSAL → REVISI_PROPOSAL → PENELITIAN → LAYAK_UAPS/SEMINAR_HASIL → UJIAN_AKHIR → REVISI_AKHIR → YUDISIUM → SELESAI. Fungsi transisi(status, peristiwa, konteks) yang menolak transisi tidak sah dan mencatat riwayat. Daftar status dan peristiwa diambil dari konfigurasi bila prodi berbeda.
6. nilai.ts: hitungNilaiPratinjau(rubrik, skor[]) dengan pembulatan yang ditentukan dan huruf mutu dari konfigurasi; label "perkiraan".
7. ics-ujian.ts: ubah sesi ujian menjadi Tenggat (src/lib/tenggat.ts) agar muncul di radar dan .ics.
8. Tes di tests/akademik.test.ts: kelayakan (semua kombinasi syarat), bentrok (batas jam bersinggungan tepat, hari sama, beda hari), semua transisi sah dan tidak sah, nilai (pembulatan, bobot tidak 100%), validasi konfigurasi.

KRITERIA SELESAI: tsx --test lulus; tsc --strict lulus; tidak ada angka aturan di kode (semua dari konfigurasi); setiap transisi tidak sah ditolak oleh tes.
```

## T02: Exam Center v2 (UTS, UAS, susulan, remedial)

```text
Tujuan: ubah src/pages/fitur/Ujian.tsx dari satu halaman UTS statis menjadi pusat ujian lengkap.

Prasyarat: T01. Baca dulu: src/pages/fitur/Ujian.tsx, src/lib/akademik/*, src/lib/tenggat.ts, src/pages/fitur/Tenggat.tsx, patch U03 (cetak kartu) jika sudah ada.

LANGKAH:
1. Sumber data lewat antarmuka repositori src/lib/sumber/ujian.ts (adaptor demo berlabel + http TODO). Hapus array EXAMS dan kode "UTS-GANJIL-2026" yang tertulis langsung.
2. Pemilih jenis ujian (UTS | UAS | Susulan | Remedial) dan semester. Tampilan jadwal per jenis dengan nama MK, tanggal, jam, ruang, kursi, pengawas.
3. KELAYAKAN per mata kuliah memakai evaluasiKelayakan: tampilkan status "Boleh ikut" atau "Belum memenuhi syarat" beserta alasan dan tautan perbaikan (Keuangan, Presensi, Surat). Kartu ujian dan QR hanya dibuat untuk mata kuliah yang layak; sisanya menampilkan alasan, bukan kartu kosong.
4. Peringatan bentrok jadwal (deteksiBentrok) dan peringatan "ujian beruntun" bila jarak antar ujian lebih kecil dari ambang konfigurasi.
5. Pengajuan ujian susulan dan remedial: formulir alasan + lampiran bukti (surat dokter, dll.) memakai src/lib/upload.ts, status bergerak Diajukan → Diverifikasi → Disetujui/Ditolak (pola Surat.tsx), dengan pengingat tenggat pengajuan.
6. Kartu ujian: QR hanya memuat ID kartu (verifikasi di server, TODO BFF), bukan NIM mentah. Cetak/PDF mengikuti U03.
7. Perubahan jadwal: bila jadwal berubah, tampilkan penanda "Berubah" dengan jadwal lama dan baru, dan buat peristiwa notifikasi.
8. Semua sesi ujian tampil di Pusat Tenggat dan masuk ekspor .ics (alarm H-1 dan 2 jam).
9. Tata tertib dari konfigurasi per jenis ujian, bukan teks tetap.
10. Mode .lite dan tema gelap/terang diperiksa.

KRITERIA SELESAI: tidak ada data ujian tertulis di komponen; mahasiswa yang tidak layak melihat alasan jelas dan tidak mendapat QR; bentrok terdeteksi; sesi ujian muncul di Pusat Tenggat; tes komponen untuk keadaan layak, tidak layak, bentrok, dan kosong.
```

## T03: Pengajuan skripsi/tugas akhir dan pemilihan pembimbing

```text
Tujuan: halaman "Skripsi/Tugas Akhir" baru (rute `ta`) untuk mengajukan judul dan mendapat pembimbing.

Prasyarat: T01. Baca dulu: src/pages/fitur/Surat.tsx (pola formulir dan status), src/pages/fitur/Booking.tsx, src/data/features.ts, src/App.tsx.

LANGKAH:
1. Daftarkan fitur `ta` di features.ts (peran MAHASISWA, DOSEN) dan rute di App.tsx dengan lazy chunk, seperti fitur lain.
2. Syarat mulai skripsi (SKS minimal, IPK minimal, mata kuliah wajib) dievaluasi dengan evaluasiKelayakan; bila belum layak tampilkan syarat yang kurang dan estimasi kapan terpenuhi.
3. Formulir pengajuan: judul (maks karakter dari konfigurasi), bidang/kelompok keilmuan, abstrak singkat, rencana metode, dan tiga pilihan pembimbing urut prioritas dari daftar dosen yang masih punya kuota (T08). Draf tersimpan otomatis dan bisa dilanjutkan.
4. Cek kemiripan judul sederhana terhadap judul yang sudah ada (di klien untuk data contoh; TODO BFF untuk basis data sungguhan): tampilkan "judul mirip" sebagai peringatan, bukan penolakan otomatis. Bukan pengganti cek plagiasi resmi.
5. Linimasa status memakai mesin alur T01: tampil sebagai stepper dengan tanggal, pelaku, dan catatan di tiap langkah; penolakan menampilkan alasan dan tombol "Ajukan ulang" dengan riwayat tetap tersimpan.
6. Penetapan pembimbing menampilkan nama, kontak resmi, dan tautan "Jadwalkan bimbingan" (Booking).
7. Perubahan judul atau pembimbing = pengajuan baru yang butuh persetujuan, tidak langsung mengubah data.

KRITERIA SELESAI: status hanya bisa berpindah lewat transisi sah; judul tanpa pembimbing tidak bisa lanjut ke bimbingan; riwayat penolakan tidak hilang; label demo pada layar peran non-mahasiswa.
```

## T04: Logbook bimbingan dan versi draf

```text
Tujuan: catatan bimbingan yang bisa dipertanggungjawabkan dan menjadi syarat ujian.

Prasyarat: T01, T03. Baca dulu: Booking.tsx (slot bimbingan), src/lib/upload.ts, PROMPT-MAILPAM-DRIVEPAM.md (DrivePAM).

LANGKAH:
1. Entri bimbingan: tanggal, bab/bagian yang dibahas, ringkasan arahan dosen, tugas berikutnya beserta tenggat, lampiran draf. Mahasiswa mengisi; dosen memverifikasi/menyetujui entri (peran DOSEN, label demo, TODO(BFF-AUTHZ)).
2. Entri hanya sah jika disetujui dosen. Jumlah bimbingan yang disetujui dibandingkan dengan minimum dari konfigurasi dan menjadi bagian evaluasiKelayakan untuk ujian (T05). Tampilkan "3 dari 8 bimbingan disetujui".
3. Versi draf: setiap unggahan draf menjadi versi baru (v1, v2, ...) dengan hash SHA-256 dan catatan perubahan; daftar versi dapat dibandingkan lewat metadata (tanggal, ukuran, hash). Tidak ada penimpaan diam-diam. Gunakan validasi berkas src/lib/upload.ts; untuk draf besar naikkan batas lewat konfigurasi, bukan hardcode.
4. Penjadwalan: tombol "Jadwalkan bimbingan" membuka Booking dengan dosen terisi; tanggal bimbingan masuk Pusat Tenggat dan .ics.
5. Pengingat otomatis: bila tidak ada bimbingan lebih dari ambang hari (konfigurasi), tampilkan pengingat halus ke mahasiswa, dan penanda "perlu perhatian" ke dosen/prodi (tanpa nada menghakimi).
6. Ekspor "Kartu bimbingan" PDF melalui print CSS (pola U03) untuk keperluan administrasi, berisi entri yang disetujui saja.
7. Privasi: catatan bimbingan hanya terlihat oleh mahasiswa, pembimbing, dan peran prodi yang berwenang (server, TODO(BFF-AUTHZ)).

KRITERIA SELESAI: entri belum disetujui tidak dihitung; versi draf tidak bisa ditimpa; kartu bimbingan hanya memuat entri sah; tes untuk penghitung bimbingan sah dan pengingat jeda.
```

## T05: Pendaftaran ujian akhir (proposal, seminar hasil, UAPS, sidang)

```text
Tujuan: satu alur pendaftaran untuk semua ujian akhir, dengan checklist berkas dan jadwal.

Prasyarat: T01, T03, T04. Baca dulu: Surat.tsx, Herreg.tsx, Keuangan.tsx, src/lib/upload.ts.

LANGKAH:
1. Pilih jenis ujian (dari konfigurasi: PROPOSAL, SEMINAR_HASIL, UAPS, SIDANG). Nama "UAPS" dan aturannya diambil dari konfigurasi hasil T00, bukan dari kode.
2. Kelayakan terlebih dulu: evaluasiKelayakan menampilkan syarat satu per satu (bimbingan minimum, persetujuan pembimbing, administrasi keuangan, SKS/IPK, berkas). Tombol "Daftar" nonaktif sampai semuanya terpenuhi, dengan alasan terlihat.
3. Checklist berkas: setiap berkas punya aturan (tipe, ukuran, wajib/opsional, contoh), status (belum, diunggah, diverifikasi, ditolak dengan alasan), dan unggah dengan progres nyata (upload.ts). Berkas ditolak tampil dengan alasan dan tombol "Unggah ulang".
4. Persetujuan pembimbing sebelum pendaftaran diteruskan ke prodi (status bergerak lewat mesin alur).
5. Penjadwalan: pilihan slot dari prodi (kapasitas, ruang, penguji tersedia) atau permintaan jadwal dengan preferensi; deteksi bentrok mahasiswa dan dosen (bentrok.ts). Hasil jadwal tampil di Pusat Tenggat, .ics, dan notifikasi.
6. Biaya ujian akhir (bila ada) sebagai tagihan di Keuangan; pendaftaran baru diproses setelah lunas (status dari server).
7. Pembatalan dan penjadwalan ulang sebelum batas waktu konfigurasi, dengan konsekuensi yang jelas ditampilkan.
8. Setelah terjadwal: halaman "Persiapan ujian" berisi jadwal, ruang, penguji, daftar yang harus dibawa, tautan draf terakhir yang diserahkan (versi dan hash), dan hitung mundur.

KRITERIA SELESAI: pendaftaran tidak dapat dikirim bila ada syarat belum terpenuhi; berkas ditolak bisa diunggah ulang; slot tidak bentrok; tes untuk semua kombinasi syarat dan transisi status.
```

## T06: Hari ujian, penilaian penguji, berita acara

```text
Tujuan: sisi penguji dan hasil resmi ujian akhir. Layar peran DOSEN adalah DEMO sampai otorisasi server ada.

Prasyarat: T01, T05. Baca dulu: Profil.tsx (pemilih peran demo), src/lib/akademik/nilai.ts.

LANGKAH:
1. Daftar ujian saya (penguji/pembimbing): jadwal, mahasiswa, judul, tautan draf versi terakhir yang diserahkan, dan tombol "Buka lembar penilaian" aktif hanya pada jendela waktu ujian (dari konfigurasi), tidak sebelum atau jauh sesudahnya.
2. Lembar penilaian berdasarkan rubrik konfigurasi: skor per kriteria dengan batas min/maks, catatan per kriteria, rekomendasi (lulus / lulus dengan revisi / tidak lulus). Simpan draf otomatis; kirim bersifat final dan tercatat waktunya. Penguji tidak dapat melihat nilai penguji lain sebelum semua mengirim (diterapkan server; klien menyembunyikan dan mencatat TODO(BFF-AUTHZ)).
3. Perhitungan nilai akhir pratinjau (hitungNilaiPratinjau) hanya untuk dosen berlabel "perkiraan"; nilai resmi dari server. Bila skor antar penguji berbeda lebih dari ambang konfigurasi, tampilkan peringatan untuk rapat kesepakatan.
4. Berita acara: halaman cetak/PDF (pola U03) berisi data ujian, penguji, hasil, dan catatan revisi; tanda tangan elektronik TODO (jangan membuat gambar tanda tangan palsu; beri kolom tanda tangan kosong atau tautan e-sign resmi).
5. Mahasiswa melihat hasil hanya setelah dirilis server: status "Menunggu hasil" sampai saat itu. Catatan revisi dari penguji ditampilkan terstruktur (bagian, permintaan, tenggat) untuk T07.
6. Notifikasi ke mahasiswa saat hasil dirilis; tanpa mengungkap nilai di isi notifikasi (hanya "hasil tersedia").
7. Audit: setiap pengiriman dan perubahan nilai menghasilkan catatan (siapa, kapan, apa) di sisi server, TODO BFF; di demo tampilkan riwayat contoh.

KRITERIA SELESAI: lembar nilai hanya terbuka di jendela waktunya; skor di luar rentang ditolak; mahasiswa tidak melihat hasil sebelum dirilis; tes untuk validasi skor dan perhitungan pratinjau.
```

## T07: Revisi pasca ujian, yudisium, unggah final, administrasi lulus

```text
Tujuan: dari "lulus dengan revisi" sampai selesai administrasi.

Prasyarat: T01, T06. Baca dulu: Surat.tsx, Herreg.tsx, DompetSertifikat.tsx, Pusat Tenggat.

LANGKAH:
1. Daftar revisi dari penguji (T06): tiap butir punya bagian, permintaan, penguji, tenggat, status (belum, dikerjakan, diajukan, disetujui, ditolak). Mahasiswa mengunggah dokumen revisi (versi baru T04) dan menandai butir; penguji menyetujui per butir. Tenggat revisi masuk Pusat Tenggat dengan urgensi, termasuk status "terlambat".
2. Lembar pengesahan: baru dapat dibuat bila semua butir revisi disetujui; berlabel menunggu tanda tangan resmi.
3. Unggah naskah final: validasi (PDF, ukuran, daftar isi lengkap sesuai daftar periksa), hash SHA-256 pada struk, dan pilihan hak akses publikasi repositori (sesuai konfigurasi: terbuka, tertahan N bulan, internal). Jangan memutuskan kebijakan publikasi di kode.
4. Cek kemiripan/plagiasi: antarmuka penyedia layanan (adaptor demo berlabel + TODO untuk layanan resmi kampus). Tampilkan ambang dan hasil dari penyedia, bukan perhitungan buatan sendiri.
5. Checklist administrasi lulus: bebas pustaka, bebas keuangan, bebas laboratorium, penyerahan berkas fisik (bila masih), data yudisium, SKPI. Tiap item punya status dan tautan ke layanan terkait (Keuangan, Surat, Dompet Sertifikat).
6. Yudisium dan pendaftaran wisuda: tampilkan jadwal, syarat, dan status dari server; pendaftaran wisuda terbuka setelah checklist lengkap.
7. Setelah selesai: status SELESAI, ucapan sederhana, dan tautan ke Alumni dan Tracer Study. Tanpa konfeti berlebihan; hormati prefers-reduced-motion.

KRITERIA SELESAI: lembar pengesahan tidak bisa dibuat selama ada revisi terbuka; naskah final menyimpan hash; checklist menolak "selesai" bila ada item belum; tes untuk status revisi dan checklist.
```

## T08: Sisi dosen dan prodi (DEMO sampai ada otorisasi server)

```text
Tujuan: alat untuk dosen pembimbing/penguji dan staf prodi. Seluruh layar berlabel demo; TODO(BFF-AUTHZ) pada setiap akses data.

Prasyarat: T01-T07. Baca dulu: src/data/features.ts (roles), Profil.tsx, App.tsx.

LANGKAH:
1. Dosen: daftar mahasiswa bimbingan beserta status alur, jumlah bimbingan disetujui, tenggat terdekat, dan penanda "perlu perhatian" (jeda lama, revisi menunggu). Aksi cepat: setujui/tolak pengajuan judul, setujui entri bimbingan, setujui revisi.
2. Kuota bimbingan: batas per dosen dari konfigurasi; pengajuan melebihi kuota tidak dapat memilih dosen itu (T03). Dosen dapat membuka/menutup kuota dalam batas aturan.
3. Kalender dosen: bimbingan, ujian (sebagai pembimbing/penguji), dan UTS/UAS (sebagai pengawas) dalam satu garis waktu dengan deteksi bentrok (bentrok.ts) dan ekspor .ics.
4. Prodi/tendik: papan kemajuan angkatan (jumlah di tiap status), daftar menunggu penetapan pembimbing, penjadwalan ujian akhir dengan penguji tersedia, dan ekspor rekap (CSV) tanpa data pribadi yang tidak perlu.
5. Penugasan penguji dengan aturan komposisi dari konfigurasi (mis. penguji tidak boleh pembimbing, jumlah penguji). Pelanggaran ditolak dengan alasan.
6. Statistik agregat ditampilkan tanpa menampilkan nilai individu kepada yang tidak berwenang.
7. Batasi bahasa pada data: label "demo" dan peringatan bahwa peran bisa diganti dari Profil, sehingga layar ini tidak boleh dianggap aman sebelum server menegakkan hak akses.

KRITERIA SELESAI: aturan komposisi penguji dan kuota ditegakkan oleh fungsi murni dengan tes; tidak ada nilai individu pada tampilan agregat; setiap layar peran non-mahasiswa berlabel demo.
```

## T09: Ujian daring (opsional, dengan batas privasi)

```text
Tujuan: dukungan UTS/UAS daring sederhana. Kerjakan hanya jika kampus benar-benar menjalankan ujian daring; jika tidak, lewati.

Prasyarat: T01, T02. Keputusan manusia dulu: bentuk ujian (kuis, esai, unggah jawaban), kebijakan pengawasan, dan dasar hukum/kebijakan privasi kampus.

LANGKAH:
1. Mulai dengan bentuk paling sederhana dan paling sedikit mengintip: ujian unggah jawaban (soal dirilis pada jam mulai, unggahan ditutup pada jam selesai, struk dengan hash dan waktu server). Waktu mulai/selesai ditentukan SERVER; hitung mundur di klien hanya tampilan.
2. Kuis pilihan ganda/esai singkat (opsional): soal diambil per sesi dari server, jawaban disimpan berkala (autosave) dengan pengendalian konflik, pengiriman idempoten (kunci idempotensi) supaya sambungan putus tidak menghilangkan atau menggandakan jawaban, dan toleransi sambungan putus yang ditentukan aturan.
3. Keandalan: uji beban rencana (ribuan peserta serentak) sebagai dokumen rencana + skrip uji, karena keluhan server lambat di jam sibuk pada platform lain adalah risiko nyata.
4. Privasi: JANGAN merekam kamera/layar/mikrofon secara default dan jangan membuat deteksi "kecurangan" otomatis yang menghukum tanpa tinjauan manusia. Bila pengawasan diperlukan, itu keputusan kampus, harus dengan persetujuan jelas, penyimpanan terbatas waktu, dan tinjauan manusia; tulis sebagai dokumen kebijakan, bukan fitur diam-diam.
5. Aksesibilitas dan keadilan: perpanjangan waktu untuk mahasiswa berkebutuhan khusus lewat konfigurasi; layar bisa dibaca pembaca layar; mode koneksi lambat.
6. Hasil nilai tidak ditampilkan di klien sampai dirilis server.

KRITERIA SELESAI: pengiriman idempoten terbukti oleh tes; waktu resmi dari server; tidak ada perekaman perangkat tanpa keputusan kebijakan tertulis.
```

---

## 4. Keputusan yang tetap perlu manusia
1. **Arti dan aturan UAPS**, serta semua aturan akademik (T00). Tanpa ini fitur hanya jalan dengan nilai contoh berlabel.
2. **Otorisasi server untuk peran dosen/penguji/prodi** (BFF + SSO resmi, F01 dan F02 di dokumen perbandingan). Sebelum itu semua layar peran non-mahasiswa hanya demo.
3. **Kebijakan publikasi naskah, plagiasi, dan tanda tangan elektronik** (T06-T07).
4. **Apakah ada ujian daring** (T09).

## 5. Sumber
- Kode repo `DSKPutra/super-unpam` (commit `02e3e7f`): `src/pages/fitur/Ujian.tsx`; pencarian kata kunci skripsi/tugas akhir/UAPS/sidang tidak menemukan hasil.
- Contoh pola sistem skripsi terpadu di kampus lain (hanya judul/ringkasan yang dibaca): https://eprints.ums.ac.id/114443/
