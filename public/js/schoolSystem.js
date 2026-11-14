// Project Meiji - Primary School System & Education Engine (schoolSystem.js)
// ponytail: 3x2 / 2x3 compound placement, 8-tile radius coverage & Tier 3 modernization boosts

import { CONFIG } from './config.js';
import { getFootprint, getFootprintTiles } from './footprintPreview.js';
import { SOUND } from './fx.js';

export class SchoolSystem {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
    }

    // Check if 3x2 (or rotated 2x3) lot is within grid bounds and clear of obstruction
    canPlaceSchool(originX, originY, rotation = 0) {
        const tiles = getFootprintTiles(originX, originY, CONFIG.TOOLS.SCHOOL, rotation);
        for (const { x: tx, y: ty } of tiles) {
            if (!this.grid.isValidCoord(tx, ty)) return false;
            const tile = this.grid.getTile(tx, ty);
            if (!tile || tile.occupied || tile.type === CONFIG.TYPES.ROAD || tile.type === CONFIG.TYPES.SERVICE ||
                tile.type === CONFIG.TYPES.RAIL || tile.type === CONFIG.TYPES.CANAL ||
                tile.type === CONFIG.TYPES.PARK || tile.type === CONFIG.TYPES.AGRICULTURE) {
                return false;
            }
        }
        return true;
    }

    // Place 3x2 (or rotated 2x3) Primary School compound with yard
    placeSchool(originX, originY, rotation = 0) {
        if (!this.canPlaceSchool(originX, originY, rotation)) {
            this.state.showToast("Cannot build Primary School: 3×2 lot obstructed or out of bounds!", true);
            return false;
        }

        const cost = CONFIG.COSTS.SCHOOL || 280;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast(`Insufficient treasury for Primary School (¥${cost} needed)!`, true);
            return false;
        }

        const { w, h } = getFootprint(CONFIG.TOOLS.SCHOOL, rotation);
        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const tx = originX + dx;
                const ty = originY + dy;
                const isOrigin = (dx === 0 && dy === 0);

                this.grid.setTile(tx, ty, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, rotation);
                const tile = this.grid.getTile(tx, ty);
                tile.serviceType = CONFIG.SERVICES.SCHOOL;
                tile.isOrigin = isOrigin;
                tile.multiSize = w * h;
                tile.footprintW = w;
                tile.footprintH = h;
                tile.originX = originX;
                tile.originY = originY;
                tile.rotation = rotation;
                tile.manualRotation = true;
                this.grid.notifyChange(tx, ty);
            }
        }

        SOUND.playBellChime();
        this.state.showToast(`🏛️ Erected Primary School (Shōgakkō)! [-¥${cost}]`);
        return true;
    }

    // Remove all tiles of a school compound (3x2, 2x3, or legacy 2x2) if any sub-tile is bulldozed
    clearSchoolAt(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.serviceType !== CONFIG.SERVICES.SCHOOL) return false;

        const ox = tile.originX !== undefined ? tile.originX : x;
        const oy = tile.originY !== undefined ? tile.originY : y;
        const originTile = this.grid.getTile(ox, oy);
        const w = originTile?.footprintW || tile.footprintW || 2;
        const h = originTile?.footprintH || tile.footprintH || 2;

        for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
                const tx = ox + dx;
                const ty = oy + dy;
                if (this.grid.isValidCoord(tx, ty)) {
                    const sub = this.grid.getTile(tx, ty);
                    if (sub && sub.serviceType === CONFIG.SERVICES.SCHOOL) {
                        this.grid.clearTile(tx, ty);
                    }
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
                const w = tile.footprintW || (tile.multiSize === 6 ? ((tile.rotation % 2 === 1) ? 2 : 3) : 2);
                const h = tile.footprintH || (tile.multiSize === 6 ? ((tile.rotation % 2 === 1) ? 3 : 2) : 2);
                const cx = tile.x + (w - 1) / 2;
                const cy = tile.y + (h - 1) / 2;
                const dist = Math.hypot(cx - x, cy - y);
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
