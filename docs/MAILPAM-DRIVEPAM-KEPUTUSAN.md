# MailPAM & DrivePAM: dokumen keputusan (PAM-00)

Status: **DRAF, menunggu jawaban manusia.** Dokumen ini adalah hasil prompt PAM-00 (`PROMPT/PROMPT-MAILPAM-DRIVEPAM.md`). Belum ada kode fitur, akun nyata, kunci API, vendor terpilih, atau perubahan `vercel.json`.

Prompt M1 dan D1 **wajib berhenti** selama bagian 1 belum terjawab dan bagian 3 belum ditandatangani.

Cara membaca:
- **[Fakta]**: terverifikasi dari sumber yang disebut di bagian 8.
- **[Perlu verifikasi]**: berasal dari pengetahuan umum atau dokumentasi yang belum dicek ulang; jangan dipakai sebagai angka final.
- **[Estimasi]**: perkiraan kerja tim ini, beserta asumsinya. Bukan harga dan bukan kuota.

---

## 0. Kondisi Super UNPAM saat ini yang memengaruhi keputusan

Hasil membaca repo pada 28 Okt 2026 (`main` @ `2997ae1`):

| Area | Kondisi sekarang | Dampak untuk MailPAM/DrivePAM |
|---|---|---|
| Peran (`src/lib/types.ts`) | `MAHASISWA`, `DOSEN`, `TENDIK`, `ALUMNI`. **Tidak ada peran admin.** | M4 dan D6 butuh peran admin yang ditetapkan di BFF (bukan pilihan pengguna), misalnya dari grup SSO. Belum ada sumbernya; lihat pertanyaan 1.h. |
| Sesi (`api/_lib/session.ts`) | Cookie HttpOnly bertanda tangan HMAC, **stateless**, TTL 8 jam. Tidak bisa dicabut sebelum kedaluwarsa. | Untuk email dan file, akun yang diretas harus bisa langsung diputus. Butuh penyimpanan sesi server (Redis/KV/DB) sebelum rilis. |
| Batas laju (`api/_lib/ratelimit.ts`) | Di memori per instance function. | Batas kirim surat (M3) dan batas unggah/unduh (D4) **tidak boleh** memakai ini; butuh penyimpanan bersama. |
| Database | **Belum ada.** Semua data dari konektor mock. | DrivePAM opsi A butuh database metadata. MailPAM opsi A/B butuh penyimpanan token terenkripsi, draf (opsi B), dan audit log. |
| Login kuat (P03) | Belum dikerjakan (passkey, kunci aplikasi). | Prasyarat rilis menurut prompt. |
| Service worker (`vite.config.ts`) | `NetworkFirst` meng-cache **semua** `/api/*` kecuali `auth`, `qr`, `presensi`. | Tanpa diubah, respons `/api/mail/*` dan `/api/drive/*` akan tersimpan di perangkat. Ini melanggar larangan M2/D2 soal cache offline isi surat/berkas. Pengecualian harus ditambahkan di M2 dan D2. |
| `localStorage` | Hanya preferensi UI (`src/lib/prefs.ts`). | Pertahankan: isi surat, lampiran, token, dan isi berkas tidak boleh disimpan di klien. |
| CSP (`vercel.json`) | `default-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'` | Lihat bagian 5. |
| Hosting | Vercel saja (Netlify tidak dipakai). Fungsi di `api/` berjalan sebagai Vercel Functions. | Batas body dan durasi function membatasi unggah lewat BFF dan pemindaian malware (bagian 2). |

---

## 1. Pertanyaan yang HARUS dijawab manusia sebelum lanjut

Isi kolom **Jawaban** beserta nama penjawab dan tanggal. Jika belum ada jawaban, biarkan kosong: itu artinya **berhenti**.

| # | Pertanyaan | Penjawab yang disarankan | Jawaban |
|---|---|---|---|
| 1.a | Apakah UNPAM **sudah** punya email untuk mahasiswa/dosen di domain kampus? Platformnya apa (Google Workspace for Education, Microsoft 365 Education, server sendiri, belum ada)? Edisi/lisensinya apa? Siapa admin-nya? | LPTI | |
| 1.b | Domain dan pola alamat yang dipakai atau diinginkan. *Contoh pola, bukan fakta:* `nim@student.<domain>`, `nama.belakang@<domain>`. Apakah dosen dan mahasiswa memakai subdomain berbeda? | LPTI | |
| 1.c | Siapa yang berhak punya akun: mahasiswa aktif, dosen, tendik, alumni? Apa yang terjadi saat **cuti**, **DO/mengundurkan diri**, dan **lulus**? Berapa lama akun alumni dipertahankan? | Pimpinan + BAAK | |
| 1.d | Perkiraan jumlah pengguna per peran, dan kuota per peran yang diinginkan (mahasiswa, dosen, tendik, alumni). | LPTI + Keuangan | |
| 1.e | Kebijakan data: lokasi data yang diizinkan (dalam negeri saja?), retensi surat dan berkas, apakah kampus boleh mengakses kotak surat/berkas pengguna dan dengan prosedur apa, serta penanganan permintaan aparat dan sengketa. | Hukum/DPO | |
| 1.f | Kebijakan penggunaan yang dapat diterima (spam, phishing, konten ilegal, hak cipta). Siapa moderatornya, siapa penerima laporan, dan berapa target waktu penanganan? | Hukum + Kemahasiswaan + LPTI | |
| 1.g | Anggaran (sekali bayar dan bulanan) dan penyedia yang boleh dipakai (cloud luar negeri, penyedia lokal, server sendiri). | Pimpinan + Keuangan | |
| 1.h | Siapa yang menjadi **admin** MailPAM/DrivePAM, dan dari sumber apa BFF mengetahuinya (grup di SSO, daftar di konfigurasi)? Siapa dua orang untuk persetujuan four-eyes? | LPTI | |
| 1.i | Apakah UNPAM layak dan sudah terdaftar di program edukasi Google atau Microsoft? **[Perlu verifikasi]** dengan penyedia. | LPTI | |
| 1.j | Siapa yang menangani dukungan pengguna (reset akses, "email tidak masuk", "file hilang") dan lewat kanal apa? | LPTI | |
| 1.k | Kelompok rilis pertama (mis. dosen/tendik saja, atau satu angkatan). | Pimpinan | |

---

## 2. Perbandingan opsi

Estimasi hari-orang **[Estimasi]** mengasumsikan satu pengembang yang sudah paham repo ini, konektor mock yang sudah ada sebagai pola, dan **belum** termasuk P03, penyimpanan sesi bersama, persetujuan hukum, maupun waktu tunggu vendor. Semua rentang lebar karena jawaban bagian 1 belum ada.

### 2.1 MailPAM

| | **A. Integrasi Google Workspace / Microsoft 365** | **B. Server email sendiri** (Stalwart, Mailcow, dll.) | **C. Alias + penerusan** |
|---|---|---|---|
| Kebutuhan teknis | Tenant edukasi aktif; service account/app registration dengan cakupan sempit; Admin SDK Directory API atau Graph untuk provisioning (M1); Gmail API atau Graph Mail via BFF (M2); penyimpanan token terenkripsi di server; database untuk audit log | Server/VM dengan IP yang reputasinya terjaga; DNS MX, SPF, DKIM, DMARC, PTR; anti-spam dan anti-virus; cadangan; BFF berbicara IMAP/SMTP (butuh proses berumur panjang, **tidak cocok** untuk Vercel Functions tanpa layanan perantara) | Layanan penerusan (dari penyedia domain/email); daftar alias di database; UI manajemen alias saja |
| Risiko | Ketergantungan vendor; scope API sensitif dan kemungkinan proses verifikasi penyedia **[Perlu verifikasi]**; kuota Google dibagi satu organisasi **[Fakta]**; data di luar negeri (lihat 1.e) | Beban operasi 24/7; IP masuk daftar hitam; kampus menanggung penyalahgunaan sendiri; kebocoran bila tidak di-patch | Bukan kotak surat sungguhan; surat kampus berakhir di penyedia pribadi; penerusan sering gagal DMARC sehingga masuk spam **[Perlu verifikasi]** |
| Estimasi M1–M5 **[Estimasi]** | 35–60 hari-orang (M3 adalah porsi terbesar) | 60–110 hari-orang, belum termasuk operasi server | 8–15 hari-orang (M1 + UI alias; M2/M3 hanya sebagian) |
| Yang TIDAK bisa saya pastikan | Edisi lisensi UNPAM; apakah aplikasi internal di domain sendiri lolos tanpa penilaian keamanan pihak ketiga; batas kirim harian dan ukuran lampiran terkini; harga (**perlu penawaran**) | Ketersediaan tim infrastruktur; biaya server dan IP (**perlu penawaran**); kualitas reputasi IP yang didapat | Penyedia penerusan yang dipakai; perilaku DMARC di sisi penerima |

### 2.2 DrivePAM

| | **A. Penyimpanan objek S3-compatible + BFF** | **B. Antarmuka di atas Google Drive / OneDrive** | **C. Tunda, pakai tautan** |
|---|---|---|---|
| Kebutuhan teknis | Bucket privat (R2, S3, MinIO, atau penyedia lokal); URL bertanda tangan berumur pendek; unggah multipart langsung dari browser (butuh perubahan CSP, bagian 5); database metadata; layanan pemindai malware di luar Vercel Functions; domain konten terpisah tanpa cookie | Opsi A MailPAM di platform yang sama; Drive API/Graph via BFF; token di server | Validasi tautan sederhana |
| Risiko | Kampus membangun sendiri pemindaian, kuota, berbagi, dan moderasi; biaya lalu lintas unduhan; kunci penyimpanan bocor bila tidak dijaga | Kuota gabungan 100 TB untuk seluruh organisasi (Fundamentals/Standard), akun yang ditangguhkan tetap memakai kuota, dan saat kuota penuh Drive tidak bisa mengunggah **[Fakta]**; kontrol berbagi mengikuti setelan tenant | Tidak ada arsip kampus; tautan pribadi bisa publik; tidak ada moderasi |
| Estimasi D1–D6 **[Estimasi]** | 55–95 hari-orang | 30–50 hari-orang | 2–4 hari-orang |
| Yang TIDAK bisa saya pastikan | Batas body Vercel Functions (±4,5 MB) **[Perlu verifikasi]**; harga penyimpanan, lalu lintas, dan pemindai (**perlu penawaran**); apakah penyedia lokal mendukung URL bertanda tangan dan multipart | Edisi lisensi UNPAM; kuota yang sudah terpakai saat ini | – |

### 2.3 Hambatan teknis yang berlaku apa pun opsinya

1. **Pemindaian malware tidak bisa dijalankan di Vercel Functions** secara praktis: ClamAV butuh basis data definisi ratusan MB dan proses yang tetap hidup **[Perlu verifikasi]**. Diperlukan layanan pemindai terpisah (VM/kontainer kampus, atau layanan pindai berbayar) yang dipanggil BFF atau dipicu event penyimpanan.
2. **Database dan penyimpanan bersama** (sesi, batas laju, audit log, metadata, token) harus dipilih lebih dulu. Ini juga menutup TODO lama di README.
3. **Proses berumur panjang** (IMAP IDLE, tugas terjadwal siklus hidup, pembuatan ZIP ekspor) butuh cron atau worker. Vercel Cron bisa memicu tugas terjadwal **[Perlu verifikasi]** batas durasinya.

---

## 3. Rekomendasi

**Rekomendasi bersyarat** (berlaku sampai bagian 1 terjawab):

| Jika jawaban 1.a… | MailPAM | DrivePAM | Alasan |
|---|---|---|---|
| UNPAM **sudah** memakai Google Workspace atau Microsoft 365 | **A** | **B** | Infrastruktur, anti-spam, dan pemindaian sudah ditanggung vendor; Super UNPAM cukup menjadi antarmuka ringkas. Risiko terbesar (kuota bersama) dikelola lewat batas per OU/grup sejak awal. |
| **Belum** ada, tetapi UNPAM layak dan mau mendaftar program edukasi (1.i) | **A** setelah tenant aktif; sementara **C** | **B** setelah tenant aktif | Membangun server email sendiri lebih mahal dan lebih berisiko daripada menunggu tenant. |
| **Belum** ada dan tidak akan memakai vendor edukasi | **C** dulu | **A** | Kotak surat sendiri (B) baru dipertimbangkan bila tim infrastruktur 24/7 tersedia (1.j) dan anggaran (1.g) jelas. |

**Rekomendasi berubah bila:**
- 1.e mewajibkan data di dalam negeri dan vendor edukasi tidak bisa menjaminnya, sehingga DrivePAM beralih ke **A** dengan penyedia lokal dan MailPAM mungkin harus **B**.
- 1.d menunjukkan kebutuhan penyimpanan total melebihi kuota organisasi vendor, sehingga DrivePAM beralih ke **A** atau dilakukan pembatasan kuota per peran yang ketat.
- Tidak ada tim moderasi dan dukungan (1.f, 1.j), sehingga **keduanya ditunda**. Tanpa moderasi, DrivePAM terbuka untuk disalahgunakan.

**Urutan wajib sebelum rilis ke pengguna mana pun:** P03, penyimpanan sesi dan batas laju bersama, M3 (untuk MailPAM), D4 (untuk DrivePAM), dan teks hukum (1.e, 1.f) dari manusia.

Keputusan final (diisi manusia):

| | Opsi dipilih | Diputuskan oleh | Tanggal |
|---|---|---|---|
| MailPAM | | | |
| DrivePAM | | | |

---

## 4. Model ancaman ringkas

| Ancaman | Contoh | Mitigasi yang direncanakan | Prompt |
|---|---|---|---|
| Pengambilalihan akun | Kata sandi bocor, sesi dicuri | Passkey/2 langkah; tanpa kata sandi awal yang bisa ditebak; tautan penyetelan satu kali; pemulihan lewat verifikasi identitas kampus + batas laju + notifikasi; sesi yang bisa dicabut | P03, M1 (3, 5), M4 (1) |
| Phishing antar-mahasiswa | Akun mahasiswa diretas lalu mengirim "info beasiswa" palsu | Batas kirim per jam/hari dan per jumlah penerima; deteksi lonjakan dan penangguhan otomatis; spanduk nama tampilan menyerupai pejabat; tombol laporkan phishing | M3 (5, 6, 7), M4 (2) |
| Malware lewat unggahan/lampiran | `.exe` dalam ZIP, makro Office | Pemindaian di server sebelum berkas tersedia; blokir tipe berbahaya dan arsip terenkripsi; karantina; pindai ulang berkala | M3 (4), D4 (1, 2) |
| XSS lewat HTML email | `<img onerror>`, `javascript:` | Sanitasi allowlist di BFF; tidak memakai `dangerouslySetInnerHTML` pada HTML mentah; isolasi gaya; CSP tetap ketat | M3 (1) |
| XSS lewat nama berkas, subjek, nama pengirim | `"><script>` sebagai nama berkas | Normalisasi dan batas panjang; selalu di-escape saat ditampilkan (React default); uji payload | D1, D4 (pengujian), M3 (pengujian) |
| XSS lewat berkas yang disajikan | SVG/HTML berisi skrip dibuka di origin aplikasi | Domain konten terpisah tanpa cookie; `Content-Disposition: attachment`; `nosniff`; CSP pada respons berkas; blokir HTML/SVG publik | D4 (2, 3), D3 (3) |
| Pelacakan & SSRF lewat gambar email | Piksel pelacak; URL gambar ke `169.254.169.254` | Gambar jarak jauh diblokir bawaan; proxy gambar di BFF dengan cek tipe, ukuran, batas waktu, dan blokir alamat internal | M3 (2) |
| Kebocoran lewat tautan berbagi | Tautan publik tersebar | Tautan mati secara bawaan; default "hanya civitas"; masa berlaku wajib; token ≥ 128 bit; dapat dicabut; `noindex` | D3 (2, 3) |
| Hosting file ilegal / jadi CDN gratis | Film bajakan dibagikan publik | Batas ukuran dan laju; deteksi unduhan massal; moderasi dan pelaporan; penangguhan | D4 (5, 6), D6 (4) |
| Penghapusan data oleh pengguna jahat | Akun diretas lalu semua berkas dihapus | Sampah dengan masa tenggang; versi; hapus permanen hanya setelah tenggang; cadangan dan uji pemulihan; audit log | D2 (5), D3 (6), D4 (7) |
| Akses administratif berlebihan | Admin membaca kotak surat tanpa dasar | Akses isi hanya dengan prosedur tertulis + four-eyes + batas waktu; tidak diimplementasikan selama kebijakan 1.e belum ada; audit log yang tidak bisa diubah admin | M4 (3), D4 (8) |
| Kebocoran di perangkat bersama | Isi surat tertinggal di cache PWA | Pengecualian `/api/mail/*` dan `/api/drive/*` dari runtime cache SW; tidak menyimpan isi di localStorage/IndexedDB; hapus cache saat keluar akun (sudah ada untuk cache `api`) | M2, D2 (lihat bagian 0) |

---

## 5. Perubahan CSP yang akan dibutuhkan per opsi

**Tidak ada perubahan `vercel.json` di tahap ini.** Daftar di bawah adalah usulan yang harus disetujui per item. Nama domain berbentuk `<…>` adalah placeholder sampai vendor dan domain dipilih. Tidak boleh memakai wildcard.

| Opsi | Direktif | Nilai yang ditambahkan | Alasan | Bisa dihindari? |
|---|---|---|---|---|
| MailPAM A (Gmail API/Graph) | – | **Tidak ada** | Semua panggilan API dilakukan BFF dari server; klien hanya memanggil `/api/mail/*` (`'self'`). | – |
| MailPAM B (IMAP/SMTP) | – | **Tidak ada** | Klien hanya berbicara JSON dengan BFF. | – |
| MailPAM C (alias) | – | **Tidak ada** | – | – |
| MailPAM: gambar email | `img-src` | **Tidak ada** | Gambar lewat proxy BFF (`'self'`), sesuai M3.2. | Ya, dan memang harus dihindari. |
| MailPAM: isolasi HTML email dengan iframe sandbox (opsional, M3.1) | `frame-src` | `https://<mail-render>.<domain-kampus>` (satu origin khusus, bukan origin aplikasi) | Mengisolasi HTML surat sepenuhnya dari DOM dan cookie aplikasi. | Ya, bila sanitasi server + isolasi gaya dinilai cukup. Keputusan di M3. |
| DrivePAM A: unggah/unduh langsung ke penyimpanan | `connect-src` | `https://<files>.<domain-kampus>` (subdomain kampus yang di-CNAME ke bucket; satu domain persis) | Unggah melalui BFF terhambat batas body Vercel Functions (±4,5 MB **[Perlu verifikasi]**). | Tidak, kecuali unggah dibatasi di bawah batas body (tidak praktis). |
| DrivePAM A: pratinjau gambar | `img-src` | **Tidak ada** bila gambar diambil dengan `fetch` lalu ditampilkan sebagai `blob:` (sudah diizinkan); bila tidak, `https://<files>.<domain-kampus>` | Pratinjau gambar. | Ya, dengan pola `fetch` + `blob:`. |
| DrivePAM A: pratinjau PDF dari origin konten | `frame-src` | `https://<usercontent>.<domain-kampus>` | Menampilkan PDF tanpa menyajikannya dari origin aplikasi (D4.3). | Sebagian: PDF bisa diunduh saja, tanpa pratinjau di aplikasi. |
| DrivePAM B (Drive/OneDrive) | – | **Tidak ada** untuk daftar dan metadata (lewat BFF). Pratinjau dan unduh lewat proxy BFF atau tautan keluar. | – | Ya. |
| Pemindai dokumen (D5.4) | – | **Tidak ada**. `Permissions-Policy: camera=(self)` sudah mengizinkan kamera. | – | – |

Catatan: header keamanan untuk **domain konten** (D4.3) adalah konfigurasi terpisah di domain tersebut, bukan di `vercel.json` aplikasi.

---

## 6. Yang harus disiapkan manusia

**DNS** (hanya bila email dikelola sendiri, opsi B, atau domain baru dipakai untuk opsi A):
- MX, SPF, DKIM, DMARC (mulai dari `p=none` dengan pelaporan, lalu diperketat), dan PTR/reverse DNS untuk IP pengirim.
- Subdomain DrivePAM opsi A: `<files>` (CNAME ke penyimpanan) dan `<usercontent>` (domain sajian berkas tanpa cookie).

**Kredensial** (hanya di environment variable server Vercel, tidak pernah di repo atau klien):
- Opsi A Mail/Drive: service account dengan domain-wide delegation (Google) atau app registration dengan izin aplikasi minimum (Microsoft). Cakupan paling sempit, bukan akun super-admin pribadi.
- DrivePAM A: kunci akses penyimpanan yang dibatasi ke satu bucket.
- Kunci enkripsi token di server, yang terpisah dari `SESSION_SECRET` dan `QR_SECRET`.
- Kredensial database dan penyimpanan sesi bersama.

**Dokumen hukum** (teks disediakan manusia; agen tidak boleh mengarang):
- Kebijakan privasi dan syarat penggunaan MailPAM/DrivePAM, dengan nomor versi (dipakai M4.6).
- Kebijakan penggunaan yang dapat diterima.
- Prosedur pelaporan hak cipta dan konten ilegal.
- Prosedur akses administratif dan permintaan aparat.
- Kebijakan retensi dan penghapusan.

**Operasional:**
- Kontak laporan penyalahgunaan (mis. alamat `abuse@` atau formulir) dan tim yang memantaunya.
- Meja bantuan dan jam layanannya.
- Daftar admin dan pasangan persetujuan four-eyes (1.h).
- Penawaran harga dari vendor yang dipertimbangkan (1.g).

---

## 7. Pertanyaan terbuka (ringkasan)

Seluruh bagian 1 (1.a sampai 1.k) masih kosong. Pertanyaan tambahan yang muncul dari pemeriksaan repo:

1. Database dan penyimpanan sesi apa yang akan dipakai (mis. Postgres terkelola, Redis/KV)? Ini dibutuhkan MailPAM/DrivePAM dan juga TODO BFF yang sudah ada.
2. Di mana layanan pemindai malware dijalankan, dan siapa yang mengoperasikannya?
3. Apakah boleh menambah subdomain kampus untuk domain konten dan penyimpanan (bagian 5), dan siapa pengelola DNS-nya?
4. Apakah P03 (passkey, kunci aplikasi) dikerjakan sebelum M1/D1, sesuai urutan di prompt?

**Pekerjaan berhenti di sini** sampai pertanyaan di atas dijawab dan tabel keputusan di bagian 3 diisi.

---

## 8. Sumber

- **[Fakta]** kuota 100 TB gabungan per organisasi (Fundamentals/Standard), kuota bersama Drive/Gmail/Foto, batas per OU/grup, akun yang ditangguhkan tetap memakai kuota, dan perilaku saat kuota penuh: dikutip dari ringkasan di `PROMPT/PROMPT-MAILPAM-DRIVEPAM.md` bagian 1, yang merujuk ke:
  - Google Workspace for Education, panduan penyimpanan admin: https://services.google.com/fh/files/misc/gfe_admin_storage_guide.pdf
  - Google Workspace Admin, penyimpanan dan batas unggah: https://knowledge.workspace.google.com/admin/drive/storage-and-upload-limits-for-google-workspace

  Saya tidak membuka ulang kedua sumber ini saat menulis dokumen; periksa kembali sebelum dijadikan dasar keputusan.
- Kondisi repo (bagian 0): dibaca langsung dari `vercel.json`, `vite.config.ts`, `src/lib/types.ts`, `src/lib/prefs.ts`, `api/_lib/session.ts`, `api/_lib/ratelimit.ts`, `src/data/features.ts`, `README.md`. Prompt menyebut `src/lib/auth.ts`, tetapi file itu sudah dihapus di P01 dan digantikan `src/lib/api.ts` (klien) serta `api/auth/[action].ts` (server).
- Hal bertanda **[Perlu verifikasi]** belum dicek di dokumentasi terkini penyedia.
