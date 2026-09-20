// Project Meiji - Maritime Trade & Harbor Cargo Pier Engine (tradePierManager.js)
// ponytail: 2x2 footprint placement (>= 2 canal & >= 1 road), waterway BFS & autumn export dividends (< 300 lines)

import { CONFIG } from './config.js';
import { SOUND } from './fx.js';

export class TradePierManager {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
        this.activePiers = new Set(); // origin keys 'ox,oy'
        this.lastQuarterlyYield = 0;
        this.lastExportRunMonth = 0;
    }

    // Returns the 8 perimeter neighbor coordinates around a 2x2 lot
    getPerimeterNeighbors(originX, originY) {
        return [
            { x: originX - 1, y: originY },
            { x: originX - 1, y: originY + 1 },
            { x: originX + 2, y: originY },
            { x: originX + 2, y: originY + 1 },
            { x: originX, y: originY - 1 },
            { x: originX + 1, y: originY - 1 },
            { x: originX, y: originY + 2 },
            { x: originX + 1, y: originY + 2 },
        ];
    }

    // Validation: 2x2 lot clear + >= 2 orthogonal canal tiles + >= 1 road tile
    canPlacePier(originX, originY) {
        // 1. Verify all 4 tiles are within bounds and clear
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = originX + dx;
                const ty = originY + dy;
                if (!this.grid.isValidCoord(tx, ty)) return false;
                const tile = this.grid.getTile(tx, ty);
                if (!tile) return false;
                if (tile.occupied || tile.type === CONFIG.TYPES.ROAD || tile.type === CONFIG.TYPES.SERVICE ||
                    tile.type === CONFIG.TYPES.RAIL || tile.type === CONFIG.TYPES.CANAL || tile.type === CONFIG.TYPES.AGRICULTURE) {
                    return false;
                }
            }
        }

        // 2. Verify perimeter adjacency: >= 2 canals and >= 1 road
        const perim = this.getPerimeterNeighbors(originX, originY);
        let canalCount = 0;
        let roadCount = 0;

        for (const p of perim) {
            if (!this.grid.isValidCoord(p.x, p.y)) continue;
            const t = this.grid.getTile(p.x, p.y);
            if (!t) continue;
            if (t.type === CONFIG.TYPES.CANAL) canalCount++;
            if (t.type === CONFIG.TYPES.ROAD || (t.type === CONFIG.TYPES.CANAL && t.hasBridge) || (t.type === CONFIG.TYPES.RAIL && t.hasCrossing)) {
                roadCount++;
            }
        }

        return canalCount >= 2 && roadCount >= 1;
    }

    // Place 2x2 Harbor Cargo Pier
    placePier(originX, originY, rotation = 0) {
        if (!this.canPlacePier(originX, originY)) {
            this.state.showToast("Cannot build Harbor Cargo Pier: requires 2×2 clear lot adjacent to ≥ 2 canal and ≥ 1 road tiles!", true);
            return false;
        }

        const cost = CONFIG.COSTS.HARBOR_PIER || 450;
        if (!this.state.deductTreasury(cost)) {
            this.state.showToast(`Insufficient treasury for Harbor Cargo Pier (¥${cost} needed)!`, true);
            return false;
        }

        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = originX + dx;
                const ty = originY + dy;
                const isOrigin = (dx === 0 && dy === 0);

                this.grid.setTile(tx, ty, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, rotation);
                const tile = this.grid.getTile(tx, ty);
                tile.serviceType = CONFIG.SERVICES.HARBOR_PIER;
                tile.isOrigin = isOrigin;
                tile.multiSize = 2;
                tile.originX = originX;
                tile.originY = originY;
                tile.rotation = rotation;
                this.grid.notifyChange(tx, ty);
            }
        }

        this.activePiers.add(`${originX},${originY}`);
        SOUND.playBellChime();
        this.state.showToast(`⚓ Erected Harbor Cargo Pier (Funatsuki-ba)! [-¥${cost}]`);
        return true;
    }

    // Demolish all 4 tiles if any tile of the 2x2 pier is bulldozed
    clearPierAt(x, y) {
        const tile = this.grid.getTile(x, y);
        if (!tile || tile.serviceType !== CONFIG.SERVICES.HARBOR_PIER) return false;

        const ox = tile.originX !== undefined ? tile.originX : (tile.isOrigin ? x : x);
        const oy = tile.originY !== undefined ? tile.originY : (tile.isOrigin ? y : y);
        this.activePiers.delete(`${ox},${oy}`);

        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const tx = ox + dx;
                const ty = oy + dy;
                if (this.grid.isValidCoord(tx, ty)) {
                    this.grid.setTile(tx, ty, CONFIG.TYPES.EMPTY);
                    this.grid.notifyChange(tx, ty);
                }
            }
        }
        return true;
    }

    // Find all contiguous canal tiles reachable from the pier's perimeter
    getConnectedCanalsForPier(ox, oy) {
        const perim = this.getPerimeterNeighbors(ox, oy);
        const seeds = [];
        for (const p of perim) {
            if (this.grid.isValidCoord(p.x, p.y)) {
                const t = this.grid.getTile(p.x, p.y);
                if (t && t.type === CONFIG.TYPES.CANAL) seeds.push({ x: p.x, y: p.y });
            }
        }
        if (seeds.length === 0) return new Set();

        const visited = new Set();
        const queue = [...seeds];
        for (const s of seeds) visited.add(`${s.x},${s.y}`);

        while (queue.length > 0) {
            const curr = queue.shift();
            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 }
            ];
            for (const n of neighbors) {
                if (this.grid.isValidCoord(n.x, n.y)) {
                    const nt = this.grid.getTile(n.x, n.y);
                    const nk = `${n.x},${n.y}`;
                    if (nt && nt.type === CONFIG.TYPES.CANAL && !visited.has(nk)) {
                        visited.add(nk);
                        queue.push(n);
                    }
                }
            }
        }
        return visited;
    }

    // Check if pier is actively connected to the canal network
    isPierConnected(ox, oy) {
        const canals = this.getConnectedCanalsForPier(ox, oy);
        return canals.size >= 2;
    }

    // Scan connected production nodes: Rice Paddies & Industrial L2 Textile Mills
    scanConnectedGoods(ox, oy) {
        const connectedCanals = this.getConnectedCanalsForPier(ox, oy);
        let riceCount = 0;
        let millCount = 0;

        if (connectedCanals.size === 0) return { riceCount, millCount, connected: false };

        for (const canalKey of connectedCanals) {
            const [cx, cy] = canalKey.split(',').map(Number);
            const adj = [
                { x: cx + 1, y: cy }, { x: cx - 1, y: cy },
                { x: cx, y: cy + 1 }, { x: cx - 1, y: cy }
            ];
            for (const a of adj) {
                if (this.grid.isValidCoord(a.x, a.y)) {
                    const t = this.grid.getTile(a.x, a.y);
                    if (t) {
                        if (t.type === CONFIG.TYPES.AGRICULTURE) riceCount++;
                        else if (t.type === CONFIG.TYPES.ZONE && t.zoneType === CONFIG.ZONES.INDUSTRIAL && t.level >= 2 && t.stage === CONFIG.STAGES.BUILT) {
                            millCount++;
                        }
                    }
                }
            }
        }

        return { riceCount, millCount, connected: connectedCanals.size >= 2 };
    }

    // Calculate export revenue dividend (proportional to connected goods, up to +¥400)
    calculateExportYield(ox, oy, currentMonth = 1) {
        const { riceCount, millCount, connected } = this.scanConnectedGoods(ox, oy);
        if (!connected) return 0;

        let yieldAmt = 0;
        // Autumn harvest export surge (M9–M11)
        const isAutumn = currentMonth >= 9 && currentMonth <= 11;
        if (riceCount > 0) {
            const baseRiceBonus = isAutumn ? 40 : 20;
            yieldAmt += Math.min(200, riceCount * baseRiceBonus);
        }

        // Modern Meiji Silk Reeling / Cotton Mills export dividend
        if (millCount > 0) {
            yieldAmt += Math.min(250, millCount * 60);
        }

        if (yieldAmt > 0) {
            // Cap within historical export dividend envelope (up to +¥400)
            yieldAmt = Math.min(400, yieldAmt);
        }

        return yieldAmt;
    }

    // Monthly simulation step: calculates total maritime dividends across all active piers
    calculateTotalMonthlyDividends(currentMonth = 1) {
        let totalExportDividend = 0;
        let activePierCount = 0;

        for (const [key, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.HARBOR_PIER && tile.isOrigin) {
                activePierCount++;
                const pierYield = this.calculateExportYield(tile.x, tile.y, currentMonth);
                totalExportDividend += pierYield;
            }
        }

        this.lastQuarterlyYield = totalExportDividend;
        return totalExportDividend;
    }

    processMonthlyTrade(currentMonth = 1) {
        const totalExportDividend = this.calculateTotalMonthlyDividends(currentMonth);
        return { totalExportDividend };
    }

    // Inspection details for Surveyor's Scope
    getInspectionData(ox, oy, currentMonth = 1) {
        const connected = this.isPierConnected(ox, oy);
        const estYield = this.calculateExportYield(ox, oy, currentMonth);
        return {
            facility: 'Harbor Cargo Pier (Funatsuki-ba)',
            facilityJa: '船着場 (港湾荷揚場)',
            connectionText: connected ? 'Linked to Canal Network' : 'Disconnected from Canals',
            connectionTextJa: connected ? '通船堀水路網接続中' : '水路未接続',
            quarterlyYield: estYield,
            tradeVolume: (connected && estYield > 0) ? 'Active / Surplus Exporting' : 'Inactive / Awaiting Surplus',
            tradeVolumeJa: (connected && estYield > 0) ? '盛業中 (物産外港輸出)' : '待機中 (余剰輸送待機)'
        };
    }
}
