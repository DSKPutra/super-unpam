# Distribusi Super UNPAM: Web, Android, iOS, Windows, macOS

Semua platform memakai **satu codebase PWA**. Wrapper hanya shell tipis yang memuat aplikasi yang sama.

| Platform | Install langsung (sudah jalan) | Versi toko / installer | Status |
|---|---|---|---|
| Web | Buka URL | – | ✅ |
| Android | Tombol **Install Aplikasi** (PWA) | Google Play via TWA (`distribution/android`) | Config siap; build butuh keystore |
| iOS / iPadOS | Safari → Tambahkan ke Layar Utama (ada panduan di aplikasi) | App Store via Capacitor (`distribution/ios`) | Config siap; build butuh Mac + Apple Developer |
| Windows | Edge/Chrome → Install | `.exe` / `.msi` via Tauri (**otomatis di GitHub Actions**) | ✅ otomatis |
| macOS | Safari "Add to Dock" / Chrome Install | `.dmg` universal via Tauri (**otomatis di GitHub Actions**) | ✅ otomatis (tanpa notarization) |

Halaman `/#/download` dan tombol Download di Beranda mendeteksi platform pengunjung secara otomatis. Link toko diisi di `src/components/DownloadCTA.tsx` (`LINKS`) begitu rilis.

## Desktop (Tauri): otomatis
- Proyek: `src-tauri/`. Memakai **Tauri v2** (WebView2 di Windows, WebKit di macOS), bukan Electron, supaya ukurannya kecil.
- Rilis: push tag `v0.4.0` (atau tab **Actions → Rilis Desktop → Run workflow**). Workflow `.github/workflows/release-desktop.yml` lalu membangun:
  - Windows: `.exe` (NSIS) + `.msi`
  - macOS: `.dmg` universal (Intel + Apple Silicon)

  Semuanya diunggah ke **GitHub Releases**, dan halaman Download menautkan ke rilis terbaru.
- Lokal: `npm run tauri dev` / `npm run tauri build`. Di Linux butuh `libwebkit2gtk-4.1-dev`.

## Android (TWA lewat Bubblewrap)
```bash
npm i -g @bubblewrap/cli
cd distribution/android
bubblewrap init --manifest https://<domain>/manifest.webmanifest   # atau pakai twa-manifest.json di folder ini
bubblewrap build                                                   # hasil: app-release-bundle.aab + .apk
```
1. Ganti `host` di `twa-manifest.json` dengan domain production.
2. Isi `assetlinks.template.json` dengan SHA-256 keystore (atau sertifikat Play App Signing), lalu sajikan di `https://<domain>/.well-known/assetlinks.json`. Tanpa file ini, TWA akan menampilkan bar browser.
3. **Package id:** brief menyarankan melanjutkan `com.unpam.univers` agar 50K+ pengguna Univers ikut ter-update. Itu hanya bisa dilakukan oleh LPTI sebagai pemegang keystore listing tersebut. Sampai ada keputusan, config ini memakai `id.ac.unpam.superunpam`.

## iOS (Capacitor), perlu macOS + Xcode
```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/ios
cp distribution/ios/capacitor.config.json .
npm run build && npx cap add ios && npx cap sync ios && npx cap open ios
```
- Push notification: aktifkan APNs di Xcode (Signing & Capabilities → Push Notifications).
- Web push PWA di iOS butuh iOS 16.4+ dan aplikasi terpasang di layar utama.
- Untuk melanjutkan listing App Store `6759666942`, perlu akses akun Apple Developer milik LPTI.

## Checklist tanda tangan kode
| Target | Yang dibutuhkan | Disimpan sebagai |
|---|---|---|
| Windows | Sertifikat code signing OV/EV (menghilangkan peringatan SmartScreen) | secret `WINDOWS_CERTIFICATE` + password |
| macOS | Apple Developer ID + notarization | secret `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` (dibaca otomatis oleh tauri-action) |
| Google Play | Upload keystore + Play App Signing | jangan di-commit; simpan offline atau di secret |
| App Store | Provisioning profile + sertifikat distribusi | Xcode / App Store Connect |

Tanpa sertifikat, installer desktop tetap bisa dipakai, hanya saja OS akan menampilkan peringatan "publisher tidak dikenal". Di macOS buka lewat klik kanan → Open.

## Matriks ukuran (perkiraan)
| Artefak | Ukuran tipikal | Catatan |
|---|---|---|
| PWA (unduhan awal) | ~70 KB JS gzip + CSS/font | Modul lain dimuat saat dibuka |
| Windows `.exe`/`.msi` (Tauri) | ±3–8 MB | Memakai WebView2 bawaan Windows |
| macOS `.dmg` universal (Tauri) | ±8–15 MB | Universal = 2 arsitektur |
| Android TWA `.aab` | ±1–2 MB | Hanya shell; konten dari PWA |
| Pembanding: Electron | 80–150 MB | Alasan memilih Tauri |

Angka Tauri dan TWA adalah perkiraan tipikal. Ukuran pasti terlihat di halaman GitHub Releases setelah workflow berjalan.
