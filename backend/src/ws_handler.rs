use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::ai_service;
use crate::db;
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    StartSession { query: String },
    SelectCard { card_index: usize },
    RequestInterpretation,
    Shuffle,
    Ping,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    SessionStarted { session_id: String },
    DeckState { card_positions: Vec<CardPosition> },
    CardSelected { card_id: String, is_reversed: bool },
    InterpretationChunk { text: String },
    InterpretationComplete,
    ShuffleAnimation { sequence: Vec<ShuffleStep> },
    Error { message: String },
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardPosition {
    pub card_id: String,
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
    pub is_face_up: bool,
    pub z_index: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShuffleStep {
    pub card_id: String,
    pub from: Position,
    pub to: Position,
    pub duration_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub y: f32,
    pub rotation: f32,
}

struct SessionState {
    session_id: String,
    query: Option<String>,
    selected_cards: Vec<usize>,
}

impl SessionState {
    fn new() -> Self {
        Self {
            session_id: Uuid::new_v4().to_string(),
            query: None,
            selected_cards: Vec::new(),
        }
    }
}

pub async fn ws_upgrade(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, app_state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let (tx, mut rx) = mpsc::channel::<ServerMessage>(32);
    let mut session = SessionState::new();

    info!(session_id = %session.session_id, "WebSocket connection established");

    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            match serde_json::to_string(&msg) {
                Ok(text) => {
                    if sender.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
                Err(e) => {
                    error!("Failed to serialize message: {}", e);
                }
            }
        }
    });

    while let Some(result) = receiver.next().await {
        match result {
            Ok(msg) => {
                if let Err(e) = process_message(msg, &mut session, &app_state, &tx).await {
                    warn!(session_id = %session.session_id, "Error processing message: {}", e);
                    let _ = tx
                        .send(ServerMessage::Error {
                            message: e.to_string(),
                        })
                        .await;
                }
            }
            Err(e) => {
                error!(session_id = %session.session_id, "WebSocket error: {}", e);
                break;
            }
        }
    }

    info!(session_id = %session.session_id, "WebSocket connection closed");
    send_task.abort();
}

async fn process_message(
    msg: Message,
    session: &mut SessionState,
    app_state: &Arc<AppState>,
    tx: &mpsc::Sender<ServerMessage>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    match msg {
        Message::Text(text) => {
            let client_msg: ClientMessage = serde_json::from_str(&text)?;
            handle_client_message(client_msg, session, app_state, tx).await?;
        }
        Message::Binary(data) => {
            let client_msg: ClientMessage = serde_json::from_slice(&data)?;
            handle_client_message(client_msg, session, app_state, tx).await?;
        }
        Message::Ping(_) => {
            tx.send(ServerMessage::Pong).await?;
        }
        Message::Pong(_) => {}
        Message::Close(_) => {
            info!(session_id = %session.session_id, "Client initiated close");
        }
    }
    Ok(())
}

async fn handle_client_message(
    msg: ClientMessage,
    session: &mut SessionState,
    app_state: &Arc<AppState>,
    tx: &mpsc::Sender<ServerMessage>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    match msg {
        ClientMessage::StartSession { query } => {
            handle_start_session(query, session, app_state, tx).await?;
        }
        ClientMessage::SelectCard { card_index } => {
            handle_select_card(card_index, session, app_state, tx).await?;
        }
        ClientMessage::RequestInterpretation => {
            handle_request_interpretation(session, app_state, tx).await?;
        }
        ClientMessage::Shuffle => {
            handle_shuffle(session, tx).await?;
        }
        ClientMessage::Ping => {
            tx.send(ServerMessage::Pong).await?;
        }
    }
    Ok(())
}

async fn handle_start_session(
    query: String,
    session: &mut SessionState,
    app_state: &Arc<AppState>,
    tx: &mpsc::Sender<ServerMessage>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!(session_id = %session.session_id, query = %query, "Starting new session");

    session.query = Some(query);
    session.selected_cards.clear();

    tx.send(ServerMessage::SessionStarted {
        session_id: session.session_id.clone(),
    })
    .await?;

    let card_positions = generate_deck_positions(app_state);
    tx.send(ServerMessage::DeckState { card_positions }).await?;

    Ok(())
}

async fn handle_select_card(
    card_index: usize,
    session: &mut SessionState,
    app_state: &Arc<AppState>,
    tx: &mpsc::Sender<ServerMessage>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!(session_id = %session.session_id, card_index = card_index, "Card selected");

    const DECK_SIZE: usize = 78;
    if card_index >= DECK_SIZE {
        return Err(format!("Invalid card index: {}", card_index).into());
    }

    if session.selected_cards.contains(&card_index) {
        return Err("Card already selected".into());
    }

    session.selected_cards.push(card_index);

    let query = session.query.as_deref().unwrap_or("");
    let drawn_cards = app_state.deck.draw_with_context(query, 1);

    if let Some(drawn) = drawn_cards.first() {
        tx.send(ServerMessage::CardSelected {
            card_id: drawn.card.id.clone(),
            is_reversed: drawn.is_reversed,
        })
        .await?;
    }

    Ok(())
}

async fn handle_request_interpretation(
    session: &mut SessionState,
    app_state: &Arc<AppState>,
    tx: &mpsc::Sender<ServerMessage>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!(session_id = %session.session_id, "Interpretation requested");

    let query = session
        .query
        .as_deref()
        .ok_or("No session started - please start a session first")?;

    if session.selected_cards.is_empty() {
        return Err("No cards selected".into());
    }

    let cards = app_state
        .deck
        .draw_with_context(query, session.selected_cards.len());

    let interpretation = ai_service::generate_interpretation(query, &cards).await;

    let chunks: Vec<&str> = interpretation
        .split(". ")
        .filter(|s| !s.is_empty())
        .collect();

    for (i, chunk) in chunks.iter().enumerate() {
        let text = if i < chunks.len() - 1 {
            format!("{}. ", chunk)
        } else {
            chunk.to_string()
        };

        tx.send(ServerMessage::InterpretationChunk { text }).await?;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    tx.send(ServerMessage::InterpretationComplete).await?;

    let cards_json = serde_json::to_value(&cards).unwrap_or_default();
    let _ = db::save_reading(
        &app_state.db,
        &session.session_id,
        query,
        &cards_json,
        &interpretation,
    )
    .await;

    Ok(())
}

async fn handle_shuffle(
    session: &mut SessionState,
    tx: &mpsc::Sender<ServerMessage>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!(session_id = %session.session_id, "Shuffle requested");

    session.selected_cards.clear();
    let sequence = generate_shuffle_animation();
    tx.send(ServerMessage::ShuffleAnimation { sequence }).await?;

    Ok(())
}

fn generate_deck_positions(_app_state: &Arc<AppState>) -> Vec<CardPosition> {
    (0..78)
        .map(|i| CardPosition {
            card_id: format!("card_{}", i),
            x: i as f32 * 0.5,
            y: -(i as f32 * 0.2),
            rotation: 0.0,
            is_face_up: false,
            z_index: i,
        })
        .collect()
}

fn generate_shuffle_animation() -> Vec<ShuffleStep> {
    use rand::Rng;
    let mut rng = rand::rng();

    (0..78)
        .map(|i| {
            let side = if i % 2 == 0 { -1.0 } else { 1.0 };
            ShuffleStep {
                card_id: format!("card_{}", i),
                from: Position {
                    x: 0.0,
                    y: 0.0,
                    rotation: 0.0,
                },
                to: Position {
                    x: side * rng.random_range(50.0..150.0),
                    y: rng.random_range(-30.0..30.0),
                    rotation: rng.random_range(-15.0..15.0),
                },
                duration_ms: rng.random_range(200..400),
            }
        })
        .collect()
}
