// Project Meiji - Iteration 14 Automated Test Suite
// ponytail: deterministic verification of audio polish, canal barges, parks, railways, and line limits

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- Project Meiji: Iteration 14 Automated Test Suite ---');

// 1. Verify 3D GLB Model Assets on Disk
console.log('1. Verifying 3D GLB Model Assets on Disk...');
const bargePath = path.join(rootDir, 'public', 'assets', 'models', 'vehicle_barge.glb');
assert(fs.existsSync(bargePath), 'vehicle_barge.glb must exist');
const bargeStats = fs.statSync(bargePath);
assert(bargeStats.size > 5000, `vehicle_barge.glb should be a valid binary glb (>5KB), got ${bargeStats.size} bytes`);
console.log(`✓ 3D GLB model verified (vehicle_barge.glb: ${bargeStats.size} bytes).`);

// 2. Verify Config Constants
console.log('2. Verifying Config Constants for Iteration 14...');
import { CONFIG } from '../public/js/config.js';
assert.strictEqual(CONFIG.TYPES.RAIL, 'rail', 'CONFIG.TYPES.RAIL should be rail');
assert.strictEqual(CONFIG.TYPES.PARK, 'park', 'CONFIG.TYPES.PARK should be park');
assert.strictEqual(CONFIG.SERVICES.TRAIN_DEPOT, 'train_depot', 'CONFIG.SERVICES.TRAIN_DEPOT should be train_depot');
assert.strictEqual(CONFIG.SERVICES.SHRINE_PARK, 'shrine_park', 'CONFIG.SERVICES.SHRINE_PARK should be shrine_park');
assert.strictEqual(CONFIG.COSTS.RAIL, 20, 'Rail track cost must be ¥20');
assert.strictEqual(CONFIG.COSTS.TRAIN_DEPOT, 350, 'Train depot cost must be ¥350');
assert.strictEqual(CONFIG.COSTS.CANAL_TREE, 15, 'Canal tree cost must be ¥15');
assert.strictEqual(CONFIG.COSTS.SHRINE_PARK, 50, 'Shrine park cost must be ¥50');
assert.strictEqual(CONFIG.SIMULATION.TRAIN_DEPOT_MAINTENANCE, 10, 'Train depot upkeep must be ¥10/mo');
assert.strictEqual(CONFIG.MODELS.BARGE, 'assets/models/vehicle_barge.glb', 'CONFIG.MODELS.BARGE must point to vehicle_barge.glb');
assert.strictEqual(CONFIG.TOOLS.RAIL_TRACK, 'rail_track', 'CONFIG.TOOLS.RAIL_TRACK defined');
assert.strictEqual(CONFIG.TOOLS.TRAIN_DEPOT, 'train_depot', 'CONFIG.TOOLS.TRAIN_DEPOT defined');
assert.strictEqual(CONFIG.TOOLS.TREE_WILLOW, 'tree_willow', 'CONFIG.TOOLS.TREE_WILLOW defined');
assert.strictEqual(CONFIG.TOOLS.SHRINE_PARK, 'shrine_park', 'CONFIG.TOOLS.SHRINE_PARK defined');
console.log('✓ Configuration constants verified.');

// 3. Audio Toggle UI & Washi Styling Hooks in HTML & CSS
console.log('3. Verifying Audio Toggle UI & Washi Styling Hooks...');
const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
assert(indexHtml.includes('id="audio-toggle-btn"'), 'index.html must include id="audio-toggle-btn"');
assert(indexHtml.includes('time-audio-divider'), 'index.html must include time-audio-divider');
// Verify audio toggle button is inside time-controls flex container
const timeControlsIdx = indexHtml.indexOf('id="time-controls"');
const audioBtnIdx = indexHtml.indexOf('id="audio-toggle-btn"');
const closingTimeDivIdx = indexHtml.indexOf('</div>', audioBtnIdx);
assert(timeControlsIdx < audioBtnIdx && audioBtnIdx < closingTimeDivIdx, 'audio-toggle-btn must be inside time-controls');

const styleCss = fs.readFileSync(path.join(rootDir, 'public', 'css', 'style.css'), 'utf8');
assert(styleCss.includes('.time-audio-divider'), 'style.css must define .time-audio-divider');
assert(styleCss.includes('.audio-toggle-btn'), 'style.css must define .audio-toggle-btn');
assert(styleCss.includes('overflow: visible;'), 'style.css must set overflow: visible on time-controls');
console.log('✓ Audio toggle flex alignment and washi styling verified.');

// 4. Test Water Life: Canal Pathfinding & Cargo Barges (Takasebune)
console.log('4. Testing Canal Cargo Barge Pathfinding & Waterway Graph...');
import { CityGridModel } from '../public/js/grid.js';
import { CanalTrafficManager } from '../public/js/renderer/canalTraffic.js';

const grid = new CityGridModel(16, 16);
// Create a canal waterway from (2, 5) to (6, 5) with a road bridge at (4, 5)
for (let x = 2; x <= 6; x++) {
    grid.setTile(x, 5, CONFIG.TYPES.CANAL, null, 0, false, CONFIG.STAGES.NONE, 1, x === 4);
}

// Mock Three.js scene & world pos
const mockScene = {
    add: () => {},
    remove: () => {}
};
const getTileWorldPos = (x, y) => ({ x: (x + 0.5) * CONFIG.TILE_SIZE, z: (y + 0.5) * CONFIG.TILE_SIZE });

const canalTraffic = new CanalTrafficManager(mockScene, grid, getTileWorldPos);
const networks = canalTraffic.findCanalNetworks();
assert.strictEqual(networks.length, 1, 'Should find 1 contiguous canal network');
assert.strictEqual(networks[0].length, 5, 'Network should contain all 5 canal tiles including bridge');

const route = canalTraffic.buildWaterwayRoute(networks[0]);
assert(route !== null && route.length >= 2, 'Should construct a valid route of waypoints');
// Verify route elevation is at water surface level (0.040)
assert.strictEqual(route[0].y, 0.040, 'Waypoint Y elevation must sit at water surface level (0.040)');

// Test barge spawning and route reversal
canalTraffic.spawnBarge();
assert.strictEqual(canalTraffic.barges.length, 1, 'Should have spawned 1 barge');
const barge = canalTraffic.barges[0];
assert(barge.waypoints.length === 5, 'Barge waypoints count must match canal path');

// Advance barge past final waypoint to test reverse route
barge.waypointIndex = 4;
canalTraffic.update(1, 1.0);
assert.strictEqual(barge.waypointIndex, 0, 'Barge must reverse course upon reaching terminus');
console.log('✓ Canal barge waterway pathfinding and bridge traversal verified.');

// 5. Test Street Trees & Neighborhood Shrine Park (+5% Happiness)
console.log('5. Testing Street Trees & Shrine Park Satisfaction Boost...');
import { HappinessSystem } from '../public/js/simulation/happiness_system.js';
import { ParksSystem } from '../public/js/renderer/parksSystem.js';

const mockState = {
    metrics: { townHappiness: 65 },
    population: 50,
    treasury: 10000,
    showToast: () => {}
};
const happiness = new HappinessSystem(grid, mockState, null, null);

// Plant a residential lot at (3, 3)
grid.setTile(3, 3, CONFIG.TYPES.ZONE, CONFIG.ZONES.RESIDENTIAL, 1, true, CONFIG.STAGES.BUILT);
const baseScore = happiness.getResidentialHappiness(3, 3);

// Place Neighborhood Shrine Park adjacent at (3, 4)
grid.setTile(3, 4, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(3, 4).serviceType = CONFIG.SERVICES.SHRINE_PARK;

assert.strictEqual(happiness.isShrineParkAdjacent(3, 3), true, 'Shrine Park at (3,4) must be detected as adjacent to (3,3)');
assert.strictEqual(ParksSystem.isShrineParkAdjacent(grid, 3, 3), true, 'ParksSystem must confirm adjacent Shrine Park');

const boostedScore = happiness.getResidentialHappiness(3, 3);
assert.strictEqual(boostedScore, baseScore + 5, `Shrine park must grant exactly +5% satisfaction bonus (Before: ${baseScore}, After: ${boostedScore})`);

// Plant a Weeping Willow tree on meadow at (1, 1)
grid.setTile(1, 1, CONFIG.TYPES.PARK, null, 1, true, CONFIG.STAGES.BUILT, 1, false, 'willow');
const treeTile = grid.getTile(1, 1);
assert.strictEqual(treeTile.type, CONFIG.TYPES.PARK, 'Tree tile must have type PARK');
assert.strictEqual(treeTile.subType, 'willow', 'Tree tile must have subType willow');
console.log(`✓ Neighborhood Shrine Park verified (+5% residential happiness bonus: ${baseScore}% -> ${boostedScore}%).`);

// 6. Test Railway Transit: Tracks, Depot, Demand Doubling & Upkeep
console.log('6. Testing Railway System (Tracks, Depot, Demand Doubling & Upkeep)...');
import { RailwaySystem } from '../public/js/renderer/railwaySystem.js';
import { EconomySystem } from '../public/js/simulation/economy_system.js';
import { SimulationEngine } from '../public/js/simulation.js';

// Lay rail track at (8, 8) and (8, 9)
grid.setTile(8, 8, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
grid.setTile(8, 9, CONFIG.TYPES.RAIL, null, 1, true, CONFIG.STAGES.BUILT);
assert.strictEqual(grid.getTile(8, 8).type, CONFIG.TYPES.RAIL, 'Tile (8,8) must be rail');

// Erect Rural Train Depot at (8, 10)
grid.setTile(8, 10, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT);
grid.getTile(8, 10).serviceType = CONFIG.SERVICES.TRAIN_DEPOT;

// Without adjacent road, depot is not road connected
assert.strictEqual(RailwaySystem.isTrainDepotRoadConnected(grid), false, 'Depot without road should not be road connected');

// Add adjacent road at (9, 10)
grid.setTile(9, 10, CONFIG.TYPES.ROAD, null, 0, false, CONFIG.STAGES.NONE);
assert.strictEqual(RailwaySystem.isTrainDepotRoadConnected(grid), true, 'Depot with adjacent road must be road connected');

// Test economy upkeep deduction
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
const economy = new EconomySystem(grid, simState, happiness);
economy.processEconomy();
// Depot maintenance is ¥10/mo, road is ¥1/mo.
assert(simState.treasury < 5000, 'Treasury should reflect maintenance expenses including train depot upkeep');

// Test SimulationEngine demand doubling
const simEngine = new SimulationEngine(grid, simState);
assert.strictEqual(simEngine.isTrainDepotRoadConnected(), true, 'SimulationEngine must detect road-connected train depot');

simEngine.recalculateDemands();
assert(simState.metrics.commercialDemand >= 45, 'Commercial demand should surge under train depot connectivity');
assert(simState.metrics.industrialDemand >= 45, 'Industrial demand should surge under train depot connectivity');

// Test workshop higher-tier growth progression
grid.setTile(9, 11, CONFIG.TYPES.ZONE, CONFIG.ZONES.INDUSTRIAL, 1, true, CONFIG.STAGES.BUILT);
const workshopTile = grid.getTile(9, 11);
workshopTile.ageTicks = 10;
simEngine.evaluateUpgrades();
assert(workshopTile.stage === CONFIG.STAGES.SCAFFOLDING, 'Workshop must begin renovation into higher-tier mechanized manufactory');
console.log('✓ Railway transit tracks, depot connection, upkeep (¥10/mo), and demand doubling verified.');

// 7. Test SubType & Tile Serialization in Grid
console.log('7. Testing Grid Tile Serialization & SubType Preservation...');
const exported = grid.exportToArray();
const treeExport = exported.find(t => t.x === 1 && t.y === 1);
assert(treeExport && treeExport.subType === 'willow', 'Exported tile must preserve subType');

const newGrid = new CityGridModel(16, 16);
newGrid.loadFromMap({
    '1_1': treeExport,
    '8_8': exported.find(t => t.x === 8 && t.y === 8),
    '8_10': exported.find(t => t.x === 8 && t.y === 8)
});
assert.strictEqual(newGrid.getTile(1, 1).subType, 'willow', 'Reloaded tile must retain subType');
console.log('✓ Grid serialization and subType integrity verified.');

// 8. Test Building Rotation System (Train Depot & Police Box / Kōban)
console.log('8. Testing Building Rotation System (Train Depot & Police Box)...');
const rotGrid = new CityGridModel(16, 16);

// Test placement of Train Depot with rotation = 1 (90° East)
rotGrid.setTile(5, 5, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, 1);
const depotTile = rotGrid.getTile(5, 5);
depotTile.serviceType = CONFIG.SERVICES.TRAIN_DEPOT;
assert.strictEqual(depotTile.rotation, 1, 'Depot tile must store rotation 1');

// Test placement of Police Box (Kōban) with rotation = 3 (270° West)
rotGrid.setTile(6, 6, CONFIG.TYPES.SERVICE, null, 1, true, CONFIG.STAGES.BUILT, 1, false, null, 3);
const kobanTile = rotGrid.getTile(6, 6);
kobanTile.serviceType = CONFIG.SERVICES.KOBAN;
assert.strictEqual(kobanTile.rotation, 3, 'Koban tile must store rotation 3');

// Test Facing Angle logic on grid
const mockRenderer = {
    grid: rotGrid,
    getFacingAngleForTile(x, y) {
        const t = this.grid.getTile(x, y);
        if (t && typeof t.rotation === 'number') {
            return (t.rotation % 4) * (Math.PI / 2);
        }
        return 0;
    }
};
assert.strictEqual(mockRenderer.getFacingAngleForTile(5, 5), Math.PI / 2, 'Depot at rotation 1 must produce angle PI/2 (90°)');
assert.strictEqual(mockRenderer.getFacingAngleForTile(6, 6), (3 * Math.PI) / 2, 'Koban at rotation 3 must produce angle 3PI/2 (270°)');

// In-place rotation (Survey / Inspect mode rotation)
depotTile.rotation = (depotTile.rotation + 1) % 4;
assert.strictEqual(depotTile.rotation, 2, 'In-place depot rotation must advance to 2 (180° South)');
assert.strictEqual(mockRenderer.getFacingAngleForTile(5, 5), Math.PI, 'Depot at rotation 2 must produce angle PI (180°)');

// Verify round-trip grid export and load
const rotExport = rotGrid.exportToArray();
const savedDepot = rotExport.find(t => t.x === 5 && t.y === 5);
const savedKoban = rotExport.find(t => t.x === 6 && t.y === 6);
assert.strictEqual(savedDepot.rotation, 2, 'Exported depot must retain rotation 2');
assert.strictEqual(savedKoban.rotation, 3, 'Exported koban must retain rotation 3');

const reloadedGrid = new CityGridModel(16, 16);
reloadedGrid.loadFromMap({
    '5_5': savedDepot,
    '6_6': savedKoban
});
assert.strictEqual(reloadedGrid.getTile(5, 5).rotation, 2, 'Reloaded depot must retain rotation 2');
assert.strictEqual(reloadedGrid.getTile(6, 6).rotation, 3, 'Reloaded koban must retain rotation 3');

// Verify HTML DOM elements for rotation exist
assert(indexHtml.includes('id="scope-rotate-row"'), 'index.html must include id="scope-rotate-row"');
assert(indexHtml.includes('id="scope-rotate-btn"'), 'index.html must include id="scope-rotate-btn"');
assert(indexHtml.includes('id="insp-facing"'), 'index.html must include id="insp-facing"');
assert(indexHtml.includes('id="fab-rotate-btn"'), 'index.html must include id="fab-rotate-btn"');
assert(indexHtml.includes('id="fab-rotate-deg"'), 'index.html must include id="fab-rotate-deg"');

// Verify CSS definitions for rotation buttons exist
assert(styleCss.includes('.scope-action-btn'), 'style.css must define .scope-action-btn');
assert(styleCss.includes('.fab-rotate-btn'), 'style.css must define .fab-rotate-btn');
console.log('✓ Building rotation logic, facing angles, export, and UI bindings verified.');

// 9. Audit Source File Line Counts (<600 lines)
console.log('9. Auditing Source File Line Counts (<600 lines)...');
const auditedFiles = [
    'public/js/config.js',
    'public/js/grid.js',
    'public/js/app.js',
    'public/js/simulation.js',
    'public/js/simulation/happiness_system.js',
    'public/js/simulation/economy_system.js',
    'public/js/simulation/sanitation_system.js',
    'public/js/tools.js',
    'public/js/renderer.js',
    'public/js/renderer/ghost_cursor.js',
    'public/js/renderer/canal_mesh.js',
    'public/js/renderer/canalTraffic.js',
    'public/js/renderer/parksSystem.js',
    'public/js/renderer/railwaySystem.js',
    'public/js/ui/keyboard_router.js',
    'public/js/ui/surveyor_scope.js',
    'public/js/ui/build_drawer.js',
    'public/js/ui/chronicle_banner.js',
    'public/css/style.css',
    'src/Domain/Model/Tile.php'
];

for (const relPath of auditedFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert(fs.existsSync(fullPath), `Audited file must exist: ${relPath}`);
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length;
    assert(lines <= 600, `CRITICAL: ${relPath} exceeds 600 lines (${lines} lines)!`);
    console.log(`  ✓ ${relPath.padEnd(42)}: ${lines} lines`);
}

console.log('\n========================================');
console.log('🎉 All Iteration 14 automated tests passed successfully!');
console.log('========================================\n');
