import type { User } from '../lib/types'

/** Foto profil pengguna; bila tidak ada, inisial dua kata pertama nama. Ukuran & bentuk dari className. */
export function Avatar({ user, className = '' }: { user: Pick<User, 'name' | 'foto'>; className?: string }) {
  const inisial = user.name.split(' ').slice(0, 2).map((w) => w[0]).join('')
  if (user.foto) return <img src={user.foto} alt={`Foto ${user.name}`} className={`shrink-0 object-cover object-top ${className}`} loading="lazy" decoding="async" />
  return (
    <div aria-hidden className={`flex shrink-0 items-center justify-center font-bold ${className}`}>
      {inisial}
    </div>
  )
}
