export type ClientMessage =
    | { type: 'start_session'; query: string }
    | { type: 'select_card'; card_index: number }
    | { type: 'request_interpretation' }
    | { type: 'shuffle' }
    | { type: 'ping' };

export type ServerMessage =
    | { type: 'session_started'; session_id: string }
    | { type: 'deck_state'; card_positions: CardPosition[] }
    | { type: 'card_selected'; card_id: string; is_reversed: boolean }
    | { type: 'interpretation_chunk'; text: string }
    | { type: 'interpretation_complete' }
    | { type: 'shuffle_animation'; sequence: ShuffleStep[] }
    | { type: 'error'; message: string }
    | { type: 'pong' };

export interface CardPosition {
    card_id: string;
    x: number;
    y: number;
    rotation: number;
    is_face_up: boolean;
    z_index: number;
}

export interface ShuffleStep {
    card_id: string;
    from: Position;
    to: Position;
    duration_ms: number;
}

export interface Position {
    x: number;
    y: number;
    rotation: number;
}

export interface WebSocketClientOptions {
    url?: string;
    reconnect?: boolean;
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    onMessage?: (message: ServerMessage) => void;
}

const DEFAULT_OPTIONS = {
    url: getWebSocketUrl(),
    reconnect: true,
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 30000,
};

function getWebSocketUrl(): string {
    if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        if (host.includes('5173') || host.includes('5174')) {
            return 'ws://localhost:3000/ws';
        }
    }
    
    return `${protocol}//${host}/ws`;
}

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private options: Required<Omit<WebSocketClientOptions, 'onOpen' | 'onClose' | 'onError' | 'onMessage'>> & 
                     Pick<WebSocketClientOptions, 'onOpen' | 'onClose' | 'onError' | 'onMessage'>;
    private retryCount = 0;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private isIntentionallyClosed = false;
    private messageQueue: ClientMessage[] = [];

    constructor(options: WebSocketClientOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.warn('[WS] Already connected');
            return;
        }

        if (this.ws?.readyState === WebSocket.CONNECTING) {
            console.warn('[WS] Connection in progress');
            return;
        }

        this.isIntentionallyClosed = false;
        this.createConnection();
    }

    disconnect(): void {
        this.isIntentionallyClosed = true;
        this.cleanup();
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnected');
            this.ws = null;
        }
    }

    private createConnection(): void {
        try {
            console.log(`[WS] Connecting to ${this.options.url}...`);
            this.ws = new WebSocket(this.options.url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('[WS] Failed to create WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    private setupEventHandlers(): void {
        if (!this.ws) return;

        this.ws.onopen = () => {
            console.log('[WS] Connected');
            this.retryCount = 0;
            this.startPingInterval();
            this.flushMessageQueue();
            this.options.onOpen?.();
        };

        this.ws.onclose = (event) => {
            console.log(`[WS] Disconnected (code: ${event.code}, reason: ${event.reason})`);
            this.cleanup();
            this.options.onClose?.();
            
            if (!this.isIntentionallyClosed && this.options.reconnect) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WS] Error:', error);
            this.options.onError?.(error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as ServerMessage;
                this.handleMessage(message);
            } catch (error) {
                console.error('[WS] Failed to parse message:', error, event.data);
            }
        };
    }

    private handleMessage(message: ServerMessage): void {
        if (message.type === 'pong') return;
        this.options.onMessage?.(message);
    }

    private scheduleReconnect(): void {
        if (this.retryCount >= this.options.maxRetries) {
            console.error(`[WS] Max retries (${this.options.maxRetries}) reached. Giving up.`);
            return;
        }

        const delay = Math.min(
            this.options.baseDelay * Math.pow(2, this.retryCount) + Math.random() * 1000,
            this.options.maxDelay
        );

        this.retryCount++;
        console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${this.retryCount}/${this.options.maxRetries})`);

        this.reconnectTimeout = setTimeout(() => {
            this.createConnection();
        }, delay);
    }

    private startPingInterval(): void {
        this.stopPingInterval();
        this.pingInterval = setInterval(() => {
            this.send({ type: 'ping' });
        }, 30000);
    }

    private stopPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.send(message);
            }
        }
    }

    private cleanup(): void {
        this.stopPingInterval();
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    get readyState(): number {
        return this.ws?.readyState ?? WebSocket.CLOSED;
    }

    send(message: ClientMessage): boolean {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Not connected. Queueing message:', message.type);
            this.messageQueue.push(message);
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (error) {
            console.error('[WS] Failed to send message:', error);
            return false;
        }
    }

    startSession(query: string): boolean {
        return this.send({ type: 'start_session', query });
    }

    selectCard(cardIndex: number): boolean {
        return this.send({ type: 'select_card', card_index: cardIndex });
    }

    requestInterpretation(): boolean {
        return this.send({ type: 'request_interpretation' });
    }

    shuffle(): boolean {
        return this.send({ type: 'shuffle' });
    }

    ping(): boolean {
        return this.send({ type: 'ping' });
    }
}

let wsClientInstance: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
    if (!wsClientInstance) {
        wsClientInstance = new WebSocketClient();
    }
    return wsClientInstance;
}

export function createWebSocketClient(options: WebSocketClientOptions): WebSocketClient {
    wsClientInstance = new WebSocketClient(options);
    return wsClientInstance;
}
