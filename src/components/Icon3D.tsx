import type { LucideIcon } from 'lucide-react'

// Ikon 3D ringan (opsi "c" di brief): tile glossy berlapis dari CSS + glyph SVG.
// Cahaya dari kiri-atas ~45°, rim-light neon, bayangan lembut (gradient, bukan filter blur —
// ikon ini muncul puluhan kali per layar). Tanpa aset raster →
// tajam di semua resolusi dan tidak membebani Lighthouse. Bisa diganti render 3D (PNG/WebP) bertahap.
export function Icon3D({ icon: Icon, from, to, size = 52, label }: { icon: LucideIcon; from: string; to: string; size?: number; label?: string }) {
  const r = Math.round(size * 0.32)
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="relative inline-flex shrink-0 items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5"
      style={{ width: size, height: size }}
    >
      {/* bayangan jatuh berwarna */}
      <span className="absolute inset-x-[4%] -bottom-[14%] h-[38%] rounded-full opacity-60" style={{ background: `radial-gradient(closest-side, ${to}, transparent)` }} />
      {/* badan tile */}
      <span
        className="absolute inset-0"
        style={{
          borderRadius: r,
          background: `linear-gradient(145deg, ${from} 0%, ${to} 100%)`,
          boxShadow: `inset 1.5px 1.5px 0 rgba(255,255,255,.45), inset -2px -3px 6px rgba(0,0,0,.28), 0 0 0 1px rgba(255,255,255,.08), 0 6px 16px -6px ${to}`,
        }}
      />
      {/* kilau kaca di atas */}
      <span
        className="absolute inset-x-[8%] top-[6%] h-[46%]"
        style={{ borderRadius: `${r}px ${r}px ${r * 2}px ${r * 2}px / ${r}px ${r}px ${r}px ${r}px`, background: 'linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0))' }}
      />
      {/* glyph */}
      <Icon className="relative text-white" style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.2} />
    </span>
  )
}
