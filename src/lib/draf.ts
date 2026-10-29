// Prefiks penyimpanan draf kuesioner. Modul kecil terpisah supaya api.ts (bundel awal) bisa menghapus
// draf saat keluar akun tanpa ikut memuat seluruh mesin kuesioner.
export const DRAF_PREFIX = 'su:kuesioner:draf:'
/** Prefiks lain yang juga berisi isian pribadi dan dihapus saat keluar akun (draf/data contoh skripsi). */
const PREFIX_LAIN = ['su:ta:', 'su:ujian-daring:']

export function hapusSemuaDraf() {
  for (const s of [localStorage, sessionStorage]) {
    try {
      for (const key of Object.keys(s)) if ([DRAF_PREFIX, ...PREFIX_LAIN].some((p) => key.startsWith(p))) s.removeItem(key)
    } catch {
      /* abaikan */
    }
  }
}
