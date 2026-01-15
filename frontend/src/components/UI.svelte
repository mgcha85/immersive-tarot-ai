<script lang="ts">
    import { drawnCards, isDrawing } from "../stores";

    let query = $state("");
    // Local loading state for the UI button, separate from the 3D drawing animation state if needed
    let requesting = $state(false);

    async function askOracle() {
        if (!query) return;
        requesting = true;
        isDrawing.set(true);
        try {
            const res = await fetch("/api/draw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_query: query, count: 3 }),
            });
            const data = await res.json();
            console.log("Oracle Replied:", data);

            // Update global store
            drawnCards.set(data.cards);
        } catch (e) {
            console.error(e);
        } finally {
            requesting = false;
            // We keep isDrawing true for a bit or let the animation handle it?
            // For now let's leave it, the animation component might reset it or we just use it to trigger.
        }
    }
</script>

```html
<div class="pointer-events-auto p-4 absolute bottom-0 left-0 w-full max-w-md">
    <div
        class="bg-black/50 backdrop-blur-md p-4 rounded-lg text-white border border-white/10"
    >
        <h1 class="text-xl font-bold mb-2">Immersive Tarot</h1>
        <p class="text-sm opacity-80">Ask your question to the void...</p>

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
                <h3 class="font-bold text-purple-300">Oracle's Selection:</h3>
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
    </div>
</div>
