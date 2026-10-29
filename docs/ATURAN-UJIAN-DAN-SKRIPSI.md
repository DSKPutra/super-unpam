# Aturan ujian dan skripsi: pertanyaan untuk BAAK/fakultas (T00)

Status: **BELUM ADA DOKUMEN RESMI.** Prompt T00 meminta pedoman akademik, pedoman skripsi/tugas akhir, SK/panduan UTS–UAS, panduan sidang, rubrik, dan penjelasan resmi istilah UAPS diletakkan di `docs/referensi-akademik/`. Folder itu belum ada, jadi dokumen ini hanya berisi pertanyaan. Tidak ada aturan yang ditulis dari tebakan.

Mesin di `src/lib/akademik/` sudah membaca semua aturan dari `src/data/aturan-akademik.ts`. Setiap nilai di sana saat ini **nilai contoh** (`sumber: null`, `TODO(BAAK)`), dan UI wajib menandainya "contoh". Begitu jawaban di bawah tersedia, cukup isi berkas konfigurasi itu (beserta `sumber` dan `dicek`); kode tidak perlu diubah.

## Glosarium
| Istilah | Arti menurut dokumen resmi | Sumber (dokumen, halaman) |
|---|---|---|
| UAPS | belum diketahui | |

## Pertanyaan terbuka

Isi kolom jawaban dan sumbernya. Kosong = belum diketahui; aplikasi tetap memakai nilai contoh berlabel.

| # | Pertanyaan | Kunci konfigurasi | Jawaban | Sumber |
|---|---|---|---|---|
| 1 | Apa kepanjangan dan aturan UAPS? Apakah UAPS menggantikan seminar hasil atau sidang, atau tahap tersendiri? | `ujian[jenis=UAPS]` | | |
| 2 | Ambang kehadiran minimal untuk mengikuti UTS dan UAS (per mata kuliah)? Sama untuk semua prodi? | `syarat.kehadiran.minPersen` | | |
| 3 | Syarat administrasi keuangan untuk UTS/UAS: lunas semua tagihan, atau cicilan tertentu? | `syarat.keuangan` | | |
| 4 | Ujian susulan dan remedial: siapa yang berhak, alasan yang diterima, bukti, batas pengajuan (hari), biaya? | `ujian[SUSULAN/REMEDIAL]`, `batasPengajuanHari` | | |
| 5 | Jeda minimal antar ujian yang dianggap wajar (untuk peringatan "ujian beruntun")? | `jedaMinimalMenit` | | |
| 6 | Tata tertib resmi UTS/UAS dan ujian akhir? | `tataTertib` | | |
| 7 | Syarat mulai skripsi/TA: SKS minimal, IPK minimal, mata kuliah wajib (mis. metodologi)? | `syarat.sks/ipk/mk-wajib` | | |
| 8 | Jumlah bimbingan minimal sebelum proposal, seminar hasil/UAPS, dan sidang? | `syarat.bimbingan.minimal` | | |
| 9 | Berkas wajib tiap ujian akhir (naskah, lembar persetujuan, bebas pustaka, dll.) beserta format dan ukuran? | `syarat.berkas.wajib` | | |
| 10 | Komposisi penguji (jumlah, boleh pembimbing atau tidak) per jenis ujian akhir? | (T08) | | |
| 11 | Rubrik penilaian tiap ujian akhir: kriteria, bobot (%), skala skor? | `rubrik` | | |
| 12 | Rumus nilai akhir (rata-rata penguji? bobot pembimbing?), pembulatan, dan tabel huruf mutu? | `hurufMutu`, `desimal` | | |
| 13 | Ambang selisih nilai antar penguji yang memerlukan rapat kesepakatan? | `rubrik.ambangSelisih` | | |
| 14 | Batas waktu revisi setelah ujian proposal dan ujian akhir? | (T07) | | |
| 15 | Kuota mahasiswa bimbingan per dosen? Apakah berbeda per jabatan fungsional? | `kuotaBimbingan` | | |
| 16 | Maksimal panjang judul? Aturan perubahan judul/pembimbing? | `maksKarakterJudul` | | |
| 17 | Alur skripsi resmi dan siapa yang memutuskan di tiap langkah (pembimbing, prodi, fakultas)? Apakah sama dengan tabel di `src/lib/akademik/alur-skripsi.ts`? | `TABEL_ALUR` | | |
| 18 | Perbedaan aturan antar prodi/fakultas yang perlu konfigurasi khusus? | `ATURAN_PRODI` | | |
| 19 | Kebijakan publikasi naskah (terbuka/tertahan/internal), cek plagiasi, dan tanda tangan elektronik? | (T07) | | |
| 20 | Apakah ada ujian daring (T09) dan kebijakan pengawasannya? | (T09) | | |
