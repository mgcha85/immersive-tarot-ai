use crate::models::DrawnCard;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use thiserror::Error;

const DEEPSEEK_API_URL: &str = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL: &str = "deepseek-chat";

const SYSTEM_PROMPT: &str = r#"You are a **Mystical Tarot Master**, an ancient and empathetic sage who bridges the gap between the mundane and the divine. You act as a guide for the user, interpreting the cards they draw with deep psychological insight (Jungian archetypes) and spiritual wisdom.

## Persona Guidelines
- **Tone**: Enigmatic but warm, authoritative yet gentle. Use slightly archaic or poetic phrasing but keep it accessible.
- **Philosophy**: You believe in free will. The cards show *possibilities* and *energies*, not potential fate. Empower the user.
- **Structure**:
  1. **The Hook**: Acknowledge the card's energy immediately.
  2. **The Image**: Briefly describe a key visual element of the card that relates to the user's query.
  3. **The Meaning**: connect the card's archetype to the user's specific context.
  4. **The Advice**: Actionable guidance.
  5. **The Outcome**: A potential future if the advice is followed.

## Interaction Flow
- When the user asks a question, acknowledge the weight of their query.
- When cards are drawn, interpret them individually and then as a synthesized whole.
- If the user draws specific cards (e.g., The Tower, Death), do not fearmonger. Frame them as necessary transformations.

## Input Format
You will receive the user's query and a list of drawn cards (name, position: upright/reversed, keywords)."#;

#[derive(Error, Debug)]
pub enum AiServiceError {
    #[error("DEEPSEEK_API_KEY environment variable not set")]
    MissingApiKey,
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("API returned error: {0}")]
    ApiError(String),
    #[error("Failed to parse API response: {0}")]
    ParseError(String),
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: MessageContent,
}

#[derive(Debug, Deserialize)]
struct MessageContent {
    content: String,
}

#[derive(Debug, Deserialize)]
struct ApiErrorResponse {
    error: ApiErrorDetail,
}

#[derive(Debug, Deserialize)]
struct ApiErrorDetail {
    message: String,
}

fn format_cards_for_prompt(cards: &[DrawnCard]) -> String {
    cards
        .iter()
        .enumerate()
        .map(|(i, drawn)| {
            let position = if drawn.is_reversed { "Reversed" } else { "Upright" };
            let keywords = if drawn.is_reversed {
                &drawn.card.keywords.reversed
            } else {
                &drawn.card.keywords.upright
            };
            format!(
                "Card {}: {} ({}) - Keywords: {}",
                i + 1,
                drawn.card.name,
                position,
                keywords.join(", ")
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

pub async fn generate_interpretation(query: &str, cards: &[DrawnCard]) -> String {
    match generate_interpretation_internal(query, cards).await {
        Ok(interpretation) => interpretation,
        Err(e) => {
            tracing::error!("Failed to generate AI interpretation: {}", e);
            generate_fallback_interpretation(query, cards)
        }
    }
}

async fn generate_interpretation_internal(
    query: &str,
    cards: &[DrawnCard],
) -> Result<String, AiServiceError> {
    let api_key = env::var("DEEPSEEK_API_KEY").map_err(|_| AiServiceError::MissingApiKey)?;

    let cards_formatted = format_cards_for_prompt(cards);
    let user_message = format!(
        "The seeker asks: \"{}\"\n\nThe following cards have been drawn:\n{}\n\nPlease provide a mystical interpretation of this reading.",
        query, cards_formatted
    );

    let request_body = ChatCompletionRequest {
        model: DEEPSEEK_MODEL.to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: SYSTEM_PROMPT.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: user_message,
            },
        ],
        temperature: 0.8,
        max_tokens: 1024,
    };

    let client = Client::new();
    let response = client
        .post(DEEPSEEK_API_URL)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await?;

    let status = response.status();
    let response_text = response.text().await?;

    if !status.is_success() {
        if let Ok(error_response) = serde_json::from_str::<ApiErrorResponse>(&response_text) {
            return Err(AiServiceError::ApiError(error_response.error.message));
        }
        return Err(AiServiceError::ApiError(format!(
            "HTTP {}: {}",
            status, response_text
        )));
    }

    let completion: ChatCompletionResponse = serde_json::from_str(&response_text)
        .map_err(|e| AiServiceError::ParseError(format!("{}: {}", e, response_text)))?;

    completion
        .choices
        .first()
        .map(|choice| choice.message.content.clone())
        .ok_or_else(|| AiServiceError::ParseError("No choices in response".to_string()))
}

fn generate_fallback_interpretation(query: &str, cards: &[DrawnCard]) -> String {
    let card_names: Vec<String> = cards.iter().map(|c| c.card.name.clone()).collect();
    let keywords: Vec<String> = cards
        .iter()
        .flat_map(|c| {
            if c.is_reversed {
                c.card.keywords.reversed.clone()
            } else {
                c.card.keywords.upright.clone()
            }
        })
        .collect();

    let intro = [
        "The cards have spoken, seeker.",
        "A fascinating spread lays before us.",
        "The energies are shifting around you.",
    ];

    let advice = [
        "Focus on your inner truth.",
        "Do not be afraid to let go.",
        "A new path is opening up.",
    ];

    format!(
        "{} You asked: '{}'. The cards drawn are: {}. The key themes here are {}. Advice: {}",
        intro[0],
        query,
        card_names.join(", "),
        keywords.join(", "),
        advice[0]
    )
}
