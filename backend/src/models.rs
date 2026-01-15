use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TarotCard {
    pub id: String,
    pub name: String,
    pub arcana: String, // "major" | "minor"
    pub suit: Option<String>,
    pub number: i32,
    pub archetype: String,
    pub keywords: Keywords,
    pub situational_tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keywords {
    pub upright: Vec<String>,
    pub reversed: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrawnCard {
    pub card: TarotCard,
    pub is_reversed: bool,
    pub position_index: usize,
}

#[derive(Debug, Deserialize)]
pub struct DrawRequest {
    pub user_query: String, // "I am worried about my job"
    pub count: usize,       // Number of cards to draw (e.g. 3)
}

#[derive(Debug, Serialize)]
pub struct DrawResponse {
    pub cards: Vec<DrawnCard>,
    pub interpretation_prompt: String, // The prompt sent to AI (for debugging/transparency)
}
