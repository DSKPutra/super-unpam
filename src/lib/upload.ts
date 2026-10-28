// Unggah berkas (draf, revisi, bukti, naskah final) lewat antarmuka transport yang bisa diganti.
// Berkas mahasiswa TIDAK disimpan di repo atau localStorage. Transport demo hanya menghitung
// metadata (nama, ukuran, hash) dan membuang isinya. TODO(DrivePAM): transport penyimpanan resmi.

export interface AturanUnggah {
  tipe: string[]
  maksMB: number
}

export interface MetaBerkas {
  id: string
  nama: string
  ukuran: number
  tipe: string
  sha256: string
  diunggah: string
}

export interface TransportUnggah {
  unggah(file: File, sha256: string, onProgres: (persen: number) => void, signal?: AbortSignal): Promise<MetaBerkas>
}

const EKSTENSI: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' }

export const labelTipe = (tipe: string[]) => tipe.map((t) => EKSTENSI[t] ?? t).join(', ')
export const formatUkuran = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/** Galat yang bisa dibaca pengguna, atau null bila berkas memenuhi aturan. */
export function validasiBerkas(f: Pick<File, 'name' | 'size' | 'type'>, a: AturanUnggah): string | null {
  if (!a.tipe.includes(f.type)) return `Tipe berkas "${f.name}" tidak diterima. Gunakan ${labelTipe(a.tipe)}.`
  if (f.size === 0) return `Berkas "${f.name}" kosong.`
  if (f.size > a.maksMB * 1048576) return `Ukuran ${formatUkuran(f.size)} melebihi batas ${a.maksMB} MB.`
  return null
}

/** SHA-256 heksadesimal dari isi berkas (Web Crypto). */
export async function sha256(data: Blob | ArrayBuffer): Promise<string> {
  const buf = data instanceof Blob ? await data.arrayBuffer() : data
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Transport DEMO: progres disimulasikan, isi berkas TIDAK disimpan di mana pun. */
export const transportDemo: TransportUnggah = {
  unggah(file, hash, onProgres, signal) {
    return new Promise((resolve, reject) => {
      let p = 0
      const id = setInterval(() => {
        if (signal?.aborted) {
          clearInterval(id)
          return reject(new DOMException('Dibatalkan', 'AbortError'))
        }
        p = Math.min(100, p + 20)
        onProgres(p)
        if (p === 100) {
          clearInterval(id)
          resolve({ id: `demo-${hash.slice(0, 12)}`, nama: file.name, ukuran: file.size, tipe: file.type, sha256: hash, diunggah: new Date().toISOString() })
        }
      }, 120)
    })
  },
}

/** Validasi → hash → unggah. Satu pintu untuk semua fitur. */
export async function unggahBerkas(file: File, aturan: AturanUnggah, onProgres: (persen: number) => void, transport: TransportUnggah = transportDemo, signal?: AbortSignal) {
  const galat = validasiBerkas(file, aturan)
  if (galat) throw new Error(galat)
  const hash = await sha256(file)
  return transport.unggah(file, hash, onProgres, signal)
}
