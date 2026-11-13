// Project Meiji - Procedural Curved Rail Bitmasking Engine (railAutoTiler.js)
// ponytail: 16-state bitmask, quarter-circle arcs, makuragi radial ties & crossover switch plates (< 280 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { LevelCrossingMesh } from './levelCrossing.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';

function getRailMaterials() {
    if (RailAutoTiler._railMats) return RailAutoTiler._railMats;
    const stone = PBRTextureGenerator.getStoneSet();
    const wood = PBRTextureGenerator.getWoodWallSet();
    RailAutoTiler._railMats = {
        ballastBase: new THREE.MeshStandardMaterial({ color: 0x3d3a36, roughness: 0.94, metalness: 0.04, envMapIntensity: 0.55, ...(stone.normalMap ? { normalMap: stone.normalMap } : {}) }),
        ballastCrown: new THREE.MeshStandardMaterial({ color: 0x4c4843, roughness: 0.90, metalness: 0.05, envMapIntensity: 0.58, ...(stone.normalMap ? { normalMap: stone.normalMap } : {}) }),
        tie: new THREE.MeshStandardMaterial({ color: 0x362518, roughness: 0.85, metalness: 0.04, envMapIntensity: 0.55, ...(wood.normalMap ? { normalMap: wood.normalMap } : {}) }),
        plate: new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: 0.78, roughness: 0.36, envMapIntensity: 1.25 }),
        rail: new THREE.MeshStandardMaterial({ color: 0x4d535a, metalness: 0.82, roughness: 0.24, envMapIntensity: 1.45 }),
        timberStop: new THREE.MeshStandardMaterial({ color: 0x4a321f, roughness: 0.82, envMapIntensity: 0.58, ...(wood.normalMap ? { normalMap: wood.normalMap } : {}) }),
        ironStop: new THREE.MeshStandardMaterial({ color: 0x22252a, metalness: 0.82, roughness: 0.30, envMapIntensity: 1.35 }),
        redTarget: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.45, metalness: 0.08, envMapIntensity: 0.78 }),
        whiteTarget: new THREE.MeshStandardMaterial({ color: 0xf2efe9, roughness: 0.52, metalness: 0.06, envMapIntensity: 0.75 }),
        lampStop: new THREE.MeshStandardMaterial({ color: 0xff5533, emissive: new THREE.Color(0xff2200), emissiveIntensity: 0.75, roughness: 0.35 })
    };
    for (const m of Object.values(RailAutoTiler._railMats)) {
        m.userData = { ...(m.userData || {}), isSharedLibraryMaterial: true };
    }
    return RailAutoTiler._railMats;
}

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

    // 3. Procedural Straight Rail Segment (Contoured Ballast + Makuragi Ties + Tie Plates + Steel Rails)
    static createStraightTrack(isNorthSouth, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const rMats = getRailMaterials();
        const ballastBaseMat = rMats.ballastBase;
        const ballastCrownMat = rMats.ballastCrown;
        const tieMat = rMats.tie;
        const plateMat = rMats.plate;
        const railMat = rMats.rail;

        // Two-tier contoured crushed-basalt ballast roadbed (no full-tile black square)
        const baseBed = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.018, s * 1.01), ballastBaseMat);
        baseBed.position.y = 0.009;
        baseBed.receiveShadow = true;
        group.add(baseBed);

        const crownBed = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.018, s * 1.01), ballastCrownMat);
        crownBed.position.y = 0.022;
        crownBed.receiveShadow = true;
        group.add(crownBed);

        const gauge = 0.44;
        const tieGeo = new THREE.BoxGeometry(0.84, 0.03, 0.11);
        const plateGeo = new THREE.BoxGeometry(0.08, 0.012, 0.13);
        const tieCount = 6;
        const tieSpacing = s / tieCount;

        for (let i = 0; i < tieCount; i++) {
            const z = (i + 0.5) * tieSpacing - (s / 2);
            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(0, 0.036, z);
            tie.castShadow = true;
            tie.receiveShadow = true;
            group.add(tie);

            // Forged iron tie-plates beneath left and right rails
            const leftPlate = new THREE.Mesh(plateGeo, plateMat);
            leftPlate.position.set(-gauge / 2, 0.052, z);
            group.add(leftPlate);

            const rightPlate = new THREE.Mesh(plateGeo, plateMat);
            rightPlate.position.set(gauge / 2, 0.052, z);
            group.add(rightPlate);
        }

        const railGeo = new THREE.BoxGeometry(0.042, 0.05, s * 1.02);
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

    // 4. Procedural 90-Degree Curved Rail Turn (NE=3, SE=6, SW=12, NW=9)
    static createCurvedTrack(cornerType, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const rMats = getRailMaterials();
        const ballastBaseMat = rMats.ballastBase;
        const ballastCrownMat = rMats.ballastCrown;
        const tieMat = rMats.tie;
        const plateMat = rMats.plate;
        const railMat = rMats.rail;

        const gauge = 0.44;
        const half = s / 2; // 1.0
        const R = half;     // 1.0 radius to centerline of track

        // Corrected interior quadrant pivot coordinates & sweep angles
        let pivotX = 0, pivotZ = 0, angleStart = 0;
        if (cornerType === 3) { // NE: connects East (+half, 0) [0.5π] to North (0, -half) [π]
            pivotX = half; pivotZ = -half; angleStart = Math.PI * 0.5;
        } else if (cornerType === 6) { // SE: connects South (0, +half) [π] to East (+half, 0) [1.5π]
            pivotX = half; pivotZ = half; angleStart = Math.PI;
        } else if (cornerType === 12) { // SW: connects West (-half, 0) [1.5π] to South (0, +half) [2π]
            pivotX = -half; pivotZ = half; angleStart = Math.PI * 1.5;
        } else if (cornerType === 9) { // NW: connects North (0, -half) [0] to West (-half, 0) [0.5π]
            pivotX = -half; pivotZ = -half; angleStart = 0;
        }

        // Contoured radial crushed-basalt ballast arc (leaves outer meadow corners natural)
        const ballastSegs = 10;
        for (let i = 0; i < ballastSegs; i++) {
            const a1 = angleStart + (i / ballastSegs) * (Math.PI / 2);
            const a2 = angleStart + ((i + 1) / ballastSegs) * (Math.PI / 2);
            const midA = (a1 + a2) / 2;
            const cx = pivotX + R * Math.cos(midA);
            const cz = pivotZ + R * Math.sin(midA);
            const arcLen = (R * (Math.PI / 2) / ballastSegs) * 1.35;
            const rotY = -midA;

            const baseSeg = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.018, arcLen), ballastBaseMat);
            baseSeg.position.set(cx, 0.009, cz);
            baseSeg.rotation.y = rotY;
            baseSeg.receiveShadow = true;
            group.add(baseSeg);

            const crownSeg = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.018, arcLen), ballastCrownMat);
            crownSeg.position.set(cx, 0.022, cz);
            crownSeg.rotation.y = rotY;
            crownSeg.receiveShadow = true;
            group.add(crownSeg);
        }

        // Radial Makuragi Wooden Ties & Tie-Plates (7 ties along the 90° arc)
        const tieCount = 7;
        const tieGeo = new THREE.BoxGeometry(0.84, 0.03, 0.11);
        const plateGeo = new THREE.BoxGeometry(0.08, 0.012, 0.13);
        for (let i = 0; i < tieCount; i++) {
            const t = (i + 0.5) / tieCount;
            const angle = angleStart + t * (Math.PI / 2);
            const cx = pivotX + R * Math.cos(angle);
            const cz = pivotZ + R * Math.sin(angle);
            const rotY = -angle;

            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(cx, 0.036, cz);
            tie.rotation.y = rotY;
            tie.castShadow = true;
            tie.receiveShadow = true;
            group.add(tie);

            for (const rOff of [-gauge / 2, gauge / 2]) {
                const pr = R + rOff;
                const plate = new THREE.Mesh(plateGeo, plateMat);
                plate.position.set(pivotX + pr * Math.cos(angle), 0.052, pivotZ + pr * Math.sin(angle));
                plate.rotation.y = rotY;
                group.add(plate);
            }
        }

        // Segmented Inner & Outer Rails + Inner Check/Guard Rail (12 segments for silky arc)
        const segCount = 12;
        const rIn = R - gauge / 2;
        const rOut = R + gauge / 2;
        const rGuard = rIn + 0.065;

        const buildRailArc = (radius, width = 0.042, height = 0.05, yPos = 0.065, mat = railMat) => {
            for (let i = 0; i < segCount; i++) {
                const a1 = angleStart + (i / segCount) * (Math.PI / 2);
                const a2 = angleStart + ((i + 1) / segCount) * (Math.PI / 2);

                const p1x = pivotX + radius * Math.cos(a1);
                const p1z = pivotZ + radius * Math.sin(a1);
                const p2x = pivotX + radius * Math.cos(a2);
                const p2z = pivotZ + radius * Math.sin(a2);

                const midX = (p1x + p2x) / 2;
                const midZ = (p1z + p2z) / 2;
                const segLen = Math.hypot(p2x - p1x, p2z - p1z) * 1.06;

                const segGeo = new THREE.BoxGeometry(width, height, segLen);
                const segMesh = new THREE.Mesh(segGeo, mat);
                segMesh.position.set(midX, yPos, midZ);
                segMesh.rotation.y = Math.atan2(p2x - p1x, p2z - p1z);
                segMesh.castShadow = true;
                group.add(segMesh);
            }
        };

        buildRailArc(rIn);
        buildRailArc(rOut);
        buildRailArc(rGuard, 0.024, 0.042, 0.061, plateMat); // Derailment check rail along inner curve

        return group;
    }

    // 4b. Dead-End Timber & Iron Buffer Stop (Kuruma-dome / 車止め) for Terminus Track Ends
    static createBufferStop(mask, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const rMats = getRailMaterials();
        const timberMat = rMats.timberStop;
        const ironMat = rMats.ironStop;
        const redMat = rMats.redTarget;
        const whiteMat = rMats.whiteTarget;
        const lampMat = rMats.lampStop;

        const gauge = 0.44;
        const stopZ = 0.70; // Placed near open dead-end of tile

        // Dual braced A-frame iron/timber stanchions bolted to left & right rails
        for (const rx of [-gauge / 2, gauge / 2]) {
            const upright = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.24, 0.065), ironMat);
            upright.position.set(rx, 0.16, stopZ);
            upright.castShadow = true;
            group.add(upright);

            const backStrut = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.045), ironMat);
            backStrut.position.set(rx, 0.15, stopZ + 0.11);
            backStrut.rotation.x = 0.62;
            backStrut.castShadow = true;
            group.add(backStrut);

            // Forged spring buffer plunger facing approaching locomotive
            const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), ironMat);
            plunger.rotation.x = Math.PI / 2;
            plunger.position.set(rx, 0.22, stopZ - 0.055);
            group.add(plunger);
        }

        // Heavy cross-bolted cedar buffer beam at locomotive coupler height
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.09, 0.08), timberMat);
        beam.position.set(0, 0.22, stopZ - 0.01);
        beam.castShadow = true;
        group.add(beam);

        // Red & white striped Meiji railway warning board + reflex stop lamp
        const signBack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.09, 0.02), whiteMat);
        signBack.position.set(0, 0.33, stopZ);
        group.add(signBack);

        for (const sx of [-0.09, 0.09]) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.092, 0.024), redMat);
            stripe.position.set(sx, 0.33, stopZ);
            group.add(stripe);
        }

        const stopLamp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), lampMat);
        stopLamp.position.set(0, 0.40, stopZ);
        group.add(stopLamp);

        // Rotate buffer stop to sit on the open end opposite the single connected neighbor
        // Mask 1 (North neighbor -> stop at South +Z): rot 0
        // Mask 4 (South neighbor -> stop at North -Z): rot π
        // Mask 2 (East neighbor  -> stop at West  -X): rot -π/2
        // Mask 8 (West neighbor  -> stop at East  +X): rot +π/2
        if (mask === 4) group.rotation.y = Math.PI;
        else if (mask === 2) group.rotation.y = -Math.PI / 2;
        else if (mask === 8) group.rotation.y = Math.PI / 2;

        return group;
    }

    // 5. Crossover Frog Plates, Guard Rails & Manual Switch Stand (Masks 7, 11, 13, 14, 15)
    static createSwitchJunction(mask, s = CONFIG.TILE_SIZE) {
        const group = new THREE.Group();
        const rMats = getRailMaterials();
        const ironPlateMat = rMats.ironStop;
        const redTargetMat = rMats.redTarget;
        const whiteTargetMat = rMats.whiteTarget;

        // Primary Straight Line(s) through the junction
        const connectsNS = (mask & 1) && (mask & 4);
        const connectsEW = (mask & 2) && (mask & 8);
        if (connectsNS) group.add(this.createStraightTrack(true, s));
        if (connectsEW) group.add(this.createStraightTrack(false, s));

        // All valid curved turnout branches present in the bitmask
        if (mask !== 15) {
            if ((mask & 1) && (mask & 2)) group.add(this.createCurvedTrack(3, s));
            if ((mask & 4) && (mask & 2)) group.add(this.createCurvedTrack(6, s));
            if ((mask & 4) && (mask & 8)) group.add(this.createCurvedTrack(12, s));
            if ((mask & 1) && (mask & 8)) group.add(this.createCurvedTrack(9, s));
        }

        // Diamond / Frog Crossing Check Rail Plate
        const frogGeo = new THREE.BoxGeometry(0.36, 0.022, 0.36);
        const frogMesh = new THREE.Mesh(frogGeo, ironPlateMat);
        frogMesh.position.set(0, 0.052, 0);
        frogMesh.rotation.y = Math.PI / 4;
        frogMesh.receiveShadow = true;
        group.add(frogMesh);

        // Meiji Tenkanki (転換器) manual weighted switch stand beside turnout
        const standGroup = new THREE.Group();
        standGroup.position.set(0.56, 0.02, 0.56);
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.14), ironPlateMat);
        base.position.y = 0.02;
        standGroup.add(base);

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.38, 6), ironPlateMat);
        mast.position.y = 0.21;
        standGroup.add(mast);

        const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), ironPlateMat);
        lever.position.set(0.04, 0.14, 0);
        lever.rotation.z = -0.55;
        standGroup.add(lever);

        const weight = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), whiteTargetMat);
        weight.position.set(0.09, 0.22, 0);
        standGroup.add(weight);

        const targetSign = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.018), redTargetMat);
        targetSign.position.set(0, 0.36, 0);
        standGroup.add(targetSign);
        group.add(standGroup);

        return group;
    }

    // 6. Master Assembly for Rail Tile Mesh
    static createRailTrackMesh(tile, grid, modelCache = null) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        const mask = this.getBitmask(tile, grid);

        if (mask === 3 || mask === 6 || mask === 12 || mask === 9) {
            // Curved 90-degree corner with contoured arc ballast
            group.add(this.createCurvedTrack(mask, s));
        } else if (mask === 7 || mask === 11 || mask === 13 || mask === 14 || mask === 15) {
            // 3-way switch or 4-way crossover with Tenkanki switch stand
            group.add(this.createSwitchJunction(mask, s));
        } else if (mask === 5 || mask === 1 || mask === 4) {
            // Straight North-South
            group.add(this.createStraightTrack(true, s));
            if (mask === 1 || mask === 4) {
                group.add(this.createBufferStop(mask, s));
            }
        } else {
            // Straight East-West (Mask 10, 2, 8, 0)
            group.add(this.createStraightTrack(false, s));
            if (mask === 2 || mask === 8) {
                group.add(this.createBufferStop(mask, s));
            }
        }

        // Level Crossing (Fumikiri)
        if (tile && tile.hasCrossing) {
            group.add(LevelCrossingMesh.createLevelCrossingMesh(tile, grid, modelCache));
        }

        return group;
    }
}
