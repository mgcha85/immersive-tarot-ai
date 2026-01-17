use axum::{
    routing::{get, post},
    Router,
};
use dotenv::dotenv;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::CorsLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod handlers;
mod state;
mod models;
mod tarot_engine;
mod ai_service;
mod ws_handler;

use crate::state::AppState;
use crate::tarot_engine::TarotDeck;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Database setup
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite:tarot.db".to_string());
    let pool = db::init_db(&database_url).await?;

    // Initialize Deck
    let deck = TarotDeck::new();

    // Shared State
    let state = Arc::new(AppState {
        db: pool,
        deck,
    });

    // Router
    let app = Router::new()
        .route("/health", get(|| async { "OK" }))
        .route("/api/draw", post(handlers::draw_cards))
        .route("/ws", get(ws_handler::ws_upgrade))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("listening on {}", addr);
    
    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
