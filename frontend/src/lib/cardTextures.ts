import { CanvasTexture, Color } from 'three';

const WIDTH = 512;
const HEIGHT = 896; // 1 : 1.75 aspect ratio

export function createCardBackTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');

    // Background - Deep Mystical Purple
    const gradient = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, HEIGHT);
    gradient.addColorStop(0, '#2a1b4e');
    gradient.addColorStop(1, '#110524');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Gold Ink
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Border
    const pad = 20;
    ctx.strokeRect(pad, pad, WIDTH - pad*2, HEIGHT - pad*2);
    ctx.strokeRect(pad + 10, pad + 10, WIDTH - pad*2 - 20, HEIGHT - pad*2 - 20);

    // Sacred Geometry - Central Mandala
    ctx.save();
    ctx.translate(WIDTH/2, HEIGHT/2);
    
    // Outer Circle
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Diamond
    ctx.beginPath();
    ctx.moveTo(0, -150);
    ctx.lineTo(150, 0);
    ctx.lineTo(0, 150);
    ctx.lineTo(-150, 0);
    ctx.closePath();
    ctx.stroke();

    // Inner Star (Hexagram-ish)
    ctx.beginPath();
    for(let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const x = Math.cos(angle) * 100;
        const y = Math.sin(angle) * 100;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // Rays
    ctx.globalAlpha = 0.3;
    for(let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 200, Math.sin(angle) * 200);
        ctx.stroke();
    }
    ctx.restore();

    // Texture/Noise Overlay
    addNoise(ctx, 0.05);

    const texture = new CanvasTexture(canvas);
    return texture;
}

export function createCardFrontTexture(card: any): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');

    const isMajor = card.arcana === 'major';
    
    // Background
    if (isMajor) {
        ctx.fillStyle = '#1a1a2e'; // Darker for Major
    } else {
        ctx.fillStyle = '#f7f2e8'; // Parchment for Minor
    }
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Border
    const borderColor = isMajor ? '#ffd700' : '#4a4a4a';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 15;
    ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);
    
    // Inner thin border
    ctx.lineWidth = 2;
    ctx.strokeRect(25, 25, WIDTH - 50, HEIGHT - 50);

    // Text Setup
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Card Name (Bottom)
    ctx.font = isMajor ? 'bold 40px serif' : '36px serif';
    ctx.fillStyle = isMajor ? '#ffd700' : '#2a2a2a';
    wrapText(ctx, card.name, WIDTH/2, HEIGHT - 100, WIDTH - 100, 50);

    // Number (Top)
    ctx.font = 'bold 32px serif';
    ctx.fillText(card.number.toString(), WIDTH/2, 80);

    // Center Icon / Art
    ctx.save();
    ctx.translate(WIDTH/2, HEIGHT/2 - 40);
    
    if (isMajor) {
        drawMajorArt(ctx, card);
    } else {
        drawSuitArt(ctx, card.suit, card.number);
    }
    ctx.restore();

    // Add aged paper texture effect
    addNoise(ctx, 0.08);

    const texture = new CanvasTexture(canvas);
    return texture;
}

function drawMajorArt(ctx: CanvasRenderingContext2D, card: any) {
    ctx.strokeStyle = '#ffd700';
    ctx.fillStyle = '#ffd700';
    ctx.lineWidth = 5;

    // Simple symbolic representation for Major Arcana
    // Just a large Roman Numeral styling or simple shape
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner circle
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Very simple unique symbols based on ID logic could go here, 
    // but for MVP generic Major symbol is fine.
    // Let's add a Star.
    drawStar(ctx, 0, 0, 5, 80, 40);
}

function drawSuitArt(ctx: CanvasRenderingContext2D, suit: string, number: number) {
    let color = '#000';
    if (suit === 'wands') color = '#c0392b'; // Fire
    if (suit === 'cups') color = '#2980b9'; // Water
    if (suit === 'swords') color = '#7f8c8d'; // Air/Steel
    if (suit === 'pentacles') color = '#27ae60'; // Earth

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    
    // Draw central large icon
    // Scaling based on suit
    const scale = 1.5;
    ctx.scale(scale, scale);

    if (suit === 'wands') {
        // Stick/Wand
        ctx.fillRect(-10, -80, 20, 160);
        // Leaves
        ctx.beginPath();
        ctx.arc(-10, -60, 10, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(10, 40, 10, 0, Math.PI*2);
        ctx.fill();
    } else if (suit === 'cups') {
        // Chalice
        ctx.beginPath();
        ctx.moveTo(-40, -40);
        ctx.bezierCurveTo(-40, 40, 40, 40, 40, -40);
        ctx.lineTo(-40, -40);
        ctx.fill();
        // Stem
        ctx.fillRect(-5, 0, 10, 60);
        // Base
        ctx.beginPath();
        ctx.ellipse(0, 60, 30, 10, 0, 0, Math.PI*2);
        ctx.fill();
    } else if (suit === 'swords') {
        // Sword
        ctx.beginPath();
        ctx.moveTo(0, -80); // Tip
        ctx.lineTo(15, -60);
        ctx.lineTo(5, -60);
        ctx.lineTo(5, 40);
        ctx.lineTo(0, 50); // Pointy bottom of blade? No, handle.
        ctx.lineTo(-5, 40);
        ctx.lineTo(-5, -60);
        ctx.lineTo(-15, -60);
        ctx.closePath();
        ctx.fill();
        // Hilt
        ctx.fillRect(-20, 40, 40, 10);
        ctx.fillRect(-5, 50, 10, 20); // Pommel
    } else if (suit === 'pentacles') {
        // Coin
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI*2);
        ctx.fill();
        // Inner star cutout (white)
        ctx.fillStyle = '#f7f2e8';
        drawStar(ctx, 0, 0, 5, 40, 20);
    }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    
    // Check if it fits
    if (ctx.measureText(text).width < maxWidth) {
        ctx.fillText(text, x, y);
        return;
    }

    for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y - lineHeight/2);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, y - lineHeight/2);
}

function addNoise(ctx: CanvasRenderingContext2D, amount: number) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const idata = ctx.getImageData(0, 0, w, h);
    const buffer32 = new Uint32Array(idata.data.buffer);
    const len = buffer32.length;

    for (let i = 0; i < len; i++) {
        if (Math.random() < 0.5) continue; // Skip some pixels
        
        // We just modify the alpha/color slightly? 
        // Actually modifying buffer32 directly is complex with endianness.
        // Let's use a simpler noise overlay method.
    }
    // Revert to simple overlay
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    for (let i=0; i < 5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
        ctx.globalAlpha = amount;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    ctx.restore();
}
