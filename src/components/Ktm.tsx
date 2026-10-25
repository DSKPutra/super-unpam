import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { User } from '../lib/types'

export function KtmQr({ user }: { user: User }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    // TODO(LPTI): payload ditandatangani BFF (mis. JWT berumur pendek), bukan data mentah
    const payload = JSON.stringify({ nim: user.nim, role: user.role, ts: Math.floor(Date.now() / 60000) })
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: '#0a3f83', light: '#ffffff' } }).then(setSrc)
  }, [user])
  return src ? <img src={src} alt={`QR KTM ${user.nim}`} className="h-48 w-48 rounded-xl bg-white p-2" /> : <div className="h-48 w-48" />
}
