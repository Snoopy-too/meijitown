// Project Meiji - Dynamic Street Traffic & Cart Movement Engine (traffic_manager.js)
// Phase 2 /artisan: Articulated Citizens, Jinrikisha Rickshaws, Hikeshi Hand-Pump Carts & Walking Cycles (<= 580 lines)

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
        this.animTime = 0;

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

    // Procedural 4-Wheel Hand-Pump Fire Brigade Cart (Ryūtosui 竜吐水)
    createHandPumpCartMesh() {
        const group = new THREE.Group();

        // 1. Wooden Wagon Bed
        const bedGeo = new THREE.BoxGeometry(0.38, 0.08, 0.62);
        const bedMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
        const bed = new THREE.Mesh(bedGeo, bedMat);
        bed.position.y = 0.16;
        bed.castShadow = true;
        group.add(bed);

        // 2. Four Wooden Spoke Wheels (Front & Rear pairs)
        const wheelGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
        const wheels = [];
        for (const [wx, wz] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) {
            const w = new THREE.Mesh(wheelGeo, wheelMat);
            w.position.set(wx, 0.13, wz);
            w.castShadow = true;
            group.add(w);
            wheels.push(w);
        }

        // 3. Brass Ryūtosui Hand-Pump Box
        const pumpGeo = new THREE.BoxGeometry(0.22, 0.24, 0.20);
        const pumpMat = new THREE.MeshLambertMaterial({ color: 0xb58900 });
        const pump = new THREE.Mesh(pumpGeo, pumpMat);
        pump.position.set(0, 0.30, -0.05);
        pump.castShadow = true;
        group.add(pump);

        // Rocking Pump Lever Handle
        const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.36, 6);
        handleGeo.rotateX(Math.PI / 2);
        const handleMat = new THREE.MeshLambertMaterial({ color: 0x2e1f14 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0, 0.44, -0.05);
        group.add(handle);

        // 4. Lacquered Red Water Barrels
        const barrelMat = new THREE.MeshLambertMaterial({ color: 0x8a2b1f });
        for (const bx of [-0.08, 0.08]) {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.20, 6), barrelMat);
            barrel.position.set(bx, 0.28, 0.18);
            group.add(barrel);
        }

        // 5. Articulated Hikeshi Firefighter leading cart
        const runnerGroup = new THREE.Group();
        runnerGroup.position.set(0, 0, -0.44);
        const runnerBodyMat = new THREE.MeshStandardMaterial({ color: 0x1c2b38, roughness: 0.85 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5c29f, roughness: 0.75 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x181615, roughness: 0.8 });

        const runnerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.062, 0.24, 8), runnerBodyMat);
        runnerBody.position.y = 0.24;
        runnerGroup.add(runnerBody);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), skinMat);
        head.position.y = 0.41;
        runnerGroup.add(head);
        const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.049, 10, 8), hairMat);
        hairCap.position.set(0, 0.425, -0.008);
        runnerGroup.add(hairCap);

        // White brigade headband (Hachimaki)
        const hachi = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.050, 0.018, 10), new THREE.MeshLambertMaterial({ color: 0xf5f5f0 }));
        hachi.position.y = 0.42;
        runnerGroup.add(hachi);

        // Articulated legs
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.020, 0.14, 6), runnerBodyMat);
        legL.position.set(-0.032, 0.07, 0);
        runnerGroup.add(legL);
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.020, 0.14, 6), runnerBodyMat);
        legR.position.set(0.032, 0.07, 0);
        runnerGroup.add(legR);

        // Matoi Standard Pole & Gilded Crest
        const matoiPole = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.62, 5), bedMat);
        matoiPole.position.set(0.09, 0.40, -0.04);
        runnerGroup.add(matoiPole);
        const matoiHead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 6), new THREE.MeshLambertMaterial({ color: 0xd4af37 }));
        matoiHead.position.set(0.09, 0.72, -0.04);
        runnerGroup.add(matoiHead);

        runnerGroup.userData = { legL, legR };
        group.userData = { wheels, pumpHandle: handle, runner: runnerGroup };
        group.add(runnerGroup);
        return group;
    }

    // Dispatch Emergency Brigade Hand-Pump Cart
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

        const waypoints = roadPath.map(t => {
            const p = this.getTileWorldPos(t.x, t.y);
            return new THREE.Vector3(p.x, 0, p.z);
        });

        this.dispatchedCarts.push({
            mesh: cart,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: 5.0,
            onArrival,
            isFinished: false,
            despawnTimer: 0
        });
    }

    // Procedural Jinrikisha (Rickshaw 人力車 & Shafu Runner)
    createRickshawMesh() {
        const group = new THREE.Group();

        // 1. Spoked wheels & axle
        const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.035, 8);
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

        const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.40, 4), new THREE.MeshLambertMaterial({ color: 0x1f1f1f }));
        axle.rotation.z = Math.PI / 2;
        axle.position.set(0, 0.18, -0.05);
        group.add(axle);

        // 2. Lacquered seat carriage
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.30), new THREE.MeshLambertMaterial({ color: 0x8a241c }));
        seat.position.set(0, 0.24, -0.05);
        seat.castShadow = true;
        group.add(seat);

        // Backrest & Folded Canvas Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.12), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        hood.position.set(0, 0.40, -0.16);
        group.add(hood);

        // Seated Passenger in Kimono with Hair Crown
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5c29f, roughness: 0.75 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x181615, roughness: 0.8 });
        const passBody = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a3d, roughness: 0.82 }));
        passBody.position.set(0, 0.38, -0.06);
        group.add(passBody);
        const passHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
        passHead.position.set(0, 0.52, -0.06);
        group.add(passHead);
        const passHair = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), hairMat);
        passHair.position.set(0, 0.535, -0.07);
        group.add(passHair);

        // 3. Wooden shafts
        const shaftMat = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
        const shaftGeo = new THREE.BoxGeometry(0.022, 0.022, 0.56);
        const shaftL = new THREE.Mesh(shaftGeo, shaftMat);
        shaftL.position.set(-0.12, 0.20, 0.24);
        group.add(shaftL);
        const shaftR = new THREE.Mesh(shaftGeo, shaftMat);
        shaftR.position.set(0.12, 0.20, 0.24);
        group.add(shaftR);

        // 4. Articulated Rickshaw Runner (Shafu 車夫)
        const runnerGroup = new THREE.Group();
        runnerGroup.position.set(0, 0, 0.38);
        const runnerMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.85 });

        const runnerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.065, 0.26, 8), runnerMat);
        runnerBody.position.y = 0.28;
        runnerBody.castShadow = true;
        runnerGroup.add(runnerBody);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.046, 10, 10), skinMat);
        head.position.y = 0.46;
        runnerGroup.add(head);

        // Conical Straw Hat (Sugegasa 菅笠)
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.075, 12), new THREE.MeshStandardMaterial({ color: 0xd9b36c, roughness: 0.85 }));
        hat.position.y = 0.51;
        hat.castShadow = true;
        runnerGroup.add(hat);

        // Articulated runner legs
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.020, 0.16, 6), runnerMat);
        legL.position.set(-0.035, 0.08, 0);
        runnerGroup.add(legL);
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.020, 0.16, 6), runnerMat);
        legR.position.set(0.035, 0.08, 0);
        runnerGroup.add(legR);

        runnerGroup.userData = { legL, legR };
        group.userData = { wheels: [wheelL, wheelR], runner: runnerGroup };
        group.add(runnerGroup);
        return group;
    }

    // Procedural Articulated Meiji Walking Citizen (町人 / Chōnin — Tapered Kimono & Full Hair/Headgear)
    createPedestrianMesh() {
        const group = new THREE.Group();
        const kimonoColors = [0x243b55, 0x7a261c, 0x2b543a, 0x4e385c, 0x5c432c, 0x1f4754];
        const obiColors = [0xc89d32, 0x8c2d19, 0x1c252c, 0xd8d0c2];
        const color = kimonoColors[Math.floor(Math.random() * kimonoColors.length)];
        const obiColor = obiColors[Math.floor(Math.random() * obiColors.length)];

        const kimonoMat = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
        const obiMat = new THREE.MeshStandardMaterial({ color: obiColor, roughness: 0.70 });
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xe5c29f, roughness: 0.75 });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x181615, roughness: 0.80 });

        // 1. Draped Tapered Kimono Upper Torso & Lower Skirt (NO boxy blocks!)
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.064, 0.24, 8), kimonoMat);
        torso.position.y = 0.31;
        torso.castShadow = true;
        group.add(torso);

        // Contrasting Silk Obi Sash & Back Musubi Knot
        const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.061, 0.055, 8), obiMat);
        obi.position.y = 0.26;
        group.add(obi);

        // 2. Smooth Proportioned Neck, Head & Full Dark Hair Crown (NO bald pink spheres!)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
        head.position.y = 0.475;
        group.add(head);

        const hairCrown = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), hairMat);
        hairCrown.position.set(0, 0.49, -0.008);
        group.add(hairCrown);

        // Meiji Hair / Headgear variation (Shimada/Chonmage Chignon vs Meiji Bowler vs Woven Sugegasa)
        const hatStyle = Math.floor(Math.random() * 3);
        if (hatStyle === 0) {
            const chignon = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), hairMat);
            chignon.scale.set(0.85, 0.75, 1.35);
            chignon.position.set(0, 0.525, -0.025);
            group.add(chignon);
        } else if (hatStyle === 1) {
            const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 10), hairMat);
            hatBrim.position.y = 0.515;
            group.add(hatBrim);
            const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.055, 0.055, 10), hairMat);
            hatCrown.position.y = 0.545;
            group.add(hatCrown);
        } else {
            const sugegasa = new THREE.Mesh(new THREE.ConeGeometry(0.145, 0.06, 12), new THREE.MeshStandardMaterial({ color: 0xd4b068, roughness: 0.85 }));
            sugegasa.position.y = 0.525;
            sugegasa.castShadow = true;
            group.add(sugegasa);
        }

        // 3. Draped Kimono Sleeves (Tamoto)
        const armGeo = new THREE.BoxGeometry(0.035, 0.16, 0.065);
        const armL = new THREE.Mesh(armGeo, kimonoMat);
        armL.position.set(-0.068, 0.30, 0);
        group.add(armL);
        const armR = new THREE.Mesh(armGeo, kimonoMat);
        armR.position.set(0.068, 0.30, 0);
        group.add(armR);

        // 4. Articulated Lower Legs & Wooden Geta Sandals
        const legGeo = new THREE.CylinderGeometry(0.024, 0.020, 0.16, 6);
        const legL = new THREE.Mesh(legGeo, kimonoMat);
        legL.position.set(-0.028, 0.09, 0);
        group.add(legL);
        const legR = new THREE.Mesh(legGeo, kimonoMat);
        legR.position.set(0.028, 0.09, 0);
        group.add(legR);

        const getaMat = new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.85 });
        const getaGeo = new THREE.BoxGeometry(0.036, 0.018, 0.068);
        const getaL = new THREE.Mesh(getaGeo, getaMat);
        getaL.position.set(-0.028, 0.01, 0.01);
        group.add(getaL);
        const getaR = new THREE.Mesh(getaGeo, getaMat);
        getaR.position.set(0.028, 0.01, 0.01);
        group.add(getaR);

        // 5. Traditional Japanese Oil-Paper Umbrella (Janome-gasa)
        if (Math.random() < 0.50) {
            const umbrellaGroup = new THREE.Group();
            umbrellaGroup.position.set(0.085, 0.32, 0.04);
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.42, 4), new THREE.MeshLambertMaterial({ color: 0x8a7042 }));
            shaft.position.y = 0.21;
            umbrellaGroup.add(shaft);

            const uColors = [0xa83222, 0x243b55, 0xc8961e, 0x3b5932];
            const uColor = uColors[Math.floor(Math.random() * uColors.length)];
            const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.085, 12), new THREE.MeshStandardMaterial({ color: uColor, roughness: 0.75 }));
            canopy.position.y = 0.41;
            canopy.rotation.x = 0.14;
            canopy.castShadow = true;
            umbrellaGroup.add(canopy);
            group.add(umbrellaGroup);
        }

        group.userData = { armL, armR, legL, legR, getaL, getaR };
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
        const roadTiles = [];

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (this.grid.isRoadTile ? this.grid.isRoadTile(tile) : (tile.type === CONFIG.TYPES.ROAD)) {
                roadTiles.push(tile);
            }
        }

        if (roadTiles.length < 2) {
            this.roadNetworkDirty = false;
            return;
        }

        const sampleCount = Math.min(6, Math.floor(roadTiles.length / 3) + 1);
        for (let i = 0; i < sampleCount; i++) {
            const start = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            const end = roadTiles[Math.floor(Math.random() * roadTiles.length)];
            if (start.x === end.x && start.y === end.y) continue;

            const path = this.bfsRoadPath(start, end);
            if (path && path.length >= 3) {
                this.cachedPaths.push(path);
            }
        }

        this.roadNetworkDirty = false;
    }

    // Retrieve a cached road path (rebuilding cache if road topology changed)
    findAmbientRoadPath() {
        if (this.roadNetworkDirty || this.cachedPaths.length === 0) {
            this.rebuildPathCache();
        }
        if (this.cachedPaths.length === 0) return null;
        return this.cachedPaths[Math.floor(Math.random() * this.cachedPaths.length)];
    }

    // Spawn an ambient street agent
    spawnAmbientAgent() {
        const path = this.findAmbientRoadPath();
        if (!path || path.length < 2) return;

        const isRickshaw = Math.random() < 0.40;
        const mesh = isRickshaw ? this.createRickshawMesh() : this.createPedestrianMesh();

        const startTile = path[0];
        const startPos = this.getTileWorldPos(startTile.x, startTile.y);
        mesh.position.set(startPos.x, 0, startPos.z);
        this.scene.add(mesh);

        const waypoints = path.map(t => {
            const p = this.getTileWorldPos(t.x, t.y);
            return new THREE.Vector3(p.x, 0, p.z);
        });

        this.ambientAgents.push({
            mesh,
            waypoints,
            waypointIndex: 0,
            progress: 0,
            speed: isRickshaw ? 2.8 : 1.3,
            isRickshaw,
            reverseOnComplete: Math.random() < 0.50
        });
    }

    // Advance agent positions and procedural walking limb animations
    update(speedMult = 1.0, delta = 0.016) {
        if (!delta || delta <= 0) return;
        this.animTime += delta * (speedMult > 0 ? speedMult : 0);

        // Advance emergency brigade hand-pump carts
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

            // Animate runner legs & pump handle
            if (c.mesh.userData.runner?.userData) {
                const r = c.mesh.userData.runner.userData;
                const legSwing = Math.sin(this.animTime * 14) * 0.45;
                if (r.legL) r.legL.rotation.x = legSwing;
                if (r.legR) r.legR.rotation.x = -legSwing;
            }
            if (c.mesh.userData.wheels) {
                for (const w of c.mesh.userData.wheels) {
                    w.rotation.x += delta * 12 * speedMult;
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

            // Procedural walking animation
            if (agent.isRickshaw) {
                // Shafu runner leg swing & wheel rotation
                if (agent.mesh.userData.runner?.userData) {
                    const r = agent.mesh.userData.runner.userData;
                    const legSwing = Math.sin(this.animTime * 10) * 0.40;
                    if (r.legL) r.legL.rotation.x = legSwing;
                    if (r.legR) r.legR.rotation.x = -legSwing;
                }
                if (agent.mesh.userData.wheels) {
                    for (const w of agent.mesh.userData.wheels) {
                        w.rotation.x += delta * 8 * speedMult;
                    }
                }
            } else {
                // Pedestrian limb swing & subtle vertical bob
                const u = agent.mesh.userData;
                const stride = Math.sin(this.animTime * 7) * 0.32;
                if (u.legL) u.legL.rotation.x = stride;
                if (u.legR) u.legR.rotation.x = -stride;
                if (u.armL) u.armL.rotation.x = -stride;
                if (u.armR) u.armR.rotation.x = stride;
                agent.mesh.position.y = Math.abs(Math.sin(this.animTime * 14)) * 0.02;
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
