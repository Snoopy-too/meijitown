// Project Meiji - Iteration 7 Verification Test Suite
// Modernization Era (1880s): Giyōfū Red Brick Commercial L3, Ambient Traffic, Communal Well (Ido)
// ponytail: assert-based headless test runner, zero external test framework dependencies

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal Node.js DOM shims for headless testing
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
};
globalThis.window = {
    addEventListener: () => {},
};

import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { SimulationEngine } from '../public/js/simulation.js';
import { ToolController } from '../public/js/tools.js';

console.log('--- Project Meiji: Iteration 7 Automated Test Suite ---');

// 1. Verify Blender GLB Asset Generation
console.log('1. Verifying 3D GLB Model Asset Exports...');
const modelsDir = path.resolve(__dirname, '..', 'public', 'assets', 'models');
const giyofuGlbPath = path.join(modelsDir, 'commercial_l3_giyofu.glb');
const wellGlbPath = path.join(modelsDir, 'service_communal_well.glb');

assert.ok(fs.existsSync(giyofuGlbPath), 'commercial_l3_giyofu.glb must exist in assets/models');
assert.ok(fs.statSync(giyofuGlbPath).size > 1000, 'commercial_l3_giyofu.glb must be a valid non-empty GLB asset');

assert.ok(fs.existsSync(wellGlbPath), 'service_communal_well.glb must exist in assets/models');
assert.ok(fs.statSync(wellGlbPath).size > 1000, 'service_communal_well.glb must be a valid non-empty GLB asset');
console.log('✓ 3D GLB models verified (Giyōfū L3 & Communal Well).');

// 2. Verify Config Constants
console.log('2. Verifying Config Constants for Modernization Era...');
assert.strictEqual(CONFIG.SERVICES.WELL, 'well', 'CONFIG.SERVICES.WELL must be defined');
assert.strictEqual(CONFIG.TOOLS.WELL, 'well', 'CONFIG.TOOLS.WELL must be defined');
assert.strictEqual(CONFIG.COSTS.WELL, 60, 'Communal Well cost must be ¥60');
assert.strictEqual(CONFIG.SIMULATION.WELL_RADIUS, 6, 'Well clean water radius must be 6 tiles');
assert.strictEqual(CONFIG.SIMULATION.WELL_MAINTENANCE, 1, 'Well maintenance must be ¥1/mo');
assert.strictEqual(CONFIG.SIMULATION.POP_GAIN_L3, 15, 'Level 3 population gain must be +15');
assert.strictEqual(CONFIG.SIMULATION.TAX_COMMERCIAL_L3, 45, 'Level 3 commercial tax revenue must be ¥45/mo');
console.log('✓ Configuration constants verified.');

// Mock Game State Manager
const mockState = {
    treasury: 5000,
    population: 100,
    metrics: {
        residentialDemand: 50,
        commercialDemand: 50,
        industrialDemand: 50,
        fireRisk: 0,
        choleraRisk: 0,
    },
    deductTreasury(amount) {
        if (this.treasury >= amount) {
            this.treasury -= amount;
            return true;
        }
        return false;
    },
    updateHUD: () => {},
    showToast: () => {},
    updateInspector: () => {},
};

const grid = new CityGridModel(32, 32);
const sim = new SimulationEngine(grid, mockState);
mockState.simulation = sim;

// 3. Test Communal Well (Ido) Tool Placement & Upkeep
console.log('3. Testing Communal Well (Ido) Tool Placement & Sanitation...');
const mockRenderer = {
    renderer: {
        domElement: {
            addEventListener: () => {},
            getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        },
    },
    controls: { enableRotate: true },
    getTileWorldPos: (x, y) => ({ x: (x + 0.5) * 2, z: (y + 0.5) * 2 }),
    raycastTile: () => null,
    updateCursor: () => {},
    fx: {
        detachFire: () => {},
        spawnWaterSplash: () => {},
        spawnWaterSteam: () => {},
        spawnDemolishPuff: () => {},
    },
};

const toolController = new ToolController(grid, mockRenderer, mockState);

// Select Well tool
toolController.setActiveTool(CONFIG.TOOLS.WELL);
assert.strictEqual(toolController.currentTool, CONFIG.TOOLS.WELL);

// Place well at (10, 10)
const initialTreasury = mockState.treasury;
toolController.applyTool(10, 10);
assert.strictEqual(mockState.treasury, initialTreasury - 60, 'Treasury must be deducted by ¥60');

const wellTile = grid.getTile(10, 10);
assert.strictEqual(wellTile.type, CONFIG.TYPES.SERVICE);
assert.strictEqual(wellTile.serviceType, CONFIG.SERVICES.WELL);

// Verify Well 6-tile Radius Coverage
assert.strictEqual(sim.isWellCovered(10, 10), true, 'Well center is covered');
assert.strictEqual(sim.isWellCovered(14, 10), true, 'Tile 4 tiles away is within 6-tile radius');
assert.strictEqual(sim.isWellCovered(16, 10), true, 'Tile exactly 6 tiles away is covered');
assert.strictEqual(sim.isWellCovered(17, 10), false, 'Tile 7 tiles away is NOT covered');
assert.strictEqual(sim.isWellCovered(10, 16), true, 'Tile at dy=6 is covered');
assert.strictEqual(sim.isWellCovered(10, 17), false, 'Tile at dy=7 is NOT covered');
console.log('✓ Communal Well placement and 6-tile radius sanitation coverage verified.');

// 4. Test Public Sanitation Health Metric (Cholera Risk)
console.log('4. Testing Public Health (Cholera / Sanitation Risk Calculation)...');
// Place a residential house within well radius at (11, 10)
grid.setTile(11, 10, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
// Place a residential house far outside well radius at (25, 25)
grid.setTile(25, 25, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);

sim.recalculateDemands();
assert.ok(mockState.metrics.choleraRisk > 0, 'Cholera risk must increase when unwatered residential houses exist');
assert.strictEqual(mockState.metrics.choleraRisk, 23, '1 of 2 houses unwatered -> 23% cholera risk (scaled to max 45%)');

// Now place a second well at (25, 26) covering the distant house
grid.setTile(25, 26, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(25, 26).serviceType = CONFIG.SERVICES.WELL;

sim.recalculateDemands();
assert.strictEqual(mockState.metrics.choleraRisk, 0, 'All houses covered by wells -> 0% cholera risk');
console.log('✓ Public sanitation cholera metric calculation verified.');

// 5. Test Well Upkeep in Economy Processing
console.log('5. Testing Economy Processing with Well Upkeep...');
const counts = grid.getBuildingCounts();
assert.strictEqual(counts.wellCount, 2, 'Grid must report 2 communal wells');

const ecoTreasuryBefore = mockState.treasury;
sim.processEconomy();
// 2 wells * ¥1 upkeep = ¥2 deducted for wells
// Plus resident taxes (2 * ¥4 = ¥8) -> net gain ¥6
assert.strictEqual(mockState.treasury, ecoTreasuryBefore + 6, 'Economy correctly factors well maintenance');
console.log('✓ Communal Well upkeep verified in economy loop.');

// 6. Test Level 3 Giyōfū Red Brick Upgrade Promotion
console.log('6. Testing Commercial Level 3 (Giyōfū) Evolution & Fire Immunity...');
// Set up a Commercial Level 2 shop at (10, 12) with adjacent road at (10, 11)
grid.setTile(10, 11, CONFIG.TYPES.ROAD);
grid.setTile(10, 12, CONFIG.TYPES.ZONE, CONFIG.ZONES.COMMERCIAL, 2, true, CONFIG.STAGES.BUILT);
const comTile = grid.getTile(10, 12);
comTile.ageTicks = CONFIG.SIMULATION.UPGRADE_MIN_AGE_TICKS + 1;

// Place a Fire Watchtower nearby at (10, 14) (within 6 tiles)
grid.setTile(10, 14, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(10, 14).serviceType = CONFIG.SERVICES.WATCHTOWER;

// Treasury is high (>= 3500)
mockState.treasury = 4000;

// Evaluate upgrade
sim.evaluateUpgrades();
assert.strictEqual(comTile.stage, CONFIG.STAGES.SCAFFOLDING, 'Commercial L2 should enter scaffolding for L3 renovation');
assert.strictEqual(comTile.targetLevel, 3, 'Target upgrade level must be 3');

// Progress construction scaffolding ticks
const popBefore = mockState.population;
comTile.constructionTicks = CONFIG.SIMULATION.SCAFFOLD_TICKS;
sim.progressConstruction();

assert.strictEqual(comTile.stage, CONFIG.STAGES.BUILT, 'Structure must finish building');
assert.strictEqual(comTile.level, 3, 'Building level must now be Level 3 Giyōfū');
assert.strictEqual(mockState.population, popBefore + CONFIG.SIMULATION.POP_GAIN_L3, 'Population must increase by +15');

// Test Level 3 Tax Revenue
const countsL3 = grid.getBuildingCounts();
assert.strictEqual(countsL3.comL3, 1, 'Building count should report 1 comL3 building');

const treasuryBeforeTax = mockState.treasury;
sim.processEconomy();
// comL3 generates ¥45 tax
// (net delta: 1 comL3 * 45 + 2 res * 4 - 2 wells * 1 - 1 watchtower * 6 - 1 road * 1 = +44)
assert.strictEqual(mockState.lastCashflow, 44, 'Net income accurately accounts for comL3 tax (¥45), res taxes (¥8), and upkeep (-¥9)');
assert.strictEqual(mockState.treasury, treasuryBeforeTax + 44, 'Commercial L3 should generate ¥45/mo tax');

// Test Level 3 Complete Fire Immunity
const fireDetails = sim.getTileFireRiskDetails(10, 12);
assert.strictEqual(fireDetails.risk, 0, 'Commercial L3 Giyōfū brick building must have 0% fire risk (fire immunity)');
assert.strictEqual(fireDetails.protected, true, 'Commercial L3 is marked as protected');
console.log('✓ Commercial Level 3 Giyōfū upgrade, population surge, tax revenue, and fire immunity verified.');

// 7. Test Road Network Autotiling and Ambient Pathfinding Connectivity
console.log('7. Testing Road Network Connectivity for Ambient Traffic...');
// Connect a street from (10, 13) to (14, 13)
for (let x = 10; x <= 14; x++) {
    grid.setTile(x, 13, CONFIG.TYPES.ROAD);
}

// Target building at (14, 12) adjacent to road at (14, 13)
grid.setTile(14, 12, CONFIG.TYPES.ZONE, CONFIG.ZONES.COMMERCIAL, 1, true, CONFIG.STAGES.BUILT);

// Find path between buildings along connected road network
const roadPath = grid.findRoadPath(10, 12, 14, 12);
assert.ok(roadPath !== null, 'Connected road network must provide valid path between points');
assert.strictEqual(roadPath.length, 5, 'Path should traverse exactly 5 connected road tiles');
console.log('✓ Road network connectivity verified for ambient street traffic.');

console.log('\n======================================================');
console.log('🎉 ALL ITERATION 7 VERIFICATION TESTS PASSED (100%)!');
console.log('======================================================\n');
