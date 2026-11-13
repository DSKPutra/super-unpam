# Prompt: mengimplementasikan fitur Univers by UNPAM ke Super UNPAM

Disusun 28 Okt 2026. Pelengkap `PROMPT-FITUR-SUPER-UNPAM.md`, `PROMPT-MAILPAM-DRIVEPAM.md`, dan `PERBANDINGAN-UNIVERS-DAN-PERBAIKAN-SUPER-UNPAM.md`.

## 1. Batas yang perlu Anda tahu dulu

1. **Daftar fitur lengkap Univers tidak tersedia publik.** Deskripsi Google Play dan App Store hanya menulis "sistem akademis yang komprehensif". Screenshot di kedua toko tidak punya keterangan. Yang bisa dipastikan hanya yang tertulis di catatan rilis dan ulasan (bagian 2). Karena itu "semua fitur" tidak bisa saya tulis dari luar. **Prompt U00 menutup celah ini**: Anda memasang aplikasinya, memotret layarnya, dan AI menyusun inventaris dari foto itu.
2. **Yang boleh ditiru adalah fungsi, bukan isi.** Fitur dan alur kerja boleh dibuat sendiri. Kode, gambar, ikon, teks, nama, dan logo Univers/UNPAM Mobile tidak boleh disalin. Semua prompt di bawah memuat aturan ini.
3. **Sumber data resmi tetap ditentukan LPTI.** Fitur seperti MyLB, MyLSP, kartu UTS, dan kuesioner mengambil data dari sistem kampus. Tanpa API/SSO resmi (keputusan F01 dan F02 di dokumen perbandingan), hasilnya hanya tampilan dengan data contoh.

## 2. Fitur Univers yang terverifikasi, dan statusnya di Super UNPAM

Sumber: [App Store](https://apps.apple.com/id/app/univers-by-unpam/id6759666942) (v2.0.2, 20 Okt 2026) dan [Google Play](https://play.google.com/store/apps/details?id=com.unpam.univers) (kini bernama "UNPAM Mobile"), dibaca 28 Okt 2026.

| # | Fitur Univers (kutipan catatan rilis) | Status di Super UNPAM (repo v0.4.0) | Prompt |
|---|---|---|---|
| 1 | Cetak **kartu UTS** (v1.0.3 memperbaiki masalah cetak) | Ada Exam Center dengan kartu ber-QR, **belum ada cetak/PDF** | U03 |
| 2 | Halaman **kuesioner** (v1.0.4) | Ada EDOM & Survei | U04 |
| 3 | **Integrasi MyLB** (v2) | Halaman TOEFL ada, data contoh | U05 |
| 4 | **Integrasi MyLSP** (v2) | Halaman Sertifikasi ada, data contoh | U05 |
| 5 | **Widget Gallery**: atur apa yang tampil di dashboard | **Belum ada** (hanya urutan favorit) | U01 |
| 6 | **Berita terbaru dari unpam.ac.id** | Ada berita, tetapi data contoh | U02 |
| 7 | **Onboarding informasi kampus** ("Kenali kampus UNPAM") | Onboarding ada, isinya tentang fitur aplikasi, bukan informasi kampus | U06 |
| 8 | **Mode gelap** | Sudah ada dan lebih lengkap | tidak perlu |
| 9 | "Akses seluruh layanan UNPAM langsung di mobile" | Sebagian: banyak layanan, tetapi belum tersambung | rangkaian U05 dan F01/F02 |

### Keluhan nyata dari ulasan Play Store (bukan dari pengembang)
Dua ulasan menyebut: Univers **tidak bisa dipakai untuk mengumpulkan tugas**, **tidak ada notifikasi tugas atau pencapaian**, dan pengguna ingin **MENTARI masuk ke dalam aplikasi**. Dua ulasan bukan data populasi, tetapi ini bukti pertama yang saya temukan tentang celah Univers, dan cocok dengan keluhan MENTARI di studi ESIT. Prompt U07 menanganinya, dan sebagian sudah dikerjakan oleh patch **Pusat Tenggat** (pengumpulan dengan progres dan struk, ekspor kalender).

## 3. Cara memakai
1. Tempel **P00** dari `PROMPT-FITUR-SUPER-UNPAM.md` di awal sesi, lalu **U-ATURAN** di bawah.
2. Satu prompt per sesi/branch. Urutan: **U00 → U01 → U02 → U03 → U04 → U05 → U06 → U07**.
3. U00 dikerjakan **Anda sendiri** (butuh HP). Hasilnya menambah atau mengubah prompt lain.

## U-ATURAN (tempel bersama setiap prompt)
```text
ATURAN TIRU-FUNGSI: Kamu membuat fitur dengan fungsi setara fitur yang disebut, dari nol. JANGAN menyalin kode, aset, ikon, ilustrasi, teks antarmuka, nama fitur, atau tata letak piksel dari aplikasi lain, termasuk Univers by UNPAM / UNPAM Mobile. Gunakan komponen dan gaya Super UNPAM (src/components/ui.tsx, tokens src/index.css). Jika kamu tidak tahu persis bagaimana fitur asli bekerja, tulis asumsimu di PR dan buat desain yang masuk akal, jangan mengarang klaim tentang aplikasi lain. Data tetap data contoh (DemoNote) sampai ada API resmi; jangan pernah meminta atau menyimpan kata sandi akun kampus. Pertahankan CSP ketat, WCAG AA, target sentuh 44px, prefers-reduced-motion, dan mode .lite.
```

---

## U00: Inventaris fitur Univers dari aplikasi aslinya (dikerjakan manusia + AI)

```text
Tujuan: hasilkan docs/INVENTARIS-UNIVERS.md, BUKAN kode.

LANGKAH MANUSIA (pemilik repo, sebelum menempel prompt ini):
1. Pasang "UNPAM Mobile" (dulu Univers by UNPAM) dari Google Play atau App Store dan masuk dengan akun mahasiswa SENDIRI. Jangan memakai akun orang lain.
2. Buka SETIAP menu, tab, dan sub-halaman. Screenshot semuanya, beri nama berurutan (01-beranda.png, 02-menu-akademik.png, ...). Sensor NIM, nama, nomor VA, dan data pribadi sebelum diunggah.
3. Catat: apa yang terjadi saat Anda menekan tiap tombol, apakah ada notifikasi push, apakah bisa dipakai tanpa internet, dan layar yang gagal/lambat.
4. Letakkan folder screenshot di docs/referensi-univers/ (jangan di-commit ke repo publik; masukkan ke .gitignore).

LANGKAH AI:
1. Baca semua screenshot. Untuk setiap layar tulis: nama layar, fungsi, data yang ditampilkan (jenis, bukan nilai), aksi yang tersedia, dan layar tujuan navigasinya.
2. Bangun tabel: fitur Univers | ada di Super UNPAM? (ya/sebagian/tidak, dengan path file) | selisih | prioritas (tinggi jika dipakai harian oleh mahasiswa).
3. Untuk setiap fitur "sebagian" atau "tidak", tulis prompt implementasi singkat gaya U01-U07 dengan kriteria selesai yang bisa diuji.
4. Daftar pertanyaan terbuka tentang hal yang tidak terlihat dari screenshot (mis. sumber data).
5. Jangan mengutip teks layar secara panjang dan jangan menyalin aset; ringkas fungsinya saja.

JANGAN: menebak fitur yang tidak ada di screenshot; mengunduh atau membongkar APK/IPA (melanggar ketentuan toko dan hak cipta; jalur yang sah adalah pemakaian biasa); menyimpan data pribadi dari screenshot.

KRITERIA SELESAI: setiap screenshot terhubung ke satu baris tabel; ada daftar fitur yang belum dimiliki Super UNPAM; ada pertanyaan terbuka.
```

## U01: Widget Gallery (dashboard yang bisa diatur)

```text
Tujuan: pengguna memilih, mengurutkan, dan menyembunyikan "widget" di Beranda. Fungsi setara fitur "Widget Gallery"; rancang sendiri tampilannya.

Baca dulu: src/pages/Home.tsx, src/lib/prefs.ts, src/data/features.ts, src/components/ui.tsx, src/lib/i18n.ts.

RANCANGAN:
1. Pecah blok Home.tsx menjadi widget terpisah di src/pages/widgets/: JadwalHariIni, TugasTerdekat (pakai buildTimeline dari src/lib/tenggat.ts jika patch Pusat Tenggat sudah diterapkan), TagihanAktif, IPK (data dari satu sumber, bukan angka literal), Event, Berita, PintasanFavorit, Cuaca/WaktuSholat (opsional, ambil dari fitur Islami).
2. Registri widget src/pages/widgets/registry.ts: {id, judul, ikon, roles, ukuran: 'kecil'|'lebar', komponen}. Widget hanya muncul jika peran pengguna termasuk roles.
3. Tata letak disimpan dengan usePref('home.widgets', {order: string[], hidden: string[]}), dengan nilai awal sama dengan Beranda sekarang supaya pengguna lama tidak melihat perubahan. Validasi hasil baca (id tidak dikenal dibuang, widget baru ditambahkan di akhir).
4. Mode ubah: tombol "Atur Beranda" membuka halaman Galeri: daftar semua widget dengan pratinjau kecil, sakelar tampil/sembunyi, dan pengurutan. WAJIB bisa dioperasikan tanpa drag-and-drop: tombol Naik/Turun yang dapat diakses keyboard dan pembaca layar, dengan pengumuman aria-live ("Jadwal dipindah ke posisi 2"). Drag-and-drop boleh sebagai tambahan.
5. Tombol "Kembalikan bawaan".
6. Mode .lite: tanpa animasi pratinjau.

KRITERIA SELESAI: tes unit untuk fungsi normalisasi tata letak (id hilang, id baru, duplikat, urutan kosong); layout default identik dengan Beranda sebelum perubahan; tidak ada angka literal baru; semua kontrol punya nama aksesibel; tsc strict lulus.
```

## U02: Berita dari situs resmi unpam.ac.id

```text
Tujuan: ganti berita contoh dengan berita dari unpam.ac.id, tanpa melonggarkan CSP di browser.

Baca dulu: vercel.json (connect-src 'self'), src/data/demo.ts (news), src/pages/Home.tsx, DISTRIBUSI.md.

LANGKAH:
1. Browser TIDAK boleh memanggil unpam.ac.id langsung (CSP connect-src 'self' dan CORS). Buat Vercel Function api/berita.ts yang mengambil sumber berita resmi di sisi server. Periksa dulu apakah unpam.ac.id menyediakan RSS/Atom atau WordPress REST API (/wp-json/wp/v2/posts); pakai yang tersedia. Jika tidak ada yang terbuka untuk umum, berhenti dan laporkan; jangan scraping agresif.
2. Hormati robots.txt dan ketentuan situs. Beri User-Agent yang jelas, cache 15 menit (s-maxage + stale-while-revalidate), batas 10 butir per respons, timeout 5 detik.
3. Normalisasi: {id, judul, ringkasan (bersihkan HTML dengan daftar elemen yang diizinkan, tanpa script/iframe), tanggal ISO, url sumber, gambar (opsional)}. Gambar TIDAK dimuat langsung dari domain luar karena img-src 'self'; proksikan lewat api/berita-gambar dengan batasan ukuran dan tipe, atau tampilkan tanpa gambar.
4. Klien: hook useBerita() dengan status memuat/galat/kosong yang jujur. Saat galat, tampilkan berita terakhir yang tersimpan dengan label "Terakhir diperbarui <waktu>" (cache Service Worker NetworkFirst untuk /api/berita), jangan pernah menampilkan berita contoh seolah nyata.
5. Setiap berita menampilkan sumber dan tautan "Buka di unpam.ac.id". Jangan menyalin isi artikel penuh; tampilkan judul, ringkasan, dan tautan.
6. Tes: normalisasi dan pembersihan HTML dengan masukan jahat (script, onerror, javascript:), batas ukuran, dan format tanggal.

KRITERIA SELESAI: tidak ada fetch lintas-origin di klien; CSP tidak berubah; saat sumber mati halaman tetap tampil dengan label usang; tes pembersihan HTML lulus.
```

## U03: Cetak kartu ujian (UTS/UAS) sebagai PDF

```text
Tujuan: dari Exam Center, pengguna bisa menyimpan atau mencetak kartu ujian dengan rapi.

Baca dulu: src/pages/fitur/Ujian.tsx, src/pages/Ktm.tsx (pola QR), src/index.css.

LANGKAH:
1. Tambah tombol "Cetak / Simpan PDF" pada kartu ujian. Gunakan CSS @media print (halaman A5 atau A4 setengah) dan window.print(); tidak perlu pustaka PDF. Sembunyikan navigasi saat cetak, paksa warna terang dan kontras tinggi, QR hitam di atas putih.
2. Isi kartu: nama, NIM, prodi, jenis ujian (UTS/UAS), daftar mata kuliah dengan tanggal, jam, ruang, dan kursi, status syarat (kehadiran, administrasi keuangan) per mata kuliah, QR verifikasi, dan waktu cetak. Mata kuliah yang syaratnya belum terpenuhi tampil dengan alasan yang jelas dan tautan penyelesaiannya (mis. ke Keuangan), bukan kartu kosong.
3. QR hanya berisi ID kartu; verifikasi dilakukan server (TODO BFF dengan komentar jelas). Jangan menaruh data pribadi di QR.
4. Uji tampilan cetak: render halaman dengan emulasi media print (Playwright, page.emulateMedia({media:'print'}) lalu page.pdf()) dan periksa bahwa PDF 1-2 halaman, QR terbaca, dan tidak ada elemen navigasi. Simpan hasil uji sebagai langkah CI opsional.
5. Fallback untuk perangkat yang tidak mendukung print (WebView tertentu): tombol "Bagikan sebagai gambar" memakai canvas.toBlob dan navigator.share jika ada.

KRITERIA SELESAI: PDF dari emulasi print benar; syarat belum terpenuhi ditampilkan jujur; QR tanpa data pribadi; kontrol dapat diakses keyboard.
```

## U04: Kuesioner (EDOM dan survei lain) yang tangguh

```text
Tujuan: kuesioner yang nyaman di HP, aman bagi data pengisi, dan tidak hilang jawaban saat koneksi putus.

Baca dulu: src/pages/fitur/Edom.tsx.

LANGKAH:
1. Satu mesin kuesioner generik src/lib/kuesioner.ts: definisi {id, judul, pertanyaan[{id, tipe: 'skala'|'pilihan'|'teks', wajib, opsi}], tenggat}, validasi (wajib, rentang), dan fungsi hitung kemajuan. Tes unit.
2. Draf jawaban disimpan lokal (usePref atau IndexedDB) supaya tidak hilang saat tab tertutup; hapus draf setelah terkirim. Jangan menyimpan teks bebas di localStorage jika berisi data sensitif; pakai sessionStorage atau memori untuk kuesioner anonim.
3. Navigasi satu pertanyaan per layar dengan penunjuk kemajuan, tombol Kembali, dan ringkasan sebelum kirim. Mode gelap dan terang diuji (kasus dari catatan rilis Univers: halaman kuesioner pernah bermasalah di mode gelap; tulis uji kontras otomatis untuk kedua tema).
4. Kirim lewat transport yang dapat diganti (pola src/lib/upload.ts): mode 'demo' berlabel jelas; kegagalan jaringan menjaga draf dan menawarkan "Coba lagi".
5. Anonimitas: untuk kuesioner anonim (EDOM dosen), jangan kirim NIM bersama jawaban; gunakan token sekali pakai dari server (TODO BFF). Tulis ini di layar sebelum mengisi.
6. Daftar kuesioner dengan penanda tenggat, terhubung ke Pusat Tenggat sebagai jenis baru 'kuesioner'.

KRITERIA SELESAI: tes validasi dan kemajuan lulus; draf bertahan setelah muat ulang; kontras AA di kedua tema; tidak ada NIM terkirim bersama jawaban anonim.
```

## U05: MyLB (TOEFL) dan MyLSP (sertifikasi) sebagai konektor

```text
Tujuan: halaman TOEFL dan Sertifikasi memakai antarmuka sumber data yang dapat diganti, sehingga saat API resmi LPTI tersedia cukup menukar implementasi.

Prasyarat: keputusan F01 (hubungan dengan LPTI) dan F02 (login aman). Tanpa itu, kerjakan hanya antarmuka dan adaptor contoh, dan tulis jelas di UI bahwa datanya contoh.

Baca dulu: halaman TOEFL dan Sertifikasi di src/pages/Layanan.tsx, src/data/demo.ts, src/lib/types.ts.

LANGKAH:
1. Definisikan tipe domain di src/lib/types.ts: JadwalTes, PendaftaranTes, HasilTes (skor, tanggal, masa berlaku), SkemaSertifikasi, UjianKompetensi, SertifikatKompetensi.
2. Antarmuka repositori src/lib/sumber/{toefl,sertifikasi}.ts dengan metode async (daftarJadwal, daftar, hasil) dan dua implementasi: demo (data contoh, dilabeli) dan http (memanggil /api/toefl/*, /api/sertifikasi/* milik BFF, TODO). Pemilihan implementasi lewat satu konfigurasi, bukan if tersebar.
3. Status koneksi yang jujur: "Terhubung ke MyLB" hanya jika respons asli diterima; selain itu "Data contoh" atau "Tidak dapat terhubung" dengan tombol coba lagi.
4. TOEFL: jadwal tes dengan kuota, pendaftaran, tagihan terkait (tautan ke Keuangan), hasil beserta masa berlaku dan pengingat sebelum kedaluwarsa (masuk Pusat Tenggat).
5. Sertifikasi: skema yang tersedia sesuai prodi, pendaftaran uji kompetensi, status asesmen, sertifikat terbit (tautan ke Dompet Sertifikat).
6. Jangan menyimpan kredensial MyLB/MyLSP; sambungan hanya lewat BFF dengan sesi pengguna.
7. Tes: adaptor demo mengembalikan bentuk sesuai tipe; komponen menampilkan keadaan memuat/galat/kosong.

KRITERIA SELESAI: halaman bekerja dengan adaptor demo; mengganti ke http tidak mengubah komponen; label sumber data selalu benar.
```

## U06: Onboarding informasi kampus

```text
Tujuan: onboarding yang mengenalkan kampus (bukan hanya aplikasi): sejarah singkat, fakultas dan prodi, lokasi kampus, layanan penting, dan kontak resmi.

Baca dulu: src/components/Onboarding.tsx, src/pages/Layanan.tsx, README.md.

LANGKAH:
1. Data konten di src/data/kampus.ts, TERPISAH dari komponen, berisi: daftar kampus/lokasi (nama, alamat, koordinat), fakultas dan prodi, layanan utama dan jam layanan, kontak resmi. Setiap butir memuat sumber dan tanggal verifikasi. Tandai dengan TODO setiap butir yang belum diverifikasi manusia dari sumber resmi; JANGAN mengarang alamat, koordinat, nomor telepon, atau angka sejarah.
2. Onboarding bertahap (maksimal 5 layar, bisa dilewati, bisa dibuka lagi dari Profil > "Kenali Kampus"), satu pesan per layar, dapat dioperasikan keyboard, dan menghormati prefers-reduced-motion.
3. Peta atau daftar lokasi tanpa pihak ketiga: tautan "Buka di aplikasi peta" memakai skema geo:/maps bawaan, bukan embed (CSP frame-src 'none').
4. Terjemahan ID/EN lewat src/lib/i18n.ts untuk semua teks baru.
5. Halaman "Kenali Kampus" permanen memakai data yang sama.

KRITERIA SELESAI: tidak ada fakta kampus tanpa sumber atau tanda TODO; onboarding bisa dilewati dan dibuka ulang; i18n lengkap.
```

## U07: Celah yang disebut ulasan: kumpul tugas dan notifikasi

```text
Tujuan: tutup dua keluhan dari ulasan pengguna aplikasi sejenis: tidak bisa mengumpulkan tugas, dan tidak ada notifikasi tugas/pencapaian.

Prasyarat: patch "Pusat Tenggat" sudah diterapkan (src/lib/tenggat.ts, src/lib/upload.ts, src/pages/fitur/Tenggat.tsx). Jika belum, terapkan dulu dengan git apply.

LANGKAH:
1. Pengumpulan sungguhan: implementasikan Vercel Function untuk unggah (presigned URL ke penyimpanan objek, batas 20 MB, daftar ekstensi dan pemeriksaan tipe isi di server, bukan hanya nama berkas, pemindai virus jika tersedia) dan sambungkan xhrTransport(url) di src/lib/upload.ts. Server mengembalikan x-receipt-id. Jika MENTARI tidak menyediakan API, jangan mengaku mengirim ke MENTARI: simpan di DrivePAM (lihat PROMPT-MAILPAM-DRIVEPAM.md) dan tampilkan tautan serta petunjuk jujur bahwa berkas harus tetap diunggah ke MENTARI sampai ada integrasi resmi.
2. Notifikasi: Web Push (VAPID) lewat Service Worker vite-plugin-pwa (strategi injectManifest), izin diminta SETELAH pengguna menekan "Aktifkan pengingat" (bukan saat membuka aplikasi), preferensi per jenis (tugas, tagihan, event, nilai), jam tenang, dan batas frekuensi. Pengingat tenggat dijadwalkan server (cron) dari data yang sama dengan buildTimeline.
3. "Pencapaian": peristiwa yang diberi notifikasi harus berasal dari data nyata (nilai terbit, sertifikat terbit, tagihan lunas), bukan dihitung di klien.
4. Lonceng di TopBar menampilkan jumlah belum-dibaca dari sumber yang sama, bukan angka tetap "3".
5. iOS: Web Push hanya berfungsi jika aplikasi dipasang ke layar utama (PWA); tampilkan petunjuk ini apa adanya. Sediakan .ics sebagai cadangan untuk semua perangkat (sudah ada).
6. Tes: penjadwalan pengingat (fungsi murni: dari daftar tenggat dan preferensi menghasilkan daftar notifikasi beserta waktunya, termasuk jam tenang dan duplikat).

KRITERIA SELESAI: berkas benar-benar sampai ke penyimpanan dan struk memuat hash yang cocok dengan berkas; notifikasi hanya muncul setelah izin dan sesuai preferensi; lonceng sesuai data; tidak ada klaim "terkirim ke MENTARI" tanpa integrasi resmi.
```

---

## 4. Yang tetap perlu keputusan manusia
1. **Izin resmi dari LPTI** untuk API/SSO dan penggunaan nama atau logo (F01).
2. **Sumber berita resmi** dan ketentuan pemakaian konten unpam.ac.id.
3. **Fakta kampus** (alamat, koordinat, kontak) untuk U06: dari sumber resmi.
4. **Hasil U00**: inventaris dari aplikasi asli menentukan apakah masih ada fitur Univers yang belum tercakup.

## 5. Sumber
- Univers by UNPAM di App Store (v2.0.2): https://apps.apple.com/id/app/univers-by-unpam/id6759666942
- Univers by UNPAM / UNPAM Mobile di Google Play: https://play.google.com/store/apps/details?id=com.unpam.univers
- Studi pengalaman mahasiswa memakai MENTARI (ESIT, Nov 2025): https://openjournal.unpam.ac.id/index.php/ESIT/article/view/55990
