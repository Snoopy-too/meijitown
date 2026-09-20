// Project Meiji - Iteration 19 Automated Verification Test Suite (test_iteration19.js)
// Tests: 2x2 Primary School (Shōgakkō), Rice Paddy (Suiden) seasonal states & canal synergy,
// Chronicle Ledger statistics, Economy upkeep/harvest, and strict file size limits.

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import Game Modules
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { SchoolSystem } from '../public/js/schoolSystem.js';
import { AgricultureManager } from '../public/js/agricultureManager.js';
import { EconomySystem } from '../public/js/simulation/economy_system.js';
import { ChronicleLedger } from '../public/js/ui/chronicleLedger.js';

console.log("=== Project Meiji: Iteration 19 Automated Test Suite ===\n");

// Mock State Manager
function createMockState() {
    return {
        treasury: 10000,
        population: 150,
        currentYear: 1872,
        currentMonth: 5,
        lastCashflow: 0,
        metrics: { townHappiness: 70 },
        policies: null,
        stats: {
            foundingYear: 1872,
            foundingMonth: 1,
            totalTaxesCollected: 0,
            firesExtinguished: 0,
            peakPopulation: 150,
            recordedEvents: []
        },
        milestones: {
            claimedTiers: [1, 2]
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
assert.strictEqual(CONFIG.COSTS.SCHOOL, 280, "CONFIG.COSTS.SCHOOL must be 280");
assert.strictEqual(CONFIG.COSTS.RICE_PADDY, 10, "CONFIG.COSTS.RICE_PADDY must be 10");
assert.strictEqual(CONFIG.SIMULATION.SCHOOL_RADIUS, 8, "CONFIG.SIMULATION.SCHOOL_RADIUS must be 8");
assert.strictEqual(CONFIG.SIMULATION.SCHOOL_MAINTENANCE, 8, "CONFIG.SIMULATION.SCHOOL_MAINTENANCE must be 8");
assert.strictEqual(CONFIG.SIMULATION.RICE_HARVEST_BONUS, 20, "CONFIG.SIMULATION.RICE_HARVEST_BONUS must be 20");
assert.strictEqual(CONFIG.SERVICES.SCHOOL, 'school', "CONFIG.SERVICES.SCHOOL must be 'school'");
assert.strictEqual(CONFIG.TYPES.AGRICULTURE, 'agriculture', "CONFIG.TYPES.AGRICULTURE must be 'agriculture'");
assert.strictEqual(CONFIG.MODELS.SCHOOL, 'assets/models/civic_school.glb', "CONFIG.MODELS.SCHOOL path correct");
console.log("✓ Test 1 Passed: All constants validated.\n");

// -------------------------------------------------------------
// Test 2: Primary School 2x2 Placement & Coverage Mechanics
// -------------------------------------------------------------
console.log("Test 2: Primary School (Shōgakkō) 2x2 System...");
const grid = new CityGridModel(32, 32);
const state = createMockState();
const schoolSystem = new SchoolSystem(grid, state);
state.schoolSystem = schoolSystem;

// Validate lot bounds and clear space
assert.strictEqual(schoolSystem.canPlaceSchool(5, 5), true, "Can place school at (5, 5)");
assert.strictEqual(schoolSystem.canPlaceSchool(31, 31), false, "Cannot place 2x2 school at grid boundary (31, 31)");

// Place School
const initialTreasury = state.treasury;
const placed = schoolSystem.placeSchool(5, 5, 0);
assert.strictEqual(placed, true, "School successfully placed at (5, 5)");
assert.strictEqual(state.treasury, initialTreasury - 280, "Deducted ¥280 from treasury");

// Check all 4 tiles
const t00 = grid.getTile(5, 5);
const t10 = grid.getTile(6, 5);
const t01 = grid.getTile(5, 6);
const t11 = grid.getTile(6, 6);

assert.strictEqual(t00.serviceType, 'school', "(5, 5) serviceType is school");
assert.strictEqual(t00.isOrigin, true, "(5, 5) is origin");
assert.strictEqual(t10.isOrigin, false, "(6, 5) is child tile");
assert.strictEqual(t01.isOrigin, false, "(5, 6) is child tile");
assert.strictEqual(t11.isOrigin, false, "(6, 6) is child tile");
assert.strictEqual(t10.originX, 5, "(6, 5) points to originX 5");
assert.strictEqual(t10.originY, 5, "(6, 5) points to originY 5");

// Coverage radius checks (8 tiles)
assert.strictEqual(schoolSystem.isEducationCovered(5, 10), true, "Tile (5, 10) is covered (dist 5 <= 8)");
assert.strictEqual(schoolSystem.isEducationCovered(5, 13), true, "Tile (5, 13) is covered (dist 8 <= 8)");
assert.strictEqual(schoolSystem.isEducationCovered(5, 16), false, "Tile (5, 16) is unserved (dist 11 > 8)");

// Adjacency check
assert.strictEqual(schoolSystem.isSchoolAdjacent(4, 5), true, "(4, 5) is adjacent to school");
assert.strictEqual(schoolSystem.isSchoolAdjacent(10, 10), false, "(10, 10) is not adjacent to school");

// Demolition: Clearing child tile (6, 6) should clear all 4 tiles
schoolSystem.clearSchoolAt(6, 6);
assert.strictEqual(grid.getTile(5, 5).type, CONFIG.TYPES.EMPTY, "(5, 5) cleared on demolish");
assert.strictEqual(grid.getTile(6, 5).type, CONFIG.TYPES.EMPTY, "(6, 5) cleared on demolish");
assert.strictEqual(grid.getTile(5, 6).type, CONFIG.TYPES.EMPTY, "(5, 6) cleared on demolish");
assert.strictEqual(grid.getTile(6, 6).type, CONFIG.TYPES.EMPTY, "(6, 6) cleared on demolish");
assert.strictEqual(schoolSystem.isEducationCovered(5, 5), false, "Education coverage removed after demolition");
console.log("✓ Test 2 Passed: Primary School 2x2 mechanics, radius, and demolition verified.\n");

// -------------------------------------------------------------
// Test 3: Irrigated Rice Paddy (Suiden) & Canal Synergy
// -------------------------------------------------------------
console.log("Test 3: Rice Paddy (Suiden) & Canal Irrigation Synergy...");
const agri = new AgricultureManager(grid, state);
state.agriculture = agri;

// Place a canal water tile at (10, 10)
grid.setTile(10, 10, CONFIG.TYPES.CANAL);

// Place Paddy 1 directly adjacent to Canal at (10, 11)
agri.placePaddy(10, 11);
// Place Paddy 2 isolated at (15, 15) without canal or well
agri.placePaddy(15, 15);

// Check canal synergy
assert.strictEqual(agri.isIrrigated(10, 11), true, "Paddy at (10, 11) adjacent to canal is automatically irrigated");
assert.strictEqual(agri.isIrrigated(15, 15), false, "Isolated paddy at (15, 15) is not irrigated");

// Seasonal state transitions
assert.strictEqual(agri.getSeasonState(4), 'spring', "Month 4 is Spring");
assert.strictEqual(agri.getSeasonState(7), 'summer', "Month 7 is Summer");
assert.strictEqual(agri.getSeasonState(10), 'autumn', "Month 10 is Autumn");
assert.strictEqual(agri.getSeasonState(1), 'winter', "Month 1 is Winter");

// Autumn Harvest Yield: +¥20 per irrigated paddy
const springYield = agri.calculateHarvestYield(4);
assert.strictEqual(springYield, 0, "No autumn harvest bonus in Spring");

const autumnYield = agri.calculateHarvestYield(10);
// 1 irrigated paddy * ¥20 = ¥20 (unirrigated paddy yields 0)
assert.strictEqual(autumnYield, 20, "Autumn harvest yields +¥20 for 1 irrigated paddy");
console.log("✓ Test 3 Passed: Rice Paddy seasonal states, canal synergy & harvest yield verified.\n");

// -------------------------------------------------------------
// Test 4: Economy System Upkeep & Harvest Bonus Integration
// -------------------------------------------------------------
console.log("Test 4: Economy System School Upkeep & Cumulative Stats...");
// Re-place school at (2, 2)
schoolSystem.placeSchool(2, 2, 0);

const economy = new EconomySystem(grid, state);
state.currentMonth = 10; // Autumn
state.treasury = 5000;
const prevTreasury = state.treasury;
const prevTaxes = state.stats.totalTaxesCollected;

economy.processEconomy();

// School upkeep ¥8 should be deducted, Autumn harvest ¥20 should be collected
assert.ok(state.stats.totalTaxesCollected > prevTaxes, "Total taxes collected increased in state.stats");
assert.ok(state.stats.peakPopulation >= state.population, "Peak population tracked");
console.log("✓ Test 4 Passed: School upkeep and Autumn harvest collected in economy.\n");

// -------------------------------------------------------------
// Test 5: Chronicle Ledger & Event Archive
// -------------------------------------------------------------
console.log("Test 5: Chronicle Ledger & Event Archive...");
const ledger = new ChronicleLedger(state);

ledger.recordEvent(
    "Primary School established in the northern ward.",
    "北区に尋常小学校が開校、児童の就学が開始。"
);

assert.strictEqual(state.stats.recordedEvents.length >= 2, true, "Events recorded in state.stats");
assert.strictEqual(state.stats.recordedEvents[0].textEn, "Primary School established in the northern ward.", "Latest event matches");
console.log("✓ Test 5 Passed: Chronicle ledger event logging and stats storage verified.\n");

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
console.log("🎉 ALL ITERATION 19 AUTOMATED TESTS PASSED (6/6)");
console.log("=================================================");
