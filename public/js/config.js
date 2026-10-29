// Determine dynamic asset base path (standalone vs game_modules/meiji-town module)
export function getAssetBase() {
    if (typeof window !== 'undefined' && window.__MEIJI_ASSET_BASE__) {
        return window.__MEIJI_ASSET_BASE__;
    }
    // Check if running inside lobby game_modules
    if (typeof window !== 'undefined' && window.location.pathname.includes('/game_modules/')) {
        return '/game_modules/meiji-town/public/';
    }
    return '';
}

export function assetUrl(relativePath) {
    const base = getAssetBase();
    if (!relativePath) return relativePath;
    if (relativePath.startsWith('/') || relativePath.startsWith('http')) return relativePath;
    return `${base}${relativePath}`;
}

export const CONFIG = {

    GRID_WIDTH: 35,
    GRID_HEIGHT: 35,
    TILE_SIZE: 2.0,

    TYPES: {
        EMPTY: 'empty',
        ROAD: 'road',
        ZONE: 'zone',
        SERVICE: 'service',
        CANAL: 'canal',
        RAIL: 'rail',
        PARK: 'park',
        AGRICULTURE: 'agriculture',
    },

    ZONES: {
        RESIDENTIAL: 'residential',
        COMMERCIAL: 'commercial',
        INDUSTRIAL: 'industrial',
    },

    SERVICES: {
        WATCHTOWER: 'watchtower',
        FIRE_DEPOT: 'fire_depot',
        WELL: 'well',
        OCHAYA: 'ochaya',
        SENTO: 'sento',
        KOBAN: 'koban',
        SHRINE_PARK: 'shrine_park',
        TRAIN_DEPOT: 'train_depot',
        SCHOOL: 'school',
        TELEGRAPH: 'telegraph',
        HARBOR_PIER: 'harbor_pier',
        POWER_PLANT: 'power_plant',
        WATERWORKS: 'waterworks',
        PAVILION: 'pavilion',
        SUIMON: 'suimon',
    },

    STAGES: {
        NONE: 'none',
        SCAFFOLDING: 'scaffolding',
        BUILT: 'built',
        ON_FIRE: 'on_fire',
        BURNED: 'burned',
    },

    COSTS: {
        ROAD: 10,
        STONE_ROAD: 30,  // Tier 2 Stone Paving (Ishidatami) absolute firebreak
        STONE_UPGRADE: 20, // Upgrade existing dirt road to stone
        RESIDENTIAL: 15,
        COMMERCIAL: 20,
        INDUSTRIAL: 25,
        BULLDOZE: 5,
        WATCHTOWER: 250, // Fire Watchtower ploppable service
        FIRE_DEPOT: 180, // Fire Brigade Depot (Hikeshi-sho)
        WELL: 60,        // Communal Well (Ido) public sanitation
        OCHAYA: 120,     // Traditional Teahouse (Ochaya) entertainment
        SENTO: 90,       // Public Bathhouse (Sentō) sanitation & entertainment
        CANAL: 15,       // Historical canal (Hori) water transit & firebreak
        KOBAN: 110,      // Meiji Police Box (Kōban) public order & security
        SCHOOL: 280,     // Meiji Primary School (Shōgakkō) 2x2 education [¥280]
        RICE_PADDY: 10,  // Irrigated Rice Paddy (Suiden) agrarian cultivation [¥10]
        FIREFIGHT: 25,   // Machi-Hikeshi volunteer bucket brigade dispatch
        RAIL: 20,        // Iron rail tracks laid across wooden ties [¥20/tile]
        TRAIN_DEPOT: 350,// Rural Train Depot station platform [¥350]
        CANAL_TREE: 15,  // Standalone Weeping Willow / Sakura tree [¥15]
        SHRINE_PARK: 50, // Neighborhood Shrine Park (Jinjanoki) [¥50]
        TELEGRAPH: 220,  // Meiji Telegraph Office (Denshin-kyoku) [¥220]
        HARBOR_PIER: 450,// Harbor Cargo Pier (Funatsuki-ba) [¥450]
        POWER_PLANT: 600,// Coal Steam Power Plant 2x2 [¥600]
        WATERWORKS: 350, // Modern Water Filtration Basin 2x1 [¥350]
        PAVILION: 6000,  // National Industrial Exhibition Pavilion 3x3 [¥6,000]
        SUIMON: 180,     // Watergate Sluice (Suimon) flood prevention [¥180]
    },

    COLORS: {
        GROUND: 0x5a7d4b,
        GRID_LINE: 0x4d6d3f,
        ROAD: 0x7c6348,          // Warm earth brown dirt road
        ROAD_BORDER: 0x644e37,   // Feathered dirt road border
        ROAD_SHOULDER: 0x6e5840, // Dirt road shoulder

        // Tier 2 Stone Paving Colors (Ishidatami - Meiji Granite Masonry)
        STONE_ROAD: 0x8e8b82,          // Primary paver tone (warm grey sandstone/granite)
        STONE_ROAD_BORDER: 0x6e6b65,   // Kerb / shoulder trim
        STONE_ROAD_SHOULDER: 0x6e6b65,
        STONE_ROAD_ROUGHNESS: 0.85,

        // Empty zone subtle decals
        ZONE_EMPTY_RES: 0x8fa88b, // Soft Sage Green
        ZONE_EMPTY_COM: 0x7a8b99, // Soft Muted Indigo
        ZONE_EMPTY_IND: 0xa89276, // Warm Earth Ochre
        ZONE_DECAL_OPACITY: 0.35,

        HIGHLIGHT_VALID: 0x48c774,
        HIGHLIGHT_INVALID: 0xd9534f, // Red rejection color
        HIGHLIGHT_BULLDOZE: 0xd9534f,
    },

    ATMOSPHERE: {
        BACKGROUND: 0xd8e4ec,    // Crisp woodblock celadon-sky horizon
        FOG: 0xd8e4ec,
        FOG_DENSITY: 0.0042,
        SUN_COLOR: 0xfff8eb,     // Warm high-contrast daylight key sun
        SUN_INTENSITY: 1.65,
        HEMI_SKY: 0xd8ecff,      // Cool azure sky bounce for crisp shadow contrast
        HEMI_GROUND: 0x5c6e46,   // Warm earth/moss bounce
        HEMI_INTENSITY: 0.68,

        // 4-Phase Day / Night Cycle Presets
        PHASES: {
            DAWN: {
                NAME: 'Dawn',
                SUN_COLOR: 0xffdfba,
                SUN_INTENSITY: 1.45,
                SUN_POS: [38, 32, 24],
                HEMI_SKY: 0xdce6f2,
                HEMI_GROUND: 0x54633b,
                HEMI_INTENSITY: 0.62,
                BACKGROUND: 0xe6ddd2,
                FOG: 0xe4dbd0,
                FOG_DENSITY: 0.0045,
                EMISSIVE_INTENSITY: 0.15,
            },
            DAY: {
                NAME: 'Daytime',
                SUN_COLOR: 0xfff8eb,
                SUN_INTENSITY: 1.65,
                SUN_POS: [28, 52, 24],
                HEMI_SKY: 0xd8ecff,
                HEMI_GROUND: 0x5c6e46,
                HEMI_INTENSITY: 0.68,
                BACKGROUND: 0xd8e4ec,
                FOG: 0xd8e4ec,
                FOG_DENSITY: 0.0042,
                EMISSIVE_INTENSITY: 0.0,
            },
            TWILIGHT: {
                NAME: 'Twilight',
                SUN_COLOR: 0xffb066,
                SUN_INTENSITY: 1.40,
                SUN_POS: [45, 22, 35],
                HEMI_SKY: 0x8fa4c4,
                HEMI_GROUND: 0x4a3b2c,
                HEMI_INTENSITY: 0.58,
                BACKGROUND: 0xd9b89c,
                FOG: 0xd4b296,
                FOG_DENSITY: 0.0048,
                EMISSIVE_INTENSITY: 0.55,
            },
            NIGHT: {
                NAME: 'Night',
                SUN_COLOR: 0x5b76a8,
                SUN_INTENSITY: 0.72,
                SUN_POS: [-24, 42, -26],
                HEMI_SKY: 0x2c3e66,
                HEMI_GROUND: 0x182030,
                HEMI_INTENSITY: 0.48,
                BACKGROUND: 0x162038,
                FOG: 0x162038,
                FOG_DENSITY: 0.0052,
                EMISSIVE_INTENSITY: 0.90,
            }
        }
    },

    CAMERA: {
        MIN_DISTANCE: 10,
        MAX_DISTANCE: 65,
        MAX_POLAR_ANGLE: Math.PI / 2.2,
    },

    SIMULATION: {
        BASE_MONTH_MS: 12000,
        BASE_TICK_MS: 12000,
        TICK_INTERVAL_MS: 12000,
        SPEED_MULTIPLIERS: [1, 2, 3, 5],
        SPEED_INTERVALS: { 1: 12000, 2: 6000, 3: 3000, 5: 1500 },
        INITIAL_TREASURY: 5000,
        STARTING_FUNDS: 5000,
        SCAFFOLD_TICKS: 2,

        // Dynamic Seasonality Foliage Colors
        SEASON_COLORS: {
            SPRING: 0xf4c2c2, // Soft pink blossom (M3-M5)
            SUMMER: 0x4a6b3d, // Vibrant forest green (M6-M8)
            AUTUMN: 0xa03e28, // Autumnal russet / maple red (M9-M11)
            WINTER: 0x8c857b, // Pale winter grey/brown (M12-M2)
        },

        // Tier 1 Stats
        POP_PER_RESIDENCE_L1: 8,
        TAX_RESIDENTIAL_L1: 4,
        TAX_COMMERCIAL_L1: 10,
        TAX_INDUSTRIAL_L1: 14,
        ROAD_MAINTENANCE: 1,
        STONE_ROAD_MAINTENANCE: 2,
        RAIL_MAINTENANCE: 1,        // Iron rail tracks ongoing maintenance (¥1/tile/mo)
        CANAL_MAINTENANCE: 1,       // Canal water dredging & embankment upkeep (¥1/tile/mo)
        SUIMON_MAINTENANCE: 4,      // Watergate Sluice monthly upkeep (¥4/mo)
        PAVILION_MAINTENANCE: 50,   // National Exhibition Pavilion monthly upkeep (¥50/mo)

        // Tier 2 Renovation Progression & Tiered Prosperity Thresholds
        UPGRADE_MIN_AGE_TICKS: 4,
        PROSPERITY_TREASURY_MIN: 1000,    // General fallback minimum
        PROSPERITY_TREASURY_T1_MIN: 1000, // Level 1 -> 2 renovation threshold
        PROSPERITY_TREASURY_T2_MIN: 2500, // Level 2 -> 3 renovation threshold
        PROSPERITY_TREASURY_T3_MIN: 4500, // Level 3/4 Ginza Western Arcade renovation threshold

        // Upgrade Batching Limits (Renovations per month by town tier)
        UPGRADE_BATCH_LIMIT_T1: 1,
        UPGRADE_BATCH_LIMIT_T2: 2,
        UPGRADE_BATCH_LIMIT_T3: 3,
        UPGRADE_BATCH_LIMIT_T4: 5,
        POP_GAIN_L2: 10,
        TAX_RESIDENTIAL_L2: 9,
        TAX_COMMERCIAL_L2: 22,
        POP_GAIN_L3: 15,            // Giyōfū Red Brick population surge
        TAX_COMMERCIAL_L3: 45,       // Giyōfū 2x+ commercial revenue
        TAX_INDUSTRIAL_L2: 38,       // Modern Meiji Silk Reeling / Cotton Mill (Seishi-jō)
        POP_GAIN_L2_IND: 12,        // Industrial factory workforce influx

        // Civic Services & Public Sanitation
        WATCHTOWER_RADIUS: 6,       // Tile coverage radius
        WATCHTOWER_MAINTENANCE: 6,  // Monthly upkeep
        FIRE_DEPOT_RADIUS: 10,      // Road transit coverage radius (tiles)
        FIRE_DEPOT_MAINTENANCE: 5,  // Monthly upkeep
        WELL_RADIUS: 6,             // Clean water sanitation coverage radius
        WELL_MAINTENANCE: 1,        // Monthly upkeep (¥1/mo)
        OCHAYA_RADIUS: 6,           // 6-tile circular entertainment zone
        OCHAYA_MAINTENANCE: 3,      // Monthly upkeep (¥3/mo)
        SENTO_RADIUS: 5,            // 5-tile radius (+50% sanitation, +25% leisure)
        SENTO_MAINTENANCE: 2,       // Monthly upkeep (¥2/mo)
        KOBAN_RADIUS: 8,            // 8-tile circular public order zone
        KOBAN_MAINTENANCE: 3,       // Monthly upkeep (¥3/mo)
        SCHOOL_RADIUS: 8,           // 8-tile education coverage radius
        SCHOOL_MAINTENANCE: 20,     // Primary school operational upkeep (¥20/mo)
        TELEGRAPH_MAINTENANCE: 6,   // Meiji Telegraph Office monthly upkeep (¥6/mo)
        HARBOR_PIER_MAINTENANCE: 35,// Harbor Cargo Pier monthly upkeep (¥35/mo)
        POWER_PLANT_MAINTENANCE: 75,// Coal Steam Power Plant monthly upkeep (¥75/mo)
        WATERWORKS_MAINTENANCE: 45, // Water Filtration Basin monthly upkeep (¥45/mo)
        POWER_POLLUTION_RADIUS: 4,  // Coal soot pollution radius (tiles)
        POWER_POLLUTION_PENALTY: 8, // Residential satisfaction penalty (-8%)
        WATERWORKS_RADIUS: 18,      // Pressurized clean water pipe radius (tiles)
        PAVILION_CONSTRUCTION_MONTHS: 6, // In-game months to complete Pavilion
        TAX_RESIDENTIAL_L3: 18,     // Modern Western-style Brick Residence monthly tax
        POP_GAIN_L3_RES: 16,        // Population gain for Brick Residence
        CIVIC_TELEGRAPH_BOOST: 1.30,// +30% civic range boost when linked to telegraph grid
        TAX_COMMERCIAL_L4: 70,      // Western Brick Arcades (Ginza Rengagai) commercial tax
        POP_GAIN_L4: 25,            // Population gain for Ginza Brick Arcades
        RICE_HARVEST_BONUS: 20,     // Autumn harvest yield bonus per irrigated tile (+¥20)
        TRAIN_DEPOT_MAINTENANCE: 30,// Rural Train Depot monthly upkeep (¥30/mo)
        DEFAULT_HAPPINESS: 65,      // Default citizen satisfaction score
        FIRE_SPREAD_CHANCE: 0.40,   // Chance to spread per tick to adjacent wooden structure
        FIRE_BURN_TICKS: 3,         // Ticks before burning down to ash if unextinguished
    },

    MODELS: {
        SCAFFOLD: 'assets/models/building_scaffold.glb',
        RESIDENTIAL_L1: 'assets/models/residential_l1_machiya.glb',
        RESIDENTIAL_L2: 'assets/models/residential_l2_kura.glb',
        COMMERCIAL_L1: 'assets/models/commercial_l1_shouten.glb',
        COMMERCIAL_L2: 'assets/models/commercial_l2_machiya.glb',
        COMMERCIAL_L3: 'assets/models/commercial_l3_giyofu.glb',
        COMMERCIAL_L4: 'assets/models/commercial_tier3_brick.glb',
        COMMERCIAL_TIER3_BRICK: 'assets/models/commercial_tier3_brick.glb',
        INDUSTRIAL_L1: 'assets/models/industrial_l1_workshop.glb',
        INDUSTRIAL_L2: 'assets/models/industrial_l2_mill.glb',
        WATCHTOWER: 'assets/models/service_fire_watchtower.glb',
        FIRE_DEPOT: null, // Procedural model via ProceduralMeshes.createFireDepotMesh
        WELL: 'assets/models/service_communal_well.glb',
        OCHAYA: 'assets/models/civic_ochaya.glb',
        SENTO: 'assets/models/civic_sento.glb',
        KOBAN: 'assets/models/civic_koban.glb',
        SCHOOL: 'assets/models/civic_school.glb',
        TELEGRAPH: 'assets/models/civic_telegraph.glb',
        HARBOR_PIER: 'assets/models/infrastructure_pier.glb',
        POWER_PLANT: 'assets/models/utility_powerplant.glb',
        WATERWORKS: null,
        PAVILION: 'assets/models/monument_pavilion.glb',
        BARGE: 'assets/models/vehicle_barge.glb',
        CROSSING: 'assets/models/crossing_wood.glb',
        TRAIN: 'assets/models/vehicle_train.glb',
    },

    TOOLS: {
        INSPECT: 'inspect',
        ROAD: 'road',
        STONE_ROAD: 'stone_road',
        CANAL: 'canal',
        RAIL_TRACK: 'rail_track',
        TRAIN_DEPOT: 'train_depot',
        TREE_WILLOW: 'tree_willow',
        SHRINE_PARK: 'shrine_park',
        RESIDENTIAL: 'residential',
        COMMERCIAL: 'commercial',
        INDUSTRIAL: 'industrial',
        WATCHTOWER: 'watchtower',
        FIRE_DEPOT: 'fire_depot',
        WELL: 'well',
        OCHAYA: 'ochaya',
        SENTO: 'sento',
        KOBAN: 'koban',
        SCHOOL: 'school',
        TELEGRAPH: 'telegraph',
        HARBOR_PIER: 'harbor_pier',
        POWER_PLANT: 'power_plant',
        WATERWORKS: 'waterworks',
        PAVILION: 'monument_pavilion',
        RICE_PADDY: 'rice_paddy',
        SUIMON: 'suimon',
        BULLDOZER: 'bulldozer',
    }
};
