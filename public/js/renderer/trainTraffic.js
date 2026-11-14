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

    getEffectiveSpacing(train, metrics = train.routeMetrics) {
        return train.isLoop ? train.carSpacing : Math.min(train.carSpacing, metrics.totalLen * 0.45);
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

    setTrainRouteDistance(train, targetDist) {
        const metrics = train.routeMetrics;
        const maxD = metrics.totalLen;
        const clamped = train.isLoop ? ((targetDist % maxD) + maxD) % maxD : Math.max(0, Math.min(maxD, targetDist));
        const useForward = train.forward || train.isLoop;
        const sample = sampleRouteAtDistance(metrics, clamped, useForward);
        if (useForward) {
            if (sample.progress >= 1 - 1e-6 && sample.wpIdx + 1 <= metrics.segCount) {
                train.waypointIndex = train.isLoop ? (sample.wpIdx + 1) % train.waypoints.length : sample.wpIdx + 1;
                train.progress = 0;
            } else {
                train.waypointIndex = sample.wpIdx;
                train.progress = sample.progress;
            }
        } else if (sample.progress <= 1e-6) {
            train.waypointIndex = sample.wpIdx;
            train.progress = 0;
        } else {
            train.waypointIndex = Math.min(train.waypoints.length - 1, sample.wpIdx + 1);
            train.progress = 1 - sample.progress;
        }
    }

    reverseTrainAtTerminus(train) {
        const metrics = train.routeMetrics;
        const effSpacing = this.getEffectiveSpacing(train, metrics);
        const endWp = train.waypoints[train.waypointIndex];
        if (!endWp?.isDepot) {
            train.lastDepotKey = null;
        }
        train.forward = !train.forward;
        const targetDist = train.forward
            ? effSpacing
            : Math.max(0, metrics.totalLen - effSpacing);
        this.setTrainRouteDistance(train, targetDist);
        this.positionTrainConsist(train, 0);
    }

    applyRouteToTrain(train, routeData, sLoco) {
        train.waypoints = routeData.waypoints;
        train.isLoop = routeData.isLoop;
        if (routeData.isLoop) train.forward = true;
        train.routeMetrics = routeData.metrics;
        train.networkSignature = routeData.networkSignature;
        train.networkTileKeys = routeData.networkTileKeys;
        train.networkSize = routeData.networkTileKeys.size;

        this.setTrainRouteDistance(train, sLoco);
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

            const hint = (routeData.isLoop || train.forward)
                ? train.lastMoveDir
                : { x: -train.lastMoveDir.x, z: -train.lastMoveDir.z };
            const proj = projectPositionOntoRoute(
                train.mesh.position.x,
                train.mesh.position.z,
                routeData.metrics,
                hint
            );
            const effSpacing = routeData.isLoop ? train.carSpacing : Math.min(train.carSpacing, routeData.metrics.totalLen * 0.45);
            if (proj.dist <= CONFIG.TILE_SIZE * 0.48) {
                let targetDist = proj.s;
                if (!routeData.isLoop) {
                    targetDist = train.forward
                        ? Math.max(effSpacing, proj.s)
                        : Math.min(routeData.metrics.totalLen - effSpacing, proj.s);
                }
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
        const travelSign = (train.isLoop || train.forward) ? 1 : -1;
        const sLoco = this.getTrainDistance(train);
        const locoPose = sampleRouteAtDistance(metrics, sLoco, travelSign < 0);
        train.mesh.position.set(locoPose.x, locoPose.y, locoPose.z);
        const lDirX = locoPose.dirX * travelSign;
        const lDirZ = locoPose.dirZ * travelSign;
        if (Math.hypot(lDirX, lDirZ) > 0.001) {
            train.mesh.rotation.y = Math.atan2(lDirX, lDirZ) + Math.PI;
            train.lastMoveDir = { x: lDirX, z: lDirZ };
        }

        const effSpacing = this.getEffectiveSpacing(train, metrics);
        const sCoach = train.isLoop
            ? sLoco - effSpacing
            : (train.forward ? Math.max(0, sLoco - effSpacing) : Math.min(metrics.totalLen, sLoco + effSpacing));
        const coachPose = sampleRouteAtDistance(metrics, sCoach, travelSign > 0);
        train.coachMesh.position.set(coachPose.x, coachPose.y, coachPose.z);
        const cDirX = coachPose.dirX * travelSign;
        const cDirZ = coachPose.dirZ * travelSign;
        if (Math.hypot(cDirX, cDirZ) > 0.001) {
            train.coachMesh.rotation.y = Math.atan2(cDirX, cDirZ) + Math.PI;
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
                this.reverseTrainAtTerminus(train);
                continue;
            }

            if (!train.isLoop && train.progress === 0 && wps[train.waypointIndex]?.isUTurn) {
                const effSpacing = this.getEffectiveSpacing(train, metrics);
                const sTurn = metrics.cumDist[train.waypointIndex];
                const nextDist = train.forward
                    ? Math.min(metrics.totalLen, sTurn + effSpacing)
                    : Math.max(0, sTurn - effSpacing);
                this.setTrainRouteDistance(train, nextDist);
                this.positionTrainConsist(train, 0);
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

            if (train.progress >= 1.0) {
                train.waypointIndex = wrapNext;
                train.progress = 0;
                if (to.isDepot) {
                    this.triggerDepotArrival(train, to.depotCoord);
                } else if (!from.isDepot) {
                    train.lastDepotKey = null;
                }
            }

            this.positionTrainConsist(train, signedMove);
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
