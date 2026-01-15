<script lang="ts">
    import { T, useTask } from "@threlte/core";
    import { AutoColliders, RigidBody, Collider } from "@threlte/rapier";
    import { onMount, tick } from "svelte";
    import { drawnCards, isDrawing } from "../stores";
    import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";

    // Data State
    let deckData: any[] = $state([]);
    let bodies: RapierRigidBody[] = []; // Physics bodies don't need UI reactivity usually, but let's see. Using standard array for binding might behave weirdly if Svelte 5 proxy kicks in. Let's keep it simple.

    // Load card data map
    onMount(async () => {
        const res = await fetch("/tarot_data.json");
        deckData = await res.json();
        console.log("Deck loaded:", deckData.length);
    });

    // Random spread for initial position
    const getRandomPos = (i: number) => [
        (Math.random() - 0.5) * 0.5,
        i * 0.02 + 2,
        (Math.random() - 0.5) * 0.5,
    ];

    // Watch for drawn cards
    $effect(() => {
        if (
            $drawnCards.length > 0 &&
            deckData.length > 0 &&
            bodies.length > 0
        ) {
            animateDraw($drawnCards);
        }
    });

    function animateDraw(drawn: any[]) {
        console.log("Animating draw...", drawn);
        drawn.forEach((item, i) => {
            const cardIndex = deckData.findIndex((c) => c.id === item.card.id);
            if (cardIndex !== -1 && bodies[cardIndex]) {
                const body = bodies[cardIndex];

                // Wake up the body
                body.wakeUp();

                // Calculate target position (spread out on table)
                const targetX = (i - 1) * 2.5; // -2.5, 0, 2.5
                const targetZ = 3;
                const targetY = 5; // Lift up first

                // Apply impulse to throw it towards camera/table
                // This is a simple "throw". For precise movement, we might need a controller or kinematic.
                // Let's try a strong impulse UP and TOWARDS target.

                // Reset velocity first??
                body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                body.setAngvel({ x: 0, y: 0, z: 0 }, true);

                // Throw impulse
                // Vector from current pos to target?
                // Current pos is roughly [0, 2, 0]

                body.applyImpulse(
                    {
                        x: targetX * 0.5,
                        y: 5,
                        z: 2,
                    },
                    true,
                );

                body.applyTorqueImpulse(
                    {
                        x: Math.random(),
                        y: Math.random(),
                        z: Math.random(),
                    },
                    true,
                );

                // We might need a "Magnetic" force in useTask to guide it precisely,
                // but for now let's see if a physics throw is fun.
            }
        });
    }
</script>

<!-- 
    For true instanced physics with Threlte/Rapier, we usually use <InstancedMesh> 
    but <RigidBody> needs individual entities to track physics state easily without complex manual matrix updates.
    For 78 cards, individual RigidBodies are fine for performance (modern Rapier handles thousands).
-->

{#if deckData.length > 0}
    {#each deckData as card, i (card.id)}
        <RigidBody
            bind:rigidBody={bodies[i]}
            position={getRandomPos(i)}
            rotation={[0, Math.random() * 6.28, 0]}
            colliders="hull"
        >
            <AutoColliders shape={"cuboid"}>
                <T.Mesh castShadow receiveShadow>
                    <T.BoxGeometry args={[1.4, 2.4, 0.02]} />
                    <T.MeshStandardMaterial color="white" metalness={0.1} />
                    <T.MeshStandardMaterial
                        attach="material-0"
                        color="#1a1a1a"
                    />
                    <!-- Side -->
                    <T.MeshStandardMaterial
                        attach="material-1"
                        color="#1a1a1a"
                    />
                    <!-- Side -->
                    <T.MeshStandardMaterial
                        attach="material-2"
                        color="#1a1a1a"
                    />
                    <!-- Side -->
                    <T.MeshStandardMaterial
                        attach="material-3"
                        color="#1a1a1a"
                    />
                    <!-- Side -->

                    <!-- Front (Material 4) -->
                    <T.MeshStandardMaterial
                        attach="material-4"
                        color="#1a1a1a"
                    />

                    <!-- Back (Material 5) -->
                    <T.MeshStandardMaterial
                        attach="material-5"
                        color="#500000"
                    />
                </T.Mesh>
            </AutoColliders>
        </RigidBody>
    {/each}
{/if}
