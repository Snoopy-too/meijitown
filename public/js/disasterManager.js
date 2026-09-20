// Project Meiji - Fire Disaster & Civic Suppression Engine (disasterManager.js)
// ponytail: seasonal dry fire odds, orthogonal spread timer, absolute firebreaks & matoi dispatch

import { CONFIG } from './config.js';
import { SOUND } from './fx.js';

export class DisasterSimulation {
    constructor(gridModel, stateManager, engine) {
        this.grid = gridModel;
        this.state = stateManager;
        this.engine = engine;
    }

    isWatchtowerCovered(x, y) {
        if (!this.engine) return false;
        const baseRadius = CONFIG.SIMULATION.WATCHTOWER_RADIUS || 6;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.WATCHTOWER) {
                const boost = (this.state.telegraph && tile.isTelegraphConnected) ? (CONFIG.SIMULATION.CIVIC_TELEGRAPH_BOOST || 1.30) : 1.0;
                const effectiveRadius = baseRadius * boost;
                if (Math.hypot(tile.x - x, tile.y - y) <= effectiveRadius) {
                    return true;
                }
            }
        }
        return false;
    }

    // Check if month is in dry Autumn/Winter period (Autumn: M9-11, Winter: M12-2)
    isDrySeason() {
        const m = this.state.currentMonth || 1;
        return (m >= 9 || m <= 2);
    }

    // Fire Risk Calculation: Seasonal dry odds, unserviced wooden machiya vulnerability, -50% watchtower
    getTileFireRiskDetails(tile, y) {
        if (typeof tile === 'number' && typeof y === 'number') {
            tile = this.grid.getTile(tile, y);
        }
        if (!tile || tile.type !== CONFIG.TYPES.ZONE) {
            return { risk: 0, protected: false };
        }
        if (tile.level >= 2) {
            return { risk: 0, protected: true }; // Complete fire immunity for Kura and Brick
        }
        if (tile.level !== 1) {
            return { risk: 0, protected: false };
        }

        let risk = 6; // Base wooden structure hazard
        const neighbors = [
            { x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y },
            { x: tile.x, y: tile.y + 1 }, { x: tile.x - 1, y: tile.y },
            { x: tile.x + 1, y: tile.y + 1 }, { x: tile.x - 1, y: tile.y - 1 },
            { x: tile.x + 1, y: tile.y - 1 }, { x: tile.x - 1, y: tile.y + 1 }
        ];

        for (const n of neighbors) {
            if (this.grid.isValidCoord(n.x, n.y)) {
                const nt = this.grid.getTile(n.x, n.y);
                if (nt && nt.type === CONFIG.TYPES.ZONE && nt.stage === CONFIG.STAGES.BUILT && nt.level === 1) {
                    risk += 8;
                }
            }
        }

        // Unserviced wooden machiya penalty (no well, watchtower, or fire depot nearby)
        const isWatered = this.engine && typeof this.engine.isWellCovered === 'function' ? this.engine.isWellCovered(tile.x, tile.y) : false;
        const isWatched = this.isWatchtowerCovered(tile.x, tile.y);
        const hasDepot = !!this.findAvailableFireDepot(tile.x, tile.y);
        if (!isWatered && !isWatched && !hasDepot) {
            risk += 14; // High vulnerability for unserviced machiya
        }

        // Seasonal autumn/winter dry weather modifier
        if (this.isDrySeason()) {
            risk = Math.round(risk * 1.75);
        }

        if (isWatched) {
            risk = Math.round(risk * 0.50); // 50% fire risk reduction
        }

        return { risk: Math.min(95, risk), protected: isWatched };
    }

    // Check if canal or stone paving stops fire propagation between two adjacent tiles
    hasFirebreakBetween(fx, fy, tx, ty) {
        const dx = tx - fx;
        const dy = ty - fy;
        const targetTile = this.grid.getTile(tx, ty);
        if (targetTile && (targetTile.type === CONFIG.TYPES.CANAL || (targetTile.type === CONFIG.TYPES.ROAD && targetTile.roadTier === 2))) {
            return true;
        }

        // Direct adjacent step
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);
        let currX = fx + stepX;
        let currY = fy + stepY;
        let roadTilesInPath = 0;

        while (currX !== tx || currY !== ty) {
            const t = this.grid.getTile(currX, currY);
            if (t && (t.type === CONFIG.TYPES.CANAL || (t.type === CONFIG.TYPES.ROAD && t.roadTier === 2))) {
                return true; // Canal or stone paving stops spread cold
            }
            if (t && t.type === CONFIG.TYPES.ROAD) {
                roadTilesInPath++;
            }
            if (currX !== tx) currX += stepX;
            if (currY !== ty) currY += stepY;
        }

        return roadTilesInPath >= 2;
    }

    hasTwoTileRoadFirebreak(fx, fy, tx, ty) {
        return this.hasFirebreakBetween(fx, fy, tx, ty);
    }

    updateCityFireRiskMetric() {
        let total = 0;
        let count = 0;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.ZONE && tile.stage === CONFIG.STAGES.BUILT && tile.level === 1) {
                const details = this.getTileFireRiskDetails(tile);
                total += details.risk;
                count++;
            }
        }
        this.state.metrics.fireRisk = count > 0 ? Math.round(total / count) : 0;
    }

    extinguishFire(x, y) {
        const tile = this.grid.getTile(x, y);
        if (tile && tile.stage === CONFIG.STAGES.ON_FIRE) {
            tile.stage = CONFIG.STAGES.BUILT;
            tile.fireTicks = 0;
            tile.threatTimer = 0;
            tile.brigadeDispatched = false;
            if (!this.state.stats) this.state.stats = {};
            this.state.stats.firesExtinguished = (this.state.stats.firesExtinguished || 0) + 1;
            this.grid.notifyChange(x, y);
            return true;
        }
        return false;
    }

    // Find nearest connected Fire Brigade Depot within operational road radius (+30% boost if telegraph connected)
    findAvailableFireDepot(fireX, fireY) {
        let best = null;
        const baseRadius = CONFIG.SIMULATION.FIRE_DEPOT_RADIUS || 10;

        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.FIRE_DEPOT) {
                const boost = (this.state.telegraph && tile.isTelegraphConnected) ? (CONFIG.SIMULATION.CIVIC_TELEGRAPH_BOOST || 1.30) : 1.0;
                const maxRadius = Math.round(baseRadius * boost);
                const path = this.grid.findRoadPath(tile.x, tile.y, fireX, fireY);
                if (path && path.length <= maxRadius) {
                    if (!best || path.length < best.roadDistance) {
                        best = { depot: tile, path, roadDistance: path.length, maxRadius };
                    }
                }
            }
        }
        return best;
    }

    // Master Fire Loop: Autumn/Winter ignition, 10s orthogonal spread countdown, firebreaks & matoi brigade
    processFires() {
        this.updateCityFireRiskMetric();

        const activeFires = [];
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.stage === CONFIG.STAGES.ON_FIRE) {
                activeFires.push(tile);
            }
        }

        // 1. Process Threatened Buildings Countdown from previous tick
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.threatTimer && tile.threatTimer > 0 && tile.stage === CONFIG.STAGES.BUILT) {
                const isStillThreatened = activeFires.some(f => {
                    const dist = Math.hypot(f.x - tile.x, f.y - tile.y);
                    return dist <= 1.5 && !this.hasFirebreakBetween(f.x, f.y, tile.x, tile.y);
                });

                if (!isStillThreatened) {
                    tile.threatTimer = 0;
                    this.grid.notifyChange(tile.x, tile.y);
                } else {
                    tile.threatTimer--;
                    if (tile.threatTimer <= 0) {
                        tile.stage = CONFIG.STAGES.ON_FIRE;
                        tile.fireTicks = 0;
                        tile.threatTimer = 0;
                        this.grid.notifyChange(tile.x, tile.y);
                        SOUND.playHyoshigiClappers();
                        SOUND.playBellChime();
                        this.state.showToast(`🔥 FIRE SPREAD! Blaze jumped to adjacent wooden machiya at (${tile.x}, ${tile.y})!`, true);
                    } else {
                        this.grid.notifyChange(tile.x, tile.y);
                    }
                }
            }
        }

        // 2. Process Active Fires & Spread Threat to Orthogonal Neighbors
        for (const fireTile of activeFires) {
            // Watchtower immediate suppression
            if (this.isWatchtowerCovered(fireTile.x, fireTile.y)) {
                this.extinguishFire(fireTile.x, fireTile.y);
                SOUND.playBellChime();
                this.state.showToast(`Fire Watchtower brigade extinguished blaze at (${fireTile.x}, ${fireTile.y})!`);
                continue;
            }

            // Hikeshi Brigade Active Response via Road Network
            if (!fireTile.brigadeDispatched) {
                const depotResponse = this.findAvailableFireDepot(fireTile.x, fireTile.y);
                if (depotResponse) {
                    fireTile.brigadeDispatched = true;
                    this.state.showToast(`🚒 町火消し! Hikeshi Brigade with Matoi standard dispatched from Depot to (${fireTile.x}, ${fireTile.y})!`);

                    if (this.state.renderer && typeof this.state.renderer.dispatchBrigadeCart === 'function') {
                        this.state.renderer.dispatchBrigadeCart(depotResponse.path, () => {
                            this.extinguishFire(fireTile.x, fireTile.y);
                            this.state.showToast(`🚒 町火消し! Fire Brigade extinguished blaze at (${fireTile.x}, ${fireTile.y})!`);
                        });
                    } else {
                        this.extinguishFire(fireTile.x, fireTile.y);
                    }
                    continue;
                }
            } else {
                continue;
            }

            fireTile.fireTicks = (fireTile.fireTicks || 0) + 1;

            if (fireTile.fireTicks >= (CONFIG.SIMULATION.FIRE_BURN_TICKS || 3)) {
                fireTile.stage = CONFIG.STAGES.BURNED;
                fireTile.occupied = false;
                fireTile.brigadeDispatched = false;
                if (fireTile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                    this.state.population = Math.max(0, this.state.population - 8);
                }
                this.grid.notifyChange(fireTile.x, fireTile.y);
                this.state.showToast(`Machiya at (${fireTile.x}, ${fireTile.y}) burned down to ruins! Demolish to rebuild.`, true);
                continue;
            }

            // Fire spreads to ORTHOGONALLY adjacent wooden tiles after 10s countdown (2 ticks)
            const orthogonalNeighbors = [
                { x: fireTile.x + 1, y: fireTile.y },
                { x: fireTile.x - 1, y: fireTile.y },
                { x: fireTile.x, y: fireTile.y + 1 },
                { x: fireTile.x, y: fireTile.y - 1 }
            ];

            for (const c of orthogonalNeighbors) {
                if (!this.grid.isValidCoord(c.x, c.y)) continue;
                const target = this.grid.getTile(c.x, c.y);

                // Canal water, stone roads, and Kura-zukuri / Brick buildings stop propagation cold
                if (!target || target.type !== CONFIG.TYPES.ZONE || target.level >= 2 || target.stage !== CONFIG.STAGES.BUILT) {
                    continue;
                }
                if (this.hasFirebreakBetween(fireTile.x, fireTile.y, target.x, target.y)) {
                    continue;
                }

                // 10-second spread countdown (2 ticks at 6000ms standard pace)
                if (!target.threatTimer && target.stage !== CONFIG.STAGES.ON_FIRE) {
                    target.threatTimer = 2;
                    this.grid.notifyChange(target.x, target.y);
                }
            }
        }

        // 3. Spontaneous Fire Outbreak (Dry Autumn/Winter increases odds on unserviced wooden machiya)
        if (activeFires.length === 0) {
            const nightWatch = (this.state.policies && typeof this.state.policies.isNightWatchActive === 'function') ? this.state.policies.isNightWatchActive() : false;
            const nightWatchReduction = nightWatch ? 0.60 : 1.0;

            for (const [_, tile] of this.grid.tiles.entries()) {
                if (tile.type === CONFIG.TYPES.ZONE && tile.stage === CONFIG.STAGES.BUILT && tile.level === 1) {
                    const details = this.getTileFireRiskDetails(tile);
                    if (details.risk > 15 && Math.random() < (details.risk * 0.002 * nightWatchReduction)) {
                        tile.stage = CONFIG.STAGES.ON_FIRE;
                        tile.fireTicks = 0;
                        this.grid.notifyChange(tile.x, tile.y);
                        SOUND.playHyoshigiClappers();
                        SOUND.playBellChime();
                        const seasonNote = this.isDrySeason() ? ' (Dry Season Warning)' : '';
                        this.state.showToast(`🔥 TAIKA OUTBREAK (大火)! Fire broke out in timber district at (${tile.x}, ${tile.y})${seasonNote}!`, true);
                        break;
                    }
                }
            }
        }
    }
}

export const DisasterManager = DisasterSimulation;
