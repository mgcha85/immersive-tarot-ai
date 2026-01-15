use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{Pool, Sqlite};
use sqlx::migrate::MigrateDatabase;
use std::str::FromStr;

pub async fn init_db(database_url: &str) -> Result<Pool<Sqlite>, sqlx::Error> {
    
    // Create database file if it doesn't exist
    if !sqlx::Sqlite::database_exists(database_url).await.unwrap_or(false) {
        sqlx::Sqlite::create_database(database_url).await?;
    }

    let options = SqliteConnectOptions::from_str(database_url)?
        .create_if_missing(true)
        .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}

pub async fn save_reading(
    pool: &Pool<Sqlite>,
    session_id: &str,
    query: &str,
    cards_json: &serde_json::Value,
    interpretation: &str,
) -> Result<i64, sqlx::Error> {
    // Ensure session exists (quick dirty check or upsert)
    // SQLx SQLite upsert syntax: INSERT INTO ... ON CONFLICT DO NOTHING
    sqlx::query(
        "INSERT INTO sessions (id, user_metadata) VALUES (?1, '{}') ON CONFLICT(id) DO NOTHING",
    )
    .bind(session_id)
    .execute(pool)
    .await?;

    let id = sqlx::query(
        r#"
        INSERT INTO readings (session_id, user_query, drawn_cards, ai_interpretation)
        VALUES (?1, ?2, ?3, ?4)
        "#,
    )
    .bind(session_id)
    .bind(query)
    .bind(cards_json)
    .bind(interpretation)
    .execute(pool)
    .await?
    .last_insert_rowid();

    Ok(id)
}
