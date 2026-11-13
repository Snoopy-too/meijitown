// Project Meiji - Train Station Pedestrians, Boarding & Disembarking (stationPassengers.js)
// Walks citizens from nearby roads onto rail-side depot platforms, boards waiting riders on train arrival,
// and disembarks arriving travelers onto connected town streets.

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from './materialLibrary.js';

const PLATFORM_Y = 0.163;
const PLATFORM_SLOTS = [
    { lx: 0.22, lz: -0.48 },
    { lx: 0.44, lz: -0.46 },
    { lx: -0.10, lz: -0.40 },
    { lx: 0.64, lz: -0.48 }
];

const DEFAULT_WALKABLE_TYPES = new Set([
    CONFIG.TYPES.EMPTY,
    CONFIG.TYPES.FOREST,
    CONFIG.TYPES.PARK,
    CONFIG.TYPES.PUBLIC_SQUARE
]);

export class StationPassengerManager {
    constructor(scene, gridModel, getTileWorldPosFn, trafficManager = null, getFacingAngleFn = null) {
        this.scene = scene;
        this.grid = gridModel;
        this.getTileWorldPos = getTileWorldPosFn;
        this.traffic = trafficManager;
        this.getFacingAngleFn = getFacingAngleFn;

        /** @type {Map<string, object>} */
        this.stations = new Map();
        this.passengers = [];
        this.dirty = true;
        this.spawnTimer = 0.5;
        this.animTime = 0;
        this.maxPassengers = 24;
        this.maxStationWaiters = 4;
    }

    markDirty() {
        this.dirty = true;
    }

    computeFacingAngle(x, y) {
        if (typeof this.getFacingAngleFn === 'function') {
            return this.getFacingAngleFn(x, y);
        }
        const tile = this.grid.getTile(x, y);
        if (tile && tile.manualRotation) {
            return ((tile.rotation || 0) % 4) * (Math.PI / 2);
        }
        const isRailLink = (dx, dy) => {
            const t = this.grid.getTile(x + dx, y + dy);
            return Boolean(t && (t.type === CONFIG.TYPES.RAIL ||
                (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT)));
        };
        const isRoadLink = (dx, dy) => {
            const t = this.grid.getTile(x + dx, y + dy);
            return Boolean(t && (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge)));
        };

        const railNS = isRailLink(0, -1) || isRailLink(0, 1);
        const railEW = isRailLink(-1, 0) || isRailLink(1, 0);
        if (railNS && !railEW) return isRoadLink(1, 0) ? -Math.PI / 2 : Math.PI / 2;
        if (railEW && !railNS) return isRoadLink(0, 1) ? Math.PI : 0;
        return tile?.rotation ? (tile.rotation % 4) * (Math.PI / 2) : 0;
    }

    localToWorld(center, facingAngle, lx, ly, lz) {
        const cos = Math.cos(facingAngle);
        const sin = Math.sin(facingAngle);
        return {
            x: center.x + lx * cos + lz * sin,
            y: ly,
            z: center.z - lx * sin + lz * cos
        };
    }

    isRoadTile(tile) {
        if (!tile) return false;
        if (typeof this.grid.isRoadTile === 'function') return this.grid.isRoadTile(tile);
        return tile.type === CONFIG.TYPES.ROAD ||
            (tile.type === CONFIG.TYPES.CANAL && tile.hasBridge) ||
            (tile.type === CONFIG.TYPES.RAIL && tile.hasCrossing);
    }

    findNearbyEntryRoads(sx, sy) {
        const results = [];
        const visited = new Set([`${sx},${sy}`]);
        const queue = [{ x: sx, y: sy, dist: 0 }];
        let head = 0;

        while (head < queue.length) {
            const curr = queue[head++];
            if (curr.dist >= 2) continue;

            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const nx = curr.x + dx;
                const ny = curr.y + dy;
                const key = `${nx},${ny}`;
                if (visited.has(key) || !this.grid.isValidCoord(nx, ny)) continue;
                visited.add(key);

                const nt = this.grid.getTile(nx, ny);
                if (!nt) continue;

                const nextDist = curr.dist + 1;
                if (this.isRoadTile(nt)) {
                    results.push({ x: nx, y: ny, dist: nextDist });
                } else if (nextDist < 2 && DEFAULT_WALKABLE_TYPES.has(nt.type)) {
                    queue.push({ x: nx, y: ny, dist: nextDist });
                }
            }
        }

        // Also allow diagonal corner road access at Chebyshev dist 1 if unobstructed on either flank
        if (results.length === 0) {
            for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                const nx = sx + dx;
                const ny = sy + dy;
                if (!this.grid.isValidCoord(nx, ny)) continue;
                const nt = this.grid.getTile(nx, ny);
                if (!this.isRoadTile(nt)) continue;
                const f1 = this.grid.getTile(sx + dx, sy);
                const f2 = this.grid.getTile(sx, sy + dy);
                if ((f1 && DEFAULT_WALKABLE_TYPES.has(f1.type)) || (f2 && DEFAULT_WALKABLE_TYPES.has(f2.type))) {
                    results.push({ x: nx, y: ny, dist: 1.5 });
                }
            }
        }

        results.sort((a, b) => a.dist - b.dist);
        return results;
    }

    findRoadWalkPath(entryCoord, minDepth = 3, maxDepth = 11) {
        const startKey = `${entryCoord.x},${entryCoord.y}`;
        const parent = new Map([[startKey, null]]);
        const depth = new Map([[startKey, 0]]);
        const coordByKey = new Map([[startKey, { x: entryCoord.x, y: entryCoord.y }]]);
        const queue = [{ x: entryCoord.x, y: entryCoord.y }];
        const farCandidates = [];
        const nearCandidates = [];
        let head = 0;

        while (head < queue.length && parent.size < 250) {
            const curr = queue[head++];
            const cKey = `${curr.x},${curr.y}`;
            const cDepth = depth.get(cKey);
            if (cDepth >= minDepth) {
                farCandidates.push(cKey);
            } else if (cDepth >= 1) {
                nearCandidates.push(cKey);
            }
            if (cDepth >= maxDepth) continue;

            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                const nx = curr.x + dx;
                const ny = curr.y + dy;
                const nKey = `${nx},${ny}`;
                if (parent.has(nKey) || !this.grid.isValidCoord(nx, ny)) continue;
                const nt = this.grid.getTile(nx, ny);
                if (!this.isRoadTile(nt)) continue;

                parent.set(nKey, cKey);
                depth.set(nKey, cDepth + 1);
                coordByKey.set(nKey, { x: nx, y: ny });
                queue.push({ x: nx, y: ny });
            }
        }

        const pool = farCandidates.length > 0 ? farCandidates : (nearCandidates.length > 0 ? nearCandidates : [startKey]);
        const pickedKey = pool[Math.floor(Math.random() * pool.length)];

        // Build path from pickedKey back to entryCoord
        const path = [];
        let trace = pickedKey;
        while (trace !== null) {
            path.push(coordByKey.get(trace));
            trace = parent.get(trace);
        }
        return path; // [origin -> ... -> entryCoord]
    }

    getSurfaceY(wx, wz) {
        const s = CONFIG.TILE_SIZE;
        const tx = Math.floor(wx / s);
        const ty = Math.floor(wz / s);
        if (!this.grid || !this.grid.isValidCoord(tx, ty)) return 0.04;
        const tile = this.grid.getTile(tx, ty);
        if (!tile) return 0.04;

        if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) {
            return PLATFORM_Y;
        }
        if (this.traffic && typeof this.traffic.getSurfacePose === 'function' && this.isRoadTile(tile)) {
            return this.traffic.getSurfacePose(wx, wz).y;
        }
        if (tile.type === CONFIG.TYPES.RAIL && tile.hasCrossing) {
            return tile.roadTier === 2 ? 0.075 : 0.066;
        }
        if (tile.type === CONFIG.TYPES.ROAD) {
            return tile.roadTier === 2 ? 0.068 : 0.058;
        }
        if (tile.type === CONFIG.TYPES.CANAL && tile.hasBridge) {
            return 0.14;
        }
        return 0.032;
    }

    createPassengerMesh() {
        if (this.traffic && typeof this.traffic.createPedestrianMesh === 'function') {
            return this.traffic.createPedestrianMesh();
        }
        const group = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.16, 0.07),
            new THREE.MeshStandardMaterial({ color: 0x35586e, roughness: 0.85 })
        );
        body.position.y = 0.21;
        group.add(body);
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.065, 0.07, 0.065),
            new THREE.MeshStandardMaterial({ color: 0xe3bfa0, roughness: 0.80 })
        );
        head.position.y = 0.34;
        group.add(head);
        group.userData = { isFallbackPassenger: true };
        return group;
    }

    rebuildStations() {
        this.dirty = false;
        const validKeys = new Set();

        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);
                if (!tile || tile.type !== CONFIG.TYPES.SERVICE || tile.serviceType !== CONFIG.SERVICES.TRAIN_DEPOT) {
                    continue;
                }
                const key = `${x},${y}`;
                validKeys.add(key);

                const center = this.getTileWorldPos(x, y);
                const facingAngle = this.computeFacingAngle(x, y);
                const entryRoads = this.findNearbyEntryRoads(x, y);
                const slots = PLATFORM_SLOTS.map(s => this.localToWorld(center, facingAngle, s.lx, PLATFORM_Y, s.lz));
                const entrance = this.localToWorld(center, facingAngle, 0.28, PLATFORM_Y, -0.84);
                const doorApron = this.localToWorld(center, facingAngle, 0.25, PLATFORM_Y, -0.29);

                this.stations.set(key, {
                    key,
                    x,
                    y,
                    center,
                    facingAngle,
                    entryRoads,
                    slots,
                    entrance,
                    doorApron
                });
            }
        }

        for (const key of this.stations.keys()) {
            if (!validKeys.has(key)) this.stations.delete(key);
        }

        // Remove passengers tied to bulldozed stations
        for (let i = this.passengers.length - 1; i >= 0; i--) {
            if (!this.stations.has(this.passengers[i].stationKey)) {
                this.removePassengerAt(i);
            }
        }
    }

    countStationInboundOrWaiting(stationKey) {
        let count = 0;
        for (const p of this.passengers) {
            if (p.stationKey === stationKey && (p.state === 'WALKING_TO_STATION' || p.state === 'WAITING_ON_PLATFORM')) {
                count++;
            }
        }
        return count;
    }

    pickWaitingSlot(station) {
        const occupied = new Set();
        for (const p of this.passengers) {
            if (p.stationKey === station.key && typeof p.slotIdx === 'number' &&
                (p.state === 'WALKING_TO_STATION' || p.state === 'WAITING_ON_PLATFORM')) {
                occupied.add(p.slotIdx);
            }
        }
        for (let i = 0; i < station.slots.length; i++) {
            if (!occupied.has(i)) return i;
        }
        return Math.floor(Math.random() * station.slots.length);
    }

    spawnInboundCommuter(station) {
        if (!station || station.entryRoads.length === 0) return null;
        if (this.passengers.length >= this.maxPassengers) return null;
        if (this.countStationInboundOrWaiting(station.key) >= this.maxStationWaiters) return null;

        const entry = station.entryRoads[Math.floor(Math.random() * station.entryRoads.length)];
        const roadTiles = this.findRoadWalkPath(entry, 3, 10);
        const slotIdx = this.pickWaitingSlot(station);
        const slotPos = station.slots[slotIdx];

        const waypoints = roadTiles.map((c, idx) => {
            const p = this.getTileWorldPos(c.x, c.y);
            const jitter = idx === roadTiles.length - 1 ? 0.14 : 0.22;
            const wx = p.x + (Math.random() - 0.5) * jitter;
            const wz = p.z + (Math.random() - 0.5) * jitter;
            return { x: wx, y: this.getSurfaceY(wx, wz), z: wz, onPlatform: false };
        });

        waypoints.push({ x: station.entrance.x, y: PLATFORM_Y, z: station.entrance.z, onPlatform: true });
        waypoints.push({ x: slotPos.x, y: PLATFORM_Y, z: slotPos.z, onPlatform: true });

        const mesh = this.createPassengerMesh();
        const start = waypoints[0];
        mesh.position.set(start.x, start.y, start.z);
        this.scene.add(mesh);

        const p = {
            mesh,
            stationKey: station.key,
            slotIdx,
            state: 'WALKING_TO_STATION',
            waypoints,
            wpIndex: 1,
            speed: 0.9 + Math.random() * 0.28,
            delayTimer: 0,
            boardTimer: 0,
            targetTrain: null,
            phase: Math.random() * Math.PI * 2,
            facingTrackAngle: station.facingAngle
        };
        this.passengers.push(p);
        return p;
    }

    spawnDisembarkingPassenger(station, delay = 0.2, slotOffset = 0) {
        if (!station || this.passengers.length >= this.maxPassengers + 4) return null;

        const lx = -0.05 + (slotOffset % 3) * 0.24;
        const startWorld = this.localToWorld(station.center, station.facingAngle, lx, PLATFORM_Y, -0.32);

        const waypoints = [startWorld];
        if (station.entryRoads.length > 0) {
            const entry = station.entryRoads[0];
            const pathToOrigin = this.findRoadWalkPath(entry, 3, 9);
            const outwardRoad = [...pathToOrigin].reverse(); // [entryRoad -> ... -> townDest]
            waypoints.push({ x: station.entrance.x, y: PLATFORM_Y, z: station.entrance.z, onPlatform: true });
            for (const c of outwardRoad) {
                const pos = this.getTileWorldPos(c.x, c.y);
                const wx = pos.x + (Math.random() - 0.5) * 0.20;
                const wz = pos.z + (Math.random() - 0.5) * 0.20;
                waypoints.push({ x: wx, y: this.getSurfaceY(wx, wz), z: wz, onPlatform: false });
            }
        } else {
            // Roadless rural halt: walk into the waiting shelter before disappearing inside
            const shelterExit = this.localToWorld(station.center, station.facingAngle, 0.20, PLATFORM_Y, -0.76);
            waypoints.push({ x: shelterExit.x, y: PLATFORM_Y, z: shelterExit.z, onPlatform: true });
        }

        const mesh = this.createPassengerMesh();
        mesh.position.set(startWorld.x, startWorld.y, startWorld.z);
        mesh.visible = delay <= 0;
        this.scene.add(mesh);

        const p = {
            mesh,
            stationKey: station.key,
            slotIdx: -1,
            state: 'WALKING_FROM_STATION',
            waypoints,
            wpIndex: 1,
            speed: 0.88 + Math.random() * 0.24,
            delayTimer: delay,
            boardTimer: 0,
            targetTrain: null,
            phase: Math.random() * Math.PI * 2,
            facingTrackAngle: station.facingAngle
        };
        this.passengers.push(p);
        return p;
    }

    /**
     * Triggered when a train arrives and dwells at a depot:
     * 1) Disembarks passengers from other stations onto the platform/roads.
     * 2) Transitions waiting platform commuters to step toward the coach & board.
     */
    onTrainArriveAtDepot(train, depotCoord) {
        if (!depotCoord || !train) return;
        if (this.dirty) this.rebuildStations();

        const key = `${depotCoord.x},${depotCoord.y}`;
        const station = this.stations.get(key);
        if (!station) return;

        // 1. Disembark arriving riders (prioritize riders boarded at other stations)
        if (!Array.isArray(train.passengerOrigins)) {
            train.passengerOrigins = [];
        }
        let alightCount = 0;
        for (let i = train.passengerOrigins.length - 1; i >= 0 && alightCount < 2; i--) {
            if (train.passengerOrigins[i] !== key) {
                train.passengerOrigins.splice(i, 1);
                alightCount++;
            }
        }
        if (alightCount === 0 && (train.passengerCount || 0) >= 2 && station.entryRoads.length > 0) {
            alightCount = 1;
        }

        for (let i = 0; i < alightCount; i++) {
            train.passengerCount = Math.max(0, (train.passengerCount || 0) - 1);
            this.spawnDisembarkingPassenger(station, 0.18 + i * 0.36, i);
        }

        // 2. Board waiting platform passengers into the train
        let boardOrder = 0;
        for (const p of this.passengers) {
            if (p.stationKey === key && p.state === 'WAITING_ON_PLATFORM') {
                p.state = 'BOARDING';
                p.delayTimer = 0.22 + boardOrder * 0.32;
                p.boardTimer = 0.38;
                p.targetTrain = train;
                p.boardTarget = this.localToWorld(
                    station.center,
                    station.facingAngle,
                    0.12 + (boardOrder % 3) * 0.18,
                    PLATFORM_Y,
                    -0.29
                );
                boardOrder++;
            }
        }
    }

    animateLimbs(p, isMoving, effectiveDelta) {
        const u = p.mesh.userData;
        if (!u || u.isFallbackPassenger) return;
        if (isMoving) {
            const stride = Math.sin(this.animTime * 9.5 + p.phase);
            if (u.legL && u.legR) {
                u.legL.rotation.x = stride * 0.48;
                u.legR.rotation.x = -stride * 0.48;
            }
            if (u.armL && u.armR) {
                u.armL.rotation.x = -stride * 0.38;
                u.armR.rotation.x = stride * 0.38;
            }
            if (u.shinL && u.shinR) {
                u.shinL.rotation.x = Math.max(0, -stride * 0.55);
                u.shinR.rotation.x = Math.max(0, stride * 0.55);
            }
            p.mesh.position.y += Math.abs(stride) * 0.014;
        } else {
            if (u.legL) u.legL.rotation.x *= 0.85;
            if (u.legR) u.legR.rotation.x *= 0.85;
            if (u.armL) u.armL.rotation.x *= 0.85;
            if (u.armR) u.armR.rotation.x *= 0.85;
        }
    }

    stepAlongWaypoints(p, dt) {
        if (p.wpIndex >= p.waypoints.length) return true;
        const target = p.waypoints[p.wpIndex];
        const dx = target.x - p.mesh.position.x;
        const dz = target.z - p.mesh.position.z;
        const dist = Math.hypot(dx, dz);

        if (dist <= 0.04) {
            p.mesh.position.set(target.x, target.y, target.z);
            p.wpIndex++;
            return p.wpIndex >= p.waypoints.length;
        }

        const step = Math.min(dist, p.speed * dt);
        const nx = p.mesh.position.x + (dx / dist) * step;
        const nz = p.mesh.position.z + (dz / dist) * step;
        const baseY = target.onPlatform ? PLATFORM_Y : this.getSurfaceY(nx, nz);

        p.mesh.position.set(nx, baseY, nz);
        p.mesh.rotation.y = Math.atan2(dx, dz);
        return false;
    }

    removePassengerAt(idx) {
        const p = this.passengers[idx];
        if (!p) return;
        this.scene.remove(p.mesh);
        MaterialLibrary.disposeGroup(p.mesh);
        this.passengers.splice(idx, 1);
    }

    clearAll() {
        for (let i = this.passengers.length - 1; i >= 0; i--) {
            this.removePassengerAt(i);
        }
        this.stations.clear();
        this.dirty = true;
    }

    update(delta, speedMultiplier = 1.0) {
        if (this.dirty) {
            this.rebuildStations();
        }
        const effectiveDelta = delta * speedMultiplier;
        if (effectiveDelta <= 0) return;

        this.animTime += effectiveDelta;
        this.spawnTimer -= effectiveDelta;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = 1.8;
            for (const station of this.stations.values()) {
                if (station.entryRoads.length > 0 &&
                    this.countStationInboundOrWaiting(station.key) < this.maxStationWaiters) {
                    this.spawnInboundCommuter(station);
                }
            }
        }

        for (let i = this.passengers.length - 1; i >= 0; i--) {
            const p = this.passengers[i];
            if (p.delayTimer > 0) {
                p.delayTimer -= effectiveDelta;
                if (p.delayTimer <= 0) {
                    p.mesh.visible = true;
                }
                continue;
            }

            if (p.state === 'WALKING_TO_STATION') {
                const arrived = this.stepAlongWaypoints(p, effectiveDelta);
                this.animateLimbs(p, !arrived, effectiveDelta);
                if (arrived) {
                    p.state = 'WAITING_ON_PLATFORM';
                    p.mesh.position.y = PLATFORM_Y;
                    p.mesh.rotation.y = p.facingTrackAngle;
                }
            } else if (p.state === 'WAITING_ON_PLATFORM') {
                this.animateLimbs(p, false, effectiveDelta);
            } else if (p.state === 'BOARDING') {
                const target = p.boardTarget;
                if (target) {
                    const dx = target.x - p.mesh.position.x;
                    const dz = target.z - p.mesh.position.z;
                    const dist = Math.hypot(dx, dz);
                    if (dist > 0.02) {
                        const move = Math.min(dist, p.speed * 1.15 * effectiveDelta);
                        p.mesh.position.x += (dx / dist) * move;
                        p.mesh.position.z += (dz / dist) * move;
                        p.mesh.position.y = PLATFORM_Y;
                        p.mesh.rotation.y = Math.atan2(dx, dz);
                        this.animateLimbs(p, true, effectiveDelta);
                    }
                }
                p.boardTimer -= effectiveDelta;
                if (p.boardTimer <= 0) {
                    if (p.targetTrain && !p.targetTrain.disposed) {
                        p.targetTrain.passengerCount = Math.min(8, (p.targetTrain.passengerCount || 0) + 1);
                        if (!Array.isArray(p.targetTrain.passengerOrigins)) {
                            p.targetTrain.passengerOrigins = [];
                        }
                        p.targetTrain.passengerOrigins.push(p.stationKey);
                    }
                    this.removePassengerAt(i);
                }
            } else if (p.state === 'WALKING_FROM_STATION') {
                const done = this.stepAlongWaypoints(p, effectiveDelta);
                this.animateLimbs(p, !done, effectiveDelta);
                if (done) {
                    this.removePassengerAt(i);
                }
            }
        }
    }

    dispose() {
        this.clearAll();
    }
}
