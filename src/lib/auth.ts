import type { User } from './types'

/**
 * Autentikasi Super UNPAM — login dilakukan DI DALAM aplikasi (tidak redirect ke situs lain).
 * TODO(BFF): POST /api/auth/login { username, password } → BFF memverifikasi ke direktori
 * akun kampus, lalu mengembalikan sesi via cookie HttpOnly + Secure. Kredensial & token
 * TIDAK pernah disimpan di localStorage.
 */
export const DEMO_USER: User = {
  name: 'DEA SAKA KURNIA PUTRA',
  nim: '231011400001',
  role: 'MAHASISWA',
  prodi: 'Teknik Informatika',
  fakultas: 'Fakultas Ilmu Komputer',
  angkatan: '2023',
}

export async function login(username: string, password: string): Promise<User> {
  // Simulasi: terima NIM/NIDN/email + password minimal 6 karakter.
  await new Promise((r) => setTimeout(r, 500))
  if (!username.trim() || password.length < 6) throw new Error('NIM/email atau kata sandi salah.')
  return DEMO_USER
}
