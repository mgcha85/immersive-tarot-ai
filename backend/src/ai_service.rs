use crate::models::DrawnCard;
use serde_json::Value;

pub async fn generate_interpretation(query: &str, cards: &[DrawnCard]) -> String {
    // TODO: Integrate actual DeepSeek/Groq API here.
    // For now, we simulate a "Cold Reading" based on keywords.
    
    let card_names: Vec<String> = cards.iter().map(|c| c.card.name.clone()).collect();
    let keywords: Vec<String> = cards.iter()
        .flat_map(|c| if c.is_reversed { c.card.keywords.reversed.clone() } else { c.card.keywords.upright.clone() })
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
