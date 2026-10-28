import { CalendarDays, CreditCard, Download, GraduationCap, IdCard, LayoutGrid, ListChecks, MapPin, Mic2, MoonStar, Newspaper } from 'lucide-react'
import type { Role } from '../../lib/types'
import { AplikasiSection, BeritaSection, EventSection, JadwalHariIniSection, LayananSection, TugasTerdekatSection } from './Sections'
import { IpkTile, KelasSekarangTile, KtmTile, SholatTile, TagihanTile } from './Tiles'
import type { HomeLayout } from './layout'
import type { WidgetDef } from './types'

const ALL: Role[] = ['MAHASISWA', 'DOSEN', 'TENDIK', 'ALUMNI']

// Urutan di sini = urutan bawaan Beranda. Peran mengikuti fitur sumber datanya (src/data/features.ts).
export const WIDGETS: WidgetDef[] = [
  { id: 'ktm', title: (t) => t.ktm, icon: IdCard, roles: ALL, size: 'lebar', kind: 'tile', component: KtmTile },
  { id: 'kelas', title: (t) => t.classNow, icon: MapPin, roles: ['MAHASISWA', 'DOSEN', 'TENDIK'], size: 'lebar', kind: 'tile', component: KelasSekarangTile },
  { id: 'ipk', title: (t) => t.ipk, icon: GraduationCap, roles: ['MAHASISWA'], size: 'kecil', kind: 'tile', component: IpkTile },
  { id: 'tagihan', title: (t) => t.bills, icon: CreditCard, roles: ['MAHASISWA'], size: 'kecil', kind: 'tile', component: TagihanTile },
  { id: 'layanan', title: (t) => t.features, icon: LayoutGrid, roles: ALL, size: 'lebar', kind: 'section', component: LayananSection },
  { id: 'aplikasi', title: (t) => t.appsSection, icon: Download, roles: ALL, size: 'lebar', kind: 'section', component: AplikasiSection },
  { id: 'jadwal', title: (t) => t.today, icon: CalendarDays, roles: ['MAHASISWA', 'DOSEN'], size: 'kecil', kind: 'section', component: JadwalHariIniSection },
  { id: 'tenggat', title: (t) => t.dueSoon, icon: ListChecks, roles: ['MAHASISWA', 'DOSEN'], size: 'kecil', kind: 'section', component: TugasTerdekatSection },
  { id: 'berita', title: (t) => t.news, icon: Newspaper, roles: ALL, size: 'lebar', kind: 'section', component: BeritaSection },
  // Widget baru: tersembunyi bawaan supaya Beranda pengguna lama tidak berubah.
  { id: 'event', title: (t) => t.events, icon: Mic2, roles: ALL, size: 'lebar', kind: 'section', component: EventSection },
  { id: 'sholat', title: (t) => t.prayer, icon: MoonStar, roles: ALL, size: 'kecil', kind: 'tile', component: SholatTile },
]

export const WIDGET_IDS = WIDGETS.map((w) => w.id)
export const HIDDEN_BY_DEFAULT = ['event', 'sholat']
export const DEFAULT_LAYOUT: HomeLayout = { order: WIDGET_IDS, hidden: HIDDEN_BY_DEFAULT }

export const widgetById = (id: string) => WIDGETS.find((w) => w.id === id)
