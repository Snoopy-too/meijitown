// Project Meiji - Iteration 32 Verification Test Suite (test_iteration32.js)
// ponytail: unit & integration verification for economic rebalancing, upkeep, dividends & upgrade batching

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Headless DOM mock
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: (id) => ({
        id,
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
            toggle: () => {}
        },
        addEventListener: () => {},
        removeEventListener: () => {}
    }),
    createElement: (tag) => ({
        tagName: tag,
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        appendChild: () => {},
        addEventListener: () => {}
    }),
    body: { appendChild: () => {} }
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {}
};
globalThis.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] ?? null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

async function runTests() {
    console.log('================================================================');
    console.log('Project Meiji - Iteration 32 Verification Test Suite');
    console.log('================================================================\n');

    const { CONFIG } = await import('../public/js/config.js');
    const { TOOL_CATALOG } = await import('../public/js/config/toolCatalogData.js');
    const { EconomySystem } = await import('../public/js/simulation/economy_system.js');
    const { TradePierManager } = await import('../public/js/tradePierManager.js');
    const { SimulationEngine } = await import('../public/js/simulation.js');

    // 1. CONFIG & TOOL CATALOG SYNCHRONIZATION
    console.log('1. Testing Config Constants & Tool Catalog Synchronization...');
    assert.strictEqual(CONFIG.COSTS.PAVILION, 6000, 'Pavilion cost must be 6000');
    assert.strictEqual(CONFIG.SIMULATION.POWER_PLANT_MAINTENANCE, 75, 'Power plant upkeep must be 75');
    assert.strictEqual(CONFIG.SIMULATION.WATERWORKS_MAINTENANCE, 45, 'Waterworks upkeep must be 45');
    assert.strictEqual(CONFIG.SIMULATION.TRAIN_DEPOT_MAINTENANCE, 30, 'Train depot upkeep must be 30');
    assert.strictEqual(CONFIG.SIMULATION.SCHOOL_MAINTENANCE, 20, 'School upkeep must be 20');
    assert.strictEqual(CONFIG.SIMULATION.HARBOR_PIER_MAINTENANCE, 35, 'Harbor pier upkeep must be 35');
    assert.strictEqual(CONFIG.SIMULATION.RAIL_MAINTENANCE, 1, 'Rail upkeep must be 1');
    assert.strictEqual(CONFIG.SIMULATION.CANAL_MAINTENANCE, 1, 'Canal upkeep must be 1');
    assert.strictEqual(CONFIG.SIMULATION.SUIMON_MAINTENANCE, 4, 'Suimon upkeep must be 4');
    assert.strictEqual(CONFIG.SIMULATION.PAVILION_MAINTENANCE, 50, 'Pavilion upkeep must be 50');
    assert.strictEqual(CONFIG.SIMULATION.PROSPERITY_TREASURY_T1_MIN, 1000, 'T1 prosperity min must be 1000');
    assert.strictEqual(CONFIG.SIMULATION.PROSPERITY_TREASURY_T2_MIN, 2500, 'T2 prosperity min must be 2500');
    assert.strictEqual(CONFIG.SIMULATION.PROSPERITY_TREASURY_T3_MIN, 4500, 'T3 prosperity min must be 4500');

    // Verify catalog entries
    assert.strictEqual(TOOL_CATALOG.stone_road.upkeep, 2, 'Catalog stone_road upkeep must be 2');
    assert.strictEqual(TOOL_CATALOG.canal.upkeep, 1, 'Catalog canal upkeep must be 1');
    assert.strictEqual(TOOL_CATALOG.rail_track.upkeep, 1, 'Catalog rail_track upkeep must be 1');
    assert.strictEqual(TOOL_CATALOG.train_depot.upkeep, 30, 'Catalog train_depot upkeep must be 30');
    assert.strictEqual(TOOL_CATALOG.school.upkeep, 20, 'Catalog school upkeep must be 20');
    assert.strictEqual(TOOL_CATALOG.harbor_pier.upkeep, 35, 'Catalog harbor_pier upkeep must be 35');
    assert.strictEqual(TOOL_CATALOG.power_plant.upkeep, 75, 'Catalog power_plant upkeep must be 75');
    assert.strictEqual(TOOL_CATALOG.waterworks.upkeep, 45, 'Catalog waterworks upkeep must be 45');
    assert.strictEqual(TOOL_CATALOG.monument_pavilion.cost, 6000, 'Catalog pavilion cost must be 6000');
    assert.strictEqual(TOOL_CATALOG.monument_pavilion.upkeep, 50, 'Catalog pavilion upkeep must be 50');
    console.log('   ✓ CONFIG and TOOL_CATALOG are 100% synchronized\n');

    // 2. ECONOMY SIMULATION: INFRASTRUCTURE & CIVIC UPKEEP
    console.log('2. Testing Infrastructure & Civic Upkeep in EconomySystem...');
    const mockTiles = new Map();
    // 5 dirt roads (5 * 1 = 5)
    for (let i = 0; i < 5; i++) {
        mockTiles.set(`${i},0`, { type: CONFIG.TYPES.ROAD, roadTier: 1, x: i, y: 0 });
    }
    // 3 stone roads (3 * 2 = 6)
    for (let i = 5; i < 8; i++) {
        mockTiles.set(`${i},0`, { type: CONFIG.TYPES.ROAD, roadTier: 2, x: i, y: 0 });
    }
    // 10 rails (10 * 1 = 10)
    for (let i = 0; i < 10; i++) {
        mockTiles.set(`${i},1`, { type: CONFIG.TYPES.RAIL, x: i, y: 1 });
    }
    // 4 canals (4 * 1 = 4)
    for (let i = 0; i < 4; i++) {
        mockTiles.set(`${i},2`, { type: CONFIG.TYPES.CANAL, x: i, y: 2 });
    }
    // 1 Suimon (4)
    mockTiles.set('0,3', { type: CONFIG.TYPES.SERVICE, serviceType: CONFIG.SERVICES.SUIMON, x: 0, y: 3 });
    // 1 Power Plant (75)
    mockTiles.set('1,3', { type: CONFIG.TYPES.SERVICE, serviceType: CONFIG.SERVICES.POWER_PLANT, isOrigin: true, x: 1, y: 3 });
    // 1 Completed Pavilion (50)
    mockTiles.set('2,3', { type: CONFIG.TYPES.SERVICE, serviceType: CONFIG.SERVICES.PAVILION, isOrigin: true, stage: CONFIG.STAGES.BUILT, x: 2, y: 3 });

    const mockGrid = {
        tiles: mockTiles,
        isValidCoord: () => true,
        getTile: (x, y) => mockTiles.get(`${x},${y}`),
        getBuildingCounts: () => ({
            resL1: 0, resL2: 0, resL3: 0,
            comL1: 0, comL2: 0, comL3: 0, comL4: 0,
            indL1: 0, indL2: 0, industrial: 0
        })
    };

    const mockState = {
        treasury: 5000,
        lastCashflow: 0,
        population: 100,
        currentMonth: 5,
        metrics: { townHappiness: 70 },
        policies: { getMonthlyFiscalImpact: () => 0, isNightWatchActive: () => false },
        agriculture: { calculateHarvestYield: () => 0 },
        tradePierManager: { calculateTotalMonthlyDividends: () => 0 },
        showToast: () => {}
    };

    const economy = new EconomySystem(mockGrid, mockState);
    const netIncome = economy.processEconomy();

    // Expected maintenance:
    // Road: (5 * 1) + (3 * 2) = 11
    // Rail: 10 * 1 = 10
    // Canal: 4 * 1 = 4
    // Infra total: 11 + 10 + 4 = 25
    // Civic: Suimon (4) + Power Plant (75) + Pavilion (50) = 129
    // Total expenses: 25 + 129 = 154
    // Gross Tax: 0 => Net Income: -154
    assert.strictEqual(mockState.lastBudget.infraMaintenance, 25, 'Infra maintenance must be 25 (roads 11 + rail 10 + canal 4)');
    assert.strictEqual(mockState.lastBudget.civicUpkeep, 129, 'Civic upkeep must be 129 (power 75 + suimon 4 + pavilion 50)');
    assert.strictEqual(netIncome, -154, 'Net income must be -154');
    assert.strictEqual(mockState.treasury, 5000 - 154, 'Treasury must reflect net income deduction');
    console.log('   ✓ Rail, canal, suimon, and pavilion maintenance properly deducted\n');

    // 3. MARITIME EXPORT DIVIDENDS SCALING
    console.log('3. Testing Harbor Cargo Pier Export Dividends Scaling...');
    const pierManager = new TradePierManager(mockGrid, mockState);

    // Mock scanConnectedGoods: 0 goods
    pierManager.scanConnectedGoods = () => ({ riceCount: 0, millCount: 0, connected: true });
    let yield0 = pierManager.calculateExportYield(0, 0, 5);
    assert.strictEqual(yield0, 0, 'Pier with 0 connected goods must yield 0');

    // 1 rice paddy in Spring (Month 5): 1 * 20 = 20
    pierManager.scanConnectedGoods = () => ({ riceCount: 1, millCount: 0, connected: true });
    let yieldSpringRice = pierManager.calculateExportYield(0, 0, 5);
    assert.strictEqual(yieldSpringRice, 20, 'Pier with 1 paddy in spring must yield exactly ¥20 (no artificial ¥150 floor)');

    // 1 rice paddy in Autumn (Month 10): 1 * 40 = 40
    let yieldAutumnRice = pierManager.calculateExportYield(0, 0, 10);
    assert.strictEqual(yieldAutumnRice, 40, 'Pier with 1 paddy in autumn must yield ¥40');

    // 1 mill in Spring: 1 * 60 = 60
    pierManager.scanConnectedGoods = () => ({ riceCount: 0, millCount: 1, connected: true });
    let yieldMill = pierManager.calculateExportYield(0, 0, 5);
    assert.strictEqual(yieldMill, 60, 'Pier with 1 modern mill must yield ¥60');

    // High volume clamp check: 10 mills (600) + 10 paddies in autumn (400) = capped at 400
    pierManager.scanConnectedGoods = () => ({ riceCount: 10, millCount: 10, connected: true });
    let yieldMax = pierManager.calculateExportYield(0, 0, 10);
    assert.strictEqual(yieldMax, 400, 'Pier dividends must cap at ¥400 maximum');
    console.log('   ✓ Harbor pier yields scale organically without artificial floor\n');

    // 4. TIERED PROSPERITY THRESHOLDS & UPGRADE BATCHING
    console.log('4. Testing Tiered Prosperity & Upgrade Batching...');
    const upgradeTiles = new Map();
    for (let i = 0; i < 10; i++) {
        upgradeTiles.set(`${i},0`, {
            x: i, y: 0,
            type: CONFIG.TYPES.ZONE,
            zoneType: CONFIG.ZONES.RESIDENTIAL,
            stage: CONFIG.STAGES.BUILT,
            level: 1,
            ageTicks: 10
        });
    }

    const upgradedCoords = [];
    const testGrid = {
        tiles: upgradeTiles,
        isValidCoord: () => true,
        getTile: (x, y) => upgradeTiles.get(`${x},${y}`),
        hasAdjacentRoad: () => true,
        startRenovation: (x, y, lvl) => {
            upgradedCoords.push({ x, y, lvl });
            const t = upgradeTiles.get(`${x},${y}`);
            t.stage = CONFIG.STAGES.SCAFFOLDING;
            t.targetLevel = lvl;
        }
    };

    const simState = {
        treasury: 800, // Below T1 prosperity threshold (1000)
        population: 50,
        milestones: { currentTier: 1 },
        showToast: () => {}
    };

    const sim = new SimulationEngine(testGrid, simState);

    // Case A: Treasury below 1000 -> 0 upgrades
    let count = sim.evaluateUpgrades();
    assert.strictEqual(count, 0, 'No buildings should upgrade if treasury < 1000');
    assert.strictEqual(upgradedCoords.length, 0, 'No renovations should start');

    // Case B: Tier 1 village (treasury 1500) -> max 1 upgrade
    simState.treasury = 1500;
    count = sim.evaluateUpgrades();
    assert.strictEqual(count, 1, 'Tier 1 should batch exactly 1 upgrade per month');
    assert.strictEqual(upgradedCoords.length, 1, 'Exactly 1 renovation recorded');

    // Case C: Tier 2 town (treasury 3000, pop 150) -> max 2 upgrades
    simState.milestones.currentTier = 2;
    simState.population = 150;
    simState.treasury = 3000;
    count = sim.evaluateUpgrades();
    assert.strictEqual(count, 2, 'Tier 2 should batch up to 2 upgrades per month');
    assert.strictEqual(upgradedCoords.length, 3, 'Total 3 renovations recorded');

    // Case D: Tier 4 metropolis (treasury 8000, pop 700) -> max 5 upgrades
    simState.milestones.currentTier = 4;
    simState.population = 700;
    simState.treasury = 8000;
    count = sim.evaluateUpgrades();
    assert.strictEqual(count, 5, 'Tier 4 should batch up to 5 upgrades per month');
    assert.strictEqual(upgradedCoords.length, 8, 'Total 8 renovations recorded');
    console.log('   ✓ Upgrade batching and tiered prosperity thresholds functioning perfectly\n');

    // 5. FILE SIZE AUDIT
    console.log('5. Testing File Size Governance (Strict < 450–500 Lines)...');
    const filesToAudit = [
        'public/js/config.js',
        'public/js/config/toolCatalogData.js',
        'public/js/simulation/economy_system.js',
        'public/js/tradePierManager.js',
        'public/js/simulation.js',
        'public/js/milestoneManager.js'
    ];

    for (const relPath of filesToAudit) {
        const fullPath = path.resolve(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        assert.ok(lines <= 450, `${relPath} exceeded 450 lines (currently ${lines})`);
        console.log(`   ✓ ${relPath}: ${lines} lines (under 450 limit)`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL ITERATION 32 ACCEPTANCE TESTS PASSED (100%)');
    console.log('================================================================\n');
}

runTests().catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
