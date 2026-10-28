// Tata letak Beranda yang disimpan pengguna (usePref 'home.widgets'). Fungsi murni: tanpa React,
// supaya bisa diuji langsung (layout.test.ts).

export interface HomeLayout {
  order: string[]
  hidden: string[]
}

/**
 * Merapikan tata letak hasil baca penyimpanan terhadap daftar widget yang dikenal:
 * id tidak dikenal dan duplikat dibuang, widget yang belum tercatat ditambahkan di akhir
 * (tersembunyi bila termasuk `hiddenByDefault`), dan bentuk data rusak diganti bawaan.
 */
export function normalizeLayout(raw: unknown, known: readonly string[], hiddenByDefault: readonly string[] = []): HomeLayout {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof HomeLayout, unknown>>
  const ids = (list: unknown) => (Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string' && known.includes(x)) : [])
  const order = [...new Set(ids(value.order))]
  const hidden = new Set(ids(value.hidden))
  for (const id of known) {
    if (order.includes(id)) continue
    order.push(id)
    if (hiddenByDefault.includes(id)) hidden.add(id)
  }
  return { order, hidden: order.filter((id) => hidden.has(id)) }
}

/** Memindahkan `id` satu langkah; posisi di luar batas tidak mengubah apa pun. */
export function moveWidget(layout: HomeLayout, id: string, delta: -1 | 1): HomeLayout {
  const from = layout.order.indexOf(id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= layout.order.length) return layout
  const order = [...layout.order]
  ;[order[from], order[to]] = [order[to], order[from]]
  return { ...layout, order }
}

export function toggleWidget(layout: HomeLayout, id: string): HomeLayout {
  const hidden = layout.hidden.includes(id) ? layout.hidden.filter((x) => x !== id) : [...layout.hidden, id]
  return { ...layout, hidden: layout.order.filter((x) => hidden.includes(x)) }
}
