use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::{FromRow, Pool, Sqlite};
use sqlx::migrate::MigrateDatabase;

use crate::models::Message;
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

pub async fn save_message(
    pool: &Pool<Sqlite>,
    reading_id: i64,
    role: &str,
    content: &str,
) -> Result<i64, sqlx::Error> {
    let id = sqlx::query(
        r#"
        INSERT INTO messages (reading_id, role, content)
        VALUES (?1, ?2, ?3)
        "#,
    )
    .bind(reading_id)
    .bind(role)
    .bind(content)
    .execute(pool)
    .await?
    .last_insert_rowid();

    Ok(id)
}

#[derive(FromRow)]
struct MessageRow {
    id: i64,
    reading_id: i64,
    role: String,
    content: String,
    created_at: String,
}

pub async fn get_messages_for_reading(
    pool: &Pool<Sqlite>,
    reading_id: i64,
) -> Result<Vec<Message>, sqlx::Error> {
    let rows: Vec<MessageRow> = sqlx::query_as(
        r#"
        SELECT id, reading_id, role, content, created_at
        FROM messages
        WHERE reading_id = ?1
        ORDER BY created_at ASC
        "#,
    )
    .bind(reading_id)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| Message {
            id: r.id,
            reading_id: r.reading_id,
            role: r.role,
            content: r.content,
            created_at: r.created_at,
        })
        .collect())
}
