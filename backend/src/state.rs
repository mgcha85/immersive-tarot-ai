use sqlx::SqlitePool;
use crate::tarot_engine::TarotDeck;

pub struct AppState {
    pub db: SqlitePool,
    pub deck: TarotDeck,
}
