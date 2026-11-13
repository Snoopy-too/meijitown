// Project Meiji - Canal & Taiko-bashi Bridge Mesh Generator (canal_mesh.js)
// Phase 3 /artisan: True Recessed Ishigaki Trench (y = -0.18), Battered Retaining Walls, Corner Bastions, Quay Steps & Parabolic Taiko-bashi Bridge

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { WaterShaderSystem } from './waterShader.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';

export class CanalMesh {
    static BED_LEVEL = -0.18;
    static WATER_LEVEL = -0.06;
    static ARCH_BASE = 0.055;
    static ARCH_PEAK = 0.265;

    static evalBridgeArchY(t) {
        const clamped = Math.max(0, Math.min(1, t));
        return this.ARCH_BASE + 4 * clamped * (1 - clamped) * (this.ARCH_PEAK - this.ARCH_BASE);
    }

    static evalBridgeArchSlope(t, bridgeLen = CONFIG.TILE_SIZE * 1.04) {
        const clamped = Math.max(0, Math.min(1, t));
        const dyDt = 4 * (1 - 2 * clamped) * (this.ARCH_PEAK - this.ARCH_BASE);
        return dyDt / bridgeLen;
    }

    static getBedMaterial() {
        if (!this._bedMaterial) {
            this._bedMaterial = new THREE.MeshStandardMaterial({ color: 0x141f1d, roughness: 0.96, metalness: 0.02 });
        }
        return this._bedMaterial;
    }

    static getMossMaterial() {
        if (!this._mossMaterial) {
            this._mossMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4228, roughness: 0.92, metalness: 0.02 });
        }
        return this._mossMaterial;
    }

    static getWaterNormalMap() {
        if (!this._waterNormalMap && typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            if (ctx && typeof ctx.createImageData === 'function') {
                const img = ctx.createImageData(128, 128);
                const d = img.data;
                for (let y = 0; y < 128; y++) {
                    for (let x = 0; x < 128; x++) {
                        const u = (x / 128) * Math.PI * 2;
                        const v = (y / 128) * Math.PI * 2;
                        const nx = Math.cos(u * 3 + Math.sin(v * 2)) * 0.38
                            + Math.sin(u * 6 - v * 4) * 0.22
                            + Math.cos(u * 9 + v * 7) * 0.10;
                        const ny = Math.sin(v * 4 + Math.cos(u * 2)) * 0.38
                            + Math.cos(v * 6 + u * 3) * 0.22
                            + Math.sin(v * 10 - u * 5) * 0.10;
                        const idx = (y * 128 + x) * 4;
                        d[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
                        d[idx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
                        d[idx + 2] = 238;
                        d[idx + 3] = 255;
                    }
                }
                ctx.putImageData(img, 0, 0);
                const tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                if (tex.repeat) tex.repeat.set(2, 2);
                this._waterNormalMap = tex;
            }
        }
        return this._waterNormalMap || null;
    }

    static getIshigakiNormalMap() {
        if (!this._ishigakiNormalMap && typeof document !== 'undefined') {
            const size = 128;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (ctx && typeof ctx.createImageData === 'function') {
                const img = ctx.createImageData(size, size);
                const d = img.data;
                const rows = 4;
                const cols = 3;
                const rowH = size / rows;
                const colW = size / cols;
                for (let y = 0; y < size; y++) {
                    const r = Math.floor(y / rowH);
                    const ry = y % rowH;
                    const xOff = (r % 2) * (colW * 0.5);
                    for (let x = 0; x < size; x++) {
                        const cx = (x + xOff) % colW;
                        const minEdge = Math.min(cx, colW - cx, ry, rowH - ry);
                        let nx = 0, ny = 0, nz = 1;
                        if (minEdge < 4) {
                            const t = minEdge / 4;
                            if (minEdge === cx) nx = -(1 - t) * 0.75;
                            else if (minEdge === colW - cx) nx = (1 - t) * 0.75;
                            if (minEdge === ry) ny = (1 - t) * 0.75;
                            else if (minEdge === rowH - ry) ny = -(1 - t) * 0.75;
                            nz = 0.55;
                        } else {
                            const grain = Math.sin(x * 19.1 + y * 47.3) * 0.14;
                            nx = grain;
                            ny = Math.cos(x * 31.7 - y * 13.9) * 0.14;
                        }
                        const len = Math.hypot(nx, ny, nz) || 1;
                        const idx = (y * size + x) * 4;
                        d[idx] = Math.floor(((nx / len) * 0.5 + 0.5) * 255);
                        d[idx + 1] = Math.floor(((ny / len) * 0.5 + 0.5) * 255);
                        d[idx + 2] = Math.floor(((nz / len) * 0.5 + 0.5) * 255);
                        d[idx + 3] = 255;
                    }
                }
                ctx.putImageData(img, 0, 0);
                const tex = new THREE.CanvasTexture(canvas);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                if (tex.repeat) tex.repeat.set(3, 1);
                this._ishigakiNormalMap = tex;
            }
        }
        return this._ishigakiNormalMap || null;
    }

    static getWaterMaterial() {
        if (!this._waterMaterial) {
            this._waterMaterial = WaterShaderSystem.getCanalMaterial();
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
            const pbr = PBRTextureGenerator.getIshigakiSet();
            const normalMap = pbr.normalMap || this.getIshigakiNormalMap();
            const opts = {
                color: pbr.map ? 0xffffff : 0x5c5750,
                roughness: 0.80,
                metalness: 0.06,
                envMapIntensity: 0.72
            };
            if (pbr.map) opts.map = pbr.map;
            if (pbr.roughnessMap) opts.roughnessMap = pbr.roughnessMap;
            if (normalMap) {
                opts.normalMap = normalMap;
                opts.normalScale = new THREE.Vector2(0.75, 0.75);
            }
            this._stoneMaterial = new THREE.MeshStandardMaterial(opts);
            this._stoneMaterial.userData = { isSharedLibraryMaterial: true };
        }
        return this._stoneMaterial;
    }

    static disposeAll() {
        this._stoneMaterial?.dispose?.();
        this._bedMaterial?.dispose?.();
        this._waterNormalMap?.dispose?.();
        this._stoneMaterial = null;
        this._waterMaterial = null;
        this._bedMaterial = null;
        this._waterNormalMap = null;
    }

    static getCopingMaterial() {
        if (!this._copingMaterial) {
            this._copingMaterial = new THREE.MeshStandardMaterial({ color: 0x807b73, roughness: 0.72, metalness: 0.07 });
        }
        return this._copingMaterial;
    }

    static getIronMaterial() {
        if (!this._ironMaterial) {
            this._ironMaterial = new THREE.MeshStandardMaterial({ color: 0x232629, roughness: 0.52, metalness: 0.75 });
        }
        return this._ironMaterial;
    }

    static getWoodBridgeMaterial() {
        if (!this._woodBridgeMaterial) {
            this._woodBridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x6e4e32, roughness: 0.78, metalness: 0.04 });
        }
        return this._woodBridgeMaterial;
    }

    static getWoodPostMaterial() {
        if (!this._woodPostMaterial) {
            this._woodPostMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3421, roughness: 0.80, metalness: 0.05 });
        }
        return this._woodPostMaterial;
    }

    static getStoneBridgeMaterial() {
        if (!this._stoneBridgeMaterial) {
            this._stoneBridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x88847d, roughness: 0.72, metalness: 0.06 });
        }
        return this._stoneBridgeMaterial;
    }

    static getStonePostMaterial() {
        if (!this._stonePostMaterial) {
            this._stonePostMaterial = new THREE.MeshStandardMaterial({ color: 0x65615a, roughness: 0.76, metalness: 0.06 });
        }
        return this._stonePostMaterial;
    }

    static getFinialMaterial() {
        if (!this._finialMaterial) {
            this._finialMaterial = new THREE.MeshStandardMaterial({ color: 0xc2a24a, metalness: 0.82, roughness: 0.24 });
        }
        return this._finialMaterial;
    }

    static getRippleMaterial() {
        if (!this._rippleMaterial) {
            this._rippleMaterial = new THREE.MeshStandardMaterial({
                color: 0x86dce8,
                emissive: 0x16505c,
                roughness: 0.10,
                metalness: 0.14,
                transparent: true,
                opacity: 0.34
            });
        }
        return this._rippleMaterial;
    }

    // Creates the complete Canal mesh including recessed trench bed, battered Ishigaki embankments, quay landings, and bridge
    static createCanalMesh(tile, grid) {
        const group = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const bedY = this.BED_LEVEL;     // -0.18m recessed below street grade
        const waterY = this.WATER_LEVEL; // -0.06m recessed water surface

        // 1. Recessed Canal Silt Bed & Submerged River Stones (y = -0.18)
        const bedGeo = new THREE.PlaneGeometry(s * 1.01, s * 1.01);
        bedGeo.rotateX(-Math.PI / 2);
        const bedMesh = new THREE.Mesh(bedGeo, this.getBedMaterial());
        bedMesh.position.y = bedY;
        bedMesh.receiveShadow = true;
        group.add(bedMesh);

        // Submerged river cobbles resting on the silt bed (visible through translucent water)
        const stoneMat = this.getStoneMaterial();
        const seed = Math.abs(Math.sin((tile.x || 1) * 17.3 + (tile.y || 1) * 31.7));
        for (let c = 0; c < 3; c++) {
            const cx = ((seed * (c + 1) * 7.13) % 0.9) - 0.45;
            const cz = ((seed * (c + 2) * 11.37) % 0.9) - 0.45;
            const cobble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.055 + (c * 0.015), 0), stoneMat);
            cobble.scale.set(1.2, 0.45, 1.0);
            cobble.position.set(cx * s, bedY + 0.015, cz * s);
            group.add(cobble);
        }

        // 2. Recessed Reflective Water Surface (y = -0.06) using photorealistic GLSL WaterShaderSystem
        const waterGeo = new THREE.PlaneGeometry(s * 1.004, s * 1.004, 8, 8);
        waterGeo.rotateX(-Math.PI / 2);
        const waterMesh = new THREE.Mesh(waterGeo, this.getWaterMaterial());
        waterMesh.position.y = waterY;
        waterMesh.renderOrder = 1;
        waterMesh.receiveShadow = true;
        group.add(waterMesh);

        // 3. Battered Ishigaki Stone Embankment Walls descending from street level (+0.11m) into the canal bed (-0.18m)
        const neighbors = [
            { dx: 0, dy: -1, edge: 'N' },
            { dx: 0, dy: 1,  edge: 'S' },
            { dx: 1, dy: 0,  edge: 'E' },
            { dx: -1, dy: 0, edge: 'W' },
        ];

        const wallMat = this.getStoneMaterial();
        const copingMat = this.getCopingMaterial();
        const mossMat = this.getMossMaterial();
        const ironMat = this.getIronMaterial();
        const wallThick = 0.15;
        const wallTopY = 0.11;
        const wallH = wallTopY - bedY; // 0.29m full vertical embankment height
        const wallCenterY = (wallTopY + bedY) / 2;

        let bridgeIsEastWest = false;
        if (tile.hasBridge && grid) {
            const east = grid.getTile(tile.x + 1, tile.y);
            const west = grid.getTile(tile.x - 1, tile.y);
            const isRoad = t => t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge));
            if (isRoad(east) || isRoad(west)) bridgeIsEastWest = true;
        }

        const isCanalAt = (dx, dy) => {
            if (!grid || !grid.isValidCoord(tile.x + dx, tile.y + dy)) return false;
            const nt = grid.getTile(tile.x + dx, tile.y + dy);
            return Boolean(nt && nt.type === CONFIG.TYPES.CANAL);
        };

        for (const n of neighbors) {
            const isCanalNeighbor = isCanalAt(n.dx, n.dy);
            if (!isCanalNeighbor) {
                const isBridgeApproach = tile.hasBridge && (
                    (bridgeIsEastWest && (n.edge === 'E' || n.edge === 'W')) ||
                    (!bridgeIsEastWest && (n.edge === 'N' || n.edge === 'S'))
                );

                let w = s, d = wallThick, px = 0, pz = 0;
                if (n.edge === 'N') { pz = -s / 2 + wallThick / 2; }
                else if (n.edge === 'S') { pz = s / 2 - wallThick / 2; }
                else if (n.edge === 'E') { px = s / 2 - wallThick / 2; w = wallThick; d = s; }
                else if (n.edge === 'W') { px = -s / 2 + wallThick / 2; w = wallThick; d = s; }

                // Lower submerged & battered Ishigaki retaining wall always seals the earth cut
                const effH = isBridgeApproach ? (0.04 - bedY) : wallH;
                const effCenterY = isBridgeApproach ? (0.04 + bedY) / 2 : wallCenterY;
                const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(w, effH, d), wallMat);
                wallMesh.position.set(px, effCenterY, pz);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                group.add(wallMesh);

                // Sloped lower masonry toe (Musha-gaeshi batter flare at water level)
                const toeInward = 0.035;
                const toeW = (n.edge === 'N' || n.edge === 'S') ? w : wallThick + toeInward * 2;
                const toeD = (n.edge === 'N' || n.edge === 'S') ? wallThick + toeInward * 2 : d;
                const toeMesh = new THREE.Mesh(new THREE.BoxGeometry(toeW, 0.14, toeD), mossMat);
                toeMesh.position.set(px, bedY + 0.07, pz);
                toeMesh.receiveShadow = true;
                group.add(toeMesh);

                if (!isBridgeApproach) {
                    // Dressed granite coping slab along top of embankment
                    const copingMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.032, d + 0.02), copingMat);
                    copingMesh.position.set(px, wallTopY + 0.016, pz);
                    copingMesh.castShadow = true;
                    copingMesh.receiveShadow = true;
                    group.add(copingMesh);

                    // Wrought-iron barge mooring ring embedded in stone wall
                    const ringOffsetZ = n.edge === 'N' ? pz + wallThick * 0.52 : (n.edge === 'S' ? pz - wallThick * 0.52 : pz);
                    const ringOffsetX = n.edge === 'W' ? px + wallThick * 0.52 : (n.edge === 'E' ? px - wallThick * 0.52 : px);
                    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 6), ironMat);
                    ring.position.set(ringOffsetX, 0.03, ringOffsetZ);
                    group.add(ring);

                    // Stepped stone Kashi (河岸) water-landing stairs when bordering commercial/service tiles
                    const adjTile = grid ? grid.getTile(tile.x + n.dx, tile.y + n.dy) : null;
                    if (adjTile && (adjTile.zoneType === CONFIG.ZONES.COMMERCIAL || adjTile.type === CONFIG.TYPES.SERVICE)) {
                        for (let st = 0; st < 3; st++) {
                            const stepY = wallTopY - (st + 1) * 0.05;
                            const stepIn = (st + 1) * 0.04;
                            const sx = px + (n.edge === 'W' ? stepIn : (n.edge === 'E' ? -stepIn : 0));
                            const sz = pz + (n.edge === 'N' ? stepIn : (n.edge === 'S' ? -stepIn : 0));
                            const stepW = (n.edge === 'N' || n.edge === 'S') ? 0.36 : wallThick;
                            const stepD = (n.edge === 'N' || n.edge === 'S') ? wallThick : 0.36;
                            const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, 0.045, stepD), copingMat);
                            stepMesh.position.set(sx, stepY, sz);
                            stepMesh.castShadow = true;
                            group.add(stepMesh);
                        }
                    }
                }
            }
        }

        // 4. Corner Stone Quoins / Bastions at diagonal inner corners so turns never expose raw ground
        const corners = [
            { dx: -1, dy: -1, cx: -s / 2 + wallThick / 2, cz: -s / 2 + wallThick / 2 },
            { dx: 1,  dy: -1, cx: s / 2 - wallThick / 2,  cz: -s / 2 + wallThick / 2 },
            { dx: -1, dy: 1,  cx: -s / 2 + wallThick / 2, cz: s / 2 - wallThick / 2 },
            { dx: 1,  dy: 1,  cx: s / 2 - wallThick / 2,  cz: s / 2 - wallThick / 2 },
        ];
        for (const c of corners) {
            if (!isCanalAt(c.dx, c.dy)) {
                const bastion = new THREE.Mesh(new THREE.BoxGeometry(wallThick * 1.08, wallH + 0.03, wallThick * 1.08), copingMat);
                bastion.position.set(c.cx, wallCenterY + 0.015, c.cz);
                bastion.castShadow = true;
                bastion.receiveShadow = true;
                group.add(bastion);
            }
        }

        // 5. Arched Bridge (Taiko-bashi) if road intersects canal
        if (tile.hasBridge) {
            group.add(this.createBridgeMesh(tile, grid));
        }

        return group;
    }

    // Auto-detect bridge orientation and spawn authentic parabolic Taiko-bashi drum bridge with submerged piers
    static createBridgeMesh(tile, grid) {
        const bridgeGroup = new THREE.Group();
        const s = CONFIG.TILE_SIZE;
        const isStone = tile.roadTier === 2;
        const bedY = this.BED_LEVEL;

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
        const bridgeWidth = s * 0.58; // Matches RoadAutotiler trackWidth (1.16m) for seamless road-to-bridge join!
        const segments = 8;

        const deckGroup = new THREE.Group();
        const evalY = (t) => this.evalBridgeArchY(t);

        // 1. Deep Stepped Granite Approach Abutments descending into the canal bed & meeting road curbs
        for (const endZ of [-bridgeLen * 0.46, bridgeLen * 0.46]) {
            const abutH = (this.ARCH_BASE + 0.02) - bedY;
            const abut = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth + 0.14, abutH, 0.18), stoneMat);
            abut.position.set(0, bedY + abutH / 2, endZ);
            abut.castShadow = true;
            abut.receiveShadow = true;
            deckGroup.add(abut);

            // Sloped approach threshold ramp tying into road surface (y = 0.05)
            const rampZ = endZ > 0 ? endZ + 0.07 : endZ - 0.07;
            const ramp = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth, 0.055, 0.12), deckMat);
            ramp.position.set(0, 0.032, rampZ);
            ramp.receiveShadow = true;
            deckGroup.add(ramp);
        }

        // 1b. Submerged Timber/Stone Bridge Trestle Piers (Hashira-bashira) grounded in canal bed
        for (const pierT of [0.25, 0.75]) {
            const pz = (pierT - 0.5) * bridgeLen;
            const archY = evalY(pierT) - 0.04;
            const pierH = archY - bedY;
            for (const px of [-bridgeWidth * 0.36, bridgeWidth * 0.36]) {
                const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, pierH, 8), railMat);
                pier.position.set(px, bedY + pierH / 2, pz);
                pier.castShadow = true;
                deckGroup.add(pier);
            }
            // Cross-bracing collar beam just above water level
            const brace = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth * 0.80, 0.04, 0.045), railMat);
            brace.position.set(0, this.WATER_LEVEL + 0.06, pz);
            deckGroup.add(brace);
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
            const plank = new THREE.Mesh(new THREE.BoxGeometry(bridgeWidth, 0.058, spanLen * 1.05), deckMat);
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
