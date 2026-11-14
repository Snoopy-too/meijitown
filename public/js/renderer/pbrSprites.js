// Project Meiji - Procedural Particle & Botanical Sprite Texture Renderers (pbrSprites.js)
// Clean extraction from PBRTextureGenerator keeping texture modules concise (< 600 lines)

import * as THREE from 'three';

function hash2(ix, iy) {
    const v = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
    return v - Math.floor(v);
}

export function createParticleSpriteTexture(kind = 'smoke') {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (kind === 'flame') {
        const grad = ctx.createRadialGradient(64, 82, 4, 64, 68, 56);
        grad.addColorStop(0.0, 'rgba(255, 252, 220, 1.0)');
        grad.addColorStop(0.28, 'rgba(255, 195, 65, 0.92)');
        grad.addColorStop(0.62, 'rgba(255, 85, 20, 0.55)');
        grad.addColorStop(1.0, 'rgba(180, 20, 0, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
    } else if (kind === 'spark') {
        const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 52);
        grad.addColorStop(0.0, 'rgba(255, 250, 220, 1.0)');
        grad.addColorStop(0.35, 'rgba(255, 165, 45, 0.85)');
        grad.addColorStop(1.0, 'rgba(255, 60, 0, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
    } else if (kind === 'wake') {
        const grad = ctx.createLinearGradient(0, 0, 0, size);
        grad.addColorStop(0.0, 'rgba(235, 248, 255, 0.72)');
        grad.addColorStop(0.45, 'rgba(210, 238, 248, 0.35)');
        grad.addColorStop(1.0, 'rgba(180, 225, 240, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(64, 4);
        ctx.lineTo(120, 124);
        ctx.lineTo(8, 124);
        ctx.closePath();
        ctx.fill();
    } else {
        const blobs = [
            [64, 64, 42, 0.52],
            [46, 68, 30, 0.38],
            [82, 66, 30, 0.38],
            [60, 48, 32, 0.40],
            [68, 78, 28, 0.30]
        ];
        for (const [bx, by, br, alpha] of blobs) {
            const g = ctx.createRadialGradient(bx, by, 2, bx, by, br);
            g.addColorStop(0.0, `rgba(255, 255, 255, ${alpha})`);
            g.addColorStop(0.55, `rgba(245, 245, 248, ${alpha * 0.55})`);
            g.addColorStop(1.0, 'rgba(240, 240, 245, 0.0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, size, size);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { isSharedLibraryTexture: true };
    return tex;
}

export function createFoliageSpriteTexture(species = 'sakura', maxAnisotropy = 4) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    if (species === 'pine') {
        for (let i = 0; i < 110; i++) {
            const h1 = hash2(i, 3);
            const h2 = hash2(i, 19);
            const cx = 128 + (h1 - 0.5) * 116;
            const cy = 128 + (h2 - 0.5) * 86;
            if (Math.hypot((cx - 128) * 0.85, (cy - 128) * 1.15) > 95) continue;
            const shade = Math.floor(195 + hash2(i, 41) * 60);
            ctx.strokeStyle = `rgb(${shade - 15}, ${shade}, ${shade - 20})`;
            ctx.lineWidth = 2.6;
            for (let n = -3; n <= 3; n++) {
                const ang = -Math.PI * 0.5 + n * 0.24 + (h1 - 0.5) * 0.3;
                const len = 16 + hash2(i + n, 7) * 14;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
                ctx.stroke();
            }
        }
    } else if (species === 'willow') {
        for (let s = 0; s < 14; s++) {
            const sx = 28 + (s / 13) * 200;
            const topY = 12 + hash2(s, 5) * 28;
            const botY = 210 + hash2(s, 9) * 38;
            ctx.strokeStyle = 'rgba(215, 232, 185, 0.92)';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(sx, topY);
            ctx.lineTo(sx + (hash2(s, 2) - 0.5) * 14, botY);
            ctx.stroke();

            for (let y = topY + 10; y < botY; y += 11) {
                const side = ((y | 0) % 2 === 0) ? 1 : -1;
                const shade = 215 + Math.floor(hash2(s, y) * 40);
                ctx.fillStyle = `rgb(${shade - 12}, ${shade}, ${shade - 22})`;
                ctx.beginPath();
                ctx.ellipse(sx + side * 6, y, 7.5, 2.6, side * 0.45, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } else {
        for (let i = 0; i < 95; i++) {
            const a = hash2(i, 11) * Math.PI * 2;
            const r = Math.sqrt(hash2(i, 29)) * 88;
            const cx = 128 + Math.cos(a) * r;
            const cy = 128 + Math.sin(a) * r * 0.84;
            const rad = 11 + hash2(i, 53) * 14;
            const tone = Math.floor(218 + hash2(i, 71) * 37);
            ctx.fillStyle = `rgb(${tone}, ${tone - 6}, ${tone - 4})`;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.userData = { isSharedLibraryTexture: true };
    return tex;
}
