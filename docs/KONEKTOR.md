# Konektor sistem kampus: pertanyaan untuk tim LPTI

BFF Super UNPAM (`api/`) adalah satu-satunya pintu aplikasi ke sistem kampus. Setiap sistem punya antarmuka di `api/_connectors/types.ts`, dengan dua implementasi:

- `mock`: data contoh, sudah berjalan.
- `http`: sistem asli. **Belum diisi**, karena spesifikasi sistem sumber belum ada dan tidak boleh ditebak.

Implementasi `http` dapat diaktifkan per sistem (`CONNECTOR_SSO=http`, `CONNECTOR_MY_UNPAM=http`, …), jadi sistem bisa dipindah ke data asli satu per satu.

## Pertanyaan umum (berlaku untuk semua sistem)

1. URL dasar untuk lingkungan uji (staging) dan production.
2. Metode autentikasi server-ke-server: OAuth2 client credentials, API key, mTLS, atau lainnya? Bagaimana rotasi kredensialnya?
3. Apakah BFF memanggil atas nama pengguna (token pengguna dari SSO diteruskan) atau sebagai layanan tepercaya dengan parameter NIM/NIDN?
4. Format respons (JSON/XML/SOAP), contoh respons sukses dan error, serta kode error yang dipakai.
5. Batas laju (rate limit) dan perkiraan beban puncak (mis. saat pembukaan KRS).
6. Zona waktu dan format tanggal; format nominal uang (harus bilangan bulat rupiah).
7. Daftar alamat IP yang perlu di-allowlist. Fungsi Vercel tidak punya IP tetap; bila wajib, perlu proxy keluar atau fitur IP statis.
8. Kebijakan retensi dan log data pribadi di sisi sistem sumber.

## Per sistem

| Sistem | Antarmuka | Data yang dibutuhkan | Pertanyaan khusus |
|---|---|---|---|
| SSO | `SsoConnector` | Verifikasi username/sandi, profil (nama, NIM/NIDN, peran, prodi, fakultas, angkatan) | Apakah tersedia OIDC/SAML sehingga sandi tidak melewati BFF? Bagaimana peran (mahasiswa/dosen/tendik/alumni) ditentukan? Apakah ada MFA? |
| MY UNPAM | `MyUnpamConnector` | Jadwal, nilai/KHS, penawaran KRS (kuota terisi), rekap kehadiran, pencatatan presensi | Endpoint pencatatan presensi dan sesi kuliah yang sedang berlangsung? Ambang kehadiran untuk ujian? Data dosen pengampu per kelas? |
| MENTARI | `MentariConnector` | Daftar kelas online, progres, tugas & tenggat | Apakah ada API untuk mengumpulkan tugas, atau cukup tautan? |
| SISKEMU | `SiskemuConnector` | Tagihan, status, nomor VA, riwayat pembayaran | Apakah status pembayaran real-time (webhook bank) atau berkala? Nomor VA per tagihan atau per mahasiswa? |
| EMS | `EmsConnector` | Event, kuota, pendaftaran | API pendaftaran/pembatalan peserta? |
| MY LSP | `MyLspConnector` | Skema sertifikasi, status, sertifikat | Tautan unduh sertifikat yang aman (bertanda tangan/berumur pendek)? |
| MY LB | `MyLbConnector` | Skor TOEFL, jadwal tes, kursi | API pendaftaran tes? |
| SISPEMA | `SispemaConnector` | Peringkat prodi, poin, daftar prestasi | Apakah peringkat boleh ditampilkan ke mahasiswa yang bersangkutan? |
| Portal pengumuman | `PortalConnector` | Berita/pengumuman kampus, notifikasi per pengguna | Sistem sumber yang dipakai belum ditentukan: portal web, CMS, atau sistem lain? |
| SISKERMA | belum ada antarmuka | Daftar kerjasama (halaman Kerjasama masih memakai data di dalam halaman) | Akses untuk dosen/tendik saja? |

## Konfigurasi yang dibutuhkan BFF

- `SESSION_SECRET`, `QR_SECRET`: rahasia acak (≥ 32 karakter), hanya di environment server.
- `CAMPUS_GEOFENCES`: koordinat dan radius resmi tiap kampus untuk presensi lokasi (dari Sarpras/LPTI).
- Kredensial tiap sistem sumber: env server, mis. `MY_UNPAM_BASE_URL`, `MY_UNPAM_CLIENT_ID`, `MY_UNPAM_CLIENT_SECRET`. Nama finalnya mengikuti jawaban di atas.

## Catatan keamanan

- Presensi lokasi memakai koordinat yang dikirim perangkat, dan koordinat ini bisa dipalsukan. Geofence server perlu, tetapi tidak cukup sendirian. QR/kode sesi dari dosen tetap jadi jalur utama.
- Sesi saat ini berupa token bertanda tangan tanpa penyimpanan server. Untuk "keluar dari semua perangkat" dan pencabutan sesi, perlu penyimpanan sesi (Redis/KV).
- Rate limit saat ini disimpan di memori tiap instance function. Untuk perlindungan penuh terhadap tebakan sandi/kode, perlu penyimpanan bersama.
