// Project Meiji - Iteration 23 Automated Verification Test Suite (test_iteration20.js)
// Tests: Telegraph Network spreading along Stone Paving, +30% Civic Range Boost,
// Dynamic Autumn/Winter fire hazards & firebreaks, Fire Depot dispatch,
// Ginza Brick commercial evolution, and Strict File Size Limits (< 600 lines).

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import Game Subsystems
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { TelegraphSystem } from '../public/js/telegraphSystem.js';
import { DisasterSimulation } from '../public/js/disasterManager.js';
import { SimulationEngine } from '../public/js/simulation.js';
import { EconomySystem } from '../public/js/simulation/economy_system.js';
import { SchoolSystem } from '../public/js/schoolSystem.js';

console.log("=== Project Meiji: Iteration 23 Automated Test Suite ===\n");

function createMockState() {
    return {
        treasury: 10000,
        population: 200,
        currentYear: 1873,
        currentMonth: 10, // Dry Autumn
        lastCashflow: 0,
        metrics: { townHappiness: 75, fireRisk: 0, residentialDemand: 50, commercialDemand: 50, industrialDemand: 50 },
        policies: null,
        stats: {
            foundingYear: 1872,
            firesExtinguished: 0,
            recordedEvents: []
        },
        deductTreasury(amt) {
            if (this.treasury < amt) return false;
            this.treasury -= amt;
            return true;
        },
        showToast(msg) {}
    };
}

// -------------------------------------------------------------
// Test 1: Configuration Constants
// -------------------------------------------------------------
console.log("Test 1: Configuration Constants Verification...");
assert.strictEqual(CONFIG.SERVICES.TELEGRAPH, 'telegraph', "CONFIG.SERVICES.TELEGRAPH defined");
assert.strictEqual(CONFIG.COSTS.TELEGRAPH, 220, "CONFIG.COSTS.TELEGRAPH must be ¥220");
assert.strictEqual(CONFIG.SIMULATION.TELEGRAPH_MAINTENANCE, 6, "Telegraph upkeep must be ¥6/mo");
assert.strictEqual(CONFIG.SIMULATION.CIVIC_TELEGRAPH_BOOST, 1.30, "Civic telegraph boost must be +30% (1.30)");
assert.strictEqual(CONFIG.SIMULATION.TAX_COMMERCIAL_L4, 70, "Commercial L4 tax must be ¥70");
assert.strictEqual(CONFIG.MODELS.COMMERCIAL_TIER3_BRICK, 'assets/models/commercial_tier3_brick.glb', "Model path matches");
assert.strictEqual(CONFIG.MODELS.TELEGRAPH, 'assets/models/civic_telegraph.glb', "Telegraph model path matches");
console.log("✓ Test 1 Passed: All Configuration Constants verified.\n");

// -------------------------------------------------------------
// Test 2: Telegraph Spreader along Stone Paving & +30% Civic Boost
// -------------------------------------------------------------
console.log("Test 2: Telegraph Spreader & Civic Range Boost...");
const grid = new CityGridModel(16, 16);
const state = createMockState();
const telegraph = new TelegraphSystem(grid, state);
state.telegraph = telegraph;

// Place Telegraph Office at (2, 2)
grid.setTile(2, 2, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
const office = grid.getTile(2, 2);
office.serviceType = CONFIG.SERVICES.TELEGRAPH;

// Lay Stone Paving Road (Tier 2) from (2, 3) through (2, 6)
for (let y = 3; y <= 6; y++) {
    grid.setTile(2, y, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 2);
}

// Lay Dirt Road (Tier 1) branch at (3, 5) to verify dirt roads DO NOT carry telegraph wires
grid.setTile(3, 5, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 1);

// Place Koban at (1, 4) adjacent to Stone Paving
grid.setTile(1, 4, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
const koban = grid.getTile(1, 4);
koban.serviceType = CONFIG.SERVICES.KOBAN;

// Place School at (1, 8) disconnected from telegraph route
grid.setTile(1, 8, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
const disconnectedSchool = grid.getTile(1, 8);
disconnectedSchool.serviceType = CONFIG.SERVICES.SCHOOL;

// Spread network
telegraph.updateNetwork();

assert.strictEqual(grid.getTile(2, 3).hasTelegraph, true, "Stone road adjacent to Telegraph Office has telegraph");
assert.strictEqual(grid.getTile(2, 6).hasTelegraph, true, "Contiguous stone road has telegraph");
assert.strictEqual(grid.getTile(3, 5).hasTelegraph, false, "Dirt road must NOT carry telegraph lines");
assert.strictEqual(koban.isTelegraphConnected, true, "Koban adjacent to stone telegraph line is connected");
assert.strictEqual(disconnectedSchool.isTelegraphConnected, false, "Disconnected school is not connected");
assert.strictEqual(telegraph.getCivicBoost(1, 4), 1.30, "Connected Koban receives +30% boost");
assert.strictEqual(telegraph.getCivicBoost(1, 8), 1.0, "Disconnected School receives no boost");
console.log("✓ Test 2 Passed: Telegraph spreads exclusively along stone paving and boosts adjacent civics.\n");

// -------------------------------------------------------------
// Test 3: Dynamic Hazard, Autumn/Winter Dry Risk & Firebreaks
// -------------------------------------------------------------
console.log("Test 3: Fire Hazard Seasonality & Firebreaks...");
const disaster = new DisasterSimulation(grid, state);

// Month 10 is Autumn (Dry Season)
state.currentMonth = 10;
assert.strictEqual(disaster.isDrySeason(), true, "Month 10 is dry season");

// Set unserviced wooden machiya at (8, 8)
grid.setTile(8, 8, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const woodenMachiya = grid.getTile(8, 8);
const riskDetails = disaster.getTileFireRiskDetails(woodenMachiya);
assert.ok(riskDetails.risk > 20, "Dry autumn weather and unserviced machiya produce high fire risk");

// Firebreak test: Canal stops fire propagation cold
grid.setTile(8, 9, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.BUILT);
grid.setTile(8, 10, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
assert.strictEqual(disaster.hasFirebreakBetween(8, 8, 8, 10), true, "Canal acts as absolute firebreak");

// Firebreak test: Stone road stops fire propagation cold
grid.setTile(9, 8, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 2);
grid.setTile(10, 8, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
assert.strictEqual(disaster.hasFirebreakBetween(8, 8, 10, 8), true, "Stone Paving road acts as absolute firebreak");

// Fire spread test: Orthogonal wooden neighbor receives 10s countdown (2 ticks)
grid.setTile(7, 8, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
woodenMachiya.stage = CONFIG.STAGES.ON_FIRE;
disaster.processFires();

const threatenedNeighbor = grid.getTile(7, 8);
assert.strictEqual(threatenedNeighbor.threatTimer, 2, "Orthogonal wooden neighbor received 2-tick (10s) threat timer");
console.log("✓ Test 3 Passed: Seasonal risk, orthogonal countdown, and canal/stone firebreaks verified.\n");

// -------------------------------------------------------------
// Test 4: Fire Depot Brigade Response with Telegraph Boost
// -------------------------------------------------------------
console.log("Test 4: Fire Depot Matoi Brigade Dispatch & Extinguishing...");
// Place Fire Depot at (2, 4) along telegraph road
grid.setTile(1, 5, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
const depot = grid.getTile(1, 5);
depot.serviceType = CONFIG.SERVICES.FIRE_DEPOT;
telegraph.updateNetwork();
assert.strictEqual(depot.isTelegraphConnected, true, "Fire Depot connected to telegraph");

// Fire Depot finds fire along road and dispatches
const fireLocation = { x: 2, y: 6 };
grid.getTile(fireLocation.x, fireLocation.y).stage = CONFIG.STAGES.ON_FIRE;
const depotResp = disaster.findAvailableFireDepot(fireLocation.x, fireLocation.y);
assert.ok(depotResp !== null, "Depot located path to fire");
assert.strictEqual(depotResp.maxRadius, 13, "Telegraph-connected Fire Depot has 13-tile radius (10 * 1.3)");

disaster.extinguishFire(fireLocation.x, fireLocation.y);
assert.strictEqual(grid.getTile(fireLocation.x, fireLocation.y).stage, CONFIG.STAGES.BUILT, "Fire extinguished");
assert.strictEqual(state.stats.firesExtinguished, 1, "Extinguished fire count incremented");
console.log("✓ Test 4 Passed: Fire Depot brigade dispatch and telegraph range boost verified.\n");

// -------------------------------------------------------------
// Test 5: Ginza Brick Evolution & Economy Revenue
// -------------------------------------------------------------
console.log("Test 5: Tier 4 Commercial Evolution (Ginza Rengagai)...");
// Set commercial shop at (3, 6) touching stone road (2, 6) with telegraph, and place rail at (4, 6)
grid.setTile(3, 6, CONFIG.TYPES.ZONE, CONFIG.ZONES.COMMERCIAL, 2, true, CONFIG.STAGES.BUILT);
grid.setTile(4, 6, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);

telegraph.updateNetwork();
const isEligible = telegraph.isGinzaBrickEligible(3, 6);
assert.strictEqual(isEligible, true, "Commercial shop touching stone telegraph route + rail is eligible for Ginza Brick");

// Test upgrade evaluation in SimulationEngine
const sim = new SimulationEngine(grid, state);
state.treasury = 5000;
grid.getTile(3, 6).ageTicks = 10;
sim.evaluateUpgrades();

assert.strictEqual(grid.getTile(3, 6).targetLevel, 4, "Commercial shop renovating to Level 4 Ginza Brick");

// Complete construction to level 4
grid.getTile(3, 6).level = 4;
grid.getTile(3, 6).stage = CONFIG.STAGES.BUILT;
delete grid.getTile(3, 6).targetLevel;

// Economy check
const economy = new EconomySystem(grid, state);
const prevTreasury = state.treasury;
economy.processEconomy();
assert.ok(state.lastCashflow > 0, "Economy generated revenue from Level 4 commercial");
console.log("✓ Test 5 Passed: Ginza Brick evolution trigger and Level 4 commercial revenue verified.\n");

// -------------------------------------------------------------
// Test 6: Strict File Size Directive (< 600 lines)
// -------------------------------------------------------------
console.log("Test 6: File Size Audit (Hard Constraint: < 600 lines)...");
const publicJsDir = path.resolve(rootDir, 'public', 'js');

function checkJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            checkJsFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lineCount = content.split('\n').length;
            const relPath = path.relative(rootDir, fullPath);
            assert.ok(lineCount <= 600, `File ${relPath} exceeded 600 lines! Current: ${lineCount}`);
            console.log(`  - ${relPath}: ${lineCount} lines (OK)`);
        }
    }
}

checkJsFiles(publicJsDir);
console.log("✓ Test 6 Passed: All JavaScript source files strictly comply with < 600 lines.\n");

console.log("=================================================");
console.log("🎉 ALL ITERATION 23 AUTOMATED TESTS PASSED (6/6)");
console.log("=================================================");
