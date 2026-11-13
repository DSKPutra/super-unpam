// Mencetak satu dokumen .print-doc tertentu. Beberapa dokumen cetak bisa terpasang sekaligus
// (kartu bimbingan, lembar pengesahan, berita acara); tanpa ini semuanya ikut tercetak.
// CSS: html[data-cetak] .print-doc:not([data-aktif]) disembunyikan (src/index.css).

export function cetak(id: string) {
  const root = document.documentElement
  const esc = globalThis.CSS?.escape ?? ((x: string) => x.replace(/["\\]/g, '\\$&'))
  const el = document.querySelector<HTMLElement>(`.print-doc[data-doc="${esc(id)}"]`)
  const bersihkan = () => {
    root.removeAttribute('data-cetak')
    el?.removeAttribute('data-aktif')
    window.removeEventListener('afterprint', bersihkan)
  }
  root.setAttribute('data-cetak', '')
  el?.setAttribute('data-aktif', '')
  window.addEventListener('afterprint', bersihkan)
  // Beri React satu frame untuk merender perubahan terakhir (mis. waktu cetak) sebelum dialog dibuka.
  requestAnimationFrame(() => window.print())
}
