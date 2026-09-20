// Project Meiji - Sanitation & Clean Waterworks Subsystem (sanitation_system.js)
// ponytail: 2x1 filtration basin, canal intake validation, 18-tile pipe suppression & brick housing unlock (< 150 lines)

import { CONFIG } from '../config.js';
import { SOUND } from '../fx.js';

export class SanitationSystem {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
    }

    // Check if 2x1 lot is within bounds, unoccupied, and borders a canal/water tile
    canPlaceWaterworks(originX, originY) {
        let touchesCanal = false;

        for (let dx = 0; dx < 2; dx++) {
            const tx = originX + dx;
            const ty = originY;
            if (!this.grid.isValidCoord(tx, ty)) return false;
            const tile = this.grid.getTile(tx, ty);
            if (tile.occupied || tile.type === CONFIG.TYPES.ROAD || tile.type === CONFIG.TYPES.SERVICE || tile.type === CONFIG.TYPES.RAIL || tile.type === CONFIG.TYPES.CANAL) {
                return false;
            }

            // Check adjacent tiles for canal intake
            const neighbors = this.grid.getNeighbors(tx, ty);
            if (neighbors.some(n => n && n.type === CONFIG.TYPES.CANAL)) {
                touchesCanal = true;
            }
        }

        return touchesCanal;
    }

    // Place 2x1 Modern Water Filtration Basin (Jōsuijō)
    placeWaterworks(originX, originY, rotation = 0) {
        if (!this.canPlaceWaterworks(originX, originY)) {
            this.state.showToast("Waterworks must be a 2×1 clear plot bordering a canal!", true);
            return false;
        }

        const cost = CONFIG.COSTS.WATERWORKS || 350;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast(`Insufficient treasury for Waterworks (¥${cost} needed)!`, true);
            return false;
        }

        for (let dx = 0; dx < 2; dx++) {
            const tx = originX + dx;
            const ty = originY;
            const isOrigin = (dx === 0);

            this.grid.setTile(tx, ty, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, rotation);
            const tile = this.grid.getTile(tx, ty);
            tile.serviceType = CONFIG.SERVICES.WATERWORKS;
            tile.isOrigin = isOrigin;
            tile.multiSize = 2;
            tile.originX = originX;
            tile.originY = originY;
            tile.rotation = rotation;
            this.grid.notifyChange(tx, ty);
        }

        SOUND.playWaterSplash();
        this.state.showToast(`💧 Modern Water Filtration Basin (Jōsuijō) active! [-¥${cost}]`);
        return true;
    }

    // Remove 2x1 waterworks footprint if any tile is cleared
    clearWaterworksAt(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.serviceType !== CONFIG.SERVICES.WATERWORKS) return false;

        const ox = tile.originX !== undefined ? tile.originX : (tile.isOrigin ? x : x);
        const oy = tile.originY !== undefined ? tile.originY : (tile.isOrigin ? y : y);

        for (let dx = 0; dx < 2; dx++) {
            const tx = ox + dx;
            const ty = oy;
            if (this.grid.isValidCoord(tx, ty)) {
                this.grid.clearTile(tx, ty);
            }
        }
        return true;
    }

    // Modern Pressurized Waterworks 18-Tile Pipe Radius Coverage
    isWaterworksCovered(x, y) {
        const pipeRadius = CONFIG.SIMULATION.WATERWORKS_RADIUS || 18;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.WATERWORKS && tile.isOrigin) {
                if (Math.hypot((tile.x + 0.5) - x, tile.y - y) <= pipeRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    // Clean Water Sanitation Coverage Check: Waterworks (18 tiles), Wells (6 tiles), Bathhouses (5 tiles)
    isWellCovered(x, y) {
        if (this.isWaterworksCovered(x, y)) return true;

        const wellRadius = CONFIG.SIMULATION.WELL_RADIUS || 6;
        const sentoRadius = CONFIG.SIMULATION.SENTO_RADIUS || 5;

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.CANAL && Math.hypot(tile.x - x, tile.y - y) <= 1.5) {
                return true;
            }
            if (tile.type === CONFIG.TYPES.SERVICE) {
                if (tile.serviceType === CONFIG.SERVICES.WELL && Math.hypot(tile.x - x, tile.y - y) <= wellRadius) {
                    return true;
                }
                if (tile.serviceType === CONFIG.SERVICES.SENTO && Math.hypot(tile.x - x, tile.y - y) <= sentoRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check if residential lot can upgrade to Level 3 Western Brick Residence
    isBrickResidenceEligible(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.type !== CONFIG.TYPES.ZONE || tile.zoneType !== CONFIG.ZONES.RESIDENTIAL) return false;
        if (tile.level < 2 || tile.stage !== CONFIG.STAGES.BUILT) return false;
        return this.isWaterworksCovered(x, y) && this.grid.hasAdjacentRoad(x, y);
    }

    // Evaluate clean water access & cholera risk (0-45%)
    updateCholeraRisk() {
        let totalResTiles = 0;
        let unwateredResTiles = 0;

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.RESIDENTIAL && tile.stage === CONFIG.STAGES.BUILT) {
                totalResTiles++;
                const isCovered = this.isWellCovered(tile.x, tile.y);
                tile.sanitationClean = isCovered;
                if (!isCovered) {
                    unwateredResTiles++;
                }
            }
        }

        const risk = totalResTiles > 0 ? Math.round((unwateredResTiles / totalResTiles) * 45) : 0;
        this.state.metrics.choleraRisk = risk;
        return risk;
    }

    getWaterworksCount() {
        let count = 0;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.WATERWORKS && tile.isOrigin) {
                count++;
            }
        }
        return count;
    }
}
