// Project Meiji - Deterministic Fireproof Masonry Palette Selector (masonryPalette.js)
// Clean domain mapping giving upgraded L2/L3/L4 zones authentic Meiji material diversity without breaking fireproof rules

import { MaterialLibrary } from '../renderer/materialLibrary.js';

const VARIANT_TABLES = {
    residential: [
        { name: 'akarenga', lowerWall: 'redBrick', upperWall: 'redBrick', quoin: 'stoneTrim', trim: 'stoneTrim', roof: 'slateRoof', chimney: 'redBrick' },
        { name: 'kirenga', lowerWall: 'buffBrick', upperWall: 'buffBrick', quoin: 'stoneTrim', trim: 'stoneTrim', roof: 'kawaraRoof', chimney: 'buffBrick' },
        { name: 'sekizo', lowerWall: 'ashlarStone', upperWall: 'ashlarStone', quoin: 'stoneGranite', trim: 'stoneGranite', roof: 'slateRoof', chimney: 'ashlarStone' },
        { name: 'giyofu_stucco', lowerWall: 'clinkerBrick', upperWall: 'stuccoOchre', quoin: 'redBrick', trim: 'stoneTrim', roof: 'kawaraRoof', chimney: 'redBrick' }
    ],
    commercial: [
        { name: 'akarenga_arcade', lowerWall: 'redBrick', upperWall: 'redBrick', quoin: 'stoneTrim', trim: 'stoneTrim', roof: 'slateRoof', chimney: 'redBrick' },
        { name: 'kirenga_arcade', lowerWall: 'buffBrick', upperWall: 'buffBrick', quoin: 'stoneGranite', trim: 'stoneTrim', roof: 'kawaraRoof', chimney: 'buffBrick' },
        { name: 'sekizo_exchange', lowerWall: 'ashlarStone', upperWall: 'ashlarStone', quoin: 'stoneGranite', trim: 'stoneTrim', roof: 'copperRoof', chimney: 'ashlarStone' },
        { name: 'giyofu_sage', lowerWall: 'redBrick', upperWall: 'stuccoSage', quoin: 'redBrick', trim: 'stoneTrim', roof: 'kawaraRoof', chimney: 'redBrick' }
    ],
    industrial: [
        { name: 'yakishime_clinker', kiln: 'clinkerBrick', chimney: 'clinkerBrick', lowerWall: 'clinkerBrick', upperWall: 'clinkerBrick', quoin: 'stoneGranite', trim: 'stoneTrim', roof: 'slateRoof' },
        { name: 'akarenga_mill', kiln: 'redBrick', chimney: 'clinkerBrick', lowerWall: 'redBrick', upperWall: 'redBrick', quoin: 'stoneTrim', trim: 'stoneTrim', roof: 'slateRoof' },
        { name: 'fireclay_buff', kiln: 'buffBrick', chimney: 'clinkerBrick', lowerWall: 'buffBrick', upperWall: 'buffBrick', quoin: 'clinkerBrick', trim: 'stoneGranite', roof: 'kawaraRoof' },
        { name: 'stucco_clinker', kiln: 'clinkerBrick', chimney: 'redBrick', lowerWall: 'clinkerBrick', upperWall: 'stuccoOchre', quoin: 'redBrick', trim: 'stoneTrim', roof: 'kawaraRoof' }
    ]
};

function hashTileCoords(tile) {
    const x = Number.isFinite(tile?.x) ? (tile.x | 0) : 0;
    const y = Number.isFinite(tile?.y) ? (tile.y | 0) : 0;
    let h = Math.imul(x + 17, 374761393) + Math.imul(y + 31, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}

export function getFireproofPalette(tile, role = 'residential') {
    const table = VARIANT_TABLES[role] || VARIANT_TABLES.residential;
    const spec = table[hashTileCoords(tile) % table.length];
    return {
        variantName: spec.name,
        lowerWallMat: MaterialLibrary.get(spec.lowerWall),
        upperWallMat: MaterialLibrary.get(spec.upperWall),
        quoinMat: MaterialLibrary.get(spec.quoin),
        trimMat: MaterialLibrary.get(spec.trim),
        roofMat: MaterialLibrary.get(spec.roof),
        chimneyMat: MaterialLibrary.get(spec.chimney || spec.lowerWall),
        kilnMat: MaterialLibrary.get(spec.kiln || spec.lowerWall)
    };
}
