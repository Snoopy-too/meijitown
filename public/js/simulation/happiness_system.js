// Project Meiji - Citizen Welfare & Happiness System
// ponytail: deterministic satisfaction score per residential lot (0-100%)

import { CONFIG } from '../config.js';

export class HappinessSystem {
    constructor(gridModel, stateManager, sanitationSystem, disasterSimulation) {
        this.grid = gridModel;
        this.state = stateManager;
        this.sanitation = sanitationSystem;
        this.disaster = disasterSimulation;
    }

    // Traditional Teahouse (Ochaya) Entertainment Radius Check
    isOchayaCovered(x, y) {
        const radius = CONFIG.SIMULATION.OCHAYA_RADIUS || 6;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.OCHAYA) {
                if (Math.hypot(tile.x - x, tile.y - y) <= radius) {
                    return true;
                }
            }
        }
        return false;
    }

    // Public Bathhouse (Sentō) Leisure Radius Check
    isSentoCovered(x, y) {
        const radius = CONFIG.SIMULATION.SENTO_RADIUS || 5;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.SENTO) {
                if (Math.hypot(tile.x - x, tile.y - y) <= radius) {
                    return true;
                }
            }
        }
        return false;
    }

    isEntertainmentCovered(x, y) {
        return this.isOchayaCovered(x, y) || this.isSentoCovered(x, y);
    }

    // Meiji Police Box (Kōban) Public Order Radius Check
    isOrderCovered(x, y) {
        const baseRadius = CONFIG.SIMULATION.KOBAN_RADIUS || 8;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.KOBAN) {
                const boost = (this.state.telegraph && tile.isTelegraphConnected) ? (CONFIG.SIMULATION.CIVIC_TELEGRAPH_BOOST || 1.30) : 1.0;
                if (Math.hypot(tile.x - x, tile.y - y) <= baseRadius * boost) {
                    return true;
                }
            }
        }
        return false;
    }

    hasAdjacentIndustrial(x, y) {
        const neighbors = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 },
            { x: x + 1, y: y + 1 }, { x: x - 1, y: y - 1 },
            { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 }
        ];
        for (const n of neighbors) {
            if (this.grid.isValidCoord(n.x, n.y)) {
                const t = this.grid.getTile(n.x, n.y);
                if (t && t.type === CONFIG.TYPES.ZONE && t.zoneType === CONFIG.ZONES.INDUSTRIAL && t.stage === CONFIG.STAGES.BUILT) {
                    return true;
                }
            }
        }
        return false;
    }

    hasNearbyCharredRuins(x, y, radius = 3) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.grid.isValidCoord(nx, ny) && Math.hypot(dx, dy) <= radius) {
                    const t = this.grid.getTile(nx, ny);
                    if (t && t.stage === CONFIG.STAGES.BURNED) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isShrineParkAdjacent(x, y) {
        const neighbors = [
            { x: x + 1, y }, { x: x - 1, y },
            { x, y: y + 1 }, { x, y: y - 1 },
            { x: x + 1, y: y + 1 }, { x: x - 1, y: y - 1 },
            { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 }
        ];
        for (const n of neighbors) {
            if (this.grid.isValidCoord(n.x, n.y)) {
                const t = this.grid.getTile(n.x, n.y);
                if (t && t.type === CONFIG.TYPES.SERVICE && t.serviceType === CONFIG.SERVICES.SHRINE_PARK) {
                    return true;
                }
            }
        }
        return false;
    }

    isShrineCovered(x, y) {
        if (this.leisure && typeof this.leisure.isShrineCovered === 'function') {
            return this.leisure.isShrineCovered(x, y);
        }
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.SHRINE_PARK) {
                if (Math.hypot(tile.x - x, tile.y - y) <= 4) {
                    return true;
                }
            }
        }
        return false;
    }

    getResidentialHappiness(tile, y) {
        if (typeof tile === 'number' && typeof y === 'number') {
            tile = this.grid.getTile(tile, y);
        }
        if (!tile || tile.type !== CONFIG.TYPES.ZONE || tile.zoneType !== CONFIG.ZONES.RESIDENTIAL) {
            return CONFIG.SIMULATION.DEFAULT_HAPPINESS || 65;
        }

        let score = 25; // Base housing satisfaction
        if (this.grid.hasAdjacentRoad(tile.x, tile.y)) score += 15;
        if (this.sanitation && this.sanitation.isWellCovered(tile.x, tile.y)) score += 20;
        if (this.isEntertainmentCovered(tile.x, tile.y)) score += 25;

        const hasFireProtection = (this.disaster && this.disaster.isWatchtowerCovered(tile.x, tile.y)) ||
                                  (this.disaster && !!this.disaster.findAvailableFireDepot(tile.x, tile.y));
        if (hasFireProtection) score += 15;
        if (this.isOrderCovered(tile.x, tile.y)) score += 10;
        if (this.isShrineCovered(tile.x, tile.y)) score += 10; // Neighborhood Shrine Park +10% bonus

        if (this.hasAdjacentIndustrial(tile.x, tile.y)) score -= 20;
        if (this.hasNearbyCharredRuins(tile.x, tile.y)) score -= 30;
        if (this.state.powerSystem && typeof this.state.powerSystem.isWithinPollutionRadius === 'function' && this.state.powerSystem.isWithinPollutionRadius(tile.x, tile.y)) {
            score -= (CONFIG.SIMULATION.POWER_POLLUTION_PENALTY || 8);
        }

        return Math.max(0, Math.min(100, score));
    }

    calculateTownHappiness() {
        let total = 0;
        let count = 0;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.RESIDENTIAL && tile.stage === CONFIG.STAGES.BUILT) {
                total += this.getResidentialHappiness(tile);
                count++;
            }
        }
        const happiness = count > 0 ? Math.round(total / count) : (CONFIG.SIMULATION.DEFAULT_HAPPINESS || 65);
        this.state.metrics.townHappiness = happiness;
        return happiness;
    }
}
