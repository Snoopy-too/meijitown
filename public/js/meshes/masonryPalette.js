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

const MACHIYA_ARCHETYPES = ['hira_cottage', 'tsushi_nikai', 'hon_nikai', 'courtyard_machiya'];
const MACHIYA_WALLS = ['plasterWarm', 'plasterUmber', 'plasterWhite', 'stuccoOchre'];
const MACHIYA_TIMBERS = [
    { timber: 'woodMedium', wainscot: 'woodDark' },
    { timber: 'woodCharred', wainscot: 'woodDark' },
    { timber: 'woodHinoki', wainscot: 'woodMedium' },
    { timber: 'woodDark', wainscot: 'woodCharred' }
];
const MACHIYA_ROOFS = ['kawaraRoof', 'kawaraRusset', 'kawaraRoof', 'slateRoof'];

const KURA_STYLES = [
    { name: 'kawagoe_namako', mainWall: 'plasterWhite', doorWall: 'plasterBlack', dado: 'namakoWall', quoin: 'plasterBlack', wood: 'woodDark', roof: 'kawaraRoof' },
    { name: 'edo_kuro_shikkui', mainWall: 'plasterBlack', doorWall: 'plasterWhite', dado: 'stoneGranite', quoin: 'stoneTrim', wood: 'woodCharred', roof: 'slateRoof' },
    { name: 'mise_gura_ochre', mainWall: 'plasterUmber', doorWall: 'woodDark', dado: 'woodCharred', quoin: 'plasterWarm', wood: 'woodMedium', roof: 'kawaraRusset' }
];

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

export function getMachiyaPalette(tile) {
    const h = hashTileCoords(tile);
    const archetypeIndex = h & 3;
    const timberPair = MACHIYA_TIMBERS[(h >>> 5) & 3];
    return {
        archetypeIndex,
        archetypeName: MACHIYA_ARCHETYPES[archetypeIndex],
        flip: ((h >>> 2) & 1) ? -1 : 1,
        propVariant: (h >>> 9) & 3,
        hasSudare: ((h >>> 11) & 1) === 1,
        upperWindowCount: ((h >>> 12) & 1) ? 3 : 2,
        lanternIsRed: ((h >>> 13) & 3) === 0,
        plasterMat: MaterialLibrary.get(MACHIYA_WALLS[(h >>> 3) & 3]),
        timberMat: MaterialLibrary.get(timberPair.timber),
        wainscotMat: MaterialLibrary.get(timberPair.wainscot),
        roofMat: MaterialLibrary.get(MACHIYA_ROOFS[(h >>> 7) & 3]),
        trimMat: MaterialLibrary.get('stoneTrim')
    };
}

export function getKuraPalette(tile) {
    const h = hashTileCoords(tile);
    const spec = KURA_STYLES[h % KURA_STYLES.length];
    return {
        archetypeName: spec.name,
        flip: ((h >>> 2) & 1) ? -1 : 1,
        propVariant: (h >>> 4) & 3,
        mainWallMat: MaterialLibrary.get(spec.mainWall),
        doorWallMat: MaterialLibrary.get(spec.doorWall),
        dadoMat: MaterialLibrary.get(spec.dado),
        quoinMat: MaterialLibrary.get(spec.quoin),
        woodMat: MaterialLibrary.get(spec.wood),
        roofMat: MaterialLibrary.get(spec.roof),
        trimMat: MaterialLibrary.get('stoneTrim')
    };
}
