// Shell tipis: hanya memuat PWA Super UNPAM yang sama (dist/), tanpa menyalin logika.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("gagal menjalankan Super UNPAM");
}
