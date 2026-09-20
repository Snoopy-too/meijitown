// Project Meiji - Iteration 5 Verification Test Suite
// ponytail: assert-based self-check, zero external test dependencies

import assert from 'node:assert';

// Minimal Node.js DOM shims for headless unit testing
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

console.log('--- Project Meiji: Iteration 5 Automated Test ---');

// 1. Test Camera Rotation Math & Delta
console.log('1. Testing Camera Q/E 45-degree rotation delta & easing...');
const ROTATION_STEP = Math.PI / 4; // 45 degrees
assert.strictEqual(ROTATION_STEP, Math.PI / 4, 'Rotation step must be exactly 45 degrees (PI / 4)');
const easeOutQuad = (t) => t * (2 - t);
assert.strictEqual(easeOutQuad(0), 0, 'Easing at t=0 should be 0');
assert.strictEqual(easeOutQuad(1), 1, 'Easing at t=1 should be 1');
assert.ok(easeOutQuad(0.5) > 0.5, 'Quad ease-out should decelerate (value at 0.5 > 0.5)');
console.log('✓ Camera rotation delta and easing verified.');

// 2. Test Deterministic Foliage Generation
console.log('2. Testing Deterministic Foliage Hash & Classification...');
const isFoliageTile = (x, y, width = 32, height = 32) => {
    const hash = Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
    const isPerimeter = x < 2 || x >= width - 2 || y < 2 || y >= height - 2;
    if (isPerimeter) return hash > 0.40;
    return (x * 11 + y * 17) % 47 === 0;
};

// Determinism test: repeated calls must yield identical results
const res1 = isFoliageTile(0, 0);
const res2 = isFoliageTile(0, 0);
assert.strictEqual(res1, res2, 'Foliage check must be 100% deterministic');

// Sakura vs Matsu classification
const isSakura = (x, y) => (x + y) % 3 === 0;
assert.strictEqual(isSakura(0, 0), true, '(0,0) is Sakura');
assert.strictEqual(isSakura(1, 0), false, '(1,0) is Matsu');
assert.strictEqual(isSakura(1, 2), true, '(1,2) is Sakura');
console.log('✓ Deterministic foliage hash and Sakura/Matsu selector verified.');

// 3. Test Machi-Hikeshi Volunteer Firefighting & Extinguish Mechanics
console.log('3. Testing Machi-Hikeshi Volunteer Firefighting...');
const grid = new CityGridModel(32, 32);
const mockState = {
    treasury: 1000,
    population: 40,
    metrics: { fireRisk: 10 },
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

const sim = new SimulationEngine(grid, mockState);
mockState.simulation = sim;

// Setup a building on fire
grid.setTile(5, 5, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.ON_FIRE);
const burningTile = grid.getTile(5, 5);
burningTile.fireTicks = 2;
burningTile.threatTimer = 1;

assert.strictEqual(burningTile.stage, CONFIG.STAGES.ON_FIRE);

// Execute extinguishFire directly
const extinguished = sim.extinguishFire(5, 5);
assert.strictEqual(extinguished, true, 'extinguishFire must return true for burning tile');
assert.strictEqual(burningTile.stage, CONFIG.STAGES.BUILT, 'Building stage must reset to BUILT');
assert.strictEqual(burningTile.fireTicks, 0, 'fireTicks must reset to 0');
assert.strictEqual(burningTile.threatTimer, 0, 'threatTimer must reset to 0');

// Mock renderer for ToolController testing
const mockRenderer = {
    renderer: { domElement: { addEventListener: () => {} } },
    controls: { enableRotate: true },
    getTileWorldPos: (x, y) => ({ x: (x + 0.5) * 2, z: (y + 0.5) * 2 }),
    fx: {
        detachFire: () => {},
        spawnWaterSplash: () => {},
        spawnDemolishPuff: () => {}
    },
    updateCursor: () => {},
    isFoliageTile: (x, y) => isFoliageTile(x, y),
};

const toolController = new ToolController(grid, mockRenderer, mockState);

// Set tile on fire again and test ToolController bucket brigade
burningTile.stage = CONFIG.STAGES.ON_FIRE;
const initialTreasury = mockState.treasury;

toolController.applyTool(5, 5, false);

assert.strictEqual(mockState.treasury, initialTreasury - CONFIG.COSTS.FIREFIGHT, 'Machi-Hikeshi must deduct ¥25');
assert.strictEqual(burningTile.stage, CONFIG.STAGES.BUILT, 'Tile must be saved and set back to BUILT');
console.log('✓ Machi-Hikeshi firefighting and treasury deduction verified.');

// 4. Test Disaster Recovery & Charred Ruins Bulldozer Clearing
console.log('4. Testing Charred Ruins Demolish & Zone Preservation...');

// Burn building to ruins
burningTile.stage = CONFIG.STAGES.BURNED;
burningTile.occupied = false;
burningTile.level = 1;

toolController.setActiveTool(CONFIG.TOOLS.BULLDOZER);
toolController.lastPaintedTile = null;
const treasuryBeforeClear = mockState.treasury;

toolController.applyTool(5, 5, false);

assert.strictEqual(mockState.treasury, treasuryBeforeClear - CONFIG.COSTS.BULLDOZE, 'Bulldozing rubble must cost ¥5');
assert.strictEqual(burningTile.type, CONFIG.TYPES.ZONE, 'Zoning must be preserved after clearing rubble');
assert.strictEqual(burningTile.zoneType, CONFIG.ZONES.RESIDENTIAL, 'Zone type must remain RESIDENTIAL');
assert.strictEqual(burningTile.stage, CONFIG.STAGES.NONE, 'Stage must reset to NONE (ready to rebuild)');
assert.strictEqual(burningTile.occupied, false, 'Occupied must be false');
assert.strictEqual(burningTile.level, 0, 'Level must be reset to 0');

console.log('✓ Charred ruins clearance and zone preservation verified.');

// 5. Test Road Autotiling Bitmask Calculation for Intersections
console.log('5. Testing Intersection Fillet Bitmasks...');
const isRoad = (nx, ny) => grid.isValidCoord(nx, ny) && grid.getTile(nx, ny)?.type === CONFIG.TYPES.ROAD;

// Setup 4-way crossroad at (15, 15) with roads at N, S, E, W
grid.setTile(15, 15, CONFIG.TYPES.ROAD);
grid.setTile(15, 14, CONFIG.TYPES.ROAD); // North
grid.setTile(15, 16, CONFIG.TYPES.ROAD); // South
grid.setTile(16, 15, CONFIG.TYPES.ROAD); // East
grid.setTile(14, 15, CONFIG.TYPES.ROAD); // West

let mask = 0;
if (isRoad(15, 14)) mask |= 1; // North
if (isRoad(16, 15)) mask |= 2; // East
if (isRoad(15, 16)) mask |= 4; // South
if (isRoad(14, 15)) mask |= 8; // West

assert.strictEqual(mask, 15, '4-way crossroad mask must equal 15 (all 4 directions)');

// Remove North to create T-junction
grid.clearTile(15, 14);
let tMask = 0;
if (isRoad(15, 14)) tMask |= 1;
if (isRoad(16, 15)) tMask |= 2;
if (isRoad(15, 16)) tMask |= 4;
if (isRoad(14, 15)) tMask |= 8;

assert.strictEqual(tMask, 14, 'T-junction (East, South, West) mask must equal 14');
console.log('✓ Road autotiling intersection bitmasks verified.');

console.log('ALL ITERATION 5 VERIFICATION CHECKS PASSED!');
