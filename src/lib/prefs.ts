import { useEffect, useState } from 'react'

// Hanya preferensi UI (tema, bahasa, favorit). Token/kredensial TIDAK disimpan di sini.
export function usePref<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`su:${key}`)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(`su:${key}`, JSON.stringify(value))
    } catch {
      /* storage tidak tersedia */
    }
  }, [key, value])
  return [value, setValue] as const
}
