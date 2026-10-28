/** Format rupiah dari bilangan bulat (tanpa pecahan). */
export const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')
