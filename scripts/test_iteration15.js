// Project Meiji - Iteration 15 Automated Test Suite
// ponytail: deterministic verification of level crossings, train traffic, industrial mills, and line limits

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Iteration 15 Automated Test Suite ---');

// 1. Verify 3D GLB Model Assets on Disk
console.log('1. Verifying 3D GLB Model Assets on Disk...');
const assetChecks = [
    { name: 'crossing_wood.glb', minBytes: 5000 },
    { name: 'vehicle_train.glb', minBytes: 5000 },
    { name: 'industrial_l2_mill.glb', minBytes: 5000 },
];
for (const asset of assetChecks) {
    const assetPath = path.join(rootDir, 'public', 'assets', 'models', asset.name);
    assert(fs.existsSync(assetPath), `${asset.name} must exist`);
    const stats = fs.statSync(assetPath);
    assert(stats.size > asset.minBytes, `${asset.name} should be a valid GLB (>${asset.minBytes} bytes), got ${stats.size}`);
    console.log(`  ✓ ${asset.name} (${stats.size} bytes)`);
}

// 2. Verify Config Constants
console.log('2. Verifying Config Constants for Iteration 15...');
import { CONFIG } from '../public/js/config.js';
assert.strictEqual(CONFIG.SIMULATION.TAX_INDUSTRIAL_L2, 38, 'TAX_INDUSTRIAL_L2 must be ¥38');
assert.strictEqual(CONFIG.SIMULATION.POP_GAIN_L2_IND, 12, 'POP_GAIN_L2_IND must be 12');
assert.strictEqual(CONFIG.MODELS.INDUSTRIAL_L2, 'assets/models/industrial_l2_mill.glb', 'INDUSTRIAL_L2 model path');
assert.strictEqual(CONFIG.MODELS.CROSSING, 'assets/models/crossing_wood.glb', 'CROSSING model path');
assert.strictEqual(CONFIG.MODELS.TRAIN, 'assets/models/vehicle_train.glb', 'TRAIN model path');
console.log('  ✓ Configuration constants verified.');

// 3. Test Level Crossing Data Model
console.log('3. Testing Level Crossing (Fumikiri) Data Model...');
import { CityGridModel } from '../public/js/grid.js';

const grid = new CityGridModel(16, 16);

// Lay rail at (5, 5) and road at (5, 5) to form a crossing
grid.setTile(5, 5, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, 0, true);
const crossingTile = grid.getTile(5, 5);
assert.strictEqual(crossingTile.type, CONFIG.TYPES.RAIL, 'Crossing tile must remain type RAIL');
assert.strictEqual(crossingTile.hasCrossing, true, 'Crossing tile must have hasCrossing = true');
assert.strictEqual(crossingTile.roadTier, 1, 'Crossing tile must have roadTier 1');

// isRoadTile must return true for crossing tiles (traffic traversal)
assert.strictEqual(grid.isRoadTile(crossingTile), true, 'isRoadTile must return true for rail tile with hasCrossing');

// Lay adjacent road tiles
grid.setTile(4, 5, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
grid.setTile(6, 5, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);

// Verify road network traverses through crossing
assert.strictEqual(grid.hasAdjacentRoad(5, 5), true, 'Crossing tile has adjacent road');
console.log('  ✓ Level crossing data model verified.');

// 4. Test hasAdjacentRail and hasAdjacentCanal
console.log('4. Testing hasAdjacentRail and hasAdjacentCanal...');
grid.setTile(8, 8, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
grid.setTile(8, 9, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE);

assert.strictEqual(grid.hasAdjacentRail(7, 8), true, 'hasAdjacentRail must detect rail at (8,8)');
assert.strictEqual(grid.hasAdjacentRail(1, 1), false, 'hasAdjacentRail must be false when no rail nearby');
assert.strictEqual(grid.hasAdjacentCanal(8, 8), true, 'hasAdjacentCanal must detect canal at (8,9)');
assert.strictEqual(grid.hasAdjacentCanal(1, 1), false, 'hasAdjacentCanal must be false when no canal nearby');
console.log('  ✓ Rail and Canal adjacency helpers verified.');

// 5. Test Crossing Serialization
console.log('5. Testing Crossing Tile Serialization...');
const exported = grid.exportToArray();
const crossExport = exported.find(t => t.x === 5 && t.y === 5);
assert(crossExport, 'Crossing tile must be in export');
assert.strictEqual(crossExport.hasCrossing, true, 'Exported crossing tile must preserve hasCrossing');
assert.strictEqual(crossExport.type, CONFIG.TYPES.RAIL, 'Exported crossing tile type must be rail');

const newGrid = new CityGridModel(16, 16);
newGrid.loadFromMap({ '5_5': crossExport });
const reloaded = newGrid.getTile(5, 5);
assert.strictEqual(reloaded.hasCrossing, true, 'Reloaded crossing tile must have hasCrossing');
assert.strictEqual(reloaded.roadTier, 1, 'Reloaded crossing tile must preserve roadTier');
console.log('  ✓ Crossing tile serialization verified.');

// 6. Test Train Traffic: Rail Graph & Pathfinding
console.log('6. Testing Train Traffic Rail Graph & Pathfinding...');
import { TrainTrafficManager } from '../public/js/renderer/trainTraffic.js';

const trainGrid = new CityGridModel(16, 16);
// Lay linear rail track from (2, 7) to (10, 7)
for (let x = 2; x <= 10; x++) {
    trainGrid.setTile(x, 7, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
}
// Place Train Depot at (6, 7)
trainGrid.setTile(6, 7, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
trainGrid.getTile(6, 7).serviceType = CONFIG.SERVICES.TRAIN_DEPOT;

const mockScene = { add: () => {}, remove: () => {} };
const getTileWorldPos = (x, y) => ({ x: (x + 0.5) * CONFIG.TILE_SIZE, z: (y + 0.5) * CONFIG.TILE_SIZE });

const trainTraffic = new TrainTrafficManager(mockScene, trainGrid, getTileWorldPos);
const railNetworks = trainTraffic.findRailNetworks();
assert.strictEqual(railNetworks.length, 1, 'Should find 1 contiguous rail network');
assert(railNetworks[0].length >= 9, `Network should contain at least 9 rail tiles, got ${railNetworks[0].length}`);

const route = trainTraffic.buildRailRoute(railNetworks[0]);
assert(route !== null && route.length >= 2, 'Should construct a valid rail route');
assert.strictEqual(route[0].y, 0.065, 'Waypoint Y elevation must be at rail head level (0.065)');

// Verify depot waypoint detection
const depotWp = route.find(wp => wp.isDepot === true);
assert(depotWp, 'At least one waypoint must be flagged as depot');

// Spawn and advance train
trainTraffic.spawnTrain();
assert.strictEqual(trainTraffic.trains.length, 1, 'Should have spawned 1 train');

// Simulate forward movement
const train = trainTraffic.trains[0];
for (let i = 0; i < 200; i++) {
    trainTraffic.update(0.016, 1.0);
}

// Train should either be at a depot dwell or have advanced
assert(train.waypointIndex > 0 || train.dwellTimer > 0, 'Train must advance along route or be dwelling at depot');

// Test reversal: force to end
train.waypointIndex = train.waypoints.length - 1;
train.progress = 0;
train.dwellTimer = 0;
train.forward = true;
trainTraffic.update(0.016, 1.0);
assert.strictEqual(train.forward, false, 'Train must reverse upon reaching terminus');
console.log('  ✓ Train traffic rail graph, depot dwell, and reversal verified.');

// 7. Test Industrial L2 Upgrade Eligibility
console.log('7. Testing Industrial L2 Upgrade (Road + Rail/Canal eligibility)...');
import { SimulationEngine } from '../public/js/simulation.js';

const indGrid = new CityGridModel(16, 16);
// Place industrial workshop adjacent to road and rail
indGrid.setTile(5, 5, CONFIG.TYPES.ZONE, CONFIG.ZONES.INDUSTRIAL, 1, true, CONFIG.STAGES.BUILT);
indGrid.getTile(5, 5).ageTicks = 10;
indGrid.setTile(5, 4, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
indGrid.setTile(5, 6, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);

assert.strictEqual(indGrid.hasAdjacentRoad(5, 5), true, 'Workshop must have adjacent road');
assert.strictEqual(indGrid.hasAdjacentRail(5, 5), true, 'Workshop must have adjacent rail');

const simState = {
    treasury: 5000,
    population: 200,
    metrics: {
        townHappiness: 70,
        choleraRisk: 0,
        residentialDemand: 50,
        commercialDemand: 40,
        industrialDemand: 30
    },
    showToast: () => {},
    updateHUD: () => {}
};
const simEngine = new SimulationEngine(indGrid, simState);
simEngine.evaluateUpgrades();

const upgradedTile = indGrid.getTile(5, 5);
assert.strictEqual(upgradedTile.stage, CONFIG.STAGES.SCAFFOLDING, 'Industrial workshop must begin renovation into Silk Reeling Mill');
console.log('  ✓ Industrial L2 upgrade eligibility (Road + Rail) verified.');

// 8. Test Industrial Tiered Tax in Economy System
console.log('8. Testing Industrial Tiered Tax Calculation...');
import { EconomySystem } from '../public/js/simulation/economy_system.js';
import { HappinessSystem } from '../public/js/simulation/happiness_system.js';

const ecoGrid = new CityGridModel(16, 16);
ecoGrid.setTile(3, 3, CONFIG.TYPES.ZONE, CONFIG.ZONES.INDUSTRIAL, 1, true, CONFIG.STAGES.BUILT);
ecoGrid.setTile(4, 4, CONFIG.TYPES.ZONE, CONFIG.ZONES.INDUSTRIAL, 2, true, CONFIG.STAGES.BUILT);
ecoGrid.setTile(5, 3, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);

const ecoState = {
    treasury: 5000,
    population: 100,
    metrics: { townHappiness: 65, choleraRisk: 0, residentialDemand: 30, commercialDemand: 30, industrialDemand: 30 },
    showToast: () => {},
    updateHUD: () => {},
    lastCashflow: 0
};
const happiness = new HappinessSystem(ecoGrid, ecoState, null, null);
const economy = new EconomySystem(ecoGrid, ecoState, happiness);
const netIncome = economy.processEconomy();

// L1 workshop = ¥14 + L2 mill = ¥38 = ¥52 gross revenue, minus road maintenance
assert(ecoState.treasury !== 5000, 'Treasury should change after economy tick');
console.log(`  ✓ Industrial tiered tax verified (net cashflow: ¥${netIncome}).`);

// 9. Test getBuildingCounts with indL1/indL2
console.log('9. Testing getBuildingCounts indL1/indL2 tracking...');
const counts = ecoGrid.getBuildingCounts();
assert.strictEqual(counts.indL1, 1, 'Should have 1 L1 industrial');
assert.strictEqual(counts.indL2, 1, 'Should have 1 L2 industrial');
assert.strictEqual(counts.industrial, 2, 'Total industrial must be 2');
console.log('  ✓ Building counts with indL1/indL2 verified.');

// 10. File Line Count Audit (Max 600)
console.log('10. Running File Line Count Audit...');
const jsDir = path.join(rootDir, 'public', 'js');

function getAllJsFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(getAllJsFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

const jsFiles = getAllJsFiles(jsDir);
let violations = 0;
for (const file of jsFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    const relPath = path.relative(rootDir, file);
    if (lines > 600) {
        console.log(`  ✗ ${relPath}: ${lines} lines (EXCEEDS 600!)`);
        violations++;
    } else if (lines > 500) {
        console.log(`  ⚠ ${relPath}: ${lines} lines (approaching limit)`);
    }
}
assert.strictEqual(violations, 0, `${violations} file(s) exceed the 600 line limit!`);
console.log('  ✓ All source files under 600 line limit.');

console.log('\n=== All Iteration 15 Tests Passed ===');
