use axum::{
    extract::{State, Json},
    response::IntoResponse,
};
use std::sync::Arc;
use crate::state::AppState;
use crate::models::{DrawRequest, DrawResponse};
use crate::ai_service;
use crate::db;
use uuid::Uuid;

pub async fn draw_cards(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<DrawRequest>,
) -> impl IntoResponse {
    let cards = state.deck.draw_with_context(&payload.user_query, payload.count);
    
    // Generate Interpretation
    let interpretation = ai_service::generate_interpretation(&payload.user_query, &cards).await;
    
    // Save to DB
    // Simple session ID for now (random every request if not provided, ideally from cookie)
    let session_id = Uuid::new_v4().to_string();
    let cards_json = serde_json::to_value(&cards).unwrap_or_default();
    
    let _ = db::save_reading(
        &state.db, 
        &session_id, 
        &payload.user_query, 
        &cards_json, 
        &interpretation
    ).await;

    let response = DrawResponse {
        cards,
        interpretation_prompt: interpretation,
    };
    
    Json(response)
}
