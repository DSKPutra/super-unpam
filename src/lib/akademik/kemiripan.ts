// Cek kemiripan JUDUL sederhana (Jaccard kata) untuk peringatan dini saat mengajukan judul.
// BUKAN pengganti cek plagiasi resmi; basis data judul sungguhan dicek di server (TODO BFF).

const STOP = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'pada', 'dengan', 'dalam', 'atau', 'sebagai', 'studi', 'kasus', 'menggunakan', 'berbasis', 'the', 'of', 'a', 'an', 'in', 'on', 'for', 'using'])

export const tokenJudul = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )

export function kemiripan(a: string, b: string): number {
  const A = tokenJudul(a)
  const B = tokenJudul(b)
  if (!A.size || !B.size) return 0
  let irisan = 0
  for (const w of A) if (B.has(w)) irisan++
  return irisan / (A.size + B.size - irisan)
}

/** Judul yang kemiripannya ≥ ambang, urut paling mirip. */
export function judulMirip(judul: string, daftar: string[], ambang: number) {
  return daftar
    .map((j) => ({ judul: j, skor: kemiripan(judul, j) }))
    .filter((x) => x.skor >= ambang)
    .sort((x, y) => y.skor - x.skor)
}
