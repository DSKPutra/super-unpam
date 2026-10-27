# Super UNPAM: Design System "Futuristic Campus OS"

Ini adalah kulit visual v0.3. Arsitektur, fitur, dan alurnya tidak berubah.
Sumber kebenaran token: `src/index.css`.

## Arah
- **Dark-first**: tema gelap jadi default, lalu ada tema terang dan "Sistem" (ikut OS).
- Gaya visual: **glassmorphism** (kartu kaca, blur 20px, border hairline), **neon glow lembut**, latar **aurora** (orb biru/violet/cyan bergerak sangat pelan).
- Layout **bento grid** di Beranda: tile KTM besar, presensi, dan stat IPK/tagihan dengan sparkline. Spasi mengikuti grid 8pt.
- Tipografi: **Space Grotesk** (heading) dan **Plus Jakarta Sans** (body), self-hosted lewat `@fontsource` sehingga CSP tetap `'self'`.

## Token warna
| Token | Gelap | Terang |
|---|---|---|
| `--bg-800` (latar) | `#0A0E1A` | `#F4F7FE` |
| `--bg-900` (latar terdalam) | `#070B14` | `#EEF2FC` |
| `--surface` | `#111726` | `#FFFFFF` |
| `--glass` | `rgba(255,255,255,.06)` | `rgba(255,255,255,.72)` |
| `--line` | `rgba(255,255,255,.08)` | `rgba(11,18,34,.08)` |
| `--primary` | `#2D6BFF` | `#1B4BE0` |
| `--cyan` | `#00D4FF` | `#0369A1`* |
| `--violet` | `#7A5CFF` | `#6246EA` |
| `--mint` | `#00E5C0` | `#047857`* |
| `--amber` | `#FFB020` | `#92400E`* |
| `--rose` | `#FF4D6D` | `#D6294B` |
| `--text-hi` / `--text-mid` / `--text-low` | `#EAF0FF` / `#9AA7C7` / `#7D8BAB`* | `#0B1222` / `#4A5775` / `#5F6B86` |
| `--grad-primary` (dekoratif) | `#2D6BFF → #00D4FF` | `#1B4BE0 → #0284C7` |
| `--grad-button` (tombol berteks putih) | `#2D6BFF → #0A6FD6` | `#1B4BE0 → #0369A1` |

\* Token bertanda bintang digelapkan atau dicerahkan dari nilai brief supaya lulus WCAG AA saat dipakai sebagai **teks**:
- `text-low` gelap: dari `#64728F` (3.98:1) menjadi `#7D8BAB`.
- Cyan/mint/amber terang: `#00A8E8` 2.70:1, `#00A88C` 3.01:1, `#B86E00` 3.99:1, semuanya tidak lulus. Nilai aslinya tetap boleh dipakai untuk dekorasi (gradient, glow).

Token dipetakan ke Tailwind lewat `@theme inline`, misalnya `text-hi`, `text-mid`, `bg-glass`, `border-line`, `text-cyan`. Tema diatur dengan `data-theme="dark|light"` pada `<html>`.

## Bukti kontras (WCAG AA ≥ 4.5:1)
| Tema | Pasangan | Rasio |
|---|---|---|
| Gelap | text-hi di latar | 16.88:1 |
| Gelap | text-mid di kartu kaca | 7.05:1 |
| Gelap | text-low di kartu kaca | 4.97:1 |
| Gelap | cyan / mint / amber / rose di kartu kaca | 9.58 / 10.48 / 9.27 / 5.28 :1 |
| Gelap | putih di tombol (ujung tergelap–terterang) | 4.51 – 4.93 :1 |
| Terang | text-hi di latar | 17.42:1 |
| Terang | text-mid / text-low di kartu | 7.21 / 5.34 :1 |
| Terang | cyan / mint / amber / rose di kartu | 5.93 / 5.48 / 7.09 / 4.91 :1 |
| Terang | putih di tombol | 5.93 – 6.71 :1 |

Makna status tidak bergantung pada warna saja: status selalu disertai ikon atau label (mis. "Belum bayar", "▲ naik", badge teks).

## Ikon 3D
`src/components/Icon3D.tsx` memakai opsi **(c)** dari brief: tile glossy berlapis dari CSS, dengan glyph SVG dari Lucide.
- Lapisannya: badan gradient per modul, kilau kaca di atas, inner-shadow (cahaya dari kiri-atas sekitar 45°), rim hairline, dan bayangan jatuh berwarna.
- Saat hover, tile miring ringan dalam 3D (`rotateX/rotateY`).
- Tanpa aset raster, jadi tajam di semua DPI, ringan, dan bisa dipakai offline.
- Warna tiap modul ada di `src/data/features.ts` (`from` / `to`).
- Ke depan bisa diganti bertahap ke render 3D (Blender/Spline → WebP @1x–3x) tanpa mengubah API komponen.

## Gerak
| Elemen | Durasi | Easing |
|---|---|---|
| Masuk halaman (fade + naik 8px) | 350ms | `cubic-bezier(.2,.8,.2,1)` |
| Hover kartu (lift 2px + glow) | 250ms | `cubic-bezier(.2,.8,.2,1)` |
| Tap (scale .98) | 200ms | ease |
| Flip KTM | 700ms | ease |
| Kilau hologram KTM | 5s loop | ease-in-out |
| Orb aurora | 26–38s loop | ease-in-out |

- Semua animasi hanya memakai `transform` dan `opacity`.
- `prefers-reduced-motion: reduce` mematikan animasi dan transisi.
- **Mode hemat efek** (Profil → Tema) mematikan blur, glow, aurora, dan semua animasi. Cocok untuk HP kelas bawah atau mode hemat data.

## Aksesibilitas
- Tap target minimal 44px (`min-h-11`).
- `:focus-visible` memakai outline cyan.
- Tombol ikon punya `aria-label`, dan elemen aktif memakai `aria-current`/`aria-pressed`.
- Dialog memakai `role="dialog"` dan `aria-modal`.
