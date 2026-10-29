# Ujian daring: kebijakan privasi, keadilan, dan rencana uji beban (T09)

**Status: draf untuk diputuskan kampus.** Fitur ujian daring di Super UNPAM nonaktif (`ujianDaring.aktif = false` di `src/data/aturan-akademik.ts`) sampai kampus memutuskan menyelenggarakannya. Mode demo hanya memperagakan dengan data contoh.

## 1. Yang dibangun
- **Bentuk:** unggah jawaban. Soal dirilis server saat jam mulai. Unggahan ditutup pada jam selesai, ditambah perpanjangan akomodasi dan toleransi sambungan.
- **Waktu resmi:** diambil dari jam server. Klien menghitung selisih jamnya terhadap server hanya untuk menampilkan hitung mundur.
- **Pengiriman idempoten:** setiap berkas diberi kunci (`Idempotency-Key`). Kirim ulang dengan kunci yang sama mengembalikan struk yang sama, tidak menambah kiriman baru. Pengiriman berkas baru menambah versi, dan versi terakhir yang berlaku.
- **Struk:** berisi nama berkas, SHA-256, dan waktu server saat kiriman diterima.
- **Belum dibangun:** kuis pilihan ganda/esai dengan simpan otomatis. Fitur ini butuh keputusan bentuk ujian terlebih dahulu.

## 2. Privasi (keputusan bawaan)
1. **Tidak ada perekaman** kamera, layar, maupun mikrofon. Di konfigurasi, `perekaman` sengaja bertipe `false`, sehingga mengaktifkannya butuh perubahan kode **dan** kebijakan tertulis, bukan sekadar mengganti satu nilai.
2. **Tidak ada deteksi "kecurangan" otomatis** yang menjatuhkan sanksi tanpa tinjauan manusia.
3. Bila kampus memutuskan pengawasan diperlukan, keputusan itu harus memuat:
   - dasar hukum dan kebijakan privasi kampus;
   - persetujuan yang jelas dari peserta;
   - batas waktu penyimpanan rekaman;
   - siapa yang boleh mengakses rekaman;
   - tinjauan manusia sebelum ada sanksi apa pun.

## 3. Keadilan dan aksesibilitas
- **Perpanjangan waktu** untuk mahasiswa berkebutuhan khusus ditetapkan server/BAAK per peserta. Klien tidak bisa mengubahnya, dan nilainya dibatasi `maksPerpanjanganMenit`.
- **Toleransi sambungan** (`toleransiDetik`): kiriman masih diterima beberapa detik setelah waktu habis.
- **Pembaca layar:** hitung mundur diumumkan per menit, bukan per detik.
- **Koneksi lambat:** soal berupa satu berkas unduhan dan unggahan hanya satu berkas, tanpa video maupun polling berat.
- **Nilai:** tidak ditampilkan sampai dirilis resmi oleh server.

## 4. Rencana uji beban
**Target awal (perlu dikonfirmasi LPTI):** 5.000 peserta serentak dalam satu sesi. Lonjakan terjadi di 10 menit terakhir sesi, dengan pola rata-rata 1–2 unggahan per peserta ditambah sebagian kirim ulang.

| Skenario | Beban | Lulus bila |
|---|---|---|
| Muat sesi | 5.000 × `GET /api/ujian/daring` dalam 2 menit pertama | p95 < 1 detik, error < 0,1% |
| Lonjakan akhir | 5.000 × `POST /api/ujian/daring-kirim` dalam 10 menit | p95 < 2 detik, tidak ada kiriman hilang |
| Kirim ulang | 20% permintaan diulang dengan kunci sama | Jumlah kiriman tersimpan = jumlah kunci unik |

**Skrip uji:** `scripts/uji-beban-ujian.mjs`. Jalankan terhadap **staging**, jangan terhadap production. Butuh cookie sesi akun uji dan `ujianDaring.aktif = true` di staging.

```bash
BASE=https://staging.example SESI="su_session=..." PESERTA=200 node scripts/uji-beban-ujian.mjs
```

**Prasyarat sebelum uji 5.000 peserta:**
- Penyimpanan kiriman di basis data bersama dengan penguncian per (peserta, sesi). Lihat `TODO(BFF)` di `api/ujian/[action].ts`.
- Rate limit bersama (Redis/KV).
- Penyimpanan objek untuk berkas (DrivePAM).
