// Project Meiji - Canal Waterway Traffic & Takasebune Cargo Barges (canalTraffic.js)
// ponytail: waterway graph pathfinding, smooth barge lerp under taiko-bashi bridges, reverse route

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
    }

    // Procedural fallback Takasebune barge mesh if GLB model is not cached
    createProceduralBargeMesh() {
        const group = new THREE.Group();

        // Hull
        const hullGeo = new THREE.BoxGeometry(0.38, 0.05, 0.90);
        const hullMat = new THREE.MeshLambertMaterial({ color: 0x4a3525 });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.position.y = 0.025;
        hull.castShadow = true;
        group.add(hull);

        // Raised Prow (Bow)
        const bowGeo = new THREE.BoxGeometry(0.34, 0.05, 0.20);
        const bow = new THREE.Mesh(bowGeo, hullMat);
        bow.position.set(0, 0.045, 0.50);
        bow.rotation.x = -0.15;
        group.add(bow);

        // Cargo Barrels & Sacks (Midship)
        const barrelMat = new THREE.MeshLambertMaterial({ color: 0x5c4028 });
        const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 6), barrelMat);
        b1.position.set(-0.08, 0.08, -0.05);
        group.add(b1);

        const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.08, 6), barrelMat);
        b2.position.set(0.08, 0.08, -0.05);
        group.add(b2);

        const sackMat = new THREE.MeshLambertMaterial({ color: 0x9c855a });
        const sack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 6), sackMat);
        sack.rotation.z = Math.PI / 2;
        sack.position.set(0, 0.07, 0.16);
        group.add(sack);

        // Boatman (Sendō) with straw hat at stern
        const coatMat = new THREE.MeshLambertMaterial({ color: 0x243754 });
        const hatMat = new THREE.MeshLambertMaterial({ color: 0xc2a66b });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.07), coatMat);
        body.position.set(0, 0.08, -0.32);
        group.add(body);

        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.03, 6), hatMat);
        hat.position.set(0, 0.13, -0.32);
        group.add(hat);

        // Push-Pole (Sao)
        const poleMat = new THREE.MeshLambertMaterial({ color: 0xa89058 });
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.40, 4), poleMat);
        pole.rotation.x = Math.PI / 5;
        pole.position.set(0.12, 0.07, -0.36);
        group.add(pole);

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
        const visited = new Set();
        const path = [];

        // DFS to find longest simple waterway path
        const dfs = (tile) => {
            const key = `${tile.x}_${tile.y}`;
            visited.add(key);
            path.push(tile);

            const neighbors = [
                { x: tile.x + 1, y: tile.y },
                { x: tile.x - 1, y: tile.y },
                { x: tile.x, y: tile.y + 1 },
                { x: tile.x, y: tile.y - 1 }
            ];

            for (const n of neighbors) {
                const nKey = `${n.x}_${n.y}`;
                if (netSet.has(nKey) && !visited.has(nKey)) {
                    const nextTile = this.grid.getTile(n.x, n.y);
                    if (nextTile) {
                        dfs(nextTile);
                        break;
                    }
                }
            }
        };

        dfs(startTile);

        if (path.length < 2) return null;

        // Convert tiles to Three.js Vector3 world coordinates at water surface level (y = 0.040)
        return path.map(t => {
            const pos = this.getTileWorldPos(t.x, t.y);
            return new THREE.Vector3(pos.x, 0.040, pos.z);
        });
    }

    spawnBarge() {
        const networks = this.findCanalNetworks();
        if (networks.length === 0) return false;

        const chosenNet = networks[Math.floor(Math.random() * networks.length)];
        const waypoints = this.buildWaterwayRoute(chosenNet);
        if (!waypoints || waypoints.length < 2) return false;

        const mesh = this.createBargeInstance();
        mesh.position.copy(waypoints[0]);

        // Orient initial heading towards next waypoint
        const dirX = waypoints[1].x - waypoints[0].x;
        const dirZ = waypoints[1].z - waypoints[0].z;
        mesh.rotation.y = Math.atan2(dirX, dirZ);

        this.scene.add(mesh);

        this.barges.push({
            mesh,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: 0.55 + Math.random() * 0.25, // Calm waterway speed
        });

        return true;
    }

    update(speedMult, delta) {
        if (speedMult <= 0) return;

        this.spawnCheckTimer += speedMult * delta;
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
                const dirX = to.x - from.x;
                const dirZ = to.z - from.z;
                if (Math.hypot(dirX, dirZ) > 0.01) {
                    const targetAngle = Math.atan2(dirX, dirZ);
                    // Gentle angular interpolation for realistic barge steering
                    let diff = targetAngle - barge.mesh.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    barge.mesh.rotation.y += diff * 0.12;
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
