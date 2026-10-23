//! RiftCoach native shell.
//!
//! Deliberately minimal: no custom commands and no plugins are registered, so the
//! webview cannot reach the filesystem, spawn processes or open network sockets.
//! Each future command must be justified in docs/SECURITY.md and covered by a
//! capability in `capabilities/`.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running RiftCoach");
}
