<script lang="ts">
    import { T } from "@threlte/core";
    import { AutoColliders } from "@threlte/rapier";
</script>

<AutoColliders shape={"cuboid"}>
    <T.Mesh receiveShadow position={[0, -0.5, 0]}>
        <T.BoxGeometry args={[10, 1, 6]} />
        <T.MeshStandardMaterial color="#3E2723" roughness={0.8} />
    </T.Mesh>
</AutoColliders>
