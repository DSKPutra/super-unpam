# Aturan Ujian dan Skripsi/Tugas Akhir (T00)

Status: **belum diverifikasi**. Belum ada dokumen resmi UNPAM di `docs/referensi-akademik/`, jadi setiap aturan di bawah bertanda `TODO(BAAK)`. Aplikasi tetap berjalan memakai **nilai contoh berlabel** dari `src/data/aturan-akademik.ts`. Di layar, nilai contoh ini ditandai "Aturan contoh".

## Cara melengkapi
1. Pemilik repo menaruh dokumen resmi di `docs/referensi-akademik/`. Jangan di-commit kalau dokumennya tidak publik. Dokumen yang dibutuhkan:
   - pedoman akademik UNPAM
   - pedoman skripsi/TA fakultas atau prodi
   - SK atau panduan UTS/UAS
   - panduan sidang, formulir bimbingan, rubrik penilaian
   - penjelasan resmi istilah UAPS
2. Isi nilai di `src/data/aturan-akademik.ts`. Untuk tiap konfigurasi, isi `sumber.dokumen`, `sumber.halaman`, dan `sumber.diverifikasi` (tanggal).
3. Kalau prodi punya aturan berbeda, tambahkan entri baru di `DAFTAR_ATURAN` dengan `prodi` persis seperti `User.prodi`. Fungsi `aturanUntukProdi()` akan memilihnya otomatis. Kalau tidak ada entri khusus, prodi memakai aturan umum (`'*'`).
4. Setiap konfigurasi divalidasi saat dimuat (`validasiAturan`). Konfigurasi yang tidak lengkap atau tidak konsisten ditolak dengan pesan yang jelas.

## Glosarium
| Istilah | Arti | Sumber |
|---|---|---|
| UTS / UAS | Ujian Tengah / Akhir Semester | umum, TODO(BAAK) konfirmasi istilah resmi |
| Ujian susulan | Ujian pengganti bagi yang berhalangan dengan alasan sah | TODO(BAAK) |
| Remedial | Ujian perbaikan nilai | TODO(BAAK): ada atau tidak di UNPAM? |
| **UAPS** | **Belum diketahui.** Tidak ditemukan di sumber publik UNPAM, jadi sengaja tidak ditebak. Di aplikasi, UAPS adalah satu jenis ujian akhir yang nama dan aturannya dikonfigurasi. | TODO(BAAK) |
| Seminar proposal / hasil, sidang | Tahapan ujian akhir skripsi/TA | TODO(BAAK) urutan & nama resmi per prodi |

## Jenis ujian dan syarat (nilai contoh)
| Jenis | Kehadiran | Keuangan | Bimbingan min. | Penguji | Durasi | Berkas |
|---|---|---|---|---|---|---|
| UTS / UAS | ≥ 75% per MK | lunas | – | pengawas | sesuai jadwal | kartu ujian |
| Susulan / Remedial | ≥ 75% | lunas | – | pengawas | sesuai jadwal | bukti alasan (mis. surat dokter), diajukan ≤ H+3 |
| Seminar Proposal | – | lunas | 4 | 2 (bukan pembimbing) | 90 menit | naskah, lembar persetujuan, kartu bimbingan |
| Seminar Hasil | – | lunas | 6 | 2 | 90 menit | idem |
| UAPS | – | lunas | 8 | 2 | 90 menit | idem (aturan belum diketahui) |
| Sidang Akhir | – | lunas | 8 | 3 | 120 menit | idem + surat hasil cek kemiripan |

Syarat mulai skripsi (contoh): minimal 110 SKS, IPK ≥ 2,00, lulus Metodologi Penelitian. Judul maksimal 200 karakter. Ada 3 pilihan pembimbing, dan kuota default 10 mahasiswa per dosen.

## Alur skripsi/TA (mesin status `src/lib/akademik/alur-skripsi.ts`)
```
DRAF_JUDUL → DIAJUKAN → DISETUJUI_PEMBIMBING → BIMBINGAN → LAYAK_PROPOSAL → UJIAN_PROPOSAL
   ↑            ↓ (TOLAK, wajib alasan)                         ↓ LULUS_DENGAN_REVISI → REVISI_PROPOSAL
   └──── DITOLAK (AJUKAN_ULANG, riwayat tetap)                  ↓ LULUS / REVISI_DISETUJUI
PENELITIAN → LAYAK_UJIAN_AKHIR → UJIAN_AKHIR → (REVISI_AKHIR) → YUDISIUM → SELESAI
TIDAK_LULUS: UJIAN_PROPOSAL → BIMBINGAN, UJIAN_AKHIR → PENELITIAN
```
| Langkah | Pelaku | Keputusan | Batas waktu |
|---|---|---|---|
| Ajukan judul | Mahasiswa | – | TODO(BAAK) |
| Setujui/tolak + tetapkan pembimbing | Prodi / calon pembimbing | setuju / tolak + alasan | TODO(BAAK) |
| Bimbingan | Mahasiswa + pembimbing | verifikasi entri | pengingat bila >14 hari tanpa bimbingan (contoh) |
| Layak ujian | Pembimbing | layak / belum | – |
| Ujian | Penguji | lulus / lulus dengan revisi / tidak lulus | – |
| Revisi | Penguji | setujui per butir | 30 hari (contoh) |
| Yudisium & wisuda | Fakultas / BAAK | – | TODO(BAAK) |

## Rubrik dan nilai (contoh)
- **Kriteria dan bobot:** naskah 30%, metode & analisis 30%, presentasi 20%, tanya jawab 20%. Skor tiap kriteria 0–100.
- **Nilai pratinjau:** rata-rata berbobot, dibulatkan 2 desimal, lalu dikonversi ke huruf mutu A (≥85) sampai E (<40). Nilai ini selalu berlabel **perkiraan**. Nilai resmi berasal dari server.
- **Rapat kesepakatan:** bila selisih nilai antar penguji lebih dari 15 poin, aplikasi menandai perlunya rapat.
- **TODO(BAAK):** rumus resmi, apakah nilai pembimbing ikut dihitung, ambang kelulusan, dan bobot tiap tahap.

## Perbedaan antar prodi
Ditangani sebagai konfigurasi, bukan cabang kode. Setiap prodi bisa punya entri `AturanAkademik` sendiri. Isinya bisa berbeda di jenis ujian akhir yang aktif (`aktif: false` untuk tahap yang tidak dipakai), jumlah penguji, rubrik, dan syarat SKS/IPK.

## Pertanyaan terbuka untuk BAAK
| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Apa kepanjangan dan aturan **UAPS**? Di tahap mana posisinya (pengganti sidang, atau tambahan)? | |
| 2 | Ambang kehadiran minimal untuk ikut UTS/UAS? Per MK atau rata-rata? | |
| 3 | Apakah ujian susulan dan remedial ada? Batas pengajuan dan biayanya? | |
| 4 | Syarat mulai skripsi: SKS minimal, IPK minimal, MK wajib? | |
| 5 | Jumlah bimbingan minimum sebelum tiap ujian akhir? | |
| 6 | Komposisi penguji: jumlah, boleh pembimbing atau tidak, syarat jabatan? | |
| 7 | Rubrik, bobot, rumus nilai akhir, ambang lulus, huruf mutu? | |
| 8 | Batas waktu revisi pasca ujian? | |
| 9 | Kebijakan publikasi naskah di repositori (terbuka / embargo / internal)? | |
| 10 | Layanan cek kemiripan/plagiasi resmi dan ambangnya? | |
| 11 | Tanda tangan elektronik resmi untuk berita acara & lembar pengesahan? | |
| 12 | Kuota bimbingan per dosen? | |
| 13 | Apakah ada ujian daring? Kalau ada, apa kebijakan pengawasan dan privasinya? (menentukan T09) | |
