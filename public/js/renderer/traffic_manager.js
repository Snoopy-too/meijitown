// Project Meiji - Dynamic Street Traffic & Cart Movement Engine
// ponytail: low-poly hand-pump brigade carts, rickshaws, pedestrians & road BFS pathfinding

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { SOUND } from '../fx.js';

export class TrafficManager {
    constructor(scene, gridModel, getTileWorldPosFn, fxManager) {
        this.scene = scene;
        this.grid = gridModel;
        this.getTileWorldPos = getTileWorldPosFn;
        this.fx = fxManager;

        this.dispatchedCarts = [];
        this.ambientAgents = [];
        this.ambientSpawnTimer = 0;
        this.cachedPaths = [];
        this.roadNetworkDirty = true;

        // ponytail: invalidate path cache only when road network mutates
        if (this.grid && typeof this.grid.subscribe === 'function') {
            this.grid.subscribe((event) => {
                if (event === 'grid_reset' || event === 'tile_updated') {
                    this.roadNetworkDirty = true;
                }
                if (event === 'grid_reset') {
                    this.clearAllAgents();
                }
            });
        }
    }

    // Procedural Low-Poly Hand-Pump Cart (Ryūtosui 竜吐水)
    createHandPumpCartMesh() {
        const group = new THREE.Group();

        // 1. Wooden Wagon Bed
        const bedGeo = new THREE.BoxGeometry(0.40, 0.10, 0.65);
        const bedMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.y = 0.16;
        bed.castShadow = true;
        group.add(bed);

        // 2. Wooden Spoke Wheels (Left & Right)
        const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 8);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });

        const leftWheel = new THREE.Mesh(wheelGeo, wheelMat);
        leftWheel.position.set(-0.24, 0.16, 0);
        leftWheel.castShadow = true;
        group.add(leftWheel);

        const rightWheel = new THREE.Mesh(wheelGeo, wheelMat);
        rightWheel.position.set(0.24, 0.16, 0);
        rightWheel.castShadow = true;
        group.add(rightWheel);

        // 3. Brass Ryutosui Hand-Pump Box
        const pumpGeo = new THREE.BoxGeometry(0.22, 0.26, 0.22);
        const pumpMat = new THREE.MeshLambertMaterial({ color: 0xb58900 });
        const pump = new THREE.Mesh(pumpGeo, pumpMat);
        pump.position.set(0, 0.32, -0.05);
        pump.castShadow = true;
        group.add(pump);

        // Pump Lever Handle
        const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.38, 6);
        handleGeo.rotateX(Math.PI / 2);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x2e1f14 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 0.48, -0.05);
        group.add(handle);

        // 4. Lacquered Red Water Barrel on Back
        const barrelGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.24, 6);
        const barrelMat = new THREE.MeshLambertMaterial({ color: 0x8a2b1f });
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.position.set(0, 0.30, 0.20);
        group.add(barrel);

        // 5. Hikeshi Brigade Runner holding Matoi Standard leading the cart
        const runnerGroup = new THREE.Group();
        runnerGroup.position.set(0, 0, -0.45);
        const runnerBodyGeo = new THREE.BoxGeometry(0.14, 0.28, 0.12);
        const runnerBodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2b38 }); // Indigo Hanten
        const runnerBody = new THREE.Mesh(runnerBodyGeo, runnerBodyMat);
        runnerBody.position.y = 0.22;
        runnerGroup.add(runnerBody);

        const headGeo = new THREE.SphereGeometry(0.06, 5, 5);
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xf2cbb0 });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.42;
        runnerGroup.add(head);

        // Matoi Standard Pole & Gilded Brass Finial
        const matoiPoleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.65, 5);
        const matoiPole = new THREE.Mesh(matoiPoleGeo, bedMat);
        matoiPole.position.set(0.10, 0.42, -0.05);
        runnerGroup.add(matoiPole);

        const matoiHeadGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 6);
        const matoiHeadMat = new THREE.MeshLambertMaterial({ color: 0xc89d32 }); // Gilded brass matoi crest
        const matoiHead = new THREE.Mesh(matoiHeadGeo, matoiHeadMat);
        matoiHead.position.set(0.10, 0.76, -0.05);
        runnerGroup.add(matoiHead);

        group.add(runnerGroup);
        return group;
    }

    // Dispatch Emergency Brigade Hand-Pump Cart along Road Network
    dispatchBrigadeCart(roadPath, onArrival) {
        if (!roadPath || roadPath.length === 0) {
            if (typeof onArrival === 'function') onArrival();
            return;
        }

        const cart = this.createHandPumpCartMesh();
        const startTile = roadPath[0];
        const startPos = this.getTileWorldPos(startTile.x, startTile.y);
        cart.position.set(startPos.x, 0, startPos.z);
        this.scene.add(cart);

        // Convert tile path to Vector3 waypoints
        const waypoints = roadPath.map(t => {
            const p = this.getTileWorldPos(t.x, t.y);
            return new THREE.Vector3(p.x, 0, p.z);
        });

        this.dispatchedCarts.push({
            mesh: cart,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: 5.0, // World units per second (~2.5 road tiles per sec)
            onArrival,
            isFinished: false,
            despawnTimer: 0
        });
    }

    // Procedural Low-Poly Jinrikisha (Rickshaw 人力車)
    createRickshawMesh() {
        const group = new THREE.Group();

        // 1. Two large wooden spoked wheels
        const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 8);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x2e1f14 });

        const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
        wheelL.position.set(-0.20, 0.18, -0.05);
        wheelL.castShadow = true;
        group.add(wheelL);

        const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
        wheelR.position.set(0.20, 0.18, -0.05);
        wheelR.castShadow = true;
        group.add(wheelR);

        // Axle
        const axleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.40, 4);
        axleGeo.rotateZ(Math.PI / 2);
        const axleMat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });
        const axle = new THREE.Mesh(axleGeo, axleMat);
        axle.position.set(0, 0.18, -0.05);
        group.add(axle);

        // 2. Lacquered seat carriage
        const seatGeo = new THREE.BoxGeometry(0.28, 0.14, 0.32);
        const seatMat = new THREE.MeshLambertMaterial({ color: 0x8a241c });
        const seat = new THREE.Mesh(seatGeo, seatMat);
        seat.position.set(0, 0.24, -0.05);
        seat.castShadow = true;
        group.add(seat);

        // Backrest and Folded Canvas Hood
        const hoodGeo = new THREE.BoxGeometry(0.28, 0.22, 0.14);
        const hoodMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.set(0, 0.40, -0.16);
        group.add(hood);

        // 3. Forward wooden shafts
        const shaftMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
        const shaftGeo = new THREE.BoxGeometry(0.025, 0.025, 0.55);
        const shaftL = new THREE.Mesh(shaftGeo, shaftMat);
        shaftL.position.set(-0.12, 0.20, 0.24);
        group.add(shaftL);

        const shaftR = new THREE.Mesh(shaftGeo, shaftMat);
        shaftR.position.set(0.12, 0.20, 0.24);
        group.add(shaftR);

        // 4. Rickshaw Runner (Shafu 車夫)
        const runnerGroup = new THREE.Group();
        runnerGroup.position.set(0, 0, 0.38);

        const runnerBodyGeo = new THREE.BoxGeometry(0.16, 0.32, 0.14);
        const runnerBodyMat = new THREE.MeshLambertMaterial({ color: 0x1e3a5f });
        const runnerBody = new THREE.Mesh(runnerBodyGeo, runnerBodyMat);
        runnerBody.position.y = 0.30;
        runnerBody.castShadow = true;
        runnerGroup.add(runnerBody);

        const headGeo = new THREE.SphereGeometry(0.07, 6, 6);
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xf2cbb0 });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.52;
        runnerGroup.add(head);

        // Conical Straw Hat (Sugegasa 菅笠)
        const hatGeo = new THREE.ConeGeometry(0.18, 0.08, 8);
        const hatMat = new THREE.MeshLambertMaterial({ color: 0xd9b36c });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = 0.60;
        hat.castShadow = true;
        runnerGroup.add(hat);

        group.add(runnerGroup);
        return group;
    }

    // Procedural Low-Poly Walking Pedestrian (町人 / Chōnin)
    createPedestrianMesh() {
        const group = new THREE.Group();

        const kimonoColors = [0x2c3e50, 0x822419, 0x2d5a3d, 0x5a4269, 0x6e5238];
        const color = kimonoColors[Math.floor(Math.random() * kimonoColors.length)];

        // Kimono Robe Body
        const bodyGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.44, 6);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.24;
        body.castShadow = true;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.065, 6, 6);
        const skinMat = new THREE.MeshLambertMaterial({ color: 0xf2cbb0 });
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 0.52;
        group.add(head);

        // Hair / Mage
        const hairGeo = new THREE.SphereGeometry(0.04, 5, 5);
        const hairMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 0.56, -0.03);
        group.add(hair);

        // Traditional Japanese Oil-Paper Umbrella (Janome-gasa 蛇の目傘)
        if (Math.random() < 0.65) {
            const umbrellaGroup = new THREE.Group();
            umbrellaGroup.position.set(0.12, 0.38, 0.05);

            const shaftGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.45, 4);
            const shaftMat = new THREE.MeshLambertMaterial({ color: 0x8a7042 });
            const shaft = new THREE.Mesh(shaftGeo, shaftMat);
            shaft.position.y = 0.22;
            umbrellaGroup.add(shaft);

            const umbrellaColors = [0xb33927, 0x243b55, 0xd4a017, 0x556b2f];
            const uColor = umbrellaColors[Math.floor(Math.random() * umbrellaColors.length)];
            const canopyGeo = new THREE.ConeGeometry(0.24, 0.10, 8);
            const canopyMat = new THREE.MeshLambertMaterial({ color: uColor });
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.y = 0.44;
            canopy.rotation.x = 0.15;
            canopy.castShadow = true;
            umbrellaGroup.add(canopy);

            group.add(umbrellaGroup);
        }

        return group;
    }

    // BFS traversal along road tiles between two points
    bfsRoadPath(start, dest) {
        const queue = [[start]];
        const visited = new Set([`${start.x}_${start.y}`]);

        while (queue.length > 0) {
            const path = queue.shift();
            const curr = path[path.length - 1];

            if (curr.x === dest.x && curr.y === dest.y) {
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
                if (!visited.has(key) && this.grid.isValidCoord(n.x, n.y)) {
                    const nt = this.grid.getTile(n.x, n.y);
                    if (this.grid.isRoadTile ? this.grid.isRoadTile(nt) : (nt && nt.type === CONFIG.TYPES.ROAD)) {
                        visited.add(key);
                        queue.push([...path, n]);
                    }
                }
            }
        }
        return null;
    }

    // Precompute & cache diverse road path segments only when topology modifies
    rebuildPathCache() {
        this.cachedPaths = [];
        this.roadNetworkDirty = false;

        const roadTiles = [];
        const resRoadTiles = [];
        const comIndRoadTiles = [];

        for (let x = 0; x < this.grid.width; x++) {
            for (let y = 0; y < this.grid.height; y++) {
                const t = this.grid.getTile(x, y);
                if (this.grid.isRoadTile ? this.grid.isRoadTile(t) : (t && t.type === CONFIG.TYPES.ROAD)) {
                    roadTiles.push({ x, y });
                    const neighbors = [
                        { x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }
                    ];
                    let nearRes = false;
                    let nearComInd = false;
                    for (const n of neighbors) {
                        if (this.grid.isValidCoord(n.x, n.y)) {
                            const nt = this.grid.getTile(n.x, n.y);
                            if (nt && nt.type === CONFIG.TYPES.ZONE && nt.stage === CONFIG.STAGES.BUILT) {
                                if (nt.zoneType === CONFIG.ZONES.RESIDENTIAL) nearRes = true;
                                if (nt.zoneType === CONFIG.ZONES.COMMERCIAL || nt.zoneType === CONFIG.ZONES.INDUSTRIAL) nearComInd = true;
                            }
                        }
                    }
                    if (nearRes) resRoadTiles.push({ x, y });
                    if (nearComInd) comIndRoadTiles.push({ x, y });
                }
            }
        }

        if (roadTiles.length < 2) return;

        const targetCount = 10;
        for (let attempt = 0; attempt < 25 && this.cachedPaths.length < targetCount; attempt++) {
            let start = null;
            let dest = null;

            if (resRoadTiles.length > 0 && comIndRoadTiles.length > 0 && Math.random() < 0.75) {
                if (Math.random() < 0.5) {
                    start = resRoadTiles[Math.floor(Math.random() * resRoadTiles.length)];
                    dest = comIndRoadTiles[Math.floor(Math.random() * comIndRoadTiles.length)];
                } else {
                    start = comIndRoadTiles[Math.floor(Math.random() * comIndRoadTiles.length)];
                    dest = resRoadTiles[Math.floor(Math.random() * resRoadTiles.length)];
                }
            } else {
                start = roadTiles[Math.floor(Math.random() * roadTiles.length)];
                dest = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            }

            if (!start || !dest || (start.x === dest.x && start.y === dest.y)) continue;

            const path = this.bfsRoadPath(start, dest);
            if (path && path.length >= 2) {
                this.cachedPaths.push(path);
            }
        }
    }

    // ponytail: O(1) road path retrieval from precomputed cache
    findAmbientRoadPath() {
        if (this.roadNetworkDirty || this.cachedPaths.length === 0) {
            this.rebuildPathCache();
        }
        if (this.cachedPaths.length === 0) return null;
        return this.cachedPaths[Math.floor(Math.random() * this.cachedPaths.length)];
    }

    spawnAmbientAgent() {
        const path = this.findAmbientRoadPath();
        if (!path || path.length < 2) return;

        const isRickshaw = Math.random() < 0.5;
        const mesh = isRickshaw ? this.createRickshawMesh() : this.createPedestrianMesh();

        const waypoints = path.map(t => {
            const p = this.getTileWorldPos(t.x, t.y);
            const offset = (Math.random() - 0.5) * 0.35;
            return new THREE.Vector3(p.x + offset, 0, p.z + offset);
        });

        mesh.position.copy(waypoints[0]);
        this.scene.add(mesh);

        this.ambientAgents.push({
            type: isRickshaw ? 'rickshaw' : 'pedestrian',
            mesh,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: isRickshaw ? (2.2 + Math.random() * 0.8) : (1.1 + Math.random() * 0.4),
            reverseOnComplete: Math.random() < 0.5,
            isFinished: false
        });
    }

    update(speedMult, delta = 0.016) {
        // Advance dispatched hand-pump carts along road network
        for (let i = this.dispatchedCarts.length - 1; i >= 0; i--) {
            const c = this.dispatchedCarts[i];
            if (c.isFinished) {
                c.despawnTimer += (speedMult > 0 ? speedMult : 1) * delta;
                if (c.despawnTimer > 1.2) {
                    this.scene.remove(c.mesh);
                    this.dispatchedCarts.splice(i, 1);
                }
                continue;
            }

            const from = c.waypoints[c.waypointIndex];
            const to = c.waypoints[c.waypointIndex + 1];

            if (!to) {
                // Reached destination tile
                c.isFinished = true;
                const destPos = c.waypoints[c.waypoints.length - 1];
                if (this.fx) this.fx.spawnWaterSteam(destPos.x, destPos.z);
                SOUND.playWaterSplash();
                if (typeof c.onArrival === 'function') c.onArrival();
                continue;
            }

            const dist = from.distanceTo(to);
            const step = (c.speed * speedMult * delta) / Math.max(0.01, dist);
            c.progress += step;

            if (c.progress >= 1.0) {
                c.waypointIndex++;
                c.progress = 0;
            } else {
                c.mesh.position.lerpVectors(from, to, c.progress);
                const dirX = to.x - from.x;
                const dirZ = to.z - from.z;
                if (Math.hypot(dirX, dirZ) > 0.01) {
                    c.mesh.rotation.y = Math.atan2(dirX, dirZ);
                }
            }
        }

        // Advance ambient street traffic (Rickshaws & Pedestrians)
        if (speedMult > 0) {
            this.ambientSpawnTimer += speedMult * delta;
            if (this.ambientSpawnTimer > 2.5 && this.ambientAgents.length < 5) {
                this.ambientSpawnTimer = 0;
                this.spawnAmbientAgent();
            }
        }

        for (let i = this.ambientAgents.length - 1; i >= 0; i--) {
            const agent = this.ambientAgents[i];
            const from = agent.waypoints[agent.waypointIndex];
            const to = agent.waypoints[agent.waypointIndex + 1];

            if (!to) {
                if (agent.reverseOnComplete) {
                    agent.reverseOnComplete = false;
                    agent.waypoints.reverse();
                    agent.waypointIndex = 0;
                    agent.progress = 0;
                    continue;
                }
                this.scene.remove(agent.mesh);
                this.ambientAgents.splice(i, 1);
                continue;
            }

            const dist = from.distanceTo(to);
            const step = (agent.speed * speedMult * delta) / Math.max(0.01, dist);
            agent.progress += step;

            if (agent.progress >= 1.0) {
                agent.waypointIndex++;
                agent.progress = 0;
            } else {
                agent.mesh.position.lerpVectors(from, to, agent.progress);
                const dirX = to.x - from.x;
                const dirZ = to.z - from.z;
                if (Math.hypot(dirX, dirZ) > 0.01) {
                    agent.mesh.rotation.y = Math.atan2(dirX, dirZ);
                }
            }
        }
    }

    clearAllAgents() {
        for (const a of this.ambientAgents) {
            if (a.mesh) this.scene.remove(a.mesh);
        }
        this.ambientAgents = [];
        for (const c of this.dispatchedCarts) {
            if (c.mesh) this.scene.remove(c.mesh);
        }
        this.dispatchedCarts = [];
        this.cachedPaths = [];
        this.roadNetworkDirty = true;
    }
}
