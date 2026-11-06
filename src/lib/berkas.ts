// Membaca berkas pilihan pengguna di peramban (untuk hash SHA-256 sebelum dikirim).

/** Isi berkas sebagai ArrayBuffer; FileReader sebagai cadangan untuk WebView lama tanpa Blob.arrayBuffer. */
export function bacaBerkas(f: File): Promise<ArrayBuffer> {
  if (typeof f.arrayBuffer === 'function') return f.arrayBuffer()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as ArrayBuffer)
    r.onerror = () => reject(new Error('Berkas tidak dapat dibaca.'))
    r.readAsArrayBuffer(f)
  })
}
