// Project Meiji - Agrarian Infrastructure & Rice Paddy Engine (agricultureManager.js)
// Phase 2 /artisan: Earthen Dikes (Aze), Irrigation Sluice Gate (Mizuguchi), 4-Quadrant Basins & 4-Season Artistry

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SOUND } from './fx.js';
import { MaterialLibrary } from './renderer/materialLibrary.js';

export class AgricultureManager {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
    }

    // Check if Rice Paddy can be constructed
    canPlacePaddy(x, y) {
        if (!this.grid.isValidCoord(x, y)) return false;
        const tile = this.grid.getTile(x, y);
        return !(tile.occupied || tile.type === CONFIG.TYPES.ROAD || tile.type === CONFIG.TYPES.SERVICE || tile.type === CONFIG.TYPES.RAIL || tile.type === CONFIG.TYPES.CANAL);
    }

    // Place an Irrigated Rice Paddy (Suiden)
    placePaddy(x, y, isDrag = false) {
        if (!this.canPlacePaddy(x, y)) {
            if (!isDrag) this.state.showToast("Cannot cultivate paddy on occupied land!", true);
            return false;
        }

        const cost = CONFIG.COSTS.RICE_PADDY || 10;
        if (!this.state.deductTreasury(cost)) {
            if (!isDrag) this.state.showToast(`Insufficient treasury for Rice Paddy (¥${cost} needed)!`, true);
            return false;
        }

        this.grid.setTile(x, y, CONFIG.TYPES.AGRICULTURE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, 'suiden');
        if (typeof SOUND.playMalletClack === 'function') {
            SOUND.playMalletClack();
        }

        const isWatered = this.isIrrigated(x, y);
        const canalAdj = this.grid.hasAdjacentCanal(x, y);
        const irrText = canalAdj ? ' (Canal Irrigated 🌊)' : (isWatered ? ' (Well Irrigated 💧)' : ' (Needs Water)');

        if (!isDrag) {
            this.state.showToast(`🌾 Cultivated Rice Paddy (Suiden)! [-¥${cost}]${irrText}`);
        }
        return true;
    }

    // Demolish Rice Paddy
    demolishPaddy(x, y) {
        if (!this.grid.isValidCoord(x, y)) return false;
        const tile = this.grid.getTile(x, y);
        if (tile.type !== CONFIG.TYPES.AGRICULTURE) return false;

        this.grid.clearTile(x, y);
        this.state.showToast("Paddy returned to wild fallow land.");
        return true;
    }

    // Canal Synergy: Paddies touching canal water tiles receive automatic irrigation without wells
    isIrrigated(x, y) {
        if (this.grid.hasAdjacentCanal(x, y)) return true;
        if (this.state && this.state.simulation && typeof this.state.simulation.isWellCovered === 'function') {
            return this.state.simulation.isWellCovered(x, y);
        }
        return false;
    }

    // Determine current agricultural season state
    getSeasonState(month = 1) {
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    // Calculate Autumn Harvest revenue yield (+¥20 per irrigated tile; -50% if flooded by typhoon)
    calculateHarvestYield(month = 1) {
        if (month < 9 || month > 11) return 0;
        let total = 0;
        const baseBonus = (CONFIG.SIMULATION && CONFIG.SIMULATION.RICE_HARVEST_BONUS) || 20;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.AGRICULTURE && this.isIrrigated(tile.x, tile.y)) {
                const mult = (tile.submerged || tile.isFlooded) ? 0.50 : 1.0;
                total += Math.round(baseBonus * mult);
            }
        }
        return total;
    }

    // Total active paddy counts
    getPaddyCounts() {
        let total = 0;
        let irrigated = 0;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.AGRICULTURE) {
                total++;
                if (this.isIrrigated(tile.x, tile.y)) irrigated++;
            }
        }
        return { total, irrigated };
    }

    // Procedural 3D Mesh Generator for Rice Paddy Tile
    static createRicePaddyMesh(tile, currentMonth = 1, isIrrigated = true) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const season = (currentMonth >= 3 && currentMonth <= 5) ? 'spring'
            : (currentMonth >= 6 && currentMonth <= 8) ? 'summer'
            : (currentMonth >= 9 && currentMonth <= 11) ? 'autumn' : 'winter';

        // 1. Earthen Dikes (Aze 畦) - Clay embankments dividing paddy into 4 flooded quadrants
        const dikeMat = new THREE.MeshLambertMaterial({ color: 0x5a4834 });
        const dikeH = 0.08;
        const dikeW = 0.12;

        // Outer perimeter dikes
        const nDike = new THREE.Mesh(new THREE.BoxGeometry(s * 0.96, dikeH, dikeW), dikeMat);
        nDike.position.set(0, dikeH / 2, -s * 0.44);
        group.add(nDike);

        const sDike = nDike.clone();
        sDike.position.set(0, dikeH / 2, s * 0.44);
        group.add(sDike);

        const eDike = new THREE.Mesh(new THREE.BoxGeometry(dikeW, dikeH, s * 0.88), dikeMat);
        eDike.position.set(-s * 0.44, dikeH / 2, 0);
        group.add(eDike);

        const wDike = eDike.clone();
        wDike.position.set(s * 0.44, dikeH / 2, 0);
        group.add(wDike);

        // Center cross dikes dividing into 4 quadrants
        const midCrossX = new THREE.Mesh(new THREE.BoxGeometry(s * 0.88, dikeH * 0.85, dikeW * 0.85), dikeMat);
        midCrossX.position.set(0, (dikeH * 0.85) / 2, 0);
        group.add(midCrossX);

        const midCrossZ = new THREE.Mesh(new THREE.BoxGeometry(dikeW * 0.85, dikeH * 0.85, s * 0.88), dikeMat);
        midCrossZ.position.set(0, (dikeH * 0.85) / 2, 0);
        group.add(midCrossZ);

        // Wooden irrigation sluice gate (Mizuguchi / 水口) on north dike
        const woodMat = MaterialLibrary.get('woodDark');
        const sluiceGate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.04), woodMat);
        sluiceGate.position.set(0, 0.08, -s * 0.44);
        group.add(sluiceGate);
        const sluicePeg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 4), woodMat);
        sluicePeg.position.set(0, 0.14, -s * 0.44);
        group.add(sluicePeg);

        // 2. Four Interior Quadrant Basins
        const qSize = s * 0.38;
        const qOffsets = [
            [-s * 0.22, -s * 0.22],
            [s * 0.22, -s * 0.22],
            [-s * 0.22, s * 0.22],
            [s * 0.22, s * 0.22]
        ];

        if (season === 'spring') {
            // Flooded sky-reflecting water plane with young rice shoots
            const waterColor = isIrrigated ? 0x6892b0 : 0x4e4539;
            const waterMat = new THREE.MeshLambertMaterial({ color: waterColor, transparent: true, opacity: 0.88 });
            const waterGeo = new THREE.PlaneGeometry(qSize, qSize);
            waterGeo.rotateX(-Math.PI / 2);

            const shootMat = new THREE.MeshLambertMaterial({ color: 0x58a838 });
            const shootGeo = new THREE.ConeGeometry(0.035, 0.11, 4);

            for (const [qx, qz] of qOffsets) {
                const waterMesh = new THREE.Mesh(waterGeo, waterMat);
                waterMesh.position.set(qx, 0.035, qz);
                group.add(waterMesh);

                // Grid of seedling shoots in neat rows
                for (const ox of [-0.10, 0.10]) {
                    for (const oz of [-0.10, 0.10]) {
                        const shoot = new THREE.Mesh(shootGeo, shootMat);
                        shoot.position.set(qx + ox, 0.08, qz + oz);
                        group.add(shoot);
                    }
                }
            }
        } else if (season === 'summer') {
            // Dense, vibrant lush emerald green stalks
            const fieldMat = new THREE.MeshLambertMaterial({ color: isIrrigated ? 0x2e7d32 : 0x556b2f });
            const fieldGeo = new THREE.BoxGeometry(qSize, 0.20, qSize);
            const stalkMat = new THREE.MeshLambertMaterial({ color: 0x3d9638 });
            const stalkGeo = new THREE.ConeGeometry(0.065, 0.18, 5);

            for (const [qx, qz] of qOffsets) {
                const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
                fieldMesh.position.set(qx, 0.10, qz);
                fieldMesh.castShadow = true;
                group.add(fieldMesh);

                for (const ox of [-0.10, 0.10]) {
                    for (const oz of [-0.10, 0.10]) {
                        const stalk = new THREE.Mesh(stalkGeo, stalkMat);
                        stalk.position.set(qx + ox, 0.22, qz + oz);
                        group.add(stalk);
                    }
                }
            }
        } else if (season === 'autumn') {
            // Golden heavy ripe rice heads (Inaho) & center Kakashi scarecrow
            const goldMat = new THREE.MeshLambertMaterial({ color: isIrrigated ? 0xcca022 : 0x8a7238 });
            const fieldGeo = new THREE.BoxGeometry(qSize, 0.22, qSize);
            const headMat = new THREE.MeshLambertMaterial({ color: 0xe2b428 });
            const headGeo = new THREE.DodecahedronGeometry(0.075, 0);

            for (const [qx, qz] of qOffsets) {
                const fieldMesh = new THREE.Mesh(fieldGeo, goldMat);
                fieldMesh.position.set(qx, 0.11, qz);
                fieldMesh.castShadow = true;
                group.add(fieldMesh);

                for (const ox of [-0.10, 0.10]) {
                    for (const oz of [-0.10, 0.10]) {
                        const head = new THREE.Mesh(headGeo, headMat);
                        head.position.set(qx + ox, 0.25, qz + oz);
                        group.add(head);
                    }
                }
            }

            // Miniature Kakashi (scarecrow) on the center bund crossroads
            const bambooMat = MaterialLibrary.get('bamboo');
            const strawMat = MaterialLibrary.get('strawTawara');
            // Bamboo vertical post
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 4), bambooMat);
            post.position.set(0, 0.24, 0);
            group.add(post);
            // Straw crossarm sleeves
            const arms = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.03), strawMat);
            arms.position.set(0, 0.34, 0);
            group.add(arms);
            // Conical straw hat (Sugegasa)
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.05, 6), strawMat);
            hat.position.set(0, 0.47, 0);
            group.add(hat);
        } else {
            // Winter: Dry cut stubble earth & furrowed rows
            const stubbleMat = new THREE.MeshLambertMaterial({ color: 0x6e6353 });
            const stubbleGeo = new THREE.BoxGeometry(qSize, 0.05, qSize);
            const cutMat = new THREE.MeshLambertMaterial({ color: 0x8a7e6d });
            const cutGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 4);

            for (const [qx, qz] of qOffsets) {
                const stubbleMesh = new THREE.Mesh(stubbleGeo, stubbleMat);
                stubbleMesh.position.set(qx, 0.025, qz);
                group.add(stubbleMesh);

                for (const ox of [-0.10, 0.10]) {
                    for (const oz of [-0.10, 0.10]) {
                        const cut = new THREE.Mesh(cutGeo, cutMat);
                        cut.position.set(qx + ox, 0.06, qz + oz);
                        group.add(cut);
                    }
                }
            }
        }

        return group;
    }
}
