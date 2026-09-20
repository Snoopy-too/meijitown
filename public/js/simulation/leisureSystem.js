// Project Meiji - Leisure & Cultural Provider Subsystem (leisureSystem.js)
// ponytail: unified leisure registry (Teahouse, Bathhouse, Shrine Park) & 4-tile radial walking coverage (< 100 lines)

import { CONFIG } from '../config.js';

export const LEISURE_PROVIDERS = {
    TEAHOUSE: {
        id: CONFIG.SERVICES.OCHAYA,
        nameEn: 'Teahouse',
        nameJa: '茶屋',
        radius: CONFIG.SIMULATION.OCHAYA_RADIUS || 6,
    },
    BATHHOUSE: {
        id: CONFIG.SERVICES.SENTO,
        nameEn: 'Bathhouse',
        nameJa: '銭湯',
        radius: CONFIG.SIMULATION.SENTO_RADIUS || 5,
    },
    SHRINE: {
        id: CONFIG.SERVICES.SHRINE_PARK,
        nameEn: 'Shrine Park',
        nameJa: '鎮守の杜',
        radius: 4, // 4-tile open walking path radius
        satisfactionBoost: 10, // +10% satisfaction bonus
    }
};

export class LeisureSystem {
    constructor(gridModel, stateManager) {
        this.grid = gridModel;
        this.state = stateManager;
    }

    isProviderCovered(x, y, providerKey) {
        const prov = LEISURE_PROVIDERS[providerKey];
        if (!prov || !this.grid?.tiles) return false;
        for (const [_, tile] of this.grid.tiles.entries()) {
            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === prov.id) {
                if (Math.hypot(tile.x - x, tile.y - y) <= prov.radius) {
                    return true;
                }
            }
        }
        return false;
    }

    isShrineCovered(x, y) {
        return this.isProviderCovered(x, y, 'SHRINE');
    }

    isTeahouseCovered(x, y) {
        return this.isProviderCovered(x, y, 'TEAHOUSE');
    }

    isOchayaCovered(x, y) {
        return this.isTeahouseCovered(x, y);
    }

    isBathhouseCovered(x, y) {
        return this.isProviderCovered(x, y, 'BATHHOUSE');
    }

    isSentoCovered(x, y) {
        return this.isBathhouseCovered(x, y);
    }

    isEntertainmentCovered(x, y) {
        return this.isTeahouseCovered(x, y) || this.isBathhouseCovered(x, y);
    }

    getShrineSatisfactionBonus(x, y) {
        return this.isShrineCovered(x, y) ? (LEISURE_PROVIDERS.SHRINE.satisfactionBoost || 10) : 0;
    }
}
