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
        if (!this.grid?.tiles) return false;
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
        if (!this.grid?.tiles) return false;
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
        if (!this.grid?.tiles) return false;
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
            const valid = typeof this.grid?.isValidCoord === 'function' ? this.grid.isValidCoord(n.x, n.y) : true;
            if (valid && this.grid?.getTile) {
                const t = this.grid.getTile(n.x, n.y);
                if (t && t.type === CONFIG.TYPES.ZONE && t.zoneType === CONFIG.ZONES.INDUSTRIAL && t.stage === CONFIG.STAGES.BUILT) {
                    return true;
                }
            }
        }
        return false;
    }

    hasNearbyCharredRuins(x, y, radius = 3) {
        if (!this.grid?.getTile) return false;
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const valid = typeof this.grid.isValidCoord === 'function' ? this.grid.isValidCoord(nx, ny) : true;
                if (valid && Math.hypot(dx, dy) <= radius) {
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
            const valid = typeof this.grid?.isValidCoord === 'function' ? this.grid.isValidCoord(n.x, n.y) : true;
            if (valid && this.grid?.getTile) {
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
        if (!this.grid?.tiles) return false;
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

        const lvl = tile.level || 1;
        let score = 50; // Neutral baseline satisfaction

        const hasRoad = this.grid.hasAdjacentRoad(tile.x, tile.y);
        if (hasRoad) score += 15;
        else score -= 30; // Isolation penalty

        const isWatered = this.sanitation && this.sanitation.isWellCovered(tile.x, tile.y);
        if (isWatered) score += 15;
        else score -= 25; // Cholera threat / lack of drinking water

        const hasFire = (this.disaster && this.disaster.isWatchtowerCovered(tile.x, tile.y)) ||
                        (this.disaster && !!this.disaster.findAvailableFireDepot(tile.x, tile.y));
        const hasOrder = this.isOrderCovered(tile.x, tile.y);
        const hasLeisure = this.isEntertainmentCovered(tile.x, tile.y) || this.isShrineCovered(tile.x, tile.y);
        const hasEdu = (this.state.schoolSystem && typeof this.state.schoolSystem.isEducationCovered === 'function')
            ? (this.state.schoolSystem.isEducationCovered(tile.x, tile.y) || this.state.schoolSystem.isSchoolAdjacent(tile.x, tile.y))
            : false;

        if (lvl === 1) {
            // Humble Outpost Village / Machiya expectations
            if (hasFire) score += 10;
            if (hasLeisure) score += 10;
            if (hasOrder) score += 5;
            if (hasEdu) score += 5;
        } else if (lvl === 2) {
            // Bustling Post Town / Kura-zukuri expectations
            if (hasFire) score += 10;
            else score -= 15; // Unprotected warehouse penalty

            if (hasOrder) score += 15;
            else score -= 20; // Street crime & theft penalty

            if (hasLeisure) score += 10;
            else score -= 15; // Cultural monotony / lack of bathhouse penalty

            if (hasEdu) score += 10;
        } else {
            // Elite Western Brick Residence / Industrial Metropolis expectations (Level 3+)
            if (hasOrder) score += 15;
            else score -= 25; // Affluent district crime anxiety penalty

            if (hasEdu) score += 20;
            else score -= 25; // Lack of children's primary schooling penalty

            if (hasLeisure) score += 10;
            else score -= 15; // Cultural deprivation penalty

            if (hasFire) score += 5;
        }

        // Environmental modifiers
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
