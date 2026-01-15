<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { RigidBody, Collider, AutoColliders } from "@threlte/rapier";
    import { Vector3, Raycaster } from "three";
    import type { RigidBody as RapierRigidBody } from "@dimforge/rapier3d-compat";

    const { camera, scene, renderer } = useThrelte();

    let rigidBody: RapierRigidBody;
    const vec3 = new Vector3();
    const mouse = { x: 0, y: 0 };

    // Track mouse
    function onMouseMove(e: MouseEvent) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    window.addEventListener("mousemove", onMouseMove);

    useTask(() => {
        if (!rigidBody || !$camera) return;

        // Project mouse to world at a fixed depth or intersection with table plane
        // Simple approach: raycast to a virtual plane at y=2 or y=card_height

        vec3.set(mouse.x, mouse.y, 0.5);
        vec3.unproject($camera);

        const dir = vec3.sub($camera.position).normalize();
        const distance = -$camera.position.y / dir.y; // Intersection with y=0 plane?
        // Actually table is at y=-0.5. Cards are at ~0-2. Let's hover at y=2.

        // We want the hand to move on a plane roughly above the cards.
        // Let's assume a plane at Z=0 for a top-down view?
        // Camera is at [0, 10, 10] lookAt(0,0,0).
        // Raycast to Ground Plane (y=0)

        // Logic:
        // P = O + t*D
        // Py = 0 => Oy + t*Dy = 0 => t = -Oy/Dy

        // But wait, the camera might be angled.
        // Let's blindly trust Raycaster on a virtual plane using Threejs math if needed,
        // or just simplified projection if camera is static.
        // Since we have OrbitControls, camera moves. We MUST use unproject + ray-plane intersection.

        const targetY = 1.0; // Height of hand
        const t = (targetY - $camera.position.y) / dir.y;
        const targetPos = $camera.position.clone().add(dir.multiplyScalar(t));

        // Move KINEMATIC body to target
        rigidBody.setNextKinematicTranslation({
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
        });
    });
</script>

<RigidBody bind:rigidBody type="kinematicPosition">
    <Collider shape="ball" args={[0.5]} />

    <!-- Visual Hand (Sphere for now) -->
    <T.Mesh castShadow>
        <T.SphereGeometry args={[0.3]} />
        <T.MeshStandardMaterial color="#ffccaa" transparent opacity={0.8} />
    </T.Mesh>
</RigidBody>
