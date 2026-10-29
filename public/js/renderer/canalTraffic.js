// Project Meiji - Canal Waterway Traffic & Takasebune Cargo Barges (canalTraffic.js)
// Phase 2 /artisan: Takasebune Cargo Barges, Woven Bamboo Awning, Rice Sacks & Poled Boatman (<= 400 lines)

import * as THREE from 'three';
import { CONFIG } from '../config.js';

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

    // Authentic Meiji Takasebune (高瀬舟) river cargo barge
    createProceduralBargeMesh() {
        const group = new THREE.Group();
        const hullMat = new THREE.MeshLambertMaterial({ color: 0x4a3422 });
        const gunwaleMat = new THREE.MeshLambertMaterial({ color: 0x382618 });
        const bambooMat = new THREE.MeshLambertMaterial({ color: 0xc8aa64 });
        const strawMat = new THREE.MeshLambertMaterial({ color: 0xbfa366 });
        const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.40 });

        // 1. Flat-bottomed Swept Timber Hull
        const hull = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.92), hullMat);
        hull.position.y = 0.025;
        hull.castShadow = true;
        group.add(hull);

        // Raised sweeping Prow (Bow)
        const prow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.22), hullMat);
        prow.position.set(0, 0.055, 0.52);
        prow.rotation.x = -0.22;
        prow.castShadow = true;
        group.add(prow);

        // Left and Right timber gunwale sideboards
        for (const gx of [-0.18, 0.18]) {
            const side = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.94), gunwaleMat);
            side.position.set(gx, 0.065, 0.02);
            group.add(side);
        }

        // 2. Woven Bamboo / Reed Cargo Canopy Awning (Tomabune / 苫舟)
        const awning = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.45, 8, 1, false, 0, Math.PI), bambooMat);
        awning.rotation.set(0, 0, -Math.PI / 2);
        awning.scale.set(0.65, 1.0, 1.0);
        awning.position.set(0, 0.12, -0.04);
        awning.castShadow = true;
        group.add(awning);

        // 3. Cargo under & behind awning: Straw Rice Bales (Tawara) & Sake Casks
        const tawaraGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.22, 6);
        tawaraGeo.rotateZ(Math.PI / 2);
        const t1 = new THREE.Mesh(tawaraGeo, strawMat);
        t1.position.set(0, 0.07, 0.18);
        t1.castShadow = true;
        group.add(t1);

        const caskGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.09, 8);
        const c1 = new THREE.Mesh(caskGeo, gunwaleMat);
        c1.position.set(-0.08, 0.08, -0.04);
        group.add(c1);
        const c2 = new THREE.Mesh(caskGeo, gunwaleMat);
        c2.position.set(0.08, 0.08, -0.04);
        group.add(c2);

        // 4. Articulated Boatman (Sendō 船頭) at Stern
        const coatMat = new THREE.MeshLambertMaterial({ color: 0x1f3652 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.08), coatMat);
        body.position.set(0, 0.11, -0.32);
        group.add(body);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 5), new THREE.MeshLambertMaterial({ color: 0xf2cbb0 }));
        head.position.set(0, 0.20, -0.32);
        group.add(head);

        // Conical straw hat (Sugegasa)
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.045, 8), bambooMat);
        hat.position.set(0, 0.23, -0.32);
        group.add(hat);

        // Long Bamboo Push-Pole (Sao 竿) angled into the water
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 4), bambooMat);
        pole.rotation.set(Math.PI / 4, 0, -0.25);
        pole.position.set(0.12, 0.06, -0.38);
        group.add(pole);

        // 5. White trailing water wake ribbons
        const wakeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.35), wakeMat);
        wakeL.position.set(-0.16, 0.035, -0.58);
        wakeL.rotation.y = -0.22;
        group.add(wakeL);
        const wakeR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.005, 0.35), wakeMat);
        wakeR.position.set(0.16, 0.035, -0.58);
        wakeR.rotation.y = 0.22;
        group.add(wakeR);

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

        const waypoints = tilePath.map(t => {
            const p = this.getTileWorldPos(t.x, t.y);
            return new THREE.Vector3(p.x, 0.038, p.z);
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
                barge.mesh.position.lerpVectors(from, to, barge.progress);
                // Gentle floating water rocking bob
                barge.mesh.position.y = 0.038 + Math.sin(this.animTime * 2.8 + i) * 0.008;

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
