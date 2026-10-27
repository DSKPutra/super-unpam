// Sembunyikan jendela konsol di Windows saat rilis.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    super_unpam_lib::run()
}
