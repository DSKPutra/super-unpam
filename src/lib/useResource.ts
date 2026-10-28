import { useCallback, useEffect, useState } from 'react'

export interface Resource<T> {
  data?: T
  error?: Error
  loading: boolean
  reload: () => void
}

/**
 * Memuat data dari fungsi adapter (src/lib/api.ts) dengan state loading/error/data yang seragam.
 * `fn` sebaiknya fungsi modul (identitas stabil); data lama tetap tampil saat memuat ulang.
 */
export function useResource<T>(fn: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ data: s.data, loading: true }))
    fn().then(
      (data) => alive && setState({ data, loading: false }),
      (error: Error) => alive && setState((s) => ({ data: s.data, error, loading: false })),
    )
    return () => {
      alive = false
    }
  }, [fn, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, reload }
}
