import { writable } from 'svelte/store';

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
