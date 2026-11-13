// Project Meiji - Autumn Typhoon (Taifū) & Water Inundation Loop (typhoonManager.js)
// ponytail: seasonal M9-10 storm trigger, telegraph warning, canal overflow & flood defenses (< 300 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SOUND } from '../fx.js';

export class TyphoonManager {
    constructor(gridModel, stateManager, engine = null, scene = null) {
        this.grid = gridModel;
        this.state = stateManager;
        this.engine = engine;
        this.scene = scene;

        this.isWarningActive = false;
        this.isStormActive = false;
        this.targetStormMonth = null;
        this.floodedTiles = new Set();
        this.rainSystem = null;
        this.savedSkyColor = null;
    }

    setScene(scene) {
        this.scene = scene;
    }

    // 1. Seasonal Trigger & Advance Telegraph Warning (Months 9-10, 35% probability)
    checkSeasonalTrigger(month) {
        const m = month !== undefined ? month : (this.state?.currentMonth || 1);

        // If storm was active in previous month, wind down and drain water
        if (this.isStormActive) {
            this.endTyphoon();
            return;
        }

        // If warning was active for this month, unleash the storm!
        if (this.isWarningActive && this.targetStormMonth === m) {
            this.startTyphoon();
            return;
        }

        // Check for 1-month advance warning in August (M8) or September (M9)
        if (m === 8 || m === 9) {
            if (!this.isWarningActive && Math.random() < 0.35) {
                this.triggerWarning(m + 1);
            }
        }
    }

    // Trigger 1-month advance warning banner & chronicle event
    triggerWarning(targetMonth) {
        this.isWarningActive = true;
        this.targetStormMonth = targetMonth;

        const msgEn = "Storm Approaching: Reinforce Lowland Canals and Paddies.";
        const msgJa = "大風水害接近中: 低地水路及び水田の堤防を補強せよ。";

        this.state?.showToast(msgEn, true);
        if (this.state?.chronicle?.recordEvent) {
            this.state.chronicle.recordEvent(msgEn, msgJa);
        }
    }

    // 2. Start Typhoon Storm Phase
    startTyphoon() {
        this.isWarningActive = false;
        this.isStormActive = true;

        const msgEn = "🌀 Autumn Typhoon Strikes! Lowland Canals Threaten Inundation!";
        const msgJa = "🌀 秋の大台風襲来！低地水路の氾濫・湛水に厳戒せよ！";
        this.state?.showToast(msgEn, true);
        if (this.state?.chronicle?.recordEvent) {
            this.state.chronicle.recordEvent(msgEn, msgJa);
        }

        this.processInundation();
        this.initRainFX();
    }

    // 3. End Typhoon Storm Phase & Drain Floodwaters
    endTyphoon() {
        this.isStormActive = false;
        this.clearInundation();
        this.removeRainFX();

        const msgEn = "☀️ The Typhoon has passed. Waters are receding.";
        const msgJa = "☀️ 台風一過。水路の水位が平穏に復帰しました。";
        this.state?.showToast(msgEn);
    }

    // 4. Flood Defenses Evaluation
    isProtectedByEmbankment(tile) {
        if (!tile) return false;
        // Paved stone road (roadTier === 2) or stone bridge provides stone embankment (Ishigaki)
        return (tile.type === CONFIG.TYPES.ROAD && tile.roadTier === 2) ||
               (tile.type === CONFIG.TYPES.CANAL && tile.hasBridge && tile.roadTier === 2);
    }

    isProtectedByWillow(tile) {
        if (!tile) return false;
        if (tile.type === CONFIG.TYPES.PARK && (tile.subType === 'willow' || tile.subType === 'tree_willow')) return true;
        const neighbors = this.grid.getNeighbors(tile.x, tile.y);
        return neighbors.some(n => n && n.type === CONFIG.TYPES.PARK && (n.subType === 'willow' || n.subType === 'tree_willow'));
    }

    isProtectedBySluice(x, y) {
        // Watergate Sluice (Suimon) protects connected canals within 5 tiles
        const radius = 5;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === (CONFIG.SERVICES.SUIMON || 'suimon')) {
                if (Math.hypot(tile.x - x, tile.y - y) <= radius) {
                    return true;
                }
            }
        }
        return false;
    }

    // 5. Inundation Mechanics Algorithm
    processInundation() {
        this.clearInundation();
        if (!this.isStormActive) return;

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type !== CONFIG.TYPES.CANAL) continue;

            // Check if canal is protected by upstream Watergate Sluice
            if (this.isProtectedBySluice(tile.x, tile.y)) continue;

            const neighbors = [
                { x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y },
                { x: tile.x, y: tile.y + 1 }, { x: tile.x, y: tile.y - 1 }
            ];

            for (const nCoord of neighbors) {
                if (!this.grid.isValidCoord(nCoord.x, nCoord.y)) continue;
                const nt = this.grid.getTile(nCoord.x, nCoord.y);
                if (!nt || nt.type === CONFIG.TYPES.CANAL) continue;

                // Stone embankment blocks overflow
                if (this.isProtectedByEmbankment(nt)) continue;

                // Willow root anchoring blocks overflow
                if (this.isProtectedByWillow(nt)) continue;

                // Unprotected earthen border overflows
                nt.submerged = true;
                nt.isFlooded = true;
                this.floodedTiles.add(`${nt.x}_${nt.y}`);
            }
        }
    }

    clearInundation() {
        for (const key of this.floodedTiles) {
            const [x, y] = key.split('_').map(Number);
            if (this.grid.isValidCoord(x, y)) {
                const tile = this.grid.getTile(x, y);
                if (tile) {
                    tile.submerged = false;
                    tile.isFlooded = false;
                }
            }
        }
        this.floodedTiles.clear();
    }

    // Calculate crop harvest penalty (-50% on flooded paddies during autumn)
    getPaddyHarvestMultiplier(x, y) {
        const key = `${x}_${y}`;
        return this.floodedTiles.has(key) ? 0.50 : 1.0;
    }

    // 6. Diagnostic Evaluation for Flood Inundation Risk Overlay
    getTileFloodRisk(tile, x, y) {
        if (!tile || tile.type === CONFIG.TYPES.EMPTY) return 'normal';
        if (tile.submerged || tile.isFlooded) return 'flooded';
        if (tile.type === CONFIG.TYPES.CANAL) return 'canal';

        // Check if tile borders a canal
        const neighbors = this.grid.getNeighbors(x, y);
        const touchesCanal = neighbors.some(n => n && n.type === CONFIG.TYPES.CANAL);
        if (!touchesCanal) return 'normal';

        // Check defenses
        if (this.isProtectedByEmbankment(tile) || this.isProtectedByWillow(tile) || this.isProtectedBySluice(x, y)) {
            return 'protected';
        }
        return 'vulnerable';
    }

    // 7. High-Intensity Driving Rain Streaks & Sky Darkening FX
    initRainFX() {
        if (!this.scene) return;
        this.removeRainFX();

        const dropCount = 420;
        const totalSize = (CONFIG.GRID_WIDTH || 20) * (CONFIG.TILE_SIZE || 2.0);
        const useStreaks = typeof THREE.LineSegments === 'function' && typeof THREE.LineBasicMaterial === 'function';

        if (useStreaks) {
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(dropCount * 6);
            const colors = new Float32Array(dropCount * 6);

            for (let i = 0; i < dropCount; i++) {
                const x = Math.random() * totalSize;
                const y = 0.5 + Math.random() * 13.0;
                const z = Math.random() * totalSize;
                const len = 0.45 + Math.random() * 0.35;

                // Head (lower droplet tip, brighter silver) & wind-slanted tail
                const i6 = i * 6;
                positions[i6] = x;
                positions[i6 + 1] = y;
                positions[i6 + 2] = z;
                positions[i6 + 3] = x - len * 0.22;
                positions[i6 + 4] = y + len;
                positions[i6 + 5] = z;

                // Subtle vertical gradient from misty top tail to bright raindrop tip
                colors[i6] = 0.72;     colors[i6 + 1] = 0.84;     colors[i6 + 2] = 0.94;
                colors[i6 + 3] = 0.38; colors[i6 + 4] = 0.48;     colors[i6 + 5] = 0.56;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mat = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.48,
                depthWrite: false
            });
            this.rainSystem = new THREE.LineSegments(geo, mat);
            this.rainSystem.userData = { isStreakRain: true };
        } else {
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(dropCount * 3);
            for (let i = 0; i < dropCount; i++) {
                positions[i * 3] = Math.random() * totalSize;
                positions[i * 3 + 1] = 0.5 + Math.random() * 12.0;
                positions[i * 3 + 2] = Math.random() * totalSize;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: 0x95afc0, size: 0.14, transparent: true, opacity: 0.85 });
            this.rainSystem = new THREE.Points(geo, mat);
        }

        this.scene.add(this.rainSystem);

        if (this.scene.userData?.lighting?.setStormOverride) {
            this.scene.userData.lighting.setStormOverride(true);
        }
        if (this.scene.background && this.scene.background.getHex) {
            this.savedSkyColor = this.scene.background.getHex();
            this.scene.background.setHex(0x2c3e50); // Darkened storm sky
        }
    }

    updateRain(delta = 0.016) {
        if (!this.rainSystem || !this.rainSystem.geometry || !this.rainSystem.geometry.attributes) return;
        const pos = this.rainSystem.geometry.attributes.position;
        if (!pos || !pos.array) return;
        const arr = pos.array;
        const totalSize = (CONFIG.GRID_WIDTH || 20) * (CONFIG.TILE_SIZE || 2.0);

        if (this.rainSystem.userData?.isStreakRain) {
            for (let i = 0; i < arr.length; i += 6) {
                const dy = -19.5 * delta;
                const dx = 4.4 * delta;
                arr[i] += dx;
                arr[i + 1] += dy;
                arr[i + 3] += dx;
                arr[i + 4] += dy;
                if (arr[i + 1] < 0.05) {
                    const rx = Math.random() * totalSize;
                    const ry = 12.5 + Math.random() * 2.0;
                    const rz = Math.random() * totalSize;
                    arr[i] = rx;
                    arr[i + 1] = ry;
                    arr[i + 2] = rz;
                    arr[i + 3] = rx - 0.14;
                    arr[i + 4] = ry + 0.62;
                    arr[i + 5] = rz;
                }
            }
        } else {
            for (let i = 0; i < arr.length; i += 3) {
                arr[i + 1] -= 18.0 * delta;
                arr[i] += 4.0 * delta;
                if (arr[i + 1] < 0.1) {
                    arr[i + 1] = 12.0;
                    arr[i] = Math.random() * totalSize;
                }
            }
        }
        pos.needsUpdate = true;
    }

    removeRainFX() {
        if (this.rainSystem && this.scene) {
            this.scene.remove(this.rainSystem);
            this.rainSystem.geometry.dispose();
            this.rainSystem.material.dispose();
            this.rainSystem = null;
        }
        if (this.scene?.userData?.lighting?.setStormOverride) {
            this.scene.userData.lighting.setStormOverride(false);
        }
        if (this.savedSkyColor !== null && this.scene?.background?.setHex) {
            this.scene.background.setHex(this.savedSkyColor);
            this.savedSkyColor = null;
        }
    }
}
