// Project Meiji - Canal & Taiko-bashi Bridge Mesh Generator (canal_mesh.js)
// Phase 2 /artisan: Recessed Embankments (Ishigaki), Granite Coping, Mooring Rings & Arched Drum Bridge (< 350 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CanalMesh {
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
                emissive: 0x072b33,    // Subtle inner water luminescence
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

    static getCopingMaterial() {
        if (!this._copingMaterial) {
            this._copingMaterial = new THREE.MeshLambertMaterial({ color: 0x7c7870 });
        }
        return this._copingMaterial;
    }

    static getIronMaterial() {
        if (!this._ironMaterial) {
            this._ironMaterial = new THREE.MeshStandardMaterial({ color: 0x26292b, roughness: 0.75, metalness: 0.6 });
        }
        return this._ironMaterial;
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
            this._finialMaterial = new THREE.MeshStandardMaterial({ color: 0xb59846, metalness: 0.7, roughness: 0.35 });
        }
        return this._finialMaterial;
    }

    // Creates the complete Canal mesh including recessed water, stone embankments, and bridge
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

        // 2. Reflective Water Surface (y = 0.038: recessed below embankments)
        const waterGeo = new THREE.PlaneGeometry(s, s);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMesh = new THREE.Mesh(waterGeo, this.getWaterMaterial());
        waterMesh.position.y = 0.038;
        waterMesh.renderOrder = 1;
        waterMesh.receiveShadow = true;
        group.add(waterMesh);

        // Water specular ripple highlights
        const rippleMat = new THREE.MeshBasicMaterial({ color: 0x66c8d8, transparent: true, opacity: 0.35 });
        const rip1 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.45, 0.002, 0.04), rippleMat);
        rip1.position.set(-s * 0.18, 0.040, -s * 0.12);
        group.add(rip1);
        const rip2 = new THREE.Mesh(new THREE.BoxGeometry(s * 0.38, 0.002, 0.04), rippleMat);
        rip2.position.set(s * 0.20, 0.040, s * 0.18);
        group.add(rip2);

        // 3. Stone Embankment Walls along borders adjacent to non-canal tiles
        const neighbors = [
            { dx: 0, dy: -1, edge: 'N' },
            { dx: 0, dy: 1,  edge: 'S' },
            { dx: 1, dy: 0,  edge: 'E' },
            { dx: -1, dy: 0, edge: 'W' },
        ];

        const wallMat = this.getStoneMaterial();
        const copingMat = this.getCopingMaterial();
        const ironMat = this.getIronMaterial();
        const wallThick = 0.13;
        const wallH = 0.13;

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
                // Stone retaining wall block & dressed granite top coping ledge
                let w = s, d = wallThick, px = 0, pz = 0;
                if (n.edge === 'N') { pz = -s / 2 + wallThick / 2; }
                else if (n.edge === 'S') { pz = s / 2 - wallThick / 2; }
                else if (n.edge === 'E') { px = s / 2 - wallThick / 2; w = wallThick; d = s; }
                else if (n.edge === 'W') { px = -s / 2 + wallThick / 2; w = wallThick; d = s; }

                // Main stone face
                const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
                wallMesh.position.set(px, wallH / 2 + 0.01, pz);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                group.add(wallMesh);

                // Dressed granite top coping stone
                const copingMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02), copingMat);
                copingMesh.position.set(px, wallH + 0.025, pz);
                copingMesh.castShadow = true;
                group.add(copingMesh);

                // Iron barge mooring ring on retaining wall
                const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 6), ironMat);
                ring.position.set(px, wallH * 0.65, pz);
                group.add(ring);
            }
        }

        // 4. Arched Bridge (Taiko-bashi) if road intersects canal
        if (tile.hasBridge) {
            const bridgeMesh = this.createBridgeMesh(tile, grid);
            group.add(bridgeMesh);
        }

        return group;
    }

    // Auto-detect bridge orientation and spawn authentic arched Taiko-bashi mesh
    static createBridgeMesh(tile, grid) {
        const bridgeGroup = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const isStone = tile.roadTier === 2;

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
        const finialMat = this.getFinialMaterial();

        const bridgeLen = s * 1.04;
        const bridgeWidth = 0.78;
        const segments = 6;
        const segLen = bridgeLen / segments;

        const deckGroup = new THREE.Group();
        const archPeak = 0.22;
        const archBase = 0.04;

        // Curved structural under-arch stringers
        for (const sideX of [-bridgeWidth / 2 + 0.05, bridgeWidth / 2 - 0.05]) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, bridgeLen * 0.95), railMat);
            rib.position.set(sideX, archPeak * 0.55, 0);
            deckGroup.add(rib);
        }

        // Segmented deck planks forming a gentle parabolic Taiko arch
        for (let i = 0; i < segments; i++) {
            const t = (i + 0.5) / segments;
            const curve = 4 * t * (1 - t);
            const y = archBase + curve * (archPeak - archBase);
            const z = (t - 0.5) * bridgeLen;
            const slope = (1 - 2 * t) * (archPeak - archBase) * 2.8;

            const plankGeo = new THREE.BoxGeometry(bridgeWidth, 0.065, segLen * 1.05);
            const plank = new THREE.Mesh(plankGeo, deckMat);
            plank.position.set(0, y, z);
            plank.rotation.x = slope;
            plank.castShadow = true;
            plank.receiveShadow = true;
            deckGroup.add(plank);
        }

        // Left and Right Balustrades with posts and brass Giboshi finials
        for (const xSide of [-bridgeWidth / 2 + 0.035, bridgeWidth / 2 - 0.035]) {
            const postCount = 5;
            for (let p = 0; p < postCount; p++) {
                const pt = p / (postCount - 1);
                const py = archBase + (4 * pt * (1 - pt)) * (archPeak - archBase) + 0.16;
                const pz = (pt - 0.5) * (bridgeLen * 0.90);

                const postMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, 0.06), railMat);
                postMesh.position.set(xSide, py, pz);
                postMesh.castShadow = true;
                deckGroup.add(postMesh);

                // Brass Giboshi finial atop each newel post
                const finial = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), finialMat);
                finial.position.set(xSide, py + 0.18, pz);
                deckGroup.add(finial);
                const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), finialMat);
                finialBall.position.set(xSide, py + 0.15, pz);
                deckGroup.add(finialBall);
            }

            // Top curved handrail beam
            const railMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, bridgeLen * 0.92), railMat);
            railMesh.position.set(xSide, archPeak + 0.30, 0);
            deckGroup.add(railMesh);
        }

        if (isEastWest) {
            deckGroup.rotation.y = Math.PI / 2;
        }

        bridgeGroup.add(deckGroup);
        return bridgeGroup;
    }
}
