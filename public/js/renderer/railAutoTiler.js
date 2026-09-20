// Project Meiji - Procedural Curved Rail Bitmasking Engine (railAutoTiler.js)
// ponytail: 16-state bitmask, quarter-circle arcs, makuragi radial ties & crossover switch plates (< 280 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LevelCrossingMesh } from './levelCrossing.js';

export class RailAutoTiler {
    // 1. Evaluate 4 orthogonal neighbors (N=1, E=2, S=4, W=8)
    static getBitmask(tile, grid) {
        if (!grid || !tile) return 10; // Default East-West

        const isRail = (x, y) => {
            if (!grid.isValidCoord(x, y)) return false;
            const t = grid.getTile(x, y);
            return t && (t.type === CONFIG.TYPES.RAIL || (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT));
        };

        const n = isRail(tile.x, tile.y - 1) ? 1 : 0;
        const e = isRail(tile.x + 1, tile.y) ? 2 : 0;
        const s = isRail(tile.x, tile.y + 1) ? 4 : 0;
        const w = isRail(tile.x - 1, tile.y) ? 8 : 0;

        return n | e | s | w;
    }

    // 2. Human-readable description for Surveyor's Scope inspection
    static getRailDescription(mask) {
        switch (mask) {
            case 3: return 'Mainline (Curved NE)';
            case 6: return 'Mainline (Curved SE)';
            case 12: return 'Mainline (Curved SW)';
            case 9: return 'Mainline (Curved NW)';
            case 5: case 1: case 4: return 'Mainline (Straight N-S)';
            case 10: case 2: case 8: case 0: return 'Mainline (Straight E-W)';
            case 7: return 'Mainline (3-Way Switch NES)';
            case 11: return 'Mainline (3-Way Switch NEW)';
            case 13: return 'Mainline (3-Way Switch NSW)';
            case 14: return 'Mainline (3-Way Switch ESW)';
            case 15: return 'Mainline (4-Way Crossing)';
            default: return 'Mainline (Straight Track)';
        }
    }

    // 3. Procedural Straight Rail Segment
    static createStraightTrack(isNorthSouth, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x362518 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.65, roughness: 0.35 });

        const gauge = 0.44;
        const tieGeo = new THREE.BoxGeometry(0.85, 0.03, 0.12);
        const tieCount = 5;
        const tieSpacing = s / tieCount;

        for (let i = 0; i < tieCount; i++) {
            const z = (i + 0.5) * tieSpacing - (s / 2);
            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(0, 0.035, z);
            tie.castShadow = true;
            group.add(tie);
        }

        const railGeo = new THREE.BoxGeometry(0.04, 0.05, s * 1.02);
        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-gauge / 2, 0.065, 0);
        leftRail.castShadow = true;
        group.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set(gauge / 2, 0.065, 0);
        rightRail.castShadow = true;
        group.add(rightRail);

        if (!isNorthSouth) {
            group.rotation.y = Math.PI / 2;
        }
        return group;
    }

    // 4. Procedural 90-Degree Curved Rail Turn (NE, SE, SW, NW)
    static createCurvedTrack(cornerType, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const tieMat = new THREE.MeshLambertMaterial({ color: 0x362518 });
        const railMat = new THREE.MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.65, roughness: 0.35 });

        const gauge = 0.44;
        const half = s / 2; // 1.0
        const R = half;     // 1.0 radius to center of track

        // Pivot center coordinates for 4 corners
        let pivotX = 0, pivotZ = 0, angleStart = 0;
        if (cornerType === 3) { // NE: connects North (0, -half) to East (half, 0)
            pivotX = half; pivotZ = -half; angleStart = Math.PI;
        } else if (cornerType === 6) { // SE: connects East (half, 0) to South (0, half)
            pivotX = half; pivotZ = half; angleStart = Math.PI * 0.5;
        } else if (cornerType === 12) { // SW: connects South (0, half) to West (-half, 0)
            pivotX = -half; pivotZ = half; angleStart = 0;
        } else if (cornerType === 9) { // NW: connects West (-half, 0) to North (0, -half)
            pivotX = -half; pivotZ = -half; angleStart = Math.PI * 1.5;
        }

        // Radial Makuragi Wooden Ties (6 ties along the 90° arc)
        const tieCount = 6;
        const tieGeo = new THREE.BoxGeometry(0.85, 0.03, 0.12);
        for (let i = 0; i < tieCount; i++) {
            const t = (i + 0.5) / tieCount;
            const angle = angleStart + t * (Math.PI / 2);
            const cx = pivotX + R * Math.cos(angle);
            const cz = pivotZ + R * Math.sin(angle);

            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(cx, 0.035, cz);
            tie.rotation.y = -angle + Math.PI / 2;
            tie.castShadow = true;
            group.add(tie);
        }

        // Segmented Inner & Outer Rails (8 segments for silky smooth arc)
        const segCount = 8;
        const rIn = R - gauge / 2;
        const rOut = R + gauge / 2;

        const buildRailArc = (radius) => {
            for (let i = 0; i < segCount; i++) {
                const a1 = angleStart + (i / segCount) * (Math.PI / 2);
                const a2 = angleStart + ((i + 1) / segCount) * (Math.PI / 2);

                const p1x = pivotX + radius * Math.cos(a1);
                const p1z = pivotZ + radius * Math.sin(a1);
                const p2x = pivotX + radius * Math.cos(a2);
                const p2z = pivotZ + radius * Math.sin(a2);

                const midX = (p1x + p2x) / 2;
                const midZ = (p1z + p2z) / 2;
                const segLen = Math.hypot(p2x - p1x, p2z - p1z) * 1.02;

                const segGeo = new THREE.BoxGeometry(0.04, 0.05, segLen);
                const segMesh = new THREE.Mesh(segGeo, railMat);
                segMesh.position.set(midX, 0.065, midZ);
                segMesh.rotation.y = Math.atan2(p2x - p1x, p2z - p1z);
                segMesh.castShadow = true;
                group.add(segMesh);
            }
        };

        buildRailArc(rIn);
        buildRailArc(rOut);

        return group;
    }

    // 5. Crossover Frog Plates & Switch Points (Masks 7, 11, 13, 14, 15)
    static createSwitchJunction(mask, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const ironPlateMat = new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.85, roughness: 0.25 });

        // Primary Straight Line through the junction
        const connectsNS = (mask & 1) && (mask & 4);
        const straightTrack = this.createStraightTrack(connectsNS, s);
        group.add(straightTrack);

        // Branch Line
        if (mask === 15) {
            // Full 4-way crossover (+ intersection)
            const crossTrack = this.createStraightTrack(!connectsNS, s);
            group.add(crossTrack);
        } else {
            // 3-way switch branching curve
            if ((mask & 1) && (mask & 2)) group.add(this.createCurvedTrack(3, s));
            else if ((mask & 4) && (mask & 2)) group.add(this.createCurvedTrack(6, s));
            else if ((mask & 4) && (mask & 8)) group.add(this.createCurvedTrack(12, s));
            else if ((mask & 1) && (mask & 8)) group.add(this.createCurvedTrack(9, s));
        }

        // Diamond / Frog Crossing Check Rail Plate
        const frogGeo = new THREE.BoxGeometry(0.36, 0.02, 0.36);
        const frogMesh = new THREE.Mesh(frogGeo, ironPlateMat);
        frogMesh.position.set(0, 0.05, 0);
        frogMesh.rotation.y = Math.PI / 4;
        frogMesh.receiveShadow = true;
        group.add(frogMesh);

        return group;
    }

    // 6. Master Assembly for Rail Tile Mesh
    static createRailTrackMesh(tile, grid, modelCache = null) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        // Dark Basalt Ballast Bed
        const ballastMat = new THREE.MeshLambertMaterial({ color: 0x484541 });
        const ballastGeo = new THREE.BoxGeometry(s * 0.98, 0.03, s * 0.98);
        const ballast = new THREE.Mesh(ballastGeo, ballastMat);
        ballast.position.y = 0.015;
        ballast.receiveShadow = true;
        group.add(ballast);

        const mask = this.getBitmask(tile, grid);

        if (mask === 3 || mask === 6 || mask === 12 || mask === 9) {
            // Curved 90-degree corner
            group.add(this.createCurvedTrack(mask, s));
        } else if (mask === 7 || mask === 11 || mask === 13 || mask === 14 || mask === 15) {
            // 3-way switch or 4-way crossover
            group.add(this.createSwitchJunction(mask, s));
        } else if (mask === 5 || mask === 1 || mask === 4) {
            // Straight North-South
            group.add(this.createStraightTrack(true, s));
        } else {
            // Straight East-West (Mask 10, 2, 8, 0)
            group.add(this.createStraightTrack(false, s));
        }

        // Level Crossing (Fumikiri)
        if (tile && tile.hasCrossing) {
            group.add(LevelCrossingMesh.createLevelCrossingMesh(tile, grid, modelCache));
        }

        return group;
    }
}
