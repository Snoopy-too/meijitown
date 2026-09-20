// Project Meiji - Primary School System & Education Engine (schoolSystem.js)
// ponytail: 2x2 footprint placement, 8-tile radius coverage & Tier 3 modernization boosts

import { CONFIG } from './config.js';
import { SOUND } from './fx.js';

export class SchoolSystem {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
    }

    // Check if 2x2 lot is completely within grid bounds and clear of obstruction
    canPlaceSchool(originX, originY) {
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = originX + dx;
                const ty = originY + dy;
                if (!this.grid.isValidCoord(tx, ty)) return false;
                const tile = this.grid.getTile(tx, ty);
                if (tile.occupied || tile.type === CONFIG.TYPES.ROAD || tile.type === CONFIG.TYPES.SERVICE || tile.type === CONFIG.TYPES.RAIL || tile.type === CONFIG.TYPES.CANAL) {
                    return false;
                }
            }
        }
        return true;
    }

    // Place 2x2 Primary School
    placeSchool(originX, originY, rotation = 0) {
        if (!this.canPlaceSchool(originX, originY)) {
            this.state.showToast("Cannot build Primary School: 2×2 lot obstructed or out of bounds!", true);
            return false;
        }

        const cost = CONFIG.COSTS.SCHOOL || 280;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast(`Insufficient treasury for Primary School (¥${cost} needed)!`, true);
            return false;
        }

        // Allocate the 4 tiles: (originX, originY) is origin, other 3 are child tiles
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = originX + dx;
                const ty = originY + dy;
                const isOrigin = (dx === 0 && dy === 0);

                this.grid.setTile(tx, ty, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, rotation);
                const tile = this.grid.getTile(tx, ty);
                tile.serviceType = CONFIG.SERVICES.SCHOOL;
                tile.isOrigin = isOrigin;
                tile.multiSize = 2;
                tile.originX = originX;
                tile.originY = originY;
                tile.rotation = rotation;
                this.grid.notifyChange(tx, ty);
            }
        }

        SOUND.playBellChime();
        this.state.showToast(`🏛️ Erected Primary School (Shōgakkō)! [-¥${cost}]`);
        return true;
    }

    // Remove all 4 tiles of a 2x2 school if any part is bulldozed
    clearSchoolAt(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.serviceType !== CONFIG.SERVICES.SCHOOL) return false;

        const ox = tile.originX !== undefined ? tile.originX : (tile.isOrigin ? x : x);
        const oy = tile.originY !== undefined ? tile.originY : (tile.isOrigin ? y : y);

        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = ox + dx;
                const ty = oy + dy;
                if (this.grid.isValidCoord(tx, ty)) {
                    this.grid.clearTile(tx, ty);
                }
            }
        }
        return true;
    }

    // 8-Tile Education Coverage Radius Check (+30% if linked to telegraph)
    isEducationCovered(x, y) {
        const baseRadius = CONFIG.SIMULATION.SCHOOL_RADIUS || 8;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.SCHOOL && tile.isOrigin) {
                const boost = (this.state.telegraph && tile.isTelegraphConnected) ? (CONFIG.SIMULATION.CIVIC_TELEGRAPH_BOOST || 1.30) : 1.0;
                const effectiveRadius = baseRadius * boost;
                // School center is at (tile.x + 0.5, tile.y + 0.5)
                const dist = Math.hypot((tile.x + 0.5) - x, (tile.y + 0.5) - y);
                if (dist <= effectiveRadius + 0.5) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check if tile is directly adjacent to any tile of a Primary School
    isSchoolAdjacent(x, y) {
        const neighbors = this.grid.getNeighbors(x, y);
        return neighbors.some(n => n && n.type === CONFIG.TYPES.SERVICE && n.serviceType === CONFIG.SERVICES.SCHOOL);
    }

    // Total active school count
    getSchoolCount() {
        let count = 0;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.SCHOOL && tile.isOrigin) {
                count++;
            }
        }
        return count;
    }
}
