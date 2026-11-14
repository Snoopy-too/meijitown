// Project Meiji - Centralized PBR Material & Procedural Texture Registry (materialLibrary.js)
// Phase 1 Architecture: Shared materials, O(1) day/night emissive updates, procedural CanvasTextures & safe GPU disposal

import * as THREE from 'three';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';
import { WeatheringShaderSystem } from './weatheringShader.js';

export class MaterialLibrary {
    static _initialized = false;
    static _materials = {};
    static _textures = new Map();
    static _threatSprites = new Map();

    static init() {
        if (this._initialized) return this._materials;

        const lazyPlaster = () => this.getProceduralTexture('plaster', (ctx, w, h) => {
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

        const lazyNamako = () => this.getProceduralTexture('namako', (ctx, w, h) => {
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

        const lazyBrick = () => this.getProceduralTexture('brick', (ctx, w, h) => {
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

        const lazyKawara = () => this.getProceduralTexture('kawara', (ctx, w, h) => {
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

        const lazyWoodWall = () => this.getProceduralTexture('woodWall', (ctx, w, h) => {
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

        const lazyMeadow = () => {
            const tex = this.getProceduralTexture('meadow', (ctx, w, h) => {
                ctx.fillStyle = '#587846';
                ctx.fillRect(0, 0, w, h);
                for (let i = 0; i < 420; i++) {
                    const px = (i * 47 + (i % 7) * 13) % w;
                    const py = (i * 73 + (i % 11) * 19) % h;
                    ctx.fillStyle = (i % 3 === 0) ? '#4b693b' : ((i % 3 === 1) ? '#648550' : '#5e7042');
                    ctx.fillRect(px, py, 6 + (i % 6), 4 + (i % 5));
                }
            }, 128, 128);
            if (tex && tex.repeat) {
                tex.repeat.set(24, 24);
            }
            return tex;
        };

        const kawaraPBR = PBRTextureGenerator.getKawaraSet();
        const brickPBR = PBRTextureGenerator.getBrickSet('red');
        const buffBrickPBR = PBRTextureGenerator.getBrickSet('buff');
        const clinkerBrickPBR = PBRTextureGenerator.getBrickSet('clinker');
        const ashlarPBR = PBRTextureGenerator.getAshlarSet();
        const plasterPBR = PBRTextureGenerator.getPlasterSet();
        const namakoPBR = PBRTextureGenerator.getNamakoSet();
        const woodPBR = PBRTextureGenerator.getWoodWallSet();
        const stonePBR = PBRTextureGenerator.getStoneSet();
        const washiPBR = PBRTextureGenerator.getWashiSet();
        const meadowPBRMap = PBRTextureGenerator.getMeadowMap();

        const pbrOpts = (set, fallbackFn, nx = 0.45, ny = 0.45) => {
            const out = { map: set.map || (typeof fallbackFn === 'function' ? fallbackFn() : fallbackFn) };
            if (set.normalMap) {
                out.normalMap = set.normalMap;
                out.normalScale = new THREE.Vector2(nx, ny);
            }
            if (set.roughnessMap) {
                out.roughnessMap = set.roughnessMap;
            }
            return out;
        };

        const GlassMatClass = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;

        this._materials = {
            woodDark: new THREE.MeshStandardMaterial({ name: 'M_Wood', color: 0x422f22, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.62, ...pbrOpts({ map: null, normalMap: woodPBR.normalMap, roughnessMap: woodPBR.roughnessMap }, null, 0.35, 0.35) }),
            woodMedium: new THREE.MeshStandardMaterial({ name: 'M_Cedar', color: 0xffffff, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.62, ...pbrOpts(woodPBR, lazyWoodWall, 0.48, 0.48) }),
            woodCharred: new THREE.MeshStandardMaterial({ name: 'M_Yakisugi', color: 0x625a54, roughness: 0.84, metalness: 0.04, envMapIntensity: 0.56, ...pbrOpts(woodPBR, lazyWoodWall, 0.52, 0.52) }),
            woodLight: new THREE.MeshStandardMaterial({ name: 'M_LightWood', color: 0x9e7e52, roughness: 0.74, metalness: 0.05, envMapIntensity: 0.65 }),
            woodHinoki: new THREE.MeshStandardMaterial({ name: 'M_Hinoki', color: 0xb58d58, roughness: 0.72, metalness: 0.04, envMapIntensity: 0.66, ...pbrOpts({ map: null, normalMap: woodPBR.normalMap, roughnessMap: woodPBR.roughnessMap }, null, 0.30, 0.30) }),
            bamboo: new THREE.MeshStandardMaterial({ name: 'M_Bamboo', color: 0xa8945e, roughness: 0.66, metalness: 0.05, envMapIntensity: 0.68 }),
            reedScreen: new THREE.MeshStandardMaterial({ name: 'M_ReedScreen', color: 0xc2a874, roughness: 0.86, metalness: 0.0, envMapIntensity: 0.55 }),
            hempMat: new THREE.MeshStandardMaterial({ name: 'M_Matting', color: 0x948260, roughness: 0.90, metalness: 0.0, envMapIntensity: 0.52 }),
            strawTawara: new THREE.MeshStandardMaterial({ name: 'M_Straw', color: 0xc4a862, roughness: 0.88, metalness: 0.0, envMapIntensity: 0.55 }),
            meadowGround: new THREE.MeshStandardMaterial({ name: 'M_Meadow', color: 0xffffff, map: meadowPBRMap || lazyMeadow(), roughness: 0.94, metalness: 0.0, envMapIntensity: 0.55 }),

            plasterWhite: new THREE.MeshStandardMaterial({ name: 'M_Plaster', color: 0xffffff, roughness: 0.85, metalness: 0.02, envMapIntensity: 0.62, ...pbrOpts(plasterPBR, lazyPlaster, 0.32, 0.32) }),
            plasterWarm: new THREE.MeshStandardMaterial({ name: 'M_WarmPlaster', color: 0xebe1cf, roughness: 0.84, metalness: 0.02, envMapIntensity: 0.62, ...pbrOpts(plasterPBR, lazyPlaster, 0.32, 0.32) }),
            plasterUmber: new THREE.MeshStandardMaterial({ name: 'M_UmberPlaster', color: 0xcab38b, roughness: 0.88, metalness: 0.02, envMapIntensity: 0.58, ...pbrOpts(plasterPBR, lazyPlaster, 0.36, 0.36) }),
            stuccoOchre: new THREE.MeshStandardMaterial({ name: 'M_StuccoOchre', color: 0xd8c7a6, roughness: 0.84, metalness: 0.02, envMapIntensity: 0.62, ...pbrOpts(plasterPBR, lazyPlaster, 0.34, 0.34) }),
            stuccoSage: new THREE.MeshStandardMaterial({ name: 'M_StuccoSage', color: 0xbcc2b2, roughness: 0.84, metalness: 0.02, envMapIntensity: 0.62, ...pbrOpts(plasterPBR, lazyPlaster, 0.34, 0.34) }),
            plasterBlack: new THREE.MeshStandardMaterial({ name: 'M_BlackPlaster', color: 0x262930, roughness: 0.64, metalness: 0.08, envMapIntensity: 0.78 }),
            namakoWall: new THREE.MeshStandardMaterial({ name: 'M_Namako', color: 0xffffff, roughness: 0.72, metalness: 0.06, envMapIntensity: 0.74, ...pbrOpts(namakoPBR, lazyNamako, 0.55, 0.55) }),

            kawaraRoof: new THREE.MeshStandardMaterial({ name: 'M_KawaraRoof', color: 0xffffff, roughness: 0.52, metalness: 0.18, envMapIntensity: 1.05, ...pbrOpts(kawaraPBR, lazyKawara, 0.72, 0.72) }),
            kawaraRusset: new THREE.MeshStandardMaterial({ name: 'M_SekishuRoof', color: 0xb8806e, roughness: 0.54, metalness: 0.12, envMapIntensity: 0.92, ...pbrOpts(kawaraPBR, lazyKawara, 0.68, 0.68) }),
            copperRoof: new THREE.MeshStandardMaterial({ name: 'M_CopperRoof', color: 0x3b6e66, roughness: 0.44, metalness: 0.42, envMapIntensity: 1.25 }),
            slateRoof: new THREE.MeshStandardMaterial({ name: 'M_SlateRoof', color: 0x434d59, roughness: 0.56, metalness: 0.16, envMapIntensity: 0.98, ...pbrOpts(kawaraPBR, lazyKawara, 0.62, 0.62) }),

            redBrick: new THREE.MeshStandardMaterial({ name: 'M_Brick', color: 0xffffff, roughness: 0.82, metalness: 0.05, envMapIntensity: 0.65, ...pbrOpts(brickPBR, lazyBrick, 0.56, 0.56) }),
            buffBrick: new THREE.MeshStandardMaterial({ name: 'M_BuffBrick', color: buffBrickPBR.map ? 0xffffff : 0xe0be88, roughness: 0.82, metalness: 0.04, envMapIntensity: 0.65, ...pbrOpts(buffBrickPBR, lazyBrick, 0.54, 0.54) }),
            clinkerBrick: new THREE.MeshStandardMaterial({ name: 'M_ClinkerBrick', color: clinkerBrickPBR.map ? 0xffffff : 0x8c645a, roughness: 0.86, metalness: 0.06, envMapIntensity: 0.60, ...pbrOpts(clinkerBrickPBR, lazyBrick, 0.58, 0.58) }),
            ashlarStone: new THREE.MeshStandardMaterial({ name: 'M_AshlarStone', color: 0xffffff, roughness: 0.78, metalness: 0.05, envMapIntensity: 0.68, ...pbrOpts(ashlarPBR, null, 0.58, 0.58) }),
            pavilionLimestone: new THREE.MeshStandardMaterial({ name: 'M_PavilionStone', color: 0xe6dbc4, roughness: 0.76, metalness: 0.05, envMapIntensity: 0.70, ...pbrOpts(ashlarPBR, null, 0.54, 0.54) }),
            stoneGranite: new THREE.MeshStandardMaterial({ name: 'M_Stone', color: 0xffffff, roughness: 0.84, metalness: 0.06, envMapIntensity: 0.68, ...pbrOpts(stonePBR, null, 0.60, 0.60) }),
            stoneTrim: new THREE.MeshStandardMaterial({ name: 'M_StoneTrim', color: 0xd6cdb8, roughness: 0.72, metalness: 0.06, envMapIntensity: 0.72, ...pbrOpts({ map: null, normalMap: ashlarPBR.normalMap || stonePBR.normalMap, roughnessMap: ashlarPBR.roughnessMap || stonePBR.roughnessMap }, null, 0.34, 0.34) }),
            gravel: new THREE.MeshStandardMaterial({ name: 'M_Gravel', color: 0x827d74, roughness: 0.94, metalness: 0.0, envMapIntensity: 0.50 }),

            norenIndigo: new THREE.MeshStandardMaterial({ name: 'M_Noren', color: 0x1c3554, roughness: 0.78, metalness: 0.0, envMapIntensity: 0.52 }),
            toriiVermilion: new THREE.MeshStandardMaterial({ name: 'M_Torii', color: 0xb52818, roughness: 0.46, metalness: 0.12, envMapIntensity: 0.88 }),
            crimsonBanner: new THREE.MeshStandardMaterial({ name: 'M_Crimson', color: 0xb33927, roughness: 0.68, metalness: 0.04, envMapIntensity: 0.56 }),

            darkIron: new THREE.MeshStandardMaterial({ name: 'M_DarkIron', color: 0x22262b, roughness: 0.36, metalness: 0.82, envMapIntensity: 1.4 }),
            bronze: new THREE.MeshStandardMaterial({ name: 'M_Bronze', color: 0x9c7432, roughness: 0.34, metalness: 0.78, envMapIntensity: 1.5 }),
            goldLeaf: new THREE.MeshStandardMaterial({ name: 'M_Gold', color: 0xd4af37, roughness: 0.24, metalness: 0.88, envMapIntensity: 1.65 }),
            waterSurface: new THREE.MeshStandardMaterial({ name: 'M_Water', color: 0x2b546b, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.88, envMapIntensity: 1.35 }),

            hearthFire: new THREE.MeshStandardMaterial({
                name: 'M_HearthFire',
                color: 0xff6e1a,
                roughness: 0.55,
                metalness: 0.0,
                emissive: new THREE.Color(0xff4a00),
                emissiveIntensity: 1.85
            }),

            // Shared Emissive Materials (updated in O(1) time by SceneLighting)
            shojiWindow: new THREE.MeshStandardMaterial({
                name: 'M_ShojiWindow',
                color: 0xf5ecd8,
                roughness: 0.68,
                metalness: 0.04,
                envMapIntensity: 0.62,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0,
                ...pbrOpts(washiPBR, null, 0.22, 0.22)
            }),
            glassWindow: new GlassMatClass({
                name: 'M_GlassWindow',
                color: 0x284152,
                roughness: 0.06,
                metalness: 0.12,
                clearcoat: 1.0,
                clearcoatRoughness: 0.05,
                ior: 1.52,
                reflectivity: 0.92,
                envMapIntensity: 1.85,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            }),
            redLantern: new THREE.MeshStandardMaterial({
                name: 'M_RedLantern',
                color: 0xd9301c,
                roughness: 0.42,
                metalness: 0.04,
                envMapIntensity: 0.72,
                emissive: new THREE.Color(0x661206),
                emissiveIntensity: 0.25
            }),
            gasLantern: new THREE.MeshStandardMaterial({
                name: 'M_GasLantern',
                color: 0xffeedd,
                roughness: 0.45,
                metalness: 0.05,
                envMapIntensity: 0.85,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            }),
            electricArcLantern: new THREE.MeshStandardMaterial({
                name: 'M_ElectricArcLantern',
                color: 0xeef8ff,
                roughness: 0.26,
                metalness: 0.12,
                envMapIntensity: 1.05,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0.0
            })
        };

        for (const mat of Object.values(this._materials)) {
            mat.userData = { isSharedLibraryMaterial: true };
        }

        for (const key of ['woodDark', 'woodMedium', 'woodCharred', 'woodLight', 'woodHinoki', 'plasterWhite', 'plasterWarm', 'plasterUmber', 'stuccoOchre', 'stuccoSage', 'plasterBlack', 'namakoWall', 'redBrick', 'buffBrick', 'clinkerBrick', 'ashlarStone', 'pavilionLimestone', 'stoneGranite', 'stoneTrim', 'toriiVermilion']) {
            WeatheringShaderSystem.enhanceBuildingMaterial(this._materials[key], { isRoof: false, aoHeight: 0.42, variation: 0.075 });
        }
        for (const key of ['kawaraRoof', 'kawaraRusset', 'copperRoof', 'slateRoof']) {
            WeatheringShaderSystem.enhanceBuildingMaterial(this._materials[key], { isRoof: true, variation: 0.065 });
        }
        WeatheringShaderSystem.enhanceGlassMaterial(this._materials.glassWindow);
        WeatheringShaderSystem.enhanceShojiMaterial(this._materials.shojiWindow);

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
                        if (m.normalMap && !m.normalMap.userData?.isSharedLibraryTexture) m.normalMap.dispose();
                        if (m.roughnessMap && !m.roughnessMap.userData?.isSharedLibraryTexture) m.roughnessMap.dispose();
                        m.dispose();
                    }
                }
            }
        });
    }

    static disposeAll() {
        if (this._materials) {
            for (const mat of Object.values(this._materials)) {
                mat?.dispose?.();
            }
            this._materials = null;
        }
        if (this._textures) {
            for (const tex of this._textures.values()) {
                tex?.dispose?.();
            }
            this._textures.clear();
        }
        if (this._threatSprites) {
            for (const tex of this._threatSprites.values()) {
                tex?.dispose?.();
            }
            this._threatSprites.clear();
        }
    }
}
