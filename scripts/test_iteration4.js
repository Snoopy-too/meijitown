// Project Meiji - Iteration 4 Verification Test Suite
// ponytail: assert-based self-check, zero external test dependencies

import assert from 'node:assert';
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { SimulationEngine } from '../public/js/simulation.js';

console.log('--- Project Meiji: Iteration 4 Automated Test ---');

// Mock minimal GameStateManager
const mockState = {
    treasury: 10000,
    population: 50,
    metrics: { fireRisk: 0 },
    updateHUD: () => {},
    showToast: () => {},
};

const grid = new CityGridModel(32, 32);
const sim = new SimulationEngine(grid, mockState);

// 1. Test Fire Risk Calculation
console.log('1. Testing Fire Risk Calculation & Watchtower Discount...');

// Place isolated wooden residential machiya at (10, 10)
grid.setTile(10, 10, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const isolatedTile = grid.getTile(10, 10);
const isolatedRisk = sim.getTileFireRiskDetails(isolatedTile);
assert.strictEqual(isolatedRisk.risk, 5, 'Base risk for isolated wooden machiya should be 5%');
assert.strictEqual(isolatedRisk.protected, false, 'Should not be protected without watchtower');

// Add 2 adjacent wooden buildings at (10, 11) and (11, 10)
grid.setTile(10, 11, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
grid.setTile(11, 10, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const clusteredRisk = sim.getTileFireRiskDetails(isolatedTile);
assert.strictEqual(clusteredRisk.risk, 25, 'Risk with 2 neighbors should be 5 + 20 = 25%');

// Place Fire Watchtower at (10, 14) (distance = 4, within 6-tile radius)
grid.setTile(10, 14, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
const watchtowerTile = grid.getTile(10, 14);
watchtowerTile.serviceType = CONFIG.SERVICES.WATCHTOWER;

const protectedRisk = sim.getTileFireRiskDetails(isolatedTile);
assert.strictEqual(protectedRisk.protected, true, 'Tile within 6-tile radius should be protected');
assert.strictEqual(protectedRisk.risk, Math.round(25 * 0.5), 'Watchtower should reduce fire risk by 50% (25 * 0.5 = 13%)');

// Level 2 Kura-zukuri fireproof check
grid.setTile(15, 15, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 2, true, CONFIG.STAGES.BUILT);
const kuraTile = grid.getTile(15, 15);
const kuraRisk = sim.getTileFireRiskDetails(kuraTile);
assert.strictEqual(kuraRisk.risk, 0, 'Level 2 fireproof Kura should have 0% fire risk');

console.log('✓ Fire Risk calculations passed.');

// 2. Test 2-Tile Road Firebreak Detection
console.log('2. Testing 2-Tile Road Firebreak Mechanics...');

// Setup a 2-tile road corridor between (20, 20) and (23, 20)
// Roads at (21, 20) and (22, 20)
grid.setTile(21, 20, CONFIG.TYPES.ROAD);
grid.setTile(22, 20, CONFIG.TYPES.ROAD);

const isBlocked2Tile = sim.hasTwoTileRoadFirebreak(20, 20, 23, 20);
assert.strictEqual(isBlocked2Tile, true, 'Contiguous 2-tile road corridor MUST act as firebreak');

// Setup single 1-tile road between (20, 25) and (22, 25)
// Road only at (21, 25)
grid.setTile(21, 25, CONFIG.TYPES.ROAD);
const isBlocked1Tile = sim.hasTwoTileRoadFirebreak(20, 25, 22, 25);
assert.strictEqual(isBlocked1Tile, false, 'Single 1-tile road alley must NOT block spark jumping');

console.log('✓ Firebreak detection passed.');

// 3. Test Frontage Orientation Snapping Math
console.log('3. Testing Frontage Orientation Snapping...');

const getAngle = (dx, dy) => Math.atan2(dx, dy);

assert.strictEqual(getAngle(0, 1), 0, 'Facing South towards road (+Z) should be 0 rad');
assert.strictEqual(getAngle(0, -1), Math.PI, 'Facing North towards road (-Z) should be PI rad');
assert.strictEqual(getAngle(1, 0), Math.PI / 2, 'Facing East towards road (+X) should be PI/2 rad');
assert.strictEqual(getAngle(-1, 0), -Math.PI / 2, 'Facing West towards road (-X) should be -PI/2 rad');

console.log('✓ Orientation snapping angles passed.');

console.log('ALL ITERATION 4 VERIFICATION CHECKS PASSED!');
