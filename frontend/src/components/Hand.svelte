<script lang="ts">
    import { T, useTask, useThrelte } from "@threlte/core";
    import { Vector3, Vector2, Raycaster, Plane, MathUtils, Euler, Quaternion, Mesh, MeshStandardMaterial, Color } from "three";
    import { onMount, createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
    const { camera, scene } = useThrelte();

    let handState = $state<'idle' | 'pointing' | 'grabbing'>('idle');
    let hoveredCardId: string | null = null;
    let hoveredCardMesh: Mesh | null = null;
    
    const targetPos = new Vector3(0, 2, 0);
    const currentPos = new Vector3(0, 2, 0);
    const currentRot = new Quaternion();
    
    let fingerCurl = $state(0);
    let indexCurl = $state(0);

    const raycaster = new Raycaster();
    const mouse = new Vector2();
    const plane = new Plane(new Vector3(0, 1, 0), -2);
    const intersectPoint = new Vector3();

    // Highlighting Logic
    const highlightColor = new Color("#ffaa00");
    const noEmissive = new Color("#000000");

    function setEmissive(mesh: Mesh, color: Color) {
        if (!mesh.material) return;
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => {
                if (m instanceof MeshStandardMaterial) {
                    m.emissive.copy(color);
                    m.emissiveIntensity = 0.5;
                }
            });
        } else if (mesh.material instanceof MeshStandardMaterial) {
            mesh.material.emissive.copy(color);
            mesh.material.emissiveIntensity = 0.5;
        }
    }

    function onMouseMove(e: MouseEvent) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    function onMouseDown() {
        handState = 'grabbing';
        if (hoveredCardId) {
            dispatch('select', { id: hoveredCardId });
        }
    }

    function onMouseUp() {
        handState = hoveredCardId ? 'pointing' : 'idle';
    }

    onMount(() => {
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        return () => {
            if (hoveredCardMesh) setEmissive(hoveredCardMesh, noEmissive);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mouseup", onMouseUp);
        };
    });

    useTask((delta) => {
        if (!$camera) return;

        raycaster.setFromCamera(mouse, $camera);
        
        const interacts = raycaster.intersectObjects(scene.children, true);
        const cardHit = interacts.find(hit => hit.object.userData.isCard);

        if (cardHit) {
            const hitMesh = cardHit.object as Mesh;
            if (hitMesh !== hoveredCardMesh) {
                if (hoveredCardMesh) setEmissive(hoveredCardMesh, noEmissive);
                hoveredCardMesh = hitMesh;
                hoveredCardId = hitMesh.userData.cardId;
                setEmissive(hoveredCardMesh, highlightColor);
            }
            
            if (handState !== 'grabbing') {
                handState = 'pointing';
            }
            targetPos.copy(cardHit.point).add(new Vector3(0, 1, 0));
        } else {
            if (hoveredCardMesh) {
                setEmissive(hoveredCardMesh, noEmissive);
                hoveredCardMesh = null;
                hoveredCardId = null;
            }
            
            if (handState !== 'grabbing') {
                handState = 'idle';
            }
            raycaster.ray.intersectPlane(plane, intersectPoint);
            targetPos.copy(intersectPoint);
        }

        const lerpFactor = 10 * delta;
        currentPos.lerp(targetPos, lerpFactor);
        
        const velocity = new Vector3().copy(targetPos).sub(currentPos).multiplyScalar(5);
        const tiltX = velocity.z * 0.5;
        const tiltZ = -velocity.x * 0.5;
        
        const targetEuler = new Euler(tiltX, 0, tiltZ);
        const targetQ = new Quaternion().setFromEuler(targetEuler);
        currentRot.slerp(targetQ, lerpFactor);

        let targetIndexCurl = 0;
        let targetOtherCurl = 0;

        if (handState === 'idle') {
            targetIndexCurl = 0.1;
            targetOtherCurl = 0.1;
        } else if (handState === 'pointing') {
            targetIndexCurl = 0;
            targetOtherCurl = 1.2;
        } else if (handState === 'grabbing') {
            targetIndexCurl = 1.5;
            targetOtherCurl = 1.5;
        }

        indexCurl = MathUtils.lerp(indexCurl, targetIndexCurl, lerpFactor);
        fingerCurl = MathUtils.lerp(fingerCurl, targetOtherCurl, lerpFactor);
    });
</script>

<T.Group 
    position={[currentPos.x, currentPos.y, currentPos.z]} 
    quaternion={[currentRot.x, currentRot.y, currentRot.z, currentRot.w]}
>
    <T.Mesh position={[0, 0, 0]} castShadow>
        <T.BoxGeometry args={[0.5, 0.15, 0.6]} />
        <T.MeshStandardMaterial color="#ffccaa" />
    </T.Mesh>

    <T.Mesh position={[0, 0, 0.35]}>
         <T.CylinderGeometry args={[0.2, 0.25, 0.2]} />
         <T.MeshStandardMaterial color="#ffccaa" />
    </T.Mesh>

    <T.Group position={[0.3, 0, 0.1]} rotation={[0, -0.5, 0]}>
        <T.Group rotation={[fingerCurl * 0.5, 0, 0]}>
            <T.Mesh position={[0.05, 0, -0.15]}>
                <T.BoxGeometry args={[0.12, 0.12, 0.3]} />
                <T.MeshStandardMaterial color="#ffccaa" />
            </T.Mesh>
             <T.Group position={[0.05, 0, -0.3]} rotation={[fingerCurl * 0.5, 0, 0]}>
                <T.Mesh position={[0, 0, -0.1]}>
                    <T.BoxGeometry args={[0.1, 0.1, 0.2]} />
                    <T.MeshStandardMaterial color="#ffccaa" />
                </T.Mesh>
             </T.Group>
        </T.Group>
    </T.Group>

    <T.Group position={[0.18, 0, -0.3]}>
        <T.Group rotation={[indexCurl, 0, 0]}>
            <T.Mesh position={[0, 0, -0.15]}>
                <T.BoxGeometry args={[0.1, 0.1, 0.3]} />
                <T.MeshStandardMaterial color="#ffccaa" />
            </T.Mesh>
            <T.Group position={[0, 0, -0.3]} rotation={[indexCurl * 0.5, 0, 0]}>
                <T.Mesh position={[0, 0, -0.15]}>
                    <T.BoxGeometry args={[0.09, 0.09, 0.25]} />
                    <T.MeshStandardMaterial color="#ffccaa" />
                </T.Mesh>
            </T.Group>
        </T.Group>
    </T.Group>

    <T.Group position={[0.0, 0, -0.3]}>
        <T.Group rotation={[fingerCurl, 0, 0]}>
            <T.Mesh position={[0, 0, -0.16]}>
                <T.BoxGeometry args={[0.1, 0.1, 0.32]} />
                <T.MeshStandardMaterial color="#ffccaa" />
            </T.Mesh>
            <T.Group position={[0, 0, -0.32]} rotation={[fingerCurl * 0.5, 0, 0]}>
                <T.Mesh position={[0, 0, -0.16]}>
                    <T.BoxGeometry args={[0.09, 0.09, 0.26]} />
                    <T.MeshStandardMaterial color="#ffccaa" />
                </T.Mesh>
            </T.Group>
        </T.Group>
    </T.Group>

    <T.Group position={[-0.18, 0, -0.3]}>
        <T.Group rotation={[fingerCurl, 0, 0]}>
            <T.Mesh position={[0, 0, -0.15]}>
                <T.BoxGeometry args={[0.1, 0.1, 0.3]} />
                <T.MeshStandardMaterial color="#ffccaa" />
            </T.Mesh>
             <T.Group position={[0, 0, -0.3]} rotation={[fingerCurl * 0.5, 0, 0]}>
                <T.Mesh position={[0, 0, -0.15]}>
                    <T.BoxGeometry args={[0.09, 0.09, 0.25]} />
                    <T.MeshStandardMaterial color="#ffccaa" />
                </T.Mesh>
            </T.Group>
        </T.Group>
    </T.Group>

    <T.Group position={[-0.34, 0, -0.3]}>
        <T.Group rotation={[fingerCurl, 0, 0]}>
            <T.Mesh position={[0, 0, -0.12]}>
                <T.BoxGeometry args={[0.09, 0.09, 0.24]} />
                <T.MeshStandardMaterial color="#ffccaa" />
            </T.Mesh>
            <T.Group position={[0, 0, -0.24]} rotation={[fingerCurl * 0.5, 0, 0]}>
                <T.Mesh position={[0, 0, -0.12]}>
                    <T.BoxGeometry args={[0.08, 0.08, 0.2]} />
                    <T.MeshStandardMaterial color="#ffccaa" />
                </T.Mesh>
            </T.Group>
        </T.Group>
    </T.Group>

</T.Group>
