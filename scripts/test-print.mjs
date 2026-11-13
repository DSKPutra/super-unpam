// Uji tampilan cetak kartu ujian (U03): emulasi media print → PDF.
// Pakai: jalankan `npm run build && npx vite preview --port 4173`, lalu `npm run test:print`.
// Butuh Google Chrome terpasang (playwright-core memakai channel 'chrome', tanpa unduh browser).
// Opsional di CI: set PRINT_TEST_URL dan pasang Chrome di runner.
import { chromium } from 'playwright-core'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { writeFile } from 'node:fs/promises'

const BASE = process.env.PRINT_TEST_URL ?? 'http://localhost:4173'
const OUT = process.env.PRINT_TEST_OUT ?? 'print-test-kartu-ujian.pdf'
const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exitCode = 1
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage()
  // Mode demo: masuk dengan akun contoh lewat form, lewati onboarding.
  await page.goto(BASE)
  await page.evaluate(() => {
    localStorage.setItem('su:onboarded', 'true')
    localStorage.setItem('su:role', '"MAHASISWA"')
  })
  await page.reload()
  await page.fill('input[autocomplete="username"]', '231011400001')
  await page.fill('input[type="password"]', 'demo-uji-cetak')
  await page.press('input[type="password"]', 'Enter')
  await page.waitForSelector('nav, aside', { state: 'attached' })
  await page.goto(`${BASE}/#/ujian`)
  await page.waitForSelector('.print-doc .pd-qr', { state: 'attached' })
  await page.emulateMedia({ media: 'print' })

  const vis = await page.evaluate(() => ({
    root: getComputedStyle(document.getElementById('root')).display,
    doc: getComputedStyle(document.querySelector('.print-doc')).display,
    navVisible: [...document.querySelectorAll('nav, aside')].some((el) => el.getClientRects().length > 0),
  }))
  if (vis.root !== 'none') fail(`aplikasi masih tampil saat cetak (#root display: ${vis.root})`)
  if (vis.doc !== 'block') fail(`dokumen cetak tidak tampil (display: ${vis.doc})`)
  if (vis.navVisible) fail('elemen navigasi tampil saat cetak')
  const head = await page.evaluate(() => getComputedStyle(document.querySelector('.print-doc .pd-head')).display)
  if (head === 'none') fail('kepala kartu (logo & judul) tersembunyi saat cetak')

  // QR harus terbaca dan hanya berisi ID kartu (tanpa NIM).
  const png = PNG.sync.read(await page.locator('.print-doc .pd-qr').screenshot({ scale: 'device' }))
  const qr = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)
  if (!qr) fail('QR tidak terbaca')
  else if (!/^SUPERUNPAM:UJIAN:KU-[A-Z0-9-]+$/.test(qr.data)) fail(`isi QR tidak sesuai: ${qr.data}`)
  else console.log(`✓ QR terbaca: ${qr.data}`)

  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
  if (pages < 1 || pages > 2) fail(`PDF ${pages} halaman (harus 1–2)`)
  else console.log(`✓ PDF ${pages} halaman`)
  await writeFile(OUT, pdf)
  console.log(`✓ PDF disimpan di ${OUT}`)
} finally {
  await browser.close()
}
if (!process.exitCode) console.log('✓ Uji cetak kartu ujian lulus')
