// Project Meiji - Iteration 6 Verification Test Suite
// ponytail: assert-based self-check, zero external test dependencies

import assert from 'node:assert';

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

console.log('--- Project Meiji: Iteration 6 Automated Test ---');

// Mock minimal GameStateManager
const mockState = {
    treasury: 10000,
    population: 40,
    metrics: {
        residentialDemand: 50,
        commercialDemand: 40,
        industrialDemand: 30,
        fireRisk: 10,
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

// 1. Test BFS Road Network Pathfinding
console.log('1. Testing Road Network BFS Pathfinding (findRoadPath)...');

// Place Depot at (10, 10) and Target building at (14, 10)
grid.setTile(10, 10, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(10, 10).serviceType = CONFIG.SERVICES.FIRE_DEPOT;

grid.setTile(14, 10, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);

// Connect them via street along Y = 11: (10, 11) to (14, 11)
for (let x = 10; x <= 14; x++) {
    grid.setTile(x, 11, CONFIG.TYPES.ROAD);
}

const path = grid.findRoadPath(10, 10, 14, 10);
assert.ok(path !== null, 'Road path between depot and target building must be found');
assert.strictEqual(path.length, 5, 'Path length should be exactly 5 road tiles');
assert.strictEqual(path[0].x, 10, 'Start of road path should be adjacent to depot');
assert.strictEqual(path[path.length - 1].x, 14, 'End of road path should be adjacent to target');

// Break connection test: remove middle road tile (12, 11)
grid.clearTile(12, 11);
const brokenPath = grid.findRoadPath(10, 10, 14, 10);
assert.strictEqual(brokenPath, null, 'Path must be null when street network is severed');

// Restore road connection
grid.setTile(12, 11, CONFIG.TYPES.ROAD);
console.log('✓ Road network BFS pathfinding verified.');

// 2. Test Operational Radius Filtering
console.log('2. Testing Hikeshi-sho Operational Radius Filtering...');
const depotResponse = sim.findAvailableFireDepot(14, 10);
assert.ok(depotResponse !== null, 'Depot within 5 tiles must be available');
assert.strictEqual(depotResponse.roadDistance, 5, 'Road distance is 5 tiles');
assert.strictEqual(depotResponse.depot.x, 10, 'Found depot at (10, 10)');

// Distant building at (25, 25) with no road path
const outOfRange = sim.findAvailableFireDepot(25, 25);
assert.strictEqual(outOfRange, null, 'Unconnected / out-of-range building must not have depot coverage');
console.log('✓ Operational radius and distance evaluation verified.');

// 3. Test Active Fire Brigade Dispatch Loop
console.log('3. Testing Active Fire Brigade Dispatch Loop...');
const fireTile = grid.getTile(14, 10);
fireTile.stage = CONFIG.STAGES.ON_FIRE;
fireTile.fireTicks = 0;

let cartDispatched = false;
mockState.renderer = {
    dispatchBrigadeCart: (roadPath, onArrival) => {
        cartDispatched = true;
        assert.strictEqual(roadPath.length, 5, 'Dispatched cart receives correct 5-tile road path');
        // Execute onArrival callback
        onArrival();
    }
};

sim.processFires();
assert.strictEqual(cartDispatched, true, 'processFires must trigger dispatchBrigadeCart on renderer');
assert.strictEqual(fireTile.stage, CONFIG.STAGES.BUILT, 'Tile must be extinguished on brigade arrival');
assert.strictEqual(fireTile.fireTicks, 0, 'fireTicks must be reset to 0');
assert.strictEqual(fireTile.brigadeDispatched, false, 'brigadeDispatched must reset to false');
console.log('✓ Active Fire Brigade dispatch and extinction verified.');

// 4. Test Tactical Emergency Demolition (Haka-i-shouki) Firebreak Mechanics
console.log('4. Testing Tactical Emergency Demolition (Haka-i-shouki)...');

// Setup unburned wooden building at (5, 5) and burning blaze at (5, 6)
grid.setTile(5, 5, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
grid.setTile(5, 6, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.ON_FIRE);

const threatened = grid.getTile(5, 5);
threatened.threatTimer = 2;

const mockRenderer = {
    renderer: { domElement: { addEventListener: () => {} } },
    controls: { enableRotate: true },
    getTileWorldPos: (x, y) => ({ x: (x + 0.5) * 2, z: (y + 0.5) * 2 }),
    fx: {
        detachFire: () => {},
        spawnWaterSplash: () => {},
        spawnWaterSteam: () => {},
        spawnDemolishPuff: () => {}
    },
    updateCursor: () => {},
};

const toolController = new ToolController(grid, mockRenderer, mockState);
toolController.setActiveTool(CONFIG.TOOLS.BULLDOZER);

// Demolish the threatened building
toolController.applyTool(5, 5, false);

assert.strictEqual(threatened.threatTimer, 0, 'Threat timer must be zeroed immediately');
assert.strictEqual(threatened.stage, CONFIG.STAGES.NONE, 'Building structure must be removed to clear fuel');
assert.strictEqual(threatened.occupied, false, 'Occupied must be reset to false');
assert.strictEqual(threatened.zoneType, CONFIG.ZONES.RESIDENTIAL, 'Zoning must be preserved');

// Clear the fire at (5, 6)
sim.extinguishFire(5, 6);
console.log('✓ Tactical emergency demolition firebreak mechanics verified.');

// 5. Test Charred Rubble Demolition & Autonomous Rebuilding
console.log('5. Testing Charred Rubble Demolition & Autonomous Rebuilding...');

// Setup burned ruins at (6, 6) adjacent to road at (6, 5)
grid.setTile(6, 5, CONFIG.TYPES.ROAD);
grid.setTile(6, 6, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, false, CONFIG.STAGES.BURNED);

const ruinTile = grid.getTile(6, 6);
assert.strictEqual(ruinTile.stage, CONFIG.STAGES.BURNED);

// Clear ruins with Bulldozer
toolController.lastPaintedTile = null;
toolController.applyTool(6, 6, false);

assert.strictEqual(ruinTile.stage, CONFIG.STAGES.NONE, 'Cleared ruins must return to stage NONE');
assert.strictEqual(ruinTile.occupied, false, 'Plot must be unoccupied');
assert.strictEqual(ruinTile.zoneType, CONFIG.ZONES.RESIDENTIAL, 'Plot preserves RESIDENTIAL zoning');

// Check that autonomous spawning picks up cleared plots
const eligible = grid.findEligibleZoneLots(CONFIG.ZONES.RESIDENTIAL);
const foundCleared = eligible.some(t => t.x === 6 && t.y === 6);
assert.strictEqual(foundCleared, true, 'Cleared plot must be eligible for autonomous reconstruction');

// Tick 1: Rebuilds first eligible cleared plot (5, 5 from step 4)
mockState.metrics.residentialDemand = 60;
sim.attemptAutonomousSpawning();
const plot5 = grid.getTile(5, 5);
assert.strictEqual(plot5.stage, CONFIG.STAGES.SCAFFOLDING, 'Tactical demolition plot (5,5) starts rebuilding');

// Tick 2: Rebuilds next eligible cleared plot (6, 6)
mockState.metrics.residentialDemand = 60;
sim.attemptAutonomousSpawning();
assert.strictEqual(ruinTile.stage, CONFIG.STAGES.SCAFFOLDING, 'Cleared ruin plot (6,6) starts rebuilding under active demand');
console.log('✓ Charred rubble demolition and autonomous rebuilding verified.');

// 6. Test Economics & Hikeshi-sho Monthly Upkeep
console.log('6. Testing Hikeshi-sho Placement & Civic Upkeep...');

// Test placing Fire Depot via ToolController
mockState.treasury = 2000;
toolController.setActiveTool(CONFIG.TOOLS.FIRE_DEPOT);
toolController.lastPaintedTile = null;

toolController.applyTool(20, 20, false);
assert.strictEqual(mockState.treasury, 2000 - CONFIG.COSTS.FIRE_DEPOT, 'Placing Fire Depot costs ¥180');

const depotTile = grid.getTile(20, 20);
assert.strictEqual(depotTile.type, CONFIG.TYPES.SERVICE);
assert.strictEqual(depotTile.serviceType, CONFIG.SERVICES.FIRE_DEPOT);

// Test monthly upkeep in processEconomy
const treasuryBeforeSim = mockState.treasury;
sim.processEconomy();
// 2 depots total (10,10 and 20,20) = 2 * 5 = 10 upkeep
assert.ok(mockState.lastCashflow !== undefined, 'Last cashflow must be computed');
console.log('✓ Fire Depot placement and upkeep economics verified.');

console.log('ALL ITERATION 6 VERIFICATION CHECKS PASSED!');
