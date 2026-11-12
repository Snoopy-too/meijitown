// Project Meiji - Canal Waterway Traffic & Takasebune Cargo Barges (canalTraffic.js)
// Phase 3 /artisan: PBR Takasebune Cargo Barges, Recessed Waterline Grounding (y = -0.06), Woven Bamboo Awning & Articulated Sendō Boatman

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CanalMesh } from './canal_mesh.js';

export class CanalTrafficManager {
    constructor(scene, gridModel, getTileWorldPosFn, modelCache = null) {
        this.scene = scene;
        this.grid = gridModel;
        this.getTileWorldPos = getTileWorldPosFn;
        this.modelCache = modelCache;

        this.barges = [];
        this.maxBarges = 2;
        this.spawnCheckTimer = 0;
        this.animTime = 0;
    }

    static getWaterElevation() {
        return typeof CanalMesh?.WATER_LEVEL === 'number' ? CanalMesh.WATER_LEVEL : -0.06;
    }

    // Authentic Meiji Takasebune (高瀬舟) river cargo barge with PBR materials & articulated Sendō
    createProceduralBargeMesh() {
        const group = new THREE.Group();
        const hullMat = new THREE.MeshStandardMaterial({ color: 0x4a3422, roughness: 0.78, metalness: 0.04 });
        const gunwaleMat = new THREE.MeshStandardMaterial({ color: 0x342316, roughness: 0.82, metalness: 0.05 });
        const bambooMat = new THREE.MeshStandardMaterial({ color: 0xc8aa64, roughness: 0.74, metalness: 0.02 });
        const strawMat = new THREE.MeshStandardMaterial({ color: 0xbfa366, roughness: 0.86, metalness: 0.0 });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.45, metalness: 0.72 });
        const wakeMat = new THREE.MeshBasicMaterial({ color: 0xdff6fa, transparent: true, opacity: 0.42 });

        // 1. Flat-bottomed Swept Timber Hull & Ribbed Thwarts
        const hull = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.055, 0.92), hullMat);
        hull.position.y = 0.022;
        hull.castShadow = true;
        hull.receiveShadow = true;
        group.add(hull);

        // Raised sweeping Prow (Bow) & Stern Transom
        const prow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.24), hullMat);
        prow.position.set(0, 0.055, 0.52);
        prow.rotation.x = -0.24;
        prow.castShadow = true;
        group.add(prow);

        const sternDeck = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.045, 0.20), hullMat);
        sternDeck.position.set(0, 0.048, -0.46);
        sternDeck.rotation.x = 0.14;
        sternDeck.castShadow = true;
        group.add(sternDeck);

        // Left and Right timber gunwale sideboards & transverse thwarts
        for (const gx of [-0.18, 0.18]) {
            const side = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.075, 0.96), gunwaleMat);
            side.position.set(gx, 0.065, 0.02);
            side.castShadow = true;
            group.add(side);
        }
        for (const tz of [-0.26, 0.26]) {
            const thwart = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.024, 0.045), gunwaleMat);
            thwart.position.set(0, 0.072, tz);
            group.add(thwart);
        }

        // 2. Woven Bamboo / Reed Cargo Canopy Awning (Tomabune / 苫舟) with bamboo ribs
        const awning = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.46, 10, 1, false, 0, Math.PI), bambooMat);
        awning.rotation.set(0, 0, -Math.PI / 2);
        awning.scale.set(0.65, 1.0, 1.0);
        awning.position.set(0, 0.12, -0.04);
        awning.castShadow = true;
        group.add(awning);

        // 3. Cargo under & ahead of awning: Bound Straw Rice Bales (Kome-dawara) & Hooped Sake Casks
        const tawaraGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.23, 8);
        tawaraGeo.rotateZ(Math.PI / 2);
        for (const [ty, tz] of [[0.072, 0.18], [0.072, 0.31], [0.145, 0.24]]) {
            const bale = new THREE.Mesh(tawaraGeo, strawMat);
            bale.position.set(0, ty, tz);
            bale.castShadow = true;
            group.add(bale);
        }

        const caskGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.095, 8);
        for (const cx of [-0.08, 0.08]) {
            const cask = new THREE.Mesh(caskGeo, gunwaleMat);
            cask.position.set(cx, 0.08, -0.04);
            group.add(cask);
        }

        // Warm bow navigation lantern (Chōchin)
        const bowPost = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.16, 5), ironMat);
        bowPost.position.set(0, 0.14, 0.58);
        group.add(bowPost);
        const bowLantern = new THREE.Mesh(
            new THREE.SphereGeometry(0.032, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xffddaa, emissive: 0xff8822, emissiveIntensity: 0.65, roughness: 0.4 })
        );
        bowLantern.name = 'Lantern_Body';
        bowLantern.position.set(0, 0.19, 0.58);
        group.add(bowLantern);

        // 4. Articulated Boatman (Sendō 船頭) at Stern with Upper/Lower Body & Poling Arms
        const coatMat = new THREE.MeshStandardMaterial({ color: 0x1f3652, roughness: 0.84 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5c29f, roughness: 0.75 });
        const boatmanGroup = new THREE.Group();
        boatmanGroup.position.set(0, 0.05, -0.36);

        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.054, 0.18, 8), coatMat);
        body.position.set(0, 0.12, 0);
        body.castShadow = true;
        boatmanGroup.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), skinMat);
        head.position.set(0, 0.24, 0);
        boatmanGroup.add(head);

        // Conical straw hat (Sugegasa)
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.05, 10), bambooMat);
        hat.position.set(0, 0.275, 0);
        hat.castShadow = true;
        boatmanGroup.add(hat);

        // Articulated Poling Arms & Long Bamboo Push-Pole (Sao 竿) reaching into the canal bed
        const polePivot = new THREE.Group();
        polePivot.position.set(0.06, 0.16, 0);
        const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.12, 6), coatMat);
        armR.rotation.x = 0.7;
        armR.position.set(0, -0.02, 0.03);
        polePivot.add(armR);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.012, 0.68, 6), bambooMat);
        pole.rotation.set(Math.PI / 3.6, 0, -0.20);
        pole.position.set(0.04, -0.08, -0.06);
        polePivot.add(pole);
        boatmanGroup.add(polePivot);
        group.add(boatmanGroup);

        // 5. V-Shaped Trailing Water Wake Ribbons
        const wakeL = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.42), wakeMat);
        wakeL.position.set(-0.17, 0.012, -0.62);
        wakeL.rotation.y = -0.24;
        group.add(wakeL);
        const wakeR = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.004, 0.42), wakeMat);
        wakeR.position.set(0.17, 0.012, -0.62);
        wakeR.rotation.y = 0.24;
        group.add(wakeR);

        group.userData = { polePivot };
        return group;
    }

    createBargeInstance() {
        if (this.modelCache && this.modelCache.has('barge')) {
            const clone = this.modelCache.get('barge').clone();
            clone.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            return clone;
        }
        return this.createProceduralBargeMesh();
    }

    // Scan grid to find contiguous canal waterways (graph traversal)
    findCanalNetworks() {
        const canalTiles = new Map();
        for (const [key, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.CANAL) {
                canalTiles.set(key, tile);
            }
        }

        const visited = new Set();
        const networks = [];

        for (const [key, startTile] of canalTiles.entries()) {
            if (visited.has(key)) continue;

            const component = [];
            const queue = [startTile];
            visited.add(key);

            while (queue.length > 0) {
                const current = queue.shift();
                component.push(current);

                const neighbors = [
                    { x: current.x + 1, y: current.y },
                    { x: current.x - 1, y: current.y },
                    { x: current.x, y: current.y + 1 },
                    { x: current.x, y: current.y - 1 }
                ];

                for (const n of neighbors) {
                    const nKey = this.grid.getKey(n.x, n.y);
                    if (canalTiles.has(nKey) && !visited.has(nKey)) {
                        visited.add(nKey);
                        queue.push(canalTiles.get(nKey));
                    }
                }
            }

            if (component.length >= 2) {
                networks.push(component);
            }
        }

        return networks;
    }

    // Build linear waypoint path from an endpoint of a canal network
    buildWaterwayRoute(network) {
        if (!network || network.length < 2) return null;

        const netSet = new Set(network.map(t => `${t.x}_${t.y}`));

        // Find endpoint tiles (tiles with only 1 orthogonal canal neighbor in this component)
        let endpoints = [];
        for (const tile of network) {
            const neighbors = [
                { x: tile.x + 1, y: tile.y },
                { x: tile.x - 1, y: tile.y },
                { x: tile.x, y: tile.y + 1 },
                { x: tile.x, y: tile.y - 1 }
            ];
            const canalAdj = neighbors.filter(n => netSet.has(`${n.x}_${n.y}`)).length;
            if (canalAdj <= 1) {
                endpoints.push(tile);
            }
        }

        const startTile = endpoints.length > 0 ? endpoints[0] : network[0];
        const endTile = endpoints.length > 1 ? endpoints[endpoints.length - 1] : network[network.length - 1];

        // BFS path between endpoints
        const queue = [[startTile]];
        const visited = new Set([`${startTile.x}_${startTile.y}`]);

        while (queue.length > 0) {
            const path = queue.shift();
            const curr = path[path.length - 1];

            if (curr.x === endTile.x && curr.y === endTile.y && path.length >= 2) {
                return path;
            }

            const neighbors = [
                { x: curr.x + 1, y: curr.y },
                { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 },
                { x: curr.x, y: curr.y - 1 }
            ];

            for (const n of neighbors) {
                const key = `${n.x}_${n.y}`;
                if (netSet.has(key) && !visited.has(key)) {
                    visited.add(key);
                    const tileObj = network.find(t => t.x === n.x && t.y === n.y);
                    if (tileObj) queue.push([...path, tileObj]);
                }
            }
        }

        return network.slice(0, Math.min(network.length, 12));
    }

    // Spawn Takasebune cargo barge on active canal
    spawnBarge() {
        const networks = this.findCanalNetworks();
        if (networks.length === 0) return;

        const chosenNet = networks[Math.floor(Math.random() * networks.length)];
        const tilePath = this.buildWaterwayRoute(chosenNet);
        if (!tilePath || tilePath.length < 2) return;

        const waterY = CanalTrafficManager.getWaterElevation();
        const waypoints = tilePath.map(t => {
            const p = this.getTileWorldPos(t.x, t.y);
            return new THREE.Vector3(p.x, waterY, p.z);
        });

        const mesh = this.createBargeInstance();
        mesh.position.copy(waypoints[0]);
        this.scene.add(mesh);

        this.barges.push({
            mesh,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: 1.15
        });
    }

    // Advance canal barge positions with gentle aquatic rocking motion
    update(speedMult = 1.0, delta = 0.016) {
        if (speedMult <= 0 || !delta || delta <= 0) return;
        this.animTime += delta * speedMult;

        this.spawnCheckTimer += delta * (speedMult > 0 ? speedMult : 1);
        if (this.spawnCheckTimer > 3.0) {
            this.spawnCheckTimer = 0;
            if (this.barges.length < this.maxBarges) {
                this.spawnBarge();
            }
        }

        for (let i = this.barges.length - 1; i >= 0; i--) {
            const barge = this.barges[i];
            const from = barge.waypoints[barge.waypointIndex];
            const to = barge.waypoints[barge.waypointIndex + 1];

            if (!to) {
                // Reached waterway terminus: reverse course smoothly
                barge.waypoints.reverse();
                barge.waypointIndex = 0;
                barge.progress = 0;
                continue;
            }

            const dist = from.distanceTo(to);
            const step = (barge.speed * speedMult * delta) / Math.max(0.01, dist);
            barge.progress += step;

            if (barge.progress >= 1.0) {
                barge.waypointIndex++;
                barge.progress = 0;
            } else {
                const waterY = CanalTrafficManager.getWaterElevation();
                barge.mesh.position.lerpVectors(from, to, barge.progress);
                // Gentle floating water rocking bob on the recessed canal surface
                barge.mesh.position.y = waterY + Math.sin(this.animTime * 2.8 + i) * 0.007;
                if (barge.mesh.userData?.polePivot) {
                    barge.mesh.userData.polePivot.rotation.x = Math.sin(this.animTime * 3.2 + i) * 0.18;
                }

                const dirX = to.x - from.x;
                const dirZ = to.z - from.z;
                if (Math.hypot(dirX, dirZ) > 0.01) {
                    const targetAngle = Math.atan2(dirX, dirZ);
                    let diff = targetAngle - barge.mesh.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    barge.mesh.rotation.y += diff * 0.12;
                    // Subtle bank roll when turning
                    barge.mesh.rotation.z = Math.sin(this.animTime * 2.2 + i) * 0.03;
                }
            }
        }
    }

    cleanup() {
        for (const barge of this.barges) {
            this.scene.remove(barge.mesh);
        }
        this.barges = [];
    }
}
