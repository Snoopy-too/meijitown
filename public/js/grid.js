// Project Meiji - Client Spatial Grid Data Model
// ponytail: Map-based coordinate storage "x_y" => tile object, reactive change notifications

import { CONFIG } from './config.js';

export class CityGridModel {
    constructor(width = CONFIG.GRID_WIDTH, height = CONFIG.GRID_HEIGHT) {
        this.width = width;
        this.height = height;
        this.tiles = new Map();
        this.listeners = [];
    }

    getKey(x, y) {
        return `${x}_${y}`;
    }

    isValidCoord(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    getTile(x, y) {
        if (!this.isValidCoord(x, y)) return null;
        return this.tiles.get(this.getKey(x, y)) || {
            x,
            y,
            type: CONFIG.TYPES.EMPTY,
            zoneType: null,
            level: 0,
            occupied: false,
            stage: CONFIG.STAGES.NONE,
            constructionTicks: 0,
            ageTicks: 0,
            targetLevel: 1,
            roadTier: 1,
            hasBridge: false,
            hasCrossing: false,
            subType: null,
            rotation: 0,
        };
    }

    setTile(x, y, type, zoneType = null, level = 0, occupied = false, stage = CONFIG.STAGES.NONE, roadTier = 1, hasBridge = false, subType = null, rotation = 0, hasCrossing = false) {
        if (!this.isValidCoord(x, y)) return false;

        const key = this.getKey(x, y);
        if (type === CONFIG.TYPES.EMPTY) {
            this.tiles.delete(key);
        } else {
            this.tiles.set(key, {
                x,
                y,
                type,
                zoneType,
                level,
                occupied,
                stage,
                constructionTicks: 0,
                ageTicks: 0,
                targetLevel: level > 0 ? level : 1,
                roadTier: (type === CONFIG.TYPES.ROAD || (type === CONFIG.TYPES.CANAL && hasBridge) || (type === CONFIG.TYPES.RAIL && hasCrossing)) ? roadTier : 1,
                hasBridge: Boolean(hasBridge),
                hasCrossing: Boolean(hasCrossing),
                subType: subType || null,
                rotation: parseInt(rotation || 0, 10),
            });
        }

        this.notifyChange(x, y);
        return true;
    }

    clearTile(x, y) {
        return this.setTile(x, y, CONFIG.TYPES.EMPTY);
    }

    loadFromMap(tilesMap) {
        this.tiles.clear();
        if (tilesMap && typeof tilesMap === 'object') {
            for (const key in tilesMap) {
                const item = tilesMap[key];
                if (item && item.type && item.type !== CONFIG.TYPES.EMPTY) {
                    const level = parseInt(item.level || 0, 10);
                    const tileObj = {
                        x: parseInt(item.x, 10),
                        y: parseInt(item.y, 10),
                        type: item.type,
                        zoneType: item.zoneType || null,
                        level: level,
                        occupied: Boolean(item.occupied || false),
                        stage: item.stage || (item.type === CONFIG.TYPES.ZONE && level > 0 ? CONFIG.STAGES.BUILT : CONFIG.STAGES.NONE),
                        constructionTicks: parseInt(item.constructionTicks || 0, 10),
                        ageTicks: parseInt(item.ageTicks || 0, 10),
                        targetLevel: parseInt(item.targetLevel || (level > 0 ? level : 1), 10),
                        serviceType: item.serviceType || null,
                        roadTier: parseInt(item.roadTier || 1, 10),
                        hasBridge: Boolean(item.hasBridge || false),
                        hasCrossing: Boolean(item.hasCrossing || false),
                        subType: item.subType || null,
                        rotation: parseInt(item.rotation || 0, 10),
                        manualRotation: Boolean(item.manualRotation || false),
                    };

                    if (item.isOrigin !== undefined) tileObj.isOrigin = Boolean(item.isOrigin);
                    if (item.multiSize !== undefined && item.multiSize !== null) tileObj.multiSize = parseInt(item.multiSize, 10);
                    if (item.footprintW !== undefined && item.footprintW !== null) tileObj.footprintW = parseInt(item.footprintW, 10);
                    if (item.footprintH !== undefined && item.footprintH !== null) tileObj.footprintH = parseInt(item.footprintH, 10);
                    if (item.originX !== undefined && item.originX !== null) tileObj.originX = parseInt(item.originX, 10);
                    if (item.originY !== undefined && item.originY !== null) tileObj.originY = parseInt(item.originY, 10);
                    if (item.constructionMonths !== undefined) tileObj.constructionMonths = parseInt(item.constructionMonths || 0, 10);
                    if (item.targetMonths !== undefined) tileObj.targetMonths = parseInt(item.targetMonths || 6, 10);
                    if (item.fireTicks !== undefined) tileObj.fireTicks = parseInt(item.fireTicks || 0, 10);
                    if (item.threatTimer !== undefined) tileObj.threatTimer = parseInt(item.threatTimer || 0, 10);

                    this.tiles.set(this.getKey(tileObj.x, tileObj.y), tileObj);
                }
            }
        }

        // Self-heal multi-tile buildings (Primary School, Harbor Pier, Power Plant, Waterworks, Pavilion)
        // in case a legacy save stripped isOrigin / originX / originY
        const multiFootprints = {
            [CONFIG.SERVICES.SCHOOL]: { w: 3, h: 2, size: 6 },
            [CONFIG.SERVICES.HARBOR_PIER]: { w: 2, h: 2, size: 2 },
            [CONFIG.SERVICES.POWER_PLANT]: { w: 2, h: 2, size: 2 },
            [CONFIG.SERVICES.WATERWORKS]: { w: 2, h: 1, size: 2 },
            [CONFIG.SERVICES.PAVILION]: { w: 3, h: 3, size: 3 },
        };
        const resolveFootprint = (x, y, t) => {
            if (t.serviceType !== CONFIG.SERVICES.SCHOOL) return multiFootprints[t.serviceType];
            if (t.footprintW && t.footprintH) return { w: t.footprintW, h: t.footprintH, size: t.footprintW * t.footprintH };
            const isSameSchool = (sx, sy) => {
                const n = this.tiles.get(this.getKey(sx, sy));
                return n && n.serviceType === CONFIG.SERVICES.SCHOOL && !healedVisited.has(this.getKey(sx, sy)) &&
                    (t.isOrigin === undefined || (n.originX === x && n.originY === y));
            };
            if (isSameSchool(x + 2, y)) return { w: 3, h: 2, size: 6 };
            if (isSameSchool(x, y + 2)) return { w: 2, h: 3, size: 6 };
            return { w: 2, h: 2, size: 2 };
        };
        const healedVisited = new Set();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = this.getKey(x, y);
                if (healedVisited.has(key)) continue;
                const t = this.tiles.get(key);
                if (!t || t.type !== CONFIG.TYPES.SERVICE || !multiFootprints[t.serviceType]) continue;

                // If already has explicit origin metadata, mark its footprint visited
                if (t.isOrigin === true && t.originX !== undefined && t.originY !== undefined) {
                    const fp = resolveFootprint(x, y, t);
                    for (let dy = 0; dy < fp.h; dy++) {
                        for (let dx = 0; dx < fp.w; dx++) {
                            const sub = this.tiles.get(this.getKey(x + dx, y + dy));
                            if (sub && sub.serviceType === t.serviceType) {
                                sub.isOrigin = (dx === 0 && dy === 0);
                                sub.originX = x;
                                sub.originY = y;
                                sub.multiSize = fp.size;
                                if (t.serviceType === CONFIG.SERVICES.SCHOOL) {
                                    sub.footprintW = fp.w;
                                    sub.footprintH = fp.h;
                                }
                                healedVisited.add(this.getKey(x + dx, y + dy));
                            }
                        }
                    }
                    continue;
                }

                if (t.isOrigin === undefined) {
                    const fp = resolveFootprint(x, y, t);
                    t.isOrigin = true;
                    t.originX = x;
                    t.originY = y;
                    t.multiSize = fp.size;
                    if (t.serviceType === CONFIG.SERVICES.SCHOOL) {
                        t.footprintW = fp.w;
                        t.footprintH = fp.h;
                    }
                    healedVisited.add(key);
                    for (let dy = 0; dy < fp.h; dy++) {
                        for (let dx = 0; dx < fp.w; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const sk = this.getKey(x + dx, y + dy);
                            const sub = this.tiles.get(sk);
                            if (sub && sub.serviceType === t.serviceType) {
                                sub.isOrigin = false;
                                sub.originX = x;
                                sub.originY = y;
                                sub.multiSize = fp.size;
                                if (t.serviceType === CONFIG.SERVICES.SCHOOL) {
                                    sub.footprintW = fp.w;
                                    sub.footprintH = fp.h;
                                }
                                healedVisited.add(sk);
                            }
                        }
                    }
                }
            }
        }

        this.notifyAll();
    }

    exportToArray() {
        const result = [];
        for (const [_, tile] of this.tiles.entries()) {
            const exported = {
                x: tile.x,
                y: tile.y,
                type: tile.type,
                zoneType: tile.zoneType,
                level: tile.level,
                occupied: tile.occupied,
                stage: tile.stage,
                constructionTicks: tile.constructionTicks || 0,
                ageTicks: tile.ageTicks || 0,
                targetLevel: tile.targetLevel || (tile.level > 0 ? tile.level : 1),
                serviceType: tile.serviceType || null,
                roadTier: tile.roadTier || 1,
                hasBridge: Boolean(tile.hasBridge || false),
                hasCrossing: Boolean(tile.hasCrossing || false),
                subType: tile.subType || null,
                rotation: tile.rotation || 0,
                manualRotation: Boolean(tile.manualRotation || false),
            };
            if (tile.isOrigin !== undefined) exported.isOrigin = Boolean(tile.isOrigin);
            if (tile.multiSize !== undefined && tile.multiSize !== null) exported.multiSize = tile.multiSize;
            if (tile.footprintW !== undefined && tile.footprintW !== null) exported.footprintW = tile.footprintW;
            if (tile.footprintH !== undefined && tile.footprintH !== null) exported.footprintH = tile.footprintH;
            if (tile.originX !== undefined && tile.originX !== null) exported.originX = tile.originX;
            if (tile.originY !== undefined && tile.originY !== null) exported.originY = tile.originY;
            if (tile.constructionMonths !== undefined) exported.constructionMonths = tile.constructionMonths;
            if (tile.targetMonths !== undefined) exported.targetMonths = tile.targetMonths;
            if (tile.fireTicks) exported.fireTicks = tile.fireTicks;
            if (tile.threatTimer) exported.threatTimer = tile.threatTimer;
            result.push(exported);
        }
        return result;
    }

    getNeighbors(x, y) {
        const coords = [
            { x: x + 1, y },
            { x: x - 1, y },
            { x, y: y + 1 },
            { x, y: y - 1 }
        ];
        return coords
            .filter(c => this.isValidCoord(c.x, c.y))
            .map(c => this.getTile(c.x, c.y));
    }

    isRoadTile(t) {
        if (!t || t.submerged) return false;
        return t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge) || (t.type === CONFIG.TYPES.RAIL && t.hasCrossing);
    }

    hasAdjacentRoad(x, y) {
        const neighbors = this.getNeighbors(x, y);
        return neighbors.some(n => this.isRoadTile(n));
    }

    hasAdjacentRail(x, y) {
        const isRail = t => t && (t.type === CONFIG.TYPES.RAIL || (t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.TRAIN_DEPOT));
        return this.getNeighbors(x, y).some(n => isRail(n));
    }

    hasAdjacentCanal(x, y) {
        return this.getNeighbors(x, y).some(n => n && n.type === CONFIG.TYPES.CANAL);
    }

    // Road Network BFS Pathfinding for Emergency Brigades & Transit
    findRoadPath(startX, startY, goalX, goalY) {
        const originRoads = this.getNeighbors(startX, startY).filter(t => this.isRoadTile(t));
        const goalRoads = this.getNeighbors(goalX, goalY).filter(t => this.isRoadTile(t));

        if (originRoads.length === 0 || goalRoads.length === 0) {
            return null;
        }

        const goalKeys = new Set(goalRoads.map(r => `${r.x}_${r.y}`));

        const queue = [];
        const cameFrom = new Map();
        const visited = new Set();

        for (const startRoad of originRoads) {
            const key = `${startRoad.x}_${startRoad.y}`;
            queue.push(startRoad);
            visited.add(key);
            cameFrom.set(key, null);
        }

        let endRoad = null;

        while (queue.length > 0) {
            const current = queue.shift();
            const currKey = `${current.x}_${current.y}`;

            if (goalKeys.has(currKey)) {
                endRoad = current;
                break;
            }

            const neighbors = this.getNeighbors(current.x, current.y);
            for (const n of neighbors) {
                if (this.isRoadTile(n)) {
                    const nKey = `${n.x}_${n.y}`;
                    if (!visited.has(nKey)) {
                        visited.add(nKey);
                        cameFrom.set(nKey, current);
                        queue.push(n);
                    }
                }
            }
        }

        if (!endRoad) return null;

        const path = [];
        let curr = endRoad;
        while (curr) {
            path.unshift({ x: curr.x, y: curr.y });
            const key = `${curr.x}_${curr.y}`;
            curr = cameFrom.get(key);
        }

        return path;
    }

    findEligibleZoneLots(zoneType) {
        const eligible = [];
        for (const [_, tile] of this.tiles.entries()) {
            if (
                tile.type === CONFIG.TYPES.ZONE &&
                tile.zoneType === zoneType &&
                !tile.occupied &&
                tile.stage === CONFIG.STAGES.NONE &&
                this.hasAdjacentRoad(tile.x, tile.y)
            ) {
                eligible.push(tile);
            }
        }
        return eligible;
    }

    startConstruction(x, y) {
        const tile = this.getTile(x, y);
        if (!tile || tile.type !== CONFIG.TYPES.ZONE) return false;

        tile.occupied = true;
        tile.stage = CONFIG.STAGES.SCAFFOLDING;
        tile.constructionTicks = 0;
        tile.targetLevel = 1;
        this.notifyChange(x, y);
        return true;
    }

    startRenovation(x, y, targetLevel = 2) {
        const tile = this.getTile(x, y);
        if (!tile || tile.type !== CONFIG.TYPES.ZONE) return false;

        tile.occupied = true;
        tile.stage = CONFIG.STAGES.SCAFFOLDING;
        tile.constructionTicks = 0;
        tile.targetLevel = targetLevel;
        this.notifyChange(x, y);
        return true;
    }

    completeConstruction(x, y, level = 1) {
        const tile = this.getTile(x, y);
        if (!tile || tile.type !== CONFIG.TYPES.ZONE) return false;

        tile.occupied = true;
        tile.stage = CONFIG.STAGES.BUILT;
        tile.level = level;
        tile.constructionTicks = 0;
        tile.ageTicks = 0;
        this.notifyChange(x, y);
        return true;
    }

    getBuildingCounts() {
        let resL1 = 0;
        let resL2 = 0;
        let resL3 = 0;
        let comL1 = 0;
        let comL2 = 0;
        let comL3 = 0;
        let comL4 = 0;
        let indL1 = 0;
        let indL2 = 0;
        let industrial = 0;
        let roads = 0;
        let watchtowerCount = 0;
        let fireDepotCount = 0;
        let wellCount = 0;

        for (const [_, tile] of this.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ROAD) {
                roads++;
            } else if (tile.serviceType === CONFIG.SERVICES.WATCHTOWER) {
                watchtowerCount++;
            } else if (tile.serviceType === CONFIG.SERVICES.FIRE_DEPOT) {
                fireDepotCount++;
            } else if (tile.serviceType === CONFIG.SERVICES.WELL) {
                wellCount++;
            } else if (tile.type === CONFIG.TYPES.ZONE && tile.stage === CONFIG.STAGES.BUILT) {
                if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                    if (tile.level >= 3) resL3++;
                    else if (tile.level === 2) resL2++;
                    else resL1++;
                } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                    if (tile.level >= 4) comL4++;
                    else if (tile.level === 3) comL3++;
                    else if (tile.level === 2) comL2++;
                    else comL1++;
                } else if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) {
                    if (tile.level >= 2) indL2++;
                    else indL1++;
                    industrial++;
                }
            }
        }
        return { resL1, resL2, resL3, comL1, comL2, comL3, comL4, industrial, indL1, indL2, roads, watchtowerCount, fireDepotCount, wellCount };
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notifyChange(x, y) {
        const tile = this.getTile(x, y);
        for (const cb of this.listeners) {
            cb('tile_updated', { x, y, tile });
        }
    }

    notifyAll() {
        for (const cb of this.listeners) {
            cb('grid_reset', { grid: this });
        }
    }
}
