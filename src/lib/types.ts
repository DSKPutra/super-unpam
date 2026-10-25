export type Role = 'MAHASISWA' | 'DOSEN' | 'TENDIK' | 'ALUMNI'

export interface User {
  name: string
  nim: string
  role: Role
  prodi: string
  fakultas: string
  angkatan: string
}
