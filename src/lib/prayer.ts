// Perhitungan jadwal sholat lokal (tanpa API/aset) — parameter Kemenag RI:
// Subuh -20°, Isya -18°, Asar mazhab Syafi'i (bayangan = 1×), ihtiyath +2 menit.
/** Titik acuan jadwal sholat bila lokasi pengguna tidak dipakai. TODO: koordinat resmi kampus. */
export const CAMPUS_LOCATION = { lat: -6.3431, lng: 106.7386, name: 'Kampus Pamulang' }

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const fix = (a: number, b: number) => ((a % b) + b) % b

function sun(jd: number) {
  const D = jd - 2451545.0
  const g = fix(357.529 + 0.98560028 * D, 360)
  const q = fix(280.459 + 0.98564736 * D, 360)
  const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360)
  const e = 23.439 - 0.00000036 * D
  const RA = fix(deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15, 24)
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))))
  const eqt = q / 15 - RA
  return { decl, eqt: eqt > 12 ? eqt - 24 : eqt < -12 ? eqt + 24 : eqt }
}

export interface PrayerTimes {
  Subuh: Date
  Terbit: Date
  Dzuhur: Date
  Asar: Date
  Maghrib: Date
  Isya: Date
}

export function prayerTimes(date: Date, lat: number, lng: number): PrayerTimes {
  const tz = -date.getTimezoneOffset() / 60
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  // Julian Day pada tengah hari lokal
  const A = Math.floor((14 - m) / 12)
  const Y = y + 4800 - A
  const M = m + 12 * A - 3
  const jd = d + Math.floor((153 * M + 2) / 5) + 365 * Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) - 32045 - lng / 360
  const { decl, eqt } = sun(jd)
  const noon = 12 + tz - lng / 15 - eqt
  // sudut jam untuk ketinggian matahari h (derajat)
  const ha = (h: number) => deg(Math.acos((Math.sin(rad(h)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl))))) / 15
  const asrAlt = deg(Math.atan(1 / (1 + Math.tan(rad(Math.abs(lat - decl))))))
  const IHTIYATH = 2 / 60
  const at = (hours: number) => {
    const t = new Date(y, m - 1, d, 0, 0, 0)
    t.setSeconds(Math.round(hours * 3600))
    return t
  }
  return {
    Subuh: at(noon - ha(-20) + IHTIYATH),
    Terbit: at(noon - ha(-0.833) - IHTIYATH),
    Dzuhur: at(noon + IHTIYATH),
    Asar: at(noon + ha(asrAlt) + IHTIYATH),
    Maghrib: at(noon + ha(-0.833) + IHTIYATH),
    Isya: at(noon + ha(-18) + IHTIYATH),
  }
}

/** Arah kiblat (derajat dari utara searah jarum jam) menuju Ka'bah. */
export function qibla(lat: number, lng: number) {
  const k = { lat: 21.4225, lng: 39.8262 }
  const dL = rad(k.lng - lng)
  const b = Math.atan2(Math.sin(dL), Math.cos(rad(lat)) * Math.tan(rad(k.lat)) - Math.sin(rad(lat)) * Math.cos(dL))
  return fix(deg(b), 360)
}
