// Project Meiji - 1870s Steam Locomotive Railway Traffic (trainTraffic.js)
// ponytail: rail graph traversal, depot passenger boarding stop (3s), reversal & smokestack steam puffs

import * as THREE from 'three';
import { CONFIG } from '../config.js';

export class TrainTrafficManager {
    constructor(scene, gridModel, getTileWorldPosFn, modelCache = null) {
        this.scene = scene;
        this.grid = gridModel;
        this.getTileWorldPos = getTileWorldPosFn;
        this.modelCache = modelCache;

        this.trains = [];
        this.steamPuffs = [];
        this.maxTrains = 1; // 1 primary locomotive service
        this.spawnCheckTimer = 0;
        this.puffTimer = 0;
    }

    // Procedural fallback 2-4-0 tank engine + passenger car if GLB asset is not cached
    createProceduralTrainMesh() {
        const group = new THREE.Group();

        const ironMat = new THREE.MeshLambertMaterial({ color: 0x222426 });
        const brassMat = new THREE.MeshStandardMaterial({ color: 0xb89230, metalness: 0.8, roughness: 0.3 });
        const coachMat = new THREE.MeshLambertMaterial({ color: 0x1f3825 });
        const roofMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });

        // Locomotive (facing -Z as forward)
        const locoGroup = new THREE.Group();
        locoGroup.position.z = -0.45;

        // Chassis & Boiler
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.85), ironMat);
        chassis.position.y = 0.08;
        locoGroup.add(chassis);

        const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.54, 8), ironMat);
        boiler.rotation.x = Math.PI / 2;
        boiler.position.set(0, 0.22, -0.12);
        locoGroup.add(boiler);

        // Tall Smokestack & Dome
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.22, 8), ironMat);
        stack.position.set(0, 0.42, -0.30);
        locoGroup.add(stack);

        const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.10, 8), brassMat);
        dome.position.set(0, 0.38, -0.10);
        locoGroup.add(dome);

        // Cab
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.26), ironMat);
        cab.position.set(0, 0.24, 0.22);
        locoGroup.add(cab);

        group.add(locoGroup);

        // Passenger Coach (trailing at +Z)
        const coachGroup = new THREE.Group();
        coachGroup.position.z = 0.45;

        const cBody = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.65), coachMat);
        cBody.position.y = 0.22;
        coachGroup.add(cBody);

        const cRoof = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.68), roofMat);
        cRoof.position.y = 0.35;
        coachGroup.add(cRoof);

        group.add(coachGroup);
        return group;
    }

    createTrainInstance() {
        if (this.modelCache && this.modelCache.has('train')) {
            const clone = this.modelCache.get('train').clone();
            clone.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            return clone;
        }
        return this.createProceduralTrainMesh();
    }

    // Build contiguous rail graph networks
    findRailNetworks() {
        const visited = new Set();
        const networks = [];

        const isRailTile = (x, y) => {
            if (!this.grid.isValidCoord(x, y)) return false;
            const t = this.grid.getTile(x, y);
            return t && (t.type === CONFIG.TYPES.RAIL || (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT));
        };

        for (let x = 0; x < this.grid.width; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                const key = `${x}_${y}`;
                if (isRailTile(x, y) && !visited.has(key)) {
                    const currentNet = [];
                    const queue = [{ x, y }];
                    visited.add(key);

                    while (queue.length > 0) {
                        const curr = queue.shift();
                        currentNet.push(curr);

                        const neighbors = [
                            { x: curr.x + 1, y: curr.y },
                            { x: curr.x - 1, y: curr.y },
                            { x: curr.x, y: curr.y + 1 },
                            { x: curr.x, y: curr.y - 1 }
                        ];

                        for (const n of neighbors) {
                            const nKey = `${n.x}_${n.y}`;
                            if (isRailTile(n.x, n.y) && !visited.has(nKey)) {
                                visited.add(nKey);
                                queue.push(n);
                            }
                        }
                    }

                    if (currentNet.length >= 2) {
                        networks.push(currentNet);
                    }
                }
            }
        }

        return networks;
    }

    // Quadratic Bézier curve interpolation for smooth 90° corner navigation
    static evaluateBezier(p0, p1, p2, t) {
        const inv = 1 - t;
        return {
            x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
            y: p0.y !== undefined ? p0.y : 0.065,
            z: inv * inv * p0.z + 2 * inv * t * p1.z + t * t * p2.z
        };
    }

    static evaluateBezierTangent(p0, p1, p2, t) {
        const inv = 1 - t;
        return {
            x: 2 * inv * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
            z: 2 * inv * (p1.z - p0.z) + 2 * t * (p2.z - p1.z)
        };
    }

    // Construct sequential waypoint path along rail network with Bézier corner arcs
    buildRailRoute(networkTiles) {
        if (!networkTiles || networkTiles.length < 2) return null;

        const tileSet = new Set(networkTiles.map(t => `${t.x}_${t.y}`));

        // Find endpoint (tile with only 1 neighbor in network) or default to first
        let startTile = networkTiles[0];
        for (const t of networkTiles) {
            const neighbors = [
                { x: t.x + 1, y: t.y }, { x: t.x - 1, y: t.y },
                { x: t.x, y: t.y + 1 }, { x: t.x, y: t.y - 1 }
            ].filter(n => tileSet.has(`${n.x}_${n.y}`));

            if (neighbors.length === 1) {
                startTile = t;
                break;
            }
        }

        const path = [startTile];
        const visited = new Set([`${startTile.x}_${startTile.y}`]);
        let current = startTile;

        while (path.length < networkTiles.length) {
            const neighbors = [
                { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
            ].filter(n => tileSet.has(`${n.x}_${n.y}`) && !visited.has(`${n.x}_${n.y}`));

            if (neighbors.length === 0) break;
            current = neighbors[0];
            visited.add(`${current.x}_${current.y}`);
            path.push(current);
        }

        // Convert path of tiles into waypoints with quadratic Bézier corner smoothing
        const waypoints = [];
        for (let i = 0; i < path.length; i++) {
            const curr = path[i];
            const pCurr = this.getTileWorldPos(curr.x, curr.y);
            const tileData = this.grid.getTile(curr.x, curr.y);
            const isDepot = Boolean(tileData && tileData.type === CONFIG.TYPES.SERVICE && tileData.serviceType === CONFIG.SERVICES.TRAIN_DEPOT);

            if (i > 0 && i < path.length - 1) {
                const prev = path[i - 1];
                const next = path[i + 1];
                const dirIn = { x: curr.x - prev.x, y: curr.y - prev.y };
                const dirOut = { x: next.x - curr.x, y: next.y - curr.y };

                // 90-degree corner detected: interpolate along quadratic Bézier curve
                if (dirIn.x !== dirOut.x || dirIn.y !== dirOut.y) {
                    const pPrev = this.getTileWorldPos(prev.x, prev.y);
                    const pNext = this.getTileWorldPos(next.x, next.y);
                    const p0 = { x: (pPrev.x + pCurr.x) / 2, y: 0.065, z: (pPrev.z + pCurr.z) / 2 };
                    const p1 = { x: pCurr.x, y: 0.065, z: pCurr.z };
                    const p2 = { x: (pCurr.x + pNext.x) / 2, y: 0.065, z: (pCurr.z + pNext.z) / 2 };

                    const steps = 4;
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const bPt = TrainTrafficManager.evaluateBezier(p0, p1, p2, t);
                        waypoints.push({ ...bPt, isDepot: isDepot && s === Math.floor(steps / 2) });
                    }
                    continue;
                }
            }

            waypoints.push({
                x: pCurr.x,
                y: 0.065,
                z: pCurr.z,
                isDepot
            });
        }
        return waypoints;
    }

    spawnTrain() {
        if (this.trains.length >= this.maxTrains) return;

        const networks = this.findRailNetworks();
        if (networks.length === 0) return;

        const network = networks[0];
        const waypoints = this.buildRailRoute(network);
        if (!waypoints || waypoints.length < 2) return;

        const mesh = this.createTrainInstance();
        const startWp = waypoints[0];
        mesh.position.set(startWp.x, startWp.y, startWp.z);
        if (waypoints.length >= 2) {
            const dirX = waypoints[1].x - startWp.x;
            const dirZ = waypoints[1].z - startWp.z;
            if (Math.abs(dirX) > 0.001 || Math.abs(dirZ) > 0.001) {
                mesh.rotation.y = Math.atan2(dirX, dirZ) + Math.PI;
            }
        }
        this.scene.add(mesh);

        this.trains.push({
            mesh,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: 3.8, // World units per second (~1.9 rail tiles/sec)
            forward: true,
            dwellTimer: 0 // Waiting at depot platform
        });
    }

    // Small low-poly white steam puff from smokestack
    emitSteamPuff(train) {
        const rotY = train.mesh.rotation.y;
        // Smokestack is at local z = -0.75, y = 0.50 atop the boiler
        const stackX = train.mesh.position.x - 0.75 * Math.sin(rotY);
        const stackZ = train.mesh.position.z - 0.75 * Math.cos(rotY);
        const stackY = train.mesh.position.y + 0.52;

        const geo = new THREE.BoxGeometry(0.10, 0.10, 0.10);
        const mat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.70,
            depthWrite: false
        });
        const puff = new THREE.Mesh(geo, mat);
        puff.position.set(
            stackX + (Math.random() - 0.5) * 0.06,
            stackY,
            stackZ + (Math.random() - 0.5) * 0.06
        );
        this.scene.add(puff);

        this.steamPuffs.push({
            mesh: puff,
            age: 0,
            maxAge: 1.1,
            driftX: (Math.random() - 0.5) * 0.15,
            driftZ: (Math.random() - 0.5) * 0.15,
            upSpeed: 0.35 + Math.random() * 0.20
        });
    }

    update(delta, speedMultiplier = 1.0) {
        const effectiveDelta = delta * speedMultiplier;

        // Periodic spawn check
        this.spawnCheckTimer += effectiveDelta;
        if (this.spawnCheckTimer >= 3.0) {
            this.spawnCheckTimer = 0;
            if (this.trains.length < this.maxTrains) {
                this.spawnTrain();
            }
        }

        // Update Steam Puffs
        for (let i = this.steamPuffs.length - 1; i >= 0; i--) {
            const p = this.steamPuffs[i];
            p.age += effectiveDelta;
            if (p.age >= p.maxAge) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.steamPuffs.splice(i, 1);
            } else {
                const ratio = p.age / p.maxAge;
                p.mesh.position.y += p.upSpeed * effectiveDelta;
                p.mesh.position.x += p.driftX * effectiveDelta;
                p.mesh.position.z += p.driftZ * effectiveDelta;
                p.mesh.scale.setScalar(1.0 + ratio * 1.5);
                p.mesh.material.opacity = Math.max(0, 0.70 * (1 - ratio));
            }
        }

        // Update Active Train
        for (const train of this.trains) {
            // Handle depot boarding dwell stop
            if (train.dwellTimer > 0) {
                train.dwellTimer -= effectiveDelta;
                continue; // Train stands still while passengers board
            }

            const wps = train.waypoints;
            const from = wps[train.waypointIndex];
            const nextIdx = train.forward ? train.waypointIndex + 1 : train.waypointIndex - 1;

            // Terminus reached: reverse course
            if (nextIdx < 0 || nextIdx >= wps.length) {
                train.forward = !train.forward;
                continue;
            }

            const to = wps[nextIdx];
            const dist = Math.hypot(to.x - from.x, to.z - from.z);
            if (dist < 0.001) {
                train.waypointIndex = nextIdx;
                train.progress = 0;
                continue;
            }

            const step = (train.speed * effectiveDelta) / dist;
            train.progress += step;

            // Emit intermittent steam puffs while underway
            this.puffTimer += effectiveDelta;
            if (this.puffTimer >= 0.35) {
                this.puffTimer = 0;
                this.emitSteamPuff(train);
            }

            if (train.progress >= 1.0) {
                train.waypointIndex = nextIdx;
                train.progress = 0;
                train.mesh.position.set(to.x, to.y, to.z);

                // Stop at rural train depot for 3 seconds to "board passengers"
                if (to.isDepot) {
                    train.dwellTimer = 3.0;
                }
            } else {
                // Interpolate position
                train.mesh.position.x = from.x + (to.x - from.x) * train.progress;
                train.mesh.position.z = from.z + (to.z - from.z) * train.progress;
                train.mesh.position.y = from.y;

                // Face heading direction (locomotive smokestack leads forward)
                const dx = to.x - from.x;
                const dz = to.z - from.z;
                if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                    train.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;
                }
            }
        }
    }

    dispose() {
        for (const train of this.trains) {
            this.scene.remove(train.mesh);
        }
        for (const p of this.steamPuffs) {
            this.scene.remove(p.mesh);
        }
        this.trains = [];
        this.steamPuffs = [];
    }
}
