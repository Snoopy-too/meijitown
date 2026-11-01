// Project Meiji - Canal & Taiko-bashi Bridge Mesh Generator (canal_mesh.js)
// Phase 3 /artisan: PBR Ishigaki Embankments, Animated Normal-Mapped Water & True Parabolic Taiko-bashi Arch Bridge (< 350 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class CanalMesh {
    static getBedMaterial() {
        if (!this._bedMaterial) {
            this._bedMaterial = new THREE.MeshStandardMaterial({ color: 0x182422, roughness: 0.95, metalness: 0.02 });
        }
        return this._bedMaterial;
    }

    static getWaterNormalMap() {
        if (!this._waterNormalMap && typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = ctx.createImageData(128, 128);
                const d = img.data;
                for (let y = 0; y < 128; y++) {
                    for (let x = 0; x < 128; x++) {
                        const u = (x / 128) * Math.PI * 2;
                        const v = (y / 128) * Math.PI * 2;
                        const nx = Math.cos(u * 3 + Math.sin(v * 2)) * 0.35 + Math.sin(u * 5 - v * 3) * 0.20;
                        const ny = Math.sin(v * 4 + Math.cos(u * 2)) * 0.35 + Math.cos(v * 6 + u * 2) * 0.20;
                        const idx = (y * 128 + x) * 4;
                        d[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
                        d[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
                        d[idx + 2] = 235;
                        d[idx + 3] = 255;
                    }
                }
                ctx.putImageData(img, 0, 0);
                const tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                if ( tex.repeat ) tex.repeat.set(2, 2);
                this._waterNormalMap = tex;
            }
        }
        return this._waterNormalMap || null;
    }

    static getWaterMaterial() {
        if (!this._waterMaterial) {
            const normalMap = this.getWaterNormalMap();
            const opts = {
                color: 0x227888,       // Luminous historical Japanese canal turquoise (Aoi-mizu)
                emissive: 0x072b33,    // Subtle inner water luminescence
                roughness: 0.08,       // Glossy specular water sheen
                metalness: 0.18,
                transparent: true,
                opacity: 0.90,
            };
            if (normalMap) {
                opts.normalMap = normalMap;
                opts.normalScale = new THREE.Vector2(0.28, 0.28);
            }
            this._waterMaterial = new THREE.MeshStandardMaterial(opts);
        }
        return this._waterMaterial;
    }

    static updateWater(delta = 0.016) {
        if (this._waterNormalMap && this._waterNormalMap.offset) {
            this._waterNormalMap.offset.x = (this._waterNormalMap.offset.x + delta * 0.08) % 1.0;
            this._waterNormalMap.offset.y = (this._waterNormalMap.offset.y + delta * 0.05) % 1.0;
        }
    }

    static getStoneMaterial() {
        if (!this._stoneMaterial) {
            this._stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x5e5952, roughness: 0.86, metalness: 0.05 });
        }
        return this._stoneMaterial;
    }

    static getCopingMaterial() {
        if (!this._copingMaterial) {
            this._copingMaterial = new THREE.MeshStandardMaterial({ color: 0x7c7870, roughness: 0.76, metalness: 0.06 });
        }
        return this._copingMaterial;
    }

    static getIronMaterial() {
        if (!this._ironMaterial) {
            this._ironMaterial = new THREE.MeshStandardMaterial({ color: 0x26292b, roughness: 0.65, metalness: 0.65 });
        }
        return this._ironMaterial;
    }

    static getWoodBridgeMaterial() {
        if (!this._woodBridgeMaterial) {
            this._woodBridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x6e4e32, roughness: 0.80, metalness: 0.04 });
        }
        return this._woodBridgeMaterial;
    }

    static getWoodPostMaterial() {
        if (!this._woodPostMaterial) {
            this._woodPostMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3421, roughness: 0.82, metalness: 0.05 });
        }
        return this._woodPostMaterial;
    }

    static getStoneBridgeMaterial() {
        if (!this._stoneBridgeMaterial) {
            this._stoneBridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x88847d, roughness: 0.74, metalness: 0.06 });
        }
        return this._stoneBridgeMaterial;
    }

    static getStonePostMaterial() {
        if (!this._stonePostMaterial) {
            this._stonePostMaterial = new THREE.MeshStandardMaterial({ color: 0x65615a, roughness: 0.78, metalness: 0.06 });
        }
        return this._stonePostMaterial;
    }

    static getFinialMaterial() {
        if (!this._finialMaterial) {
            this._finialMaterial = new THREE.MeshStandardMaterial({ color: 0xb59846, metalness: 0.75, roughness: 0.28 });
        }
        return this._finialMaterial;
    }

    static getRippleMaterial() {
        if (!this._rippleMaterial) {
            this._rippleMaterial = new THREE.MeshStandardMaterial({
                color: 0x76d4e3,
                emissive: 0x1a5c68,
                roughness: 0.12,
                metalness: 0.10,
                transparent: true,
                opacity: 0.38
            });
        }
        return this._rippleMaterial;
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

        // Sculpted water current shimmer streaks
        const rippleMat = this.getRippleMaterial();
        for (const [rx, rz, rw, rl] of [[-0.18, -0.14, 0.44, 0.032], [0.20, 0.16, 0.36, 0.028], [-0.04, 0.24, 0.28, 0.024]]) {
            const rip = new THREE.Mesh(new THREE.BoxGeometry(s * rw, 0.002, rl), rippleMat);
            rip.position.set(s * rx, 0.040, s * rz);
            group.add(rip);
        }

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

        let bridgeIsEastWest = false;
        if (tile.hasBridge && grid) {
            const east = grid.getTile(tile.x + 1, tile.y);
            const west = grid.getTile(tile.x - 1, tile.y);
            const isRoad = t => t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge));
            if (isRoad(east) || isRoad(west)) bridgeIsEastWest = true;
        }

        for (const n of neighbors) {
            if (tile.hasBridge) {
                if (bridgeIsEastWest && (n.edge === 'E' || n.edge === 'W')) continue;
                if (!bridgeIsEastWest && (n.edge === 'N' || n.edge === 'S')) continue;
            }

            const nt = grid ? grid.getTile(tile.x + n.dx, tile.y + n.dy) : null;
            const isCanalNeighbor = nt && nt.type === CONFIG.TYPES.CANAL;
            if (!isCanalNeighbor) {
                let w = s, d = wallThick, px = 0, pz = 0;
                if (n.edge === 'N') { pz = -s / 2 + wallThick / 2; }
                else if (n.edge === 'S') { pz = s / 2 - wallThick / 2; }
                else if (n.edge === 'E') { px = s / 2 - wallThick / 2; w = wallThick; d = s; }
                else if (n.edge === 'W') { px = -s / 2 + wallThick / 2; w = wallThick; d = s; }

                const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
                wallMesh.position.set(px, wallH / 2 + 0.01, pz);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                group.add(wallMesh);

                const copingMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02), copingMat);
                copingMesh.position.set(px, wallH + 0.025, pz);
                copingMesh.castShadow = true;
                group.add(copingMesh);

                const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 6), ironMat);
                ring.position.set(px, wallH * 0.65, pz);
                group.add(ring);
            }
        }

        // 4. Arched Bridge (Taiko-bashi) if road intersects canal
        if (tile.hasBridge) {
            group.add(this.createBridgeMesh(tile, grid));
        }

        return group;
    }

    // Auto-detect bridge orientation and spawn authentic parabolic Taiko-bashi drum bridge
    static createBridgeMesh(tile, grid) {
        const bridgeGroup = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const isStone = tile.roadTier === 2;

        let isEastWest = false;
        if (grid) {
            const east = grid.getTile(tile.x + 1, tile.y);
            const west = grid.getTile(tile.x - 1, tile.y);
            const isRoad = t => t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge));
            if (isRoad(east) || isRoad(west)) isEastWest = true;
        }

        const deckMat = isStone ? this.getStoneBridgeMaterial() : this.getWoodBridgeMaterial();
        const railMat = isStone ? this.getStonePostMaterial() : this.getWoodPostMaterial();
        const stoneMat = this.getCopingMaterial();
        const finialMat = this.getFinialMaterial();

        const bridgeLen = s * 1.04;
        const bridgeWidth = 0.82;
        const segments = 8;
        const segLen = bridgeLen / segments;

        const deckGroup = new THREE.Group();
        const archPeak = 0.25;
        const archBase = 0.04;
        const evalY = (t) => archBase + 4 * t * (1 - t) * (archPeak - archBase);

        // 1. Stepped Granite Approach Abutments at both bridge thresholds
        for (const endZ of [-bridgeLen * 0.47, bridgeLen * 0.47]) {
            const abut = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth + 0.08, 0.09, 0.14), stoneMat);
            abut.position.set(0, 0.045, endZ);
            abut.castShadow = true;
            abut.receiveShadow = true;
            deckGroup.add(abut);
        }

        // 2. Segmented Parabolic Deck Planks, Curved Under-Arch Stringer Ribs & Cross-Joists
        for (let i = 0; i < segments; i++) {
            const t0 = i / segments, t1 = (i + 1) / segments, tm = (i + 0.5) / segments;
            const y0 = evalY(t0), y1 = evalY(t1), ym = evalY(tm);
            const z0 = (t0 - 0.5) * bridgeLen, z1 = (t1 - 0.5) * bridgeLen, zm = (tm - 0.5) * bridgeLen;
            const dz = z1 - z0, dy = y1 - y0;
            const spanLen = Math.hypot(dz, dy);
            const pitch = -Math.atan2(dy, dz);

            // Cambered deck plank
            const plank = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth, 0.06, spanLen * 1.04), deckMat);
            plank.position.set(0, ym, zm);
            plank.rotation.x = pitch;
            plank.castShadow = true;
            plank.receiveShadow = true;
            deckGroup.add(plank);

            // Twin curved under-arch structural stringer ribs following exact parabola
            for (const sideX of [-bridgeWidth / 2 + 0.055, bridgeWidth / 2 - 0.055]) {
                const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, spanLen * 1.06), railMat);
                rib.position.set(sideX, ym - 0.048, zm);
                rib.rotation.x = pitch;
                rib.castShadow = true;
                deckGroup.add(rib);
            }

            // Transverse timber/stone cross-tie joist under each joint
            if (i > 0 && i < segments) {
                const joist = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth * 0.96, 0.05, 0.055), railMat);
                joist.position.set(0, y0 - 0.04, z0);
                deckGroup.add(joist);
            }
        }

        // 3. Left & Right Parabolic Balustrades: Newel Posts, Brass Giboshi Finials & Arched Handrails
        const postCount = 5;
        const railSpanZ = bridgeLen * 0.90;
        for (const xSide of [-bridgeWidth / 2 + 0.038, bridgeWidth / 2 - 0.038]) {
            const postTops = [];
            for (let p = 0; p < postCount; p++) {
                const pt = p / (postCount - 1);
                const deckY = evalY(pt);
                const pz = (pt - 0.5) * railSpanZ;
                const postH = 0.28;

                const postMesh = new THREE.Mesh(new THREE.BoxGeometry(0.058, postH, 0.058), railMat);
                postMesh.position.set(xSide, deckY + postH / 2, pz);
                postMesh.castShadow = true;
                deckGroup.add(postMesh);

                // Brass Giboshi onion-dome finial (collar ring + bulb + spire)
                const topY = deckY + postH;
                const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.018, 8), finialMat);
                collar.position.set(xSide, topY + 0.009, pz);
                deckGroup.add(collar);

                const finialBall = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), finialMat);
                finialBall.position.set(xSide, topY + 0.032, pz);
                deckGroup.add(finialBall);

                const finialSpire = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.065, 8), finialMat);
                finialSpire.position.set(xSide, topY + 0.068, pz);
                deckGroup.add(finialSpire);

                postTops.push({ y: deckY, z: pz });
            }

            // Segmented curved top handrail (Kasagi) & middle rail (Nuki) spanning between every pair of posts
            for (let p = 0; p < postTops.length - 1; p++) {
                const a = postTops[p], b = postTops[p + 1];
                const dz = b.z - a.z, dy = b.y - a.y;
                const bayLen = Math.hypot(dz, dy) + 0.02;
                const bayPitch = -Math.atan2(dy, dz);
                const midZ = (a.z + b.z) / 2;
                const midDeckY = (a.y + b.y) / 2;

                const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.042, bayLen), railMat);
                topRail.position.set(xSide, midDeckY + 0.255, midZ);
                topRail.rotation.x = bayPitch;
                topRail.castShadow = true;
                deckGroup.add(topRail);

                const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.028, bayLen), railMat);
                midRail.position.set(xSide, midDeckY + 0.145, midZ);
                midRail.rotation.x = bayPitch;
                deckGroup.add(midRail);
            }
        }

        if (isEastWest) {
            deckGroup.rotation.y = Math.PI / 2;
        }

        bridgeGroup.add(deckGroup);
        return bridgeGroup;
    }
}
