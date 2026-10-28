import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { Dict } from '../../lib/i18n'
import type { Bill, CampusEvent, NewsItem, Role, ScheduleItem, Task, User } from '../../lib/types'
import type { Resource } from '../../lib/useResource'

/** Data Beranda yang dipakai lebih dari satu widget: dimuat sekali di Home, lalu dibagikan. */
export interface HomeData {
  schedule: Resource<ScheduleItem[]>
  events: Resource<CampusEvent[]>
  news: Resource<NewsItem[]>
  bills: Resource<Bill[]>
  tasks: Resource<Task[]>
}

export interface WidgetProps {
  t: Dict
  user: User
  go: (route: string) => void
  favorites: string[]
  data: HomeData
}

export interface WidgetDef {
  id: string
  title: (t: Dict) => string
  icon: LucideIcon
  roles: readonly Role[]
  /** 'kecil' = setengah lebar (tile 1 kolom / bagian berdampingan di layar lebar); 'lebar' = penuh. */
  size: 'kecil' | 'lebar'
  /** 'tile' masuk kisi bento di atas; 'section' tampil sebagai bagian berjudul. */
  kind: 'tile' | 'section'
  component: ComponentType<WidgetProps>
}
