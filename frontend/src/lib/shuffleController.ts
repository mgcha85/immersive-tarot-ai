import type { RigidBody } from "@dimforge/rapier3d-compat";
import { Vector3, Quaternion, Euler, MathUtils } from "three";

export enum ShuffleType {
    Riffle = 'riffle',
    Overhand = 'overhand',
    Scatter = 'scatter'
}

const CARD_THICKNESS = 0.02;
const STACK_BASE_Y = 2.0; 

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function performShuffle(
    bodies: RigidBody[],
    type: ShuffleType = ShuffleType.Scatter
) {
    const cards = bodies.filter(b => b && b.isValid());
    if (cards.length === 0) return;

    console.log(`Starting ${type} shuffle on ${cards.length} cards...`);

    cards.forEach(b => {
        b.setBodyType(0, true);
        b.wakeUp();
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });

    switch (type) {
        case ShuffleType.Scatter:
            await scatterShuffle(cards);
            break;
        case ShuffleType.Riffle:
            await riffleShuffle(cards);
            break;
        case ShuffleType.Overhand:
            await overhandShuffle(cards);
            break;
    }

    await stackNeatly(cards);
}

async function scatterShuffle(cards: RigidBody[]) {
    cards.forEach(body => {
        const angle = Math.random() * Math.PI * 2;
        const force = 8 + Math.random() * 4;
        const upForce = 5 + Math.random() * 5;
        
        body.applyImpulse({
            x: Math.cos(angle) * force,
            y: upForce,
            z: Math.sin(angle) * force
        }, true);

        body.applyTorqueImpulse({
            x: Math.random() * 0.5,
            y: Math.random() * 1.0,
            z: Math.random() * 0.5
        }, true);
    });

    await wait(800);

    const duration = 60;
    for (let i = 0; i < duration; i++) {
        cards.forEach(body => {
            const pos = body.translation();
            const target = { x: 0, y: 4, z: 0 };
            
            const dirX = target.x - pos.x;
            const dirY = target.y - pos.y;
            const dirZ = target.z - pos.z;

            const strength = 2.0;
            body.applyImpulse({
                x: dirX * strength * 0.1,
                y: dirY * strength * 0.1,
                z: dirZ * strength * 0.1
            }, true);

            const linvel = body.linvel();
            body.setLinvel({
                x: linvel.x * 0.9,
                y: linvel.y * 0.9,
                z: linvel.z * 0.9
            }, true);
            
            const angvel = body.angvel();
            body.setAngvel({
                x: angvel.x * 0.9,
                y: angvel.y * 0.9,
                z: angvel.z * 0.9
            }, true);
        });
        await wait(16);
    }
}

async function riffleShuffle(cards: RigidBody[]) {
    const mid = Math.floor(cards.length / 2);
    const leftPile = cards.slice(0, mid);
    const rightPile = cards.slice(mid);

    leftPile.forEach(b => {
        b.setLinvel({ x: -5, y: 2, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: 0.5 }, true);
    });
    rightPile.forEach(b => {
        b.setLinvel({ x: 5, y: 2, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: -0.5 }, true);
    });

    await wait(600);

    cards.forEach(b => {
        b.setLinvel({ x: 0, y: 0, z: 0 }, true);
        b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });

    const maxLen = Math.max(leftPile.length, rightPile.length);
    
    for (let i = 0; i < maxLen; i++) {
        if (leftPile[i]) {
            shootToCenter(leftPile[i], -1);
            await wait(30);
        }
        if (rightPile[i]) {
            shootToCenter(rightPile[i], 1);
            await wait(30);
        }
    }

    await wait(500);
}

function shootToCenter(body: RigidBody, sideMultiplier: number) {
    body.applyImpulse({
        x: -sideMultiplier * 4,
        y: 6,
        z: 0
    }, true);

    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

async function overhandShuffle(cards: RigidBody[]) {
    const chunkSize = Math.floor(cards.length / 5);
    
    for (let i = 0; i < 5; i++) {
        const start = i * chunkSize;
        const end = start + chunkSize;
        const chunk = cards.slice(start, end);

        chunk.forEach(b => {
            b.applyImpulse({ x: 0, y: 8, z: 0 }, true);
            b.applyTorqueImpulse({ x: 0.1, y: 0, z: 0 }, true);
        });

        await wait(200);

        chunk.forEach(b => {
            b.applyImpulse({ x: (Math.random() - 0.5), y: 0, z: (Math.random() - 0.5) }, true);
        });

        await wait(400);
    }
}

async function stackNeatly(cards: RigidBody[]) {
    const targetBase = { x: 0, y: STACK_BASE_Y, z: 0 };

    const shuffledIndices = Array.from({ length: cards.length }, (_, i) => i)
        .sort(() => Math.random() - 0.5);

    const steps = 60;
    
    for (let step = 0; step < steps; step++) {
        const progress = step / steps;
        
        cards.forEach((body, i) => {
            const stackIndex = shuffledIndices[i];
            const targetY = targetBase.y + (stackIndex * CARD_THICKNESS);
            const targetPos = { x: targetBase.x, y: targetY, z: targetBase.z };
            
            const currentPos = body.translation();
            
            const k = 10.0;
            const fx = (targetPos.x - currentPos.x) * k;
            const fy = (targetPos.y - currentPos.y) * k * 2;
            const fz = (targetPos.z - currentPos.z) * k;

            body.applyImpulse({ 
                x: fx * 0.05, 
                y: fy * 0.05, 
                z: fz * 0.05 
            }, true);

            if (step > steps - 10) {
                const lv = body.linvel();
                const av = body.angvel();
                body.setLinvel({ x: lv.x * 0.5, y: lv.y * 0.5, z: lv.z * 0.5 }, true);
                body.setAngvel({ x: av.x * 0.5, y: av.y * 0.5, z: av.z * 0.5 }, true);
            }
        });

        await wait(16);
    }

    cards.forEach((body, i) => {
        const stackIndex = shuffledIndices[i];
        const targetY = targetBase.y + (stackIndex * CARD_THICKNESS);
        
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setTranslation({ x: 0, y: targetY, z: 0 }, true);
        
        const randomYRot = (Math.random() - 0.5) * 0.1;
        const q = new Quaternion().setFromEuler(new Euler(0, randomYRot, 0));
        body.setRotation(q, true);
        
        body.sleep();
    });
}
