// Project Meiji - Electrical Power Grid Subsystem (powerSystem.js)
// ponytail: 2x2 coal steam plant, telegraph grid power propagation, 4-tile soot pollution check (< 150 lines)

import { CONFIG } from './config.js';
import { SOUND } from './fx.js';

export class PowerSystem {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
        this.poweredTiles = new Set();
        this.powerPlants = new Set();
    }

    // Check if 2x2 lot is completely within grid bounds and clear of obstruction
    canPlacePowerPlant(originX, originY) {
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

    // Place 2x2 Coal Steam Power Plant
    placePowerPlant(originX, originY, rotation = 0) {
        if (!this.canPlacePowerPlant(originX, originY)) {
            this.state.showToast("Cannot build Power Plant: 2×2 lot obstructed or out of bounds!", true);
            return false;
        }

        const cost = CONFIG.COSTS.POWER_PLANT || 600;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast(`Insufficient treasury for Power Plant (¥${cost} needed)!`, true);
            return false;
        }

        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = originX + dx;
                const ty = originY + dy;
                const isOrigin = (dx === 0 && dy === 0);

                this.grid.setTile(tx, ty, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, rotation);
                const tile = this.grid.getTile(tx, ty);
                tile.serviceType = CONFIG.SERVICES.POWER_PLANT;
                tile.isOrigin = isOrigin;
                tile.multiSize = 2;
                tile.originX = originX;
                tile.originY = originY;
                tile.rotation = rotation;
                this.grid.notifyChange(tx, ty);
            }
        }

        SOUND.playBellChime();
        this.state.showToast(`⚡ Commissioned Coal Steam Power Plant! [-¥${cost}]`);
        this.updateNetwork();
        return true;
    }

    // Remove 2x2 power plant if any sub-tile is bulldozed
    clearPowerPlantAt(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.serviceType !== CONFIG.SERVICES.POWER_PLANT) return false;

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
        this.updateNetwork();
        return true;
    }

    // Power Grid Propagation: Power radiates from steam plants across active Telegraph lines
    updateNetwork() {
        this.poweredTiles.clear();
        this.powerPlants.clear();

        // Reset power flags on all tiles
        for (const [_, tile] of this.grid.tiles.entries()) {
            tile.hasPower = false;
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.POWER_PLANT && tile.isOrigin) {
                this.powerPlants.add(`${tile.x},${tile.y}`);
            }
        }

        if (this.powerPlants.size === 0) return;

        const queue = [];
        const visited = new Set();

        // Find telegraph roads adjacent to any tile of active 2x2 power plants
        for (const plantKey of this.powerPlants) {
            const [px, py] = plantKey.split(',').map(Number);
            for (let dy = -1; dy <= 2; dy++) {
                for (let dx = -1; dx <= 2; dx++) {
                    const nx = px + dx;
                    const ny = py + dy;
                    if (this.grid.isValidCoord(nx, ny)) {
                        const nt = this.grid.getTile(nx, ny);
                        const nk = `${nx},${ny}`;
                        // Telegraph line can conduct power
                        if (nt && nt.hasTelegraph && !visited.has(nk)) {
                            visited.add(nk);
                            queue.push(nt);
                        }
                    }
                }
            }
        }

        // BFS propagate electricity along active telegraph lines
        while (queue.length > 0) {
            const curr = queue.shift();
            curr.hasPower = true;
            this.poweredTiles.add(`${curr.x},${curr.y}`);

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
                    if (nt && nt.hasTelegraph && !visited.has(nk)) {
                        visited.add(nk);
                        queue.push(nt);
                    }
                }
            }
        }
    }

    hasPower(x, y) {
        const tile = this.grid.getTile(x, y);
        return !!(tile && (tile.hasPower || this.poweredTiles.has(`${x},${y}`)));
    }

    // 4-Tile Soot Pollution Radius Check around active coal steam power plants
    isWithinPollutionRadius(x, y) {
        const radius = CONFIG.SIMULATION.POWER_POLLUTION_RADIUS || 4;
        for (const plantKey of this.powerPlants) {
            const [px, py] = plantKey.split(',').map(Number);
            const centerX = px + 0.5;
            const centerY = py + 0.5;
            if (Math.hypot(centerX - x, centerY - y) <= radius + 0.5) {
                return true;
            }
        }
        return false;
    }

    getPowerPlantCount() {
        return this.powerPlants.size;
    }
}
