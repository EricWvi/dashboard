use axum::Router;
use axum::routing::{get, post, put};

use crate::app_state::AppState;
use crate::handlers::auth::auth;
use crate::handlers::bookmark::{
    click_bookmark, create_bookmark, delete_bookmark, get_bookmark, list_bookmarks, update_bookmark,
};
use crate::handlers::collection::{
    create_collection, delete_collection, get_collection, list_all_todos, list_collections,
    list_today_todos, plan_today, update_collection,
};
use crate::handlers::entry::{
    bookmark_entry, create_entry, delete_entry, get_current_year, get_entries_count, get_entry,
    get_entry_dates, get_words_count, list_entries, unbookmark_entry, update_entry,
};
use crate::handlers::media::{delete_handler, serve_handler, upload_handler};
use crate::handlers::tag::{create_tags, delete_tag, list_tags};
use crate::handlers::tiptap::{
    bottom_quick_note, create_quick_note, create_tiptap, delete_quick_note, get_tiptap,
    list_quick_notes, list_tiptap_history, restore_tiptap_history, update_quick_note,
    update_tiptap,
};
use crate::middleware::auth_middleware;

/// Builds the application router with all routes registered.
///
/// All routes except `/api/m/{link}` and `/api/auth` are protected by the JWT auth middleware.
pub fn build_router(state: AppState) -> Router {
    let public_routes = Router::new()
        .route("/api/m/{link}", get(serve_handler))
        .route("/api/auth", get(auth));

    let protected_routes = Router::new()
        .route("/api/upload", post(upload_handler))
        .route("/api/media", post(delete_handler))
        // Collection + todo
        .route(
            "/api/collections",
            get(list_collections).post(create_collection),
        )
        .route(
            "/api/collections/{id}",
            get(get_collection)
                .put(update_collection)
                .delete(delete_collection),
        )
        .route("/api/todos/all", get(list_all_todos))
        .route("/api/todos/today", get(list_today_todos))
        .route("/api/todos/plan-today", post(plan_today))
        // Entry
        .route("/api/entries", get(list_entries).post(create_entry))
        .route("/api/entries/stats/words", get(get_words_count))
        .route("/api/entries/stats/current-year", get(get_current_year))
        .route("/api/entries/stats/count", get(get_entries_count))
        .route("/api/entries/stats/dates", get(get_entry_dates))
        .route(
            "/api/entries/{id}",
            get(get_entry).put(update_entry).delete(delete_entry),
        )
        .route("/api/entries/{id}/bookmark", post(bookmark_entry))
        .route("/api/entries/{id}/unbookmark", post(unbookmark_entry))
        // Tag
        .route(
            "/api/tags",
            get(list_tags).post(create_tags).delete(delete_tag),
        )
        // Tiptap
        .route("/api/tiptaps", post(create_tiptap))
        .route("/api/tiptaps/{id}", get(get_tiptap).put(update_tiptap))
        .route("/api/tiptaps/{id}/history", get(list_tiptap_history))
        .route(
            "/api/tiptaps/{id}/history/restore",
            post(restore_tiptap_history),
        )
        // QuickNote
        .route(
            "/api/quicknotes",
            get(list_quick_notes).post(create_quick_note),
        )
        .route(
            "/api/quicknotes/{id}",
            put(update_quick_note).delete(delete_quick_note),
        )
        .route("/api/quicknotes/{id}/bottom", post(bottom_quick_note))
        // Bookmark
        .route("/api/bookmarks", get(list_bookmarks).post(create_bookmark))
        .route(
            "/api/bookmarks/{id}",
            get(get_bookmark)
                .put(update_bookmark)
                .delete(delete_bookmark),
        )
        .route("/api/bookmarks/{id}/click", post(click_bookmark))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    public_routes.merge(protected_routes).with_state(state)
}
