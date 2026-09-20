// Project Meiji - Canal & Taiko-bashi Bridge Mesh Generator (canal_mesh.js)
// ponytail: recessed reflective water tile with stone embankments & arched drum bridge

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CanalMesh {
    // ponytail: cached materials for canal bed silt, shimmering water, and masonry embankments
    static getBedMaterial() {
        if (!this._bedMaterial) {
            this._bedMaterial = new THREE.MeshLambertMaterial({ color: 0x182422 });
        }
        return this._bedMaterial;
    }

    static getWaterMaterial() {
        if (!this._waterMaterial) {
            this._waterMaterial = new THREE.MeshStandardMaterial({
                color: 0x227888,       // Luminous historical Japanese canal turquoise (Aoi-mizu)
                emissive: 0x072b33,    // Subtle inner water luminescence in ambient lighting
                roughness: 0.10,       // Glossy specular water sheen
                metalness: 0.15,
                transparent: true,
                opacity: 0.90,
            });
        }
        return this._waterMaterial;
    }

    static getStoneMaterial() {
        if (!this._stoneMaterial) {
            this._stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x5e5952 });
        }
        return this._stoneMaterial;
    }

    static getWoodBridgeMaterial() {
        if (!this._woodBridgeMaterial) {
            this._woodBridgeMaterial = new THREE.MeshLambertMaterial({ color: 0x6e4e32 });
        }
        return this._woodBridgeMaterial;
    }

    static getWoodPostMaterial() {
        if (!this._woodPostMaterial) {
            this._woodPostMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3421 });
        }
        return this._woodPostMaterial;
    }

    static getStoneBridgeMaterial() {
        if (!this._stoneBridgeMaterial) {
            this._stoneBridgeMaterial = new THREE.MeshLambertMaterial({ color: 0x88847d });
        }
        return this._stoneBridgeMaterial;
    }

    static getStonePostMaterial() {
        if (!this._stonePostMaterial) {
            this._stonePostMaterial = new THREE.MeshLambertMaterial({ color: 0x65615a });
        }
        return this._stonePostMaterial;
    }

    static getFinialMaterial() {
        if (!this._finialMaterial) {
            this._finialMaterial = new THREE.MeshLambertMaterial({ color: 0xa88c42 });
        }
        return this._finialMaterial;
    }

    // Creates the complete Canal mesh including recessed water, embankments, and bridge
    static createCanalMesh(tile, grid) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;

        // 1. Canal Bed / Trench Liner (y = 0.015: masks green terrain & gridHelper lines)
        const bedGeo = new THREE.PlaneGeometry(s, s);
        bedGeo.rotateX(-Math.PI / 2);
        const bedMesh = new THREE.Mesh(bedGeo, this.getBedMaterial());
        bedMesh.position.y = 0.015;
        bedMesh.receiveShadow = true;
        group.add(bedMesh);

        // 2. Reflective Water Surface (y = 0.038: sits atop bed, recessed below embankments)
        const waterGeo = new THREE.PlaneGeometry(s, s);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMesh = new THREE.Mesh(waterGeo, this.getWaterMaterial());
        waterMesh.position.y = 0.038;
        waterMesh.renderOrder = 1;
        waterMesh.receiveShadow = true;
        group.add(waterMesh);

        // 3. Stone Embankment Walls along borders adjacent to non-canal tiles
        const neighbors = [
            { dx: 0, dy: -1, edge: 'N' },
            { dx: 0, dy: 1,  edge: 'S' },
            { dx: 1, dy: 0,  edge: 'E' },
            { dx: -1, dy: 0, edge: 'W' },
        ];

        const wallMat = this.getStoneMaterial();
        const wallThick = 0.12;
        const wallH = 0.12;

        // Auto-detect bridge orientation if bridge present
        let bridgeIsEastWest = false;
        if (tile.hasBridge && grid) {
            const east = grid.getTile(tile.x + 1, tile.y);
            const west = grid.getTile(tile.x - 1, tile.y);
            const isRoad = t => t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge));
            if (isRoad(east) || isRoad(west)) {
                bridgeIsEastWest = true;
            }
        }

        for (const n of neighbors) {
            // Keep bridge road entrances open
            if (tile.hasBridge) {
                if (bridgeIsEastWest && (n.edge === 'E' || n.edge === 'W')) continue;
                if (!bridgeIsEastWest && (n.edge === 'N' || n.edge === 'S')) continue;
            }

            const nt = grid ? grid.getTile(tile.x + n.dx, tile.y + n.dy) : null;
            const isCanalNeighbor = nt && nt.type === CONFIG.TYPES.CANAL;
            if (!isCanalNeighbor) {
                // Spawn retaining stone kerb along this edge
                let w = s, d = wallThick, px = 0, pz = 0;
                if (n.edge === 'N') { pz = -s / 2 + wallThick / 2; }
                else if (n.edge === 'S') { pz = s / 2 - wallThick / 2; }
                else if (n.edge === 'E') { px = s / 2 - wallThick / 2; w = wallThick; d = s; }
                else if (n.edge === 'W') { px = -s / 2 + wallThick / 2; w = wallThick; d = s; }

                const wallGeo = new THREE.BoxGeometry(w, wallH, d);
                const wallMesh = new THREE.Mesh(wallGeo, wallMat);
                wallMesh.position.set(px, wallH / 2 + 0.01, pz);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                group.add(wallMesh);
            }
        }

        // 4. Arched Bridge (Taiko-bashi) if road intersects canal
        if (tile.hasBridge) {
            const bridgeMesh = this.createBridgeMesh(tile, grid);
            group.add(bridgeMesh);
        }

        return group;
    }

    // Auto-detect bridge orientation and spawn arched Taiko-bashi mesh
    static createBridgeMesh(tile, grid) {
        const bridgeGroup = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const isStone = tile.roadTier === 2;

        // Determine road orientation (North-South vs East-West)
        let isEastWest = false;
        if (grid) {
            const east = grid.getTile(tile.x + 1, tile.y);
            const west = grid.getTile(tile.x - 1, tile.y);
            const isRoad = t => t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge));
            if (isRoad(east) || isRoad(west)) {
                isEastWest = true;
            }
        }

        const deckMat = isStone ? this.getStoneBridgeMaterial() : this.getWoodBridgeMaterial();
        const railMat = isStone ? this.getStonePostMaterial() : this.getWoodPostMaterial();

        // Arch dimensions: spans across tile (length s * 1.02, width 0.72)
        const bridgeLen = s * 1.02;
        const bridgeWidth = 0.76;
        const segments = 5;
        const segLen = bridgeLen / segments;

        // Construct 5 segmented deck planks forming a smooth arch
        const deckGroup = new THREE.Group();
        const archPeak = 0.18;
        const archBase = 0.04;

        for (let i = 0; i < segments; i++) {
            const t = (i + 0.5) / segments; // 0 to 1
            // Parabolic arch curve: 4 * t * (1 - t)
            const curve = 4 * t * (1 - t);
            const y = archBase + curve * (archPeak - archBase);
            const z = (t - 0.5) * bridgeLen;

            // Pitch angle of segment
            const slope = (1 - 2 * t) * (archPeak - archBase) * 2.8;

            const plankGeo = new THREE.BoxGeometry(bridgeWidth, 0.07, segLen * 1.06);
            const plank = new THREE.Mesh(plankGeo, deckMat);
            plank.position.set(0, y, z);
            plank.rotation.x = slope;
            plank.castShadow = true;
            plank.receiveShadow = true;
            deckGroup.add(plank);
        }

        // Railings / Balustrades on both sides
        [-bridgeWidth / 2 + 0.03, bridgeWidth / 2 - 0.03].forEach(xSide => {
            const postCount = 4;
            for (let p = 0; p < postCount; p++) {
                const pt = p / (postCount - 1);
                const py = archBase + (4 * pt * (1 - pt)) * (archPeak - archBase) + 0.16;
                const pz = (pt - 0.5) * (bridgeLen * 0.88);

                const postGeo = new THREE.BoxGeometry(0.06, 0.28, 0.06);
                const postMesh = new THREE.Mesh(postGeo, railMat);
                postMesh.position.set(xSide, py, pz);
                postMesh.castShadow = true;
                deckGroup.add(postMesh);

                // Finial on top of stone posts (Giboshi)
                if (isStone) {
                    const finialGeo = new THREE.ConeGeometry(0.04, 0.08, 4);
                    const finial = new THREE.Mesh(finialGeo, this.getFinialMaterial());
                    finial.position.set(xSide, py + 0.16, pz);
                    deckGroup.add(finial);
                }
            }

            // Top Handrail beam
            const railGeo = new THREE.BoxGeometry(0.05, 0.04, bridgeLen * 0.90);
            const railMesh = new THREE.Mesh(railGeo, railMat);
            railMesh.position.set(xSide, archPeak + 0.28, 0);
            deckGroup.add(railMesh);
        });

        // Rotate deck 90 degrees if bridge runs East-West
        if (isEastWest) {
            deckGroup.rotation.y = Math.PI / 2;
        }

        bridgeGroup.add(deckGroup);
        return bridgeGroup;
    }
}
