<script lang="ts">
    import { T, useTask } from "@threlte/core";
    import { AutoColliders, RigidBody } from "@threlte/rapier";
    import { onMount } from "svelte";
    import { drawnCards } from "../stores";
    import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";
    import { createCardBackTexture, createCardFrontTexture } from "../lib/cardTextures";
    import { CanvasTexture, Vector3, Quaternion } from "three";

    // Data State
    let deckData: any[] = $state([]);
    let bodies: RapierRigidBody[] = [];
    let cardBackTexture = $state<CanvasTexture | null>(null);
    let cardFrontTextures = $state<Map<string, CanvasTexture>>(new Map());
    
    // Interaction State
    let hoveredCardId = $state<string | null>(null);
    let selectedCardId = $state<string | null>(null);

    // Load card data map
    onMount(async () => {
        const res = await fetch("/tarot_data.json");
        const json = await res.json();
        deckData = json.cards; // Access 'cards' array from json object
        console.log("Deck loaded:", deckData.length);

        // Generate Textures
        cardBackTexture = createCardBackTexture();
        const textureMap = new Map();
        deckData.forEach(card => {
            textureMap.set(card.id, createCardFrontTexture(card));
        });
        cardFrontTextures = textureMap;
    });

    // Random spread for initial position
    const getRandomPos = (i: number) => [
        (Math.random() - 0.5) * 0.5,
        i * 0.02 + 2,
        (Math.random() - 0.5) * 0.5,
    ] as [number, number, number];

    // Watch for drawn cards
    $effect(() => {
        if ($drawnCards.length > 0 && deckData.length > 0 && bodies.length > 0) {
            animateDraw($drawnCards);
        }
    });

    function animateDraw(drawn: any[]) {
        drawn.forEach((item, i) => {
            const cardIndex = deckData.findIndex((c) => c.id === item.card.id);
            if (cardIndex !== -1 && bodies[cardIndex]) {
                const body = bodies[cardIndex];
                if (selectedCardId === deckData[cardIndex].id) return; // Don't throw selected card

                body.wakeUp();
                body.setBodyType(0, true); // Dynamic
                
                const targetX = (i - 1) * 2.5; 
                body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                body.applyImpulse({ x: targetX * 0.5, y: 5, z: 2 }, true);
                body.applyTorqueImpulse({ x: Math.random(), y: Math.random(), z: Math.random() }, true);
            }
        });
    }

    // Selection Animation Loop
    // Smoothly interpolate selected card to viewing position
    useTask((delta) => {
        if (!selectedCardId) return;
        
        const cardIndex = deckData.findIndex(c => c.id === selectedCardId);
        if (cardIndex === -1 || !bodies[cardIndex]) return;

        const body = bodies[cardIndex];
        // We rely on 'kinematicPosition' type being set in the template
        
        // Target Position (Center, Floating up)
        const targetPos = new Vector3(0, 4, 6);
        const currentPos = body.translation();
        
        // Lerp Position
        const lerpFactor = 5 * delta;
        const nextX = currentPos.x + (targetPos.x - currentPos.x) * lerpFactor;
        const nextY = currentPos.y + (targetPos.y - currentPos.y) * lerpFactor;
        const nextZ = currentPos.z + (targetPos.z - currentPos.z) * lerpFactor;

        body.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });

        // Target Rotation (Facing Camera)
        // Camera is at [0, 10, 10] looking at [0,0,0]
        // Card should face somewhat up and towards camera.
        // Let's just make it stand up vertically facing Z.
        const targetRot = new Quaternion().setFromEuler({ _x: -0.5, _y: 0, _z: 0, _order: 'XYZ' } as any);
        const currentRot = body.rotation();
        const currentQ = new Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);
        
        currentQ.slerp(targetRot, lerpFactor);
        body.setNextKinematicRotation(currentQ);
    });

    function handleCardClick(id: string) {
        if (selectedCardId === id) {
            // Deselect
            selectedCardId = null;
            // Physics body type will switch back to dynamic via template reactivity
            // We might want to give it a little wake up nudge in $effect or useTask logic, 
            // but simply switching type usually wakes it up.
        } else {
            selectedCardId = id;
        }
    }
</script>

{#if deckData.length > 0}
    {#each deckData as card, i (card.id)}
        <RigidBody
            bind:rigidBody={bodies[i]}
            position={getRandomPos(i)}
            rotation={[0, Math.random() * 6.28, 0]}
            type={selectedCardId === card.id ? 'kinematicPosition' : 'dynamic'}
            colliders="hull"
        >
            <AutoColliders shape={"cuboid"}>
                <T.Mesh 
                    castShadow 
                    receiveShadow
                    userData={{ isCard: true, cardId: card.id }}
                    onpointerenter={() => hoveredCardId = card.id}
                    onpointerleave={() => hoveredCardId = null}
                    onclick={(e: any) => {
                        e.stopPropagation();
                        handleCardClick(card.id);
                    }}
                >
                    <T.BoxGeometry args={[1.4, 2.4, 0.02]} />
                    
                    <!-- Sides (Gold/Dark) -->
                    {#each [0, 1, 2, 3] as side}
                        <T.MeshStandardMaterial attach={`material-${side}`} color="#ffd700" metalness={0.8} roughness={0.2} />
                    {/each}

                    <!-- Front (Material 4) -->
                    {#if cardFrontTextures.get(card.id)}
                        <T.MeshStandardMaterial
                            attach="material-4"
                            map={cardFrontTextures.get(card.id)}
                            color={hoveredCardId === card.id ? '#ffffff' : '#e0e0e0'}
                            emissive={hoveredCardId === card.id ? '#ffaa00' : '#000000'}
                            emissiveIntensity={hoveredCardId === card.id ? 0.5 : 0}
                            roughness={0.4}
                        />
                    {:else}
                         <T.MeshStandardMaterial attach="material-4" color="#1a1a1a" />
                    {/if}

                    <!-- Back (Material 5) -->
                    {#if cardBackTexture}
                         <T.MeshStandardMaterial
                            attach="material-5"
                            map={cardBackTexture}
                            color={hoveredCardId === card.id ? '#ffffff' : '#e0e0e0'}
                            emissive={hoveredCardId === card.id ? '#ffaa00' : '#000000'}
                            emissiveIntensity={hoveredCardId === card.id ? 0.5 : 0}
                            roughness={0.4}
                        />
                    {:else}
                        <T.MeshStandardMaterial attach="material-5" color="#500000" />
                    {/if}

                </T.Mesh>
            </AutoColliders>
        </RigidBody>
    {/each}
{/if}
