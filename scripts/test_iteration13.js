// Project Meiji - Iteration 13 Verification Test Suite
// Canals, Law & Order (Kōban), and Urban Polish
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

console.log('--- Project Meiji: Iteration 13 Automated Test Suite ---');

// 1. Verify 3D GLB Model Assets
console.log('1. Verifying 3D GLB Model Assets on Disk...');
const kobanGlbPath = path.join(rootDir, 'public', 'assets', 'models', 'civic_koban.glb');
assert.ok(fs.existsSync(kobanGlbPath), 'civic_koban.glb must exist in public/assets/models/');
const kobanStats = fs.statSync(kobanGlbPath);
assert.ok(kobanStats.size > 1000, `civic_koban.glb must be valid non-empty file (size: ${kobanStats.size} bytes)`);
console.log(`✓ 3D GLB model verified (civic_koban.glb: ${kobanStats.size} bytes).`);

// 2. Verify Config Constants
console.log('2. Verifying Config Constants for Iteration 13...');
assert.strictEqual(CONFIG.SERVICES.KOBAN, 'koban', 'CONFIG.SERVICES.KOBAN must be "koban"');
assert.strictEqual(CONFIG.COSTS.KOBAN, 110, 'Cost of Kōban must be ¥110');
assert.strictEqual(CONFIG.SIMULATION.KOBAN_RADIUS, 8, 'Kōban radius must be 8 tiles');
assert.strictEqual(CONFIG.SIMULATION.KOBAN_MAINTENANCE, 3, 'Kōban maintenance must be ¥3/mo');
assert.strictEqual(CONFIG.TYPES.CANAL, 'canal', 'CONFIG.TYPES.CANAL must be "canal"');
assert.strictEqual(CONFIG.COSTS.CANAL, 15, 'Cost of Canal must be ¥15');
assert.strictEqual(CONFIG.TOOLS.KOBAN, 'koban', 'CONFIG.TOOLS.KOBAN must be "koban"');
assert.strictEqual(CONFIG.TOOLS.CANAL, 'canal', 'CONFIG.TOOLS.CANAL must be "canal"');
console.log('✓ Configuration constants verified.');

// 3. Test Kōban Public Order Spatial Coverage & Satisfaction Boost
console.log('3. Testing Kōban Public Order & Satisfaction Boost...');
const mockState = {
    treasury: 1000,
    population: 50,
    metrics: { townHappiness: 65, fireRisk: 0, choleraRisk: 0 },
    deductTreasury(amt) {
        if (this.treasury >= amt) { this.treasury -= amt; return true; }
        return false;
    },
    showToast() {},
};

const grid = new CityGridModel(32, 32);
const sim = new SimulationEngine(grid, mockState);

// Place a Kōban at (10, 10)
grid.setTile(10, 10, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(10, 10).serviceType = CONFIG.SERVICES.KOBAN;

// Check spatial coverage: (10, 16) is 6 tiles away (within 8); (10, 20) is 10 tiles away (outside)
assert.strictEqual(sim.isOrderCovered(10, 16), true, 'Tile at distance 6 should be Kōban covered');
assert.strictEqual(sim.isOrderCovered(10, 20), false, 'Tile at distance 10 should NOT be Kōban covered');

// Test Residential Happiness Bonus (+10% for Public Order)
grid.setTile(10, 15, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const happinessInside = sim.getResidentialHappiness(10, 15);

grid.setTile(25, 25, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const happinessOutside = sim.getResidentialHappiness(25, 25);

assert.strictEqual(happinessInside - happinessOutside, 10, 'Residential lot inside Kōban coverage must receive +10% happiness bonus');
console.log(`✓ Public order coverage and +10% satisfaction bonus verified (Covered: ${happinessInside}%, Uncovered: ${happinessOutside}%).`);

// 4. Test Squalor & Abandonment Immunity
console.log('4. Testing Squalor Abandonment Prevention under Kōban...');
mockState.metrics.townHappiness = 30; // Drop happiness to squalor level (<40%)

// Run economic cycle multiple times
for (let cycle = 0; cycle < 10; cycle++) {
    sim.economy.processEconomy();
}
// Covered residential tile at (10, 15) must NEVER be abandoned
const coveredTile = grid.getTile(10, 15);
assert.strictEqual(coveredTile.stage, CONFIG.STAGES.BUILT, 'Tile protected by Kōban must remain BUILT (no abandonment)');
assert.strictEqual(coveredTile.occupied, true, 'Tile protected by Kōban must remain occupied');
console.log('✓ Kōban public order prevents squalor abandonment.');

// 5. Test Canal Passive Clean Water Sanitation Access
console.log('5. Testing Canal Passive Sanitation Access...');
// Clear grid for isolation
const canalGrid = new CityGridModel(32, 32);
const canalSim = new SimulationEngine(canalGrid, mockState);

// Excavate canal at (5, 5)
canalGrid.setTile(5, 5, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE);

// Immediately adjacent tile (5, 6) has water access
assert.strictEqual(canalSim.isWellCovered(5, 6), true, 'Tile immediately adjacent to canal must have clean water access');
// Diagonal adjacent tile (6, 6) has distance ~1.41 <= 1.5, receives water
assert.strictEqual(canalSim.isWellCovered(6, 6), true, 'Diagonal tile adjacent to canal must have clean water access');
// Distant tile (5, 8) at distance 3 should NOT have water without a well
assert.strictEqual(canalSim.isWellCovered(5, 8), false, 'Tile 3 tiles away from canal must NOT have water access');
console.log('✓ Canal passive water and sanitation coverage verified.');

// 6. Test Canal Firebreak Mechanics
console.log('6. Testing Canal Complete Firebreak Mechanics...');
// Check that disaster simulation treats canal tile as an absolute firebreak
assert.strictEqual(canalSim.disaster.hasFirebreakBetween(5, 3, 5, 8), true, 'Canal between (5, 3) and (5, 8) must act as absolute firebreak');
console.log('✓ Canal firebreak stops fire spread across canal tiles.');

// 7. Test Road & Canal Bridge Intersection and Pathfinding
console.log('7. Testing Road & Canal Bridge Mechanics...');
const roadGrid = new CityGridModel(16, 16);
// Create canal at (4, 4)
roadGrid.setTile(4, 4, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE);

// Draw road over canal -> creates bridge
roadGrid.getTile(4, 4).hasBridge = true;
roadGrid.getTile(4, 4).roadTier = 1;

// Connect roads on both sides: (4, 3) and (4, 5)
roadGrid.setTile(4, 3, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
roadGrid.setTile(4, 5, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);

// Verify road adjacency recognizes bridged canal
assert.strictEqual(roadGrid.hasAdjacentRoad(5, 4), true, 'Bridged canal must be recognized as adjacent road');

// Verify BFS pathfinding traverses across the bridge from (4, 2) to (4, 6)
roadGrid.setTile(4, 2, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);
roadGrid.setTile(4, 6, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE, 1);

const pathResult = roadGrid.findRoadPath(3, 2, 5, 6);
assert.ok(pathResult !== null, 'Pathfinding must find a route across bridged canal');
const bridgeInPath = pathResult.some(p => p.x === 4 && p.y === 4);
assert.strictEqual(bridgeInPath, true, 'Bridge at (4, 4) must be in traversed road path');
console.log('✓ Road-over-canal bridge integration and pathfinding traversal verified.');

// 8. Test Canal Water & Embankment 3D Mesh Geometry
console.log('8. Testing Canal Water & Embankment 3D Mesh Geometry...');
const { CanalMesh } = await import('../public/js/renderer/canal_mesh.js');
const canalTestTile = { x: 5, y: 5, type: CONFIG.TYPES.CANAL, hasBridge: false, roadTier: 1 };
const canalMeshGroup = CanalMesh.createCanalMesh(canalTestTile, canalGrid);

// Find bed mesh (y = 0.015) and water mesh (y = 0.038)
const meshes = canalMeshGroup.children;
const bedMesh = meshes.find(m => Math.abs(m.position.y - 0.015) < 0.001);
const waterMesh = meshes.find(m => Math.abs(m.position.y - 0.038) < 0.001);

assert.ok(bedMesh, 'Canal must include an opaque canal bed liner at y = 0.015 to conceal grass & grid');
assert.strictEqual(bedMesh.material.color.getHex(), 0x182422, 'Canal bed material must use dark silt color 0x182422');

assert.ok(waterMesh, 'Canal must include a water surface mesh at y = 0.038 (above ground y=0)');
assert.ok(waterMesh.position.y > 0.02, 'Water plane must be elevated above ground and canal bed');
assert.strictEqual(waterMesh.material.transparent, true, 'Water material must be transparent');
assert.strictEqual(waterMesh.material.color.getHex(), 0x227888, 'Water material must use turquoise canal color 0x227888');

// Verify stone retaining walls are raised above water
const wallMeshes = meshes.filter(m => m.position.y > 0.05);
assert.ok(wallMeshes.length > 0, 'Canal without canal neighbors must spawn stone retaining walls');
for (const wall of wallMeshes) {
    const topY = wall.position.y + 0.06; // wallH = 0.12, half = 0.06
    assert.ok(topY > waterMesh.position.y, 'Embankment wall top must be higher than water surface');
}

// Test bridged canal mesh: road approaches must not be blocked by walls
const bridgeTile = { x: 4, y: 4, type: CONFIG.TYPES.CANAL, hasBridge: true, roadTier: 1 };
const bridgeMeshGroup = CanalMesh.createCanalMesh(bridgeTile, roadGrid);
assert.ok(bridgeMeshGroup.children.some(c => c.type === 'Group'), 'Bridged canal must contain Taiko-bashi bridge group');
console.log('✓ Canal water elevation, bed masking, stone embankments, and bridge geometry verified.');

// 9. Verify HTML & CSS Integration
console.log('9. Verifying HTML & CSS Hooks on Disk...');
const htmlPath = path.join(rootDir, 'public', 'index.html');
const cssPath = path.join(rootDir, 'public', 'css', 'style.css');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// HTML checks
assert.ok(htmlContent.includes('id="insp-order"'), 'index.html must include #insp-order in Surveyor Scope');
assert.ok(htmlContent.includes('data-tool="canal"'), 'index.html must include data-tool="canal" button');
assert.ok(htmlContent.includes('data-tool="koban"'), 'index.html must include data-tool="koban" button');

// CSS checks: time controls overflow fix
assert.ok(cssContent.includes('#time-controls, .time-controls'), 'style.css must have #time-controls rule');
assert.ok(cssContent.includes('overflow: hidden;'), 'style.css must include overflow: hidden for time controls');
console.log('✓ HTML & CSS integration verified.');

// 10. Line Count Compliance Audit
console.log('10. Auditing Source File Line Counts (<600 lines)...');
const filesToAudit = [
    'public/js/config.js',
    'public/js/grid.js',
    'public/js/simulation.js',
    'public/js/simulation/happiness_system.js',
    'public/js/simulation/economy_system.js',
    'public/js/simulation/sanitation_system.js',
    'public/js/disaster.js',
    'public/js/tools.js',
    'public/js/renderer.js',
    'public/js/renderer/canal_mesh.js',
    'public/js/renderer/civic_meshes.js',
    'public/js/ui/surveyor_scope.js',
    'public/js/ui/build_drawer.js',
    'public/css/style.css',
];

for (const rel of filesToAudit) {
    const full = path.join(rootDir, rel);
    const lineCount = fs.readFileSync(full, 'utf8').split('\n').length;
    assert.ok(lineCount <= 600, `${rel} has ${lineCount} lines, which exceeds the 600 line limit!`);
    console.log(`  ✓ ${rel.padEnd(42, ' ')} : ${lineCount} lines`);
}

console.log('\n========================================');
console.log('🎉 All Iteration 13 automated tests passed successfully!');
console.log('========================================');
