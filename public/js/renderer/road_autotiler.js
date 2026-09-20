// Project Meiji - Road Autotiling & Bitmask Geometry Builder
// ponytail: 4-way orthogonal bitmask, stone paving (Ishidatami) & procedural commercial telegraph poles

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RoadTextureManager } from './road_texture.js';
import { TelegraphRenderer } from './telegraphRenderer.js';

export class RoadAutotiler {
    static buildRoadMesh(x, y, grid) {
        const s = CONFIG.TILE_SIZE;
        const group = new THREE.Group();

        const currentTile = grid.getTile(x, y);
        const isStone = currentTile && currentTile.roadTier === 2;

        const isRoad = (tx, ty) => {
            const t = grid.getTile(tx, ty);
            return grid.isRoadTile ? grid.isRoadTile(t) : (t && t.type === CONFIG.TYPES.ROAD);
        };

        const north = isRoad(x, y - 1);
        const south = isRoad(x, y + 1);
        const east = isRoad(x + 1, y);
        const west = isRoad(x - 1, y);

        const roadMat = isStone ? RoadTextureManager.getStoneRoadMaterial() : RoadTextureManager.getDirtRoadMaterial();
        const shoulderMat = isStone ? RoadTextureManager.getStoneShoulderMaterial() : RoadTextureManager.getDirtShoulderMaterial();

        const trackWidth = s * 0.58;
        const trackHeight = isStone ? 0.06 : 0.05;
        const shoulderWidth = s * 0.82;
        const shoulderHeight = 0.02;

        // 1. Straight North-South continuous stretch
        if (north && south && !east && !west) {
            const trackGeo = new THREE.BoxGeometry(trackWidth, trackHeight, s);
            const trackMesh = new THREE.Mesh(trackGeo, roadMat);
            trackMesh.position.set(0, trackHeight / 2 + 0.01, 0);
            trackMesh.receiveShadow = true;
            group.add(trackMesh);

            const shoulderGeo = new THREE.BoxGeometry(shoulderWidth, shoulderHeight, s);
            const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
            shoulderMesh.position.set(0, shoulderHeight / 2 + 0.005, 0);
            shoulderMesh.receiveShadow = true;
            group.add(shoulderMesh);

            if (isStone) {
                this.addStoneCurbs(group, trackWidth, s, true);
            }
            this.maybeAddTelegraphPole(group, x, y, grid, 'NS', trackWidth, s);
            return group;
        }

        // 2. Straight East-West continuous stretch
        if (!north && !south && east && west) {
            const trackGeo = new THREE.BoxGeometry(s, trackHeight, trackWidth);
            const trackMesh = new THREE.Mesh(trackGeo, roadMat);
            trackMesh.position.set(0, trackHeight / 2 + 0.01, 0);
            trackMesh.receiveShadow = true;
            group.add(trackMesh);

            const shoulderGeo = new THREE.BoxGeometry(s, shoulderHeight, shoulderWidth);
            const shoulderMesh = new THREE.Mesh(shoulderGeo, shoulderMat);
            shoulderMesh.position.set(0, shoulderHeight / 2 + 0.005, 0);
            shoulderMesh.receiveShadow = true;
            group.add(shoulderMesh);

            if (isStone) {
                this.addStoneCurbs(group, trackWidth, s, false);
            }
            this.maybeAddTelegraphPole(group, x, y, grid, 'EW', trackWidth, s);
            return group;
        }

        // 3. 4-Way Cross Intersection
        if (north && south && east && west) {
            const centerTrackGeo = new THREE.BoxGeometry(trackWidth, trackHeight, trackWidth);
            const centerTrack = new THREE.Mesh(centerTrackGeo, roadMat);
            centerTrack.position.set(0, trackHeight / 2 + 0.01, 0);
            centerTrack.receiveShadow = true;
            group.add(centerTrack);

            const centerShoulderGeo = new THREE.BoxGeometry(shoulderWidth, shoulderHeight, shoulderWidth);
            const centerShoulder = new THREE.Mesh(centerShoulderGeo, shoulderMat);
            centerShoulder.position.set(0, shoulderHeight / 2 + 0.005, 0);
            centerShoulder.receiveShadow = true;
            group.add(centerShoulder);

            const armLen = (s - trackWidth) / 2;
            const shArmLen = (s - shoulderWidth) / 2;

            this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'N');
            this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'S');
            this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'E');
            this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'W');

            if (isStone) {
                this.maybeAddIntersectionLantern(group, trackWidth, s, x, y);
            }
            return group;
        }

        // 4. Default / Turn / T-Junction / Stub / Isolated Tile
        const centerTrack = new THREE.Mesh(new THREE.BoxGeometry(trackWidth, trackHeight, trackWidth), roadMat);
        centerTrack.position.set(0, trackHeight / 2 + 0.01, 0);
        centerTrack.receiveShadow = true;
        group.add(centerTrack);

        const centerShoulder = new THREE.Mesh(new THREE.BoxGeometry(shoulderWidth, shoulderHeight, shoulderWidth), shoulderMat);
        centerShoulder.position.set(0, shoulderHeight / 2 + 0.005, 0);
        centerShoulder.receiveShadow = true;
        group.add(centerShoulder);

        const armLen = (s - trackWidth) / 2;
        const shArmLen = (s - shoulderWidth) / 2;

        if (north) this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'N');
        if (south) this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'S');
        if (east) this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'E');
        if (west) this.addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, 'W');

        // Add street lantern at stone 3-way T-junctions
        const roadConnections = (north ? 1 : 0) + (south ? 1 : 0) + (east ? 1 : 0) + (west ? 1 : 0);
        if (isStone && roadConnections >= 3) {
            this.maybeAddIntersectionLantern(group, trackWidth, s, x, y);
        }

        return group;
    }

    static addArm(group, roadMat, shoulderMat, trackWidth, trackHeight, shoulderWidth, shoulderHeight, armLen, shArmLen, dir) {
        let tGeo, sGeo, tPos, sPos;
        if (dir === 'N') {
            tGeo = new THREE.BoxGeometry(trackWidth, trackHeight, armLen);
            sGeo = new THREE.BoxGeometry(shoulderWidth, shoulderHeight, shArmLen);
            tPos = [0, trackHeight / 2 + 0.01, -(trackWidth / 2 + armLen / 2)];
            sPos = [0, shoulderHeight / 2 + 0.005, -(shoulderWidth / 2 + shArmLen / 2)];
        } else if (dir === 'S') {
            tGeo = new THREE.BoxGeometry(trackWidth, trackHeight, armLen);
            sGeo = new THREE.BoxGeometry(shoulderWidth, shoulderHeight, shArmLen);
            tPos = [0, trackHeight / 2 + 0.01, trackWidth / 2 + armLen / 2];
            sPos = [0, shoulderHeight / 2 + 0.005, shoulderWidth / 2 + shArmLen / 2];
        } else if (dir === 'E') {
            tGeo = new THREE.BoxGeometry(armLen, trackHeight, trackWidth);
            sGeo = new THREE.BoxGeometry(shArmLen, shoulderHeight, shoulderWidth);
            tPos = [trackWidth / 2 + armLen / 2, trackHeight / 2 + 0.01, 0];
            sPos = [shoulderWidth / 2 + shArmLen / 2, shoulderHeight / 2 + 0.005, 0];
        } else {
            tGeo = new THREE.BoxGeometry(armLen, trackHeight, trackWidth);
            sGeo = new THREE.BoxGeometry(shArmLen, shoulderHeight, shoulderWidth);
            tPos = [-(trackWidth / 2 + armLen / 2), trackHeight / 2 + 0.01, 0];
            sPos = [-(shoulderWidth / 2 + shArmLen / 2), shoulderHeight / 2 + 0.005, 0];
        }

        const tMesh = new THREE.Mesh(tGeo, roadMat);
        tMesh.position.set(...tPos);
        tMesh.receiveShadow = true;
        group.add(tMesh);

        const sMesh = new THREE.Mesh(sGeo, shoulderMat);
        sMesh.position.set(...sPos);
        sMesh.receiveShadow = true;
        group.add(sMesh);
    }

    // Add Granite Curbs for Tier 2 Stone Roads
    static addStoneCurbs(group, trackWidth, s, isNS) {
        const curbMat = RoadTextureManager.getStoneKerbMaterial();
        const curbWidth = 0.04;
        const curbHeight = 0.07;

        if (isNS) {
            const curbGeo = new THREE.BoxGeometry(curbWidth, curbHeight, s);
            const left = new THREE.Mesh(curbGeo, curbMat);
            left.position.set(-trackWidth / 2, curbHeight / 2 + 0.01, 0);
            const right = new THREE.Mesh(curbGeo, curbMat);
            right.position.set(trackWidth / 2, curbHeight / 2 + 0.01, 0);
            group.add(left);
            group.add(right);
        } else {
            const curbGeo = new THREE.BoxGeometry(s, curbHeight, curbWidth);
            const top = new THREE.Mesh(curbGeo, curbMat);
            top.position.set(0, curbHeight / 2 + 0.01, -trackWidth / 2);
            const bottom = new THREE.Mesh(curbGeo, curbMat);
            bottom.position.set(0, curbHeight / 2 + 0.01, trackWidth / 2);
            group.add(top);
            group.add(bottom);
        }
    }

    // Procedural Telegraph Poles (電信柱 / Denshin) along Commercial Thoroughfares
    // ponytail: authentic Meiji timber pole with broad T-crossarm, diagonal braces & glazed porcelain insulators
    static maybeAddTelegraphPole(group, x, y, grid, orientation, trackWidth, s) {
        const currentTile = grid.getTile(x, y);
        let hasTelegraph = currentTile && currentTile.hasTelegraph;

        if (!hasTelegraph) {
            const neighbors = [
                { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 }
            ];
            for (const d of neighbors) {
                const t = grid.getTile(x + d.dx, y + d.dy);
                if (t && t.type === CONFIG.TYPES.ZONE && t.zoneType === CONFIG.ZONES.COMMERCIAL) {
                    hasTelegraph = true;
                    break;
                }
            }
        }
        if (!hasTelegraph) return;

        // Space poles every 2 tiles for historical spacing
        if ((x + y) % 2 !== 0) return;

        TelegraphRenderer.attachToRoad(group, orientation, trackWidth, s);
    }

    // Traditional Meiji Wooden Street Lantern Post (街灯 / Chōchin-Gaitō) at Stone Intersections
    static maybeAddIntersectionLantern(group, trackWidth, s, tileX = 0, tileY = 0) {
        const lanternGroup = new THREE.Group();
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x3a2c20 });

        // Slender wooden cedar post (1.35m)
        const postGeo = new THREE.CylinderGeometry(0.025, 0.035, 1.35, 6);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.y = 0.675;
        post.castShadow = true;
        lanternGroup.add(post);

        // Wooden cross-cap bracket
        const capGeo = new THREE.BoxGeometry(0.24, 0.04, 0.24);
        const cap = new THREE.Mesh(capGeo, woodMat);
        cap.position.y = 1.38;
        lanternGroup.add(cap);

        // Shoji paper lantern core with emissive night glow capability
        const paperMat = new THREE.MeshStandardMaterial({
            color: 0xffeedd,
            roughness: 0.9,
            emissive: new THREE.Color(0x000000),
            emissiveIntensity: 0.0,
        });
        const paperGeo = new THREE.BoxGeometry(0.16, 0.20, 0.16);
        const paperCore = new THREE.Mesh(paperGeo, paperMat);
        paperCore.position.y = 1.25;
        lanternGroup.add(paperCore);

        // Localized warm point light (activated at twilight/night)
        const lanternLight = new THREE.PointLight(0xff9e4a, 0.0, 5.0);
        lanternLight.position.set(0, 1.25, 0);
        lanternGroup.add(lanternLight);

        // Tag lantern for night/day ambience & electric power arc lighting updates
        lanternGroup.userData = {
            isLantern: true,
            material: paperMat,
            light: lanternLight,
            tileX,
            tileY
        };

        // Position on corner curb
        const cornerOffset = trackWidth / 2 + 0.14;
        lanternGroup.position.set(cornerOffset, 0, cornerOffset);
        group.add(lanternGroup);
    }
}
