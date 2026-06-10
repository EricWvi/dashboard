use only_application::{
    BottomQuickNoteHandler, CreateQuickNoteHandler, CreateTiptapHandler, DeleteQuickNoteHandler,
    GetTiptapHandler, ListQuickNotesHandler, ListTiptapHistoryHandler, RestoreTiptapHistoryHandler,
    TiptapError, UpdateQuickNoteHandler, UpdateTiptapHandler,
};
use only_contracts::{
    BottomQuickNoteResponse, CreateQuickNoteRequest, CreateQuickNoteResponse, CreateTiptapRequest,
    CreateTiptapResponse, DeleteQuickNoteResponse, GetTiptapResponse, ListQuickNotesResponse,
    ListTiptapHistoryResponse, RestoreTiptapHistoryRequest, RestoreTiptapHistoryResponse,
    UpdateQuickNoteRequest, UpdateQuickNoteResponse, UpdateTiptapRequest, UpdateTiptapResponse,
};
use only_db_server::{PostgresQuickNoteRepository, PostgresTiptapRepository};
use sqlx::{Pool, Postgres};

/// Groups the transport-facing Tiptap and QuickNote entry points for the web adapter.
pub struct TiptapApi {
    create_tiptap: CreateTiptapHandler<PostgresTiptapRepository>,
    get_tiptap: GetTiptapHandler<PostgresTiptapRepository>,
    update_tiptap: UpdateTiptapHandler<PostgresTiptapRepository>,
    list_history: ListTiptapHistoryHandler<PostgresTiptapRepository>,
    restore_history: RestoreTiptapHistoryHandler<PostgresTiptapRepository>,
    create_note: CreateQuickNoteHandler<PostgresQuickNoteRepository>,
    list_notes: ListQuickNotesHandler<PostgresQuickNoteRepository>,
    update_note: UpdateQuickNoteHandler<PostgresQuickNoteRepository>,
    delete_note: DeleteQuickNoteHandler<PostgresQuickNoteRepository>,
    bottom_note: BottomQuickNoteHandler<PostgresQuickNoteRepository>,
}

impl TiptapApi {
    /// Builds the Tiptap API from the shared connection pool.
    pub fn new(pool: Pool<Postgres>) -> Self {
        Self {
            create_tiptap: CreateTiptapHandler::new(PostgresTiptapRepository::new(pool.clone())),
            get_tiptap: GetTiptapHandler::new(PostgresTiptapRepository::new(pool.clone())),
            update_tiptap: UpdateTiptapHandler::new(PostgresTiptapRepository::new(pool.clone())),
            list_history: ListTiptapHistoryHandler::new(PostgresTiptapRepository::new(
                pool.clone(),
            )),
            restore_history: RestoreTiptapHistoryHandler::new(PostgresTiptapRepository::new(
                pool.clone(),
            )),
            create_note: CreateQuickNoteHandler::new(PostgresQuickNoteRepository::new(
                pool.clone(),
            )),
            list_notes: ListQuickNotesHandler::new(PostgresQuickNoteRepository::new(pool.clone())),
            update_note: UpdateQuickNoteHandler::new(PostgresQuickNoteRepository::new(
                pool.clone(),
            )),
            delete_note: DeleteQuickNoteHandler::new(PostgresQuickNoteRepository::new(
                pool.clone(),
            )),
            bottom_note: BottomQuickNoteHandler::new(PostgresQuickNoteRepository::new(pool)),
        }
    }

    /// Delegates a create-tiptap request to the application handler.
    pub async fn create_tiptap(
        &self,
        request: CreateTiptapRequest,
        creator_id: i32,
    ) -> Result<CreateTiptapResponse, TiptapError> {
        self.create_tiptap.handle(request, creator_id).await
    }

    /// Delegates a get-tiptap request to the application handler.
    pub async fn get_tiptap(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<GetTiptapResponse, TiptapError> {
        self.get_tiptap.handle(id, creator_id).await
    }

    /// Delegates an update-tiptap request to the application handler.
    pub async fn update_tiptap(
        &self,
        id: &str,
        request: UpdateTiptapRequest,
        creator_id: i32,
    ) -> Result<UpdateTiptapResponse, TiptapError> {
        self.update_tiptap.handle(id, request, creator_id).await
    }

    /// Delegates a list-tiptap-history request to the application handler.
    pub async fn list_history(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<ListTiptapHistoryResponse, TiptapError> {
        self.list_history.handle(id, creator_id).await
    }

    /// Delegates a restore-tiptap-history request to the application handler.
    pub async fn restore_history(
        &self,
        id: &str,
        request: RestoreTiptapHistoryRequest,
        creator_id: i32,
    ) -> Result<RestoreTiptapHistoryResponse, TiptapError> {
        self.restore_history.handle(id, request, creator_id).await
    }

    /// Delegates a create-quick-note request to the application handler.
    pub async fn create_note(
        &self,
        request: CreateQuickNoteRequest,
        creator_id: i32,
    ) -> Result<CreateQuickNoteResponse, TiptapError> {
        self.create_note.handle(request, creator_id).await
    }

    /// Delegates a list-quick-notes request to the application handler.
    pub async fn list_notes(&self, creator_id: i32) -> Result<ListQuickNotesResponse, TiptapError> {
        self.list_notes.handle(creator_id).await
    }

    /// Delegates an update-quick-note request to the application handler.
    pub async fn update_note(
        &self,
        id: &str,
        request: UpdateQuickNoteRequest,
        creator_id: i32,
    ) -> Result<UpdateQuickNoteResponse, TiptapError> {
        self.update_note.handle(id, request, creator_id).await
    }

    /// Delegates a delete-quick-note request to the application handler.
    pub async fn delete_note(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<DeleteQuickNoteResponse, TiptapError> {
        self.delete_note.handle(id, creator_id).await
    }

    /// Delegates a bottom-quick-note request to the application handler.
    pub async fn bottom_note(
        &self,
        id: &str,
        creator_id: i32,
    ) -> Result<BottomQuickNoteResponse, TiptapError> {
        self.bottom_note.handle(id, creator_id).await
    }
}
