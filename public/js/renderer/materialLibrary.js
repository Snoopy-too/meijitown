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
            ctx.fillStyle = '#f0ebe1';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(175, 165, 148, 0.22)';
            for (let i = 0; i < 160; i++) {
                ctx.fillRect((i * 37) % w, (i * 53) % h, 5, 3);
            }
            ctx.fillStyle = 'rgba(255, 252, 245, 0.35)';
            for (let i = 0; i < 90; i++) {
                ctx.fillRect((i * 61) % w, (i * 29) % h, 3, 3);
            }
        });

        const namakoTex = this.getProceduralTexture('namako', (ctx, w, h) => {
            ctx.fillStyle = '#252930';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#ece8df';
            ctx.lineWidth = 4;
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
            ctx.fillStyle = '#a83c24';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#8f301b';
            const rowH = 16;
            const brickW = 32;
            for (let r = 0; r < h / rowH; r++) {
                const y = r * rowH;
                const offset = (r % 2) * (brickW / 2);
                for (let x = offset; x < w; x += brickW) {
                    if ((r + x) % 3 === 0) ctx.fillRect(x + 2, y + 2, brickW - 4, rowH - 4);
                }
            }
            ctx.fillStyle = '#cfc6b8';
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
            // Authentic Ibushi-gawara smoked silver-slate clay roof tiles
            ctx.fillStyle = '#3f4652';
            ctx.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += 12) {
                ctx.fillStyle = '#282d35';
                ctx.fillRect(x, 0, 4, h);
                ctx.fillStyle = '#586270';
                ctx.fillRect(x + 4, 0, 3, h);
            }
            ctx.fillStyle = 'rgba(20, 24, 30, 0.45)';
            for (let y = 0; y < h; y += 14) {
                ctx.fillRect(0, y, w, 2);
                ctx.fillStyle = 'rgba(130, 142, 158, 0.25)';
                ctx.fillRect(0, y + 2, w, 1);
                ctx.fillStyle = 'rgba(20, 24, 30, 0.45)';
            }
        });

        const woodWallTex = this.getProceduralTexture('woodWall', (ctx, w, h) => {
            ctx.fillStyle = '#5c432e';
            ctx.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 12) {
                ctx.fillStyle = '#3d2b1c';
                ctx.fillRect(0, y, w, 2);
                ctx.fillStyle = '#6b4f37';
                ctx.fillRect(0, y + 2, w, 3);
            }
            ctx.fillStyle = 'rgba(35, 22, 12, 0.18)';
            for (let x = 0; x < w; x += 16) {
                ctx.fillRect(x, 0, 1, h);
            }
        });

        const meadowTex = this.getProceduralTexture('meadow', (ctx, w, h) => {
            ctx.fillStyle = '#587846';
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 420; i++) {
                const px = (i * 47 + (i % 7) * 13) % w;
                const py = (i * 73 + (i % 11) * 19) % h;
                ctx.fillStyle = (i % 3 === 0) ? '#4b693b' : ((i % 3 === 1) ? '#648550' : '#5e7042');
                ctx.fillRect(px, py, 6 + (i % 6), 4 + (i % 5));
            }
        }, 256, 256);
        if (meadowTex && meadowTex.repeat) {
            meadowTex.repeat.set(24, 24);
        }

        this._materials = {
            woodDark: new THREE.MeshStandardMaterial({ name: 'M_Wood', color: 0x422f22, roughness: 0.82, metalness: 0.05 }),
            woodMedium: new THREE.MeshStandardMaterial({ name: 'M_Cedar', color: 0xffffff, map: woodWallTex, roughness: 0.80, metalness: 0.05 }),
            woodLight: new THREE.MeshStandardMaterial({ name: 'M_LightWood', color: 0x9e7e52, roughness: 0.75, metalness: 0.05 }),
            bamboo: new THREE.MeshStandardMaterial({ name: 'M_Bamboo', color: 0xa8945e, roughness: 0.72, metalness: 0.05 }),
            reedScreen: new THREE.MeshStandardMaterial({ name: 'M_ReedScreen', color: 0xc2a874, roughness: 0.86, metalness: 0.0 }),
            hempMat: new THREE.MeshStandardMaterial({ name: 'M_Matting', color: 0x948260, roughness: 0.90, metalness: 0.0 }),
            strawTawara: new THREE.MeshStandardMaterial({ name: 'M_Straw', color: 0xc4a862, roughness: 0.88, metalness: 0.0 }),
            meadowGround: new THREE.MeshStandardMaterial({ name: 'M_Meadow', color: 0xffffff, map: meadowTex, roughness: 0.94, metalness: 0.0 }),

            plasterWhite: new THREE.MeshStandardMaterial({ name: 'M_Plaster', color: 0xffffff, map: plasterTex, roughness: 0.85, metalness: 0.02 }),
            plasterWarm: new THREE.MeshStandardMaterial({ name: 'M_WarmPlaster', color: 0xebe1cf, map: plasterTex, roughness: 0.84, metalness: 0.02 }),
            plasterBlack: new THREE.MeshStandardMaterial({ name: 'M_BlackPlaster', color: 0x262930, roughness: 0.68, metalness: 0.08 }),
            namakoWall: new THREE.MeshStandardMaterial({ name: 'M_Namako', color: 0xffffff, map: namakoTex, roughness: 0.75, metalness: 0.05 }),

            kawaraRoof: new THREE.MeshStandardMaterial({ name: 'M_KawaraRoof', color: 0xffffff, map: kawaraTex, roughness: 0.54, metalness: 0.18 }),
            copperRoof: new THREE.MeshStandardMaterial({ name: 'M_CopperRoof', color: 0x3b6e66, roughness: 0.48, metalness: 0.38 }),
            slateRoof: new THREE.MeshStandardMaterial({ name: 'M_SlateRoof', color: 0x434d59, map: kawaraTex, roughness: 0.58, metalness: 0.15 }),

            redBrick: new THREE.MeshStandardMaterial({ name: 'M_Brick', color: 0xffffff, map: brickTex, roughness: 0.82, metalness: 0.05 }),
            stoneGranite: new THREE.MeshStandardMaterial({ name: 'M_Stone', color: 0x78736a, roughness: 0.88, metalness: 0.05 }),
            stoneTrim: new THREE.MeshStandardMaterial({ name: 'M_StoneTrim', color: 0xe2dcd0, roughness: 0.76, metalness: 0.05 }),
            gravel: new THREE.MeshStandardMaterial({ name: 'M_Gravel', color: 0x827d74, roughness: 0.94, metalness: 0.0 }),

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
