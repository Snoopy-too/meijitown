// Project Meiji - Centralized PBR Material & Procedural Texture Registry (materialLibrary.js)
// Phase 1 Architecture: Shared materials, O(1) day/night emissive updates, procedural CanvasTextures & safe GPU disposal

import * as THREE from 'three';

export class MaterialLibrary {
    static _initialized = false;
    static _materials = {};
    static _textures = new Map();
    static _threatSprites = new Map();

    static init() {
        if (this._initialized) return this._materials;

        const plasterTex = this.getProceduralTexture('plaster', (ctx, w, h) => {
            ctx.fillStyle = '#e8e4dc';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(180, 172, 158, 0.25)';
            for (let i = 0; i < 120; i++) {
                ctx.fillRect((i * 37) % w, (i * 53) % h, 4, 4);
            }
        });

        const namakoTex = this.getProceduralTexture('namako', (ctx, w, h) => {
            ctx.fillStyle = '#1e2024';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#dcd8d0';
            ctx.lineWidth = 3;
            const step = 32;
            for (let y = -w; y < h + w; y += step) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y + w);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(w, y);
                ctx.lineTo(0, y + w);
                ctx.stroke();
            }
        });

        const brickTex = this.getProceduralTexture('brick', (ctx, w, h) => {
            ctx.fillStyle = '#8c2d19';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#a89f91';
            const rowH = 16;
            const brickW = 32;
            for (let r = 0; r < h / rowH; r++) {
                const y = r * rowH;
                ctx.fillRect(0, y, w, 2);
                const offset = (r % 2) * (brickW / 2);
                for (let x = offset; x < w; x += brickW) {
                    ctx.fillRect(x, y, 2, rowH);
                }
            }
        });

        const kawaraTex = this.getProceduralTexture('kawara', (ctx, w, h) => {
            ctx.fillStyle = '#24272c';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#181a1e';
            for (let x = 0; x < w; x += 16) {
                ctx.fillRect(x, 0, 5, h);
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
            for (let y = 0; y < h; y += 16) {
                ctx.fillRect(0, y, w, 2);
            }
        });

        this._materials = {
            woodDark: new THREE.MeshStandardMaterial({ name: 'M_Wood', color: 0x3d2b1f, roughness: 0.85, metalness: 0.05 }),
            woodMedium: new THREE.MeshStandardMaterial({ name: 'M_Cedar', color: 0x54402e, roughness: 0.82, metalness: 0.05 }),
            woodLight: new THREE.MeshStandardMaterial({ name: 'M_LightWood', color: 0x8a6d46, roughness: 0.78, metalness: 0.05 }),
            bamboo: new THREE.MeshStandardMaterial({ name: 'M_Bamboo', color: 0x9e8a58, roughness: 0.75, metalness: 0.05 }),
            reedScreen: new THREE.MeshStandardMaterial({ name: 'M_ReedScreen', color: 0xb89e6c, roughness: 0.88, metalness: 0.0 }),
            hempMat: new THREE.MeshStandardMaterial({ name: 'M_Matting', color: 0x857556, roughness: 0.92, metalness: 0.0 }),
            strawTawara: new THREE.MeshStandardMaterial({ name: 'M_Straw', color: 0xb59b58, roughness: 0.9, metalness: 0.0 }),

            plasterWhite: new THREE.MeshStandardMaterial({ name: 'M_Plaster', color: 0xe8e4dc, map: plasterTex, roughness: 0.88, metalness: 0.02 }),
            plasterWarm: new THREE.MeshStandardMaterial({ name: 'M_WarmPlaster', color: 0xd8d0c2, roughness: 0.86, metalness: 0.02 }),
            plasterBlack: new THREE.MeshStandardMaterial({ name: 'M_BlackPlaster', color: 0x1e2024, roughness: 0.72, metalness: 0.08 }),
            namakoWall: new THREE.MeshStandardMaterial({ name: 'M_Namako', color: 0xffffff, map: namakoTex, roughness: 0.78, metalness: 0.05 }),

            kawaraRoof: new THREE.MeshStandardMaterial({ name: 'M_KawaraRoof', color: 0x26292e, map: kawaraTex, roughness: 0.62, metalness: 0.15 }),
            copperRoof: new THREE.MeshStandardMaterial({ name: 'M_CopperRoof', color: 0x2e4e4a, roughness: 0.55, metalness: 0.35 }),
            slateRoof: new THREE.MeshStandardMaterial({ name: 'M_SlateRoof', color: 0x2c3238, roughness: 0.65, metalness: 0.12 }),

            redBrick: new THREE.MeshStandardMaterial({ name: 'M_Brick', color: 0x8c2d19, map: brickTex, roughness: 0.85, metalness: 0.05 }),
            stoneGranite: new THREE.MeshStandardMaterial({ name: 'M_Stone', color: 0x5c5852, roughness: 0.9, metalness: 0.05 }),
            stoneTrim: new THREE.MeshStandardMaterial({ name: 'M_StoneTrim', color: 0xd8d2c5, roughness: 0.8, metalness: 0.05 }),
            gravel: new THREE.MeshStandardMaterial({ name: 'M_Gravel', color: 0x6e6a62, roughness: 0.95, metalness: 0.0 }),

            norenIndigo: new THREE.MeshStandardMaterial({ name: 'M_Noren', color: 0x1c3554, roughness: 0.75, metalness: 0.0 }),
            toriiVermilion: new THREE.MeshStandardMaterial({ name: 'M_Torii', color: 0xb52818, roughness: 0.55, metalness: 0.1 }),
            crimsonBanner: new THREE.MeshStandardMaterial({ name: 'M_Crimson', color: 0xb33927, roughness: 0.65, metalness: 0.05 }),

            darkIron: new THREE.MeshStandardMaterial({ name: 'M_DarkIron', color: 0x1f2226, roughness: 0.4, metalness: 0.75 }),
            bronze: new THREE.MeshStandardMaterial({ name: 'M_Bronze', color: 0x9c7432, roughness: 0.38, metalness: 0.72 }),
            goldLeaf: new THREE.MeshStandardMaterial({ name: 'M_Gold', color: 0xd4af37, roughness: 0.28, metalness: 0.85 }),
            waterSurface: new THREE.MeshStandardMaterial({ name: 'M_Water', color: 0x2b546b, roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.88 }),

            // Shared Emissive Materials (updated in O(1) time by SceneLighting)
            shojiWindow: new THREE.MeshStandardMaterial({
                name: 'M_ShojiWindow',
                color: 0xf5ecd8,
                roughness: 0.65,
                metalness: 0.05,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            }),
            glassWindow: new THREE.MeshStandardMaterial({
                name: 'M_GlassWindow',
                color: 0x628294,
                roughness: 0.22,
                metalness: 0.38,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            }),
            redLantern: new THREE.MeshStandardMaterial({
                name: 'M_RedLantern',
                color: 0xd9301c,
                roughness: 0.45,
                metalness: 0.05,
                emissive: new THREE.Color(0x661206),
                emissiveIntensity: 0.25
            }),
            gasLantern: new THREE.MeshStandardMaterial({
                name: 'M_GasLantern',
                color: 0xffeedd,
                roughness: 0.5,
                metalness: 0.05,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            }),
            electricArcLantern: new THREE.MeshStandardMaterial({
                name: 'M_ElectricArcLantern',
                color: 0xeef8ff,
                roughness: 0.3,
                metalness: 0.1,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            })
        };

        for (const mat of Object.values(this._materials)) {
            mat.userData = { isSharedLibraryMaterial: true };
        }

        this._initialized = true;
        return this._materials;
    }

    static get(key) {
        if (!this._initialized) this.init();
        return this._materials[key] || this._materials.woodDark;
    }

    static getProceduralTexture(key, drawFn, width = 128, height = 128) {
        if (this._textures.has(key)) return this._textures.get(key);
        if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
        if (!ctx || typeof ctx.fillRect !== 'function') return null;

        drawFn(ctx, width, height);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.userData = { isSharedLibraryTexture: true };
        this._textures.set(key, tex);
        return tex;
    }

    /**
     * O(1) Day/Night Emissive Update for shared window and lantern materials.
     */
    static updateEmissives(intensity) {
        if (!this._initialized) this.init();
        const isGlowing = intensity > 0.05;
        const warmHex = isGlowing ? 0xffa040 : 0x000000;
        const redHex = isGlowing ? 0xff5522 : 0x551005;
        const arcHex = isGlowing ? 0xd8eeff : 0x000000;

        this._materials.shojiWindow.emissive.setHex(warmHex);
        this._materials.shojiWindow.emissiveIntensity = intensity * 0.75;

        this._materials.glassWindow.emissive.setHex(warmHex);
        this._materials.glassWindow.emissiveIntensity = intensity * 0.55;

        this._materials.redLantern.emissive.setHex(redHex);
        this._materials.redLantern.emissiveIntensity = isGlowing ? Math.max(0.35, intensity * 1.15) : 0.2;

        this._materials.gasLantern.emissive.setHex(warmHex);
        this._materials.gasLantern.emissiveIntensity = intensity;

        this._materials.electricArcLantern.emissive.setHex(arcHex);
        this._materials.electricArcLantern.emissiveIntensity = intensity * 1.5;
    }

    /**
     * Cached Fire Threat Countdown Sprite (prevents per-second CanvasTexture GPU leaks).
     */
    static createThreatSprite(seconds) {
        const clampedSec = Math.max(1, Math.min(120, Math.round(seconds)));
        let tex = this._threatSprites.get(clampedSec);

        if (!tex && typeof document !== 'undefined' && typeof document.createElement === 'function') {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 48;
            const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
            if (ctx && typeof ctx.fillRect === 'function') {
                ctx.fillStyle = 'rgba(179, 57, 39, 0.92)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(4, 4, 120, 40, 8);
                else ctx.rect(4, 4, 120, 40);
                ctx.fill();
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#b58900';
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`🔥 ${clampedSec}s`, 64, 25);
            }
            tex = new THREE.CanvasTexture(canvas);
            tex.userData = { isSharedLibraryTexture: true };
            this._threatSprites.set(clampedSec, tex);
        }

        const spriteMat = new THREE.SpriteMaterial({ map: tex || null, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.4, 0.52, 1);
        sprite.position.set(0, 1.8, 0);
        return sprite;
    }

    /**
     * Safely dispose of non-shared geometries and materials when removing a tile mesh group.
     */
    static disposeGroup(root) {
        if (!root || typeof root.traverse !== 'function') return;
        root.traverse((child) => {
            if (child.geometry && !child.geometry.userData?.isSharedGeometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                for (const m of mats) {
                    if (m && !m.userData?.isSharedLibraryMaterial) {
                        if (m.map && !m.map.userData?.isSharedLibraryTexture) m.map.dispose();
                        m.dispose();
                    }
                }
            }
        });
    }
}
