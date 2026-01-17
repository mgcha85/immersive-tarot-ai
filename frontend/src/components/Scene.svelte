<script lang="ts">
    import { T, useTask } from "@threlte/core";
    import { Environment, OrbitControls, interactivity } from "@threlte/extras";
    import { AutoColliders, RigidBody, Collider, World } from "@threlte/rapier";
    import CardDeck from "./CardDeck.svelte";
    import Table from "./Table.svelte";
    import Hand from "./Hand.svelte";

    interactivity();
</script>

<!-- Physics World -->
<World>
    <!-- <Environment preset="city" /> -->

    <T.PerspectiveCamera
        makeDefault
        position={[0, 10, 10]}
        fov={50}
        on:create={({ ref }) => ref.lookAt(0, 0, 0)}
    >
        <OrbitControls
            enableZoom={true}
            enablePan={false}
            maxPolarAngle={1.5}
        />
    </T.PerspectiveCamera>

    <T.DirectionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
    <T.AmbientLight intensity={0.5} />

    <!-- Debug Floor -->
    <AutoColliders shape={"cuboid"}>
        <T.Mesh receiveShadow rotation.x={-Math.PI / 2} position.y={-1}>
            <T.PlaneGeometry args={[50, 50]} />
            <T.MeshStandardMaterial color="#222" />
        </T.Mesh>
    </AutoColliders>

    <Table />
    <CardDeck />
    <Hand />
</World>
