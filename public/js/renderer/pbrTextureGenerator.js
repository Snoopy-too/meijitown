// Project Meiji - Procedural Heightfield PBR & Foliage/Particle Texture Generator
// /artisan ultra: 512px Height -> Albedo + Sobel Tangent Normal + Roughness PBR sets & soft botanical/FX sprites

import * as THREE from 'three';

function fract(v) { return v - Math.floor(v); }

function hash2(ix, iy) {
    return fract(Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123);
}

function periodicNoise(u, v, period) {
    const x = u * period;
    const y = v * period;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const ix0 = ((ix % period) + period) % period;
    const iy0 = ((iy % period) + period) % period;
    const ix1 = (ix0 + 1) % period;
    const iy1 = (iy0 + 1) % period;
    const a = hash2(ix0, iy0);
    const b = hash2(ix1, iy0);
    const c = hash2(ix0, iy1);
    const d = hash2(ix1, iy1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function periodicFbm(u, v, basePeriod = 4, octaves = 4) {
    let sum = 0;
    let amp = 0.5;
    let freq = basePeriod;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
        sum += periodicNoise(u, v, freq) * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2;
    }
    return sum / (norm || 1);
}

function clamp255(v) {
    return v < 0 ? 0 : (v > 255 ? 255 : (v | 0));
}

export class PBRTextureGenerator {
    static _sets = new Map();
    static _sprites = new Map();
    static _maxAnisotropy = 4;

    static setMaxAnisotropy(maxAniso) {
        const clamped = Math.max(1, Math.min(16, maxAniso || 1));
        this._maxAnisotropy = clamped;
        for (const set of this._sets.values()) {
            if (!set) continue;
            for (const tex of [set.map, set.normalMap, set.roughnessMap]) {
                if (tex && 'anisotropy' in tex) tex.anisotropy = clamped;
            }
        }
        for (const tex of this._sprites.values()) {
            if (tex && 'anisotropy' in tex) tex.anisotropy = clamped;
        }
    }

    static _canRender2D(needsImageData = true) {
        if (typeof document === 'undefined' || typeof document.createElement !== 'function') return false;
        const test = document.createElement('canvas');
        const ctx = typeof test.getContext === 'function' ? test.getContext('2d') : null;
        if (!ctx) return false;
        if (needsImageData && typeof ctx.createImageData !== 'function') return false;
        if (!needsImageData && typeof ctx.createRadialGradient !== 'function') return false;
        return true;
    }

    static _createCanvasTexture(canvas, isColor = true, repeatX = 1, repeatY = 1) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if (tex.repeat && typeof tex.repeat.set === 'function') {
            tex.repeat.set(repeatX, repeatY);
        }
        if (isColor && THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
        }
        tex.anisotropy = this._maxAnisotropy;
        tex.userData = { isSharedLibraryTexture: true };
        return tex;
    }

    /**
     * Synthesizes seamless tileable { map, normalMap, roughnessMap } from a height + surface evaluator.
     */
    static buildPBRSet(key, size, evalFn, normalStrength = 3.0, repeatX = 1, repeatY = 1) {
        if (this._sets.has(key)) return this._sets.get(key);
        if (!this._canRender2D(true)) return { map: null, normalMap: null, roughnessMap: null };

        const albedoCanvas = document.createElement('canvas');
        const normalCanvas = document.createElement('canvas');
        const roughCanvas = document.createElement('canvas');
        albedoCanvas.width = normalCanvas.width = roughCanvas.width = size;
        albedoCanvas.height = normalCanvas.height = roughCanvas.height = size;

        const aCtx = albedoCanvas.getContext('2d');
        const nCtx = normalCanvas.getContext('2d');
        const rCtx = roughCanvas.getContext('2d');
        const aImg = aCtx.createImageData(size, size);
        const nImg = nCtx.createImageData(size, size);
        const rImg = rCtx.createImageData(size, size);

        const heights = new Float32Array(size * size);
        const out = [0, 0, 0, 0, 0]; // r, g, b, height, roughness

        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                evalFn(u, v, out);
                const pIdx = y * size + x;
                const cIdx = pIdx * 4;
                aImg.data[cIdx] = clamp255(out[0]);
                aImg.data[cIdx + 1] = clamp255(out[1]);
                aImg.data[cIdx + 2] = clamp255(out[2]);
                aImg.data[cIdx + 3] = 255;

                heights[pIdx] = out[3];

                const roughByte = clamp255(out[4] * 255);
                rImg.data[cIdx] = roughByte;
                rImg.data[cIdx + 1] = roughByte;
                rImg.data[cIdx + 2] = roughByte;
                rImg.data[cIdx + 3] = 255;
            }
        }

        // Seamless Sobel normal extraction from heightfield
        const sampleH = (sx, sy) => {
            const wx = ((sx % size) + size) % size;
            const wy = ((sy % size) + size) % size;
            return heights[wy * size + wx];
        };
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const tl = sampleH(x - 1, y - 1);
                const t  = sampleH(x,     y - 1);
                const tr = sampleH(x + 1, y - 1);
                const l  = sampleH(x - 1, y);
                const r  = sampleH(x + 1, y);
                const bl = sampleH(x - 1, y + 1);
                const b  = sampleH(x,     y + 1);
                const br = sampleH(x + 1, y + 1);

                const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
                const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
                let nx = -dx * normalStrength;
                let ny = dy * normalStrength;
                let nz = 1.0;
                const invLen = 1.0 / (Math.hypot(nx, ny, nz) || 1.0);
                nx *= invLen; ny *= invLen; nz *= invLen;

                const idx = (y * size + x) * 4;
                nImg.data[idx] = clamp255((nx * 0.5 + 0.5) * 255);
                nImg.data[idx + 1] = clamp255((ny * 0.5 + 0.5) * 255);
                nImg.data[idx + 2] = clamp255((nz * 0.5 + 0.5) * 255);
                nImg.data[idx + 3] = 255;
            }
        }

        aCtx.putImageData(aImg, 0, 0);
        nCtx.putImageData(nImg, 0, 0);
        rCtx.putImageData(rImg, 0, 0);

        const set = {
            map: this._createCanvasTexture(albedoCanvas, true, repeatX, repeatY),
            normalMap: this._createCanvasTexture(normalCanvas, false, repeatX, repeatY),
            roughnessMap: this._createCanvasTexture(roughCanvas, false, repeatX, repeatY)
        };
        this._sets.set(key, set);
        return set;
    }

    static getKawaraSet() {
        // Smoked silver-slate Ibushi-gawara curved clay roof tiles
        return this.buildPBRSet('kawara', 256, (u, v, out) => {
            const cols = 10;
            const rows = 9;
            const cu = fract(u * cols);
            const rv = fract(v * rows);
            const colIdx = Math.floor(u * cols);
            const rowIdx = Math.floor(v * rows);

            // Half-round marugawara cover ridge + concave hiragawara pan valley
            const panDist = Math.abs(cu - 0.5) * 2.0; // 0 in valley, 1 at ridge
            const ridgeProfile = cu < 0.22 ? Math.cos((cu / 0.22) * Math.PI * 0.5) * 0.65
                : (cu > 0.78 ? Math.cos(((1.0 - cu) / 0.22) * Math.PI * 0.5) * 0.65 : (1.0 - Math.sin((cu - 0.22) / 0.56 * Math.PI) * 0.25) * 0.25);

            // Course overlap lip at bottom edge of each row
            const overlapLip = rv < 0.10 ? (0.10 - rv) * 2.2 : 0.0;
            const lapShadow = rv < 0.14 ? rv / 0.14 : 1.0;

            const grain = periodicFbm(u, v, 8, 3);
            const tileJitter = (hash2(colIdx, rowIdx) - 0.5) * 14.0;
            const mossValley = Math.max(0, 1.0 - panDist * 1.8) * Math.max(0, grain - 0.62) * 0.45;

            const baseTone = 68 + ridgeProfile * 36 + grain * 18 + tileJitter;
            const ao = 0.62 + 0.38 * lapShadow * (0.78 + 0.22 * ridgeProfile);

            out[0] = (baseTone - mossValley * 24) * ao;
            out[1] = (baseTone + 4 + mossValley * 14) * ao;
            out[2] = (baseTone + 12 - mossValley * 20) * ao;
            out[3] = ridgeProfile * 0.75 + (1.0 - overlapLip) * 0.20 + grain * 0.05;
            out[4] = Math.min(0.95, Math.max(0.32, 0.58 - ridgeProfile * 0.20 + mossValley * 0.35 + (1.0 - lapShadow) * 0.22));
        }, 3.6, 1, 1);
    }

    static getBrickSet() {
        // Kiln-fired Meiji red brick (Akarenga) with recessed lime mortar
        return this.buildPBRSet('brick', 256, (u, v, out) => {
            const rows = 10;
            const cols = 5;
            const rowIdx = Math.floor(v * rows);
            const rv = fract(v * rows);
            const staggeredU = fract(u * cols + (rowIdx % 2) * 0.5);
            const colIdx = Math.floor((u * cols + (rowIdx % 2) * 0.5)) % cols;

            const mortarV = 0.13;
            const mortarU = 0.065;
            const dv = Math.min(rv, 1.0 - rv);
            const du = Math.min(staggeredU, 1.0 - staggeredU);
            const isMortar = dv < mortarV || du < mortarU;

            const grain = periodicFbm(u, v, 10, 3);
            const micro = periodicFbm(u, v, 24, 2);

            if (isMortar) {
                const mTone = 194 + (grain - 0.5) * 28 + (micro - 0.5) * 14;
                out[0] = mTone;
                out[1] = mTone - 8;
                out[2] = mTone - 20;
                out[3] = 0.12 + micro * 0.08;
                out[4] = 0.94;
            } else {
                const bev = Math.min(1.0, Math.min((dv - mortarV) / 0.07, (du - mortarU) / 0.05));
                const bSeed = hash2(colIdx * 7 + 3, rowIdx * 11 + 5);
                const clinker = bSeed > 0.84 ? -32 : (bSeed < 0.18 ? 18 : (bSeed - 0.5) * 26);

                out[0] = 166 + clinker + (grain - 0.5) * 24;
                out[1] = 64 + clinker * 0.55 + (grain - 0.5) * 18;
                out[2] = 43 + clinker * 0.35 + (micro - 0.5) * 14;
                out[3] = 0.45 + bev * 0.42 + (grain - 0.5) * 0.13;
                out[4] = 0.72 + (1.0 - bev) * 0.16 + (micro - 0.5) * 0.12;
            }
        }, 3.2, 1, 1);
    }

    static getPlasterSet() {
        // Hand-troweled Shikkui lime plaster with subtle mineral texture
        return this.buildPBRSet('plaster', 256, (u, v, out) => {
            const broad = periodicFbm(u, v, 3, 4);
            const fine = periodicFbm(u + 0.37, v + 0.19, 14, 3);
            const trowel = Math.sin(u * Math.PI * 6 + broad * 4.0) * 0.5 + 0.5;
            const base = 236 + (broad - 0.5) * 18 + (trowel - 0.5) * 8 + (fine - 0.5) * 10;

            out[0] = base;
            out[1] = base - 4;
            out[2] = base - 12;
            out[3] = 0.45 + trowel * 0.25 + fine * 0.30;
            out[4] = 0.80 + (1.0 - trowel) * 0.10 + (fine - 0.5) * 0.08;
        }, 1.5, 1, 1);
    }

    static getNamakoSet() {
        // Raised rounded white plaster kamaboko ridges over dark slate tiles
        return this.buildPBRSet('namako', 256, (u, v, out) => {
            const d1 = Math.abs(fract(u * 4 + v * 4) - 0.5);
            const d2 = Math.abs(fract(u * 4 - v * 4 + 4.0) - 0.5);
            const dMin = Math.min(d1, d2);
            const ridgeW = 0.13;
            const grain = periodicFbm(u, v, 10, 3);

            if (dMin < ridgeW) {
                const dome = Math.sqrt(Math.max(0, 1.0 - Math.pow(dMin / ridgeW, 2)));
                const tone = 228 + dome * 20 + (grain - 0.5) * 10;
                out[0] = tone;
                out[1] = tone - 3;
                out[2] = tone - 9;
                out[3] = 0.35 + dome * 0.65;
                out[4] = 0.78 - dome * 0.12;
            } else {
                const shade = 36 + grain * 14;
                out[0] = shade;
                out[1] = shade + 3;
                out[2] = shade + 9;
                out[3] = 0.15 + grain * 0.08;
                out[4] = 0.66 + grain * 0.14;
            }
        }, 3.8, 1, 1);
    }

    static getWoodWallSet() {
        // Horizontal overlapping cedar Shitami-ita clapboard siding with wood grain
        return this.buildPBRSet('woodWall', 256, (u, v, out) => {
            const planks = 9;
            const plankIdx = Math.floor(v * planks);
            const pv = fract(v * planks);
            const woodGrain = periodicFbm(u * 0.5, v * 4.5, 8, 3);
            const fineFiber = periodicFbm(u * 0.25, v * 12.0, 16, 2);
            const plankTint = (hash2(plankIdx, 13) - 0.5) * 16;
            const lapSlope = Math.min(1.0, pv / 0.14);

            const shade = (88 + plankTint + (woodGrain - 0.5) * 26 + (fineFiber - 0.5) * 12) * (0.68 + 0.32 * lapSlope);
            out[0] = shade * 1.06;
            out[1] = shade * 0.78;
            out[2] = shade * 0.54;
            out[3] = 0.25 + pv * 0.55 + woodGrain * 0.20;
            out[4] = 0.74 + (1.0 - woodGrain) * 0.16;
        }, 2.8, 1, 1);
    }

    static getStoneSet() {
        // Dressed quarry granite with quartz/feldspar/biotite fleck
        return this.buildPBRSet('stone', 256, (u, v, out) => {
            const macro = periodicFbm(u, v, 6, 4);
            const fleck = periodicNoise(u, v, 48);
            const speckle = fleck > 0.78 ? 26 : (fleck < 0.20 ? -28 : 0);
            const base = 122 + (macro - 0.5) * 26 + speckle;

            out[0] = base + 3;
            out[1] = base;
            out[2] = base - 5;
            out[3] = 0.35 + macro * 0.45 + fleck * 0.20;
            out[4] = 0.80 + (1.0 - fleck) * 0.14;
        }, 2.4, 2, 2);
    }

    static getIshigakiSet() {
        // Interlocking canal retaining stonework with mossy mortar crevices
        return this.buildPBRSet('ishigaki', 256, (u, v, out) => {
            const rows = 5;
            const cols = 4;
            const r = Math.floor(v * rows);
            const rv = fract(v * rows);
            const su = fract(u * cols + (r % 2) * 0.45 + (hash2(r, 7) - 0.5) * 0.12);
            const c = Math.floor(u * cols + (r % 2) * 0.45) % cols;

            const dEdge = Math.min(rv, 1.0 - rv, su, 1.0 - su);
            const grain = periodicFbm(u, v, 10, 4);
            const fleck = periodicNoise(u, v, 40);
            const stoneHue = (hash2(c * 5, r * 9) - 0.5) * 22;

            // Lower portion of canal wall (v > 0.65) stays damp and mossy
            const dampMask = Math.max(0, Math.min(1, (v - 0.45) / 0.50));

            if (dEdge < 0.08) {
                const moss = dampMask * 0.6 + grain * 0.4;
                out[0] = 44 + moss * 10;
                out[1] = 52 + moss * 24;
                out[2] = 40 + moss * 6;
                out[3] = 0.10;
                out[4] = 0.94 - dampMask * 0.25;
            } else {
                const bev = Math.min(1.0, (dEdge - 0.08) / 0.10);
                const val = (104 + stoneHue + (grain - 0.5) * 24 + (fleck - 0.5) * 18) * (1.0 - dampMask * 0.28);
                out[0] = val + 2 - dampMask * 8;
                out[1] = val + dampMask * 4;
                out[2] = val - 6 - dampMask * 6;
                out[3] = 0.25 + bev * 0.55 + grain * 0.20;
                out[4] = (0.86 - dampMask * 0.44) + (1.0 - bev) * 0.10;
            }
        }, 4.0, 3, 1);
    }

    static getFlagstoneSet() {
        // Staggered Ishidatami granite street paving with worn center polish
        return this.buildPBRSet('flagstone', 256, (u, v, out) => {
            const rows = 4;
            const cols = 2;
            const r = Math.floor(v * rows);
            const rv = fract(v * rows);
            const su = fract(u * cols + (r % 2) * 0.5);
            const c = Math.floor(u * cols + (r % 2) * 0.5) % cols;

            const dEdge = Math.min(rv, 1.0 - rv, su, 1.0 - su);
            const grain = periodicFbm(u, v, 12, 3);
            const fleck = periodicNoise(u, v, 44);
            const blockTint = (hash2(c * 3 + 1, r * 7 + 2) - 0.5) * 20;

            if (dEdge < 0.055) {
                const joint = 72 + grain * 18;
                out[0] = joint;
                out[1] = joint - 2;
                out[2] = joint - 6;
                out[3] = 0.12;
                out[4] = 0.96;
            } else {
                const bev = Math.min(1.0, (dEdge - 0.055) / 0.075);
                const wear = Math.exp(-Math.pow((u - 0.5) / 0.34, 2));
                const tone = 142 + blockTint + (grain - 0.5) * 18 + (fleck - 0.5) * 16 + wear * 8;
                out[0] = tone + 3;
                out[1] = tone;
                out[2] = tone - 7;
                out[3] = 0.38 + bev * 0.48 + grain * 0.14;
                out[4] = Math.max(0.48, 0.78 - wear * 0.18 + (1.0 - bev) * 0.14);
            }
        }, 3.4, 2, 2);
    }

    static getDirtRoadSet() {
        // Compacted Meiji earth & wagon-rut lane with gravel pebbles
        return this.buildPBRSet('dirtRoad', 256, (u, v, out) => {
            const rut1 = Math.exp(-Math.pow((u - 0.30) / 0.09, 2));
            const rut2 = Math.exp(-Math.pow((u - 0.70) / 0.09, 2));
            const rutMask = Math.min(1.0, rut1 + rut2);
            const soil = periodicFbm(u, v, 8, 4);
            const gravel = periodicNoise(u, v, 36);
            const pebble = gravel > 0.80 ? 0.25 : 0.0;

            const base = 120 + (soil - 0.5) * 28 + pebble * 26 - rutMask * 16;
            out[0] = base * 1.06;
            out[1] = base * 0.84;
            out[2] = base * 0.60;
            out[3] = 0.55 - rutMask * 0.28 + soil * 0.18 + pebble * 0.22;
            out[4] = Math.max(0.58, 0.92 - rutMask * 0.22 - pebble * 0.10);
        }, 2.6, 1, 1);
    }

    static getWashiSet() {
        // Translucent mulberry fiber Washi paper for Shoji screens & Chochin lanterns
        return this.buildPBRSet('washi', 256, (u, v, out) => {
            const fiber1 = periodicFbm(u * 2.0, v * 0.5, 10, 3);
            const fiber2 = periodicFbm(u * 0.5, v * 2.0, 10, 3);
            const cloud = periodicFbm(u, v, 4, 3);
            const fiber = Math.max(fiber1, fiber2);
            const base = 240 + (cloud - 0.5) * 14 + (fiber - 0.5) * 12;

            out[0] = base;
            out[1] = base - 6;
            out[2] = base - 20;
            out[3] = 0.4 + fiber * 0.6;
            out[4] = 0.72 + (1.0 - fiber) * 0.18;
        }, 1.0, 1, 1);
    }

    static getMeadowMap() {
        if (this._sprites.has('meadowMap')) return this._sprites.get('meadowMap');
        if (!this._canRender2D(true)) return null;
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        for (let y = 0; y < size; y++) {
            const v = y / size;
            for (let x = 0; x < size; x++) {
                const u = x / size;
                const broad = periodicFbm(u, v, 4, 4);
                const blade = periodicNoise(u, v, 48);
                const idx = (y * size + x) * 4;
                const luma = 0.86 + (broad - 0.5) * 0.24 + (blade - 0.5) * 0.14;
                img.data[idx] = clamp255(118 * luma);
                img.data[idx + 1] = clamp255(152 * luma);
                img.data[idx + 2] = clamp255(94 * luma);
                img.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        const tex = this._createCanvasTexture(canvas, true, 14, 14);
        this._sprites.set('meadowMap', tex);
        return tex;
    }

    static getParticleTexture(kind = 'smoke') {
        const cacheKey = `particle_${kind}`;
        if (this._sprites.has(cacheKey)) return this._sprites.get(cacheKey);
        if (!this._canRender2D(false)) return null;

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
            // Soft turbulent cloud / smoke puff
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
        this._sprites.set(cacheKey, tex);
        return tex;
    }

    static getFoliageTexture(species = 'sakura') {
        const cacheKey = `foliage_${species}`;
        if (this._sprites.has(cacheKey)) return this._sprites.get(cacheKey);
        if (!this._canRender2D(false)) return null;

        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        if (species === 'pine') {
            // Layered Japanese black pine needle fan tufts
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
            // Cascading willow leaf strands
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
            // Sakura / Deciduous soft clustered leaf/blossom canopy card
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
        tex.anisotropy = this._maxAnisotropy;
        tex.userData = { isSharedLibraryTexture: true };
        this._sprites.set(cacheKey, tex);
        return tex;
    }

    static disposeAll() {
        for (const set of this._sets.values()) {
            if (!set) continue;
            set.map?.dispose?.();
            set.normalMap?.dispose?.();
            set.roughnessMap?.dispose?.();
        }
        this._sets.clear();
        for (const tex of this._sprites.values()) {
            tex?.dispose?.();
        }
        this._sprites.clear();
    }
}
