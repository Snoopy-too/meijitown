// Project Meiji - Iteration 30 Verification Test Suite (test_iteration30.js)
// ponytail: headless unit checks for rail bitmasking, Bezier curve steering, typhoon inundation & file size governance

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Node.js DOM shims for headless Three.js & UI modules
globalThis.document = {
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {},
        addEventListener: () => {}
    })
};
globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    devicePixelRatio: 1
};

console.log('================================================================');
console.log('Project Meiji - Iteration 30 Verification Test Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Bitmask Resolution (16 Orthogonal Combinations)
// -----------------------------------------------------------------------------
console.log('1. Testing Rail Bitmasking Engine & Segment Configurations...');
import { CONFIG } from '../public/js/config.js';
import { CityGridModel } from '../public/js/grid.js';
import { RailAutoTiler } from '../public/js/renderer/railAutoTiler.js';

// Verify all 16 masks yield expected human-readable classification
const expectedDesc = {
    0: 'Mainline (Straight E-W)',
    1: 'Mainline (Straight N-S)',
    2: 'Mainline (Straight E-W)',
    3: 'Mainline (Curved NE)',
    4: 'Mainline (Straight N-S)',
    5: 'Mainline (Straight N-S)',
    6: 'Mainline (Curved SE)',
    7: 'Mainline (3-Way Switch NES)',
    8: 'Mainline (Straight E-W)',
    9: 'Mainline (Curved NW)',
    10: 'Mainline (Straight E-W)',
    11: 'Mainline (3-Way Switch NEW)',
    12: 'Mainline (Curved SW)',
    13: 'Mainline (3-Way Switch NSW)',
    14: 'Mainline (3-Way Switch ESW)',
    15: 'Mainline (4-Way Crossing)'
};

for (let m = 0; m <= 15; m++) {
    const desc = RailAutoTiler.getRailDescription(m);
    assert.strictEqual(desc, expectedDesc[m], `Mask ${m} description should match`);
}

// Test grid-level bitmask resolution
const grid = new CityGridModel(10, 10);
const center = { x: 5, y: 5 };
grid.setTile(center.x, center.y, CONFIG.TYPES.RAIL);

// Test North-South (Mask 5)
grid.setTile(5, 4, CONFIG.TYPES.RAIL);
grid.setTile(5, 6, CONFIG.TYPES.RAIL);
assert.strictEqual(RailAutoTiler.getBitmask(center, grid), 5, 'N-S neighbors yield mask 5');

// Test Curved North-East (Mask 3: N=1, E=2)
grid.clearTile(5, 6);
grid.setTile(6, 5, CONFIG.TYPES.RAIL);
assert.strictEqual(RailAutoTiler.getBitmask(center, grid), 3, 'N-E neighbors yield mask 3 (Curved NE)');

// Test Curved South-East (Mask 6: S=4, E=2)
grid.clearTile(5, 4);
grid.setTile(5, 6, CONFIG.TYPES.RAIL);
assert.strictEqual(RailAutoTiler.getBitmask(center, grid), 6, 'S-E neighbors yield mask 6 (Curved SE)');

// Test Curved South-West (Mask 12: S=4, W=8)
grid.clearTile(6, 5);
grid.setTile(4, 5, CONFIG.TYPES.RAIL);
assert.strictEqual(RailAutoTiler.getBitmask(center, grid), 12, 'S-W neighbors yield mask 12 (Curved SW)');

// Test Curved North-West (Mask 9: N=1, W=8)
grid.clearTile(5, 6);
grid.setTile(5, 4, CONFIG.TYPES.RAIL);
assert.strictEqual(RailAutoTiler.getBitmask(center, grid), 9, 'N-W neighbors yield mask 9 (Curved NW)');

// Test Full 4-Way Crossing (Mask 15: N=1, E=2, S=4, W=8)
grid.setTile(6, 5, CONFIG.TYPES.RAIL);
grid.setTile(5, 6, CONFIG.TYPES.RAIL);
assert.strictEqual(RailAutoTiler.getBitmask(center, grid), 15, 'All 4 neighbors yield mask 15 (Crossing)');
console.log('  ✓ 16-State bitmask resolution & 90° arcs verified.');

// -----------------------------------------------------------------------------
// TEST 2: Bézier Path Alignment & Tangent Continuity
// -----------------------------------------------------------------------------
console.log('2. Testing Quadratic Bézier Curve Path Alignment...');
import { TrainTrafficManager } from '../public/js/renderer/trainTraffic.js';

const p0 = { x: 0, y: 0.065, z: -1 }; // North entry
const p1 = { x: 0, y: 0.065, z: 0 };  // Corner center
const p2 = { x: 1, y: 0.065, z: 0 };  // East exit

// Sample points along Bézier curve
const ptStart = TrainTrafficManager.evaluateBezier(p0, p1, p2, 0);
const ptMid = TrainTrafficManager.evaluateBezier(p0, p1, p2, 0.5);
const ptEnd = TrainTrafficManager.evaluateBezier(p0, p1, p2, 1);

assert.strictEqual(Math.abs(ptStart.x - p0.x) < 0.001 && Math.abs(ptStart.z - p0.z) < 0.001, true, 'Start matches p0');
assert.strictEqual(Math.abs(ptEnd.x - p2.x) < 0.001 && Math.abs(ptEnd.z - p2.z) < 0.001, true, 'End matches p2');
assert.strictEqual(ptMid.x > 0 && ptMid.z < 0, true, 'Midpoint curves smoothly through quadrant');

// Tangent verification
const tanStart = TrainTrafficManager.evaluateBezierTangent(p0, p1, p2, 0);
const tanMid = TrainTrafficManager.evaluateBezierTangent(p0, p1, p2, 0.5);
const tanEnd = TrainTrafficManager.evaluateBezierTangent(p0, p1, p2, 1);

assert.strictEqual(tanStart.x === 0 && tanStart.z > 0, true, 'Start tangent points strictly South (+Z)');
assert.strictEqual(tanEnd.x > 0 && tanEnd.z === 0, true, 'End tangent points strictly East (+X)');
assert.strictEqual(tanMid.x > 0 && tanMid.z > 0, true, 'Midpoint tangent is smooth 45° diagonal');
console.log('  ✓ Quadratic Bézier curve navigation verified.');

// -----------------------------------------------------------------------------
// TEST 3: The Autumn Typhoon & Inundation Defenses Loop
// -----------------------------------------------------------------------------
console.log('3. Testing Typhoon Inundation & Civic Flood Defenses...');
import { TyphoonManager } from '../public/js/disaster/typhoonManager.js';
import { AgricultureManager } from '../public/js/agricultureManager.js';

const testGrid = new CityGridModel(12, 12);
const mockState = {
    currentMonth: 9,
    currentYear: 1872,
    treasury: 1000,
    chronicle: { recordEvent: () => {} },
    showToast: () => {}
};

const typhoon = new TyphoonManager(testGrid, mockState);
const agriculture = new AgricultureManager(testGrid, mockState);

// Layout:
// (2, 2): Canal
// (2, 1): Unprotected dirt road (Tier 1)
// (3, 2): Protected Stone road (Tier 2 - Ishigaki Embankment)
// (2, 3): Protected Willow Tree (Yanagi)
// (1, 2): Unprotected Rice Paddy
testGrid.setTile(2, 2, CONFIG.TYPES.CANAL);
testGrid.setTile(2, 1, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 1); // Dirt
testGrid.setTile(3, 2, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 2); // Stone
testGrid.setTile(2, 3, CONFIG.TYPES.PARK, null, 1, true, CONFIG.STAGES.BUILT, 1, false, 'willow');
testGrid.setTile(1, 2, CONFIG.TYPES.AGRICULTURE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, 'suiden');

// Initial state: roads connected
assert.strictEqual(testGrid.isRoadTile(testGrid.getTile(2, 1)), true, 'Dirt road is operational');
assert.strictEqual(testGrid.isRoadTile(testGrid.getTile(3, 2)), true, 'Stone road is operational');

// Trigger Typhoon storm
typhoon.startTyphoon();

const dirtRoad = testGrid.getTile(2, 1);
const stoneRoad = testGrid.getTile(3, 2);
const willowPark = testGrid.getTile(2, 3);
const ricePaddy = testGrid.getTile(1, 2);

// Unprotected borders submerge
assert.strictEqual(dirtRoad.submerged, true, 'Unprotected dirt road is submerged');
assert.strictEqual(testGrid.isRoadTile(dirtRoad), false, 'Submerged dirt road loses road connectivity');
assert.strictEqual(ricePaddy.submerged, true, 'Unprotected rice paddy is submerged');

// Protected borders remain safe
assert.strictEqual(Boolean(stoneRoad.submerged), false, 'Stone embankment protects stone road');
assert.strictEqual(testGrid.isRoadTile(stoneRoad), true, 'Stone road remains open');
assert.strictEqual(Boolean(willowPark.submerged), false, 'Willow roots anchor bank');

// Test harvest penalty on submerged paddy
const autumnHarvest = agriculture.calculateHarvestYield(9);
assert.strictEqual(autumnHarvest, 10, 'Submerged rice paddy yields -50% harvest bonus (¥10 instead of ¥20)');

// Test Watergate Sluice (Suimon) defense on another canal
testGrid.setTile(8, 8, CONFIG.TYPES.CANAL);
testGrid.setTile(8, 9, CONFIG.TYPES.ROAD, null, 1, true, CONFIG.STAGES.BUILT, 1); // Dirt road near canal
testGrid.setTile(8, 7, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1);
const sluiceTile = testGrid.getTile(8, 7);
sluiceTile.serviceType = CONFIG.SERVICES.SUIMON;

typhoon.processInundation();
const roadNearSluice = testGrid.getTile(8, 9);
assert.strictEqual(Boolean(roadNearSluice.submerged), false, 'Watergate Sluice blocks upstream surge and prevents flooding');

// Test end of typhoon and waters receding
typhoon.endTyphoon();
assert.strictEqual(Boolean(dirtRoad.submerged), false, 'Floodwaters drained from dirt road');
assert.strictEqual(testGrid.isRoadTile(dirtRoad), true, 'Dirt road connectivity restored');
assert.strictEqual(Boolean(ricePaddy.submerged), false, 'Rice paddy drained');
console.log('  ✓ Typhoon inundation, road submersion & flood defenses verified.');

// -----------------------------------------------------------------------------
// TEST 4: File Size Governance (< 450 Lines Directive)
// -----------------------------------------------------------------------------
console.log('4. Verifying File Size Limits Across All Iteration 30 Modules...');
const filesToCheck = [
    { file: 'public/js/renderer/railAutoTiler.js', max: 280 },
    { file: 'public/js/disaster/typhoonManager.js', max: 300 },
    { file: 'public/js/renderer/trainTraffic.js', max: 450 },
    { file: 'public/js/renderer/railwaySystem.js', max: 450 },
    { file: 'public/js/renderer/overlayRenderer.js', max: 450 },
    { file: 'public/js/renderer/overlaySystem.js', max: 450 },
    { file: 'public/js/ui/surveyor_scope.js', max: 450 },
    { file: 'public/js/meshes/civicMeshFactory.js', max: 450 },
    { file: 'public/js/simulation.js', max: 450 },
    { file: 'public/js/grid.js', max: 450 },
    { file: 'public/js/renderer.js', max: 450 },
    { file: 'public/js/config/toolCatalogData.js', max: 250 }
];

for (const { file, max } of filesToCheck) {
    const fullPath = path.join(rootDir, file);
    assert.strictEqual(fs.existsSync(fullPath), true, `File ${file} must exist`);
    const lineCount = fs.readFileSync(fullPath, 'utf8').split('\n').length;
    console.log(`   - ${file}: ${lineCount} lines (max: ${max})`);
    assert.strictEqual(lineCount <= max, true, `${file} must be <= ${max} lines (currently ${lineCount})`);
}
console.log('  ✓ File size constraints strictly respected.');

console.log('\n================================================================');
console.log('✓ All Iteration 30 Automated Tests Passed Successfully!');
console.log('================================================================');
