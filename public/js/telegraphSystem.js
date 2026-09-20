// Project Meiji - Communication Grid: Telegraph Network (telegraphSystem.js)
// ponytail: breadth-first stone road spreader, +30% civic range booster, procedural poles & hanging wires

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { TelegraphRenderer } from './renderer/telegraphRenderer.js';

export class TelegraphSystem {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
        this.connectedCivics = new Set();
        this.telegraphRoads = new Set();
    }

    // Check if tile is Stone Paving (Road, Bridge, or Level Crossing with roadTier === 2)
    isStonePaving(tile) {
        if (!tile) return false;
        if (tile.type === CONFIG.TYPES.ROAD && tile.roadTier === 2) return true;
        if (tile.type === CONFIG.TYPES.CANAL && tile.hasBridge && tile.roadTier === 2) return true;
        if (tile.type === CONFIG.TYPES.RAIL && tile.hasCrossing && tile.roadTier === 2) return true;
        return false;
    }

    // Network Spreader: BFS outwards along contiguous Stone Paving routes from Telegraph Offices
    updateNetwork() {
        this.connectedCivics.clear();
        this.telegraphRoads.clear();

        const offices = [];
        for (const [key, tile] of this.grid.tiles.entries()) {
            tile.hasTelegraph = false;
            tile.isTelegraphConnected = false;
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.TELEGRAPH) {
                offices.push(tile);
            }
        }

        if (offices.length === 0) return;

        const queue = [];
        const visitedRoads = new Set();

        // Seed BFS from stone roads directly adjacent to Telegraph Offices
        for (const office of offices) {
            const adjacents = [
                { x: office.x + 1, y: office.y },
                { x: office.x - 1, y: office.y },
                { x: office.x, y: office.y + 1 },
                { x: office.x, y: office.y - 1 }
            ];
            for (const adj of adjacents) {
                if (this.grid.isValidCoord(adj.x, adj.y)) {
                    const t = this.grid.getTile(adj.x, adj.y);
                    const k = `${adj.x},${adj.y}`;
                    if (this.isStonePaving(t) && !visitedRoads.has(k)) {
                        visitedRoads.add(k);
                        queue.push(t);
                    }
                }
            }
        }

        // Spread telegraph lines along all contiguous Stone Paving routes
        while (queue.length > 0) {
            const curr = queue.shift();
            curr.hasTelegraph = true;
            this.telegraphRoads.add(`${curr.x},${curr.y}`);

            const neighbors = [
                { x: curr.x + 1, y: curr.y },
                { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 },
                { x: curr.x, y: curr.y - 1 }
            ];

            for (const n of neighbors) {
                if (this.grid.isValidCoord(n.x, n.y)) {
                    const nt = this.grid.getTile(n.x, n.y);
                    const nk = `${n.x},${n.y}`;
                    if (this.isStonePaving(nt) && !visitedRoads.has(nk)) {
                        visitedRoads.add(nk);
                        queue.push(nt);
                    }
                }
            }
        }

        // Connect civic buildings touching any telegraph-connected stone road or office
        const targetServices = [
            CONFIG.SERVICES.KOBAN,
            CONFIG.SERVICES.WATCHTOWER,
            CONFIG.SERVICES.FIRE_DEPOT,
            CONFIG.SERVICES.SCHOOL
        ];

        for (const [key, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && targetServices.includes(tile.serviceType)) {
                let connected = false;
                const neighbors = [
                    { x: tile.x + 1, y: tile.y },
                    { x: tile.x - 1, y: tile.y },
                    { x: tile.x, y: tile.y + 1 },
                    { x: tile.x, y: tile.y - 1 }
                ];
                for (const n of neighbors) {
                    if (this.grid.isValidCoord(n.x, n.y)) {
                        const nt = this.grid.getTile(n.x, n.y);
                        if (nt && ((nt.hasTelegraph && this.isStonePaving(nt)) || (nt.type === CONFIG.TYPES.SERVICE && nt.serviceType === CONFIG.SERVICES.TELEGRAPH))) {
                            connected = true;
                            break;
                        }
                    }
                }

                tile.isTelegraphConnected = connected;
                if (connected) {
                    this.connectedCivics.add(`${tile.x},${tile.y}`);
                }
            }
        }
    }

    // Civic Response Range Multiplier: +30% if connected to telegraph network
    getCivicBoost(x, y) {
        const tile = this.grid.getTile(x, y);
        if (tile && tile.isTelegraphConnected) {
            return CONFIG.SIMULATION.CIVIC_TELEGRAPH_BOOST || 1.30;
        }
        return 1.0;
    }

    hasTelegraphLine(x, y) {
        const tile = this.grid.getTile(x, y);
        return !!(tile && tile.hasTelegraph && this.isStonePaving(tile));
    }

    // Ginza Rengagai Trigger: Commercial zone touching Stone Paving & Telegraph line, with active rail or canal access
    isGinzaBrickEligible(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.type !== CONFIG.TYPES.ZONE || tile.zoneType !== CONFIG.ZONES.COMMERCIAL) {
            return false;
        }
        if (tile.level < 2 || tile.stage !== CONFIG.STAGES.BUILT) {
            return false;
        }

        const neighbors = [
            { x: x + 1, y: y }, { x: x - 1, y: y },
            { x: x, y: y + 1 }, { x: x - 1, y: y }
        ];

        let touchesStoneWithTelegraph = false;
        let touchesTransit = false;

        const checkCoords = [
            { x: x + 1, y: y }, { x: x - 1, y: y },
            { x: x, y: y + 1 }, { x: x, y: y - 1 }
        ];

        for (const n of checkCoords) {
            if (!this.grid.isValidCoord(n.x, n.y)) continue;
            const nt = this.grid.getTile(n.x, n.y);
            if (!nt) continue;

            if (this.isStonePaving(nt) && nt.hasTelegraph) {
                touchesStoneWithTelegraph = true;
            }

            if (nt.type === CONFIG.TYPES.RAIL || nt.type === CONFIG.TYPES.CANAL ||
                (nt.type === CONFIG.TYPES.SERVICE && nt.serviceType === CONFIG.SERVICES.TRAIN_DEPOT)) {
                touchesTransit = true;
            }
        }

        return touchesStoneWithTelegraph && touchesTransit;
    }

    // Procedural Telegraph Pole and Overhead Hanging Catenary Wire along Stone Road
    static createTelegraphLineMesh(orientation = 'NS') {
        return TelegraphRenderer.createTelegraphPole(orientation);
    }
}
