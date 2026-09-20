// Project Meiji - Agrarian Infrastructure & Rice Paddy Engine (agricultureManager.js)
// ponytail: low-lying earthen dikes (aze), 4-season dynamic visual states & canal irrigation synergy

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { SOUND } from './fx.js';

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
        SOUND.playMalletClack();

        const isWatered = this.isIrrigated(x, y);
        const canalAdj = this.grid.hasAdjacentCanal(x, y);
        const irrText = canalAdj ? ' (Canal Irrigated 🌊)' : (isWatered ? ' (Well Irrigated 💧)' : ' (Needs Water)');

        if (!isDrag) {
            this.state.showToast(`🌾 Cultivated Rice Paddy (Suiden)! [-¥${cost}]${irrText}`);
        }
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
    // Spring (M3-M5): Flooded water with green seedling clusters
    // Summer (M6-M8): Dense, vibrant lush green stalks
    // Autumn (M9-M11): Golden yellow-brown ready for harvest
    // Winter (M12-M2): Dry cut stubble earth
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
        const baseBonus = CONFIG.SIMULATION.RICE_HARVEST_BONUS || 20;
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

        // 1. Earthen Dikes (Aze 畦) - Low clay embankment surrounding 4 sides
        const dikeMat = new THREE.MeshLambertMaterial({ color: 0x5a4834 });
        const dikeH = 0.08;
        const dikeW = 0.14;

        // North & South dikes
        const nDikeGeo = new THREE.BoxGeometry(s * 0.98, dikeH, dikeW);
        const nDike = new THREE.Mesh(nDikeGeo, dikeMat);
        nDike.position.set(0, dikeH / 2, -s * 0.44);
        group.add(nDike);

        const sDike = nDike.clone();
        sDike.position.set(0, dikeH / 2, s * 0.44);
        group.add(sDike);

        // East & West dikes
        const eDikeGeo = new THREE.BoxGeometry(dikeW, dikeH, s * 0.88);
        const eDike = new THREE.Mesh(eDikeGeo, dikeMat);
        eDike.position.set(-s * 0.44, dikeH / 2, 0);
        group.add(eDike);

        const wDike = eDike.clone();
        wDike.position.set(s * 0.44, dikeH / 2, 0);
        group.add(wDike);

        // 2. Interior Basin Ground Plane
        const innerSize = s * 0.82;
        if (season === 'spring') {
            // Flooded sky-reflecting water plane with small green seedling tufts
            const waterColor = isIrrigated ? 0x688fa8 : 0x4f4438;
            const waterMat = new THREE.MeshLambertMaterial({
                color: waterColor,
                transparent: true,
                opacity: 0.85
            });
            const waterGeo = new THREE.PlaneGeometry(innerSize, innerSize);
            waterGeo.rotateX(-Math.PI / 2);
            const waterMesh = new THREE.Mesh(waterGeo, waterMat);
            waterMesh.position.y = 0.035;
            group.add(waterMesh);

            // Tiny green rice seedling clusters in neat rows
            const shootMat = new THREE.MeshLambertMaterial({ color: 0x52a038 });
            const shootGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
            for (let rx = -0.55; rx <= 0.55; rx += 0.38) {
                for (let rz = -0.55; rz <= 0.55; rz += 0.38) {
                    const shoot = new THREE.Mesh(shootGeo, shootMat);
                    shoot.position.set(rx * (s * 0.4), 0.08, rz * (s * 0.4));
                    group.add(shoot);
                }
            }
        } else if (season === 'summer') {
            // Dense, vibrant lush emerald green stalks
            const fieldMat = new THREE.MeshLambertMaterial({ color: isIrrigated ? 0x2e7d32 : 0x556b2f });
            const fieldGeo = new THREE.BoxGeometry(innerSize, 0.22, innerSize);
            const fieldMesh = new THREE.Mesh(fieldGeo, fieldMat);
            fieldMesh.position.y = 0.11;
            fieldMesh.castShadow = true;
            group.add(fieldMesh);

            // Stalk tufts
            const stalkMat = new THREE.MeshLambertMaterial({ color: 0x3d9438 });
            const stalkGeo = new THREE.ConeGeometry(0.07, 0.18, 5);
            for (let rx = -0.6; rx <= 0.6; rx += 0.4) {
                for (let rz = -0.6; rz <= 0.6; rz += 0.4) {
                    const stalk = new THREE.Mesh(stalkGeo, stalkMat);
                    stalk.position.set(rx * (s * 0.38), 0.24, rz * (s * 0.38));
                    group.add(stalk);
                }
            }
        } else if (season === 'autumn') {
            // Golden yellow-brown waving rice ready for harvest
            const goldMat = new THREE.MeshLambertMaterial({ color: isIrrigated ? 0xcc9922 : 0x8a7038 });
            const fieldGeo = new THREE.BoxGeometry(innerSize, 0.24, innerSize);
            const fieldMesh = new THREE.Mesh(fieldGeo, goldMat);
            fieldMesh.position.y = 0.12;
            fieldMesh.castShadow = true;
            group.add(fieldMesh);

            // Golden heavy rice heads (Inaho 稲穂)
            const headMat = new THREE.MeshLambertMaterial({ color: 0xe0ad2a });
            const headGeo = new THREE.DodecahedronGeometry(0.08, 0);
            for (let rx = -0.6; rx <= 0.6; rx += 0.35) {
                for (let rz = -0.6; rz <= 0.6; rz += 0.35) {
                    const head = new THREE.Mesh(headGeo, headMat);
                    head.position.set(rx * (s * 0.38), 0.27, rz * (s * 0.38));
                    group.add(head);
                }
            }
        } else {
            // Winter: Dry cut stubble earth
            const stubbleMat = new THREE.MeshLambertMaterial({ color: 0x6e6353 });
            const stubbleGeo = new THREE.BoxGeometry(innerSize, 0.05, innerSize);
            const stubbleMesh = new THREE.Mesh(stubbleGeo, stubbleMat);
            stubbleMesh.position.y = 0.025;
            group.add(stubbleMesh);

            // Cut stubble rows
            const cutMat = new THREE.MeshLambertMaterial({ color: 0x8a7e6d });
            const cutGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.06, 4);
            for (let rx = -0.55; rx <= 0.55; rx += 0.35) {
                for (let rz = -0.55; rz <= 0.55; rz += 0.35) {
                    const cut = new THREE.Mesh(cutGeo, cutMat);
                    cut.position.set(rx * (s * 0.38), 0.06, rz * (s * 0.38));
                    group.add(cut);
                }
            }
        }

        return group;
    }
}
