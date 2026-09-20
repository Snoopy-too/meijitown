// Project Meiji - Iteration 10 Verification Test Suite
// Entertainment Districts & Citizen Satisfaction Model
// ponytail: assert-based headless test runner, zero external test framework dependencies

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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

console.log('--- Project Meiji: Iteration 10 Automated Test Suite ---');

// 1. Verify 3D GLB Model Assets
console.log('1. Verifying 3D GLB Model Assets on Disk...');
const ochayaGlbPath = path.join(rootDir, 'public', 'assets', 'models', 'civic_ochaya.glb');
const sentoGlbPath = path.join(rootDir, 'public', 'assets', 'models', 'civic_sento.glb');

assert.ok(fs.existsSync(ochayaGlbPath), 'civic_ochaya.glb must exist in public/assets/models/');
const ochayaStats = fs.statSync(ochayaGlbPath);
assert.ok(ochayaStats.size > 1000, `civic_ochaya.glb must be valid non-empty file (size: ${ochayaStats.size} bytes)`);

assert.ok(fs.existsSync(sentoGlbPath), 'civic_sento.glb must exist in public/assets/models/');
const sentoStats = fs.statSync(sentoGlbPath);
assert.ok(sentoStats.size > 1000, `civic_sento.glb must be valid non-empty file (size: ${sentoStats.size} bytes)`);
console.log(`✓ 3D GLB models verified (Ochaya: ${ochayaStats.size}B, Sento: ${sentoStats.size}B).`);

// 2. Verify Config Constants
console.log('2. Verifying Config Constants for Iteration 10...');
assert.strictEqual(CONFIG.SERVICES.OCHAYA, 'ochaya', 'CONFIG.SERVICES.OCHAYA must be "ochaya"');
assert.strictEqual(CONFIG.SERVICES.SENTO, 'sento', 'CONFIG.SERVICES.SENTO must be "sento"');
assert.strictEqual(CONFIG.COSTS.OCHAYA, 120, 'Cost of Ochaya must be ¥120');
assert.strictEqual(CONFIG.COSTS.SENTO, 90, 'Cost of Sento must be ¥90');
assert.strictEqual(CONFIG.SIMULATION.OCHAYA_RADIUS, 6, 'Ochaya radius must be 6 tiles');
assert.strictEqual(CONFIG.SIMULATION.OCHAYA_MAINTENANCE, 3, 'Ochaya maintenance must be ¥3/mo');
assert.strictEqual(CONFIG.SIMULATION.SENTO_RADIUS, 5, 'Sento radius must be 5 tiles');
assert.strictEqual(CONFIG.SIMULATION.SENTO_MAINTENANCE, 2, 'Sento maintenance must be ¥2/mo');
assert.strictEqual(CONFIG.SIMULATION.DEFAULT_HAPPINESS, 65, 'Default happiness must be 65%');
assert.strictEqual(CONFIG.TOOLS.OCHAYA, 'ochaya', 'CONFIG.TOOLS.OCHAYA must be "ochaya"');
assert.strictEqual(CONFIG.TOOLS.SENTO, 'sento', 'CONFIG.TOOLS.SENTO must be "sento"');
console.log('✓ Configuration constants verified.');

// 3. Test Service Radii & Coverage Detection
console.log('3. Testing Spatial Coverage Detection...');
const mockState = {
    treasury: 10000,
    population: 0,
    currentYear: 1872,
    currentMonth: 1,
    metrics: {
        residentialDemand: 50,
        commercialDemand: 40,
        industrialDemand: 30,
        fireRisk: 0,
        choleraRisk: 0,
        townHappiness: 65,
    },
    deductTreasury() { return true; },
    updateHUD() {},
    showToast() {},
    updateInspector() {},
};

const grid = new CityGridModel(32, 32);
const sim = new SimulationEngine(grid, mockState);

// Place an Ochaya at (10, 10)
grid.setTile(10, 10, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(10, 10).serviceType = CONFIG.SERVICES.OCHAYA;

// Check Ochaya coverage: (10, 15) is 5 tiles away (within radius 6); (10, 17) is 7 tiles away (outside)
assert.strictEqual(sim.isOchayaCovered(10, 15), true, 'Tile at distance 5 should be Ochaya covered');
assert.strictEqual(sim.isOchayaCovered(10, 17), false, 'Tile at distance 7 should NOT be Ochaya covered');

// Place a Sentō at (20, 20)
grid.setTile(20, 20, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(20, 20).serviceType = CONFIG.SERVICES.SENTO;

// Check Sentō coverage: (20, 24) is 4 tiles away (within radius 5); (20, 26) is 6 tiles away (outside)
assert.strictEqual(sim.isSentoCovered(20, 24), true, 'Tile at distance 4 should be Sentō covered');
assert.strictEqual(sim.isSentoCovered(20, 26), false, 'Tile at distance 6 should NOT be Sentō covered');

// Check Entertainment coverage (satisfied by Ochaya OR Sentō)
assert.strictEqual(sim.isEntertainmentCovered(10, 15), true, 'Tile near Ochaya should have entertainment');
assert.strictEqual(sim.isEntertainmentCovered(20, 24), true, 'Tile near Sentō should have entertainment');
assert.strictEqual(sim.isEntertainmentCovered(0, 0), false, 'Isolated tile should NOT have entertainment');

// Check Clean Water coverage: Sentō also satisfies water coverage within 5 tiles!
assert.strictEqual(sim.isWellCovered(20, 24), true, 'Tile near Sentō should satisfy clean water sanitation');
assert.strictEqual(sim.isWellCovered(0, 0), false, 'Isolated tile should NOT satisfy clean water sanitation');
console.log('✓ Spatial coverage functions verified.');

// 4. Test Residential Happiness Calculation
console.log('4. Testing Residential Happiness Factors & Clamping...');
// Setup a residential tile at (5, 5)
grid.setTile(5, 5, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const resTile = grid.getTile(5, 5);

// Isolated residential tile: base 25%, no amenities
const score0 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score0, 25, `Isolated tile happiness should be 25%, got ${score0}%`);

// Add road access (+15)
grid.setTile(5, 6, CONFIG.TYPES.ROAD);
const score1 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score1, 40, `With road access, happiness should be 40%, got ${score1}%`);

// Add well (+20 water)
grid.setTile(5, 7, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(5, 7).serviceType = CONFIG.SERVICES.WELL;
const score2 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score2, 60, `With road + well, happiness should be 60%, got ${score2}%`);

// Add Ochaya (+25 leisure)
grid.setTile(6, 6, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(6, 6).serviceType = CONFIG.SERVICES.OCHAYA;
const score3 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score3, 85, `With road + well + teahouse, happiness should be 85%, got ${score3}%`);

// Add Watchtower (+15 fire protection)
grid.setTile(6, 7, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(6, 7).serviceType = CONFIG.SERVICES.WATCHTOWER;
const score4 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score4, 100, `With road + well + teahouse + watchtower, happiness should be 100%, got ${score4}%`);

// Add adjacent Industrial Workshop (-20 hazard)
grid.setTile(4, 5, CONFIG.TYPES.ZONE, CONFIG.ZONES.INDUSTRIAL, 1, true, CONFIG.STAGES.BUILT);
const score5 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score5, 80, `With adjacent industrial pollution, happiness should drop to 80%, got ${score5}%`);

// Add nearby Charred Ruins (-30 blight)
grid.setTile(4, 6, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, false, CONFIG.STAGES.BURNED);
const score6 = sim.getResidentialHappiness(5, 5);
assert.strictEqual(score6, 50, `With nearby charred ruins, happiness should drop to 50%, got ${score6}%`);
console.log('✓ Residential happiness formula, penalties, and additions verified.');

// 5. Test Town Happiness Calculation
console.log('5. Testing Town Happiness Aggregate...');
const townHappy = sim.calculateTownHappiness();
assert.strictEqual(townHappy, 50, `Town happiness should equal average of residential tiles (50%), got ${townHappy}%`);

// Clean grid back to empty and verify default happiness
const emptyGrid = new CityGridModel(32, 32);
const emptySim = new SimulationEngine(emptyGrid, mockState);
assert.strictEqual(emptySim.calculateTownHappiness(), 65, 'Default town happiness should be 65% when no homes exist');
console.log('✓ Town happiness aggregation verified.');

// 6. Test Economic Upkeep and Happiness Impacts
console.log('6. Testing Simulation Economic & Influx Impacts...');
let currentTreasury = 1000;
mockState.treasury = currentTreasury;
mockState.deductTreasury = (amt) => {
    mockState.treasury -= amt;
    return true;
};

// Running processEconomy with Ochaya (¥3) and Sentō (¥2) should deduct ¥5
emptyGrid.setTile(2, 2, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
emptyGrid.getTile(2, 2).serviceType = CONFIG.SERVICES.OCHAYA;
emptyGrid.setTile(3, 3, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
emptyGrid.getTile(3, 3).serviceType = CONFIG.SERVICES.SENTO;

const prevTreasury = mockState.treasury;
emptySim.processEconomy();
// Maintenance of 1 Ochaya (3) + 1 Sento (2) = ¥5
assert.strictEqual(mockState.treasury, prevTreasury - 5, `Treasury should decrease by ¥5 upkeep, got ${mockState.treasury}`);

// Test autonomous spawning halted when happiness < 40%
mockState.metrics.townHappiness = 35;
// Place empty residential zone next to road
emptyGrid.setTile(10, 10, CONFIG.TYPES.ROAD);
emptyGrid.setTile(10, 11, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 0, false, CONFIG.STAGES.NONE);
const spawnedLow = emptySim.attemptAutonomousSpawning();
assert.strictEqual(spawnedLow, 0, 'Autonomous spawning must be 0 when town happiness is under 40%');

// Test autonomous spawning allowed when happiness > 75%
mockState.metrics.townHappiness = 80;
mockState.metrics.residentialDemand = 100;
mockState.population = 0;
emptySim.attemptAutonomousSpawning();
// Should have spawned or scaffolded the home
const targetTile = emptyGrid.getTile(10, 11);
assert.ok(targetTile.stage === CONFIG.STAGES.SCAFFOLDING || targetTile.stage === CONFIG.STAGES.BUILT, 'Autonomous spawning should succeed when happiness is high');

console.log('✓ Simulation economic upkeep, demand boost, and influx gating verified.');

// 7. Verify UI DOM Elements in index.html & style.css
console.log('7. Verifying HTML & CSS Elements for Iteration 10...');
const htmlContent = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf-8');
const cssContent = fs.readFileSync(path.join(rootDir, 'public', 'css', 'style.css'), 'utf-8');

assert.ok(htmlContent.includes('id="val-happiness"'), 'index.html must include #val-happiness element');
assert.ok(htmlContent.includes('id="insp-leisure"'), 'index.html must include #insp-leisure element');
assert.ok(htmlContent.includes('data-tool="ochaya"'), 'index.html must include data-tool="ochaya" toolbar button');
assert.ok(htmlContent.includes('data-tool="sento"'), 'index.html must include data-tool="sento" toolbar button');

assert.ok(cssContent.includes('.hud-happiness-stat'), 'style.css must include .hud-happiness-stat styling');
console.log('✓ HTML and CSS UI hooks verified.');

console.log('\n========================================');
console.log('All Iteration 10 automated tests passed successfully!');
console.log('========================================');
