// Project Meiji - Multi-Tile Footprint Previews & Metadata (footprintPreview.js)
// ponytail: footprint dimension dictionary, coordinate expansion, and meadow vacancy validation (< 80 lines)

import { CONFIG } from './config.js';

export const TOOL_FOOTPRINTS = {
    [CONFIG.TOOLS.SCHOOL]: { w: 2, h: 2 },
    [CONFIG.TOOLS.HARBOR_PIER]: { w: 2, h: 2 },
    [CONFIG.TOOLS.POWER_PLANT]: { w: 2, h: 2 },
    [CONFIG.TOOLS.WATERWORKS]: { w: 2, h: 1 },
    [CONFIG.TOOLS.PAVILION]: { w: 3, h: 3 },
    monument_pavilion: { w: 3, h: 3 },
    pavilion: { w: 3, h: 3 }
};

export function getFootprint(toolType, rotation = 0) {
    const base = TOOL_FOOTPRINTS[toolType] || { w: 1, h: 1 };
    if ((rotation % 2 === 1) && base.w !== base.h) {
        return { w: base.h, h: base.w };
    }
    return { w: base.w, h: base.h };
}

export function getFootprintTiles(originX, originY, toolType, rotation = 0) {
    const { w, h } = getFootprint(toolType, rotation);
    const coords = [];
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            coords.push({ x: originX + dx, y: originY + dy });
        }
    }
    return coords;
}

export function isFootprintClear(grid, originX, originY, toolType, rotation = 0) {
    if (!grid) return true;
    const tiles = getFootprintTiles(originX, originY, toolType, rotation);
    for (const { x, y } of tiles) {
        if (!grid.isValidCoord(x, y)) return false;
        const t = grid.getTile(x, y);
        if (!t) return false;
        if (t.occupied || t.type === CONFIG.TYPES.ROAD || t.type === CONFIG.TYPES.SERVICE ||
            t.type === CONFIG.TYPES.RAIL || t.type === CONFIG.TYPES.CANAL ||
            t.type === CONFIG.TYPES.PARK || t.type === CONFIG.TYPES.AGRICULTURE) {
            return false;
        }
    }
    return true;
}
