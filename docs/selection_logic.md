# Context-Aware Card Selection Logic

This document defines how the system biases the random number generator (RNG) to make the tarot reading feel more "connected" to the user's situation, without faking the results entirely. We call this "Interpretative Resonance".

## Mechanism
1. **Intent Extraction**:
   - Analyze User Query -> Extract `Tags` (e.g., "Love", "Breakup", "Career", "Anxiety").
   - Map Tags to Card `situational_tags`.

2. **Weight Adjustment**:
   - Standard Weight: 1.0 for all 78 cards.
   - Resonant Weight: 2.0 (or configurable `RESONANCE_FACTOR`) for cards matching the tags.
   - *Note*: This subtly increases the chance of relevant cards appearing, mimicking the phenomenon of synchronicity, but the shuffle remains largely random.

## Mapping Table (Examples)

| User Concern | Keywords | Boosted Cards (Examples) |
| :--- | :--- | :--- |
| **Heartbreak/Love** | `love`, `breakup`, `lonely` | 3 of Swords, The Lovers, 2 of Cups, 10 of Cups, Death |
| **Career/Money** | `job`, `money`, `promotion` | Ace of Pentacles, 8 of Pentacles, The Emperor, Chariot |
| **Confusion/Choice** | `choice`, `lost`, `path` | 2 of Swords, The Moon, 7 of Cups, The Hermit |
| **Conflict** | `fight`, `argue`, `enemy` | 5 of Swords, 7 of Wands, The Tower |

## Algorithm
```typescript
interface Card {
  id: string;
  tags: string[];
  baseWeight: number; // 1.0
}

function calculateWeights(queryTags: string[], deck: Card[]): number[] {
  return deck.map(card => {
    const match = card.tags.some(tag => queryTags.includes(tag));
    return match ? card.baseWeight * 2.0 : card.baseWeight;
  });
}
```
