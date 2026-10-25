export type Role = 'MAHASISWA' | 'DOSEN' | 'TENDIK' | 'ALUMNI'

export interface ModuleDef {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  tags: string[]
  roles: Role[]
  render: 'native' | 'webview' | 'deeplink'
  url: string
  priority: number
  todo?: string
}

export interface ModuleConfig {
  version: number
  updatedAt: string
  categories: string[]
  modules: ModuleDef[]
}

export interface User {
  name: string
  nim: string
  role: Role
  prodi: string
  fakultas: string
  angkatan: string
}

export type View = 'home' | 'dashboard' | 'notifications' | 'profile' | 'settings'
