// Project Meiji - Iteration 24 Automated Verification Test Suite (test_iteration24.js)
// Tests: Proactive Modularization line audits, Harbor Pier 2x2 placement constraints,
// Canal trade network BFS, Autumn export dividend surge, and Economy integration.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Minimal Node.js DOM shims
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        addEventListener: () => {},
    }),
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
};

// Module imports
import * as THREE from 'three';
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { TelegraphRenderer } from '../public/js/renderer/telegraphRenderer.js';
import { OverlayRenderer } from '../public/js/renderer/overlayRenderer.js';
import { CivicMeshFactory } from '../public/js/meshes/civicMeshFactory.js';
import { TradePierManager } from '../public/js/tradePierManager.js';
import { EconomySystem } from '../public/js/simulation/economy_system.js';

console.log("=== Project Meiji: Iteration 24 Automated Test Suite ===\n");

function createMockState() {
    return {
        treasury: 10000,
        population: 350,
        currentYear: 1873,
        currentMonth: 10,
        lastCashflow: 0,
        metrics: { townHappiness: 75, fireRisk: 0, residentialDemand: 50, commercialDemand: 50, industrialDemand: 50 },
        policies: null,
        stats: { foundingYear: 1872, recordedEvents: [] },
        milestoneManager: { currentTier: 3 },
        deductTreasury(amt) {
            if (this.treasury < amt) return false;
            this.treasury -= amt;
            return true;
        },
        showToast(msg) {}
    };
}

// -------------------------------------------------------------
// Test 1: File Size Compliance (Hard Limits & Specific Targets)
// -------------------------------------------------------------
console.log("Test 1: File Size Audit & Modularization Thresholds...");
const publicJsDir = path.resolve(rootDir, 'public', 'js');

const specificLimits = {
    'public/js/renderer.js': 420,
    'public/js/renderer/procedural_meshes.js': 350,
    'public/js/meshes/civicMeshFactory.js': 300,
    'public/js/renderer/telegraphRenderer.js': 200,
    'public/js/renderer/overlayRenderer.js': 250,
    'public/js/tradePierManager.js': 400,
};

function checkJsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            checkJsFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lineCount = content.split('\n').length;
            const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

            // Hard project-wide constraint
            assert.ok(lineCount <= 600, `File ${relPath} exceeded 600 lines! Current: ${lineCount}`);

            // Specific modularization threshold
            if (specificLimits[relPath]) {
                const limit = specificLimits[relPath];
                assert.ok(lineCount <= limit, `File ${relPath} exceeded specific target of ${limit} lines! Current: ${lineCount}`);
                console.log(`  ✓ ${relPath}: ${lineCount} lines (Target < ${limit})`);
            } else {
                console.log(`  - ${relPath}: ${lineCount} lines (<= 600 OK)`);
            }
        }
    }
}

checkJsFiles(publicJsDir);
console.log("✓ Test 1 Passed: All modularized and project files strictly comply with line limits.\n");

// -------------------------------------------------------------
// Test 2: Clean Imports Without Circular Dependencies
// -------------------------------------------------------------
console.log("Test 2: Module Import & Delegation Integrity...");
assert.strictEqual(typeof TelegraphRenderer.attachToRoad, 'function', "TelegraphRenderer.attachToRoad is callable");
assert.strictEqual(typeof OverlayRenderer.getFireColor, 'function', "OverlayRenderer.getFireColor is callable");
assert.strictEqual(typeof CivicMeshFactory.createHarborPierMesh, 'function', "CivicMeshFactory.createHarborPierMesh is callable");
assert.strictEqual(typeof TradePierManager.prototype.placePier, 'function', "TradePierManager.placePier is callable");
console.log("✓ Test 2 Passed: Modularized sub-renderers and factories cleanly imported.\n");

// -------------------------------------------------------------
// Test 3: Harbor Pier Placement & Demolition Constraints
// -------------------------------------------------------------
console.log("Test 3: Harbor Pier 2x2 Placement & Demolition Constraints...");
const grid = new CityGridModel(16, 16);
const state = createMockState();
const tradeManager = new TradePierManager(grid, state);
state.tradePierManager = tradeManager;

// Case 3A: No road, no water -> Cannot place
assert.strictEqual(tradeManager.canPlacePier(4, 4), false, "Cannot place on dry land without road and water");

// Case 3B: Only road, no water -> Cannot place
grid.setTile(3, 4, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 1);
assert.strictEqual(tradeManager.canPlacePier(4, 4), false, "Cannot place with only road and no water");

// Case 3C: 1 canal, 1 road -> Cannot place (requires >= 2 canal tiles)
grid.setTile(4, 6, CONFIG.TYPES.CANAL, null, 1, true, CONFIG.STAGES.BUILT);
assert.strictEqual(tradeManager.canPlacePier(4, 4), false, "Cannot place with only 1 adjacent canal tile");

// Case 3D: 2 canal tiles, 1 road -> Can place!
grid.setTile(5, 6, CONFIG.TYPES.CANAL, null, 1, true, CONFIG.STAGES.BUILT);
assert.strictEqual(tradeManager.canPlacePier(4, 4), true, "Can place pier with 2 canals and 1 road adjacent");

// Place the Pier
const prevTreasury = state.treasury;
const placed = tradeManager.placePier(4, 4, 0);
assert.strictEqual(placed, true, "Pier placed successfully");
assert.strictEqual(state.treasury, prevTreasury - (CONFIG.COSTS.HARBOR_PIER || 450), "Treasury deducted ¥450");

// Check all 4 tiles
for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
        const t = grid.getTile(4 + dx, 4 + dy);
        assert.strictEqual(t.type, CONFIG.TYPES.SERVICE, `Tile (${4+dx}, ${4+dy}) is SERVICE`);
        assert.strictEqual(t.serviceType, CONFIG.SERVICES.HARBOR_PIER, `Tile is HARBOR_PIER`);
        assert.strictEqual(t.multiSize, 2, "multiSize is 2");
        if (dx === 0 && dy === 0) {
            assert.strictEqual(t.isOrigin, true, "Origin tile isOrigin is true");
        } else {
            assert.strictEqual(t.isOrigin, false, "Non-origin tile isOrigin is false");
        }
    }
}

// Case 3E: Bulldozing any sub-tile clears the entire 2x2 pier
tradeManager.clearPierAt(5, 5); // Bulldoze non-origin corner
for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < 2; dx++) {
        const t = grid.getTile(4 + dx, 4 + dy);
        assert.strictEqual(t.type, CONFIG.TYPES.EMPTY, `Demolished tile (${4+dx}, ${4+dy}) reverted to EMPTY`);
    }
}
console.log("✓ Test 3 Passed: 2x2 footprint, canal & road adjacency, and full-footprint demolition verified.\n");

// -------------------------------------------------------------
// Test 4: Canal Goods Network BFS & Autumn Export Dividends
// -------------------------------------------------------------
console.log("Test 4: Maritime Trade Dividends & Autumn Harvest Boost...");
// Re-place pier at (4, 4)
tradeManager.placePier(4, 4, 0);

// Set up canal network: (4,6) and (5,6) already exist. Connect to (6,6) and (7,6)
grid.setTile(6, 6, CONFIG.TYPES.CANAL, null, 1, true, CONFIG.STAGES.BUILT);
grid.setTile(7, 6, CONFIG.TYPES.CANAL, null, 1, true, CONFIG.STAGES.BUILT);

// Adjacent to canal at (6,7): Rice Paddy
grid.setTile(6, 7, CONFIG.TYPES.AGRICULTURE, null, 1, true, CONFIG.STAGES.BUILT);

// Adjacent to canal at (7,7): Industrial Silk Mill (Level 2 Industrial)
grid.setTile(7, 7, CONFIG.TYPES.ZONE, CONFIG.ZONES.INDUSTRIAL, 2, true, CONFIG.STAGES.BUILT);

// Test non-autumn dividend (Month 5 - May)
const springYield = tradeManager.calculateExportYield(4, 4, 5);
assert.ok(springYield >= 150 && springYield <= 400, `Spring dividend within [150, 400]. Actual: ${springYield}`);

// Test autumn harvest dividend surge (Month 10 - October)
const autumnYield = tradeManager.calculateExportYield(4, 4, 10);
assert.ok(autumnYield >= springYield, `Autumn yield (${autumnYield}) >= Spring yield (${springYield})`);

// Test inspection data
const insp = tradeManager.getInspectionData(4, 4, 10);
assert.strictEqual(insp.facility, 'Harbor Cargo Pier (Funatsuki-ba)');
assert.strictEqual(insp.connectionText, 'Linked to Canal Network');
assert.strictEqual(insp.quarterlyYield, autumnYield);

// Test EconomySystem integration
const economy = new EconomySystem(grid, state);
state.currentMonth = 10;
const startTreasury = state.treasury;
const netCashflow = economy.processEconomy();
assert.ok(netCashflow > 0, "Economy generated positive cashflow including maritime dividends");
assert.strictEqual(state.treasury, startTreasury + netCashflow, "Treasury properly updated by economy tick");
console.log(`  ✓ Spring Export Yield: +¥${springYield} | Autumn Harvest Export Yield: +¥${autumnYield}`);
console.log("✓ Test 4 Passed: Canal BFS, Autumn export boost, and EconomySystem integration verified.\n");

console.log("=================================================");
console.log("🎉 ALL ITERATION 24 AUTOMATED TESTS PASSED (4/4)");
console.log("=================================================");
