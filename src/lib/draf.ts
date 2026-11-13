// Prefiks penyimpanan draf kuesioner. Modul kecil terpisah supaya api.ts (bundel awal) bisa menghapus
// draf saat keluar akun tanpa ikut memuat seluruh mesin kuesioner.
export const DRAF_PREFIX = 'su:kuesioner:draf:'

export function hapusSemuaDraf() {
  for (const s of [localStorage, sessionStorage]) {
    try {
      for (const key of Object.keys(s)) if (key.startsWith(DRAF_PREFIX)) s.removeItem(key)
    } catch {
      /* abaikan */
    }
  }
}
