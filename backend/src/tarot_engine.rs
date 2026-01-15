use crate::models::{TarotCard, DrawnCard};
use rand::seq::SliceRandom;
use rand::Rng;
use std::fs::File;
use std::io::BufReader;
use std::sync::Arc;

#[derive(Clone)]
pub struct TarotDeck {
    cards: Vec<TarotCard>,
}

impl TarotDeck {
    pub fn new() -> Self {
        // Load from JSON file
        // In a real app we might load this from DB or bake it in.
        // For now, we assume the JSON is at "../frontend/assets/tarot_data.json" or similar
        // Or we can embed it. Let's try to load from a known path.
        // Load from local file in container or dev
        let path = "tarot_data.json"; 
        let file = File::open(path).expect("Failed to open tarot_data.json");
        let reader = BufReader::new(file);
        let cards: Vec<TarotCard> = serde_json::from_reader(reader).expect("Failed to parse tarot_data.json");
        
        Self { cards }
    }

    /// Context-aware biased shuffle
    pub fn draw_with_context(&self, query: &str, count: usize) -> Vec<DrawnCard> {
        let mut rng = rand::thread_rng();
        let query_lower = query.to_lowercase();
        
        // simple keyword extraction
        let keywords: Vec<&str> = query_lower.split_whitespace().collect();

        // Assign weights
        let weighted_cards: Vec<(&TarotCard, f64)> = self.cards.iter().map(|c| {
            let mut weight = 1.0;
            
            // Resonance check
            for tag in &c.situational_tags {
                if keywords.iter().any(|k| k.contains(tag) || tag.contains(k)) {
                    weight += 2.0; // Boost weight
                }
            }
            
            (c, weight)
        }).collect();

        // Weighted random selection is actually complex without replacement.
        // Simpler approach for "Shuffle": 
        // 1. Create a pool where boosted cards appear multiple times? No, heavy memory.
        // 2. Algorithm: weighted_shuffle?
        // Let's implement a standard shuffle but "promote" resonant cards to the top N with higher probability?
        // Actually, for a pure "draw" API, we can just use weighted choice.
        
        let mut chosen_cards = Vec::new();
        let mut available_indices: Vec<usize> = (0..self.cards.len()).collect();

        for _ in 0..count {
            if available_indices.is_empty() { break; }
            
            // Calculate total weight of currently available cards
            let total_weight: f64 = available_indices.iter()
                .map(|&idx| weighted_cards[idx].1)
                .sum();
            
            let mut r = rng.gen_range(0.0..total_weight);
            let mut selected_idx_in_available = 0;
            
            for (i, &card_idx) in available_indices.iter().enumerate() {
                let w = weighted_cards[card_idx].1;
                if r <= w {
                    selected_idx_in_available = i;
                    break;
                }
                r -= w;
            }

            let card_idx = available_indices.remove(selected_idx_in_available);
            let card = &self.cards[card_idx];
            
            // Random orientation (50/50? Or biased?)
            // Let's go 70% Upright, 30% Reversed for less "doom"
            let is_reversed = rng.gen_bool(0.3);

            chosen_cards.push(DrawnCard {
                card: card.clone(),
                is_reversed,
                position_index: chosen_cards.len(),
            });
        }

        chosen_cards
    }
}
