// Project Meiji - 1870s Steam Locomotive Railway Traffic (trainTraffic.js)
// Articulated Shimbashi-Yokohama locomotive & coach routing, live track reconciliation, depot stops & passenger boarding

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { MaterialLibrary } from './materialLibrary.js';
import { PBRTextureGenerator } from './pbrTextureGenerator.js';
import { TrainMeshes } from './trainMeshes.js';
import { StationPassengerManager } from './stationPassengers.js';
import {
    isDepotTile,
    evaluateBezier,
    evaluateBezierTangent,
    findRailNetworks as discoverRailNetworks,
    computeNetworkSignature,
    buildRailRouteData,
    sampleRouteAtDistance,
    projectPositionOntoRoute
} from './railRouteBuilder.js';

export class TrainTrafficManager {
    constructor(scene, gridModel, getTileWorldPosFn, modelCache = null, options = null) {
        this.scene = scene;
        this.grid = gridModel;
        this.getTileWorldPos = getTileWorldPosFn;
        this.modelCache = modelCache;
        this.trains = [];
        this.maxTrains = 1;
        this.spawnCheckTimer = 0;
        this.steamPuffs = [];
        this.puffTimer = 0;
        this.railNetworkDirty = true;

        this.stationPassengers = new StationPassengerManager(
            scene,
            gridModel,
            getTileWorldPosFn,
            options?.traffic || null,
            options?.getFacingAngle || null
        );

        if (this.grid && typeof this.grid.subscribe === 'function') {
            this.grid.subscribe((event) => {
                if (event === 'grid_reset') {
                    this.clearTrains();
                    this.stationPassengers.clearAll();
                    this.railNetworkDirty = true;
                } else if (event === 'tile_updated') {
                    this.railNetworkDirty = true;
                    this.stationPassengers.markDirty();
                }
            });
        }
    }

    static evaluateBezier(p0, p1, p2, t) {
        return evaluateBezier(p0, p1, p2, t);
    }

    static evaluateBezierTangent(p0, p1, p2, t) {
        return evaluateBezierTangent(p0, p1, p2, t);
    }

    findRailNetworks() {
        return discoverRailNetworks(this.grid);
    }

    buildRailRoute(networkTiles) {
        const data = buildRailRouteData(networkTiles, this.grid, this.getTileWorldPos);
        return data ? data.waypoints : null;
    }

    selectBestNetwork(networks, train = null) {
        if (!networks || networks.length === 0) return null;
        let bestNet = networks[0];
        let bestScore = -Infinity;
        const s = CONFIG.TILE_SIZE;
        const tx = train ? Math.floor(train.mesh.position.x / s) : -999;
        const ty = train ? Math.floor(train.mesh.position.z / s) : -999;

        for (const net of networks) {
            let score = net.length;
            let onTrainTile = false;
            let overlap = 0;
            for (const c of net) {
                if (isDepotTile(this.grid.getTile(c.x, c.y))) score += 250;
                if (train && c.x === tx && c.y === ty) onTrainTile = true;
                if (train?.networkTileKeys?.has(`${c.x},${c.y}`)) overlap++;
            }
            if (onTrainTile) score += 1000;
            score += overlap * 5;
            if (score > bestScore) {
                bestScore = score;
                bestNet = net;
            }
        }
        return bestNet;
    }

    getTrainDistance(train) {
        const metrics = train.routeMetrics;
        if (train.forward || train.isLoop) {
            if (train.waypointIndex >= metrics.segCount) return metrics.totalLen;
            const idx = Math.max(0, train.waypointIndex);
            return metrics.cumDist[idx] + metrics.segLens[idx] * train.progress;
        }
        const wpIdx = Math.max(0, Math.min(train.waypoints.length - 1, train.waypointIndex));
        const prevLen = wpIdx > 0 ? metrics.segLens[wpIdx - 1] : 0;
        return metrics.cumDist[wpIdx] - prevLen * train.progress;
    }

    applyRouteToTrain(train, routeData, sLoco) {
        train.waypoints = routeData.waypoints;
        train.isLoop = routeData.isLoop;
        train.routeMetrics = routeData.metrics;
        train.networkSignature = routeData.networkSignature;
        train.networkTileKeys = routeData.networkTileKeys;
        train.networkSize = routeData.networkTileKeys.size;

        const maxD = routeData.metrics.totalLen;
        const clamped = routeData.isLoop ? ((sLoco % maxD) + maxD) % maxD : Math.max(0, Math.min(maxD, sLoco));
        const sample = sampleRouteAtDistance(routeData.metrics, clamped);
        if (train.forward || routeData.isLoop) {
            train.waypointIndex = sample.wpIdx;
            train.progress = sample.progress;
        } else {
            train.waypointIndex = Math.min(routeData.waypoints.length - 1, sample.wpIdx + 1);
            train.progress = 1 - sample.progress;
        }
        this.positionTrainConsist(train, 0);
    }

    reconcileNetworks() {
        this.railNetworkDirty = false;
        const networks = this.findRailNetworks();
        if (networks.length === 0) {
            this.clearTrains();
            return;
        }

        for (let i = this.trains.length - 1; i >= 0; i--) {
            const train = this.trains[i];
            const bestNet = this.selectBestNetwork(networks, train);
            if (computeNetworkSignature(bestNet) === train.networkSignature) continue;

            const routeData = buildRailRouteData(bestNet, this.grid, this.getTileWorldPos);
            if (!routeData || routeData.waypoints.length < 2) {
                this.removeTrainAt(i);
                continue;
            }

            const proj = projectPositionOntoRoute(
                train.mesh.position.x,
                train.mesh.position.z,
                routeData.metrics,
                train.lastMoveDir
            );
            const effSpacing = Math.min(train.carSpacing, routeData.metrics.totalLen * 0.45);
            if (proj.dist <= CONFIG.TILE_SIZE * 0.48) {
                const targetDist = routeData.isLoop ? proj.s : Math.max(effSpacing, proj.s);
                this.applyRouteToTrain(train, routeData, targetDist);
            } else {
                // Rail directly underneath train was removed -> relocate cleanly onto rebuilt track
                train.dwellTimer = 0;
                train.forward = true;
                train.lastDepotKey = null;
                const resetDist = routeData.isLoop ? 0 : Math.min(effSpacing, routeData.metrics.totalLen);
                this.applyRouteToTrain(train, routeData, resetDist);
            }
        }
    }

    spawnTrain() {
        if (this.trains.length >= this.maxTrains) return;
        const networks = this.findRailNetworks();
        const network = this.selectBestNetwork(networks, null);
        if (!network) return;

        const routeData = buildRailRouteData(network, this.grid, this.getTileWorldPos);
        if (!routeData || routeData.waypoints.length < 2) return;

        const consist = TrainMeshes.createTrainConsist();
        this.scene.add(consist.locoMesh);
        this.scene.add(consist.coachMesh);

        const effSpacing = routeData.isLoop ? consist.carSpacing : Math.min(consist.carSpacing, routeData.metrics.totalLen * 0.45);
        const train = {
            mesh: consist.locoMesh,
            coachMesh: consist.coachMesh,
            carSpacing: consist.carSpacing,
            waypoints: routeData.waypoints,
            isLoop: routeData.isLoop,
            routeMetrics: routeData.metrics,
            networkSignature: routeData.networkSignature,
            networkTileKeys: routeData.networkTileKeys,
            networkSize: network.length,
            waypointIndex: 0,
            progress: 0,
            speed: 3.6,
            forward: true,
            dwellTimer: 0,
            lastDepotKey: null,
            lastMoveDir: { x: 0, z: -1 },
            passengerCount: 2,
            passengerOrigins: ['__initial__', '__initial__'],
            disposed: false
        };
        this.applyRouteToTrain(train, routeData, routeData.isLoop ? 0 : effSpacing);
        this.trains.push(train);
    }

    positionTrainConsist(train, distMoved = 0) {
        const metrics = train.routeMetrics;
        const sLoco = this.getTrainDistance(train);
        const locoPose = sampleRouteAtDistance(metrics, sLoco);
        train.mesh.position.set(locoPose.x, locoPose.y, locoPose.z);
        if (Math.hypot(locoPose.dirX, locoPose.dirZ) > 0.001) {
            train.mesh.rotation.y = Math.atan2(locoPose.dirX, locoPose.dirZ) + Math.PI;
            train.lastMoveDir = { x: locoPose.dirX, z: locoPose.dirZ };
        }

        const effSpacing = train.isLoop ? train.carSpacing : Math.min(train.carSpacing, metrics.totalLen * 0.45);
        const sCoach = train.isLoop ? sLoco - effSpacing : Math.max(0, sLoco - effSpacing);
        const coachPose = sampleRouteAtDistance(metrics, sCoach);
        train.coachMesh.position.set(coachPose.x, coachPose.y, coachPose.z);
        if (Math.hypot(coachPose.dirX, coachPose.dirZ) > 0.001) {
            train.coachMesh.rotation.y = Math.atan2(coachPose.dirX, coachPose.dirZ) + Math.PI;
        }

        TrainMeshes.updateTrainVisuals(train.mesh, train.coachMesh, distMoved, train.passengerCount);
    }

    triggerDepotArrival(train, depotCoord) {
        if (!depotCoord) return;
        const dKey = `${depotCoord.x},${depotCoord.y}`;
        if (dKey === train.lastDepotKey) return;
        train.dwellTimer = 3.0;
        train.lastDepotKey = dKey;
        this.stationPassengers.onTrainArriveAtDepot(train, depotCoord);
    }

    emitSteamPuff(train) {
        const rotY = train.mesh.rotation.y;
        const stackX = train.mesh.position.x - 0.33 * Math.sin(rotY);
        const stackZ = train.mesh.position.z - 0.33 * Math.cos(rotY);
        const stackY = train.mesh.position.y + 0.585;
        const smokeTex = PBRTextureGenerator.getParticleTexture('smoke');
        const puff = (smokeTex && typeof THREE.Sprite === 'function' && typeof THREE.SpriteMaterial === 'function')
            ? new THREE.Sprite(new THREE.SpriteMaterial({
                map: smokeTex, color: 0xf4f7fc, transparent: true, opacity: 0.65, depthWrite: false
            }))
            : new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 6, 5),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.65, depthWrite: false })
            );
        const baseScale = puff.isSprite ? 0.22 : 1.0;
        if (puff.isSprite) puff.scale.set(baseScale, baseScale, 1);
        puff.position.set(stackX + (Math.random() - 0.5) * 0.05, stackY, stackZ + (Math.random() - 0.5) * 0.05);
        this.scene.add(puff);
        this.steamPuffs.push({
            mesh: puff, baseScale, age: 0, maxAge: 1.2,
            driftX: (Math.random() - 0.5) * 0.16, driftZ: (Math.random() - 0.5) * 0.16,
            upSpeed: 0.36 + Math.random() * 0.20
        });
    }

    updateSteamPuffs(effectiveDelta) {
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
                const sScale = p.baseScale * (1 + ratio * 1.8);
                p.mesh.scale.set(sScale, sScale, sScale);
                p.mesh.material.opacity = Math.max(0, 0.65 * (1 - ratio));
            }
        }
    }

    update(delta, speedMultiplier = 1.0) {
        if (this.railNetworkDirty) this.reconcileNetworks();
        this.stationPassengers.update(delta, speedMultiplier);

        const effectiveDelta = delta * speedMultiplier;
        if (effectiveDelta <= 0) return;

        this.spawnCheckTimer += effectiveDelta;
        if (this.spawnCheckTimer >= 2.5) {
            this.spawnCheckTimer = 0;
            if (this.trains.length < this.maxTrains) this.spawnTrain();
        }
        this.updateSteamPuffs(effectiveDelta);

        for (const train of this.trains) {
            if (train.dwellTimer > 0) {
                train.dwellTimer -= effectiveDelta;
                TrainMeshes.updateTrainVisuals(train.mesh, train.coachMesh, 0, train.passengerCount);
                continue;
            }

            const wps = train.waypoints;
            const metrics = train.routeMetrics;
            const nextIdx = train.forward ? train.waypointIndex + 1 : train.waypointIndex - 1;
            if (!train.isLoop && ((train.forward && nextIdx >= wps.length) || (!train.forward && nextIdx < 0))) {
                train.forward = !train.forward;
                continue;
            }

            const wrapNext = train.isLoop ? ((nextIdx % wps.length) + wps.length) % wps.length : nextIdx;
            const from = wps[train.waypointIndex];
            const to = wps[wrapNext];
            const segDist = Math.hypot(to.x - from.x, to.z - from.z);
            if (segDist < 0.001) {
                train.waypointIndex = wrapNext;
                train.progress = 0;
                continue;
            }

            const signedMove = train.speed * effectiveDelta;
            train.progress += signedMove / segDist;

            this.puffTimer += effectiveDelta;
            if (this.puffTimer >= 0.35) {
                this.puffTimer = 0;
                this.emitSteamPuff(train);
            }

            const effSpacing = train.isLoop ? train.carSpacing : Math.min(train.carSpacing, metrics.totalLen * 0.45);
            if (!train.isLoop && !train.forward && this.getTrainDistance(train) <= effSpacing) {
                const clamp = sampleRouteAtDistance(metrics, effSpacing);
                train.waypointIndex = clamp.wpIdx;
                train.progress = clamp.progress;
                train.forward = true;
                if (wps[0].isDepot) this.triggerDepotArrival(train, wps[0].depotCoord);
            } else if (train.progress >= 1.0) {
                train.waypointIndex = wrapNext;
                train.progress = 0;
                if (to.isDepot) {
                    this.triggerDepotArrival(train, to.depotCoord);
                } else if (!from.isDepot) {
                    train.lastDepotKey = null;
                }
            }

            this.positionTrainConsist(train, train.forward ? signedMove : -signedMove);
        }
    }

    removeTrainAt(idx) {
        const train = this.trains[idx];
        if (!train) return;
        train.disposed = true;
        if (train.mesh) {
            this.scene.remove(train.mesh);
            MaterialLibrary.disposeGroup(train.mesh);
        }
        if (train.coachMesh) {
            this.scene.remove(train.coachMesh);
            MaterialLibrary.disposeGroup(train.coachMesh);
        }
        this.trains.splice(idx, 1);
    }

    clearTrains() {
        for (let i = this.trains.length - 1; i >= 0; i--) this.removeTrainAt(i);
    }

    dispose() {
        this.clearTrains();
        this.stationPassengers.dispose();
        for (const p of this.steamPuffs) {
            this.scene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
        }
        this.steamPuffs = [];
    }
}
