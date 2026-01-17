import { writable, derived } from 'svelte/store';
import type { CardPosition, ServerMessage } from './lib/websocket';

export interface Card {
    id: string;
    name: string;
    keywords: { upright: string[], reversed: string[] };
}

export interface DrawnCard {
    card: Card;
    is_reversed: boolean;
    position_index: number;
}

export const drawnCards = writable<DrawnCard[]>([]);
export const isDrawing = writable(false);

export const wsConnected = writable(false);
export const sessionId = writable<string | null>(null);
export const interpretation = writable('');
export const isInterpreting = writable(false);
export const wsError = writable<string | null>(null);
export const cardPositions = writable<CardPosition[]>([]);

export function handleServerMessage(message: ServerMessage): void {
    switch (message.type) {
        case 'session_started':
            sessionId.set(message.session_id);
            interpretation.set('');
            isInterpreting.set(false);
            break;
            
        case 'deck_state':
            cardPositions.set(message.card_positions);
            break;
            
        case 'card_selected':
            drawnCards.update(cards => {
                const newCard: DrawnCard = {
                    card: {
                        id: message.card_id,
                        name: formatCardName(message.card_id),
                        keywords: { upright: [], reversed: [] }
                    },
                    is_reversed: message.is_reversed,
                    position_index: cards.length
                };
                return [...cards, newCard];
            });
            break;
            
        case 'interpretation_chunk':
            isInterpreting.set(true);
            interpretation.update(text => text + message.text);
            break;
            
        case 'interpretation_complete':
            isInterpreting.set(false);
            isDrawing.set(false);
            break;
            
        case 'shuffle_animation':
            drawnCards.set([]);
            interpretation.set('');
            break;
            
        case 'error':
            wsError.set(message.message);
            isDrawing.set(false);
            isInterpreting.set(false);
            break;
    }
}

function formatCardName(cardId: string): string {
    return cardId
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

export function resetSession(): void {
    sessionId.set(null);
    drawnCards.set([]);
    interpretation.set('');
    isInterpreting.set(false);
    wsError.set(null);
    cardPositions.set([]);
}

export const hasActiveSession = derived(sessionId, $sessionId => $sessionId !== null);
