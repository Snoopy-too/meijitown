// Project Meiji - Road-Rail Level Crossing Mesh Builder (levelCrossing.js)
// Continuous stone/dirt road aprons & curbs through railway tracks, flush timber flangeway planks & fumikiri warning posts

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';
import { RoadTextureManager } from './road_texture.js';

function isRailLink(t) {
    return Boolean(t && (t.type === CONFIG.TYPES.RAIL ||
        (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT)));
}

function isRoadNeighbor(t) {
    return Boolean(t && (t.type === CONFIG.TYPES.ROAD ||
        (t.type === CONFIG.TYPES.CANAL && t.hasBridge) ||
        (t.type === CONFIG.TYPES.RAIL && t.hasCrossing)));
}

export class LevelCrossingMesh {
    static getSharedMats() {
        if (LevelCrossingMesh._mats) return LevelCrossingMesh._mats;
        const woodPBR = PBRTextureGenerator.getWoodWallSet();
        const tag = (mat) => {
            mat.userData = { ...(mat.userData || {}), isSharedLibraryMaterial: true };
            return mat;
        };
        LevelCrossingMesh._mats = {
            timberDeck: tag(new THREE.MeshStandardMaterial({
                color: 0x6e5238, roughness: 0.80, metalness: 0.04, envMapIntensity: 0.62,
                ...(woodPBR.normalMap ? { normalMap: woodPBR.normalMap } : {})
            })),
            timberRamp: tag(new THREE.MeshStandardMaterial({
                color: 0x4e3a28, roughness: 0.84, metalness: 0.04, envMapIntensity: 0.58,
                ...(woodPBR.normalMap ? { normalMap: woodPBR.normalMap } : {})
            })),
            warnYellow: tag(new THREE.MeshStandardMaterial({ color: 0xdfb418, roughness: 0.46, metalness: 0.08, envMapIntensity: 0.78 })),
            warnBlack: tag(new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.58, metalness: 0.10, envMapIntensity: 0.72 }))
        };
        return LevelCrossingMesh._mats;
    }

    static createLevelCrossingMesh(tile, grid, modelCache = null) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        let connectsNS = false;
        let connectsEW = false;
        let north = null;
        let south = null;
        let east = null;
        let west = null;

        if (grid) {
            north = grid.getTile(tile.x, tile.y - 1);
            south = grid.getTile(tile.x, tile.y + 1);
            east = grid.getTile(tile.x + 1, tile.y);
            west = grid.getTile(tile.x - 1, tile.y);
            connectsNS = isRailLink(north) || isRailLink(south);
            connectsEW = isRailLink(east) || isRailLink(west);
        }

        const isRailNS = connectsNS || !connectsEW;

        if (modelCache && modelCache.has('crossing')) {
            const crossingObj = modelCache.get('crossing').clone();
            crossingObj.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            if (!isRailNS) crossingObj.rotation.y = Math.PI / 2;
            group.add(crossingObj);
            return group;
        }

        // Resolve perpendicular road sides aligned with crossingGroup local X axis (-X and +X)
        const negSideTile = isRailNS ? west : south;
        const posSideTile = isRailNS ? east : north;
        const baseTier = tile.roadTier || 1;
        const negRoadTier = isRoadNeighbor(negSideTile) ? (negSideTile.roadTier || 1) : 0;
        const posRoadTier = isRoadNeighbor(posSideTile) ? (posSideTile.roadTier || 1) : 0;
        const centerTier = Math.max(baseTier, negRoadTier || 1, posRoadTier || 1);
        const negTier = negRoadTier ? Math.max(baseTier, negRoadTier) : centerTier;
        const posTier = posRoadTier ? Math.max(baseTier, posRoadTier) : centerTier;

        const crossingGroup = new THREE.Group();
        const trackWidth = s * 0.58;
        const shoulderWidth = s * 0.82;
        const mats = LevelCrossingMesh.getSharedMats();

        const stoneRoadMat = RoadTextureManager.getStoneRoadMaterial();
        const stoneShoulderMat = RoadTextureManager.getStoneShoulderMaterial();
        const stoneKerbMat = RoadTextureManager.getStoneKerbMaterial();
        const gutterMat = RoadTextureManager.getGutterChannelMaterial();
        const dirtRoadMat = RoadTextureManager.getDirtRoadMaterial();
        const dirtShoulderMat = RoadTextureManager.getDirtShoulderMaterial();

        const addBox = (w, h, d, mat, x, y, z, shadow = false) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
            m.position.set(x, y, z);
            m.castShadow = shadow;
            m.receiveShadow = true;
            crossingGroup.add(m);
            return m;
        };

        // 1. Continuous road aprons & shoulders running flush from tile borders right up to outer rail edges
        const apronLen = 0.76; // Covers [0.245 .. 1.005]
        const apronOffset = 0.625;
        const halves = [
            { sign: -1, tier: negTier },
            { sign: 1, tier: posTier }
        ];
        for (const half of halves) {
            const isStone = half.tier === 2;
            const cx = half.sign * apronOffset;
            addBox(apronLen, 0.020, shoulderWidth, isStone ? stoneShoulderMat : dirtShoulderMat, cx, 0.015, 0);
            addBox(
                apronLen,
                isStone ? 0.060 : 0.050,
                trackWidth,
                isStone ? stoneRoadMat : dirtRoadMat,
                cx,
                isStone ? 0.040 : 0.035,
                0
            );
            if (isStone) {
                const kerbLen = 0.755;
                const kx = half.sign * 0.628;
                addBox(kerbLen, 0.070, 0.040, stoneKerbMat, kx, 0.045, trackWidth / 2, true);
                addBox(kerbLen, 0.070, 0.040, stoneKerbMat, kx, 0.045, -trackWidth / 2, true);
                addBox(0.74, 0.016, 0.048, gutterMat, half.sign * 0.635, 0.022, trackWidth / 2 + 0.065);
                addBox(0.74, 0.016, 0.048, gutterMat, half.sign * 0.635, 0.022, -(trackWidth / 2 + 0.065));
            }
        }

        // 2. Under-rail roadbed fill across track zone [-0.25 .. +0.25] so no grass shows beneath rails
        const centerIsStone = centerTier === 2;
        addBox(0.50, 0.020, shoulderWidth, centerIsStone ? stoneShoulderMat : dirtShoulderMat, 0, 0.015, 0);
        addBox(
            0.495,
            centerIsStone ? 0.052 : 0.044,
            trackWidth,
            centerIsStone ? stoneRoadMat : dirtRoadMat,
            0,
            centerIsStone ? 0.036 : 0.032,
            0
        );

        // 3. Recessed timber flangeway deck planks between rails & outer cheek sills (steel rails rise above at y=0.090)
        const plankLenZ = trackWidth - 0.04;
        addBox(0.142, 0.026, plankLenZ, mats.timberDeck, -0.078, 0.061, 0, true);
        addBox(0.142, 0.026, plankLenZ, mats.timberDeck, 0.078, 0.061, 0, true);
        addBox(0.034, 0.022, plankLenZ, mats.timberRamp, -0.260, 0.061, 0);
        addBox(0.034, 0.022, plankLenZ, mats.timberRamp, 0.260, 0.061, 0);

        // 4. Striped Meiji Fumikiri Crossbuck Warning Posts on outer roadside corners
        const postGeo = new THREE.BoxGeometry(0.045, 0.14, 0.045);
        const bladeGeo = new THREE.BoxGeometry(0.28, 0.04, 0.02);
        const capGeo = new THREE.BoxGeometry(0.06, 0.03, 0.06);

        for (const [px, pz] of [[-0.64, -0.72], [0.64, 0.72]]) {
            const postGroup = new THREE.Group();
            postGroup.position.set(px, 0, pz);

            for (let band = 0; band < 4; band++) {
                const seg = new THREE.Mesh(postGeo, band % 2 === 0 ? mats.warnYellow : mats.warnBlack);
                seg.position.y = 0.07 + band * 0.14;
                seg.castShadow = true;
                postGroup.add(seg);
            }

            const b1 = new THREE.Mesh(bladeGeo, mats.warnYellow);
            b1.position.set(0, 0.56, 0.03);
            b1.rotation.z = Math.PI / 4;
            b1.castShadow = true;
            postGroup.add(b1);

            const b2 = new THREE.Mesh(bladeGeo, mats.warnBlack);
            b2.position.set(0, 0.56, -0.02);
            b2.rotation.z = -Math.PI / 4;
            b2.castShadow = true;
            postGroup.add(b2);

            const cap = new THREE.Mesh(capGeo, mats.warnBlack);
            cap.position.y = 0.64;
            postGroup.add(cap);

            crossingGroup.add(postGroup);
        }

        if (!isRailNS) {
            crossingGroup.rotation.y = Math.PI / 2;
        }
        group.add(crossingGroup);
        return group;
    }
}
