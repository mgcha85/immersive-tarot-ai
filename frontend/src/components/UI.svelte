<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
        drawnCards,
        isDrawing,
        wsConnected,
        interpretation,
        isInterpreting,
        wsError,
        handleServerMessage,
        resetSession,
    } from "../stores";
    import {
        WebSocketClient,
        createWebSocketClient,
        type ServerMessage,
    } from "../lib/websocket";

    let query = $state("");
    let requesting = $state(false);
    let useWebSocket = $state(true);
    let wsClient: WebSocketClient | null = null;

    onMount(() => {
        wsClient = createWebSocketClient({
            onOpen: () => wsConnected.set(true),
            onClose: () => wsConnected.set(false),
            onError: () => wsConnected.set(false),
            onMessage: (message: ServerMessage) => handleServerMessage(message),
        });
        wsClient.connect();
    });

    onDestroy(() => {
        wsClient?.disconnect();
    });

    async function askOracle() {
        if (!query) return;
        requesting = true;
        isDrawing.set(true);
        wsError.set(null);

        if (useWebSocket && wsClient?.isConnected) {
            wsClient.startSession(query);
            requesting = false;
        } else {
            await askOracleREST();
        }
    }

    async function askOracleREST() {
        try {
            const res = await fetch("/api/draw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_query: query, count: 3 }),
            });
            const data = await res.json();
            console.log("Oracle Replied:", data);
            drawnCards.set(data.cards);
        } catch (e) {
            console.error(e);
            wsError.set(e instanceof Error ? e.message : "Failed to connect");
        } finally {
            requesting = false;
            isDrawing.set(false);
        }
    }

    function selectCard(index: number) {
        if (wsClient?.isConnected) {
            wsClient.selectCard(index);
        }
    }

    function requestInterpretation() {
        if (wsClient?.isConnected) {
            wsClient.requestInterpretation();
        }
    }

    function shuffleDeck() {
        if (wsClient?.isConnected) {
            resetSession();
            wsClient.shuffle();
        }
    }

    function toggleConnectionMode() {
        useWebSocket = !useWebSocket;
    }
</script>

<div class="pointer-events-auto p-4 absolute bottom-0 left-0 w-full max-w-md">
    <div
        class="bg-black/50 backdrop-blur-md p-4 rounded-lg text-white border border-white/10"
    >
        <div class="flex items-center justify-between mb-2">
            <h1 class="text-xl font-bold">Immersive Tarot</h1>
            <div class="flex items-center gap-2 text-xs">
                <span
                    class="w-2 h-2 rounded-full {$wsConnected
                        ? 'bg-green-400'
                        : 'bg-red-400'}"
                ></span>
                <span class="opacity-60">{$wsConnected ? "Live" : "Offline"}</span>
                <button
                    onclick={toggleConnectionMode}
                    class="ml-2 px-2 py-0.5 bg-white/10 rounded text-xs hover:bg-white/20"
                >
                    {useWebSocket ? "WS" : "REST"}
                </button>
            </div>
        </div>
        <p class="text-sm opacity-80">Ask your question to the void...</p>

        {#if $wsError}
            <div class="mt-2 p-2 bg-red-500/20 border border-red-500/40 rounded text-sm text-red-200">
                {$wsError}
            </div>
        {/if}

        <div class="mt-4 flex gap-2">
            <input
                bind:value={query}
                type="text"
                placeholder="Type here..."
                class="flex-1 bg-white/10 p-2 rounded border border-white/20 focus:outline-none focus:border-purple-400"
                onkeydown={(e) => e.key === "Enter" && askOracle()}
            />
            <button
                onclick={askOracle}
                disabled={requesting}
                class="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded font-bold disabled:opacity-50"
            >
                {requesting ? "..." : "Ask"}
            </button>
        </div>

        {#if $drawnCards.length > 0}
            <div class="mt-4 p-2 bg-black/40 rounded max-h-60 overflow-y-auto">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-purple-300">Oracle's Selection:</h3>
                    {#if $drawnCards.length > 0 && !$isInterpreting && !$interpretation}
                        <button
                            onclick={requestInterpretation}
                            class="text-xs px-2 py-1 bg-purple-600/50 hover:bg-purple-500/50 rounded"
                        >
                            Interpret
                        </button>
                    {/if}
                </div>
                <ul class="text-sm space-y-2 mt-2">
                    {#each $drawnCards as item}
                        <li>
                            <span class="font-bold">{item.card.name}</span>
                            ({item.is_reversed ? "Reversed" : "Upright"})
                            <br />
                            <span class="opacity-70 text-xs"
                                >{item.card.keywords[
                                    item.is_reversed ? "reversed" : "upright"
                                ].join(", ")}</span
                            >
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}

        {#if $interpretation || $isInterpreting}
            <div class="mt-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded">
                <h3 class="font-bold text-purple-300 mb-2">
                    Interpretation
                    {#if $isInterpreting}
                        <span class="inline-block ml-2 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                    {/if}
                </h3>
                <p class="text-sm leading-relaxed whitespace-pre-wrap">{$interpretation}</p>
            </div>
        {/if}

        {#if $drawnCards.length > 0 || $interpretation}
            <button
                onclick={shuffleDeck}
                class="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
            >
                New Reading
            </button>
        {/if}
    </div>
</div>
