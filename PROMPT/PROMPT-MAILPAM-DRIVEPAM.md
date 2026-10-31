# Prompt: MailPAM (email mahasiswa) dan DrivePAM (cloud storage)

Disusun 28 Okt 2026. Pelengkap `PROMPT-FITUR-SUPER-UNPAM.md` (prompt P00 sampai P23). Pakai **P00 (konteks master)** dari dokumen itu lebih dulu; semua prompt di bawah mengandalkannya.

## 1. Baca ini dulu

**Dua fitur ini berbeda sifatnya dari fitur lain.** Fitur sebelumnya adalah tampilan dan alur di atas sistem kampus yang sudah ada. Email dan penyimpanan file adalah **infrastruktur** yang menyimpan data pribadi dan berisiko disalahgunakan (spam, phishing, file ilegal, malware). Karena itu urutannya: putuskan arsitektur dulu, baru bangun UI.

**Yang saya verifikasi:**
- Kuota Google Workspace for Education: Fundamentals dan Standard mendapat **100 TB gabungan untuk seluruh organisasi** (bukan per pengguna); Drive, Gmail, dan Foto berbagi kuota yang sama; batas per pengguna diatur per OU atau grup; akun yang ditangguhkan tetap memakai kuota; saat kuota penuh Gmail tetap bisa menerima dan mengirim, tetapi Drive tidak bisa mengunggah. Sumber: panduan penyimpanan Google Workspace for Education dan halaman batas penyimpanan Google (kutipan di bagian akhir).

**Yang tidak bisa saya verifikasi:**
- **Apakah UNPAM sudah punya email mahasiswa** (misalnya Google Workspace atau Microsoft 365 di domain `unpam.ac.id`) tidak ditemukan di sumber publik. Ini menentukan segalanya, jadi prompt **PAM-00** memintanya diperiksa lebih dulu. Mohon cek ke LPTI sebelum menjalankan prompt lain.
- Kelayakan UNPAM untuk program edukasi gratis Google/Microsoft, angka batas lampiran dan batas kirim harian Gmail (halaman terkait terpotong saat dibaca), dan biaya vendor. Semua ditandai "perlu verifikasi" di prompt, tanpa angka karangan.
- Hal teknis dari pengetahuan umum yang ditandai "verifikasi": batas ukuran body Vercel Functions (±4,5 MB), aturan verifikasi scope Gmail API untuk aplikasi internal.

## 2. Keputusan arsitektur (urutan rekomendasi)

### MailPAM
| Opsi | Isi | Kelebihan | Risiko |
|---|---|---|---|
| **A. Integrasi ke Google Workspace for Education atau Microsoft 365 Education** (disarankan) | Akun `@domain` mahasiswa dikelola di platform itu; MailPAM = antarmuka ringkas di Super UNPAM lewat API (Gmail API / Microsoft Graph) + penyediaan akun otomatis | Pengiriman, spam, dan keamanan sudah diurus vendor; tidak perlu menjalankan server email | Ketergantungan vendor; scope API sensitif; kuota dibagi bersama (lihat bagian 1); kebijakan data lintas negara |
| **B. Server email milik sendiri** (Stalwart, Mailcow, dll.) | Super UNPAM menjadi klien web untuk server IMAP/SMTP kampus | Data di bawah kendali kampus | Beban operasi besar: reputasi IP dan pengiriman (SPF/DKIM/DMARC), anti-spam, anti-virus, cadangan, tanggung jawab penyalahgunaan. Hanya jika ada tim infrastruktur yang siap 24/7 |
| **C. Hanya alias dan penerusan** | Mahasiswa mendapat alamat resmi `nim@...` yang meneruskan ke email pribadi | Paling murah dan cepat | Bukan kotak surat sungguhan; risiko kebocoran ke penyedia pribadi |

### DrivePAM
| Opsi | Isi | Kelebihan | Risiko |
|---|---|---|---|
| **A. Penyimpanan objek S3-compatible** (Cloudflare R2, MinIO, AWS S3, atau penyedia lokal) dengan BFF sebagai pengatur izin (disarankan jika kampus butuh data di bawah kontrolnya) | File di bucket privat; unggah/unduh lewat URL bertanda tangan berumur pendek; metadata di database | Biaya dan lokasi data terkontrol; terintegrasi dengan Surat, Dompet Sertifikat, dan MENTARI | Harus membangun pemindai malware, kuota, pembagian, dan moderasi sendiri |
| **B. Antarmuka di atas Google Drive atau OneDrive** (bila MailPAM memakai opsi A) | DrivePAM = tampilan ringkas atas Drive API | Tidak membangun penyimpanan; Docs/Sheets sudah ada | Kuota gabungan 100 TB untuk seluruh kampus (Fundamentals); alumni dan akun ditangguhkan tetap makan kuota |
| **C. Tunda dan pakai tautan** | Mahasiswa menempel tautan Drive pribadi | Tanpa pembangunan | Tidak ada kontrol dan tidak ada arsip kampus |

**Kombinasi yang paling masuk akal:** MailPAM opsi A + DrivePAM opsi B bila UNPAM sudah/akan memakai Google Workspace atau Microsoft 365; jika tidak, DrivePAM opsi A dengan MailPAM opsi C dulu. Prompt dibuat netral terhadap pilihan: **PAM-00 menghasilkan keputusan**, prompt berikutnya diberi cabang per opsi.

**Hal yang mengikat semua opsi (CSP):** `vercel.json` kini hanya mengizinkan `connect-src 'self'` dan `img-src 'self' data: blob:`. Unggah langsung ke penyimpanan objek, pratinjau gambar dari domain penyimpanan, dan HTML email semuanya menekan batas ini. Tiap prompt di bawah meminta perubahan CSP **seminimal mungkin, per domain, tanpa wildcard**, dan menyebut alasannya.

## 3. Urutan pengerjaan

1. **PAM-00** keputusan arsitektur dan prasyarat (dokumen, tanpa kode fitur)
2. Prasyarat dari dokumen sebelumnya: **P01** (BFF dan sesi) dan **P03** (passkey, kunci aplikasi). Email dan file adalah target pencurian akun; jangan rilis tanpa keduanya.
3. **M1 → M2 → M3 → M4**, lalu **D1 → D2 → D3 → D4 → D5**; **M5 dan D6** setelah keduanya berjalan. MailPAM dan DrivePAM boleh dikerjakan paralel di branch berbeda setelah PAM-00.
4. **P02** (push dan inbox) memperkaya M5 tetapi tidak wajib.

---

## PAM-00: Keputusan arsitektur dan prasyarat (kerjakan pertama, tanpa kode fitur)

```text
Tujuan: hasilkan dokumen keputusan, BUKAN kode fitur. Dua fitur baru direncanakan di Super UNPAM: MailPAM (email untuk mahasiswa) dan DrivePAM (cloud storage). Keduanya menyimpan data pribadi dan berisiko disalahgunakan, jadi keputusan arsitektur harus ada sebelum implementasi.

Pelajari dulu: README.md, DESIGN.md, vercel.json, src/data/features.ts, src/lib/auth.ts, src/App.tsx.

TULIS docs/MAILPAM-DRIVEPAM-KEPUTUSAN.md berisi:
1. Daftar pertanyaan yang HARUS dijawab manusia (LPTI/pimpinan/hukum) sebelum lanjut, dengan kolom jawaban kosong. Minimal:
   a. Apakah UNPAM sudah punya email mahasiswa/dosen di domain kampus? Platform apa (Google Workspace, Microsoft 365, server sendiri, belum ada)? Siapa admin-nya?
   b. Domain dan pola alamat yang dipakai atau diinginkan (jangan mengarang; contoh polanya boleh diberi tanda "contoh").
   c. Siapa yang berhak punya akun: mahasiswa aktif, dosen, tendik, alumni? Berapa lama akun alumni dipertahankan? Apa yang terjadi saat mahasiswa cuti, dikeluarkan, atau lulus?
   d. Perkiraan jumlah pengguna dan kuota per peran yang diinginkan (mahasiswa, dosen, tendik, alumni).
   e. Kebijakan penyimpanan data: lokasi data yang diizinkan, retensi, akses oleh kampus terhadap kotak surat/file, dan penanganan permintaan dari aparat atau sengketa.
   f. Kebijakan penggunaan yang dapat diterima (spam, phishing, konten ilegal, hak cipta) dan siapa yang memoderasi serta menangani laporan.
   g. Anggaran dan penyedia yang boleh dipakai.
2. Perbandingan opsi (tabel) untuk MailPAM dan DrivePAM seperti di bagian "Keputusan arsitektur" dokumen ini: tiap opsi dengan kebutuhan teknis, risiko, estimasi pekerjaan (hari-orang, tulis rentang dan asumsinya), dan yang TIDAK bisa kamu pastikan. Jangan mengarang harga vendor; tulis "perlu penawaran".
3. Rekomendasi dengan alasan dan syarat kapan rekomendasi berubah.
4. Model ancaman ringkas: pengambilalihan akun, phishing dari akun mahasiswa ke sesama mahasiswa, malware lewat unggahan, XSS lewat HTML email atau nama file, kebocoran lewat tautan berbagi, penyalahgunaan sebagai hosting file ilegal, dan penghapusan data oleh pengguna jahat. Untuk tiap ancaman: mitigasi yang direncanakan di prompt M/D yang mana.
5. Perubahan CSP yang akan dibutuhkan per opsi (direktif, domain persis, alasan). JANGAN mengubah vercel.json di tahap ini.
6. Daftar yang harus disiapkan manusia: DNS (SPF, DKIM, DMARC bila email dikelola sendiri), akun layanan/kunci API (hanya di environment server), kebijakan privasi dan syarat penggunaan baru, kontak laporan penyalahgunaan.

JANGAN: membuat akun nyata, memasang kunci API, memilih vendor, atau menulis kode fitur. Jika ada jawaban yang belum tersedia, tulis sebagai pertanyaan terbuka dan berhenti di situ.

KRITERIA SELESAI: dokumen memuat semua bagian di atas, pertanyaan terbuka terdaftar jelas, dan tidak ada angka biaya/kuota yang tidak bersumber.
```

---

# MAILPAM

## M1: Fondasi identitas dan penyediaan akun

```text
Prasyarat: PAM-00 selesai dan keputusan opsi MailPAM sudah ditulis di docs/MAILPAM-DRIVEPAM-KEPUTUSAN.md; P01 (BFF) tersedia. Baca dokumen keputusan itu dulu dan ikuti opsi yang dipilih. Jika belum ada keputusan, berhenti dan minta.

Tujuan: setiap pengguna yang berhak punya alamat email kampus yang konsisten dan dikelola otomatis dari data induk (SSO/akademik), tanpa langkah manual admin per orang.

FITUR:
1. Model identitas: alamat utama + alias, status akun (Aktif, Ditangguhkan, Alumni, Diarsipkan, Dihapus), peran, tanggal dibuat/berakhir. Pola alamat dibaca dari konfigurasi; JANGAN mengodekan keras domain atau pola.
2. Penyediaan otomatis (provisioning) lewat BFF: saat mahasiswa baru terdaftar → buat akun; saat status berubah (cuti, lulus, DO) → ubah status sesuai kebijakan di dokumen keputusan; semua langkah idempotent, dapat diulang, dan dicatat (audit log). Gunakan konektor dengan antarmuka yang sama seperti P01: implementasi `mock` dan implementasi nyata sesuai opsi (Google Admin SDK Directory API, Microsoft Graph, atau API server email). Kredensial layanan hanya di environment variable server, dengan hak akses seminimal mungkin (service account dengan cakupan terbatas, bukan akun super-admin pribadi).
3. Kata sandi awal: JANGAN membuat atau menampilkan kata sandi awal yang bisa ditebak (mis. NIM atau tanggal lahir). Gunakan tautan penyetelan satu kali berumur pendek yang dikirim ke kanal terverifikasi, atau penyediaan lewat SSO sehingga tidak ada kata sandi terpisah. Wajibkan verifikasi dua langkah bila platform mendukung.
4. Layar di Profil > "Akun email": alamat, status, kuota terpakai, alias, tanggal berakhir untuk alumni, dan tombol "Atur ulang akses".
5. Pemulihan akun: alur pemulihan lewat verifikasi identitas kampus (bukan hanya email pribadi), dengan pembatasan laju dan notifikasi ke pengguna.

PENTING:
- Nama dan NIM adalah data pribadi; jangan masukkan ke URL atau log aplikasi.
- Jangan membuat akun nyata saat pengujian; semua uji memakai konektor mock dan domain uji yang jelas.
- Rencana akhir masa akun (kelulusan, alumni, penghapusan) harus mengikuti kebijakan yang ditulis manusia; implementasikan sebagai konfigurasi dengan nilai kosong bertanda TODO, bukan angka karangan.

KRITERIA SELESAI: siklus buat → ubah status → arsip berjalan dengan konektor mock dan terekam di audit log; tidak ada kredensial di klien atau repo; tes unit untuk aturan transisi status.
```

## M2: Antarmuka kotak surat

```text
Prasyarat: M1; P01; sebaiknya P03.

Tujuan: fitur 'mailpam' (rute 'mail', roles MAHASISWA, DOSEN, TENDIK, ALUMNI, ikon Mail) yang nyaman dipakai di HP dan desktop, dengan chunk terpisah dan tanpa menaikkan bundel awal.

CABANG PER OPSI (ikuti yang sudah diputuskan):
- Opsi A (Gmail API/Microsoft Graph): semua panggilan lewat BFF; token OAuth disimpan terenkripsi di server, TIDAK PERNAH dikirim ke klien. Gunakan cakupan (scope) paling sempit yang cukup. Tulis catatan apakah scope yang dipilih memerlukan proses verifikasi/penilaian keamanan dari penyedia (untuk aplikasi internal di domain sendiri biasanya berbeda dengan aplikasi publik; verifikasi kebijakan terkini penyedia dan tulis hasilnya di dokumen).
- Opsi B (IMAP/SMTP milik sendiri): BFF menjadi satu-satunya yang berbicara IMAP/SMTP; klien hanya memakai JSON.
- Opsi C (alias): tampilkan hanya manajemen alias dan tujuan penerusan; lewati antarmuka kotak surat.

FITUR (opsi A/B):
1. Daftar surat dengan folder (Masuk, Terkirim, Draf, Sampah, Spam, Arsip) dan label sederhana; penomoran halaman/infinite scroll; tandai baca/bintang; pilih banyak untuk arsip/hapus.
2. Baca surat: utas percakapan, lampiran, tombol Balas/Balas semua/Teruskan. Tampilan surat HTML mengikuti aturan keamanan M3.
3. Tulis surat: penerima dengan saran dari direktori kampus (P17 bila sudah ada), penyimpanan draf otomatis di server (bukan localStorage), lampiran dengan batas ukuran dari konfigurasi dan pesan jelas bila melebihi batas; lampiran besar ditawarkan sebagai tautan DrivePAM (lihat M5).
4. Pencarian: dasar (pengirim, subjek, isi) dengan penundaan input; filter belum dibaca/ada lampiran.
5. Notifikasi surat baru lewat inbox P02 bila tersedia (hanya pengirim dan subjek singkat; isi surat TIDAK dimasukkan ke notifikasi push).
6. Aksesibilitas: navigasi keyboard, label ARIA untuk daftar dan aksi, tap target ≥ 44px, mode gelap/terang dari token yang ada, mode hemat efek.
7. Tanda tangan surat dan balasan otomatis (cuti/di luar kantor) untuk DOSEN dan TENDIK.

JANGAN: menyimpan isi surat, lampiran, atau token di localStorage/IndexedDB; membuat cache offline untuk isi surat (risiko kebocoran di perangkat bersama); menampilkan isi surat di URL.

KRITERIA SELESAI: alur daftar → baca → balas → kirim → arsip/hapus berjalan dengan konektor mock; build lolos dan chunk fitur ini dilaporkan; uji dengan 2.000 surat contoh agar daftar tetap lancar (virtual list bila perlu, sebutkan ukuran dependency).
```

## M3: Keamanan isi surat (wajib sebelum rilis)

```text
Prasyarat: M2. Kerjakan SEBELUM fitur ini dibuka ke pengguna. Ini bagian terpenting MailPAM.

Tujuan: membuat email aman ditampilkan di dalam Super UNPAM, mengingat CSP ketat di vercel.json dan akun mahasiswa menjadi target phishing.

FITUR:
1. Render HTML email: sanitasi di SISI SERVER (BFF) dengan allowlist tag dan atribut yang ketat (hapus script, form, iframe, object, event handler, atribut style berbahaya, URL javascript:/data: berisiko). Gunakan pustaka sanitasi yang terawat dan sebutkan ukurannya. Tampilkan hasil dalam komponen yang mengisolasi gaya; JANGAN memakai dangerouslySetInnerHTML pada HTML mentah. Jika isolasi dengan iframe sandbox dianggap perlu, usulkan perubahan frame-src ke origin spesifik dan jelaskan risikonya; jangan mengubah vercel.json tanpa persetujuan.
2. Gambar jarak jauh diblokir secara bawaan (mencegah pelacakan dan pengungkapan alamat IP). Tombol "Tampilkan gambar" per surat/per pengirim tepercaya; bila dimuat, lewat proxy gambar di BFF (cek tipe, ukuran, batas waktu, dan blokir alamat internal untuk mencegah SSRF), karena CSP img-src hanya 'self' data: blob:.
3. Tautan: tampilkan tujuan sebenarnya; peringatan sebelum membuka tautan ke domain yang berbeda dari teks tautan atau domain yang menyerupai domain kampus (homoglif); buka dengan rel="noopener noreferrer".
4. Lampiran: pindai malware di server sebelum tersedia (ClamAV atau layanan pindai lain; sebutkan opsi), blokir tipe berbahaya (executable, skrip, .scr, .jar, dll.) dan arsip terenkripsi yang tidak bisa dipindai, unduh selalu dengan Content-Disposition: attachment dan tipe MIME yang tegas (X-Content-Type-Options: nosniff). Pratinjau hanya untuk tipe aman (gambar, PDF) dan disajikan dari origin lain bila memungkinkan.
5. Indikator keaslian: tampilkan hasil SPF/DKIM/DMARC dari header; spanduk peringatan untuk pengirim eksternal yang memakai nama tampilan menyerupai pejabat kampus ("Rektor", "BAAK", "Keuangan") dari luar domain.
6. Laporkan phishing/spam: tombol di tiap surat yang mengirim laporan ke tim keamanan dan, sesuai opsi, ke penyedia.
7. Pembatasan keluar: batas kirim per pengguna per jam/hari dan per jumlah penerima (angka dari konfigurasi), deteksi lonjakan pengiriman dari akun mahasiswa (tanda akun diretas), dan penangguhan otomatis dengan pemberitahuan ke tim keamanan.

PENGUJIAN (wajib): sediakan daftar uji dengan payload XSS umum di HTML email, nama file, subjek, dan nama pengirim; gambar pelacak; tautan homoglif; lampiran berbahaya (gunakan berkas uji EICAR, bukan malware sungguhan); upaya SSRF lewat URL gambar. Tulis hasilnya di docs/MAILPAM-UJI-KEAMANAN.md.

JANGAN: melonggarkan CSP untuk memuat gambar atau skrip pihak ketiga; membuat fitur "pratinjau tautan" yang mengambil URL dari sisi klien.

KRITERIA SELESAI: semua uji di atas lulus; tidak ada eksekusi skrip dari konten surat; build lolos; tidak ada perubahan CSP selain yang disetujui dan tertulis.
```

## M4: Administrasi, kebijakan, dan siklus hidup akun

```text
Prasyarat: M1, M3.

Tujuan: alat untuk tim LPTI dan penegakan kebijakan, bukan hanya fitur untuk pengguna.

FITUR (rute 'mail-admin', hanya peran admin yang ditetapkan di BFF; bukan peran akun biasa):
1. Daftar akun dengan filter status/peran/prodi/angkatan; detail akun (tanpa isi surat); aksi: tangguhkan, aktifkan, reset akses, ubah kuota, tambah alias. Tiap aksi meminta alasan dan tercatat di audit log yang tidak bisa diubah admin.
2. Antrean laporan penyalahgunaan dan phishing dari M3, dengan status penanganan dan tindakan standar.
3. Akses administratif ke isi kotak surat HANYA lewat prosedur khusus: permintaan tertulis dengan alasan, persetujuan dua orang (four-eyes), batas waktu akses, dan pemberitahuan sesuai kebijakan hukum yang ditetapkan. Jika kebijakan belum ada, JANGAN implementasikan akses isi surat; tulis di dokumen keputusan sebagai pertanyaan terbuka.
4. Siklus hidup: tugas terjadwal di server untuk kelulusan → status Alumni dengan batas waktu; peringatan ke pengguna H-90/H-30/H-7 sebelum akun berakhir dengan tautan ekspor data (Google Takeout/ekspor Drive sesuai opsi, atau ekspor sendiri); penangguhan; penghapusan setelah masa tenggang sesuai kebijakan. Semua tenggat dari konfigurasi.
5. Laporan: jumlah akun per status, penggunaan kuota, lonjakan pengiriman, surat ditolak/masuk spam (agregat, tanpa isi).
6. Syarat penggunaan: layar persetujuan syarat penggunaan dan kebijakan privasi saat pertama kali memakai MailPAM; versi dan waktu persetujuan dicatat. Teks resmi disediakan manusia; sediakan tempat pengganti bertanda TODO.

PRIVASI: audit log berisi aksi dan alasan, tidak berisi isi surat. Admin tidak boleh melihat kata sandi atau token.

KRITERIA SELESAI: aksi admin berjalan dengan konektor mock dan terekam; siklus hidup diuji dengan tanggal yang dimajukan (tes unit); akses isi surat tidak ada kecuali kebijakan tertulis tersedia.
```

## M5: Integrasi MailPAM dengan Super UNPAM

```text
Prasyarat: M2; D3 bila ingin lampiran lewat DrivePAM; P02 bila ingin notifikasi.

Tujuan: email terasa menyatu dengan fitur lain, tanpa membuat fitur lain bergantung padanya.

FITUR:
1. Surat resmi dari sistem (pengumuman BAAK, tagihan, hasil KRS, notifikasi beasiswa) memiliki jalur kirim melalui MailPAM sebagai salinan; sumber kebenaran tetap inbox aplikasi (P02). Pengguna dapat memilih menerima salinan email atau tidak, kecuali kategori wajib.
2. Tombol "Email dosen" di Direktori (P17) dan Bimbingan (P09) membuka penulisan surat dengan penerima terisi.
3. Lampiran dari DrivePAM: pilih berkas dari DrivePAM; berkas di bawah batas lampiran dikirim sebagai lampiran, berkas besar dikirim sebagai tautan berbagi dengan izin penerima yang tepat dan masa berlaku.
4. Pencarian global di Beranda dapat menemukan "Surat dari <pengirim>" hanya setelah pengguna mengaktifkan opsi itu (default mati; hasil menampilkan pengirim dan subjek saja).
5. Verifikasi email resmi: alamat MailPAM menjadi kanal pemulihan akun SSO yang diakui (selaras dengan P03).
6. Shortcut PWA "Surat" dan lencana jumlah belum dibaca di TopBar bila izin notifikasi aktif.

JANGAN: menjadikan MailPAM satu-satunya kanal untuk informasi wajib akademik/keuangan.

KRITERIA SELESAI: lima integrasi berjalan dengan mock; setiap integrasi dapat dimatikan lewat konfigurasi tanpa merusak fitur lain.
```

---

# DRIVEPAM

## D1: Inti penyimpanan

```text
Prasyarat: PAM-00 selesai dan keputusan opsi DrivePAM tertulis; P01 (BFF) dan P03 tersedia. Baca docs/MAILPAM-DRIVEPAM-KEPUTUSAN.md dan ikuti opsi yang dipilih. Jika belum ada keputusan, berhenti dan minta.

Tujuan: lapisan penyimpanan file yang aman, dengan metadata di server dan izin yang ditegakkan di BFF.

CABANG PER OPSI:
- Opsi A (penyimpanan objek S3-compatible): bucket PRIVAT (tanpa akses publik). Unggah dan unduh lewat URL bertanda tangan berumur pendek (±5 menit) yang dibuat BFF setelah memeriksa izin. Unggah besar memakai multipart yang dapat dilanjutkan (resumable). Catatan teknis: batas ukuran body Vercel Functions (±4,5 MB, verifikasi di dokumentasi terkini) membuat unggahan lewat BFF tidak praktis; unggahan langsung ke penyimpanan memerlukan perubahan connect-src. Usulkan perubahan CSP seminimal mungkin (satu domain penyimpanan persis, tanpa wildcard), jelaskan risikonya, dan MINTA persetujuan sebelum mengubah vercel.json. Pertimbangkan domain khusus (mis. subdomain kampus) yang di-CNAME ke penyimpanan agar dapat dikontrol.
- Opsi B (Google Drive/OneDrive): semua panggilan lewat BFF memakai token OAuth di server; DrivePAM menampilkan dan mengelola berkas di akun kampus pengguna. Hormati kuota gabungan organisasi (lihat catatan kuota di dokumen ini) dan tampilkan kuota terpakai per pengguna dari API.

MODEL DATA (opsi A; di opsi B petakan ke konsep API terkait):
- Item: id, pemilik, induk (folder), nama, tipe (berkas/folder), ukuran, tipe MIME hasil deteksi server (bukan percaya ekstensi/klien), checksum, versi, status pemindaian, waktu, dan status (Aktif/Sampah/Dihapus permanen).
- Kuota per pengguna dari konfigurasi per peran (nilai kosong bertanda TODO), pelacakan pemakaian, dan penolakan unggah bila kuota habis dengan pesan yang jelas.
- Nama berkas dan folder bersifat tidak tepercaya: normalisasi, batas panjang, tolak karakter kontrol dan pemisah jalur, dan selalu di-escape saat ditampilkan.

JANGAN: membuat URL objek yang dapat ditebak; menyimpan kunci penyedia penyimpanan di klien; membuat bucket publik; membiarkan klien menentukan tipe MIME yang dilayani balik.

KRITERIA SELESAI: unggah (kecil dan multipart), unduh, buat folder, pindah, ganti nama, hapus ke sampah, dan kuota berjalan dengan penyimpanan mock atau emulator (MinIO lokal) dan tes unit untuk aturan izin dan kuota; tidak ada perubahan CSP tanpa persetujuan.
```

## D2: Antarmuka pengelola berkas

```text
Prasyarat: D1.

Tujuan: fitur 'drivepam' (rute 'drive', semua peran, ikon HardDrive) yang ringan dan nyaman di HP, chunk terpisah, tanpa menaikkan bundel awal.

FITUR:
1. Tampilan daftar dan kisi, urut (nama, tanggal, ukuran), breadcrumb folder, dan seleksi banyak (hapus, pindah, unduh).
2. Unggah: tombol dan seret-lepas, antrean unggahan dengan progres, jeda/lanjut/batal, dan unggah ulang otomatis saat jaringan putus. Tampilkan batas ukuran dan kuota sebelum mulai. Di HP boleh memakai kamera/galeri; kompres gambar opsional.
3. Pratinjau di dalam aplikasi hanya untuk tipe aman: gambar dan PDF. Berkas lain: ikon, metadata, dan unduh. Pratinjau Office/dokumen kompleks DITUNDA (butuh konversi sisi server dan menambah risiko; tulis sebagai pekerjaan lanjutan).
4. Pencarian nama berkas dan filter jenis (dokumen, gambar, arsip, lainnya).
5. Sampah: pulihkan atau hapus permanen; hapus otomatis setelah N hari (nilai dari konfigurasi); tampilkan sisa hari.
6. Info kuota dengan batang progres dan peringatan 80% dan 100%; tombol "Bersihkan" yang menyorot berkas terbesar dan sampah.
7. Folder khusus sistem yang tidak dapat dihapus pengguna: "Dokumen Resmi" (hanya-baca, diisi sistem oleh D5) dan "Tugas Kuliah" (D5).
8. Aksesibilitas penuh: operasi dapat dilakukan dengan keyboard, label ARIA, status unggahan diumumkan pembaca layar, tap target ≥ 44px, serta mode hemat efek yang mematikan animasi.

JANGAN: memuat seluruh daftar sekaligus untuk folder besar (gunakan penomoran/virtualisasi); menampilkan nama berkas tanpa di-escape; membuat cache offline untuk isi berkas pribadi.

KRITERIA SELESAI: seluruh operasi dasar berjalan dengan penyimpanan mock; uji dengan 5.000 item dan unggahan 500 MB lewat emulator; build lolos dan ukuran chunk dilaporkan.
```

## D3: Berbagi dan kolaborasi

```text
Prasyarat: D1, D2.

Tujuan: berbagi berkas dengan aman. Tautan berbagi adalah jalur kebocoran paling umum, jadi bawaannya harus ketat.

FITUR:
1. Berbagi ke pengguna atau kelompok kampus (kelas MENTARI, prodi, ormawa) dengan peran Lihat atau Komentar atau Edit (edit hanya untuk tipe yang didukung; untuk berkas biasa "Edit" berarti boleh mengunggah versi baru). Ditegakkan di BFF.
2. Tautan berbagi: bawaan MATI. Bila dibuat: pilih "Hanya civitas UNPAM (perlu login)" sebagai default, atau "Siapa saja dengan tautan" dengan peringatan jelas; masa berlaku wajib (pilihan 1 hari, 7 hari, 30 hari; tanpa "selamanya" untuk publik), kata sandi opsional, batas unduh opsional, dan dapat dicabut kapan saja. Token tautan acak panjang (≥ 128 bit) dan tidak memuat NIM/nama.
3. Halaman penerima tautan yang tidak perlu aplikasi penuh: nama berkas, ukuran, pemilik, tombol unduh; berkas disajikan sebagai unduhan (Content-Disposition: attachment), dari origin terpisah tanpa cookie sesi.
4. Daftar "Dibagikan dengan saya" dan "Dibagikan oleh saya" dengan tombol cabut dan lihat siapa yang punya akses.
5. Riwayat aktivitas per item (dibuat, diubah, dibagikan, diunduh via tautan) yang dapat dilihat pemilik.
6. Versi: setiap unggah ulang membuat versi baru, dapat dipulihkan (jumlah versi maksimal dari konfigurasi).
7. Permintaan akses: penerima tautan yang tidak berhak dapat meminta akses; pemilik menerima notifikasi (P02 bila ada).
8. Laporkan berkas: tombol pada halaman tautan publik untuk melaporkan konten bermasalah ke moderator (D4).

JANGAN: mengizinkan pengindeksan mesin pencari (kirim X-Robots-Tag: noindex dan tag meta); memakai ID berurutan pada tautan; menampilkan pratinjau berkas publik dari origin utama.

KRITERIA SELESAI: seluruh aturan izin diuji (tes unit dan uji manual: tautan kedaluwarsa, tautan dicabut, kata sandi salah, pengguna tanpa izin mengetik URL manual); tautan tidak memuat data pribadi.
```

## D4: Keamanan, pemindaian, dan moderasi (wajib sebelum rilis)

```text
Prasyarat: D1 sampai D3. Kerjakan SEBELUM fitur dibuka ke pengguna.

Tujuan: mencegah DrivePAM menjadi tempat penyebaran malware atau hosting konten ilegal, dan melindungi data pengguna.

FITUR:
1. Pemindaian malware setiap unggahan di server (ClamAV atau layanan pemindai lain; sebutkan opsi dan biayanya tanpa angka karangan). Berkas baru berstatus "Memeriksa", tidak bisa dibagikan atau diunduh pihak lain sampai bersih; berkas terinfeksi dikarantina dan pemilik diberi tahu. Pemindaian ulang berkala untuk definisi baru.
2. Kebijakan tipe berkas: blokir executable dan skrip (.exe, .msi, .bat, .cmd, .ps1, .sh, .scr, .jar, dll.) dan HTML/SVG yang dibagikan publik (risiko XSS), terapkan batas ukuran per berkas dan per hari, dan batas jumlah berkas per folder. Daftar dari konfigurasi.
3. Penyajian berkas pengguna yang aman: domain terpisah tanpa cookie (sandbox domain), header Content-Disposition: attachment untuk semua kecuali gambar/PDF yang dipratinjau, X-Content-Type-Options: nosniff, Content-Security-Policy ketat pada respons berkas, dan tidak pernah menyajikan HTML pengguna dari origin aplikasi.
4. Enkripsi: enkripsi saat transit (TLS) dan saat disimpan (fitur penyedia); catat apakah kunci dikelola kampus atau penyedia di dokumen keputusan. Jangan membuat skema enkripsi buatan sendiri.
5. Moderasi: antrean laporan, tindakan (sembunyikan, hapus, tangguhkan akun), banding, dan catatan keputusan. Kebijakan penggunaan yang dapat diterima dan prosedur pelaporan hak cipta/konten ilegal disediakan manusia; sediakan tempat pengganti bertanda TODO dan JANGAN mengarang teks hukum.
6. Pencegahan penyalahgunaan: batas laju unggah dan unduh per pengguna dan per alamat IP, deteksi pola penggunaan sebagai CDN/hosting (unduhan massal dari tautan publik), dan peringatan ke tim keamanan.
7. Cadangan dan pemulihan: kebijakan cadangan, versi, dan penghapusan permanen yang disepakati; uji pemulihan dijadwalkan dan dicatat. Hapus permanen benar-benar menghapus objek dan versi setelah masa tenggang.
8. Audit log akses administratif (siapa, kapan, mengapa); admin tidak melihat isi berkas pribadi kecuali lewat prosedur tertulis dengan persetujuan dua orang (seperti di M4). Jika kebijakan belum ada, jangan implementasikan akses isi.

PENGUJIAN (wajib): berkas EICAR; unggah berkas dengan ekstensi ganda dan MIME palsu; nama berkas dengan HTML/skrip, ../ , dan karakter kontrol; SVG berisi skrip; tautan publik ke HTML; pengunduhan massal; kuota lewat unggahan paralel. Hasil ditulis di docs/DRIVEPAM-UJI-KEAMANAN.md.

KRITERIA SELESAI: semua uji lulus; berkas tidak bisa dibuka sebagai halaman di origin aplikasi; build lolos; setiap perubahan CSP tertulis dan disetujui.
```

## D5: Integrasi dengan fitur Super UNPAM

```text
Prasyarat: D1, D2; D3 untuk berbagi; fitur terkait (Surat, Dompet Sertifikat, MENTARI/Tugas, Bimbingan) sudah ada.

Tujuan: DrivePAM menjadi tempat berkas bagi fitur lain, agar berkas tidak tersebar.

FITUR:
1. "Dokumen Resmi" (hanya-baca): surat keterangan (Surat), kwitansi (P10), kartu ujian, sertifikat/SKPI (Dompet Sertifikat), dan KHS otomatis disimpan di folder ini oleh sistem. Pengguna tidak dapat mengubah atau menghapusnya; berkas bertanda tangan/QR verifikasi tetap valid.
2. "Tugas Kuliah": unggah tugas dari DrivePAM (pilih berkas yang ada) pada halaman Tugas; berkas dikirim sebagai salinan terkunci atau referensi dengan versi tetap supaya perubahan setelah tenggat tidak memengaruhi pengumpulan. Tampilkan jelas kebijakan mana yang dipakai.
3. Lampiran di fitur lain (Beasiswa P07, Pengajuan PKL P16, Aspirasi dan Lapor Fasilitas P22, Bimbingan P09): pemilih berkas dari DrivePAM selain unggah baru; berkas yang dilampirkan bersifat salinan ke kasus itu, sehingga penghapusan di DrivePAM tidak merusak arsip kasus.
4. Pemindai dokumen: ambil foto dengan kamera, rapikan (potong, kontras) di klien, dan simpan sebagai PDF atau gambar ke DrivePAM. Pakai API browser (getUserMedia, canvas) tanpa dependency besar; pustaka tambahan harus lazy-loaded dan ukurannya disebut.
5. Akses cepat: folder favorit di Beranda, shortcut PWA "Drive", dan hasil pencarian global untuk nama berkas bila pengguna mengaktifkannya (default mati).
6. Berbagi ke kelas MENTARI dan ke dosen pembimbing dari halaman Bimbingan.

JANGAN: membuat DrivePAM satu-satunya tempat arsip resmi tanpa kebijakan retensi tertulis; membiarkan penghapusan oleh pengguna menghilangkan bukti pengajuan resmi.

KRITERIA SELESAI: minimal tiga integrasi (Dokumen Resmi, Tugas, satu fitur lampiran) berjalan dengan mock; semua dapat dimatikan lewat konfigurasi.
```

## D6: Administrasi, kuota, dan siklus hidup

```text
Prasyarat: D1, D4.

Tujuan: alat bagi LPTI untuk mengelola penyimpanan dan biaya, serta mengakhiri akun dengan rapi.

FITUR (rute 'drive-admin', hanya peran admin di BFF):
1. Kuota per peran dan penggantian per pengguna (dengan alasan); laporan pemakaian total, per peran, per prodi, dan 100 pengguna terbesar; proyeksi tren sederhana. Tampilkan kuota gabungan organisasi bila memakai opsi B.
2. Kebijakan retensi: konfigurasi masa simpan sampah, versi, dan berkas akun nonaktif. Nilai dari kebijakan tertulis; kosong bertanda TODO bila belum ada.
3. Siklus hidup akun (selaras M4): saat lulus/berhenti, status berubah; pengguna menerima pengingat H-90/H-30/H-7 dengan tombol ekspor seluruh berkas (arsip ZIP dibuat di server dan dikirim sebagai tautan berumur pendek); setelah masa tenggang berkas dihapus sesuai kebijakan. Akun nonaktif tetap memakai kuota sampai dihapus; tampilkan di laporan.
4. Antrean moderasi (dari D4) dan daftar karantina.
5. Pemantauan: kegagalan pemindaian, antrean unggahan, dan kesalahan penyimpanan di panel sederhana; peringatan ke admin.

KRITERIA SELESAI: laporan dan kuota berjalan dengan data mock; ekspor sebelum penghapusan diuji dengan tanggal yang dimajukan; tidak ada penghapusan data tanpa masa tenggang yang tertulis.
```

---

## 4. Risiko dan hal yang perlu diputuskan manusia

1. **Hukum dan pelindungan data.** Email dan file memuat data pribadi dan komunikasi pribadi. Libatkan bagian hukum/DPO untuk kebijakan privasi, retensi, lokasi data, dan prosedur akses administratif **sebelum** pengguna pertama dibuka. Prompt melarang agent mengarang teks hukum.
2. **Penyalahgunaan itu pasti terjadi.** Dengan ribuan akun, ada yang akan dipakai untuk spam, phishing, atau menyimpan konten ilegal. M3, M4, D4, dan D6 bukan tambahan opsional.
3. **Biaya yang tidak terlihat.** Penyimpanan (termasuk akun alumni dan akun ditangguhkan yang tetap memakai kuota), lalu lintas unduhan, pemindaian, cadangan, dan dukungan pengguna. Minta penawaran vendor sebelum menetapkan kuota per pengguna.
4. **Dukungan pengguna.** Reset akses, "email saya tidak masuk", "file saya hilang" akan menjadi tiket harian. Siapkan meja bantuan sebelum rilis.
5. **Rilis bertahap.** Mulai dari kelompok kecil (dosen/tendik atau satu angkatan), lalu perluas.
6. **Kuota organisasi bila memakai Google Workspace for Education.** Fundamentals dan Standard berbagi 100 TB untuk seluruh organisasi, bukan per pengguna; tetapkan batas per OU/grup sejak awal.

## 5. Sumber untuk fakta yang saya verifikasi

- Google Workspace for Education, panduan penyimpanan admin: https://services.google.com/fh/files/misc/gfe_admin_storage_guide.pdf
- Google Workspace Admin, penyimpanan dan batas unggah: https://knowledge.workspace.google.com/admin/drive/storage-and-upload-limits-for-google-workspace
