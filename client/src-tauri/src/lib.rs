mod flomo_db;
#[cfg(feature = "journal")]
mod journal_db;
mod media_cache;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            #[cfg(feature = "flomo")]
            flomo_db::commands::init_db(app.handle())?;
            #[cfg(feature = "journal")]
            journal_db::commands::init_db(app.handle())?;
            media_cache::init_media_cache(app.handle())?;
            Ok(())
        });

    #[cfg(feature = "flomo")]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            media_cache::get_local_media_server_port,
            media_cache::onlyquant_is_logged_in,
            flomo_db::commands::flomo_get_user,
            flomo_db::commands::flomo_put_user,
            flomo_db::commands::flomo_get_card,
            flomo_db::commands::flomo_get_full_card,
            flomo_db::commands::flomo_get_cards_in_folder,
            flomo_db::commands::flomo_add_card,
            flomo_db::commands::flomo_put_card,
            flomo_db::commands::flomo_put_cards,
            flomo_db::commands::flomo_update_card,
            flomo_db::commands::flomo_delete_card,
            flomo_db::commands::flomo_soft_delete_card,
            flomo_db::commands::flomo_mark_card_synced,
            flomo_db::commands::flomo_get_bookmarked_cards,
            flomo_db::commands::flomo_get_recent_cards,
            flomo_db::commands::flomo_get_folder,
            flomo_db::commands::flomo_get_folders_in_parent,
            flomo_db::commands::flomo_add_folder,
            flomo_db::commands::flomo_put_folder,
            flomo_db::commands::flomo_put_folders,
            flomo_db::commands::flomo_update_folder,
            flomo_db::commands::flomo_delete_folder,
            flomo_db::commands::flomo_soft_delete_folder,
            flomo_db::commands::flomo_mark_folder_synced,
            flomo_db::commands::flomo_get_bookmarked_folders,
            flomo_db::commands::flomo_last_order_in_folder,
            flomo_db::commands::flomo_get_tiptap,
            flomo_db::commands::flomo_add_tiptap,
            flomo_db::commands::flomo_put_tiptap,
            flomo_db::commands::flomo_put_tiptaps,
            flomo_db::commands::flomo_sync_tiptap,
            flomo_db::commands::flomo_update_tiptap,
            flomo_db::commands::flomo_delete_tiptap,
            flomo_db::commands::flomo_soft_delete_tiptap,
            flomo_db::commands::flomo_mark_tiptap_synced,
            flomo_db::commands::flomo_list_tiptap_history,
            flomo_db::commands::flomo_get_tiptap_history,
            flomo_db::commands::flomo_restore_tiptap_history,
            flomo_db::commands::flomo_get_pending_changes,
            flomo_db::commands::flomo_get_local_data_for_sync,
            flomo_db::commands::flomo_get_sync_meta,
            flomo_db::commands::flomo_set_sync_meta,
            flomo_db::commands::flomo_get_last_server_version,
            flomo_db::commands::flomo_clear_all_data,
            flomo_db::commands::flomo_full_sync,
            flomo_db::commands::flomo_push,
            flomo_db::commands::flomo_pull,
            flomo_db::commands::flomo_search_card,
            flomo_db::commands::flomo_search_folder,
            flomo_db::commands::flomo_search_content,
        ]);
    }

    #[cfg(all(not(feature = "flomo"), feature = "journal"))]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            media_cache::get_local_media_server_port,
            media_cache::onlyquant_is_logged_in,
            journal_db::commands::journal_get_user,
            journal_db::commands::journal_put_user,
            journal_db::commands::journal_get_entry,
            journal_db::commands::journal_get_full_entry,
            journal_db::commands::journal_get_entries,
            journal_db::commands::journal_add_entry,
            journal_db::commands::journal_put_entry,
            journal_db::commands::journal_put_entries,
            journal_db::commands::journal_update_entry,
            journal_db::commands::journal_delete_entry,
            journal_db::commands::journal_soft_delete_entry,
            journal_db::commands::journal_mark_entry_synced,
            journal_db::commands::journal_get_tag,
            journal_db::commands::journal_get_all_tags,
            journal_db::commands::journal_add_tag,
            journal_db::commands::journal_put_tag,
            journal_db::commands::journal_put_tags,
            journal_db::commands::journal_update_tag,
            journal_db::commands::journal_delete_tag,
            journal_db::commands::journal_soft_delete_tag,
            journal_db::commands::journal_mark_tag_synced,
            journal_db::commands::journal_get_tiptap,
            journal_db::commands::journal_add_tiptap,
            journal_db::commands::journal_put_tiptap,
            journal_db::commands::journal_put_tiptaps,
            journal_db::commands::journal_sync_tiptap,
            journal_db::commands::journal_update_tiptap,
            journal_db::commands::journal_delete_tiptap,
            journal_db::commands::journal_soft_delete_tiptap,
            journal_db::commands::journal_mark_tiptap_synced,
            journal_db::commands::journal_list_tiptap_history,
            journal_db::commands::journal_get_tiptap_history,
            journal_db::commands::journal_restore_tiptap_history,
            journal_db::commands::journal_get_pending_changes,
            journal_db::commands::journal_get_local_data_for_sync,
            journal_db::commands::journal_get_sync_meta,
            journal_db::commands::journal_set_sync_meta,
            journal_db::commands::journal_get_last_server_version,
            journal_db::commands::journal_clear_all_data,
            journal_db::commands::journal_get_statistic,
            journal_db::commands::journal_set_statistic,
            journal_db::commands::journal_put_statistics,
            journal_db::commands::journal_full_sync,
            journal_db::commands::journal_push,
            journal_db::commands::journal_pull,
        ]);
    }

    #[cfg(all(not(feature = "flomo"), not(feature = "journal")))]
    {
        builder = builder.invoke_handler(tauri::generate_handler![
            media_cache::get_local_media_server_port,
            media_cache::onlyquant_is_logged_in,
        ]);
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
